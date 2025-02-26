import { Request, Response } from 'express';
import status from 'http-status';
import { CategoryService } from './category.service';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { UserInfoFromToken } from '../../types/common';

const createCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.createCategory(req.user as UserInfoFromToken, req.body);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Category created successfully',
    data: result,
  });
});

const getAllCategories = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.getAllCategories();

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Categories are retrieved successfully',
    data: result,
  });
});

const getCategoryByID = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.getCategoryByID();

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Single Category retrieved successfully',
    data: result,
  });
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.updateCategory();

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Category is updated successfully',
    data: result,
  });
});

const deleteCategoryByID = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.deleteCategoryByID();

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Category is deleted successfully',
    data: result,
  });
});

export const CategoryController = {
  createCategory,
  getAllCategories,
  getCategoryByID,
  updateCategory,
  deleteCategoryByID,
};
