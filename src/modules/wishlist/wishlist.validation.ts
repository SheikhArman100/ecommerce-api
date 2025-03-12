import { z } from 'zod';

export const createWishlistSchema = z.object({
  body: z.object({
    productId: z.string().refine(val => !isNaN(Number(val)), {
      message: 'Product id must be a valid number',
    }),
  }),
});

export const WishlistValidation = {createWishlistSchema};
