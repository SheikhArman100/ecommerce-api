import { Request, Response } from 'express';
import status from 'http-status';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { UserInfoFromToken } from '../../types/common';
import pick from '../../helpers/pick';
import { sizeFilterableFields } from './size.constant';
import { paginationFields } from '../../constant';
import { SizeService } from './size.service';

const createSize = catchAsync(async (req: Request, res: Response) => {
  const result = await SizeService.createSize(req.user as UserInfoFromToken, req.body);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Size created successfully',
    data: result,
  });
});

const getAllSizes = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, sizeFilterableFields);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await SizeService.getAllSizes(
    filters,
    paginationOptions,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'All size fetched successfully!',
    data: result.data,
    meta: result.meta,
  });
});

const getSizeByID = catchAsync(async (req: Request, res: Response) => {
  const result = await SizeService.getSizeByID(req.params.id as string);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Single Size retrieved successfully',
    data: result,
  });
});

const updateSize = catchAsync(async (req: Request, res: Response) => {
  const result = await SizeService.updateSize(req.params.id as string, req.body,req.user as UserInfoFromToken);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Size is updated successfully',
    data: result,
  });
});

const deleteSizeByID = catchAsync(async (req: Request, res: Response) => {
  const result = await SizeService.deleteSizeByID(req.params.id as string,req.user as UserInfoFromToken);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Size is deleted successfully',
    data: result,
  });
});

export const SizeController = {
  createSize,
  getAllSizes,
  getSizeByID,
  updateSize,
  deleteSizeByID,
};
