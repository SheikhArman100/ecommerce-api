import { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Wraps an asynchronous route handler to catch errors and pass them to Express's error handler.
 * @param fn
 * @returns
 */
const catchAsync =
  (fn: RequestHandler) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await fn(req, res, next);
    } catch (error) {
      next(error);
    }
  };

export default catchAsync;