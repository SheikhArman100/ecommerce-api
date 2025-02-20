import { Request, Response } from 'express';

import sendResponse from '../../shared/sendResponse';
import { AuthService } from './auth.service';
import catchAsync from '../../shared/catchAsync';
import status from 'http-status';
import ApiError from '../../errors/ApiError';
import { IUser } from '../user/user.interface';
import config from '../../config';
import { ENUM_COOKIE_NAME } from '../../enum/user';



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

const signin = catchAsync(async (req: Request, res: Response) => {
    const { refreshToken, ...result } = await AuthService.signin(req.user as IUser);
    const cookieOptions = {
        secure: config.env === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 365,
      };
    
      res.cookie(ENUM_COOKIE_NAME.REFRESH_TOKEN, refreshToken, cookieOptions);

    sendResponse(res, {
        statusCode: status.OK,
        success:true,
        message: 'Signin successful!',
        data: result,
    });
});

const googleSignIn = catchAsync(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new ApiError(status.UNAUTHORIZED,"Google authentication failed")
      }

    const { refreshToken, ...result } = await AuthService.googleSignIn(req.user as IUser);
    const cookieOptions = {
        secure: config.env === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 365,
      };
    
      res.cookie(ENUM_COOKIE_NAME.REFRESH_TOKEN, refreshToken, cookieOptions);

    sendResponse(res, {
        statusCode: status.OK,
        success:true,
        message: 'Signin successful!',
        data: result,
    });
});






export const AuthController = {
    signup,verifyEmail,signin,googleSignIn
    
};
