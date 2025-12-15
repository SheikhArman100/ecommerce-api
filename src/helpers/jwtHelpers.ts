
import jwt, { JwtPayload, Secret } from 'jsonwebtoken';
import ApiError from '../errors/ApiError';
import { parseExpirationTime } from '../utils';
import status from 'http-status';

const createToken = (
  payload: Record<string, unknown>,
  secret: Secret,
  expireTime: string,
): string => {
  
  return jwt.sign(payload, secret, {
    expiresIn: parseExpirationTime(expireTime),
  });
};

const verifyToken = (token: string, secret: Secret): JwtPayload => {
  try {
    const isVerified = jwt.verify(token, secret);
    return isVerified as any;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(status.FORBIDDEN, 'Token has expired');
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
