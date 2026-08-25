import { Request, Response } from 'express';
import status from 'http-status';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { UserService } from './user.service';
import { UserInfoFromToken } from '../../types/common';
import pick from '../../helpers/pick';
import { userFilterableFields } from './user.constant';
import { paginationFields } from '../../constant';

const createUser = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.createUser(req.user as UserInfoFromToken, req.body,req.file);

    sendResponse(res, {
        statusCode: status.CREATED,
        success: true,
        message: 'User created successfully',
        data: result,
    });
});

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
    const filters = pick(req.query, userFilterableFields);
    const paginationOptions = pick(req.query, paginationFields);

    const result = await UserService.getAllUsers(filters, paginationOptions);

    sendResponse(res, {
        statusCode: status.OK,
        success: true,
        message: 'Users retrieved successfully',
        data: result.data,
        meta: result.meta,
    });
});

const getUserByID = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.getUserByID(req.params.id as string);

    sendResponse(res, {
        statusCode: status.OK,
        success: true,
        message: 'User retrieved successfully',
        data: result,
    });
});

const updateUser = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.updateUser(req.params.id as string, req.body, req.user as UserInfoFromToken,req.file);

    sendResponse(res, {
        statusCode: status.OK,
        success: true,
        message: 'User updated successfully',
        data: result,
    });
});

const deleteUserByID = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.deleteUserByID(req.params.id as string, req.user as UserInfoFromToken);

    sendResponse(res, {
        statusCode: status.OK,
        success: true,
        message: 'User deleted successfully',
        data: result,
    });
});

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.getMyProfile(req.user as UserInfoFromToken);

    sendResponse(res, {
        statusCode: status.OK,
        success: true,
        message: 'Profile retrieved successfully',
        data: result,
    });
});

const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.updateMyProfile(req.user as UserInfoFromToken, req.body,req.file);

    sendResponse(res, {
        statusCode: status.OK,
        success: true,
        message: 'Profile updated successfully',
        data: result,
    });
});

export const UserController = {
    createUser,
    getAllUsers,
    getUserByID,
    updateUser,
    deleteUserByID,
    getMyProfile,
    updateMyProfile,
};
