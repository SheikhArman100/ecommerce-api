import { ZodError, ZodIssue } from 'zod';
import { IGenericErrorResponse } from '../interfaces/common';
import { IGenericErrorMessages } from '../interfaces/error';


/**
 * handleZodError
 *
 * A utility function to handle errors thrown by Zod validation schema. This function
 * standardizes the error response by mapping Zod issues to a generic error response format.
 * @param error
 * @returns
 */
const handleZodError = (error: ZodError): IGenericErrorResponse => {
  const statusCode = 422;
  const errors: IGenericErrorMessages[] = error.issues.map(
    (issue: ZodIssue) => {
      return {
        path: issue?.path[issue.path.length - 1],
        message: issue?.message,
      };
    },
  );

  return {
    statusCode,
    message: 'Validation error',
    errorMessages: errors,
  };
};

export default handleZodError;
