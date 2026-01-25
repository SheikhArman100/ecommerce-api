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
  ISalesAnalytics,
  IHourlySales,
  ICategoryPerformance,
  IProductVariant,
  ICategoryRevenueTrend,
  IPeakHour,
  IProductPerformance,
  IProductRanking,
  IProductTrend,
  ICategoryProductAnalysis,
  IProductStockAnalysis,
  IProductReviewAnalytics,
  IProductProfitability,
  IProductLifecycle,
  IProductConversion,
  ICustomerAnalytics,
  ICustomerDemographics,
  ICustomerLifetimeValue,
  IRepeatPurchaseAnalysis,
  ICustomerRetention,
  ICohortData,
  ICustomerSegment,
  ICustomerAcquisition,
  ICustomerTrend,
  ICustomerSatisfaction,
  ISatisfactionTrend,
  ICustomerBehavior,
} from './dashboard.interface';
import {
  LOW_STOCK_THRESHOLD,
  TOP_PRODUCTS_LIMIT,
  RECENT_ORDERS_LIMIT,
  REVENUE_TREND_MONTHS,
} from './dashboard.constant';

const getCategoryRevenueTrend = async (startDate?: Date, endDate?: Date): Promise<ICategoryRevenueTrend[]> => {
  // Use provided date range, or default to last 12 months if not specified
  const effectiveStartDate = startDate || new Date(new Date().setMonth(new Date().getMonth() - 12));
  const effectiveEndDate = endDate || new Date();

  const categoryData = await prisma.$queryRaw<
    Array<{
      categoryId: number;
      categoryName: string;
      month: string;
      revenue: number;
      orders: number;
    }>
  >`
    SELECT
      c.id as categoryId,
      c.name as categoryName,
      DATE_FORMAT(o.createdAt, '%Y-%m') as month,
      SUM(oi.price * oi.quantity) as revenue,
      SUM(oi.quantity) as orders
    FROM categories c
    JOIN products p ON p.categoryId = c.id
    JOIN order_items oi ON oi.productId = p.id
    JOIN orders o ON o.id = oi.orderId
    WHERE o.createdAt >= ${effectiveStartDate} AND o.createdAt <= ${effectiveEndDate}
    GROUP BY c.id, c.name, DATE_FORMAT(o.createdAt, '%Y-%m')
    ORDER BY c.id, month ASC
  `;

  // Group by category
  const categoryMap = new Map<number, {
    categoryId: number;
    categoryName: string;
    monthlyData: Map<string, { revenue: number; orders: number; }>;
  }>();

  categoryData.forEach(item => {
    const categoryId = item.categoryId;
    const month = item.month;
    const revenue = Number(item.revenue);
    const orders = Number(item.orders);

    if (!categoryMap.has(categoryId)) {
      categoryMap.set(categoryId, {
        categoryId,
        categoryName: item.categoryName,
        monthlyData: new Map(),
      });
    }

    categoryMap.get(categoryId)!.monthlyData.set(month, { revenue, orders });
  });

  // Convert to array and calculate trends
  const result: ICategoryRevenueTrend[] = [];

  categoryMap.forEach(category => {
    const monthlyData: Array<{
      month: string;
      revenue: number;
      orders: number;
      growth: number;
    }> = [];

    const months = Array.from(category.monthlyData.keys()).sort();

    months.forEach((month, index) => {
      const data = category.monthlyData.get(month)!;
      let growth = 0;

      if (index > 0) {
        const prevMonth = months[index - 1];
        const prevData = category.monthlyData.get(prevMonth);
        if (prevData && prevData.revenue > 0) {
          growth = Number((((data.revenue - prevData.revenue) / prevData.revenue) * 100).toFixed(1));
        }
      }

      monthlyData.push({
        month,
        revenue: data.revenue,
        orders: data.orders,
        growth,
      });
    });

    // Calculate overall metrics
    const totalRevenue = monthlyData.reduce((sum, m) => sum + m.revenue, 0);
    const totalOrders = monthlyData.reduce((sum, m) => sum + m.orders, 0);
    const averageMonthlyRevenue = monthlyData.length > 0 ? Number((totalRevenue / monthlyData.length).toFixed(2)) : 0;

    // Determine trend
    const recentGrowth = monthlyData.slice(-3).reduce((sum, m) => sum + m.growth, 0) / 3;
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (recentGrowth > 5) trend = 'increasing';
    else if (recentGrowth < -5) trend = 'decreasing';

    result.push({
      categoryId: category.categoryId,
      categoryName: category.categoryName,
      monthlyData,
      totalRevenue,
      totalOrders,
      averageMonthlyRevenue,
      trend,
      growthRate: recentGrowth,
    });
  });

  // Sort by total revenue and return top 5 categories
  return result
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5);
};

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

// Sales Analytics Methods
const getSalesAnalytics = async (filters: IDashboardFilters = {}): Promise<ISalesAnalytics> => {
  // Get date range for filtering
  const { startDate, endDate } = getDateRange(filters);

  // Fetch all 8 metrics in parallel for better performance
  const [
    averageOrderValue,
    salesVelocity,
    hourlyDistribution,
    categoryPerformance,
    topVariants,
    categoryRevenueTrend,
    growthRate,
    peakHours,
  ] = await Promise.all([
    getAverageOrderValue(startDate, endDate),
    getSalesVelocity(startDate, endDate),
    getHourlySalesDistribution(startDate, endDate),
    getCategoryPerformance(startDate, endDate),
    getTopProductVariants(startDate, endDate),
    getCategoryRevenueTrend(startDate, endDate),
    getSalesGrowthRate(startDate, endDate),
    getPeakSalesHours(startDate, endDate),
  ]);

  return {
    averageOrderValue,
    salesVelocity,
    hourlyDistribution,
    categoryPerformance,
    topVariants,
    categoryRevenueTrend,
    growthRate,
    peakHours,
  };
};

const getAverageOrderValue = async (startDate?: Date, endDate?: Date): Promise<number> => {
  const result = await prisma.order.aggregate({
    _avg: {
      totalAmount: true,
    },
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  return Number(result._avg.totalAmount) || 0;
};

const getSalesVelocity = async (startDate?: Date, endDate?: Date): Promise<number> => {
  if (!startDate || !endDate) return 0;

  const orderCount = await prisma.order.count({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const daysDiff = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  return Number((orderCount / daysDiff).toFixed(2));
};

const getHourlySalesDistribution = async (startDate?: Date, endDate?: Date): Promise<IHourlySales[]> => {
  const hourlyData = await prisma.$queryRaw<
    Array<{
      hour: number;
      revenue: number;
      orders: number;
    }>
  >`
    SELECT
      HOUR(createdAt) as hour,
      SUM(totalAmount) as revenue,
      COUNT(*) as orders
    FROM orders
    WHERE createdAt >= ${startDate} AND createdAt <= ${endDate}
    GROUP BY HOUR(createdAt)
    ORDER BY hour ASC
  `;

  // Create array for all 24 hours with default values
  const hourlySales: IHourlySales[] = [];
  for (let hour = 0; hour < 24; hour++) {
    const data = hourlyData.find(item => item.hour === hour);
    hourlySales.push({
      hour,
      revenue: data ? Number(data.revenue) : 0,
      orders: data ? Number(data.orders) : 0,
    });
  }

  return hourlySales;
};

const getCategoryPerformance = async (startDate?: Date, endDate?: Date): Promise<ICategoryPerformance[]> => {
  const categoryData = await prisma.orderItem.groupBy({
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
        categoryId: {
          not: null,
        },
      },
    },
  });

  // Get product and category details
  const productIds = categoryData.map(item => item.productId);
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Group by category
  const categoryMap = new Map<number, { revenue: number; orders: number; name: string }>();

  categoryData.forEach(item => {
    const product = products.find(p => p.id === item.productId);
    if (product?.category) {
      const categoryId = product.category.id;
      const revenue = Number(item._sum.price) * Number(item._sum.quantity);
      const orders = Number(item._count.quantity);

      const existing = categoryMap.get(categoryId);
      if (existing) {
        existing.revenue += revenue;
        existing.orders += orders;
      } else {
        categoryMap.set(categoryId, {
          revenue,
          orders,
          name: product.category.name,
        });
      }
    }
  });

  const totalRevenue = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.revenue, 0);

  return Array.from(categoryMap.entries()).map(([categoryId, data]) => ({
    categoryId,
    categoryName: data.name,
    revenue: data.revenue,
    orders: data.orders,
    percentage: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 100) : 0,
  }));
};

const getTopProductVariants = async (startDate?: Date, endDate?: Date): Promise<IProductVariant[]> => {
  const variantData = await prisma.orderItem.groupBy({
    by: ['productId', 'flavorId', 'sizeId'],
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
    },
    orderBy: {
      _sum: {
        price: 'desc',
      },
    },
    take: 10,
  });

  // Get product, flavor, and size details
  const productIds = [...new Set(variantData.map(item => item.productId))];
  const flavorIds = [...new Set(variantData.map(item => item.flavorId))];
  const sizeIds = [...new Set(variantData.map(item => item.sizeId).filter(id => id !== null))];

  const [products, flavors, sizes] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, title: true },
    }),
    prisma.flavor.findMany({
      where: { id: { in: flavorIds } },
      select: { id: true, name: true },
    }),
    prisma.size.findMany({
      where: { id: { in: sizeIds as number[] } },
      select: { id: true, name: true },
    }),
  ]);

  // Create lookup maps
  const productMap = new Map(products.map(p => [p.id, p.title]));
  const flavorMap = new Map(flavors.map(f => [f.id, f.name]));
  const sizeMap = new Map(sizes.map(s => [s.id, s.name]));

  return variantData.map(item => {
    const productName = productMap.get(item.productId) || 'Unknown Product';
    const flavorName = flavorMap.get(item.flavorId) || 'Default';
    const sizeName = item.sizeId ? (sizeMap.get(item.sizeId) || 'Default') : 'N/A';
    const variant = `${flavorName}${item.sizeId ? ` - ${sizeName}` : ''}`;

    return {
      productId: item.productId,
      productName,
      variant,
      revenue: Number(item._sum.price) * Number(item._sum.quantity),
      orders: Number(item._count.quantity),
    };
  });
};

const getSalesGrowthRate = async (startDate?: Date, endDate?: Date): Promise<number> => {
  if (!startDate || !endDate) return 0;

  // Current period metrics
  const currentRevenue = await prisma.order.aggregate({
    _sum: { totalAmount: true },
    where: {
      createdAt: { gte: startDate, lte: endDate },
    },
  });

  // Previous period (same length)
  const periodLength = endDate.getTime() - startDate.getTime();
  const previousEndDate = new Date(startDate.getTime() - 1);
  const previousStartDate = new Date(previousEndDate.getTime() - periodLength);

  const previousRevenue = await prisma.order.aggregate({
    _sum: { totalAmount: true },
    where: {
      createdAt: { gte: previousStartDate, lte: previousEndDate },
    },
  });

  const current = Number(currentRevenue._sum.totalAmount) || 0;
  const previous = Number(previousRevenue._sum.totalAmount) || 0;

  return calculateGrowth(current, previous);
};

const getPeakSalesHours = async (startDate?: Date, endDate?: Date): Promise<IPeakHour[]> => {
  const hourlyData = await getHourlySalesDistribution(startDate, endDate);

  // Sort by revenue and take top 3
  return hourlyData
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 3)
    .map(item => ({
      hour: item.hour,
      revenue: item.revenue,
      orders: item.orders,
    }));
};

const getProductPerformance = async (filters: IDashboardFilters = {}): Promise<IProductPerformance> => {
  // Get date range for filtering
  const { startDate, endDate } = getDateRange(filters);

  // Fetch all 8 metrics in parallel for better performance
  const [
    performanceRankings,
    productTrends,
    categoryAnalysis,
    stockAnalysis,
    reviewAnalytics,
    profitabilityMetrics,
    lifecycleAnalysis,
    conversionRates,
  ] = await Promise.all([
    getPerformanceRankings(startDate, endDate),
    getProductTrends(startDate, endDate),
    getCategoryAnalysis(startDate, endDate),
    getStockAnalysis(),
    getReviewAnalytics(),
    getProfitabilityMetrics(startDate, endDate),
    getLifecycleAnalysis(),
    getConversionRates(startDate, endDate),
  ]);

  return {
    performanceRankings,
    productTrends,
    categoryAnalysis,
    stockAnalysis,
    reviewAnalytics,
    profitabilityMetrics,
    lifecycleAnalysis,
    conversionRates,
  };
};

const getPerformanceRankings = async (startDate?: Date, endDate?: Date): Promise<IProductRanking[]> => {
  const rankingData = await prisma.orderItem.groupBy({
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
    take: 20,
  });

  // Get product and category details
  const productIds = rankingData.map(item => item.productId);
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
    },
    include: {
      category: {
        select: {
          name: true,
        },
      },
    },
  });

  const productMap = new Map(products.map(p => [p.id, { title: p.title, category: p.category?.name || 'Uncategorized' }]));

  return rankingData.map((item, index) => {
    const product = productMap.get(item.productId);
    return {
      productId: item.productId,
      productName: product?.title || 'Unknown Product',
      revenue: Number(item._sum.price) * Number(item._sum.quantity),
      orders: Number(item._count.quantity),
      ranking: index + 1,
      category: product?.category || 'Uncategorized',
    };
  });
};

const getProductTrends = async (startDate?: Date, endDate?: Date): Promise<IProductTrend[]> => {
  if (!startDate || !endDate) return [];

  // Current period
  const currentData = await prisma.orderItem.groupBy({
    by: ['productId'],
    _sum: {
      price: true,
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
  });

  // Previous period (same length)
  const periodLength = endDate.getTime() - startDate.getTime();
  const previousEndDate = new Date(startDate.getTime() - 1);
  const previousStartDate = new Date(previousEndDate.getTime() - periodLength);

  const previousData = await prisma.orderItem.groupBy({
    by: ['productId'],
    _sum: {
      price: true,
      quantity: true,
    },
    where: {
      order: {
        createdAt: {
          gte: previousStartDate,
          lte: previousEndDate,
        },
      },
      product: {
        isActive: true,
      },
    },
  });

  // Get product details
  const productIds = [...new Set([...currentData.map(d => d.productId), ...previousData.map(d => d.productId)])];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, title: true },
  });

  const productMap = new Map(products.map(p => [p.id, p.title]));

  // Create current and previous maps
  const currentMap = new Map(currentData.map(item => [
    item.productId,
    {
      revenue: Number(item._sum.price) * Number(item._sum.quantity),
      orders: Number(item._sum.quantity),
    }
  ]));

  const previousMap = new Map(previousData.map(item => [
    item.productId,
    {
      revenue: Number(item._sum.price) * Number(item._sum.quantity),
      orders: Number(item._sum.quantity),
    }
  ]));

  return productIds.slice(0, 10).map(productId => {
    const current = currentMap.get(productId) || { revenue: 0, orders: 0 };
    const previous = previousMap.get(productId) || { revenue: 0, orders: 0 };
    const growthRate = calculateGrowth(current.revenue, previous.revenue);

    return {
      productId,
      productName: productMap.get(productId) || 'Unknown Product',
      currentPeriod: current,
      previousPeriod: previous,
      growthRate,
    };
  });
};

const getCategoryAnalysis = async (startDate?: Date, endDate?: Date): Promise<ICategoryProductAnalysis[]> => {
  // Get all categories
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  // Get products per category
  const categoryProducts = await prisma.product.findMany({
    where: {
      isActive: true,
      categoryId: { not: null },
    },
    include: {
      category: { select: { id: true } },
    },
  });

  // Get sales data for each category
  const categorySalesData = await prisma.orderItem.groupBy({
    by: ['productId'],
    _sum: {
      price: true,
    },
    where: {
      order: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    },
  });

  // Get product to category mapping
  const productCategoryMap = new Map(categoryProducts.map(p => [p.id, p.category?.id]));
  const categoryProductMap = new Map<number, number[]>();
  categoryProducts.forEach(product => {
    if (product.category?.id) {
      const products = categoryProductMap.get(product.category.id) || [];
      products.push(product.id);
      categoryProductMap.set(product.category.id, products);
    }
  });

  // Calculate category metrics
  const categoryAnalysis: ICategoryProductAnalysis[] = [];

  for (const category of categories) {
    const categoryProductIds = categoryProductMap.get(category.id) || [];
    const categorySales = categorySalesData.filter(item => categoryProductIds.includes(item.productId));

    const totalRevenue = categorySales.reduce((sum, item) => sum + Number(item._sum.price), 0);
    const totalProducts = categoryProductIds.length;

    // Find top product in this category
    const topProductData = categorySalesData
      .filter(item => categoryProductIds.includes(item.productId))
      .sort((a, b) => Number(b._sum.price) - Number(a._sum.price))[0];

    let topProduct = { id: 0, name: 'No sales', revenue: 0 };
    if (topProductData) {
      const product = categoryProducts.find(p => p.id === topProductData.productId);
      topProduct = {
        id: topProductData.productId,
        name: product?.title || 'Unknown Product',
        revenue: Number(topProductData._sum.price),
      };
    }

    const averageRevenue = totalProducts > 0 ? totalRevenue / totalProducts : 0;

    categoryAnalysis.push({
      categoryId: category.id,
      categoryName: category.name,
      totalProducts,
      topProduct,
      averageRevenue,
      totalRevenue,
    });
  }

  return categoryAnalysis;
};

const getStockAnalysis = async (): Promise<IProductStockAnalysis[]> => {
  const stockData = await prisma.productFlavorSize.findMany({
    where: {
      productId: {
        in: await prisma.product.findMany({
          where: { isActive: true },
          select: { id: true },
        }).then(products => products.map(p => p.id)),
      },
    },
    include: {
      productFlavor: {
        include: {
          product: {
            select: { id: true, title: true },
          },
        },
      },
    },
  });

  // Group by product and calculate metrics
  const productStockMap = new Map<number, {
    productName: string;
    totalStock: number;
    averagePrice: number;
    salesCount: number;
  }>();

  // Get recent sales data for turnover calculation
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const salesData = await prisma.orderItem.groupBy({
    by: ['productId'],
    _sum: {
      quantity: true,
    },
    where: {
      order: {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
    },
  });

  const salesMap = new Map(salesData.map(item => [item.productId, Number(item._sum.quantity)]));

  for (const stockItem of stockData) {
    const productId = stockItem.productId;
    const existing = productStockMap.get(productId);

    if (existing) {
      existing.totalStock += stockItem.stock;
    } else {
      productStockMap.set(productId, {
        productName: stockItem.productFlavor.product.title,
        totalStock: stockItem.stock,
        averagePrice: stockItem.price,
        salesCount: salesMap.get(productId) || 0,
      });
    }
  }

  return Array.from(productStockMap.entries())
    .map(([productId, data]) => ({
      productId,
      productName: data.productName,
      currentStock: data.totalStock,
      stockValue: data.totalStock * data.averagePrice,
      turnoverRate: data.totalStock > 0 ? Number((data.salesCount / data.totalStock).toFixed(2)) : 0,
      outOfStockDays: 0, // Would need more complex tracking
      reorderPoint: Math.max(1, Math.floor(data.totalStock * 0.2)), // 20% of current stock
    }))
    .sort((a, b) => a.currentStock - b.currentStock) // Sort by lowest stock first
    .slice(0, 10); // Take top 10 lowest stock products
};

const getReviewAnalytics = async (): Promise<IProductReviewAnalytics[]> => {
  const reviewData = await prisma.review.groupBy({
    by: ['productId'],
    _count: {
      id: true,
    },
    _avg: {
      rating: true,
    },
    where: {
      product: {
        isActive: true,
      },
    },
  });

  // Get recent reviews (last 30 days) for trend calculation
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentReviews = await prisma.review.groupBy({
    by: ['productId'],
    _count: {
      id: true,
    },
    _avg: {
      rating: true,
    },
    where: {
      product: {
        isActive: true,
      },
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
  });

  // Get rating distribution
  const allReviews = await prisma.review.findMany({
    where: {
      product: {
        isActive: true,
      },
    },
    select: {
      productId: true,
      rating: true,
    },
  });

  // Get product names
  const productIds = reviewData.map(item => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, title: true },
  });

  const productMap = new Map(products.map(p => [p.id, p.title]));

  // Calculate rating distributions
  const ratingDistributions = new Map<number, { 1: number; 2: number; 3: number; 4: number; 5: number }>();
  const productRatingCounts = new Map<number, number>();

  allReviews.forEach(review => {
    const current = ratingDistributions.get(review.productId) || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    current[review.rating as keyof typeof current] = (current[review.rating as keyof typeof current] || 0) + 1;
    ratingDistributions.set(review.productId, current);

    productRatingCounts.set(review.productId, (productRatingCounts.get(review.productId) || 0) + 1);
  });

  return reviewData.map(item => {
    const productId = item.productId;
    const distribution = ratingDistributions.get(productId) || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const totalReviews = productRatingCounts.get(productId) || 0;

    // Normalize distribution to percentages
    const normalizedDistribution = {
      1: totalReviews > 0 ? Math.round((distribution[1] / totalReviews) * 100) : 0,
      2: totalReviews > 0 ? Math.round((distribution[2] / totalReviews) * 100) : 0,
      3: totalReviews > 0 ? Math.round((distribution[3] / totalReviews) * 100) : 0,
      4: totalReviews > 0 ? Math.round((distribution[4] / totalReviews) * 100) : 0,
      5: totalReviews > 0 ? Math.round((distribution[5] / totalReviews) * 100) : 0,
    };

    // Calculate rating trend
    const recent = recentReviews.find(r => r.productId === productId);
    const recentAvg = recent ? Number(recent._avg.rating) : Number(item._avg.rating);
    const overallAvg = Number(item._avg.rating);
    const ratingTrend = Number((recentAvg - overallAvg).toFixed(1));

    return {
      productId,
      productName: productMap.get(productId) || 'Unknown Product',
      averageRating: Number(item._avg.rating),
      totalReviews: Number(item._count.id),
      ratingDistribution: normalizedDistribution,
      recentRatingTrend: ratingTrend,
    };
  }).slice(0, 10);
};

const getProfitabilityMetrics = async (startDate?: Date, endDate?: Date): Promise<IProductProfitability[]> => {
  const profitabilityData = await prisma.orderItem.groupBy({
    by: ['productId'],
    _sum: {
      price: true,
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
  });

  // Get product details and current prices
  const productIds = profitabilityData.map(item => item.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, title: true },
  });

  // Get current pricing from product variants
  const productPrices = await prisma.productFlavorSize.findMany({
    where: { productId: { in: productIds } },
    select: {
      productId: true,
      price: true,
    },
  });

  // Calculate average price per product
  const priceMap = new Map<number, number[]>();
  productPrices.forEach(price => {
    const existing = priceMap.get(price.productId) || [];
    existing.push(price.price);
    priceMap.set(price.productId, existing);
  });

  // Convert to average prices
  const avgPriceMap = new Map<number, number>();
  priceMap.forEach((prices, productId) => {
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    avgPriceMap.set(productId, avgPrice);
  });

  const productMap = new Map(products.map(p => [p.id, p.title]));

  return profitabilityData.map(item => {
    const productId = item.productId;
    const revenue = Number(item._sum.price) * Number(item._sum.quantity);
    const unitsSold = Number(item._sum.quantity);
    const averagePrice = avgPriceMap.get(productId) || 0;

    // Assuming cost of goods is 60% of selling price (common retail margin)
    // In real implementation, this would come from cost data
    const estimatedCostOfGoods = averagePrice * 0.6;
    const profit = revenue - (estimatedCostOfGoods * unitsSold);
    const profitMargin = revenue > 0 ? Number(((profit / revenue) * 100).toFixed(1)) : 0;

    // Break-even point calculation
    const breakEvenUnits = estimatedCostOfGoods > 0 ? Math.ceil(estimatedCostOfGoods / (averagePrice - estimatedCostOfGoods)) : 0;

    return {
      productId,
      productName: productMap.get(productId) || 'Unknown Product',
      revenue,
      costOfGoods: estimatedCostOfGoods * unitsSold,
      profit,
      profitMargin,
      breakEvenPoint: breakEvenUnits,
    };
  }).slice(0, 10);
};

const getLifecycleAnalysis = async (): Promise<IProductLifecycle[]> => {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      title: true,
      createdAt: true,
    },
  });

  // Get first and last sale dates for each product
  const salesData = await prisma.orderItem.findMany({
    where: {
      product: {
        isActive: true,
      },
    },
    include: {
      order: {
        select: {
          createdAt: true,
        },
      },
    },
  });

  const productSalesMap = new Map<number, {
    firstSale: Date;
    lastSale: Date;
    saleDates: Date[];
  }>();

  salesData.forEach(item => {
    const productId = item.productId;
    const saleDate = item.order.createdAt;
    const existing = productSalesMap.get(productId);

    if (existing) {
      existing.saleDates.push(saleDate);
      if (saleDate < existing.firstSale) existing.firstSale = saleDate;
      if (saleDate > existing.lastSale) existing.lastSale = saleDate;
    } else {
      productSalesMap.set(productId, {
        firstSale: saleDate,
        lastSale: saleDate,
        saleDates: [saleDate],
      });
    }
  });

  const now = new Date();

  return products.map(product => {
    const salesInfo = productSalesMap.get(product.id);
    const ageInDays = Math.floor((now.getTime() - product.createdAt.getTime()) / (1000 * 60 * 60 * 24));

    let lifecycleStage: 'new' | 'growing' | 'mature' | 'declining' = 'new';
    let consistencyScore = 0;

    if (salesInfo) {
      const daysSinceLastSale = Math.floor((now.getTime() - salesInfo.lastSale.getTime()) / (1000 * 60 * 60 * 24));
      const totalSalesPeriod = Math.floor((salesInfo.lastSale.getTime() - salesInfo.firstSale.getTime()) / (1000 * 60 * 60 * 24)) || 1;
      const expectedSales = Math.max(1, totalSalesPeriod / 30); // Expected sales per month
      const actualSales = salesInfo.saleDates.length;
      consistencyScore = Number((actualSales / expectedSales).toFixed(2));

      if (daysSinceLastSale > 90) {
        lifecycleStage = 'declining';
      } else if (ageInDays > 180) {
        lifecycleStage = 'mature';
      } else if (ageInDays > 30) {
        lifecycleStage = 'growing';
      }
    }

    return {
      productId: product.id,
      productName: product.title,
      ageInDays,
      lifecycleStage,
      firstSaleDate: salesInfo?.firstSale || product.createdAt,
      lastSaleDate: salesInfo?.lastSale || product.createdAt,
      consistencyScore,
    };
  }).slice(0, 10);
};

const getConversionRates = async (startDate?: Date, endDate?: Date): Promise<IProductConversion[]> => {
  // Get cart additions (items added to cart)
  const cartData = await prisma.cartItem.groupBy({
    by: ['productId'],
    _count: {
      id: true,
    },
    where: {
      cart: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    },
  });

  // Get purchases (items actually ordered)
  const purchaseData = await prisma.orderItem.groupBy({
    by: ['productId'],
    _sum: {
      quantity: true,
    },
    where: {
      order: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    },
  });

  // Get product names
  const productIds = [...new Set([...cartData.map(d => d.productId), ...purchaseData.map(d => d.productId)])];
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, title: true },
  });

  const productMap = new Map(products.map(p => [p.id, p.title]));
  const cartMap = new Map(cartData.map(item => [item.productId, item._count.id]));
  const purchaseMap = new Map(purchaseData.map(item => [item.productId, Number(item._sum.quantity)]));

  return productIds.map(productId => {
    const cartAdditions = cartMap.get(productId) || 0;
    const purchases = purchaseMap.get(productId) || 0;

    const conversionRate = cartAdditions > 0 ? Number(((purchases / cartAdditions) * 100).toFixed(1)) : 0;
    const abandonmentRate = cartAdditions > 0 ? Number((((cartAdditions - purchases) / cartAdditions) * 100).toFixed(1)) : 0;

    return {
      productId,
      productName: productMap.get(productId) || 'Unknown Product',
      views: undefined, // Not tracking views in current schema
      cartAdditions,
      purchases,
      conversionRate,
      abandonmentRate,
    };
  }).slice(0, 10);
};

// Customer Analytics Methods
const getCustomerAnalytics = async (filters: IDashboardFilters = {}): Promise<ICustomerAnalytics> => {
  // Get date range for filtering
  const { startDate, endDate } = getDateRange(filters);

  // Fetch all 8 metrics in parallel for better performance
  const [
    customerDemographics,
    customerLifetimeValue,
    repeatPurchaseAnalysis,
    customerRetention,
    customerSegmentation,
    customerAcquisition,
    customerSatisfaction,
    customerBehavior,
  ] = await Promise.all([
    getCustomerDemographics(startDate, endDate),
    getCustomerLifetimeValue(startDate, endDate),
    getRepeatPurchaseAnalysis(startDate, endDate),
    getCustomerRetention(startDate, endDate),
    getCustomerSegmentation(startDate, endDate),
    getCustomerAcquisition(startDate, endDate),
    getCustomerSatisfaction(),
    getCustomerBehavior(startDate, endDate),
  ]);

  return {
    customerDemographics,
    customerLifetimeValue,
    repeatPurchaseAnalysis,
    customerRetention,
    customerSegmentation,
    customerAcquisition,
    customerSatisfaction,
    customerBehavior,
  };
};

const getCustomerDemographics = async (startDate?: Date, endDate?: Date): Promise<ICustomerDemographics[]> => {
  // Group customers by age ranges (simplified - assuming birth dates not tracked)
  // For now, return basic demographics - this could be enhanced with user profile data
  const customerData = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      _count: {
        select: {
          orders: true,
        },
      },
    },
  });

  // Get order data for AOV calculation
  const orderData = await prisma.order.groupBy({
    by: ['userId'],
    _avg: {
      totalAmount: true,
    },
  });

  const aovMap = new Map(orderData.map(item => [item.userId, Number(item._avg.totalAmount) || 0]));

  // Simplified demographics - could be enhanced with actual demographic data
  const demographics: ICustomerDemographics[] = [
    {
      ageGroup: '18-24',
      count: Math.floor(customerData.length * 0.15), // Estimated distribution
      percentage: 15,
      averageOrderValue: customerData.reduce((sum, c) => sum + (aovMap.get(c.id) || 0), 0) / customerData.length,
    },
    {
      ageGroup: '25-34',
      count: Math.floor(customerData.length * 0.35),
      percentage: 35,
      averageOrderValue: customerData.reduce((sum, c) => sum + (aovMap.get(c.id) || 0), 0) / customerData.length,
    },
    {
      ageGroup: '35-44',
      count: Math.floor(customerData.length * 0.30),
      percentage: 30,
      averageOrderValue: customerData.reduce((sum, c) => sum + (aovMap.get(c.id) || 0), 0) / customerData.length,
    },
    {
      ageGroup: '45+',
      count: Math.floor(customerData.length * 0.20),
      percentage: 20,
      averageOrderValue: customerData.reduce((sum, c) => sum + (aovMap.get(c.id) || 0), 0) / customerData.length,
    },
  ];

  return demographics;
};

const getCustomerLifetimeValue = async (startDate?: Date, endDate?: Date): Promise<ICustomerLifetimeValue[]> => {
  const customerData = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      orders: {
        select: {
          totalAmount: true,
          createdAt: true,
        },
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      _count: {
        select: {
          orders: true,
        },
      },
    },
    take: 20,
    orderBy: {
      orders: {
        _count: 'desc',
      },
    },
  });

  return customerData.map(customer => {
    const totalSpent = customer.orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalOrders = customer.orders.length;
    const averageOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
    const lastOrderDate = customer.orders.length > 0
      ? new Date(Math.max(...customer.orders.map(o => o.createdAt.getTime())))
      : customer.createdAt;

    // Simple segmentation based on spending
    let customerSegment: 'high' | 'medium' | 'low' | 'new' = 'new';
    if (totalSpent > 1000) customerSegment = 'high';
    else if (totalSpent > 500) customerSegment = 'medium';
    else if (totalSpent > 100) customerSegment = 'low';

    return {
      customerId: customer.id,
      customerName: customer.name,
      totalOrders,
      totalSpent,
      averageOrderValue,
      lastOrderDate,
      customerSegment,
    };
  });
};

const getRepeatPurchaseAnalysis = async (startDate?: Date, endDate?: Date): Promise<IRepeatPurchaseAnalysis> => {
  // Get customers with their order counts for the period
  const customerData = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      _count: {
        select: {
          orders: {
            where: {
              createdAt: {
                gte: startDate,
                lte: endDate,
              },
            },
          },
        },
      },
    },
  });

  const totalCustomers = customerData.length;
  const oneTimeCustomers = customerData.filter(c => c._count.orders === 1).length;
  const repeatCustomers = totalCustomers - oneTimeCustomers;

  const oneTimePercentage = totalCustomers > 0 ? Math.round((oneTimeCustomers / totalCustomers) * 100) : 0;
  const repeatPercentage = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;

  // Calculate average orders per repeat customer
  const repeatCustomerOrders = customerData.filter(c => c._count.orders > 1);
  const averageOrdersPerRepeatCustomer = repeatCustomerOrders.length > 0
    ? Number((repeatCustomerOrders.reduce((sum, c) => sum + c._count.orders, 0) / repeatCustomerOrders.length).toFixed(1))
    : 0;

  // Calculate average days between purchases for repeat customers
  const repeatCustomerData = await prisma.user.findMany({
    where: {
      id: {
        in: repeatCustomerOrders.map(c => c.id),
      },
    },
    include: {
      orders: {
        select: {
          createdAt: true,
        },
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });

  let totalDaysBetweenPurchases = 0;
  let totalIntervals = 0;

  repeatCustomerData.forEach(customer => {
    if (customer.orders.length > 1) {
      for (let i = 1; i < customer.orders.length; i++) {
        const daysDiff = Math.floor((customer.orders[i].createdAt.getTime() - customer.orders[i-1].createdAt.getTime()) / (1000 * 60 * 60 * 24));
        totalDaysBetweenPurchases += daysDiff;
        totalIntervals++;
      }
    }
  });

  const averageDaysBetweenPurchases = totalIntervals > 0 ? Math.round(totalDaysBetweenPurchases / totalIntervals) : 0;

  return {
    totalCustomers,
    oneTimeCustomers,
    repeatCustomers,
    oneTimePercentage,
    repeatPercentage,
    averageOrdersPerRepeatCustomer,
    averageDaysBetweenPurchases,
  };
};

const getCustomerRetention = async (startDate?: Date, endDate?: Date): Promise<ICustomerRetention> => {
  // Simplified cohort analysis - showing monthly retention
  const cohortData: ICohortData[] = [];

  // Generate last 6 months of cohort data
  for (let i = 5; i >= 0; i--) {
    const cohortDate = new Date();
    cohortDate.setMonth(cohortDate.getMonth() - i);

    const cohortStart = new Date(cohortDate.getFullYear(), cohortDate.getMonth(), 1);
    const cohortEnd = new Date(cohortDate.getFullYear(), cohortDate.getMonth() + 1, 0);

    // Month 0: customers who made their first order in this month
    const month0Customers = await prisma.user.findMany({
      where: {
        orders: {
          some: {
            createdAt: {
              gte: cohortStart,
              lte: cohortEnd,
            },
          },
        },
      },
      select: { id: true },
    });

    const month0Count = month0Customers.length;

    // Month 1-3: customers from month 0 who also ordered in subsequent months
    const retentionCounts = [];
    for (let month = 1; month <= 3; month++) {
      const checkDate = new Date(cohortEnd);
      checkDate.setMonth(checkDate.getMonth() + month);
      const checkStart = new Date(checkDate.getFullYear(), checkDate.getMonth(), 1);
      const checkEnd = new Date(checkDate.getFullYear(), checkDate.getMonth() + 1, 0);

      const retainedCustomers = await prisma.user.count({
        where: {
          id: { in: month0Customers.map(c => c.id) },
          orders: {
            some: {
              createdAt: {
                gte: checkStart,
                lte: checkEnd,
              },
            },
          },
        },
      });

      retentionCounts.push(retainedCustomers);
    }

    cohortData.push({
      cohort: cohortDate.toISOString().slice(0, 7),
      month0: month0Count,
      month1: retentionCounts[0],
      month2: retentionCounts[1],
      month3: retentionCounts[2],
      retentionRate: month0Count > 0 ? Math.round((retentionCounts[2] / month0Count) * 100) : 0,
    });
  }

  // Calculate overall retention rate (3-month retention)
  const totalMonth0 = cohortData.reduce((sum, c) => sum + c.month0, 0);
  const totalMonth3 = cohortData.reduce((sum, c) => sum + c.month3, 0);
  const retentionRate = totalMonth0 > 0 ? Math.round((totalMonth3 / totalMonth0) * 100) : 0;

  // Calculate churn rate
  const churnRate = 100 - retentionRate;

  // Estimate average customer lifespan in days
  const averageCustomerLifespan = Math.round(90 * (retentionRate / 100)); // Rough estimate

  return {
    cohortAnalysis: cohortData,
    retentionRate,
    churnRate,
    averageCustomerLifespan,
  };
};

const getCustomerSegmentation = async (startDate?: Date, endDate?: Date): Promise<ICustomerSegment[]> => {
  const customerData = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      orders: {
        select: {
          totalAmount: true,
        },
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      },
      _count: {
        select: {
          orders: true,
        },
      },
    },
  });

  // Segment customers based on spending
  const segments = {
    high: { customers: [] as any[], totalRevenue: 0 },
    medium: { customers: [] as any[], totalRevenue: 0 },
    low: { customers: [] as any[], totalRevenue: 0 },
    new: { customers: [] as any[], totalRevenue: 0 },
  };

  customerData.forEach(customer => {
    const totalSpent = customer.orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const orderCount = customer.orders.length;
    const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0;

    let segment: keyof typeof segments = 'new';
    if (totalSpent > 1000) segment = 'high';
    else if (totalSpent > 500) segment = 'medium';
    else if (totalSpent > 100) segment = 'low';

    segments[segment].customers.push({
      totalSpent,
      orderCount,
      avgOrderValue,
    });
    segments[segment].totalRevenue += totalSpent;
  });

  const totalCustomers = customerData.length;
  const totalRevenue = customerData.reduce((sum, c) => sum + c.orders.reduce((s, o) => s + o.totalAmount, 0), 0);

  return Object.entries(segments).map(([segment, data]) => ({
    segment: segment.charAt(0).toUpperCase() + segment.slice(1),
    customerCount: data.customers.length,
    percentage: totalCustomers > 0 ? Math.round((data.customers.length / totalCustomers) * 100) : 0,
    averageOrderValue: data.customers.length > 0
      ? Number((data.customers.reduce((sum, c) => sum + c.avgOrderValue, 0) / data.customers.length).toFixed(2))
      : 0,
    totalRevenue: data.totalRevenue,
    averageOrdersPerCustomer: data.customers.length > 0
      ? Number((data.customers.reduce((sum, c) => sum + c.orderCount, 0) / data.customers.length).toFixed(1))
      : 0,
  }));
};

const getCustomerAcquisition = async (startDate?: Date, endDate?: Date): Promise<ICustomerAcquisition> => {
  // Get customer acquisition over time (last 6 months)
  const acquisitionData: ICustomerTrend[] = [];

  for (let i = 5; i >= 0; i--) {
    const periodDate = new Date();
    periodDate.setMonth(periodDate.getMonth() - i);

    const periodStart = new Date(periodDate.getFullYear(), periodDate.getMonth(), 1);
    const periodEnd = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0);

    // New customers in this period
    const newCustomers = await prisma.user.count({
      where: {
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    });

    // Returning customers (customers who ordered in this period but were created before)
    const returningCustomers = await prisma.user.count({
      where: {
        createdAt: {
          lt: periodStart, // Created before this period
        },
        orders: {
          some: {
            createdAt: {
              gte: periodStart,
              lte: periodEnd,
            },
          },
        },
      },
    });

    const totalCustomers = newCustomers + returningCustomers;

    acquisitionData.push({
      period: periodDate.toISOString().slice(0, 7),
      newCustomers,
      returningCustomers,
      totalCustomers,
    });
  }

  // Calculate overall metrics
  const totalNew = acquisitionData.reduce((sum, d) => sum + d.newCustomers, 0);
  const totalReturning = acquisitionData.reduce((sum, d) => sum + d.returningCustomers, 0);
  const totalAll = totalNew + totalReturning;

  const acquisitionRate = totalAll > 0 ? Math.round((totalNew / totalAll) * 100) : 0;

  return {
    newCustomers: totalNew,
    returningCustomers: totalReturning,
    acquisitionRate,
    averageAcquisitionCost: undefined, // Would need marketing spend data
    customerAcquisitionTrend: acquisitionData,
  };
};

const getCustomerSatisfaction = async (): Promise<ICustomerSatisfaction> => {
  const reviewData = await prisma.review.aggregate({
    _avg: {
      rating: true,
    },
    _count: {
      id: true,
    },
  });

  const overallRating = Number(reviewData._avg.rating) || 0;
  const totalReviews = reviewData._count.id;

  // Get rating distribution
  const ratingCounts = await prisma.review.groupBy({
    by: ['rating'],
    _count: {
      id: true,
    },
  });

  const ratingDistribution = {
    1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
  };

  ratingCounts.forEach(item => {
    ratingDistribution[item.rating as keyof typeof ratingDistribution] = item._count.id;
  });

  // Get recent satisfaction trend (last 6 months)
  const satisfactionTrend: ISatisfactionTrend[] = [];

  for (let i = 5; i >= 0; i--) {
    const periodDate = new Date();
    periodDate.setMonth(periodDate.getMonth() - i);

    const periodStart = new Date(periodDate.getFullYear(), periodDate.getMonth(), 1);
    const periodEnd = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0);

    const periodReviews = await prisma.review.aggregate({
      where: {
        createdAt: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      _avg: {
        rating: true,
      },
      _count: {
        id: true,
      },
    });

    const avgRating = Number(periodReviews._avg.rating) || 0;
    const reviewCount = periodReviews._count.id;

    // Determine trend compared to previous period
    let trend: 'improving' | 'stable' | 'declining' = 'stable';
    if (i < 5) {
      const prevRating = Number(satisfactionTrend[satisfactionTrend.length - 1]?.averageRating) || avgRating;
      if (avgRating > prevRating + 0.1) trend = 'improving';
      else if (avgRating < prevRating - 0.1) trend = 'declining';
    }

    satisfactionTrend.push({
      period: periodDate.toISOString().slice(0, 7),
      averageRating: avgRating,
      reviewCount,
      trend,
    });
  }

  return {
    overallRating,
    totalReviews,
    ratingDistribution,
    netPromoterScore: undefined, // Would need NPS survey data
    customerSatisfactionTrend: satisfactionTrend,
  };
};

const getCustomerBehavior = async (startDate?: Date, endDate?: Date): Promise<ICustomerBehavior> => {
  // Get order data for analysis
  const orderData = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      items: {
        include: {
          product: {
            select: {
              category: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Calculate average time between purchases
  const customerOrderDates = new Map<number, Date[]>();

  orderData.forEach(order => {
    const dates = customerOrderDates.get(order.userId) || [];
    dates.push(order.createdAt);
    customerOrderDates.set(order.userId, dates);
  });

  let totalDaysBetweenPurchases = 0;
  let totalIntervals = 0;

  customerOrderDates.forEach(dates => {
    if (dates.length > 1) {
      dates.sort((a, b) => a.getTime() - b.getTime());
      for (let i = 1; i < dates.length; i++) {
        const daysDiff = Math.floor((dates[i].getTime() - dates[i-1].getTime()) / (1000 * 60 * 60 * 24));
        totalDaysBetweenPurchases += daysDiff;
        totalIntervals++;
      }
    }
  });

  const averageTimeBetweenPurchases = totalIntervals > 0 ? Math.round(totalDaysBetweenPurchases / totalIntervals) : 0;

  // Find preferred purchase day and hour
  const dayOfWeekCounts = new Array(7).fill(0);
  const hourOfDayCounts = new Array(24).fill(0);

  orderData.forEach(order => {
    const dayOfWeek = order.createdAt.getDay(); // 0 = Sunday, 6 = Saturday
    const hourOfDay = order.createdAt.getHours();

    dayOfWeekCounts[dayOfWeek]++;
    hourOfDayCounts[hourOfDay]++;
  });

  const preferredDayIndex = dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts));
  const preferredHour = hourOfDayCounts.indexOf(Math.max(...hourOfDayCounts));

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const preferredPurchaseDay = dayNames[preferredDayIndex];

  // Calculate average cart size
  const totalItems = orderData.reduce((sum, order) => sum + order.items.reduce((s, item) => s + item.quantity, 0), 0);
  const averageCartSize = orderData.length > 0 ? Number((totalItems / orderData.length).toFixed(1)) : 0;

  // Calculate average order frequency (orders per month)
  const totalOrders = orderData.length;
  const uniqueCustomers = new Set(orderData.map(o => o.userId)).size;
  const averageOrderFrequency = uniqueCustomers > 0 ? Number((totalOrders / uniqueCustomers).toFixed(1)) : 0;

  // Find top categories
  const categoryCounts = new Map<string, number>();
  orderData.forEach(order => {
    order.items.forEach(item => {
      const categoryName = item.product.category?.name || 'Uncategorized';
      categoryCounts.set(categoryName, (categoryCounts.get(categoryName) || 0) + item.quantity);
    });
  });

  const topCategories = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  // Calculate cart abandonment rate
  const cartItemsCount = await prisma.cartItem.count({
    where: {
      cart: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    },
  });

  const orderItemsCount = orderData.reduce((sum, order) => sum + order.items.length, 0);
  const cartAbandonmentRate = cartItemsCount > 0 ? Number((((cartItemsCount - orderItemsCount) / cartItemsCount) * 100).toFixed(1)) : 0;

  return {
    averageTimeBetweenPurchases,
    preferredPurchaseDay,
    preferredPurchaseHour: preferredHour,
    averageCartSize,
    averageOrderFrequency,
    topCategories,
    cartAbandonmentRate,
  };
};

export const DashboardService = {
  getDashboardOverview,
  getDashboardMetrics,
  getRevenueTrend,
  getOrderStatusDistribution,
  getTopProducts,
  getRecentOrders,
  getLowStockItems,
  getSalesAnalytics,
  getAverageOrderValue,
  getSalesVelocity,
  getHourlySalesDistribution,
  getCategoryPerformance,
  getTopProductVariants,
  getCategoryRevenueTrend,
  getSalesGrowthRate,
  getPeakSalesHours,
  getProductPerformance,
  getPerformanceRankings,
  getProductTrends,
  getCategoryAnalysis,
  getStockAnalysis,
  getReviewAnalytics,
  getProfitabilityMetrics,
  getLifecycleAnalysis,
  getConversionRates,
  getCustomerAnalytics,
  getCustomerDemographics,
  getCustomerLifetimeValue,
  getRepeatPurchaseAnalysis,
  getCustomerRetention,
  getCustomerSegmentation,
  getCustomerAcquisition,
  getCustomerSatisfaction,
  getCustomerBehavior,
};
