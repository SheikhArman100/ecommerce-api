import { z } from 'zod';

const getDashboardOverviewSchema = z.object({
  query: z.object({
    period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
    filterType: z.enum(['dateFilter', 'weekFilter', 'monthFilter', 'yearFilter']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    year: z.string().optional(),
    month: z.string().optional(),
    week: z.string().optional(),
    date: z.string().optional(),
  }),
});

const getSalesAnalyticsSchema = z.object({
  query: z.object({
    period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
    filterType: z.enum(['dateFilter', 'weekFilter', 'monthFilter', 'yearFilter']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    year: z.string().optional(),
    month: z.string().optional(),
    week: z.string().optional(),
    date: z.string().optional(),
  }),
});

const getProductPerformanceSchema = z.object({
  query: z.object({
    period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
    filterType: z.enum(['dateFilter', 'weekFilter', 'monthFilter', 'yearFilter']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    year: z.string().optional(),
    month: z.string().optional(),
    week: z.string().optional(),
    date: z.string().optional(),
  }),
});

const getCustomerAnalyticsSchema = z.object({
  query: z.object({
    period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
    filterType: z.enum(['dateFilter', 'weekFilter', 'monthFilter', 'yearFilter']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    year: z.string().optional(),
    month: z.string().optional(),
    week: z.string().optional(),
    date: z.string().optional(),
  }),
});

export const DashboardValidation = {
  getDashboardOverviewSchema,
  getSalesAnalyticsSchema,
  getProductPerformanceSchema,
  getCustomerAnalyticsSchema,
};
