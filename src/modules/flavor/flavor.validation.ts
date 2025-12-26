import { z } from 'zod';

const createFlavorSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .min(3, { message: 'Name must be at least 3 characters long' }),
      color: z
        .string()
        .regex(
          /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$|^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$|^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0|1|0?\.\d+)\s*\)$|^hsl\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*\)$|^hsla\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*,\s*(0|1|0?\.\d+)\s*\)$|^[a-zA-Z]+$/,
          {
            message: 'Color must be a valid RGB color format (hex: #FF0000, rgb: rgb(255,0,0), rgba: rgba(255,0,0,1), hsl: hsl(0,100%,50%), hsla: hsla(0,100%,50%,1), or named color: red)'
          }
        ),
      description: z
        .string()
        .max(200, { message: 'Description must be at most 200 characters long' })
        .optional(),
      isActive: z
        .boolean()
        .optional(),
    })
    .strict(),
});
const updateFlavorSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .min(3, { message: 'Name must be at least 3 characters long' })
        .optional(),
      color: z
        .string()
        .regex(
          /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$|^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$|^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0|1|0?\.\d+)\s*\)$|^hsl\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*\)$|^hsla\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*,\s*(0|1|0?\.\d+)\s*\)$|^[a-zA-Z]+$/,
          {
            message: 'Color must be a valid RGB color format (hex: #FF0000, rgb: rgb(255,0,0), rgba: rgba(255,0,0,1), hsl: hsl(0,100%,50%), hsla: hsla(0,100%,50%,1), or named color: red)'
          }
        )
        .optional(),
      description: z
        .string()
        .max(200, { message: 'Description must be at most 200 characters long' })
        .optional(),
      isActive: z
        .boolean()
        .optional(),
    })
    .strict()
    .refine(
      (data) => data.name !== undefined || data.color !== undefined || data.description !== undefined || data.isActive !== undefined,
      { message: 'At least one field is required for update' }
    ),
});
export const FlavorValidation = { createFlavorSchema, updateFlavorSchema };
