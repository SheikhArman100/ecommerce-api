import { Request, Response } from 'express';
import status from 'http-status';
import { DashboardService } from './dashboard.service';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import pick from '../../helpers/pick';
import { dashboardFilterableFields } from './dashboard.constant';

const getDashboardOverview = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, dashboardFilterableFields);

  const result = await DashboardService.getDashboardOverview(filters);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Dashboard overview data fetched successfully',
    data: result,
  });
});

const getSalesAnalytics = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, dashboardFilterableFields);

  const result = await DashboardService.getSalesAnalytics(filters);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Sales analytics data fetched successfully',
    data: result,
  });
});

const getProductPerformance = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, dashboardFilterableFields);

  const result = await DashboardService.getProductPerformance(filters);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Product performance data fetched successfully',
    data: result,
  });
});

const getCustomerAnalytics = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, dashboardFilterableFields);

  const result = await DashboardService.getCustomerAnalytics(filters);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Customer analytics data fetched successfully',
    data: result,
  });
});

export const DashboardController = {
  getDashboardOverview,
  getSalesAnalytics,
  getProductPerformance,
  getCustomerAnalytics,
};
