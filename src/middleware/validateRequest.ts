import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

/**
 * validate req using given zod schema.
 *
 * @param schema
 * @returns
 */
const validateRequest =
  (schema: z.ZodSchema) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
        cookies: req.cookies,
      });
      return next();
    } catch (error) {
      next(error);
    }
  };

export default validateRequest;
