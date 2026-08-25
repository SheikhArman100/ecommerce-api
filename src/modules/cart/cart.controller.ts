import { Request, Response } from 'express';
import status from 'http-status';
import sendResponse from '../../shared/sendResponse';

import { CartService } from './cart.service';
import catchAsync from '../../shared/catchAsync';
import { UserInfoFromToken } from '../../types/common';
import { cartFilterableFields } from './cart.constant';
import { paginationFields } from '../../constant';
import pick from '../../helpers/pick';



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
    const filters = pick(req.query, cartFilterableFields);
  const paginationOptions = pick(req.query, paginationFields);
    const result = await CartService.getAllCarts(filters,
        paginationOptions);

    sendResponse(res, {
        success:true,
        statusCode: status.OK,
        message: 'Carts are retrieved successfully',
        data: result.data,
        meta: result.meta,
    });
});

const getSingleCart = catchAsync(async (req: Request, res: Response) => {
    const result = await CartService.getSingleCart(req.user as UserInfoFromToken);

    sendResponse(res, {
        success:true,
        statusCode: status.OK,
        message: 'Single Cart retrieved successfully',
        data: result,
    });
});

const updateCartItemByID = catchAsync(async (req: Request, res: Response) => {
    const result = await CartService.updateCartItemByID(req.params.cartItemId as string, req.body, req.user as UserInfoFromToken);

    sendResponse(res, {
        success:true,
        statusCode: status.OK,
        message: 'Cart Item is updated successfully',
        data: result,
    });
});

const getCartByID = catchAsync(async (req: Request, res: Response) => {
    const result = await CartService.getCartByID(req.params.cartId as string, req.user as UserInfoFromToken);

    sendResponse(res, {
        success:true,
        statusCode: status.OK,
        message: 'Cart retrieved successfully',
        data: result,
    });
});

const deleteCartItemByID = catchAsync(async (req: Request, res: Response) => {
    const result = await CartService.deleteCartItemByID(req.params.cartItemId as string, req.user as UserInfoFromToken);

    sendResponse(res, {
        success:true,
        statusCode: status.OK,
        message: 'Cart Item is deleted successfully',
        data: result,
    });
});

export const CartController = {
    createCart,
    getAllCarts,
    getSingleCart,
    getCartByID,
    updateCartItemByID,
    deleteCartItemByID,
};
