import { Request, Response } from 'express';
import sendResponse from '../../shared/sendResponse';
import status from 'http-status';
import catchAsync from '../../shared/catchAsync';
import { WishlistService } from './wishlist.service';
import { UserInfoFromToken } from '../../types/common';



const createWishlist = catchAsync(async (req: Request, res: Response) => {
    const result = await WishlistService.createWishlist(req.body,req.user as UserInfoFromToken);

    sendResponse(res, {
        success:true,
        statusCode: status.OK,
        message: 'Wishlist created successfully',
        data: result,
    });
    
});

const getAllWishlists = catchAsync(async (req: Request, res: Response) => {
    const result = await WishlistService.getAllWishlists();

    sendResponse(res, {
        success:true,
        statusCode: status.OK,
        message: 'Wishlists are retrieved successfully',
        data: result,
    });
});

const getWishlistByID = catchAsync(async (req: Request, res: Response) => {
    const result = await WishlistService.getWishlistByID();

    sendResponse(res, {
        success:true,
        statusCode: status.OK,
        message: 'Single Wishlist retrieved successfully',
        data: result,
    });
});

const updateWishlist = catchAsync(async (req: Request, res: Response) => {
    const result = await WishlistService.updateWishlist

    sendResponse(res, {
        success:true,
        statusCode: status.OK,
        message: 'Wishlist is updated successfully',
        data: result,
    });
});

const deleteWishlistByID = catchAsync(async (req: Request, res: Response) => {
    const result = await WishlistService.deleteWishlistByID();

    sendResponse(res, {
        success:true,
        statusCode: status.OK,
        message: 'Wishlist is deleted successfully',
        data: result,
    });
});

export const WishlistController = {
    createWishlist,
    getAllWishlists,
    getWishlistByID,
    updateWishlist,
    deleteWishlistByID,
};
