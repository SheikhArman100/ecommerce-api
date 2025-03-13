import status from 'http-status';
import { prisma } from '../../client';
import ApiError from '../../errors/ApiError';
import { UserInfoFromToken } from '../../types/common';
import { ICart, ICartItem } from './cart.interface';

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
  });
  if (!checKProduct) {
    throw new ApiError(status.NOT_FOUND, 'Product not found');
  }

  //check if flavor exist for that product
  const checkFlavor = await prisma.productFlavor.findFirst({
    where: {
      productId: Number(payload.productId),
      flavorId: Number(payload.flavorId),
    },
  });
  if (!checkFlavor) {
    throw new ApiError(status.NOT_FOUND, 'Flavor not found');
  }

  //check if size exist for this product and flavor
  const checkSize = await prisma.productFlavorSize.findFirst({
    where: {
      productId: Number(payload.productId),
      flavorId: Number(payload.flavorId),
      sizeId: Number(payload.sizeId),
    },
  });
  if (!checkSize) {
    throw new ApiError(status.NOT_FOUND, 'Size not found');
  }
  if (checkSize.stock < (payload.quantity ?? 1)) {
    throw new ApiError(
      status.INSUFFICIENT_STORAGE,
      `Insufficient stock for productId=${payload.productId}, flavorId=${payload.flavorId}, sizeId=${payload.sizeId}. Available: ${checkSize.stock}, Requested: ${payload.quantity}`,
    );
  }
  const existingCartItem = await prisma.cart.findUnique({
    where: {
      userId: Number(userInfo.id),
      items: {
        some: {
          productId: Number(payload.productId),
          flavorId: Number(payload.flavorId),
          sizeId: Number(payload.sizeId),
        },
      },
    },
  });

  if (existingCartItem) {
    throw new ApiError(status.CONFLICT, 'This product is already added to Cart');
  }
  const existingCart = await prisma.cart.findUnique({
    where: { userId: checkUser.id },
  });

  let cart: ICart;

  if (existingCart) {
    cart = await prisma.cart.update({
      where: { id: existingCart.id },
      data: {
        items: {
          create: {
            productId: Number(payload.productId),
            flavorId: Number(payload.flavorId),
            sizeId: Number(payload.sizeId),
            quantity: payload.quantity,
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
            sizeId: Number(payload.sizeId),
            quantity: payload.quantity,
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

  return cart;
};

const getAllCarts = async () => {
  return 'getAllCarts service';
};

const getCartByID = async () => {
  return 'getCartByID service';
};

const updateCart = async () => {
  return 'updateCart service';
};

const deleteCartByID = async () => {
  return 'deleteCartByID service';
};

export const CartService = {
  createCart,
  getAllCarts,
  getCartByID,
  updateCart,
  deleteCartByID,
};
