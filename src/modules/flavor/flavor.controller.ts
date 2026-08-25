import { Request, Response } from 'express';
import status from 'http-status';
import { FlavorService } from './flavor.service';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { UserInfoFromToken } from '../../types/common';
import pick from '../../helpers/pick';
import { flavorFilterableFields } from './flavor.constant';
import { paginationFields } from '../../constant';

const createFlavor = catchAsync(async (req: Request, res: Response) => {
  const result = await FlavorService.createFlavor(req.user as UserInfoFromToken, req.body);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Flavor created successfully',
    data: result,
  });
});

const getAllFlavors = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, flavorFilterableFields);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await FlavorService.getAllFlavors(
    filters,
    paginationOptions,
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'All flavor fetched successfully!',
    data: result.data,
    meta: result.meta,
  });
});

const getFlavorByID = catchAsync(async (req: Request, res: Response) => {
  const result = await FlavorService.getFlavorByID(req.params.id as string);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Single Flavor retrieved successfully',
    data: result,
  });
});

const updateFlavor = catchAsync(async (req: Request, res: Response) => {
  const result = await FlavorService.updateFlavor(req.params.id as string, req.body,req.user as UserInfoFromToken);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Flavor is updated successfully',
    data: result,
  });
});

const deleteFlavorByID = catchAsync(async (req: Request, res: Response) => {
  const result = await FlavorService.deleteFlavorByID(req.params.id as string,req.user as UserInfoFromToken);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Flavor is deleted successfully',
    data: result,
  });
});

export const FlavorController = {
  createFlavor,
  getAllFlavors,
  getFlavorByID,
  updateFlavor,
  deleteFlavorByID,
};
