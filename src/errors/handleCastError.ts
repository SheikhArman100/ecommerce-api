import { Prisma } from '@prisma/client';
import { IGenericErrorMessages } from '../interfaces/error';
import { IGenericErrorResponse } from '../interfaces/common';

/**
 * Handles Prisma-specific errors, such as invalid IDs or constraint violations,
 * and formats them into a standardized response.
 * @param error - PrismaClientKnownRequestError object
 * @returns A structured error response with status code, message, and error details
 */
const handleCastError = (error: Prisma.PrismaClientKnownRequestError): IGenericErrorResponse => {
  let errors: IGenericErrorMessages[] = [];

  switch (error.code) {
    case 'P2002': // Unique constraint failed
      errors = [
        {
          path: error.meta?.target ? error.meta.target.toString() : 'Unknown field',
          message: 'Unique constraint failed on the field',
        },
      ];
      break;

    case 'P2025': // Record not found
      errors = [
        {
          path: 'Record',
          message: 'Record not found',
        },
      ];
      break;

    case 'P2003': // Foreign key constraint failed
      errors = [
        {
          path: 'Foreign key',
          message: 'Foreign key constraint failed',
        },
      ];
      break;

    default:
      errors = [
        {
          path: 'Unknown',
          message: error.message,
        },
      ];
      break;
  }

  return {
    statusCode: 400,
    message: 'Prisma error',
    errorMessages: errors,
  };
};

export default handleCastError;
