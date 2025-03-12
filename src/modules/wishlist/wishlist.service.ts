import status from 'http-status';
import { prisma } from '../../client';
import ApiError from '../../errors/ApiError';
import { UserInfoFromToken } from '../../types/common';
import { IWishlist, IWishlistFilters } from './wishlist.interface';
import { IPaginationOptions } from '../../interfaces/common';
import { Prisma } from '@prisma/client';
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
) => {
  const { searchTerm, userId, productId } = filters;
  const { page, limit, skip, orderBy } = calculatePagination(paginationOptions);

  let whereConditions: Prisma.WishListWhereInput = {};

  // Add search term condition if provided
  if (searchTerm) {
    whereConditions = {
      OR: wishlistSearchableFields.map(field => ({
        [field]: {
          contains: searchTerm,
          // mode: 'insensitive',
        },
      })),
    };
  }

  //all the filters
  // Build specific filter conditions
  const andConditions: Prisma.WishListWhereInput[] = [];
  if (userId) {
    andConditions.push({ userId: Number(userId) });
  }

  if (productId) {
    andConditions.push({ productId: Number(productId) });
  }
  // Combine AND conditions with existing whereConditions
  if (andConditions.length > 0) {
    whereConditions.AND = andConditions;
  }

  // Get total count of matching products
  const count = await prisma.wishList.count({ where: whereConditions });

  // Fetch products with pagination and relations
  const result = await prisma.wishList.findMany({
    where: whereConditions,
    orderBy,
    skip,
    take: limit,
    select: {
      id: true,
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

  return {
    meta: {
      page,
      limit: limit === 0 ? count : limit,
      count,
    },
    data: result,
  };
};

const getWishlistByID = async (id: string) => {
  const findWishlist = await prisma.wishList.findUnique({
    where: {
      id: Number(id),
    },
    select: {
      id: true,
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
  if (!findWishlist) {
    throw new ApiError(status.NOT_FOUND, 'Wishlist not found');
  }
  return findWishlist;
};

const updateWishlist = async () => {
  return 'updateWishlist service';
};

const deleteWishlistByID = async (id:string,userInfo:UserInfoFromToken) => {
  //check wishList
  const checkWishlist = await prisma.wishList.findUnique({
    where: {
      id: Number(id),
    },
  });
  if(!checkWishlist){
    throw new ApiError(status.NOT_FOUND,"Wishlist not found")
  }

  //check User
  const checkUser=await prisma.user.findUnique({
    where:{
      id:Number(userInfo.id)
    }
  })
  if(!checkUser){
    throw new ApiError(status.NOT_FOUND,"User not found")
  }
  const deletedWishlist=await prisma.wishList.delete({
    where:{
      id:checkWishlist.id,
      userId:checkUser.id
    },
  })
  if(!deletedWishlist){
    throw new ApiError(status.FORBIDDEN,"Access denied!!!")
  }
  return deletedWishlist
};

export const WishlistService = {
  createWishlist,
  getAllWishlists,
  getWishlistByID,
  updateWishlist,
  deleteWishlistByID,
};
