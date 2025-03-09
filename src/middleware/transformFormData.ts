import { NextFunction, Request, Response } from 'express';
import httpStatus from 'http-status';
import ApiError from '../errors/ApiError';

/**
 * Transforming flat form data into a nested object structure
 * @param req - Express Request object
 * @param res - Express Response object
 * @param next - Express NextFunction
 */
const transformFormData = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if req.body exists and has data
    if (!req.body || Object.keys(req.body).length === 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'No form data found!');
    }

    const result: Record<string, any> = {};

    // Iterate over all keys in req.body
    for (const key in req.body) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        // Split the key by brackets (e.g., "flavors[0][flavorId]" -> ["flavors", "0", "flavorId"])
        const parts = key.split(/\[|\]/).filter(Boolean); // Filter removes empty strings
        let current = result;

        // Build the nested structure
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i];
          const isLastPart = i === parts.length - 1;

          if (!isLastPart) {
            // If part is a number, treat it as an array index
            if (!isNaN(Number(part))) {
              const index = Number(part);
              current[index] = current[index] || {};
              current = current[index];
            } else {
              // Otherwise, treat it as an object property
              current[part] = current[part] || (parts[i + 1] && !isNaN(Number(parts[i + 1])) ? [] : {});
              current = current[part];
            }
          } else {
            // Set the value at the final part
            current[part] = req.body[key];
          }
        }
      }
    }

    // Replace req.body with the nested structure
    req.body = result;
    console.log("Body",req.body);
    next();
  } catch (error) {
    next(error);
  }
};

export default transformFormData;