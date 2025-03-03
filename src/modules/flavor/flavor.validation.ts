import { z } from 'zod';

const createFlavorSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .min(3, { message: 'Name must be at least 3 characters long' }),
      color: z
        .string()
        .min(3, { message: 'Color must be at least 3 characters long' }),
    })
    .strict(),
});
const updateFlavorSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .min(3, { message: 'Name must be at least 3 characters long' }),
      color: z
        .string()
        .min(3, { message: 'Color must be at least 3 characters long' }),
    })
    .strict(),
});
export const FlavorValidation = { createFlavorSchema, updateFlavorSchema };
