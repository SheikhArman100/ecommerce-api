import status from 'http-status';
import { prisma } from '../../client';
import ApiError from '../../errors/ApiError';
import { UserInfoFromToken } from '../../types/common';
import { IReview, IReviewFilters, ICreateReviewPayload, IUpdateReviewPayload } from './review.interface';
import { IPaginationOptions } from '../../interfaces/common';
import { calculatePagination } from '../../helpers/paginationHelper';
import { reviewSearchableFields } from './review.constant';
import { Prisma, FileType, DiskType } from '../../generated/client';
import { ENUM_USER_ROLE } from '../../enum/user';

const createReview = async (
  userInfo: UserInfoFromToken,
  payload: ICreateReviewPayload,
  multerFiles?: Express.Multer.File[],
  clientIP?: string,
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
      ipAddress: clientIP || '0.0.0.0',
    },
    include: {
      user: {
        include: {
          detail: true, // Include user details for profile image
        },
      },
      product: {
        include: {
          category: true, // Include product category
          flavors: {
            include: {
              flavor: true,
              sizes: true,
            },
          },
        },
      },
      order: true,
      images: true,
    }
  });

  // Handle file uploads if provided
  if (multerFiles && multerFiles.length > 0) {
    const filePromises = multerFiles.map(async (file) => {
      return await prisma.file.create({
        data: {
          type: FileType.IMAGE,
          diskType: DiskType.LOCAL, // or AWS based on config
          path: `review/images/${file.filename}`,
          originalName: file.originalname,
          modifiedName: file.filename,
          reviewId: review.id,
        },
      });
    });

    await Promise.all(filePromises);
  }

  return review;
};

const getAllReviews = async (
  filters: IReviewFilters,
  paginationOptions: IPaginationOptions,
) => {
  const { searchTerm, ...filtersData } = filters;
  const { page, limit, skip, orderBy } = calculatePagination(paginationOptions);

  let whereConditions: Prisma.ReviewWhereInput = {};

  // Add search term condition if provided
  if (searchTerm) {
    whereConditions = {
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
          field.toLowerCase().endsWith('id') || field === 'id' || field === 'rating'
            ? Number(value)
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
    orderBy: orderBy,
    skip,
    take: limit,
    select: {
      id: true,
      rating: true,
      comment: true,
      isHidden: true,
      adminNote: true,
      ipAddress: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
      productId: true,
      orderId: true,
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

const getReviewByID = async (id: string) => {
  const review = await prisma.review.findUnique({
    where: {
      id: Number(id),
    },
    select: {
      id: true,
      rating: true,
      comment: true,
      isHidden: true,
      adminNote: true,
      ipAddress: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
      productId: true,
      orderId: true,
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
          }
          // Removed flavors and sizes - not needed for review detail view
        }
      },
      order: {
        select: {
          id: true,
          status: true,
          totalAmount: true,
          createdAt: true,
        }
      },
      images: {
        select: {
          id: true,
          type: true,
          path: true,
          originalName: true,
          modifiedName: true,
          createdAt: true,
        }
      }
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
  const isUpdatingHidden = payload.isHidden !== undefined;
  const isUpdatingAdminNote = payload.adminNote !== undefined;

  // Only admin can hide/unhide reviews and set admin notes
  if ((isUpdatingHidden || isUpdatingAdminNote) && !isAdmin) {
    throw new ApiError(status.UNAUTHORIZED, 'Only admins can hide/unhide reviews and set admin notes');
  }

  // Only owner can update rating/comment, admin can update anything
  if (!isOwner && !isAdmin) {
    throw new ApiError(status.UNAUTHORIZED, 'You can only update your own reviews');
  }

  // Prepare update data
  const updateData: any = {
    updatedAt: new Date(),
  };

  // Add fields based on permissions
  if (payload.rating !== undefined) {
    updateData.rating = payload.rating;
  }
  if (payload.comment !== undefined) {
    updateData.comment = payload.comment;
  }

  // Admin-only fields
  if (isAdmin) {
    if (payload.isHidden !== undefined) {
      updateData.isHidden = payload.isHidden;
    }
    if (payload.adminNote !== undefined) {
      updateData.adminNote = payload.adminNote;
    }
  }

  const updatedReview = await prisma.review.update({
    where: {
      id: Number(id),
    },
    data: updateData,
    select: {
      id: true,
      rating: true,
      comment: true,
      isHidden: true,
      adminNote: true,
      ipAddress: true,
      createdAt: true,
      updatedAt: true,
      userId: true,
      productId: true,
      orderId: true,
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
              productId: true,
              flavorId: true,
              flavor: {
                select: {
                  id: true,
                  name: true,
                  color: true,
                }
              },
              sizes: {
                select: {
                  productId: true,
                  flavorId: true,
                  sizeId: true,
                  stock: true,
                  price: true,
                  size: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                    }
                  }
                }
              }
            }
          }
        }
      },
      order: {
        select: {
          id: true,
          status: true,
          totalAmount: true,
          createdAt: true,
        }
      },
      images: {
        select: {
          id: true,
          type: true,
          path: true,
          originalName: true,
          modifiedName: true,
          createdAt: true,
        }
      }
    },
  });

  return updatedReview;
};

const deleteReview = async (id: string, userInfo: UserInfoFromToken) => {
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

  // Check permissions - only admin can delete reviews
  if (user.role !== ENUM_USER_ROLE.ADMIN) {
    throw new ApiError(status.UNAUTHORIZED, 'Only admins can delete reviews');
  }

  const deletedReview = await prisma.review.delete({
    where: { id: Number(id) },
  });

  return deletedReview;
};

export const ReviewService = {
  createReview,
  getAllReviews,
  getReviewByID,
  updateReview,
  deleteReview,
};

