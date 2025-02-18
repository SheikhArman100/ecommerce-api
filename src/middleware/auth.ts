import { NextFunction, Request, Response } from 'express';
import status from 'http-status';
import { Secret } from 'jsonwebtoken';
import config from '../config';
import ApiError from '../errors/ApiError';
import { jwtHelpers } from '../helpers/jwtHelpers';


/**
 * Authentication middleware that verifies the presence and validity of a JWT token
 * and checks if the user has the required role(s) to access a route.
 *
 * This function accepts a list of required roles and returns an Express middleware function
 * that checks the following:
 * 1. Retrieves the authorization token from the request headers.
 * 2. Validates that the token is present and correctly formatted as a "Bearer" token.
 * 3. Verifies the JWT token using the configured secret.
 * 4. Attaches the verified user data to the request object for downstream middleware or controllers.
 * 5. Checks if the verified user's role matches any of the required roles (if specified).
 * 6. If the user is authorized, the request proceeds to the next middleware function; otherwise, it throws an error.
 *
 * @param {string[]} requiredRoles - A list of roles that are allowed to access the route.
 * @returns {Function} An Express middleware function.
 */
const auth =
  (...requiredRoles: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      //get authorization token
      const authHeader: any =
        req.headers.authorization || req.headers.Authorization;
      if (!authHeader || !authHeader.startsWith('Bearer '))
        throw new ApiError(status.FORBIDDEN, 'You are not authorized');

      const token = authHeader.split(' ')[1];

      // verify token
      let verifiedUser = null;

      verifiedUser = jwtHelpers.verifyToken(
        token,
        config.jwt.access_secret as Secret,
      );

      req.user = verifiedUser;

      // role guard
      if (requiredRoles.length && !requiredRoles.includes(verifiedUser.role)) {
        throw new ApiError(status.FORBIDDEN, 'You have no access.');
      }
      next();
    } catch (error) {
      next(error);
    }
  };

export default auth;
