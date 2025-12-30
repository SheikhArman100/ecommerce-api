import { Prisma } from '../../generated/client';
import status from 'http-status';
import { prisma } from '../../client';
import { ENUM_USER_ROLE } from '../../enum/user';
import ApiError from '../../errors/ApiError';
import { calculatePagination } from '../../helpers/paginationHelper';
import { IFile, IPaginationOptions } from '../../interfaces/common';
import { UserInfoFromToken } from '../../types/common';
import { productSearchableFields } from './product.constant';
import { IProductBody, IProductFilters, IProductUpdateBody } from './product.interface';
import fs from 'fs';
import path from 'path';
import ErrorLogger from '../../logger/errorLogger';

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
  const { title, description, categoryId, flavors } = payload;

  if (
    !title ||
    !description ||
    !categoryId ||
    !Array.isArray(flavors) ||
    flavors.length === 0
  ) {
    throw new ApiError(status.BAD_REQUEST, 'Missing required product details');
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
      description: true,
      isActive: true,
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
        },
      },
      flavors: {
        select: {
          flavor: {
            select: {
              name: true,
              color: true,
            },
          },
          sizes: {
            select: {
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
              path: true,
              originalName: true,
              modifiedName: true,
            },
          },
        },
      },
    },
  });

  return {
    meta: {
      page,
      limit: limit === 0 ? count : limit,
      count,
    },
    data: result,
  };
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
      slug:true,
      isActive: true,
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
          images: true,
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
    },
  });
  if (!checkProduct) {
    throw new ApiError(status.NOT_FOUND, 'Product not found');
  }

  return checkProduct;
};
const getSingleProductBySlug = async (slug: string) => {
  //checkProduct
  const checkProduct = await prisma.product.findUnique({
    where: {
      slug:slug,
    },
    select: {
      id: true,
      title: true,
      slug:true,
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
          images: true,
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
    },
  });
  if (!checkProduct) {
    throw new ApiError(status.NOT_FOUND, 'Product not found');
  }

  return checkProduct;
};
const handleSizeOperations = async (
  tx: Prisma.TransactionClient,
  productId: number,
  flavorId: number,
  operations: {
    add?: { sizeId: number; stock: number; price: number }[];
    update?: { sizeId: number; stock?: number; price?: number }[];
    remove?: number[];
  },
) => {
  // Remove specified sizes
  if (operations.remove && operations.remove.length > 0) {
    await tx.productFlavorSize.deleteMany({
      where: {
        productId,
        flavorId,
        sizeId: { in: operations.remove },
      },
    });
  }

  // Update existing sizes
  if (operations.update && operations.update.length > 0) {
    await Promise.all(
      operations.update.map(async (update) => {
        const updateData: any = {};
        if (update.stock !== undefined) updateData.stock = Number(update.stock);
        if (update.price !== undefined) updateData.price = parseFloat(update.price.toString());

        await tx.productFlavorSize.updateMany({
          where: {
            productId,
            flavorId,
            sizeId: update.sizeId,
          },
          data: updateData,
        });
      }),
    );
  }

  // Add new sizes
  if (operations.add && operations.add.length > 0) {
    await Promise.all(
      operations.add.map(async (size) => {
        // Validate size exists
        const checkSize = await tx.size.findUnique({
          where: { id: Number(size.sizeId) },
          select: { id: true },
        });
        if (!checkSize) {
          throw new ApiError(status.NOT_FOUND, `Size not found`);
        }

        await tx.productFlavorSize.create({
          data: {
            productId,
            flavorId,
            sizeId: Number(size.sizeId),
            stock: Number(size.stock),
            price: parseFloat(size.price.toString()),
            soldByQuantity: false,
          },
        });
      }),
    );
  }
};

const replaceAllSizes = async (
  tx: Prisma.TransactionClient,
  productId: number,
  flavorId: number,
  sizes: { sizeId: number; stock: number; price: number }[],
) => {
  // Delete existing sizes
  await tx.productFlavorSize.deleteMany({
    where: {
      productId,
      flavorId,
    },
  });

  // Create new sizes
  if (sizes && sizes.length > 0) {
    await Promise.all(
      sizes.map(async (size) => {
        // Validate size exists
        const checkSize = await tx.size.findUnique({
          where: { id: Number(size.sizeId) },
          select: { id: true },
        });
        if (!checkSize) {
          throw new ApiError(status.NOT_FOUND, `Size not found`);
        }

        return tx.productFlavorSize.create({
          data: {
            productId,
            flavorId,
            sizeId: Number(size.sizeId),
            stock: Number(size.stock),
            price: parseFloat(size.price.toString()),
            soldByQuantity: false,
          },
        });
      }),
    );
  }
};

const updateQuantityBasedFlavor = async (
  tx: Prisma.TransactionClient,
  productId: number,
  flavorId: number,
  stock?: number,
  price?: number,
) => {
  const updateData: any = { soldByQuantity: true };

  if (stock !== undefined) updateData.stock = Number(stock);
  if (price !== undefined) updateData.price = parseFloat(price.toString());

  // Update or create the quantity-based size record
  const existingSize = await tx.productFlavorSize.findFirst({
    where: {
      productId,
      flavorId,
      soldByQuantity: true,
    },
  });

  if (existingSize) {
    await tx.productFlavorSize.update({
      where: { id: existingSize.id },
      data: updateData,
    });
  } else {
    await tx.productFlavorSize.create({
      data: {
        productId,
        flavorId,
        sizeId: undefined,
        stock: stock || 0,
        price: price || 0,
        soldByQuantity: true,
      },
    });
  }
};

const handleImageOperations = async (
  tx: Prisma.TransactionClient,
  productId: number,
  flavorId: number,
  operations: {
    add?: any[];
    remove?: number[];
  },
  multerImages?: IFile[],
  flavorIndex?: number,
) => {
  // Remove specified images
  if (operations.remove && operations.remove.length > 0) {
    // Get image records for cleanup
    const imagesToDelete = await tx.file.findMany({
      where: {
        id: { in: operations.remove },
        productId,
        flavorId,
      },
    });

    // Delete from database
    await tx.file.deleteMany({
      where: {
        id: { in: operations.remove },
        productId,
        flavorId,
      },
    });

    // Delete from filesystem
    imagesToDelete.forEach((img) => {
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

  // Add new images
  if (operations.add && multerImages && flavorIndex !== undefined) {
    const flavorImages = Array.isArray(multerImages)
      ? multerImages.filter((img) => img.fieldname === `flavors[${flavorIndex}][images]`)
      : [];

    if (flavorImages.length > 0) {
      await Promise.all(
        flavorImages.map((img) =>
          tx.file.create({
            data: {
              productId,
              flavorId,
              diskType: 'LOCAL',
              path: `product/images/${img.filename}`,
              originalName: img.originalname,
              modifiedName: img.filename,
            },
          }),
        ),
      );
    }
  }
};

const addNewImages = async (
  tx: Prisma.TransactionClient,
  productId: number,
  flavorId: number,
  multerImages?: IFile[],
  flavorIndex?: number,
) => {
  if (multerImages && flavorIndex !== undefined) {
    const flavorImages = Array.isArray(multerImages)
      ? multerImages.filter((img) => img.fieldname === `flavors[${flavorIndex}][images]`)
      : [];

    if (flavorImages.length > 0) {
      await Promise.all(
        flavorImages.map((img) =>
          tx.file.create({
            data: {
              productId,
              flavorId,
              diskType: 'LOCAL',
              path: `product/images/${img.filename}`,
              originalName: img.originalname,
              modifiedName: img.filename,
            },
          }),
        ),
      );
    }
  }
};

const updateProduct = async (
  productId: string,
  payload: IProductUpdateBody,
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
      const { title, description, categoryId, flavors, isActive } = payload;

      // Update basic product info
      const updateData: any = {
        updatedBy: Number(checkAdmin.id),
        updatedAt: new Date(),
      };

      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (categoryId !== undefined) updateData.categoryId = Number(categoryId);
      if (isActive !== undefined) updateData.isActive = isActive;

      // Update slug if title changed
      if (title && title !== existingProduct.title) {
        updateData.slug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      }

      const updatedProduct = await tx.product.update({
        where: { id: Number(productId) },
        data: updateData,
      });

      // Handle flavors update with granular operations support
      if (flavors && Array.isArray(flavors)) {
        await Promise.all(
          flavors.map(async (flavor, index) => {
            // Check if flavor exists in database
            const checkFlavor = await tx.flavor.findUnique({
              where: { id: Number(flavor.flavorId) },
              select: { id: true },
            });
            if (!checkFlavor) {
              throw new ApiError(status.NOT_FOUND, `Flavor not found`);
            }

            // Ensure ProductFlavor exists
            const existingProductFlavor = await tx.productFlavor.findUnique({
              where: {
                productId_flavorId: {
                  productId: Number(productId),
                  flavorId: Number(flavor.flavorId),
                },
              },
            });

            if (!existingProductFlavor) {
              // Create new ProductFlavor if it doesn't exist
              await tx.productFlavor.create({
                data: {
                  productId: Number(productId),
                  flavorId: Number(flavor.flavorId),
                },
              });
            }

            // Handle size operations (granular or complete replacement)
            if (flavor.sizeOperations) {
              // Granular size operations
              await handleSizeOperations(tx, Number(productId), Number(flavor.flavorId), flavor.sizeOperations);
            } else if (flavor.sizes) {
              // Complete size replacement (backward compatibility)
              await replaceAllSizes(tx, Number(productId), Number(flavor.flavorId), flavor.sizes);
            }

            // Handle quantity-based updates
            if (flavor.soldByQuantity && (flavor.stock !== undefined || flavor.price !== undefined)) {
              await updateQuantityBasedFlavor(tx, Number(productId), Number(flavor.flavorId), flavor.stock, flavor.price);
            }

            // Handle image operations
            if (flavor.imageOperations) {
              // Granular image operations
              await handleImageOperations(tx, Number(productId), Number(flavor.flavorId), flavor.imageOperations, multerImages, index);
            } else {
              // Add new images only (backward compatibility)
              await addNewImages(tx, Number(productId), Number(flavor.flavorId), multerImages, index);
            }
          }),
        );
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

export const ProductService = {
  createProduct,
  getAllProducts,
  getSingleProduct,
  getSingleProductBySlug,
  updateProduct,
  deleteProduct,
};
