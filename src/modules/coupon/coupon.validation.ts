import { z } from 'zod';

const createCouponSchema = z.object({
  body: z.object({
    code: z.string({
      error: 'Coupon code is required',
    }),
    discountType: z.enum(['FIXED', 'PERCENTAGE'], {
      error: 'Discount type is required (FIXED or PERCENTAGE)',
    }),
    discountValue: z.number({
      error: 'Discount value is required',
    }),
    minOrderAmount: z.number().optional(),
    maxDiscountAmount: z.number().optional(),
    expiryDate: z.string({
      error: 'Expiry date is required',
    }),
    isActive: z.boolean().optional(),
    usageLimit: z.number().optional(),
  }),
});

const updateCouponSchema = z.object({
  body: z.object({
    code: z.string().optional(),
    discountType: z.enum(['FIXED', 'PERCENTAGE']).optional(),
    discountValue: z.number().optional(),
    minOrderAmount: z.number().optional(),
    maxDiscountAmount: z.number().optional(),
    expiryDate: z.string().optional(),
    isActive: z.boolean().optional(),
    usageLimit: z.number().optional(),
  }),
});

export const CouponValidation = {
  createCouponSchema,
  updateCouponSchema,
};
