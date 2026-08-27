import status from 'http-status';
import { prisma } from '../../client';
import ApiError from '../../errors/ApiError';
import { UserInfoFromToken } from '../../types/common';
import { ISize, ISizeFilters } from './size.interface';
import { IPaginationOptions } from '../../interfaces/common';
import { calculatePagination } from '../../helpers/paginationHelper';
import { sizeSearchableFields } from './size.constant';
import { Prisma } from '../../generated/client';
import { ENUM_USER_ROLE } from '../../enum/user';

const createSize = async (
  adminInfo: UserInfoFromToken,
  payload: Partial<ISize>,
) => {
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
  const data = await prisma.size.create({
    data: {
      name: payload.name as string,
      description: payload.description,
      isActive: payload.isActive ?? true,
      createdBy: Number(checkAdmin.id),
      updatedBy: Number(checkAdmin.id),
      createdAt: new Date(),
    },
  });

  return data;
};

const getAllSizes = async (
  filters: ISizeFilters,
  paginationOptions: IPaginationOptions,
) => {
  const { searchTerm, ...filtersData } = filters;
  const { page, limit, skip, orderBy } = calculatePagination(paginationOptions);

  let whereConditions: Prisma.SizeWhereInput = {};

  // Add search term condition if provided
  if (searchTerm) {
    whereConditions = {
      OR: sizeSearchableFields.map(field => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive' as const,
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
            : typeof value === 'string' &&
                (value === 'true' || value === 'false')
              ? value === 'true'
              : value,
      })),
    };
  }

  const count = await prisma.size.count({ where: whereConditions });

  const result = await prisma.size.findMany({
    where: whereConditions,
    orderBy,
    skip,
    take: limit,
    include: {
      creator: true,
      updater: true,
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

const getSizeByID = async (id: string) => {
  const data = await prisma.size.findUnique({
    where: {
      id: Number(id),
    },
    include: {
      creator: true,
      updater: true,
    },
  });

  if (!data) {
    throw new ApiError(status.NOT_FOUND, 'Size not found');
  }

  return data;
};

const updateSize = async (
  id: string,
  payload: Partial<ISize>,
  userInfo: UserInfoFromToken,
) => {
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
  const checkSize = await prisma.size.findUnique({
    where: { id: Number(id) },
  });
  if (!checkSize) {
    throw new ApiError(status.NOT_FOUND, 'Size not found');
  }
  const data = await prisma.size.update({
    where: {
      id: Number(id),
    },
    data: {
      ...(payload.name && { name: payload.name }),
      ...(payload.description !== undefined && { description: payload.description }),
      ...(payload.isActive !== undefined && { isActive: payload.isActive }),
      updatedBy: Number(checkUser.id),
      updatedAt: new Date(),
    },
  });

  return data;
};

const deleteSizeByID = async (id:string,userInfo:UserInfoFromToken) => {
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
  const checkSize = await prisma.size.findUnique({
    where: { id: Number(id) },
  });
  if (!checkSize) {
    throw new ApiError(status.NOT_FOUND, 'Size not found');
  }
  const data = await prisma.size.delete({
    where: {
      id: Number(id),
    },
  });

  return data;
  
};

export const SizeService = {
  createSize,
  getAllSizes,
  getSizeByID,
  updateSize,
  deleteSizeByID,
};
