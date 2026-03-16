import status from 'http-status';
import { prisma } from '../../client';
import ApiError from '../../errors/ApiError';
import { UserInfoFromToken } from '../../types/common';
import { ICart, ICartFilters, ICartItem } from './cart.interface';
import { IPaginationOptions } from '../../interfaces/common';
import { calculatePagination } from '../../helpers/paginationHelper';
import { Prisma } from '../../generated/client';
import { cartSearchableFields } from './cart.constant';
import { calculateCartTotals } from './cart.utils';



const createCart = async (
  payload: Partial<ICartItem>,
  userInfo: UserInfoFromToken,
) => {
  // Check if user exists
  const checkUser = await prisma.user.findUnique({
    where: { id: Number(userInfo.id) },
  });
  if (!checkUser) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }
  //check if product exist or not
  const checKProduct = await prisma.product.findUnique({
    where: {
      id: Number(payload.productId),
    },
    select: { id: true, title: true },
  });
  if (!checKProduct) {
    throw new ApiError(
      status.NOT_FOUND,
      `Product with ID ${payload.productId} not found`,
    );
  }

  //check if flavor exist for that product
  const checkFlavor = await prisma.productFlavor.findFirst({
    where: {
      productId: Number(payload.productId),
      flavorId: Number(payload.flavorId),
    },
    include: { flavor: { select: { name: true } } },
  });
  if (!checkFlavor) {
    throw new ApiError(
      status.NOT_FOUND,
      `Flavor with ID ${payload.flavorId} not found for product "${checKProduct.title}"`,
    );
  }

  // Prepare sizeId for query (handle null for quantity products)
  const querySizeId = payload.sizeId ? Number(payload.sizeId) : null;

  //check if size exist for this product and flavor
  const checkSize = await prisma.productFlavorSize.findFirst({
    where: {
      productId: Number(payload.productId),
      flavorId: Number(payload.flavorId),
      sizeId: querySizeId,
    },
    include: { size: { select: { name: true } } },
  });
  if (!checkSize) {
    throw new ApiError(
      status.NOT_FOUND,
      `Size with ID ${payload.sizeId} not found for product "${checKProduct.title}" and flavor "${checkFlavor.flavor.name}"`,
    );
  }

  // Check for existing cart item with the same combination
  const existingCartItem = await prisma.cartItem.findFirst({
    where: {
      cart: { userId: Number(userInfo.id) },
      productId: Number(payload.productId),
      flavorId: Number(payload.flavorId),
      sizeId: querySizeId as any,
    },
    include: { cart: true },
  });

  let cart: ICart;
  if (existingCartItem) {
    const mergedQuantity = existingCartItem.quantity + (payload.quantity ?? 1);
    if (checkSize.stock < mergedQuantity) {
      throw new ApiError(
        status.INSUFFICIENT_STORAGE,
        `Cannot add item: insufficient stock for "${checKProduct.title}". Available: ${checkSize.stock}, Total requested: ${mergedQuantity} (you already have ${existingCartItem.quantity} in cart)`,
      );
    }

    // Update existing cart item in a transaction
    cart = (await prisma.$transaction(async tx => {
      await tx.cartItem.update({
        where: { id: existingCartItem.id },
        data: {
          quantity: mergedQuantity,
          updatedAt: new Date(),
        },
      });

      // Fetch updated cart
      return tx.cart.findUnique({
        where: { id: existingCartItem.cartId },
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: {
            include: {
              product: { select: { id: true, title: true, slug: true } },
              productFlavorSize: { select: { price: true, stock: true } },
            },
          },
        },
      });
    })) as ICart;
  } else {
    // Check stock for new quantity
    if ((payload.quantity ?? 1) > checkSize.stock) {
      throw new ApiError(
        status.INSUFFICIENT_STORAGE,
        `Insufficient stock for product "${checKProduct.title}" (ID: ${payload.productId}), flavor "${checkFlavor.flavor.name}" (ID: ${payload.flavorId}), size "${checkSize.size?.name || 'N/A'}" (ID: ${payload.sizeId}). Available: ${checkSize.stock}, Requested: ${payload.quantity}`,
      );
    }

    const existingCart = await prisma.cart.findUnique({
      where: { userId: checkUser.id },
    });

    if (existingCart) {
      cart = await prisma.cart.update({
        where: { id: existingCart.id },
        data: {
          items: {
            create: {
              productId: Number(payload.productId),
              flavorId: Number(payload.flavorId),
              sizeId: querySizeId as any,
              quantity: payload.quantity ?? 1,
            },
          },
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: {
            include: {
              product: { select: { id: true, title: true, slug: true } },
              productFlavorSize: { select: { price: true, stock: true } },
            },
          },
        },
      });
    } else {
      cart = await prisma.cart.create({
        data: {
          userId: Number(userInfo.id),
          items: {
            create: {
              productId: Number(payload.productId),
              flavorId: Number(payload.flavorId),
              sizeId: querySizeId as any,
              quantity: payload.quantity ?? 1,
            },
          },
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: {
            include: {
              product: { select: { id: true, title: true, slug: true } },
              productFlavorSize: { select: { price: true, stock: true } },
            },
          },
        },
      });
    }
  }

  return cart;
};

const getAllCarts = async (
  filters: ICartFilters,
  paginationOptions: IPaginationOptions,
) => {
  const { searchTerm, ...filtersData } = filters;
  const { page, limit, skip, orderBy } = calculatePagination(paginationOptions);

  let whereConditions: Prisma.CartWhereInput = {};

  // Add search term condition if provided
  if (searchTerm) {
    whereConditions = {
      OR: [
        {
          user: {
            name: {
              contains: searchTerm
            }
          }
        },
        {
          user: {
            email: {
              contains: searchTerm
            }
          }
        }
      ]
    };
  }

  // Handle special filters
  const andConditions: Prisma.CartWhereInput[] = [];

  if (filtersData.userId) {
    const parsedUserId = parseInt(filtersData.userId as string, 10);
    if (!isNaN(parsedUserId)) {
      andConditions.push({ userId: parsedUserId });
    }
  }

  if (filtersData.productId) {
    const parsedProductId = parseInt(filtersData.productId as string, 10);
    if (!isNaN(parsedProductId)) {
      andConditions.push({
        items: {
          some: { productId: parsedProductId }
        }
      });
    }
  }

  if (andConditions.length > 0) {
    whereConditions = {
      ...whereConditions,
      AND: andConditions,
    };
  }

  

  const count = await prisma.cart.count({ where: whereConditions });

  const result = await prisma.cart.findMany({
    where: whereConditions,
    orderBy,
    skip,
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          detail: {
            select: {
              profileImage: true,
              image:true,
            }
          }
        }
      },
      items: {
        include: {
          productFlavorSize: {
            select: {
              price: true,
            }
          }
        }
      }
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

const getSingleCart = async (userInfo: UserInfoFromToken) => {
  //check if user exists
  const checkUser = await prisma.user.findUnique({
    where: { id: Number(userInfo.id) },
  });
  if (!checkUser) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }
  //check if cart exists
  const checkCart = await prisma.cart.findUnique({
    where: { userId: checkUser.id },
    include: {
      user: { select: { id: true, name: true, email: true } },
      items: {
        include: {
          product: {
            include: {
              category: { select: { id: true, name: true } },
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
          productFlavorSize: {
            include: {
              size: { select: { id: true, name: true } },
              productFlavor: {
                include: {
                  flavor: { select: { id: true, name: true, color: true } },
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
            },
          },
        },
      },
    },
  });

  if (!checkCart) {
    throw new ApiError(status.NOT_FOUND, 'Cart not found');
  }

  // Calculate pricing for each item
  const itemsWithPricing = checkCart.items.map((item: any) => {
    let maxDiscount = 0;
    let activeCampaign = null;

    item.product.campaigns?.forEach((cp: any) => {
      const discount = cp.customDiscountPercentage ?? cp.campaign.discountDefault;
      if (discount > maxDiscount) {
        maxDiscount = discount;
        activeCampaign = cp.campaign;
      }
    });

    const originalPrice = item.productFlavorSize.price;
    const salesPrice = maxDiscount > 0 
      ? parseFloat((originalPrice * (1 - maxDiscount / 100)).toFixed(2)) 
      : originalPrice;

    return {
      ...item,
      salesPrice,
      originalPrice,
      discountPercentage: maxDiscount,
      activeCampaign,
    };
  });

  // Calculate cart totals
  const cartWithTotals = {
    ...checkCart,
    items: itemsWithPricing,
    totals: calculateCartTotals(itemsWithPricing),
  };

  return cartWithTotals;
};

const getCartByID = async (cartId: string, userInfo: UserInfoFromToken) => {
  // Check if user exists
  const checkUser = await prisma.user.findUnique({
    where: { id: Number(userInfo.id) },
  });
  if (!checkUser) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }

  // Check if cart exists
  const checkCart = await prisma.cart.findUnique({
    where: { id: Number(cartId) },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isVerified: true,
          createdAt: true,
          updatedAt: true,
          detail: {
            select: {
              profileImage: true,
              address: true,
              city: true,
              road: true,
              image: true,
            }
          }
        }
      },
      items: {
        include: {
          product: {
            include: {
              category: { select: { id: true, name: true } },
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
          productFlavorSize: {
            include: {
              size: { select: { id: true, name: true, description: true } },
              productFlavor: {
                include: {
                  flavor: { select: { id: true, name: true, color: true, description: true } },
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
            },
          },
        },
      },
    },
  });
  if (!checkCart) {
    throw new ApiError(status.NOT_FOUND, 'Cart not found');
  }

  // Check if user is admin or cart owner
  if (checkUser.role !== 'admin' && checkCart.userId !== Number(userInfo.id)) {
    throw new ApiError(
      status.FORBIDDEN,
      'You are not authorized to view this cart',
    );
  }

  // Calculate pricing for each item
  const itemsWithPricing = checkCart.items.map((item: any) => {
    let maxDiscount = 0;
    let activeCampaign = null;

    item.product.campaigns?.forEach((cp: any) => {
      const discount = cp.customDiscountPercentage ?? cp.campaign.discountDefault;
      if (discount > maxDiscount) {
        maxDiscount = discount;
        activeCampaign = cp.campaign;
      }
    });

    const originalPrice = item.productFlavorSize.price;
    const salesPrice = maxDiscount > 0 
      ? parseFloat((originalPrice * (1 - maxDiscount / 100)).toFixed(2)) 
      : originalPrice;

    return {
      ...item,
      salesPrice,
      originalPrice,
      discountPercentage: maxDiscount,
      activeCampaign,
    };
  });

  // Calculate cart totals
  const cartWithTotals = {
    ...checkCart,
    items: itemsWithPricing,
    totals: calculateCartTotals(itemsWithPricing),
  };

  return cartWithTotals;
};

const updateCartItemByID = async (
  id: string,
  payload: Partial<ICartItem>,
  userInfo: UserInfoFromToken,
) => {
  //check if user exists
  const checkUser = await prisma.user.findUnique({
    where: { id: Number(userInfo.id) },
  });
  if (!checkUser) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }
  //check if cart item exists
  const checkCartItem = await prisma.cartItem.findUnique({
    where: { id: Number(id) },
  });
  if (!checkCartItem) {
    throw new ApiError(status.NOT_FOUND, 'Cart item not found');
  }
  //check if cart item belongs to this user (admins can update anyone's cart)
  const checkCart = await prisma.cart.findUnique({
    where: { id: checkCartItem.cartId },
  });
  if (!checkCart) {
    throw new ApiError(status.NOT_FOUND, 'Cart not found');
  }
  if (checkUser.role !== 'admin' && checkCart.userId !== Number(userInfo.id)) {
    throw new ApiError(
      status.FORBIDDEN,
      'You are not authorized to update this cart item',
    );
  }
  const { quantity } = payload;

  // //if quantity is less than 1, delete the cart item
  // if (quantity && quantity < 1) {
  //   const deletedCartItem = await prisma.cartItem.delete({
  //     where: { id: Number(id) },
  //   });
  //   if (!deletedCartItem) {
  //     throw new ApiError(status.NOT_FOUND, 'Cart item not found');
  //   }
  //   return deletedCartItem;
  // }

  //check stock before update
  const checkSize = await prisma.productFlavorSize.findFirst({
    where: {
      productId: checkCartItem.productId,
      flavorId: checkCartItem.flavorId,
      sizeId: checkCartItem.sizeId,
    },
    include: { size: { select: { name: true } } },
  });
  if (!checkSize) {
    throw new ApiError(
      status.NOT_FOUND,
      `Size with ID ${checkCartItem.sizeId} not found for product "${checkCartItem.productId}" and flavor "${checkCartItem.flavorId}"`,
    );
  }
  if (checkSize.stock < (quantity ?? 1)) {
    throw new ApiError(
      status.INSUFFICIENT_STORAGE,
      `Insufficient stock for product "${checkCartItem.productId}", flavor "${checkCartItem.flavorId}", size "${checkSize.size?.name || 'N/A'}". Available: ${checkSize.stock}, Requested: ${quantity}`,
    );
  }
  //update cart item
  const updatedCartItem = await prisma.cartItem.update({
    where: { id: Number(id) },
    data: {
      quantity: quantity,
    },
  });
  if (!updatedCartItem) {
    throw new ApiError(status.NOT_FOUND, 'Cart item not found');
  }
  return updatedCartItem;
};

const deleteCartItemByID = async (id: string, userInfo: UserInfoFromToken) => {
  //check if user exists
  const checkUser = await prisma.user.findUnique({
    where: { id: Number(userInfo.id) },
  });
  if (!checkUser) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }

  //check if cart item exists
  const checkCartItem = await prisma.cartItem.findUnique({
    where: { id: Number(id) },
  });
  if (!checkCartItem) {
    throw new ApiError(status.NOT_FOUND, 'Cart item not found');
  }
  //check if cart item belongs to this user (admins can delete anyone's cart items)
  const checkCart = await prisma.cart.findUnique({
    where: { id: checkCartItem.cartId },
  });
  if (!checkCart) {
    throw new ApiError(status.NOT_FOUND, 'Cart not found');
  }
  if (checkUser.role !== 'admin' && checkCart.userId !== Number(userInfo.id)) {
    throw new ApiError(
      status.FORBIDDEN,
      'You are not authorized to delete this cart item',
    );
  }
  //delete cart item
  const deletedCartItem = await prisma.cartItem.delete({
    where: { id: Number(id) },
  });
  if (!deletedCartItem) {
    throw new ApiError(status.NOT_FOUND, 'Cart item not found');
  }
  return deletedCartItem;
};

export const CartService = {
  createCart,
  getAllCarts,
  getSingleCart,
  getCartByID,
  updateCartItemByID,
  deleteCartItemByID,
};
