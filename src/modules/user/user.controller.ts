import { Request, Response } from 'express';
import status from 'http-status';
import catchAsync from '../../shared/catchAsync';
import sendResponse from '../../shared/sendResponse';
import { UserService } from './user.service';


const createUser = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.createUser();

    sendResponse(res, {
        statusCode: status.OK,
        success:true,
        message: 'User created successfully',
        data: result,
    });
});

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.getAllUsers();

    sendResponse(res, {
        statusCode: status.OK,
        success:true,
        message: 'Users are retrieved successfully',
        data: result,
    });
});

const getUserByID = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.getUserByID();

    sendResponse(res, {
        statusCode: status.OK,
        success:true,
        message: 'Single User retrieved successfully',
        data: result,
    });
});

const updateUser = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.updateUser();

    sendResponse(res, {
        statusCode: status.OK,
        success:true,
        message: 'User is updated successfully',
        data: result,
    });
});

const deleteUserByID = catchAsync(async (req: Request, res: Response) => {
    const result = await UserService.deleteUserByID();

    sendResponse(res, {
        statusCode: status.OK,
        success:true,
        message: 'User is deleted successfully',
        data: result,
    });
});

export const UserController = {
    createUser,
    getAllUsers,
    getUserByID,
    updateUser,
    deleteUserByID,
};
