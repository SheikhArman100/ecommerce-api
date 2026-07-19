import { Request, Response } from 'express';
import status from 'http-status';
import sendResponse from '../../shared/sendResponse';
import catchAsync from '../../shared/catchAsync';
import { OrderService } from './order.service';
import { UserInfoFromToken } from '../../types/common';
import { orderFilterableFields } from './order.constant';
import { paginationFields } from '../../constant';
import pick from '../../helpers/pick';

const createOrder = catchAsync(async (req: Request, res: Response) => {
  const result = await OrderService.createOrderFromCart(req.user as UserInfoFromToken, req.body);

  sendResponse(res, {
    success: true,
    statusCode: status.CREATED,
    message: 'Order initiated. Please complete payment.',
    data: {
      GatewayPageURL: result.GatewayPageURL,
      transactionId: result.transactionId,
    },
  });
});

const getAllOrders = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, orderFilterableFields);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await OrderService.getAllOrders(filters, paginationOptions);

  sendResponse(res, {
    success: true,
    statusCode: status.OK,
    message: 'Orders retrieved successfully',
    data: result.data,
    meta: result.meta,
  });
});

const getSingleOrder = catchAsync(async (req: Request, res: Response) => {
  const result = await OrderService.getSingleOrder(
    req.params.orderId,
    req.user as UserInfoFromToken,
  );

  sendResponse(res, {
    success: true,
    statusCode: status.OK,
    message: 'Order retrieved successfully',
    data: result,
  });
});

const getUserOrders = catchAsync(async (req: Request, res: Response) => {
  const paginationOptions = pick(req.query, paginationFields);

  const result = await OrderService.getUserOrders(
    req.user as UserInfoFromToken,
    paginationOptions,
  );

  sendResponse(res, {
    success: true,
    statusCode: status.OK,
    message: 'User orders retrieved successfully',
    data: result,
  });
});

const updateOrderStatus = catchAsync(async (req: Request, res: Response) => {
  const result = await OrderService.updateOrderStatus(
    req.params.orderId,
    req.body,
    req.user as UserInfoFromToken,
  );

  sendResponse(res, {
    success: true,
    statusCode: status.OK,
    message: 'Order status updated successfully',
    data: result,
  });
});

export const OrderController = {
  createOrder,
  getAllOrders,
  getSingleOrder,
  getUserOrders,
  updateOrderStatus,
};
