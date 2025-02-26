import { z } from "zod";

const createCategorySchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(3, { message: 'Name must be at least 3 characters long' }),
  }).strict(),
});
export const CategoryValidation = { createCategorySchema };
