import status from 'http-status';
import { prisma } from '../../client';
import ApiError from '../../errors/ApiError';
import { UserInfoFromToken } from '../../types/common';
import { IOrder, IOrderFilters, IOrderItem, IOrderUpdate } from './order.interface';
import { IPaginationOptions } from '../../interfaces/common';
import { calculatePagination } from '../../helpers/paginationHelper';
import { Prisma, OrderStatus } from '../../generated/client';
import { orderSearchableFields, ALLOWED_STATUS_TRANSITIONS } from './order.constant';

const createOrderFromCart = async (
  userInfo: UserInfoFromToken,
): Promise<IOrder> => {
  // Check if user exists
  const checkUser = await prisma.user.findUnique({
    where: { id: Number(userInfo.id) },
  });
  if (!checkUser) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }

  // Check if user has a cart with items
  const userCart = await prisma.cart.findUnique({
    where: { userId: checkUser.id },
    include: {
      items: {
        include: {
          productFlavorSize: true,
          product: { select: { title: true, isActive: true } }
        }
      }
    }
  });

  if (!userCart || userCart.items.length === 0) {
    throw new ApiError(status.BAD_REQUEST, 'Cart is empty or does not exist');
  }

  // Validate all cart items
  let totalAmount = 0;
  const orderItems: any[] = [];

  for (const cartItem of userCart.items) {
    const productVariant = cartItem.productFlavorSize;

    // Check if product is active
    if (!cartItem.product.isActive) {
      throw new ApiError(
        status.BAD_REQUEST,
        `Product "${cartItem.product.title}" is no longer available`
      );
    }

    // Check stock availability
    if (cartItem.quantity > productVariant.stock) {
      throw new ApiError(
        status.INSUFFICIENT_STORAGE,
        `Insufficient stock for "${cartItem.product.title}". Available: ${productVariant.stock}, Requested: ${cartItem.quantity}`
      );
    }

    const itemPrice = productVariant.price * cartItem.quantity;
    totalAmount += itemPrice;

    orderItems.push({
      productId: cartItem.productId,
      flavorId: cartItem.flavorId,
      sizeId: cartItem.sizeId,
      quantity: cartItem.quantity,
      price: productVariant.price
    });
  }

  // Create order and order items in a transaction
  const order = await prisma.$transaction(async (tx) => {
    // Create the order
    const newOrder = await tx.order.create({
      data: {
        userId: checkUser.id,
        totalAmount,
        status: OrderStatus.Pending,
        items: {
          create: orderItems
        }
      },
      include: {
        items: {
          include: {
            product: { select: { title: true, slug: true } },
            productFlavorSize: { select: { price: true } }
          }
        }
      }
    });

    // Update stock quantities
    for (const cartItem of userCart.items) {
      await tx.productFlavorSize.update({
        where: {
          productId_flavorId_sizeId: {
            productId: cartItem.productId,
            flavorId: cartItem.flavorId,
            sizeId: cartItem.sizeId
          }
        },
        data: {
          stock: {
            decrement: cartItem.quantity
          }
        }
      });
    }

    // Clear the user's cart
    await tx.cartItem.deleteMany({
      where: { cartId: userCart.id }
    });

    return newOrder;
  });

  return order as IOrder;
};

const getAllOrders = async (
  filters: IOrderFilters,
  paginationOptions: IPaginationOptions,
) => {
  const { searchTerm, ...filtersData } = filters;
  const { page, limit, skip, orderBy } = calculatePagination(paginationOptions);

  let whereConditions: Prisma.OrderWhereInput = {};

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
  const andConditions: Prisma.OrderWhereInput[] = [];

  if (filtersData.userId) {
    const parsedUserId = parseInt(filtersData.userId as string, 10);
    if (!isNaN(parsedUserId)) {
      andConditions.push({ userId: parsedUserId });
    }
  }

  if (filtersData.status) {
    andConditions.push({ status: filtersData.status });
  }

  // Amount range filters
  if (filtersData.minAmount) {
    const minAmount = parseFloat(filtersData.minAmount as string);
    if (!isNaN(minAmount)) {
      andConditions.push({ totalAmount: { gte: minAmount } });
    }
  }

  if (filtersData.maxAmount) {
    const maxAmount = parseFloat(filtersData.maxAmount as string);
    if (!isNaN(maxAmount)) {
      andConditions.push({ totalAmount: { lte: maxAmount } });
    }
  }

  // Date range filters
  if (filtersData.startDate) {
    const startDate = new Date(filtersData.startDate as string);
    if (!isNaN(startDate.getTime())) {
      andConditions.push({ createdAt: { gte: startDate } });
    }
  }

  if (filtersData.endDate) {
    const endDate = new Date(filtersData.endDate as string);
    if (!isNaN(endDate.getTime())) {
      // Set to end of day
      endDate.setHours(23, 59, 59, 999);
      andConditions.push({ createdAt: { lte: endDate } });
    }
  }

  // Product filter - orders containing specific product
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

  const count = await prisma.order.count({ where: whereConditions });

  const result = await prisma.order.findMany({
    where: whereConditions,
    orderBy,
    skip,
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              title: true,
              slug: true
            }
          },
          productFlavorSize: {
            select: {
              price: true
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

const getSingleOrder = async (
  orderId: string,
  userInfo: UserInfoFromToken,
): Promise<IOrder> => {
  // Check if user exists
  const checkUser = await prisma.user.findUnique({
    where: { id: Number(userInfo.id) },
  });
  if (!checkUser) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }

  // Check if order exists
  const order = await prisma.order.findUnique({
    where: { id: Number(orderId) },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              title: true,
              slug: true
            }
          },
          productFlavorSize: {
            select: {
              price: true
            }
          }
        }
      }
    },
  });

  if (!order) {
    throw new ApiError(status.NOT_FOUND, 'Order not found');
  }

  // Check if user is admin or order owner
  if (checkUser.role !== 'admin' && order.userId !== Number(userInfo.id)) {
    throw new ApiError(
      status.FORBIDDEN,
      'You are not authorized to view this order',
    );
  }

  return order as IOrder;
};

const getUserOrders = async (
  userInfo: UserInfoFromToken,
  paginationOptions: IPaginationOptions,
) => {
  // Check if user exists
  const checkUser = await prisma.user.findUnique({
    where: { id: Number(userInfo.id) },
  });
  if (!checkUser) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }

  const { page, limit, skip, orderBy } = calculatePagination(paginationOptions);

  const whereConditions = { userId: checkUser.id };
  const count = await prisma.order.count({ where: whereConditions });

  const result = await prisma.order.findMany({
    where: whereConditions,
    orderBy: { createdAt: 'desc' }, // Most recent orders first
    skip,
    take: limit,
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              title: true,
              slug: true
            }
          },
          productFlavorSize: {
            select: {
              price: true
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

const updateOrderStatus = async (
  orderId: string,
  payload: IOrderUpdate,
  userInfo: UserInfoFromToken,
): Promise<IOrder> => {
  // Check if user exists and is admin
  const checkUser = await prisma.user.findUnique({
    where: { id: Number(userInfo.id) },
  });
  if (!checkUser) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }

  if (checkUser.role !== 'admin') {
    throw new ApiError(
      status.FORBIDDEN,
      'Only administrators can update order status',
    );
  }

  // Check if order exists
  const existingOrder = await prisma.order.findUnique({
    where: { id: Number(orderId) },
  });

  if (!existingOrder) {
    throw new ApiError(status.NOT_FOUND, 'Order not found');
  }

  // Validate status transition
  if (payload.status) {
    const allowedTransitions = ALLOWED_STATUS_TRANSITIONS[existingOrder.status];
    if (!allowedTransitions.includes(payload.status)) {
      throw new ApiError(
        status.BAD_REQUEST,
        `Invalid status transition from ${existingOrder.status} to ${payload.status}`,
      );
    }
  }

  // Update order status
  const updatedOrder = await prisma.order.update({
    where: { id: Number(orderId) },
    data: {
      status: payload.status,
      updatedAt: new Date(),
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      items: {
        include: {
          product: {
            select: {
              id: true,
              title: true,
              slug: true
            }
          },
          productFlavorSize: {
            select: {
              price: true
            }
          }
        }
      }
    },
  });

  return updatedOrder as IOrder;
};

export const OrderService = {
  createOrderFromCart,
  getAllOrders,
  getSingleOrder,
  getUserOrders,
  updateOrderStatus,
};
