import { Request, Response } from 'express';

import sendResponse from '../../shared/sendResponse';
import { AuthService } from './auth.service';
import catchAsync from '../../shared/catchAsync';
import status from 'http-status';



const createAuth = catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.createAuth();

    sendResponse(res, {
        statusCode: status.OK,
        success:true,
        message: 'Auth created successfully',
        data: result,
    });
});



export const AuthController = {
    createAuth,
    
};
