import { z } from 'zod';

export const createWishlistSchema = z.object({
  body: z.object({
    productId: z.string().refine(val => !isNaN(Number(val)), {
      message: 'Product id must be a valid number',
    }),
  }),
});

export const updateWishlistSchema = z.object({
  body: z.object({
    // For wishlist, we might allow updating notes or priority in the future
    // Currently, update just refreshes the timestamp
  }).optional(),
});

export const WishlistValidation = {
  createWishlistSchema,
  updateWishlistSchema
};
