import status from 'http-status';
import { prisma } from '../../client';
import ApiError from '../../errors/ApiError';
import { UserInfoFromToken } from '../../types/common';
import { IReview, IReviewFilters, ICreateReviewPayload, IUpdateReviewPayload } from './review.interface';
import { IPaginationOptions } from '../../interfaces/common';
import { calculatePagination } from '../../helpers/paginationHelper';
import { reviewSearchableFields } from './review.constant';
import { Prisma } from '../../generated/client';
import { ENUM_USER_ROLE } from '../../enum/user';

const createReview = async (
  userInfo: UserInfoFromToken,
  payload: ICreateReviewPayload,
  multerFiles?: Express.Multer.File[],
) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(userInfo.id) },
  });
  if (!user) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }

  // Check if order exists and belongs to user
  const order = await prisma.order.findUnique({
    where: { id: payload.orderId },
    include: {
      items: {
        where: { productId: payload.productId }
      }
    }
  });

  if (!order) {
    throw new ApiError(status.NOT_FOUND, 'Order not found');
  }

  if (order.userId !== user.id) {
    throw new ApiError(status.UNAUTHORIZED, 'You can only review your own orders');
  }

  if (order.status !== 'Delivered') {
    throw new ApiError(status.BAD_REQUEST, 'You can only review delivered orders');
  }

  // Check if user already reviewed this product in this order
  const existingReview = await prisma.review.findFirst({
    where: {
      userId: user.id,
      productId: payload.productId,
      orderId: payload.orderId
    }
  });

  if (existingReview) {
    throw new ApiError(status.BAD_REQUEST, 'You have already reviewed this product in this order');
  }

  // Check if product exists in order
  const orderItem = order.items.find(item => item.productId === payload.productId);
  if (!orderItem) {
    throw new ApiError(status.BAD_REQUEST, 'Product not found in this order');
  }

  // Create review
  const review = await prisma.review.create({
    data: {
      rating: payload.rating,
      comment: payload.comment,
      userId: user.id,
      productId: payload.productId,
      orderId: payload.orderId,
    },
    include: {
      user: true,
      product: true,
      order: true,
      images: true,
    }
  });

  // Handle file uploads if provided
  if (multerFiles && multerFiles.length > 0) {
    // This would be handled by file upload middleware
    // Files would be linked to review via reviewId
  }

  return review;
};

const getAllReviews = async (
  filters: IReviewFilters,
  paginationOptions: IPaginationOptions,
) => {
  const { searchTerm, ...filtersData } = filters;
  const { page, limit, skip, orderBy } = calculatePagination(paginationOptions);

  let whereConditions: Prisma.ReviewWhereInput = {
    isHide: false, // Don't show hidden reviews by default
  };

  // Add search term condition if provided
  if (searchTerm) {
    whereConditions = {
      ...whereConditions,
      OR: reviewSearchableFields.map(field => ({
        [field]: {
          contains: searchTerm,
        },
      })),
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
            : field === 'isHide'
              ? value === 'true'
              : typeof value === 'string' &&
                (value === 'true' || value === 'false')
                ? value === 'true'
                : value,
      })),
    };
  }

  const count = await prisma.review.count({ where: whereConditions });

  const result = await prisma.review.findMany({
    where: whereConditions,
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
    include: {
      user: true,
      product: true,
      order: true,
      images: true,
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

const getReviewByID = async (id: string) => {
  const review = await prisma.review.findUnique({
    where: {
      id: Number(id),
    },
    include: {
      user: true,
      product: true,
      order: true,
      images: true,
    },
  });

  if (!review) {
    throw new ApiError(status.NOT_FOUND, 'Review not found');
  }

  return review;
};

const updateReview = async (
  id: string,
  payload: IUpdateReviewPayload,
  userInfo: UserInfoFromToken,
) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(userInfo.id) },
  });
  if (!user) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }

  const review = await prisma.review.findUnique({
    where: { id: Number(id) },
  });
  if (!review) {
    throw new ApiError(status.NOT_FOUND, 'Review not found');
  }

  // Check permissions
  const isOwner = review.userId === user.id;
  const isAdmin = user.role === ENUM_USER_ROLE.ADMIN;
  const isUpdatingHideStatus = payload.isHide !== undefined;

  // Only admin can hide/unhide reviews
  if (isUpdatingHideStatus && !isAdmin) {
    throw new ApiError(status.UNAUTHORIZED, 'Only admins can hide/unhide reviews');
  }

  // Only owner can update rating/comment, admin can update anything
  if (!isOwner && !isAdmin && !isUpdatingHideStatus) {
    throw new ApiError(status.UNAUTHORIZED, 'You can only update your own reviews');
  }

  const updatedReview = await prisma.review.update({
    where: {
      id: Number(id),
    },
    data: {
      ...(payload.rating !== undefined && { rating: payload.rating }),
      ...(payload.comment !== undefined && { comment: payload.comment }),
      ...(payload.isHide !== undefined && { isHide: payload.isHide }),
      updatedAt: new Date(),
    },
    include: {
      user: true,
      product: true,
      order: true,
      images: true,
    },
  });

  return updatedReview;
};

const deleteReviewByID = async (id: string, userInfo: UserInfoFromToken) => {
  const user = await prisma.user.findUnique({
    where: { id: Number(userInfo.id) },
  });
  if (!user) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }

  if (user.role !== ENUM_USER_ROLE.ADMIN) {
    throw new ApiError(status.UNAUTHORIZED, 'Only admins can delete reviews');
  }

  const review = await prisma.review.findUnique({
    where: { id: Number(id) },
  });
  if (!review) {
    throw new ApiError(status.NOT_FOUND, 'Review not found');
  }

  const deletedReview = await prisma.review.delete({
    where: {
      id: Number(id),
    },
  });

  return deletedReview;
};

export const ReviewService = {
  createReview,
  getAllReviews,
  getReviewByID,
  updateReview,
  deleteReviewByID,
};
