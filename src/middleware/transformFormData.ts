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
    console.log("Req Body before transform",req.body);           

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
            let value = req.body[key];

            // Try to parse as JSON first (handles JSON strings like flavors array)
            try {
              if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
                value = JSON.parse(value);
              }
            } catch (e) {
              // If JSON parsing fails, keep original value
            }

            // Only process string values for conversion
            if (typeof value === 'string') {
              // Convert string "true"/"false" to boolean
              if (value === "true") {
                value = true;
              } else if (value === "false") {
                value = false;
              } else if (value !== "" && !isNaN(Number(value)) && !isNaN(parseFloat(value)) &&
                         !value.includes('+') && !value.includes('-') && !value.includes(' ') &&
                         value.length <= 2) {
                // Convert numeric strings to numbers (extremely conservative)
                // Only convert very short numeric strings (1-2 digits) for things like displayOrder, quantity
                const numValue = Number(value);
                // Check if it's an integer or float
                if (Number.isInteger(numValue)) {
                  value = numValue;
                } else {
                  value = parseFloat(value);
                }
              }
            }
            // If value is not a string (e.g., object from multer), leave it as-is

            current[part] = value;
          }
        }
      }
    }

    // Convert objects with numeric keys to arrays for simple arrays
    const convertNumericKeysToArray = (obj: any): any => {
      if (typeof obj === 'object' && obj !== null) {
        // Check if object has only numeric keys
        const keys = Object.keys(obj);
        const isNumericArray = keys.length > 0 && keys.every(key => !isNaN(Number(key)));

        if (isNumericArray) {
          // Convert to array
          const arr: any[] = [];
          keys.sort((a, b) => Number(a) - Number(b)).forEach(key => {
            arr[Number(key)] = convertNumericKeysToArray(obj[key]);
          });
          return arr;
        } else {
          // For non-array objects, recursively process but don't convert single values
          const result: any = {};
          for (const key in obj) {
            const value = obj[key];
            // If it's already an array, keep it as array
            if (Array.isArray(value)) {
              result[key] = value;
            } else {
              result[key] = convertNumericKeysToArray(value);
            }
          }
          return result;
        }
      }
      return obj;
    };

    // Apply array conversion
    req.body = convertNumericKeysToArray(result);
    console.log("req body after convertNumericKeysToArray", JSON.stringify(req.body, null, 2));

    // Special handling for removeFlavors - ensure it's always an array
    if (req.body.removeFlavors !== undefined) {
      if (!Array.isArray(req.body.removeFlavors)) {
        req.body.removeFlavors = [req.body.removeFlavors];
      }
    }

    // Special handling for nested image remove arrays
    const ensureNestedArrays = (obj: any): any => {
      if (typeof obj === 'object' && obj !== null) {
        if (Array.isArray(obj)) {
          return obj.map(ensureNestedArrays);
        }

        const result: any = {};
        for (const key in obj) {
          if (key === 'remove' && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
            // Convert remove objects to arrays
            const removeObj = obj[key];
            if (typeof removeObj === 'object' && removeObj !== null) {
              const keys = Object.keys(removeObj);
              const isNumeric = keys.length > 0 && keys.every(k => !isNaN(Number(k)));
              if (isNumeric) {
                result[key] = keys.sort((a, b) => Number(a) - Number(b)).map(k => removeObj[k]);
              } else {
                result[key] = removeObj;
              }
            } else {
              result[key] = removeObj;
            }
          } else {
            result[key] = ensureNestedArrays(obj[key]);
          }
        }
        return result;
      }
      return obj;
    };

    req.body = ensureNestedArrays(req.body);

    // Deep coercion: multipart form-data sends everything as strings. Values that
    // came through JSON.parse (e.g. flavors sent as a JSON string field) skip the
    // per-key coercion above, so walk the tree and convert remaining
    // "true"/"false" strings to booleans. Numeric strings are left untouched
    // because validation schemas intentionally expect them as strings.
    const deepCoerceBooleans = (obj: any): any => {
      if (typeof obj === 'string') {
        if (obj === 'true') return true;
        if (obj === 'false') return false;
        return obj;
      }
      if (Array.isArray(obj)) {
        return obj.map(deepCoerceBooleans);
      }
      if (typeof obj === 'object' && obj !== null) {
        const result: any = {};
        for (const key in obj) {
          result[key] = deepCoerceBooleans(obj[key]);
        }
        return result;
      }
      return obj;
    };

    req.body = deepCoerceBooleans(req.body);

    console.log("req body after nested array fix", JSON.stringify(req.body, null, 2));
    next();
  } catch (error) {
    next(error);
  }
};

export default transformFormData;
