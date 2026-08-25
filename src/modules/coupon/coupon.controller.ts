import { Request, Response } from 'express';
import status from 'http-status';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { CouponService } from './coupon.service';
import pick from '../../helpers/pick';
import { paginationFields } from '../../constant';
import { UserInfoFromToken } from '../../types/common';
import { couponFilterableFields } from './coupon.constant';

const createCoupon = catchAsync(async (req: Request, res: Response) => {
  const result = await CouponService.createCoupon(req.user as UserInfoFromToken, req.body);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Coupon created successfully',
    data: result,
  });
});

const getAllCoupons = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, couponFilterableFields);
  const paginationOptions = pick(req.query, paginationFields);
  const result = await CouponService.getAllCoupons(filters, paginationOptions);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Coupons fetched successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getCouponByID = catchAsync(async (req: Request, res: Response) => {
  const result = await CouponService.getCouponByID(req.params.id as string);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Single Coupon fetched successfully',
    data: result,
  });
});

const updateCoupon = catchAsync(async (req: Request, res: Response) => {
  const result = await CouponService.updateCoupon(
    req.params.id as string,
    req.body,
    req.user as UserInfoFromToken
  );
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Coupon updated successfully',
    data: result,
  });
});

const deleteCouponByID = catchAsync(async (req: Request, res: Response) => {
  const result = await CouponService.deleteCouponByID(req.params.id as string, req.user as UserInfoFromToken);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Coupon deleted successfully',
    data: result,
  });
});

const validateCoupon = catchAsync(async (req: Request, res: Response) => {
  const { code, amount } = req.body;
  const result = await CouponService.validateCoupon(code, amount);
  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Coupon is valid',
    data: result,
  });
});

export const CouponController = {
  createCoupon,
  getAllCoupons,
  getCouponByID,
  updateCoupon,
  deleteCouponByID,
  validateCoupon,
};
