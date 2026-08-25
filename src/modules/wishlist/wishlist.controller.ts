import { Request, Response } from 'express';
import sendResponse from '../../shared/sendResponse';
import status from 'http-status';
import catchAsync from '../../shared/catchAsync';
import { WishlistService } from './wishlist.service';
import { UserInfoFromToken } from '../../types/common';
import pick from '../../helpers/pick';
import { paginationFields } from '../../constant';
import { wishlistFilterableFields } from './wishlist.constant';

const createWishlist = catchAsync(async (req: Request, res: Response) => {
  const result = await WishlistService.createWishlist(
    req.body,
    req.user as UserInfoFromToken,
  );

  sendResponse(res, {
    success: true,
    statusCode: status.OK,
    message: 'Wishlist created successfully',
    data: result,
  });
});

const getAllWishlists = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, wishlistFilterableFields);
  const paginationOptions = pick(req.query, paginationFields);
  const result = await WishlistService.getAllWishlists(
    filters,
    paginationOptions,
    req.user as UserInfoFromToken,
  );

  sendResponse(res, {
    success: true,
    statusCode: status.OK,
    message: 'Wishlists are retrieved successfully',
    data: result.data,
    meta: result.meta,
  });
});

const getWishlistByUser = catchAsync(async (req: Request, res: Response) => {
  const result = await WishlistService.getWishlistByUser(
    req.user as UserInfoFromToken
  );

  sendResponse(res, {
    success: true,
    statusCode: status.OK,
    message: 'Single User Wishlists retrieved successfully',
    data: result,
  });
});

const getWishlistByID = catchAsync(async (req: Request, res: Response) => {
  const result = await WishlistService.getWishlistByID(
    req.params.id as string,
    req.user as UserInfoFromToken
  );

  sendResponse(res, {
    success: true,
    statusCode: status.OK,
    message: 'Single Wishlist retrieved successfully',
    data: result,
  });
});

const updateWishlist = catchAsync(async (req: Request, res: Response) => {
  const result = await WishlistService.updateWishlist(
    req.params.id as string,
    req.body,
    req.user as UserInfoFromToken
  );

  sendResponse(res, {
    success: true,
    statusCode: status.OK,
    message: 'Wishlist is updated successfully',
    data: result,
  });
});

const deleteWishlistByID = catchAsync(async (req: Request, res: Response) => {
  const result = await WishlistService.deleteWishlistByID(req.params.id as string,req.user as UserInfoFromToken);

  sendResponse(res, {
    success: true,
    statusCode: status.OK,
    message: 'Wishlist is deleted successfully',
    data: result,
  });
});

export const WishlistController = {
  createWishlist,
  getAllWishlists,
  getWishlistByUser,
  getWishlistByID,
  updateWishlist,
  deleteWishlistByID,
};
