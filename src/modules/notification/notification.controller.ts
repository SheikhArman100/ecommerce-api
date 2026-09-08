import { Request, Response } from 'express';
import status from 'http-status';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import pick from '../../helpers/pick';
import { NotificationService } from './notification.service';
import { notificationFilterableFields } from './notification.constant';
import { paginationFields } from '../../constant';
import { UserInfoFromToken } from '../../types/common';

const createNotification = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.createNotification(
    req.body,
    req.user as UserInfoFromToken,
  );

  sendResponse(res, {
    success: true,
    statusCode: status.OK,
    message: 'Notification created successfully',
    data: result,
  });
});

const getAllNotifications = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, notificationFilterableFields);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await NotificationService.getAllNotifications(
    filters,
    paginationOptions,
  );

  sendResponse(res, {
    success: true,
    statusCode: status.OK,
    message: 'Notifications retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getUnreadCount = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.getUnreadCount(
    req.user as UserInfoFromToken,
  );

  sendResponse(res, {
    success: true,
    statusCode: status.OK,
    message: 'Unread count retrieved successfully',
    data: result,
  });
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.markAsRead(
    req.params.id as string,
    req.user as UserInfoFromToken,
  );

  sendResponse(res, {
    success: true,
    statusCode: status.OK,
    message: 'Notification marked as read',
    data: result,
  });
});

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.markAllAsRead(
    req.user as UserInfoFromToken,
  );

  sendResponse(res, {
    success: true,
    statusCode: status.OK,
    message: 'All notifications marked as read',
    data: result,
  });
});

const deleteNotification = catchAsync(async (req: Request, res: Response) => {
  const result = await NotificationService.deleteNotification(
    req.params.id as string,
    req.user as UserInfoFromToken,
  );

  sendResponse(res, {
    success: true,
    statusCode: status.OK,
    message: 'Notification deleted successfully',
    data: result,
  });
});

export const NotificationController = {
  createNotification,
  getAllNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};