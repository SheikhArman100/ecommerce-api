import status from 'http-status';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import ApiError from '../errors/ApiError';
import { UserInfoFromToken } from '../types/common';

/**
 * create jwt token using user private details
 * @param payload
 * @param secret secret key that has been declared in .env
 * @param expireTime after this particular time,this will not br work
 * @returns
 */
const createToken = (
  payload: Record<string, unknown>,
  secret: Secret,
  expireTime: SignOptions['expiresIn'] = '1h',
): string => {
  const options: SignOptions = {
    expiresIn: expireTime,
  };

  try {
    return jwt.sign(payload, secret, options);
  } catch (error) {
    console.log(error);
    throw new ApiError(
      status.INTERNAL_SERVER_ERROR,
      'Error creating token',
    );
  }
};

/**
 * verify jwt token to verify user
 * @param token
 * @param secret secret key that has been declared in .env
 * @returns
 */
const verifyToken = (token: string, secret: Secret): UserInfoFromToken => {
  try {
    const decoded = jwt.verify(token, secret) as UserInfoFromToken;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(status.UNAUTHORIZED, 'Token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new ApiError(status.UNAUTHORIZED, 'Invalid token');
    }
    throw new ApiError(status.UNAUTHORIZED, 'Token verification failed');
  }
};

export const jwtHelpers = {
  createToken,
  verifyToken,
};
