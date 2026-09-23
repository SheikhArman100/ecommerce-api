import { Coupon, Prisma } from '../../generated/client';
import { CouponTargetType } from '../../generated/enums';
import { prisma } from '../../client';
import { ICouponFilters } from './coupon.interface';
import { IPaginationOptions } from '../../interfaces/common';
import { calculatePagination } from '../../helpers/paginationHelper';
import ApiError from '../../errors/ApiError';
import status from 'http-status';
import { UserInfoFromToken } from '../../types/common';
import { ENUM_USER_ROLE } from '../../enum/user';
import { sendEmail } from '../../helpers/nodeMailer';
import { couponSearchableFields } from './coupon.constant';

const createCoupon = async (
  adminInfo: UserInfoFromToken,
  payload: Coupon & { targetUserIds?: number[] }
): Promise<Coupon> => {
  const checkAdmin = await prisma.user.findUnique({
    where: { id: Number(adminInfo.id) },
  });
  if (!checkAdmin) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }
  if (checkAdmin.role !== ENUM_USER_ROLE.ADMIN) {
    throw new ApiError(
      status.UNAUTHORIZED,
      'You are not authorized to perform this action',
    );
  }

  const existingCoupon=await prisma.coupon.findUnique({
    where:{
      code: payload.code

    }
  })
  if(existingCoupon){
    throw new ApiError(status.BAD_REQUEST, 'Coupon with this code already exists');
  }

  // Targeting: extract the SPECIFIC_USERS allow-list from the payload and
  // verify every user exists before creating the coupon
  const { targetUserIds, ...couponData } = payload as Coupon & { targetUserIds?: number[] };
  if (targetUserIds?.length) {
    const foundUsers = await prisma.user.findMany({
      where: { id: { in: targetUserIds } },
      select: { id: true },
    });
    if (foundUsers.length !== new Set(targetUserIds).size) {
      throw new ApiError(status.BAD_REQUEST, 'One or more target users do not exist');
    }
  }
  if ((couponData as any).targetType === CouponTargetType.SPECIFIC_USERS && !targetUserIds?.length) {
    throw new ApiError(status.BAD_REQUEST, 'SPECIFIC_USERS coupons require at least one target user');
  }

  const result = await prisma.coupon.create({
    data: {
      ...couponData,
      expiryDate: new Date(payload.expiryDate),
      createdBy: Number(checkAdmin.id),
      updatedBy: Number(checkAdmin.id),
      // SPECIFIC_USERS allow-list — validated users only
      ...(targetUserIds && {
        targetUsers: {
          create: targetUserIds.map(userId => ({ userId })),
        },
      }),
    },
    include: { targetUsers: true },
  }) as Coupon;

  // Notify targeted users about their new exclusive coupon — realtime (socket)
  // + persisted. Fire-and-forget so it never fails the coupon creation.
  if (targetUserIds?.length) {
    // Customers are informed of targeted coupons via EMAIL (notification
    // system is admin-only) — fire-and-forget per user.
    const couponUsers = await prisma.user.findMany({
      where: { id: { in: targetUserIds } },
      select: { id: true, name: true, email: true },
    });
    couponUsers.forEach(user => {
      const discountText =
        (payload as any).discountType === 'PERCENTAGE'
          ? `${payload.discountValue}% off`
          : `৳${payload.discountValue} off`;
      sendEmail(
        user.email,
        `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
          <h2 style="color: #8e44ad; text-align: center;">Exclusive Coupon For You! 🎁</h2>
          <p>Hello ${user.name},</p>
          <p>You've got a new coupon: <strong style="font-size: 18px; color: #8e44ad;">${payload.code}</strong> — <strong>${discountText}</strong> your order.</p>
          <p>Valid until <strong>${new Date(payload.expiryDate).toLocaleDateString()}</strong>.</p>
        </div>`,
        `You've got a coupon: ${payload.code}`,
      ).catch(err => console.error('Coupon Email Error:', err));
    });
  }

  return result;
};

const getAllCoupons = async (
  filters: ICouponFilters,
  paginationOptions: IPaginationOptions
) => {
  const { searchTerm, ...filtersData } = filters;
  const { page, limit, skip, orderBy } = calculatePagination(paginationOptions);

  let whereConditions: Prisma.CouponWhereInput = {};

  if (searchTerm) {
    whereConditions = {
      OR: couponSearchableFields.map(field => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive' as const,
        },
      })),
    };
  }

  if (Object.keys(filtersData).length > 0) {
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

  const count = await prisma.coupon.count({ where: whereConditions });

  const result = await prisma.coupon.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy,
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

const getCouponByID = async (id: string): Promise<Coupon | null> => {
  const result = await prisma.coupon.findUnique({
    where: { id: Number(id) },
    include: {
      targetUsers: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              detail: {
                select: { image: { select: { path: true } } },
              },
            },
          },
        },
      },
    },
  });

  if (!result) {
    throw new ApiError(status.NOT_FOUND, 'Coupon not found');
  }

  return result;
};

const updateCoupon = async (
  id: string,
  payload: Partial<Coupon>,
  userInfo: UserInfoFromToken
): Promise<Coupon | null> => {
  const checkUser = await prisma.user.findUnique({
    where: { id: Number(userInfo.id) },
  });
  if (!checkUser) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }
  if (checkUser.role !== ENUM_USER_ROLE.ADMIN) {
    throw new ApiError(
      status.UNAUTHORIZED,
      'You are not authorized to perform this action',
    );
  }

  const checkCoupon = await prisma.coupon.findUnique({
    where: { id: Number(id) },
  });
  if (!checkCoupon) {
    throw new ApiError(status.NOT_FOUND, 'Coupon not found');
  }

  // Coupon codes are identity — past orders and redemption history reference
  // them. Renaming is blocked once the coupon exists.
  if (payload.code && payload.code !== checkCoupon.code) {
    throw new ApiError(status.BAD_REQUEST, 'Coupon code cannot be changed after creation');
  }
  const { code: _ignoredCode, targetUserIds, ...updateData } = payload as Partial<Coupon> & { targetUserIds?: number[] };

  // SPECIFIC_USERS allow-list replacement (validated users only). Passing an
  // empty array clears the list; omitting the key leaves it untouched.
  let targetUsersOp: Prisma.CouponTargetUserUpdateManyWithoutCouponNestedInput | undefined;
  if (targetUserIds !== undefined) {
    const effectiveType = (updateData.targetType as CouponTargetType) ?? checkCoupon.targetType;
    if (effectiveType === CouponTargetType.SPECIFIC_USERS && targetUserIds.length === 0) {
      throw new ApiError(status.BAD_REQUEST, 'SPECIFIC_USERS coupons require at least one target user');
    }
    if (targetUserIds.length) {
      const foundUsers = await prisma.user.findMany({
        where: { id: { in: targetUserIds } },
        select: { id: true },
      });
      if (foundUsers.length !== new Set(targetUserIds).size) {
        throw new ApiError(status.BAD_REQUEST, 'One or more target users do not exist');
      }
    }
    targetUsersOp = {
      deleteMany: {},
      create: targetUserIds.map(userId => ({ userId })),
    };
  }

  const result = await prisma.coupon.update({
    where: { id: Number(id) },
    data: {
      ...updateData,
      expiryDate: updateData.expiryDate ? new Date(updateData.expiryDate) : undefined,
      updatedBy: Number(checkUser.id),
      updatedAt: new Date(),
      ...(targetUsersOp && { targetUsers: targetUsersOp }),
    },
  });
  return result;
};

const deleteCouponByID = async (id: string, userInfo: UserInfoFromToken): Promise<Coupon | null> => {
  const checkUser = await prisma.user.findUnique({
    where: { id: Number(userInfo.id) },
  });
  if (!checkUser) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }
  if (checkUser.role !== ENUM_USER_ROLE.ADMIN) {
    throw new ApiError(
      status.UNAUTHORIZED,
      'You are not authorized to perform this action',
    );
  }

  const checkCoupon = await prisma.coupon.findUnique({
    where: { id: Number(id) },
  });
  if (!checkCoupon) {
    throw new ApiError(status.NOT_FOUND, 'Coupon not found');
  }

  const result = await prisma.coupon.delete({
    where: { id: Number(id) },
  });
  return result;
};

/**
 * Fetches the redemption history for a coupon — which customers used it and
 * when — newest first, with user profile data (image/name/email).
 */
/**
 * Public endpoint for storefront banners (e.g. homepage marquee) — visitors
 * are anonymous, so no auth and no sensitive fields. Returns ONLY display
 * fields: no usage stats, no targeting lists, no audit columns.
 */
const getFeaturedCoupons = async (): Promise<
  Array<{
    id: number;
    code: string;
    description: string;
    discountType: string;
    discountValue: number;
    minOrderAmount: number;
    maxDiscountAmount: number | null;
    expiryDate: Date;
  }>
> => {
  const coupons = await prisma.coupon.findMany({
    where: {
      isActive: true,
      isFeatured: true,
      // Expired coupons must never appear on the public banner
      expiryDate: { gt: new Date() },
    },
    select: {
      id: true,
      code: true,
      description: true,
      discountType: true,
      discountValue: true,
      minOrderAmount: true,
      maxDiscountAmount: true,
      expiryDate: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  return coupons;
};

const getCouponRedemptions = async (id: string) => {
  const coupon = await prisma.coupon.findUnique({
    where: { id: Number(id) },
    select: { id: true },
  });
  if (!coupon) {
    throw new ApiError(status.NOT_FOUND, 'Coupon not found');
  }

  return prisma.couponRedemption.findMany({
    where: { couponId: Number(id) },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          detail: {
            select: { image: { select: { path: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

const validateCoupon = async (
  code: string,
  amount: number,
  userId?: number
): Promise<Coupon> => {
  // Normalize code — stored uppercase/trimmed, so lookups must match
  const normalizedCode = code.trim().toUpperCase();
  const coupon = await prisma.coupon.findUnique({
    where: { code: normalizedCode, isActive: true },
  });

  if (!coupon) {
    throw new ApiError(status.NOT_FOUND, 'Invalid coupon code');
  }

  if (new Date(coupon.expiryDate) < new Date()) {
    throw new ApiError(status.BAD_REQUEST, 'Coupon has expired');
  }

  if (coupon.usageLimit !== null && coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    throw new ApiError(status.BAD_REQUEST, 'Coupon usage limit reached');
  }

  if (amount < coupon.minOrderAmount) {
    throw new ApiError(
      status.BAD_REQUEST,
      `Minimum order amount of ${coupon.minOrderAmount} required for this coupon`
    );
  }

  // Targeting eligibility — targeted coupons always require a known user
  if (coupon.targetType !== CouponTargetType.ALL) {
    if (!userId) {
      throw new ApiError(status.BAD_REQUEST, 'You must be logged in to use this coupon');
    }

    if (coupon.targetType === CouponTargetType.NEW_USERS) {
      // "New" = has never placed an order
      const orderCount = await prisma.order.count({ where: { userId } });
      if (orderCount > 0) {
        throw new ApiError(status.BAD_REQUEST, 'This coupon is only available for new customers');
      }
    }

    if (coupon.targetType === CouponTargetType.INACTIVE_USERS) {
      // "Inactive" = last order older than inactiveDays (default 365)
      const inactiveDays = coupon.inactiveDays ?? 365;
      const lastOrder = await prisma.order.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });
      if (lastOrder) {
        const daysSince = Math.floor((Date.now() - new Date(lastOrder.createdAt).getTime()) / (24 * 60 * 60 * 1000));
        if (daysSince < inactiveDays) {
          throw new ApiError(
            status.BAD_REQUEST,
            `This coupon is for customers who haven't ordered in the last ${inactiveDays} days`
          );
        }
      }
      // No orders at all also qualifies as inactive
    }

    if (coupon.targetType === CouponTargetType.SPECIFIC_USERS) {
      const targeted = await prisma.couponTargetUser.findUnique({
        where: { couponId_userId: { couponId: coupon.id, userId } },
      });
      if (!targeted) {
        throw new ApiError(status.BAD_REQUEST, 'This coupon is not available for your account');
      }
    }
  }

  // Per-user usage limit: count this user's prior redemptions of this coupon
  if (userId && coupon.limitPerUser !== null && coupon.limitPerUser > 0) {
    const priorUses = await prisma.couponRedemption.count({
      where: { couponId: coupon.id, userId },
    });
    if (priorUses >= coupon.limitPerUser) {
      throw new ApiError(
        status.BAD_REQUEST,
        `You have already used this coupon the maximum number of times (${coupon.limitPerUser})`
      );
    }
  }

  return coupon;
};

export const CouponService = {
  createCoupon,
  getAllCoupons,
  getCouponByID,
  updateCoupon,
  deleteCouponByID,
  validateCoupon,
  getFeaturedCoupons,
  getCouponRedemptions,
};
