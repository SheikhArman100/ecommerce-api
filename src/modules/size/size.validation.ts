import { z } from "zod";

const createSizeSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1, { message: 'Name must be at least 3 characters long' }),
    description: z
      .string()
      .max(200, { message: 'Description must be at most 200 characters long' })
      .optional(),
    isActive: z
      .boolean()
      .optional(),
  }).strict(),
});
const updateSizeSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1, { message: 'Name must be at least 3 characters long' })
      .optional(),
    description: z
      .string()
      .max(200, { message: 'Description must be at most 200 characters long' })
      .optional(),
    isActive: z
      .boolean()
      .optional(),
  }).strict()
  .refine(
    (data) => data.name !== undefined || data.description !== undefined || data.isActive !== undefined,
    { message: 'At least one field is required for update' }
  ),
});
export const SizeValidation = { createSizeSchema ,updateSizeSchema};
