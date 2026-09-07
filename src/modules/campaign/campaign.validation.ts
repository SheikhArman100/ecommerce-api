import { z } from 'zod';

const createCampaignZodSchema = z.object({
  body: z.object({
    title: z.string({ error: 'Title is required' }),
    slug: z.string({ error: 'Slug is required' }),
    description: z.string().optional(),
    bannerImage: z.string().optional().nullable(),
    discountType: z.enum(['PERCENTAGE', 'FIXED']).optional().default('PERCENTAGE'),
    discountDefault: z.number().min(0).default(0),
    startDate: z.string({ error: 'Start date is required' }),
    endDate: z.string({ error: 'End date is required' }),
    // NOTE: no isActive — campaigns are ALWAYS created inactive.
    // Activation happens exclusively through the update endpoint.
  }),
}).refine(
  (data) => new Date(data.body.endDate) > new Date(data.body.startDate),
  { message: 'End date must be after the start date', path: ['body', 'endDate'] }
);

const updateCampaignZodSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    slug: z.string().optional(),
    description: z.string().optional(),
    bannerImage: z.string().optional(),
    discountType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
    discountDefault: z.number().min(0).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

const addProductToCampaignZodSchema = z.object({
  body: z.object({
    productId: z.number({ error: 'Product ID is required' }),
    customDiscountPercentage: z.number().min(0).max(100).optional(),
  }),
});

export const CampaignValidation = {
  createCampaignZodSchema,
  updateCampaignZodSchema,
  addProductToCampaignZodSchema,
};
