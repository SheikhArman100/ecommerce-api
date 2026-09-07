import { z } from 'zod';

const createCouponSchema = z.object({
  body: z.object({
    code: z.string({
      error: 'Coupon code is required',
    }).transform((val) => val.trim().toUpperCase()),
    description: z.string({
      error: 'Description is required',
    }).min(1, 'Description cannot be empty'),
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
    isFeatured: z.boolean().optional(),
    targetType: z.enum(['ALL', 'NEW_USERS', 'INACTIVE_USERS', 'SPECIFIC_USERS']).optional(),
    inactiveDays: z.number().int().min(1).optional(),
    targetUserIds: z.array(z.number().int()).optional(),
    usageLimit: z.number().optional(),
    limitPerUser: z.number().optional(),
  }),
});

const updateCouponSchema = z.object({
  body: z.object({
    code: z.string().transform((val) => val.trim().toUpperCase()).optional(),
    // Cannot blank the description — matches the create schema's requirement
    description: z.string().min(1, 'Description cannot be empty').optional(),
    discountType: z.enum(['FIXED', 'PERCENTAGE']).optional(),
    discountValue: z.number().optional(),
    minOrderAmount: z.number().optional(),
    maxDiscountAmount: z.number().optional(),
    expiryDate: z.string().optional(),
    isActive: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    targetType: z.enum(['ALL', 'NEW_USERS', 'INACTIVE_USERS', 'SPECIFIC_USERS']).optional(),
    inactiveDays: z.number().int().min(1).optional(),
    targetUserIds: z.array(z.number().int()).optional(),
    // Treat 0 as "not set" — unlimited, same as null (avoids two encodings
    // of "unlimited" in the data)
    usageLimit: z.number().int().min(0).transform((v) => (v === 0 ? undefined : v)).optional(),
    limitPerUser: z.number().int().min(0).transform((v) => (v === 0 ? undefined : v)).optional(),
  }),
});

export const CouponValidation = {
  createCouponSchema,
  updateCouponSchema,
};
