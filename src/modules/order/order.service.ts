import status from 'http-status';
import { prisma } from '../../client';
import ApiError from '../../errors/ApiError';
import { UserInfoFromToken } from '../../types/common';
import { IOrder, IOrderCreate, IOrderFilters, IOrderInitiationResponse, IOrderUpdate } from './order.interface';
import { IPaginationOptions } from '../../interfaces/common';
import { calculatePagination } from '../../helpers/paginationHelper';
import { Prisma, OrderStatus, PaymentStatus } from '../../generated/client';
import { orderSearchableFields, ALLOWED_STATUS_TRANSITIONS } from './order.constant';
import config from '../../config';
import { nanoid } from 'nanoid';

import { ENUM_USER_ROLE } from '../../enum/user';
import { CouponService } from '../coupon/coupon.service';
import { SSLCommerzService } from '../payment/sslcommerz.service';
import { NotificationService } from '../notification/notification.service';

const createOrderFromCart = async (
  userInfo: UserInfoFromToken,
  payload: IOrderCreate
): Promise<IOrderInitiationResponse> => {
  // Check if user exists
  const checkUser = await prisma.user.findUnique({
    where: { id: Number(userInfo.id) },
    include: { detail: true },
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
          productFlavorSize: {
            include: {
              size: true,
              productFlavor: {
                include: {
                  flavor: true,
                },
              },
            },
          },
          product: { 
            select: { 
              title: true, 
              isActive: true,
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
                      discountDefault: true,
                    },
                  },
                },
              },
              flavors: {
                include: {
                  sizes: {
                    include: {
                      size: true,
                      productFlavor: {
                        include: {
                          flavor: true,
                        },
                      },
                    },
                  },
                },
              },
            } 
          }
        }
      }
    }
  });

  if (!userCart || userCart.items.length === 0) {
    throw new ApiError(status.BAD_REQUEST, 'Cart is empty or does not exist');
  }

  // Validate all cart items and build cart snapshot
  let totalAmount = 0;
  const cartSnapshotItems: any[] = [];

  for (const cartItem of userCart.items) {
    // Resolve variant
    let productVariant = cartItem.productFlavorSize;
    if (!productVariant && cartItem.product?.flavors) {
      for (const flavor of cartItem.product.flavors) {
        const variant = flavor.sizes.find(
          (v: any) => v.flavorId === cartItem.flavorId && v.sizeId === cartItem.sizeId
        );
        if (variant) {
          productVariant = variant;
          break;
        }
      }
    }

    if (!productVariant) {
      throw new ApiError(
        status.NOT_FOUND,
        `Product variant (Flavor/Size) no longer exists for "${cartItem.product.title}"`
      );
    }

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

    // Calculate campaign discount
    let maxDiscount = 0;
    cartItem.product.campaigns.forEach((cp: any) => {
      const discount = cp.customDiscountPercentage ?? cp.campaign.discountDefault;
      if (discount > maxDiscount) maxDiscount = discount;
    });

    const basePrice = productVariant?.price || 0;
    const discountedPrice = maxDiscount > 0 
      ? parseFloat((basePrice * (1 - maxDiscount / 100)).toFixed(2)) 
      : basePrice;

    const itemPrice = discountedPrice * cartItem.quantity;
    totalAmount += itemPrice;

    cartSnapshotItems.push({
      productId: cartItem.productId,
      flavorId: cartItem.flavorId,
      sizeId: cartItem.sizeId,
      quantity: cartItem.quantity,
      price: discountedPrice,
      productTitle: cartItem.product.title,
      flavorName: productVariant?.productFlavor?.flavor?.name || null,
      sizeName: productVariant?.size?.name || null,
    });
  }

  // Calculate discount if coupon is provided
  let discountAmount = 0;
  let couponId: number | undefined;

  if (payload.couponCode) {
    const coupon = await CouponService.validateCoupon(payload.couponCode, totalAmount);
    couponId = coupon.id;

    if (coupon.discountType === 'PERCENTAGE') {
      discountAmount = (totalAmount * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }
    } else {
      discountAmount = coupon.discountValue;
    }
  }

  const deliveryCharge = config.delivery_charge;
  const payableAmount = totalAmount - discountAmount + deliveryCharge;

  // Generate transaction ID
  const tranId = `TRAN-${nanoid(10)}`;

  // Build cart snapshot to store in payment record
  const cartSnapshot = {
    items: cartSnapshotItems,
  };

  // Create shell order + payment record + initiate SSLCommerz payment in transaction
  const result = await prisma.$transaction(async (tx: any) => {
    // 1. Create shell order (NO items yet - they will be created after payment success)
    const shellOrder = await tx.order.create({
      data: {
        userId: checkUser.id,
        totalAmount,
        discountAmount,
        payableAmount,
        deliveryCharge,
        couponId: couponId || null,
        status: OrderStatus.Pending,
        paymentStatus: PaymentStatus.PENDING,
      },
    });

    // Increment coupon used count if applicable
    if (couponId) {
      await tx.coupon.update({
        where: { id: couponId },
        data: { usedCount: { increment: 1 } },
      });
    }

    // 2. Initiate payment with SSLCommerz
    const sslPaymentData = {
      total_amount: payableAmount,
      currency: 'BDT' as const,
      tran_id: tranId,
      success_url: `${config.app_base_url}/api/v1/payment/success`,
      fail_url: `${config.app_base_url}/api/v1/payment/fail`,
      cancel_url: `${config.app_base_url}/api/v1/payment/cancel`,
      ipn_url: `${config.app_base_url}/api/v1/payment/ipn`,
      shipping_method: 'Courier' as const,
      product_name: cartSnapshotItems.map((item: any) => item.productTitle).join(', '),
      product_category: 'Ecommerce',
      product_profile: 'general',
      cus_name: checkUser.name,
      cus_email: checkUser.email,
      cus_add1: checkUser.detail?.address || 'N/A',
      cus_add2: checkUser.detail?.address || 'N/A',
      cus_city: checkUser.detail?.city || 'N/A',
      cus_state: checkUser.detail?.city || 'N/A',
      cus_postcode: '1000',
      cus_country: 'Bangladesh',
      cus_phone: checkUser.phoneNumber,
      cus_fax: checkUser.phoneNumber,
      ship_name: checkUser.name,
      ship_add1: checkUser.detail?.address || 'N/A',
      ship_add2: checkUser.detail?.address || 'N/A',
      ship_city: checkUser.detail?.city || 'N/A',
      ship_state: checkUser.detail?.city || 'N/A',
      ship_postcode: '1000',
      ship_country: 'Bangladesh',
    };

    const sslResponse = await SSLCommerzService.initiatePayment(sslPaymentData) as any;

    console.log('SSLCommerz Initiation Response:', sslResponse);

    if (sslResponse?.status !== 'SUCCESS') {
      throw new ApiError(status.BAD_REQUEST, 'Payment initiation failed');
    }

    // 3. Create payment record with cart snapshot stored in gatewayResponse
    await tx.payment.create({
      data: {
        orderId: shellOrder.id,
        transactionId: tranId,
        amount: payableAmount,
        paymentStatus: PaymentStatus.PENDING,
        gatewayResponse: {
          ...sslResponse,
          cartSnapshot, // Store cart snapshot for deferred order item creation
        },
      },
    });

    return {
      shellOrderId: shellOrder.id,
      GatewayPageURL: sslResponse.GatewayPageURL,
      transactionId: tranId,
    };
  });

  return {
    GatewayPageURL: result.GatewayPageURL,
    transactionId: result.transactionId,
  };
};

const createOrderItemsFromSnapshot = async (tran_id: string) => {
  // Find the payment record with cart snapshot
  const payment = await (prisma as any).payment.findUnique({
    where: { transactionId: tran_id },
  });

  if (!payment) {
    throw new ApiError(status.NOT_FOUND, 'Payment record not found');
  }

  const gatewayResponse = payment.gatewayResponse as any;
  const cartSnapshot = gatewayResponse?.cartSnapshot;

  if (!cartSnapshot || !cartSnapshot.items || cartSnapshot.items.length === 0) {
    throw new ApiError(status.BAD_REQUEST, 'Cart snapshot not found in payment record');
  }

  // Find user's cart to clear later
  const order = await prisma.order.findUnique({
    where: { id: payment.orderId },
  });

  if (!order) {
    throw new ApiError(status.NOT_FOUND, 'Order not found');
  }

  const userCart = await prisma.cart.findUnique({
    where: { userId: order.userId },
  });

  // Create order items and decrement stock in a transaction
  await prisma.$transaction(async (tx: any) => {
    // 1. Create order items from snapshot
    for (const item of cartSnapshot.items) {
      await tx.orderItem.create({
        data: {
          orderId: payment.orderId,
          productId: item.productId,
          flavorId: item.flavorId,
          sizeId: item.sizeId,
          quantity: item.quantity,
          price: item.price,
          productTitle: item.productTitle,
          flavorName: item.flavorName,
          sizeName: item.sizeName,
        },
      });

      // 2. Find product flavor size record and decrement stock
      // Use findFirst with nullable sizeId since @@unique doesn't accept null in where
      const productFlavorSize = await tx.productFlavorSize.findFirst({
        where: {
          productId: item.productId,
          flavorId: item.flavorId,
          sizeId: item.sizeId, // null for quantity-based products
        },
      });

      if (!productFlavorSize) {
        throw new Error(`Product flavor size not found for product ${item.productId}, flavor ${item.flavorId}, size ${item.sizeId}`);
      }

      await tx.productFlavorSize.update({
        where: { id: productFlavorSize.id },
        data: {
          stock: { decrement: item.quantity },
        },
      });
    }

    // 3. Clear cart if exists
    if (userCart) {
      await tx.cartItem.deleteMany({
        where: { cartId: userCart.id },
      });
    }
  });
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
          email: true,
          createdAt:true,
        }
      },
      items: {
        include: {
          product: {
            include: {
              flavors: {
                include: {
                  sizes: {
                    include: {
                      size: { select: { id: true, name: true, description: true } },
                      productFlavor: {
                        include: {
                          flavor: { select: { id: true, name: true, color: true, description: true } },
                          images: { select: { id: true, path: true, originalName: true, modifiedName: true } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          productFlavorSize: {
            include: {
              size: { select: { name: true, description: true } },
              productFlavor: {
                include: {
                  flavor: {
                    select: {
                      name: true,
                      color: true,
                      description: true
                    }
                  },
                  images: {
                    select: {
                      path: true,
                      originalName: true,
                      type: true,
                      modifiedName: true
                    },
                    take: 1
                  }
                }
              }
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
  if (checkUser.role !== ENUM_USER_ROLE.ADMIN && order.userId !== Number(userInfo.id)) {
    throw new ApiError(
      status.FORBIDDEN,
      'You are not authorized to view this order',
    );
  }

  // Handle variant resolution fallback for quantity products
  const orderWithMappedItems = {
    ...order,
    items: (order.items as any[]).map((item: any) => {
      let productFlavorSize = item.productFlavorSize;
      if (!productFlavorSize && item.product?.flavors) {
        // Search through flavors and their sizes
        for (const flavor of item.product.flavors) {
          const variant = flavor.sizes.find(
            (v: any) => v.flavorId === item.flavorId && v.sizeId === item.sizeId
          );
          if (variant) {
            productFlavorSize = variant;
            break;
          }
        }
      }
      return {
        ...item,
        productFlavorSize
      };
    })
  };

  return orderWithMappedItems as unknown as IOrder;
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
            include: {
              flavors: {
                include: {
                  sizes: {
                    include: {
                      size: { select: { id: true, name: true, description: true } },
                      productFlavor: {
                        include: {
                          flavor: { select: { id: true, name: true, color: true, description: true } },
                          images: { select: { id: true, path: true, originalName: true, modifiedName: true } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          productFlavorSize: {
            include: {
              size: { select: { name: true, description: true } },
              productFlavor: {
                include: {
                  flavor: {
                    select: {
                      name: true,
                      color: true,
                      description: true
                    }
                  },
                  images: {
                    select: {
                      path: true,
                      originalName: true,
                      type: true,
                      modifiedName: true
                    },
                    take: 1
                  }
                }
              }
            }
          }
        }
      }
    },
  });

  // Handle variant resolution fallback for quantity products
  const mappedResults = result.map(order => ({
    ...order,
    items: order.items.map((item: any) => {
      let productFlavorSize = item.productFlavorSize;
      if (!productFlavorSize && item.product?.flavors) {
        // Search through flavors and their sizes
        for (const flavor of item.product.flavors) {
          const variant = flavor.sizes.find(
            (v: any) => v.flavorId === item.flavorId && v.sizeId === item.sizeId
          );
          if (variant) {
            productFlavorSize = variant;
            break;
          }
        }
      }
      return {
        ...item,
        productFlavorSize
      };
    })
  }));

  return {
    meta: {
      page,
      limit: limit === 0 ? count : limit,
      count,
    },
    data: mappedResults,
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

  if (checkUser.role !== ENUM_USER_ROLE.ADMIN) {
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
            include: {
              flavors: {
                include: {
                  sizes: {
                    include: {
                      size: { select: { id: true, name: true, description: true } },
                      productFlavor: {
                        include: {
                          flavor: { select: { id: true, name: true, color: true, description: true } },
                          images: { select: { id: true, path: true, originalName: true, modifiedName: true } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          productFlavorSize: {
            include: {
              size: {
                select: {
                  name: true,
                  description: true
                }
              },
              productFlavor: {
                include: {
                  flavor: {
                    select: {
                      name: true,
                      color: true,
                      description: true
                    }
                  },
                  images: {
                    select: {
                      path: true,
                      originalName: true,
                      type: true,
                      modifiedName: true
                    },
                    take: 1
                  }
                }
              }
            }
          }
        }
      }
    },
  });

  // Handle variant resolution fallback for quantity products
  const mappedOrder = {
    ...updatedOrder,
    items: updatedOrder.items.map((item: any) => {
      let productFlavorSize = item.productFlavorSize;
      if (!productFlavorSize && item.product?.flavors) {
        // Search through flavors and their sizes
        for (const flavor of item.product.flavors) {
          const variant = flavor.sizes.find(
            (v: any) => v.flavorId === item.flavorId && v.sizeId === item.sizeId
          );
          if (variant) {
            productFlavorSize = variant;
            break;
          }
        }
      }
      return {
        ...item,
        productFlavorSize
      };
    })
  };

  return mappedOrder as unknown as IOrder;
};

export const OrderService = {
  createOrderFromCart,
  createOrderItemsFromSnapshot,
  getAllOrders,
  getSingleOrder,
  getUserOrders,
  updateOrderStatus,
};