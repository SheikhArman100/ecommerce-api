import { z } from "zod";

const createCategorySchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(3, { message: 'Name must be at least 3 characters long' }),
    slug: z
      .string()
      .min(1, { message: 'Slug is required' }),
    description: z
      .string()
      .min(5, { message: 'Description must be at least 5 characters long' })
      .max(500, { message: 'Description must be at most 500 characters long' }),
    isActive: z
      .boolean()
      .optional(),
    displayOrder: z
      .number()
      .int()
      .min(0, { message: 'Display order must be 0 or greater' }),
  }).strict(),
});

const updateCategorySchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(3, { message: 'Name must be at least 3 characters long' })
      .optional(),
    slug: z
      .string()
      .optional(),
    description: z
      .string()
      .max(500, { message: 'Description must be at most 500 characters long' })
      .optional(),
    isActive: z
      .boolean()
      .optional(),
    displayOrder: z
      .number()
      .int()
      .min(0)
      .optional(),
  }).strict(),
});
export const CategoryValidation = { createCategorySchema ,updateCategorySchema};
