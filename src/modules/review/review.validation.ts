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
      isHidden: z
        .boolean()
        .optional(), // Only admin can update this
      adminNote: z
        .string()
        .max(500, { message: 'Admin note must be at most 500 characters long' })
        .optional(), // Only admin can update this
    })
    .strict()
    .refine(
      (data) => data.rating !== undefined || data.comment !== undefined || data.isHidden !== undefined || data.adminNote !== undefined,
      { message: 'At least one field is required for update' }
    ),
});

export const ReviewValidation = {
  createReviewSchema,
  updateReviewSchema,
};
