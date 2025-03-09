import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters'),
    description: z
      .string()
      .min(10, 'Description must be at least 10 characters'),
    categoryId: z.string().refine(val => !isNaN(Number(val)), {
      message: 'Category ID must be a valid number',
    }),
    flavors: z
      .array(
        z.object({
          flavorId: z.string().refine(val => !isNaN(Number(val)), {
            message: 'Flavor ID must be a valid number',
          }),
          sizes: z
            .array(
              z.object({
                sizeId: z.string().refine(val => !isNaN(Number(val)), {
                  message: 'Size ID must be a valid number',
                }),
                stock: z
                  .string()
                  .refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
                    message: 'Stock must be a non-negative number',
                  }),
                price: z
                  .string()
                  .refine(val => !isNaN(Number(val)) && Number(val) > 0, {
                    message: 'Price must be a positive number',
                  }),
              }),
            )
            .nonempty('At least one size is required'),
        }),
      )
      .nonempty('At least one flavor is required'),
  }),
});

export const ProductValidation = {
  createProductSchema,
};
