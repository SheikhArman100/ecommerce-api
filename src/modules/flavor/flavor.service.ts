import status from 'http-status';
import { prisma } from '../../client';
import ApiError from '../../errors/ApiError';
import { UserInfoFromToken } from '../../types/common';
import { IFlavor, IFlavorFilters } from './flavor.interface';
import { IPaginationOptions } from '../../interfaces/common';
import { calculatePagination } from '../../helpers/paginationHelper';
import { flavorSearchableFields } from './flavor.constant';
import { Prisma } from '../../generated/client';
import { ENUM_USER_ROLE } from '../../enum/user';

const createFlavor = async (
  adminInfo: UserInfoFromToken,
  payload: Partial<IFlavor>,
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
  const data = await prisma.flavor.create({
    data: {
      name: payload.name as string,
      color:payload.color as string,
      createdBy: Number(checkAdmin.id),
      updatedBy: Number(checkAdmin.id),
      createdAt: new Date(),
    },
  });

  return data;
};

const getAllFlavors = async (
  filters: IFlavorFilters,
  paginationOptions: IPaginationOptions,
) => {
  const { searchTerm, ...filtersData } = filters;
  const { page, limit, skip, orderBy } = calculatePagination(paginationOptions);

  let whereConditions: Prisma.FlavorWhereInput = {};

  // Add search term condition if provided
  if (searchTerm) {
    whereConditions = {
      OR: flavorSearchableFields.map(field => ({
        [field]: {
          contains: searchTerm,
          // mode: 'insensitive',
        },
      })),
    };
  }

  // Add other filter conditions
  if (Object.keys(filtersData).length) {
    whereConditions = {
      ...whereConditions,
      AND: Object.entries(filtersData).map(([field, value]) => ({
        [field]: value,
      })),
    };
  }

  const count = await prisma.flavor.count({ where: whereConditions });

  const result = await prisma.flavor.findMany({
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

const getFlavorByID = async (id: string) => {
  const data = await prisma.flavor.findUnique({
    where: {
      id: Number(id),
    },
    include: {
      creator: true,
      updater: true,
    },
  });

  if (!data) {
    throw new ApiError(status.NOT_FOUND, 'Flavor not found');
  }

  return data;
};

const updateFlavor = async (
  id: string,
  payload: Partial<IFlavor>,
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
  const checkFlavor = await prisma.flavor.findUnique({
    where: { id: Number(id) },
  });
  if (!checkFlavor) {
    throw new ApiError(status.NOT_FOUND, 'Flavor not found');
  }
  const data = await prisma.flavor.update({
    where: {
      id: Number(id),
    },
    data: {
      ...(payload.name && { name: payload.name }),
      ...(payload.color && { color: payload.color }),
      updatedBy: Number(checkUser.id),
      updatedAt: new Date(),
    },
  });

  return data;
};

const deleteFlavorByID = async (id:string,userInfo:UserInfoFromToken) => {
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
  const checkFlavor = await prisma.flavor.findUnique({
    where: { id: Number(id) },
  });
  if (!checkFlavor) {
    throw new ApiError(status.NOT_FOUND, 'Flavor not found');
  }
  const data = await prisma.flavor.delete({
    where: {
      id: Number(id),
    },
  });

  return data;
  
};

export const FlavorService = {
  createFlavor,
  getAllFlavors,
  getFlavorByID,
  updateFlavor,
  deleteFlavorByID,
};
