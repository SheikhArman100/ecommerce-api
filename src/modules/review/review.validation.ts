import { z } from 'zod';

const createReviewSchema = z.object({
  body: z
    .object({
      rating: z
        .number()
        .int()
        .min(1, { message: 'Rating must be at least 1' })
        .max(5, { message: 'Rating must be at most 5' }),
      comment: z
        .string()
        .min(10, { message: 'Comment must be at least 10 characters long' })
        .max(500, { message: 'Comment must be at most 500 characters long' }),
      orderId: z
        .number()
        .int()
        .positive({ message: 'Order ID must be a positive integer' }),
      productId: z
        .number()
        .int()
        .positive({ message: 'Product ID must be a positive integer' }),
    })
    .strict(),
});

const updateReviewSchema = z.object({
  body: z
    .object({
      rating: z
        .number()
        .int()
        .min(1, { message: 'Rating must be at least 1' })
        .max(5, { message: 'Rating must be at most 5' })
        .optional(),
      comment: z
        .string()
        .min(10, { message: 'Comment must be at least 10 characters long' })
        .max(500, { message: 'Comment must be at most 500 characters long' })
        .optional(),
      isHide: z
        .boolean()
        .optional(), // Only admin can update this
    })
    .strict()
    .refine(
      (data) => data.rating !== undefined || data.comment !== undefined || data.isHide !== undefined,
      { message: 'At least one field is required for update' }
    ),
});

export const ReviewValidation = {
  createReviewSchema,
  updateReviewSchema,
};
