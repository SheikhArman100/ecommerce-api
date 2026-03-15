import status from 'http-status';
import { prisma } from '../../client';
import ApiError from '../../errors/ApiError';
import { UserInfoFromToken } from '../../types/common';
import { IWishlist, IWishlistFilters } from './wishlist.interface';
import { IPaginationOptions } from '../../interfaces/common';
import { Prisma } from '../../generated/client';
import { calculatePagination } from '../../helpers/paginationHelper';
import { wishlistSearchableFields } from './wishlist.constant';

const createWishlist = async (
  payload: Partial<IWishlist>,
  userInfo: UserInfoFromToken,
) => {
  //check user
  const checkUser = await prisma.user.findUnique({
    where: { id: Number(userInfo.id) },
    select: { role: true, id: true },
  });
  if (!checkUser) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }

  const { productId } = payload;
  if (!productId) {
    throw new ApiError(status.BAD_REQUEST, 'Product ID is required');
  }
  //check Product
  const checkProduct = await prisma.product.findUnique({
    where: {
      id: Number(productId),
    },
    select: {
      id: true,
      title: true,
    },
  });
  if (!checkProduct) {
    throw new ApiError(status.NOT_FOUND, 'Product not found');
  }

  //check if user already added that product in wishlist
  const checkWishlist = await prisma.wishList.findFirst({
    where: {
      userId: Number(userInfo.id),
      productId: Number(checkProduct.id),
    },
  });
  if (checkWishlist) {
    throw new ApiError(status.CONFLICT, `Product is already in your wishlist`);
  }
  const newWishlist = await prisma.wishList.create({
    data: {
      productId: checkProduct.id,
      userId: checkUser.id,
    },
    select: {
      id: true,
      userId: true,
      productId: true,
      createdAt: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      product: {
        select: {
          title: true,
        },
      },
    },
  });

  return newWishlist;
};

const getAllWishlists = async (
  filters: IWishlistFilters,
  paginationOptions: IPaginationOptions,
  userInfo: UserInfoFromToken,
) => {
 

  const { searchTerm, ...filtersData } = filters;
  const { page, limit, skip, orderBy } = calculatePagination(paginationOptions);

  let whereConditions: Prisma.WishListWhereInput = {};

  // Add search term condition if provided
  if (searchTerm) {
    whereConditions = {
      ...whereConditions,
      product: {
        title: {
          contains: searchTerm,
        },
      },
    };
  }

  // Add other filter conditions
  if (Object.keys(filtersData).length) {
    whereConditions = {
      ...whereConditions,
      AND: Object.entries(filtersData).map(([field, value]) => ({
        [field]:
          field.toLowerCase().endsWith('id') || field === 'id'
            ? Number(value)
            : typeof value === 'string' &&
                (value === 'true' || value === 'false')
              ? value === 'true'
              : value,
      })),
    };
  }

  // Get total count
  const count = await prisma.wishList.count({ where: whereConditions });

  // Fetch wishlists with pagination and relations
  const result = await prisma.wishList.findMany({
    where: whereConditions,
    orderBy: orderBy,
    skip,
    take: limit,
    select: {
      id: true,
      userId: true,
      productId: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          detail: {
            select: {
              profileImage: true, // ✅ User profile image path
              image: true,
            }
          }
        },
      },
      product: {
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          isActive: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
            }
          },
        }
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

const getWishlistByUser = async (userInfo: UserInfoFromToken) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(userInfo.id) },
    select: { role: true, id: true },
  });
  if (!user) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }
  const result = await prisma.wishList.findMany({
    where: {
      userId: Number(user.id),
    },
    select: {
      id: true,
      userId: true,
      productId: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          detail: {
            select: {
              profileImage: true, // ✅ User profile image path
              image: true,
            }
          }
        },
      },
      product: {
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          isActive: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
            }
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
                startDate: { lte: new Date() },
                endDate: { gte: new Date() },
              },
            },
            select: {
              customDiscountPercentage: true,
              campaign: {
                select: {
                  id: true,
                  title: true,
                  discountDefault: true,
                },
              },
            },
          },
        }
      },
    },
  });

  const resultWithPricing = result.map((wishlist: any) => {
    let maxDiscount = 0;
    let activeCampaign = null;

    wishlist.product.campaigns?.forEach((cp: any) => {
      const discount = cp.customDiscountPercentage ?? cp.campaign.discountDefault;
      if (discount > maxDiscount) {
        maxDiscount = discount;
        activeCampaign = cp.campaign;
      }
    });

    const flavorsWithPricing = wishlist.product.flavors.map((flavor: any) => ({
      ...flavor,
      sizes: flavor.sizes.map((size: any) => ({
        ...size,
        originalPrice: size.price,
        salesPrice: maxDiscount > 0 ? parseFloat((size.price * (1 - maxDiscount / 100)).toFixed(2)) : size.price,
        discountPercentage: maxDiscount,
      })),
    }));

    // Remove the raw campaigns array to keep the response clean
    const { campaigns, ...productData } = wishlist.product;

    return {
      ...wishlist,
      product: {
        ...productData,
        activeCampaign,
        flavors: flavorsWithPricing,
      }
    };
  });

  return resultWithPricing;
}

const getWishlistByID = async (id: string, userInfo: UserInfoFromToken) => {
  // First check if user exists and get their role
  const user = await prisma.user.findUnique({
    where: { id: Number(userInfo.id) },
    select: { role: true }
  });

  if (!user) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }

  const findWishlist = await prisma.wishList.findUnique({
    where: {
      id: Number(id),
    },
    select: {
      id: true,
      userId: true,
      productId: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          detail: {
            select: {
              profileImage: true, // ✅ User profile image path
              image: true,
            }
          }
        },
      },
      product: {
        select: {
          id: true,
          title: true,
          slug: true,
          description: true,
          isActive: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
            }
          },
        }
      },
    },
  });

  if (!findWishlist) {
    throw new ApiError(status.NOT_FOUND, 'Wishlist not found');
  }

  // Check if user can access this wishlist item
  if (findWishlist.userId !== Number(userInfo.id) && user.role !== 'admin') {
    throw new ApiError(status.FORBIDDEN, 'You can only access your own wishlist items');
  }

  return findWishlist;
};

const updateWishlist = async (id: string, payload: Partial<IWishlist>, userInfo: UserInfoFromToken) => {
  // Check if wishlist exists and belongs to user
  const wishlist = await prisma.wishList.findUnique({
    where: { id: Number(id) },
  });

  if (!wishlist) {
    throw new ApiError(status.NOT_FOUND, 'Wishlist item not found');
  }

  if (wishlist.userId !== Number(userInfo.id)) {
    throw new ApiError(status.FORBIDDEN, 'You can only update your own wishlist items');
  }

  // For wishlist, typically you might only update timestamps or add notes
  // Since the model is simple, we'll just update the updatedAt timestamp
  const updatedWishlist = await prisma.wishList.update({
    where: { id: Number(id) },
    data: {
      updatedAt: new Date(),
    },
    select: {
      id: true,
      userId: true,
      productId: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      product: {
        select: {
          title: true,
        },
      },
    },
  });

  return updatedWishlist;
};

const deleteWishlistByID = async (id:string,userInfo:UserInfoFromToken) => {
  // First check if user exists and get their role
  const user = await prisma.user.findUnique({
    where: { id: Number(userInfo.id) },
    select: { role: true }
  });

  if (!user) {
    throw new ApiError(status.NOT_FOUND, "User not found");
  }

  // Check if wishlist exists and get its data
  const wishlist = await prisma.wishList.findUnique({
    where: { id: Number(id) },
    select: {
      id: true,
      userId: true,
      product: { select: { title: true } }
    }
  });

  if (!wishlist) {
    throw new ApiError(status.NOT_FOUND, "Wishlist item not found");
  }

  // Check ownership - user can only delete their own items, admin can delete any
  if (wishlist.userId !== Number(userInfo.id) && user.role !== 'admin') {
    throw new ApiError(status.FORBIDDEN, "You can only delete your own wishlist items");
  }

  // Now safely delete the wishlist item
  const deletedWishlist = await prisma.wishList.delete({
    where: { id: Number(id) },
    select: {
      id: true,
      userId: true,
      productId: true,
      product: { select: { title: true } }
    }
  });

  return deletedWishlist;
};

export const WishlistService = {
  createWishlist,
  getAllWishlists,
  getWishlistByUser,
  getWishlistByID,
  updateWishlist,
  deleteWishlistByID,
};
