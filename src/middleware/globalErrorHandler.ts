import { Prisma } from '@prisma/client';
import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { IGenericErrorMessages } from '../interfaces/error';
import handleValidationError from '../errors/handleValidationError';
import handleCastError from '../errors/handleCastError';
import handleZodError from '../errors/handleZodError';
import ApiError from '../errors/ApiError';
import config from '../config';

/**
 * Global error handler for Express, tailored for Prisma, Zod, and TypeScript.
 * Catches and standardizes all errors occurring in the API.
 */
const globalErrorHandler: ErrorRequestHandler = (error, req, res, next) => {
  console.error('globalErrorHandler:', error);

  let statusCode = 500;
  let message = 'Something went wrong!';
  let errorMessages: IGenericErrorMessages[] = [];

  if (error instanceof Prisma.PrismaClientValidationError) {
    const simplifiedError = handleValidationError(error);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorMessages = simplifiedError.errorMessages;
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Handle MySQL duplicate entry error
    if (error.code === 'P2002') {
      statusCode = 409; // Conflict status code
      message = 'Duplicate entry error';

      const target = (error.meta?.target as string[]) || [];
      errorMessages = target.map(field => ({
        path: field,
        message: `${field} already exists`,
      }));
    } else {
      const simplifiedError = handleCastError(error);
      statusCode = simplifiedError.statusCode;
      message = simplifiedError.message;
      errorMessages = simplifiedError.errorMessages;
    }
  } else if (error instanceof ZodError) {
    const simplifiedError = handleZodError(error);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorMessages = simplifiedError.errorMessages;
  } else if (error instanceof ApiError) {
    statusCode = error.statusCode;
    message = error.message;
    errorMessages = error.message ? [{ path: '', message: error.message }] : [];
  } else if (error instanceof Error) {
    message = error.message;
    errorMessages = error.message ? [{ path: '', message: error.message }] : [];
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    errorMessages,
    stack: config.env !== 'production' ? error.stack : undefined,
  });
  next();
};

export default globalErrorHandler;
