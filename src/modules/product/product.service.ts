import status from 'http-status';
import { prisma } from '../../client';
import ApiError from '../../errors/ApiError';
import { IFile, IPaginationOptions } from '../../interfaces/common';
import { UserInfoFromToken } from '../../types/common';
import { IProductBody, IProductFilters } from './product.interface';
import { ENUM_USER_ROLE } from '../../enum/user';
import { Prisma } from '@prisma/client';
import { calculatePagination } from '../../helpers/paginationHelper';
import { productSearchableFields } from './product.constant';

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
      // Create Product
      const newProduct = await tx.product.create({
        data: {
          title,
          description,
          categoryId: Number(categoryId),
          createdBy: Number(checkAdmin.id),
          updatedBy: Number(checkAdmin.id),
        },
      });
      // Process flavors, sizes, and images in parallel
      await Promise.all(
        flavors.map(async (flavor, index) => {
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
            tx.image.create({
              data: {
                productId: newProduct.id,
                flavorId: createdFlavor.flavorId,
                diskType: 'LOCAL',
                path: img.path,
                originalName: img.originalname,
                modifiedName: img.filename,
              },
            }),
          );

          // Create sizes for this flavor
          const sizePromises = flavor.sizes.map(size =>
            tx.productFlavorSize.create({
              data: {
                productId: newProduct.id,
                flavorId: createdFlavor.flavorId,
                sizeId: Number(size.sizeId),
                stock: Number(size.stock),
                price: parseFloat(size.price.toString()),
              },
            }),
          );

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

  if (inStock) {
    const parsedInStock = inStock.toLowerCase() === 'true';
    if (parsedInStock) {
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
      createdBy:true,
      creator:{
        select:{
          name:true,
          email:true,
          role:true
        }
      },
      categoryId:true,
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
export const ProductService = {
  createProduct,
  getAllProducts,
};
