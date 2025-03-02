import status from 'http-status';
import { prisma } from '../../client';
import ApiError from '../../errors/ApiError';
import { UserInfoFromToken } from '../../types/common';
import { ICategory, ICategoryFilters } from './category.interface';
import { IPaginationOptions } from '../../interfaces/common';
import { calculatePagination } from '../../helpers/paginationHelper';
import { categorySearchableFields } from './category.constant';
import { Prisma } from '@prisma/client';
import { ENUM_USER_ROLE } from '../../enum/user';

const createCategory = async (
  adminInfo: UserInfoFromToken,
  payload: Partial<ICategory>,
) => {
  const checkAdmin = await prisma.user.findUnique({
    where: { id: Number(adminInfo.id) },
  });
  if (!checkAdmin) {
    throw new ApiError(status.NOT_FOUND, 'User not found');
  }
  const data = await prisma.category.create({
    data: {
      name: payload.name as string,
      createdBy: Number(checkAdmin.id),
      updatedBy: Number(checkAdmin.id),
      createdAt: new Date(),
    },
  });

  return data;
};

const getAllCategories = async (
  filters: ICategoryFilters,
  paginationOptions: IPaginationOptions,
) => {
  const { searchTerm, ...filtersData } = filters;
  const { page, limit, skip, orderBy } = calculatePagination(paginationOptions);

  let whereConditions: Prisma.CategoryWhereInput = {};

  // Add search term condition if provided
  if (searchTerm) {
    whereConditions = {
      OR: categorySearchableFields.map(field => ({
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

  const count = await prisma.category.count({ where: whereConditions });

  const result = await prisma.category.findMany({
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

const getCategoryByID = async (id: string) => {
  const data = await prisma.category.findUnique({
    where: {
      id: Number(id),
    },
    include: {
      creator: true,
      updater: true,
    },
  });

  if (!data) {
    throw new ApiError(status.NOT_FOUND, 'Category not found');
  }

  return data;
};

const updateCategory = async (
  id: string,
  payload: Partial<ICategory>,
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
  const checkCategory = await prisma.category.findUnique({
    where: { id: Number(id) },
  });
  if (!checkCategory) {
    throw new ApiError(status.NOT_FOUND, 'Category not found');
  }
  const data = await prisma.category.update({
    where: {
      id: Number(id),
    },
    data: {
      name: payload.name as string,
      updatedBy: Number(checkUser.id),
      updatedAt: new Date(),
    },
  });

  return data;
};

const deleteCategoryByID = async (id:string,userInfo:UserInfoFromToken) => {
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
  const checkCategory = await prisma.category.findUnique({
    where: { id: Number(id) },
  });
  if (!checkCategory) {
    throw new ApiError(status.NOT_FOUND, 'Category not found');
  }
  const data = await prisma.category.delete({
    where: {
      id: Number(id),
    },
  });

  return data;
  
};

export const CategoryService = {
  createCategory,
  getAllCategories,
  getCategoryByID,
  updateCategory,
  deleteCategoryByID,
};
