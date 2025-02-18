import { Prisma } from '@prisma/client';
import { IGenericErrorMessages } from '../interfaces/error';
import { IGenericErrorResponse } from '../interfaces/common';

/**
 * Handles Prisma validation errors and formats them into a standardized response.
 * @param err - PrismaClientKnownRequestError object
 * @returns A structured error response with status code, message, and error details
 */
const handleValidationError = (
  err: Prisma.PrismaClientValidationError,
): IGenericErrorResponse => {
  const errors: IGenericErrorMessages[] = [];

  if (err.message) {
    errors.push({
      path: 'Validation',
      message: err.message,
    });
  }

  const statusCode = 422;

  return {
    statusCode,
    message: 'Validation error',
    errorMessages: errors,
  };
};

export default handleValidationError;
