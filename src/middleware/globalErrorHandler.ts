
import { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import config from '../config';
import ApiError from '../errors/ApiError';
import handleValidationError from '../errors/handleValidationError';
import handleZodError from '../errors/handleZodError';
import { IGenericErrorMessages } from '../interfaces/error';
import ErrorLogger from '../logger/errorLogger';
import { Prisma } from '../generated/client';



const globalErrorHandler: ErrorRequestHandler = (error, req, res, next) => {
  let statusCode = 500;
  let message = 'Something went wrong!';
  let errorMessages: IGenericErrorMessages[] = [];
  let errorType = 'UnknownError';

  // Request context for logging
  const requestContext = {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    userId: (req as any).user?.id ?? "Unauthorized", 
    stack: error?.stack,
    timestamp: new Date().toISOString(),
  };

  // Handle Prisma Validation Errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    errorType = 'PrismaClientValidationError';
    const simplifiedError = handleValidationError(error);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorMessages = simplifiedError.errorMessages;
    
    ErrorLogger.error('Prisma validation error', {
      error: error.message,
      simplifiedError,
      requestContext,
    });
  } 
  // Handle Prisma Known Request Errors
  else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    errorType = 'PrismaClientKnownRequestError';
    
    switch (error.code) {
      case 'P2002': // Unique constraint violation
        statusCode = 409; // Conflict
        const target = error.meta?.target;
        let fields: string[] = [];

        if (Array.isArray(target)) {
          fields = target;
        } else if (typeof target === 'string') {
          const parts = target.split('_');
          if (parts.length > 1 && parts[parts.length - 1] === 'key') {
            fields = parts.slice(1, -1);
          }
          if (fields.length === 0) {
            fields = [target];
          }
        }

        if (fields.length === 0) {
          fields = ['unknown'];
        }

        message = `Duplicate entry: ${fields.join(', ')} already exists`;
        errorMessages = fields.map(key => ({
          path: key,
          message: `${key} already exists`,
        }));
        break;

      case 'P2025': // Record not found
        statusCode = 404;
        message = 'Record not found';
        errorMessages = [{ path: '', message: 'The requested resource was not found' }];
        break;

      case 'P2003': // Foreign key constraint failed
        statusCode = 400;
        message = 'Foreign key constraint violation';
        errorMessages = [{ path: '', message: 'Referenced record does not exist' }];
        break;

      default:
        statusCode = 400;
        message = 'Database operation failed';
        errorMessages = [{ path: '', message: error.message }];
    }

    ErrorLogger.error('Prisma known request error', {
      error: error.message,
      code: error.code,
      meta: error.meta,
      requestContext,
    });
  }
  // Handle Prisma Client Initialization Errors
  else if (error instanceof Prisma.PrismaClientInitializationError) {
    errorType = 'PrismaClientInitializationError';
    statusCode = 503; // Service Unavailable
    message = 'Database connection failed';
    errorMessages = [{ path: '', message: 'Unable to connect to database' }];
    
    ErrorLogger.error('Prisma initialization error', {
      error: error.message,
      requestContext,
    });
  }
  // Handle Zod Validation Errors
  else if (error instanceof ZodError) {
    errorType = 'ZodValidationError';
    const simplifiedError = handleZodError(error);
    statusCode = simplifiedError.statusCode;
    message = simplifiedError.message;
    errorMessages = simplifiedError.errorMessages;
    
    ErrorLogger.error('Zod validation error', {
      error: error.errors,
      simplifiedError,
      requestContext,
    });
  }
  // Handle Custom API Errors
  else if (error instanceof ApiError) {
    errorType = 'ApiError';
    statusCode = error.statusCode;
    message = error.message;
    errorMessages = error.message ? [{ path: '', message: error.message }] : [];
    
    ErrorLogger.error('API error', {
      error: error.message,
      statusCode: error.statusCode,
      requestContext,
    });
  }
  // Handle JWT Errors
  else if (error.name === 'JsonWebTokenError') {
    errorType = 'JWTError';
    statusCode = 401;
    message = 'Invalid token';
    errorMessages = [{ path: '', message: 'Authentication failed' }];
    
    ErrorLogger.error('JWT error', {
      error: error.message,
      requestContext,
    });
  }
  // Handle Token Expired Errors
  else if (error.name === 'TokenExpiredError') {
    errorType = 'TokenExpiredError';
    statusCode = 401;
    message = 'Token expired';
    errorMessages = [{ path: '', message: 'Authentication token has expired' }];
    
    ErrorLogger.error('Token expired error', {
      error: error.message,
      requestContext,
    });
  }
  // Handle Generic Errors
  else if (error instanceof Error) {
    errorType = 'GenericError';
    message = error.message;
    errorMessages = error.message ? [{ path: '', message: error.message }] : [];
    
    ErrorLogger.error('Generic error', {
      error: error.message,
      stack: error.stack,
      requestContext,
    });
  }
  // Handle Unknown Errors
  else {
    errorType = 'UnknownError';
    ErrorLogger.error('Unknown error type', {
      error: error,
      requestContext,
    });
  }

  // Response object
  const errorResponse = {
    success: false,
    statusCode,
    message,
    errorMessages,
    errorType,
    timestamp: new Date().toISOString(),
    path: req.url,
    ...(config.env !== 'production' && { stack: error.stack }),
  };

  // Log summary for monitoring
  ErrorLogger.info('Error response sent', {
    statusCode,
    errorType,
    path: req.url,
    method: req.method,
  });

  res.status(statusCode).json(errorResponse);
};

export default globalErrorHandler;
