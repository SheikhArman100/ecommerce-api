import status from 'http-status';
import { prisma } from '../../client';
import ApiError from '../../errors/ApiError';
import { UserInfoFromToken } from '../../types/common';
import { ICategory, ICategoryFilters, ICreateCategoryPayload } from './category.interface';
import { IFile, IPaginationOptions } from '../../interfaces/common';
import { calculatePagination } from '../../helpers/paginationHelper';
import { categorySearchableFields } from './category.constant';
import { Prisma } from '../../generated/client';
import { ENUM_USER_ROLE } from '../../enum/user';
import fs from 'fs';
import path from 'path';
import ErrorLogger from '../../logger/errorLogger';

const createCategory = async (
  adminInfo: UserInfoFromToken,
  payload: ICreateCategoryPayload,
  multerFile?: IFile,
) => {
  const checkAdmin = await prisma.user.findUnique({
    where: { id: Number(adminInfo.id) },
  });
  if (!checkAdmin) {
    throw new ApiError(status.NOT_FOUND, 'Admin not found');
  }
  if (checkAdmin.role !== ENUM_USER_ROLE.ADMIN) {
    throw new ApiError(
      status.UNAUTHORIZED,
      'You are not authorized to perform this action',
    );
  }

  // Validate that image is provided for category creation
  if (!multerFile) {
    throw new ApiError(status.BAD_REQUEST, 'Category image is required');
  }
  const data = await prisma.category.create({
    data: {
      name: payload.name as string,
      slug: payload.slug,
      description: payload.description,
      isActive: payload.isActive ?? true,
      displayOrder: payload.displayOrder ?? 0,
      createdBy: Number(checkAdmin.id),
      updatedBy: Number(checkAdmin.id),
      createdAt: new Date(),
    },
  });

  // Handle category image upload
  if (multerFile) {
    await prisma.file.create({
      data: {
        categoryId: data.id,
        diskType: 'LOCAL',
        path: `category/images/${multerFile.filename}`,
        originalName: multerFile.originalname,
        modifiedName: multerFile.filename,
        type: 'IMAGE',
      },
    });
  }

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

  const count = await prisma.category.count({ where: whereConditions });

  const result = await prisma.category.findMany({
    where: whereConditions,
    orderBy,
    skip,
    take: limit,
    include: {
      creator: true,
      updater: true,
      image: true,
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
      image: true,
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
  multerFile?: IFile,
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
      ...(payload.name && { name: payload.name }),
      ...(payload.slug !== undefined && { slug: payload.slug }),
      ...(payload.description !== undefined && { description: payload.description }),
      ...(payload.isActive !== undefined && { isActive: payload.isActive }),
      ...(payload.displayOrder !== undefined && { displayOrder: payload.displayOrder }),
      updatedBy: Number(checkUser.id),
      updatedAt: new Date(),
    },
  });

  // Handle category image update
  if (multerFile) {
    const existingImage = await prisma.file.findFirst({
      where: { categoryId: Number(id) },
    });

    if (existingImage) {
      // Delete old image file from folder
      const oldImagePath = path.join(process.cwd(), 'uploads', existingImage.path);
      try {
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      } catch (error) {
        // Log error but don't fail the update
        console.error('Error deleting old category image:', error);
        ErrorLogger.error(`Error deleting old category image: ${error}`);
      }

      // Update existing image record
      await prisma.file.update({
        where: { id: existingImage.id },
        data: {
          path: `category/images/${multerFile.filename}`,
          originalName: multerFile.originalname,
          modifiedName: multerFile.filename,
        },
      });
    } else {
      // Create new image record
      await prisma.file.create({
        data: {
          categoryId: Number(id),
          diskType: 'LOCAL',
          path: `category/images/${multerFile.filename}`,
          originalName: multerFile.originalname,
          modifiedName: multerFile.filename,
          type: 'IMAGE',
        },
      });
    }
  }

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

  // Get category image before deletion for cleanup
  const categoryImage = await prisma.file.findFirst({
    where: { categoryId: Number(id) },
  });

  const data = await prisma.category.delete({
    where: {
      id: Number(id),
    },
  });

  // Delete image file from folder after successful deletion
  if (categoryImage) {
    const imagePath = path.join(process.cwd(), 'uploads', categoryImage.path);
    try {
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    } catch (error) {
      // Log error but don't fail the deletion
      console.error('Error deleting category image:', error);
    }
  }

  return data;
};

export const CategoryService = {
  createCategory,
  getAllCategories,
  getCategoryByID,
  updateCategory,
  deleteCategoryByID,
};
