import { prisma } from '../../client';
import {
  IDashboardOverview,
  IDashboardMetrics,
  IRevenueTrend,
  IOrderStatusDistribution,
  ITopProduct,
  IRecentOrder,
  ILowStockItem,
  IDashboardFilters,
} from './dashboard.interface';
import {
  LOW_STOCK_THRESHOLD,
  TOP_PRODUCTS_LIMIT,
  RECENT_ORDERS_LIMIT,
  REVENUE_TREND_MONTHS,
} from './dashboard.constant';

const getDashboardOverview = async (filters: IDashboardFilters = {}): Promise<IDashboardOverview> => {
  // Get date range for filtering
  const { startDate, endDate } = getDateRange(filters);

  // Fetch all data in parallel for better performance
  const [
    metrics,
    revenueTrend,
    orderStatusDistribution,
    topProducts,
    recentOrders,
    lowStockItems,
  ] = await Promise.all([
    getDashboardMetrics(startDate, endDate),
    getRevenueTrend(filters),
    getOrderStatusDistribution(startDate, endDate),
    getTopProducts(startDate, endDate),
    getRecentOrders(),
    getLowStockItems(),
  ]);

  return {
    metrics,
    revenueTrend,
    orderStatusDistribution,
    topProducts,
    recentOrders,
    lowStockItems,
  };
};

const getDashboardMetrics = async (startDate?: Date, endDate?: Date): Promise<IDashboardMetrics> => {
  // Get current period metrics
  const currentMetrics = await getMetricsForPeriod(startDate, endDate);

  // Get previous period metrics for growth calculation
  const previousPeriod = getPreviousPeriod(startDate, endDate);
  const previousMetrics = await getMetricsForPeriod(previousPeriod.startDate, previousPeriod.endDate);

  // Calculate growth percentages
  const revenueGrowth = calculateGrowth(currentMetrics.totalRevenue, previousMetrics.totalRevenue);
  const orderGrowth = calculateGrowth(currentMetrics.totalOrders, previousMetrics.totalOrders);
  const productGrowth = calculateGrowth(currentMetrics.totalProducts, previousMetrics.totalProducts);
  const customerGrowth = calculateGrowth(currentMetrics.totalCustomers, previousMetrics.totalCustomers);

  return {
    ...currentMetrics,
    revenueGrowth,
    orderGrowth,
    productGrowth,
    customerGrowth,
  };
};

const getMetricsForPeriod = async (startDate?: Date, endDate?: Date) => {
  // Total Revenue
  const totalRevenueResult = await prisma.order.aggregate({
    _sum: {
      totalAmount: true,
    },
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // Total Orders
  const totalOrders = await prisma.order.count({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // Total Products (active)
  const totalProducts = await prisma.product.count({
    where: {
      isActive: true,
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // Total Customers
  const totalCustomers = await prisma.user.count({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  return {
    totalRevenue: totalRevenueResult._sum.totalAmount || 0,
    totalOrders,
    totalProducts,
    totalCustomers,
  };
};

const getRevenueTrend = async (filters: IDashboardFilters = {}): Promise<IRevenueTrend[]> => {
  const now = new Date();
  let startDate: Date;
  let periods: string[];
  let periodFormat: string;

  // Determine time period and create all possible periods
  if (filters.period === 'daily') {
    // Show last 24 hours, grouped by hour
    startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    periods = [];
    for (let i = 0; i < 24; i++) {
      const hourDate = new Date(startDate);
      hourDate.setHours(startDate.getHours() + i, 0, 0, 0);
      periods.push(hourDate.toISOString().slice(0, 13) + ':00:00'); // YYYY-MM-DD HH:00:00
    }
    periodFormat = '%Y-%m-%d %H:00:00';
  } else if (filters.period === 'weekly') {
    // Show last 7 days, grouped by day
    startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    periods = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(startDate);
      dayDate.setDate(startDate.getDate() + i);
      periods.push(dayDate.toISOString().slice(0, 10)); // YYYY-MM-DD
    }
    periodFormat = '%Y-%m-%d';
  } else if (filters.period === 'monthly') {
    // Show last 30 days, grouped by day
    startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    periods = [];
    for (let i = 0; i < 30; i++) {
      const dayDate = new Date(startDate);
      dayDate.setDate(startDate.getDate() + i);
      periods.push(dayDate.toISOString().slice(0, 10)); // YYYY-MM-DD
    }
    periodFormat = '%Y-%m-%d';
  } else {
    // Default yearly: Show last 12 months, grouped by month
    startDate = new Date();
    startDate.setMonth(startDate.getMonth() - REVENUE_TREND_MONTHS);
    periods = [];
    for (let i = 0; i < REVENUE_TREND_MONTHS; i++) {
      const monthDate = new Date(startDate);
      monthDate.setMonth(startDate.getMonth() + i);
      periods.push(monthDate.toISOString().slice(0, 7)); // YYYY-MM
    }
    periodFormat = '%Y-%m';
  }

  // Get actual data from database
  const revenueData = await prisma.$queryRaw<
    Array<{
      period: string;
      revenue: number;
      orders: number;
    }>
  >`
    SELECT
      DATE_FORMAT(createdAt, ${periodFormat}) as period,
      SUM(totalAmount) as revenue,
      COUNT(*) as orders
    FROM orders
    WHERE createdAt >= ${startDate}
    GROUP BY DATE_FORMAT(createdAt, ${periodFormat})
    ORDER BY period ASC
  `;

  // Create a map of actual data
  const dataMap = new Map<string, { revenue: number; orders: number }>();
  revenueData.forEach(item => {
    dataMap.set(item.period, {
      revenue: Number(item.revenue),
      orders: Number(item.orders),
    });
  });

  // Fill in all periods with actual data or zeros
  return periods.map(period => {
    const actualData = dataMap.get(period);
    return {
      month: period,
      revenue: actualData ? actualData.revenue : 0,
      orders: actualData ? actualData.orders : 0,
    };
  });
};

const getOrderStatusDistribution = async (startDate?: Date, endDate?: Date): Promise<IOrderStatusDistribution[]> => {
  const statusData = await prisma.order.groupBy({
    by: ['status'],
    _count: {
      status: true,
    },
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const totalOrders = statusData.reduce((sum, item) => sum + item._count.status, 0);

  return statusData.map(item => ({
    status: item.status,
    count: item._count.status,
    percentage: totalOrders > 0 ? Math.round((item._count.status / totalOrders) * 100) : 0,
  }));
};

const getTopProducts = async (startDate?: Date, endDate?: Date): Promise<ITopProduct[]> => {
  // Get top products by revenue within the date range
  const topProductsData = await prisma.orderItem.groupBy({
    by: ['productId'],
    _sum: {
      price: true,
      quantity: true,
    },
    _count: {
      quantity: true,
    },
    where: {
      order: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      product: {
        isActive: true,
      },
    },
    orderBy: {
      _sum: {
        price: 'desc',
      },
    },
    take: TOP_PRODUCTS_LIMIT,
  });

  // Get product details
  const productIds = topProductsData.map(item => item.productId);
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
    },
    select: {
      id: true,
      title: true,
    },
  });

  // Get product images separately
  const productImages = await prisma.file.findMany({
    where: {
      productId: { in: productIds },
      flavorId: { not: null }, // Only product flavor images
    },
    select: {
      id: true,
      productId: true,
      path: true,
      originalName: true,
    },
    orderBy: {
      createdAt: 'asc', // Get oldest image first
    },
  });

  // Group images by productId
  const imageMap = new Map<number, { id: number; path: string; originalName: string; url: string }>();
  productImages.forEach(img => {
    if (img.productId && !imageMap.has(img.productId)) {
      imageMap.set(img.productId, {
        id: img.id,
        path: img.path,
        originalName: img.originalName,
        url: `/file/${img.path}`,
      });
    }
  });

  // Create product map for quick lookup
  const productMap = new Map(products.map(p => [p.id, p]));

  return topProductsData.map(item => {
    const product = productMap.get(item.productId);
    const revenue = Number(item._sum.price) * Number(item._sum.quantity);
    const orders = Number(item._count.quantity);
    const imagePath = imageMap.get(item.productId);

    return {
      id: item.productId,
      title: product?.title || 'Unknown Product',
      revenue,
      orders,
      image: imagePath ? imagePath : undefined,
    };
  });
};

const getRecentOrders = async (): Promise<IRecentOrder[]> => {
  const recentOrdersData = await prisma.order.findMany({
    take: RECENT_ORDERS_LIMIT,
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      user: {
        select: {
          name: true,
        },
      },
    },
  });

  return recentOrdersData.map(order => ({
    id: order.id,
    orderId: `ORD-${order.id.toString().padStart(6, '0')}`,
    customerName: order.user.name,
    amount: order.totalAmount,
    status: order.status,
    date: order.createdAt,
  }));
};

const getLowStockItems = async (): Promise<ILowStockItem[]> => {
  const lowStockData = await prisma.$queryRaw<
    Array<{
      productId: number;
      productName: string;
      currentStock: number;
      categoryName: string;
    }>
  >`
    SELECT
      p.id as productId,
      p.title as productName,
      SUM(pfs.stock) as currentStock,
      c.name as categoryName
    FROM products p
    JOIN categories c ON c.id = p.categoryId
    JOIN product_flavor_sizes pfs ON pfs.productId = p.id
    WHERE p.isActive = true
    GROUP BY p.id, p.title, c.name
    HAVING currentStock <= ${LOW_STOCK_THRESHOLD}
    ORDER BY currentStock ASC
    LIMIT 10
  `;

  return lowStockData.map(item => ({
    productId: item.productId,
    productName: item.productName,
    currentStock: Number(item.currentStock),
    threshold: LOW_STOCK_THRESHOLD,
    category: item.categoryName,
  }));
};

// Helper functions
const getDateRange = (filters: IDashboardFilters) => {
  const now = new Date();
  let startDate: Date | undefined;
  let endDate: Date | undefined = now;

  // Priority 1: Custom date range (startDate & endDate)
  if (filters.startDate && filters.endDate) {
    startDate = new Date(filters.startDate);
    endDate = new Date(filters.endDate);
  }
  // Priority 2: Specific filter types
  else if (filters.filterType) {
    switch (filters.filterType) {
      case 'dateFilter':
        if (filters.date) {
          startDate = new Date(filters.date);
          endDate = new Date(filters.date);
          endDate.setHours(23, 59, 59, 999); // End of day
        }
        break;

      case 'weekFilter':
        if (filters.week && filters.year) {
          // week format: YYYY-WW (e.g., 2024-01 for week 1 of 2024)
          const [year, week] = filters.week.split('-').map(Number);
          startDate = getStartOfWeek(year, week);
          endDate = getEndOfWeek(year, week);
        }
        break;

      case 'monthFilter':
        if (filters.month && filters.year) {
          // month format: YYYY-MM (e.g., 2024-01)
          const [year, month] = filters.month.split('-').map(Number);
          startDate = new Date(year, month - 1, 1); // First day of month
          endDate = new Date(year, month, 0, 23, 59, 59, 999); // Last day of month
        }
        break;

      case 'yearFilter':
        if (filters.year) {
          const year = parseInt(filters.year);
          startDate = new Date(year, 0, 1); // January 1st
          endDate = new Date(year, 11, 31, 23, 59, 59, 999); // December 31st
        }
        break;
    }
  }
  // Priority 3: General period filter
  else if (filters.period) {
    startDate = new Date();
    switch (filters.period) {
      case 'daily':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'weekly':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        startDate.setDate(now.getDate() - 30);
        break;
      case 'yearly':
      default:
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }
  }
  // Priority 4: Default to yearly
  else {
    startDate = new Date();
    startDate.setFullYear(now.getFullYear() - 1);
  }

  return { startDate, endDate };
};

// Helper function to get start of week (Monday)
const getStartOfWeek = (year: number, week: number): Date => {
  const januaryFirst = new Date(year, 0, 1);
  const daysToFirstMonday = (8 - januaryFirst.getDay()) % 7;
  const firstMonday = new Date(year, 0, 1 + daysToFirstMonday);

  // Calculate the start of the requested week
  const weekStart = new Date(firstMonday);
  weekStart.setDate(firstMonday.getDate() + (week - 1) * 7);

  return weekStart;
};

// Helper function to get end of week (Sunday)
const getEndOfWeek = (year: number, week: number): Date => {
  const weekStart = getStartOfWeek(year, week);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return weekEnd;
};

const getPreviousPeriod = (startDate?: Date, endDate?: Date) => {
  if (!startDate || !endDate) return { startDate: undefined, endDate: undefined };

  const periodLength = endDate.getTime() - startDate.getTime();
  const previousEndDate = new Date(startDate.getTime() - 1);
  const previousStartDate = new Date(previousEndDate.getTime() - periodLength);

  return { startDate: previousStartDate, endDate: previousEndDate };
};

const calculateGrowth = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
};

export const DashboardService = {
  getDashboardOverview,
  getDashboardMetrics,
  getRevenueTrend,
  getOrderStatusDistribution,
  getTopProducts,
  getRecentOrders,
  getLowStockItems,
};
