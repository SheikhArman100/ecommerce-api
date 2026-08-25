import { Request, Response } from 'express';
import status from 'http-status';
import { ReviewService } from './review.service';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { UserInfoFromToken } from '../../types/common';
import pick from '../../helpers/pick';
import { reviewFilterableFields } from './review.constant';
import { paginationFields } from '../../constant';

const createReview = catchAsync(async (req: Request, res: Response) => {
  const clientIP = req.ip || req.connection.remoteAddress || '0.0.0.0';
  const result = await ReviewService.createReview(req.user as UserInfoFromToken, req.body, req.files as Express.Multer.File[], clientIP);

  sendResponse(res, {
    statusCode: status.CREATED,
    success: true,
    message: 'Review created successfully',
    data: result,
  });
});

const getAllReviews = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, reviewFilterableFields);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await ReviewService.getAllReviews(filters, paginationOptions);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Reviews retrieved successfully',
    data: result.data,
    meta: result.meta,
  });
});

const getReviewByID = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.getReviewByID(req.params.id as string);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Review retrieved successfully',
    data: result,
  });
});

const updateReview = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.updateReview(req.params.id as string, req.body, req.user as UserInfoFromToken);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Review updated successfully',
    data: result,
  });
});

const deleteReview = catchAsync(async (req: Request, res: Response) => {
  const result = await ReviewService.deleteReview(req.params.id as string, req.user as UserInfoFromToken);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Review deleted successfully',
    data: result,
  });
});

export const ReviewController = {
  createReview,
  getAllReviews,
  getReviewByID,
  updateReview,
  deleteReview,
};
