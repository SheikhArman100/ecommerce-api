import { z } from 'zod';
import { OrderStatus } from '../../generated/enums';

const createOrderSchema = z.object({
  body: z.object({
    // Orders are created from cart, no additional payload needed
  }).strict()
});

const updateOrderStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(OrderStatus)
  }).strict()
});

const getOrdersSchema = z.object({
  query: z.object({
    searchTerm: z.string().optional(),
    userId: z.string().optional(),
    status: z.nativeEnum(OrderStatus).optional(),
    minAmount: z.string().optional(),
    maxAmount: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    productId: z.string().optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional()
  }).strict()
});

export const OrderValidation = {
  createOrderSchema,
  updateOrderStatusSchema,
  getOrdersSchema
};
