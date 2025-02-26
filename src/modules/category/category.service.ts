import status from 'http-status';
import { prisma } from '../../client';
import ApiError from '../../errors/ApiError';
import { UserInfoFromToken } from '../../types/common';
import { ICategory } from './category.interface';

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
    } 
  });

  return data;
};

const getAllCategories = async () => {
  return 'getAllCategories service';
};

const getCategoryByID = async () => {
  return 'getCategoryByID service';
};

const updateCategory = async () => {
  return 'updateCategory service';
};

const deleteCategoryByID = async () => {
  return 'deleteCategoryByID service';
};

export const CategoryService = {
  createCategory,
  getAllCategories,
  getCategoryByID,
  updateCategory,
  deleteCategoryByID,
};
