import { NextFunction, Request, Response } from 'express';

import httpStatus from 'http-status';
import ApiError from '../errors/ApiError';

/**
 * parsing form data
 * @param req
 * @param response
 * @param next
 */
const jsonParse = (req: Request, response: Response, next: NextFunction) => {
  try {
    if (req.body.data) {
      req.body = JSON.parse(req.body.data);
    } else {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Data not found!');
    }
    next();
  } catch (error) {
    next(error);
  }
};

export default jsonParse;
