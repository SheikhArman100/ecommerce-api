import { Request, Response } from 'express';

import sendResponse from '../../shared/sendResponse';
import { AuthService } from './auth.service';
import catchAsync from '../../shared/catchAsync';
import status from 'http-status';



const signup = catchAsync(async (req: Request, res: Response) => {
    const result = await AuthService.signup(req.body);

    sendResponse(res, {
        statusCode: status.OK,
        success:true,
        message: 'Signup successful! Please check your email to verify your account.',
        data: result,
    });
});



export const AuthController = {
    signup
    
};
