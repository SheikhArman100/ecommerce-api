import { Request, Response } from 'express';
import status from 'http-status';
import { CategoryService } from './category.service';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { UserInfoFromToken } from '../../types/common';
import pick from '../../helpers/pick';
import { categoryFilterableFields } from './category.constant';
import { paginationFields } from '../../constant';

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
  const filters = pick(req.query, categoryFilterableFields);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await CategoryService.getAllCategories(
    filters,
    paginationOptions,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'All category fetched successfully!',
    data: result.data,
    meta: result.meta,
  });
});

const getCategoryByID = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.getCategoryByID(req.params.id);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Single Category retrieved successfully',
    data: result,
  });
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.updateCategory(req.params.id, req.body,req.user as UserInfoFromToken);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Category is updated successfully',
    data: result,
  });
});

const deleteCategoryByID = catchAsync(async (req: Request, res: Response) => {
  const result = await CategoryService.deleteCategoryByID(req.params.id,req.user as UserInfoFromToken);

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
