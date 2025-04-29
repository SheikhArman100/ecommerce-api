import { z } from 'zod';

const createCartSchema = z.object({
  body: z.object({
    productId: z.string().refine(val => !isNaN(Number(val)), {
        message: 'Product id must be a valid number',
      }),
    flavorId: z.string().refine(val => !isNaN(Number(val)), {
        message: 'Flavor id must be a valid number',
      }),
    sizeId: z.string().refine(val => !isNaN(Number(val)), {
        message: 'Size id must be a valid number',
      }),
    quantity: z
      .number({required_error: 'Quantity is required'})
      .int()
      .positive('Quantity must be a positive integer')
  }).strict(),
});
const updateCartItemSchema = z.object({
  body: z.object({
    quantity: z
      .number({required_error: 'Quantity is required'})
      .int()
      .positive('Quantity must be a positive integer')
  }).strict(),
});
export const CartValidation = {createCartSchema,updateCartItemSchema};
