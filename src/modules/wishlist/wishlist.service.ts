import status from 'http-status';
import { prisma } from '../../client';
import ApiError from '../../errors/ApiError';
import { UserInfoFromToken } from '../../types/common';
import { IWishlist } from './wishlist.interface';

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
      title:true
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
    throw new ApiError(
      status.CONFLICT,
      `Product is already in your wishlist`,
    );
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

const getAllWishlists = async () => {
  return 'getAllWishlists service';
};

const getWishlistByID = async () => {
  return 'getWishlistByID service';
};

const updateWishlist = async () => {
  return 'updateWishlist service';
};

const deleteWishlistByID = async () => {
  return 'deleteWishlistByID service';
};

export const WishlistService = {
  createWishlist,
  getAllWishlists,
  getWishlistByID,
  updateWishlist,
  deleteWishlistByID,
};
