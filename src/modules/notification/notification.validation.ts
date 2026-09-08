import { z } from 'zod';

const notificationTypeValues = [
  'ORDER',
  'PAYMENT',
  'STOCK',
  'REVIEW',
  'CAMPAIGN',
  'COUPON',
  'SYSTEM',
] as const;

const createNotificationSchema = z.object({
  body: z.object({
    title: z.string({ error: 'Title is required' }).min(1),
    body: z.string({ error: 'Message body is required' }).min(1),
    type: z.enum(notificationTypeValues).optional().default('SYSTEM'),
    link: z.string().optional().nullable(),
    image: z.string().optional().nullable(),
  }),
});

export const NotificationValidation = {
  createNotificationSchema,
};