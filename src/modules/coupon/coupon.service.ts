import { Coupon, Prisma } from '../../generated/client';
import { prisma } from '../../client';
import { ICouponFilters } from './coupon.interface';
import { IPaginationOptions } from '../../interfaces/common';
import { calculatePagination } from '../../helpers/paginationHelper';
import ApiError from '../../errors/ApiError';
import status from 'http-status';
import { UserInfoFromToken } from '../../types/common';
import { ENUM_USER_ROLE } from '../../enum/user';
import { couponSearchableFields } from './coupon.constant';

const createCoupon = async (
  adminInfo: UserInfoFromToken,
  payload: Coupon
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

  const result = await prisma.coupon.create({
    data: {
      ...payload,
      expiryDate: new Date(payload.expiryDate),
      createdBy: Number(checkAdmin.id),
      updatedBy: Number(checkAdmin.id),
    },
  });
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

  const result = await prisma.coupon.update({
    where: { id: Number(id) },
    data: {
      ...payload,
      expiryDate: payload.expiryDate ? new Date(payload.expiryDate) : undefined,
      updatedBy: Number(checkUser.id),
      updatedAt: new Date(),
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

const validateCoupon = async (code: string, amount: number): Promise<Coupon> => {
  const coupon = await prisma.coupon.findUnique({
    where: { code, isActive: true },
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

  return coupon;
};

export const CouponService = {
  createCoupon,
  getAllCoupons,
  getCouponByID,
  updateCoupon,
  deleteCouponByID,
  validateCoupon,
};
