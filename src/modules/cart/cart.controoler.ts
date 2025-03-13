import { Request, Response } from 'express';
import status from 'http-status';
import sendResponse from '../../shared/sendResponse';

import { CartService } from './cart.service';
import catchAsync from '../../shared/catchAsync';
import { UserInfoFromToken } from '../../types/common';



const createCart = catchAsync(async (req: Request, res: Response) => {
    const result = await CartService.createCart(req.body, req.user as UserInfoFromToken);

    sendResponse(res, {
        success:true,
        statusCode: status.OK,
        message: 'Cart created successfully',
        data: result,
    });
});

const getAllCarts = catchAsync(async (req: Request, res: Response) => {
    const result = await CartService.getAllCarts();

    sendResponse(res, {
        success:true,
        statusCode: status.OK,
        message: 'Carts are retrieved successfully',
        data: result,
    });
});

const getCartByID = catchAsync(async (req: Request, res: Response) => {
    const result = await CartService.getCartByID();

    sendResponse(res, {
        success:true,
        statusCode: status.OK,
        message: 'Single Cart retrieved successfully',
        data: result,
    });
});

const updateCart = catchAsync(async (req: Request, res: Response) => {
    const result = await CartService.updateCart();

    sendResponse(res, {
        success:true,
        statusCode: status.OK,
        message: 'Cart is updated successfully',
        data: result,
    });
});

const deleteCartByID = catchAsync(async (req: Request, res: Response) => {
    const result = await CartService.deleteCartByID();

    sendResponse(res, {
        success:true,
        statusCode: status.OK,
        message: 'Cart is deleted successfully',
        data: result,
    });
});

export const CartController = {
    createCart,
    getAllCarts,
    getCartByID,
    updateCart,
    deleteCartByID,
};
