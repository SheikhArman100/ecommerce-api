import { Prisma } from '../../generated/client';
import status from 'http-status';
import { prisma } from '../../client';
import { ENUM_USER_ROLE } from '../../enum/user';
import ApiError from '../../errors/ApiError';
import { calculatePagination } from '../../helpers/paginationHelper';
import { toSolidTaka } from '../../utils';
import { IFile, IPaginationOptions } from '../../interfaces/common';
import { UserInfoFromToken } from '../../types/common';
import { productSearchableFields } from './product.constant';
import { IProductBody, IProductFilters, IProductUpdateBody, IUpdateProductInterface } from './product.interface';
import {
  validateFlavorExists,
  validateCategoryExists,
  createFlavorSizes,
  createFlavorImages,
  deleteImageFiles,
  filterImagesByFieldname,
  generateSlug,
  handleSizeOperationsForUpdate,
  handleQuantityBasedFlavorUpdate,
  handleImageOperationsForUpdate,
  handleFlavorRemovals,
  handleFlavorAdditions,
  handleFlavorUpdates,
} from './product.utils';
import fs from 'fs';
import path from 'path';
import ErrorLogger from '../../logger/errorLogger';

// ===== HELPER FUNCTIONS =====



const createProduct = async (
  adminInfo: UserInfoFromToken,
  payload: Partial<IProductBody>,
  multerImages?: IFile[],
): Promise<any> => {
  //validate admin
  const checkAdmin = await prisma.user.findUnique({
    where: { id: Number(adminInfo.id) },
    select: { role: true, id: true },
  });
  if (!checkAdmin) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }
  if (checkAdmin.role !== ENUM_USER_ROLE.ADMIN) {
    throw new ApiError(
      status.FORBIDDEN,
      'You are not authorized to perform this action',
    );
  }

  //validate payload
  const { title, description, categoryId, flavors, isFeatured } = payload;

  if (
    !title ||
    !description ||
    !categoryId ||
    !Array.isArray(flavors) ||
    flavors.length === 0
  ) {
    throw new ApiError(status.BAD_REQUEST, 'Missing required product details');
  }

  // Check if a product with the same title already exists (case-insensitive)
  const duplicateProduct = await prisma.product.findFirst({
    where: {
      title: { equals: title, mode: 'insensitive' },
    },
    select: { id: true, title: true },
  });
  if (duplicateProduct) {
    throw new ApiError(
      status.CONFLICT,
      `Product title "${title}" already exists`,
    );
  }

  // Use transaction to ensure data consistency
  return prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      //check if categoryID exists
      const checkCategory = await tx.category.findUnique({
        where: { id: Number(categoryId) },
        select: { id: true },
      });
      if (!checkCategory) {
        throw new ApiError(status.NOT_FOUND, `Category not found`);
      }
      // Create Product
      const slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const newProduct = await tx.product.create({
        data: {
          title,
          slug,
          description,
          categoryId: Number(categoryId),
          isFeatured: isFeatured ?? false,
          createdBy: Number(checkAdmin.id),
          updatedBy: Number(checkAdmin.id),
        },
      });
      // Process flavors, sizes, and images in parallel
      await Promise.all(
        flavors.map(async (flavor, index) => {
          //check if flavorId exists
          const checkFlavor = await tx.flavor.findUnique({
            where: { id: Number(flavor.flavorId) },
            select: { id: true },
          });
          if (!checkFlavor) {
            throw new ApiError(status.NOT_FOUND, `Flavor  not found`);
          }

          // Create Flavor
          const createdFlavor = await tx.productFlavor.create({
            data: {
              productId: newProduct.id,
              flavorId: Number(flavor.flavorId),
            },
          });

          // Get flavor-specific images

          const flavorImages = Array.isArray(multerImages)
            ? multerImages.filter(
                img => img.fieldname === `flavors[${index}][images]`,
              )
            : [];

          // Create images for this flavor
          const imagePromises = flavorImages.map(img =>
            tx.file.create({
              data: {
                productId: newProduct.id,
                flavorId: createdFlavor.flavorId,
                diskType: 'LOCAL',
                path: `product/images/${img.filename}`,
                originalName: img.originalname,
                modifiedName: img.filename,
              },
            }),
          );

          // Handle flavor-level soldByQuantity logic
          let sizePromises: Promise<any>[] = [];

          if (flavor.soldByQuantity) {
            // Quantity-based flavor - create single ProductFlavorSize with no sizeId
            sizePromises.push(
              tx.productFlavorSize.create({
                data: {
                  productId: newProduct.id,
                  flavorId: createdFlavor.flavorId,
                  sizeId: undefined,  // No size reference for quantity products
                  stock: Number(flavor.stock),
                  price: parseFloat(flavor.price!.toString()),
                  soldByQuantity: true,
                },
              })
            );
          } else {
            // Size-based flavor - create ProductFlavorSize for each size
            if (!flavor.sizes || flavor.sizes.length === 0) {
              throw new ApiError(status.BAD_REQUEST, 'Sizes are required for size-based products');
            }

            sizePromises = flavor.sizes.map(async size => {
              // Validate sizeId exists
              const checkSize = await tx.size.findUnique({
                where: { id: Number(size.sizeId) },
                select: { id: true },
              });
              if (!checkSize) {
                throw new ApiError(status.NOT_FOUND, `Size not found`);
              }

              return tx.productFlavorSize.create({
                data: {
                  productId: newProduct.id,
                  flavorId: createdFlavor.flavorId,
                  sizeId: Number(size.sizeId),
                  stock: Number(size.stock),
                  price: parseFloat(size.price.toString()),
                  soldByQuantity: false,
                },
              });
            });
          }

          // Wait for all images and sizes to be created
          await Promise.all([...imagePromises, ...sizePromises]);

          // Wait for all images and sizes to be created
          await Promise.all([...imagePromises, ...sizePromises]);
        }),
      );

      return newProduct;
    },
    {
      // Configure transaction options
      maxWait: 5000,
      timeout: 10000,
    },
  );
};

const getAllProducts = async (
  filters: IProductFilters,
  paginationOptions: IPaginationOptions,
) => {
  const {
    searchTerm,
    title,
    isActive,
    isFeatured,
    createdBy,
    categoryId,
    categoryName,
    minPrice,
    maxPrice,
    flavorName,
    flavorColor,
    sizeName,
    minStock,
    maxStock,
    hasImages,
    inStock,
  } = filters;
  const { page, limit, skip, orderBy } = calculatePagination(paginationOptions);

  let whereConditions: Prisma.ProductWhereInput = {};

  // Add search term condition if provided
  if (searchTerm) {
    whereConditions = {
      OR: productSearchableFields.map(field => ({
        [field]: {
          contains: searchTerm,
          mode:'insensitive' as const,
          // mode: 'insensitive', // Uncomment if case-insensitive search is needed
        },
      })),
    };
  }

  //all the filters
  // Build specific filter conditions
  const andConditions: Prisma.ProductWhereInput[] = [];

  if (title) {
    andConditions.push({ title: { equals: title } });
  }

  if (isActive) {
    const parsedIsActive = isActive.toLowerCase() === 'true';
    andConditions.push({ isActive: parsedIsActive });
  }

  if (isFeatured) {
    const parsedIsFeatured = isFeatured.toLowerCase() === 'true';
    andConditions.push({ isFeatured: parsedIsFeatured });
  }

  if (createdBy) {
    const parsedCreatedBy = parseInt(createdBy, 10);
    if (!isNaN(parsedCreatedBy)) {
      andConditions.push({ createdBy: parsedCreatedBy });
    }
  }

  if (categoryId) {
    const parsedCategoryId = parseInt(categoryId, 10);
    if (!isNaN(parsedCategoryId)) {
      andConditions.push({ categoryId: parsedCategoryId });
    }
  }

  if (categoryName) {
    andConditions.push({
      category: {
        name: { equals: categoryName },
      },
    });
  }

  if (minPrice) {
    const parsedMinPrice = parseFloat(minPrice);
    if (!isNaN(parsedMinPrice)) {
      andConditions.push({
        flavors: {
          some: {
            sizes: {
              some: {
                price: { gte: parsedMinPrice },
              },
            },
          },
        },
      });
    }
  }

  if (maxPrice) {
    const parsedMaxPrice = parseFloat(maxPrice);
    if (!isNaN(parsedMaxPrice)) {
      andConditions.push({
        flavors: {
          some: {
            sizes: {
              some: {
                price: { lte: parsedMaxPrice },
              },
            },
          },
        },
      });
    }
  }

  if (flavorName) {
    andConditions.push({
      flavors: {
        some: {
          flavor: {
            name: { equals: flavorName },
          },
        },
      },
    });
  }

  if (flavorColor) {
    andConditions.push({
      flavors: {
        some: {
          flavor: {
            color: { equals: flavorColor },
          },
        },
      },
    });
  }

  if (sizeName) {
    andConditions.push({
      flavors: {
        some: {
          sizes: {
            some: {
              size: {
                name: { equals: sizeName },
              },
            },
          },
        },
      },
    });
  }

  if (minStock) {
    const parsedMinStock = parseInt(minStock, 10);
    if (!isNaN(parsedMinStock)) {
      andConditions.push({
        flavors: {
          some: {
            sizes: {
              some: {
                stock: { gte: parsedMinStock },
              },
            },
          },
        },
      });
    }
  }

  if (maxStock) {
    const parsedMaxStock = parseInt(maxStock, 10);
    if (!isNaN(parsedMaxStock)) {
      andConditions.push({
        flavors: {
          some: {
            sizes: {
              some: {
                stock: { lte: parsedMaxStock },
              },
            },
          },
        },
      });
    }
  }

  if (hasImages) {
    const parsedHasImages = hasImages.toLowerCase() === 'true';
    if (parsedHasImages) {
      andConditions.push({
        flavors: {
          some: {
            images: {
              some: {},
            },
          },
        },
      });
    }
  }

  if (inStock !== undefined) {
    const parsedInStock = inStock.toLowerCase() === 'true';
    if (parsedInStock) {
      // Filter for products that are in stock (stock > 0)
      andConditions.push({
        flavors: {
          some: {
            sizes: {
              some: {
                stock: { gt: 0 },
              },
            },
          },
        },
      });
    } else {
      // Filter for products that are out of stock (stock <= 0)
      andConditions.push({
        flavors: {
          every: {
            sizes: {
              every: {
                stock: { lte: 0 },
              },
            },
          },
        },
      });
    }
  }

  // Combine AND conditions with existing whereConditions
  if (andConditions.length > 0) {
    whereConditions.AND = andConditions;
  }

  // Get total count of matching products
  const count = await prisma.product.count({ where: whereConditions });

  // Fetch products with pagination and relations
  const result = await prisma.product.findMany({
    where: whereConditions,
    orderBy,
    skip,
    take: limit,
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      isActive: true,
      isFeatured: true,
      createdAt: true,
      updatedAt: true,
      createdBy: true,
      creator: {
        select: {
          name: true,
          email: true,
          role: true,
        },
      },
      categoryId: true,
      category: {
        select: {
          name: true,
          image: true,
        },
      },
      flavors: {
        select: {
          flavorId: true,
          flavor: {
            select: {
              name: true,
              color: true,
            },
          },
          sizes: {
            select: {
              id: true,
              sizeId: true,
              size: {
                select: {
                  name: true,
                },
              },
              stock: true,
              price: true,
              soldByQuantity: true,
            },
          },
          images: {
            select: {
              id: true,
              path: true,
              originalName: true,
              modifiedName: true,
            },
          },
        },
      },
      campaigns: {
        where: {
          campaign: {
            isActive: true,
          },
        },
        select: {
          customDiscountPercentage: true,
          campaign: {
            select: {
              id: true,
              title: true,
              discountDefault: true,

              discountType: true,
            },
          },
        },
      },
    },
  });

  // Calculate campaign-aware prices — pick whichever campaign yields the
  // LOWEST final price. PERCENTAGE = % off; FIXED = flat ৳ off per unit.
  // While pricing, track which active campaign produced the LOWEST price seen
  // so far — the storefront card advertises the cheapest size, so the campaign
  // behind that price is the one named on the card (product-level counterpart
  // of getSingleProduct's per-size `activeCampaign`).
  const resultWithPricing = result.map(product => {
    let winningCampaign: any = null;
    let winningSales: number | null = null;

    const flavorsWithPricing = product.flavors.map(flavor => ({
      ...flavor,
      sizes: flavor.sizes.map((size: any) => {
        const base = size.price;
        let best = base;
        product.campaigns.forEach((cp: any) => {
          const candidate = cp.campaign.discountType === 'FIXED'
            ? Math.max(base - cp.campaign.discountDefault, 0) // flat ৳ off; % override doesn't apply
            : base * (1 - (cp.customDiscountPercentage ?? cp.campaign.discountDefault) / 100);
          if (candidate < best) {
            best = candidate;
            winningCampaign = cp.campaign;
          }
        });
        return {
          ...size,
          originalPrice: base,
          salesPrice: toSolidTaka(best),
        };
      }),
    }));

    return {
      ...product,
      // Campaign behind the cheapest advertised size (null when no active
      // campaign discounts it) — the storefront names it on the card.
      activeCampaign: winningCampaign,
      flavors: flavorsWithPricing,
    };
  });

  return {
    meta: {
      page,
      limit: limit === 0 ? count : limit,
      count,
    },
    data: resultWithPricing,
  };
};

/**
 * Public storefront feed: products flagged `isFeatured` that are still active.
 *
 * Reuses `getAllProducts` on purpose so the payload is identical to
 * GET /product — every size already carries campaign-aware
 * `originalPrice` / `salesPrice`, plus flavors, images and the category image,
 * so the storefront renders it with the very same <Card /> component.
 */
const getFeaturedProducts = async (paginationOptions: IPaginationOptions) => {
  return getAllProducts(
    {
      isFeatured: 'true',
      isActive: 'true',
    },
    paginationOptions
  );
};

const getSingleProduct = async (productId: string) => {
  //checkProduct
  const checkProduct = await prisma.product.findUnique({
    where: {
      id: Number(productId),
    },
    select: {
      id: true,
      title: true,
      slug: true,
      isActive: true,
      isFeatured: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      flavors: {
        select: {
          flavor: {
            select: {
              id: true,
              name: true,
            },
          },
          images: {
            select: {
              id: true,
              path: true,
              originalName: true,
              modifiedName: true,
            },
          },
          sizes: {
            select: {
              size: {
                select: {
                  id: true,
                  name: true,
                },
              },
              stock: true,
              price: true,
              soldByQuantity: true,
            },
          },
        },
      },
      creator: {
        select: {
          name: true,
          email: true,
          role: true,
        },
      },
      updater: {
        select: {
          name: true,
          email: true,
          role: true,
        },
      },
      campaigns: {
        where: {
          campaign: {
            isActive: true,
          },
        },
        select: {
          customDiscountPercentage: true,
          campaign: {
            select: {
              id: true,
              title: true,discountDefault: true,

              discountType: true,
            },
          },
        },
      },
    },
  });
  if (!checkProduct) {
    throw new ApiError(status.NOT_FOUND, 'Product not found');
  }

  // Calculate per-size campaign-aware pricing — pick whichever campaign yields
  // the LOWEST final price. PERCENTAGE = % off; FIXED = flat ৳ off per unit.
  const campaigns = (checkProduct as any).campaigns || [];

  const productWithPricing = {
    ...checkProduct,
    flavors: checkProduct.flavors.map(flavor => ({
      ...flavor,
      sizes: flavor.sizes.map((size: any) => {
        const base = size.price;
        let best = base;
        let activeCampaign: any = null;

        campaigns.forEach((cp: any) => {
          const candidate = cp.campaign.discountType === 'FIXED'
            ? Math.max(base - cp.campaign.discountDefault, 0) // flat ৳ off; % override doesn't apply
            : base * (1 - (cp.customDiscountPercentage ?? cp.campaign.discountDefault) / 100);
          if (candidate < best) {
            best = candidate;
            activeCampaign = cp.campaign;
          }
        });

        return {
          ...size,
          originalPrice: base,
          // Rounded first, then the percentage is derived from the price actually
          // charged, so the -N% chip can never disagree with the sale price.
          salesPrice: toSolidTaka(best),
          activeCampaign,
          discountPercentage:
            best < base
              ? parseFloat(((1 - toSolidTaka(best) / base) * 100).toFixed(2))
              : 0,
        };
      }),
    })),
  };

  return productWithPricing;
};
const getSingleProductBySlug = async (slug: string) => {
  // Storefront detail feed (public): anonymous visitors must never open
  // hidden products, and the payload must stay display-safe (no creator /
  // updater user rows — those hold emails). Campaign rows are selected only
  // to derive per-size prices, then stripped before returning.
  const checkProduct = await prisma.product.findUnique({
    where: {
      slug: slug,
    },
    select: {
      id: true,
      title: true,
      slug: true,
      isActive: true,
      isFeatured: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      flavors: {
        select: {
          flavor: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
          images: {
            select: {
              id: true,
              path: true,
              originalName: true,
              modifiedName: true,
            },
          },
          sizes: {
            select: {
              size: {
                select: {
                  id: true,
                  name: true,
                },
              },
              stock: true,
              price: true,
              soldByQuantity: true,
            },
          },
        },
      },
      campaigns: {
        where: {
          campaign: {
            isActive: true,
          },
        },
        select: {
          customDiscountPercentage: true,
          campaign: {
            select: {
              id: true,
              title: true,discountDefault: true,

              discountType: true,
            },
          },
        },
      },
    },
  });
  if (!checkProduct || !checkProduct.isActive) {
    throw new ApiError(status.NOT_FOUND, 'Product not found');
  }

  // Calculate per-size campaign-aware pricing — pick whichever campaign yields
  // the LOWEST final price. PERCENTAGE = % off; FIXED = flat ৳ off per unit.
  const campaigns = (checkProduct as any).campaigns || [];

  const { campaigns: _campaignRows, ...productWithoutCampaigns } = checkProduct;

  const productWithPricingAndReviews = {
    ...productWithoutCampaigns,
    flavors: checkProduct.flavors.map(flavor => ({
      ...flavor,
      sizes: flavor.sizes.map((size: any) => {
        const base = size.price;
        let best = base;
        let activeCampaign: any = null;

        campaigns.forEach((cp: any) => {
          const candidate = cp.campaign.discountType === 'FIXED'
            ? Math.max(base - cp.campaign.discountDefault, 0) // flat ৳ off; % override doesn't apply
            : base * (1 - (cp.customDiscountPercentage ?? cp.campaign.discountDefault) / 100);
          if (candidate < best) {
            best = candidate;
            activeCampaign = cp.campaign;
          }
        });

        return {
          ...size,
          originalPrice: base,
          // Rounded first, then the percentage is derived from the price actually
          // charged, so the -N% chip can never disagree with the sale price.
          salesPrice: toSolidTaka(best),
          activeCampaign,
          discountPercentage:
            best < base
              ? parseFloat(((1 - toSolidTaka(best) / base) * 100).toFixed(2))
              : 0,
        };
      }),
    })),
  };

  // ── Public reviews: visible (non-hidden) only, newest first, capped at 20 ──
  // Display-safe: reviewer name + avatar path only, no emails / IPs / order ids.
  const [reviews, ratingStats] = await Promise.all([
    prisma.review.findMany({
      where: { productId: productWithPricingAndReviews.id, isHidden: false },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            detail: {
              select: {
                profileImage: true,
                image: { select: { id: true, path: true } },
              },
            },
          },
        },
        images: { select: { id: true, path: true } },
      },
    }),
    prisma.review.groupBy({
      by: ['rating'],
      where: { productId: productWithPricingAndReviews.id, isHidden: false },
      _count: { rating: true },
    }),
  ]);

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let totalCount = 0;
  let totalStars = 0;
  for (const row of ratingStats) {
    const c = row._count.rating;
    distribution[row.rating] = c;
    totalCount += c;
    totalStars += row.rating * c;
  }

  return {
    ...productWithPricingAndReviews,
    reviews,
    reviewSummary: {
      count: totalCount,
      average: totalCount > 0 ? Number((totalStars / totalCount).toFixed(1)) : 0,
      distribution,
    },
  };
};
const updateProduct = async (
  productId: string,
  payload: IUpdateProductInterface,
  adminInfo: UserInfoFromToken,
  multerImages?: IFile[],
): Promise<any> => {
  // Validate admin
  const checkAdmin = await prisma.user.findUnique({
    where: { id: Number(adminInfo.id) },
    select: { role: true, id: true },
  });
  if (!checkAdmin) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }
  if (checkAdmin.role !== ENUM_USER_ROLE.ADMIN) {
    throw new ApiError(
      status.FORBIDDEN,
      'You are not authorized to perform this action',
    );
  }

  // Check if product exists
  const existingProduct = await prisma.product.findUnique({
    where: { id: Number(productId) },
    include: { flavors: { include: { images: true, sizes: true } } },
  });
  if (!existingProduct) {
    throw new ApiError(status.NOT_FOUND, 'Product not found');
  }

  // Use transaction to ensure data consistency
  return prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const { title, description, categoryId, isActive, isFeatured, flavors } = payload;

      // Check for duplicate title (case-insensitive), excluding this product
      if (title !== undefined && title.toLowerCase() !== existingProduct.title.toLowerCase()) {
        const duplicateProduct = await tx.product.findFirst({
          where: {
            title: { equals: title, mode: 'insensitive' },
            id: { not: Number(productId) },
          },
          select: { id: true, title: true },
        });
        if (duplicateProduct) {
          throw new ApiError(
            status.CONFLICT,
            `Product title "${title}" already exists`,
          );
        }
      }

      // Update basic product info
      const updateData: any = {
        updatedBy: Number(checkAdmin.id),
        updatedAt: new Date(),
      };

      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (categoryId !== undefined) updateData.categoryId = Number(categoryId);
      if (isActive !== undefined) updateData.isActive = isActive;
      if (isFeatured !== undefined) updateData.isFeatured = isFeatured;

      // Update slug if title changed
      if (title && title !== existingProduct.title) {
        updateData.slug = generateSlug(title);
      }

      const updatedProduct = await tx.product.update({
        where: { id: Number(productId) },
        data: updateData,
      });

      // Process flavor operations in correct order
      if (flavors) {
        // 1. Handle flavor removals first (to avoid conflicts)
        if (flavors.remove && flavors.remove.length > 0) {
          await handleFlavorRemovals(tx, Number(productId), flavors.remove);
        }

        // 2. Handle flavor additions
        if (flavors.add && flavors.add.length > 0) {
          await handleFlavorAdditions(tx, Number(productId), flavors.add, multerImages);
        }

        // 3. Handle flavor updates
        if (flavors.update && flavors.update.length > 0) {
          await handleFlavorUpdates(tx, Number(productId), flavors.update, multerImages);
        }
      }

      return updatedProduct;
    },
    {
      maxWait: 5000,
      timeout: 10000,
    },
  );
};

const deleteProduct = async (
  productId: string,
  adminInfo: UserInfoFromToken,
): Promise<any> => {
  // Validate admin
  const checkAdmin = await prisma.user.findUnique({
    where: { id: Number(adminInfo.id) },
    select: { role: true, id: true },
  });
  if (!checkAdmin) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }
  if (checkAdmin.role !== ENUM_USER_ROLE.ADMIN) {
    throw new ApiError(
      status.FORBIDDEN,
      'You are not authorized to perform this action',
    );
  }

  // Check if product exists
  const existingProduct = await prisma.product.findUnique({
    where: { id: Number(productId) },
    include: { flavors: { include: { images: true } } },
  });
  if (!existingProduct) {
    throw new ApiError(status.NOT_FOUND, 'Product not found');
  }

  // Use transaction to ensure data consistency
  return prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      // Order history must block product deletion (OrderItem → Product is restricted)
      const orderItemCount = await tx.orderItem.count({
        where: { productId: Number(productId) },
      });
      if (orderItemCount > 0) {
        throw new ApiError(
          status.CONFLICT,
          'Cannot delete product: it is referenced by existing orders',
        );
      }

      // Clean up cart items referencing this product (FK restrict would fail otherwise)
      await tx.cartItem.deleteMany({
        where: { productId: Number(productId) },
      });

      // Get all product images for cleanup
      const productImages = await tx.file.findMany({
        where: { productId: Number(productId) },
      });

      // Delete in reverse order to maintain foreign key constraints
      await tx.productFlavorSize.deleteMany({
        where: { productId: Number(productId) },
      });

      await tx.file.deleteMany({
        where: { productId: Number(productId) },
      });

      await tx.productFlavor.deleteMany({
        where: { productId: Number(productId) },
      });

      const deletedProduct = await tx.product.delete({
        where: { id: Number(productId) },
      });

      // Clean up image files from filesystem
      if (productImages.length > 0) {
        productImages.forEach(img => {
          const imagePath = path.join(process.cwd(), 'uploads', img.path);
          try {
            if (fs.existsSync(imagePath)) {
              fs.unlinkSync(imagePath);
            }
          } catch (error) {
            ErrorLogger.error(`Error deleting product image: ${error}`);
          }
        });
      }

      return deletedProduct;
    },
    {
      maxWait: 5000,
      timeout: 10000,
    },
  );
};

/**
 * Public storefront feed for the shop grid (products page).
 *
 * Reuses `getAllProducts` on purpose so the filter set and the campaign-aware
 * per-size pricing are identical to GET /product — but it FORCES
 * `isActive: 'true'` (an anonymous visitor must never browse hidden products,
 * which the legacy endpoint happily returns) and then strips the audit/owner
 * columns (`creator`/`createdBy` rows leak user data) plus the raw `campaigns`
 * rows the pricing was already derived from.
 *
 * `limit=0` is mapped onto a generous cap: getAllProducts would otherwise turn
 * it into `take: 0` (an empty page) instead of "everything".
 */
const getPublicProducts = async (
  filters: IProductFilters,
  paginationOptions: IPaginationOptions,
) => {
  const pagination: IPaginationOptions =
    Number(paginationOptions.limit) === 0
      ? { ...paginationOptions, limit: 100 }
      : paginationOptions;

  const result = await getAllProducts(
    { ...filters, isActive: 'true' },
    pagination,
  );

  return {
    ...result,
    data: result.data.map((product) => {
      const copy: any = { ...product };
      delete copy.creator;
      delete copy.createdBy;
      delete copy.campaigns;
      return copy;
    }),
  };
};

export const ProductService = {
  createProduct,
  getAllProducts,
  getPublicProducts,
  getFeaturedProducts,
  getSingleProduct,
  getSingleProductBySlug,
  updateProduct,
  deleteProduct,
};
