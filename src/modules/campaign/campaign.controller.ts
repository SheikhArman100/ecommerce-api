import { Request, Response } from 'express';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import httpStatus from 'http-status';
import { CampaignService } from './campaign.service';

import pick from '../../helpers/pick';
import { campaignFilterableFields } from './campaign.constant';
import { paginationFields } from '../../constant';

const createCampaign = catchAsync(async (req: Request, res: Response) => {
  if (req.file) {
    req.body.bannerImage = `campaign/images/${req.file.filename}`;
  }

  const user = (req as any).user;
  const result = await CampaignService.createCampaign({
    ...req.body,
    createdBy: Number(user.id),
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Campaign created successfully',
    data: result,
  });
});

const getAllCampaigns = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, campaignFilterableFields);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await CampaignService.getAllCampaigns(filters, paginationOptions);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Campaigns fetched successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getActiveCampaign = catchAsync(async (_req: Request, res: Response) => {
  const result = await CampaignService.getActiveCampaign();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result
      ? 'Active campaign fetched successfully'
      : 'No active campaign at the moment',
    data: result,
  });
});

const getSingleCampaign = catchAsync(async (req: Request, res: Response) => {
  const result = await CampaignService.getSingleCampaign(Number(req.params.id));
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Campaign fetched successfully',
    data: result,
  });
});

const updateCampaign = catchAsync(async (req: Request, res: Response) => {
  if (req.file) {
    req.body.bannerImage = `campaign/images/${req.file.filename}`;
  }

  const user = (req as any).user;
  const result = await CampaignService.updateCampaign(Number(req.params.id), {
    ...req.body,
    updatedBy: Number(user.id),
  });
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Campaign updated successfully',
    data: result,
  });
});

const deleteCampaign = catchAsync(async (req: Request, res: Response) => {
  const result = await CampaignService.deleteCampaign(Number(req.params.id));
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Campaign deleted successfully',
    data: result,
  });
});

const addProductToCampaign = catchAsync(async (req: Request, res: Response) => {
  const result = await CampaignService.addProductToCampaign(Number(req.params.id), req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Product added to campaign successfully',
    data: result,
  });
});

const removeProductFromCampaign = catchAsync(async (req: Request, res: Response) => {
  const result = await CampaignService.removeProductFromCampaign(
    Number(req.params.id),
    Number(req.params.productId)
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Product removed from campaign successfully',
    data: result,
  });
});

export const CampaignController = {
  createCampaign,
  getAllCampaigns,
  getActiveCampaign,
  getSingleCampaign,
  updateCampaign,
  deleteCampaign,
  addProductToCampaign,
  removeProductFromCampaign,
};
