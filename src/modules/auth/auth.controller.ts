import { Request, Response } from 'express';

import sendResponse from '../../shared/sendResponse';
import { AuthService } from './auth.service';
import catchAsync from '../../shared/catchAsync';
import status from 'http-status';
import ApiError from '../../errors/ApiError';



const signup = catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.signup(req.body);

    sendResponse(res, {
        statusCode: status.OK,
        success:true,
        message: 'Signup successful! Please check your email to verify your account.',
        data: result,
    });
});
const verifyEmail = catchAsync(async (req: Request, res: Response) => {
    const { token } = req.query;
    

  if (!token || typeof token !== 'string'){
    throw new ApiError(status.NOT_FOUND, 'Token not found');

  }
    
    const result = await AuthService.verifyEmail(token);

    sendResponse(res, {
        statusCode: status.OK,
        success:true,
        message: 'Email Verification Successful',
        data: result,
    });
});





export const AuthController = {
    signup,verifyEmail
    
};
