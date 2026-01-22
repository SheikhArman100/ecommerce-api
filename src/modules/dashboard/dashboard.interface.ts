// Dashboard data interfaces

export interface IDashboardMetrics {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  revenueGrowth?: number;
  orderGrowth?: number;
  productGrowth?: number;
  customerGrowth?: number;
}

export interface IRevenueTrend {
  month: string; // Can be: YYYY-MM (monthly), YYYY-MM-DD (daily/weekly), YYYY-MM-DD HH:00:00 (hourly)
  revenue: number;
  orders: number;
}

export interface IOrderStatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

export interface IProductImage {
  id: number;
  path: string;
  originalName: string;
  url: string;
}

export interface ITopProduct {
  id: number;
  title: string;
  revenue: number;
  orders: number;
  image?: IProductImage;
}

export interface IRecentOrder {
  id: number;
  orderId: string;
  customerName: string;
  amount: number;
  status: string;
  date: Date;
}

export interface ILowStockItem {
  productId: number;
  productName: string;
  currentStock: number;
  threshold: number;
  category: string;
}

export interface IDashboardOverview {
  metrics: IDashboardMetrics;
  revenueTrend: IRevenueTrend[];
  orderStatusDistribution: IOrderStatusDistribution[];
  topProducts: ITopProduct[];
  recentOrders: IRecentOrder[];
  lowStockItems: ILowStockItem[];
}

export interface IDashboardFilters {
  period?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  filterType?: 'dateFilter' | 'weekFilter' | 'monthFilter' | 'yearFilter';
  startDate?: string;
  endDate?: string;
  year?: string;
  month?: string;
  week?: string;
  date?: string;
}

// Sales Analytics interfaces
export interface ISalesAnalytics {
  averageOrderValue: number;
  salesVelocity: number;
  hourlyDistribution: IHourlySales[];
  categoryPerformance: ICategoryPerformance[];
  topVariants: IProductVariant[];
  categoryRevenueTrend: ICategoryRevenueTrend[];
  growthRate: number;
  peakHours: IPeakHour[];
}

export interface IHourlySales {
  hour: number;
  revenue: number;
  orders: number;
}

export interface ICategoryPerformance {
  categoryId: number;
  categoryName: string;
  revenue: number;
  orders: number;
  percentage: number;
}

export interface IProductVariant {
  productId: number;
  productName: string;
  variant: string; // e.g., "Red - Large"
  revenue: number;
  orders: number;
}

export interface ICategoryRevenueTrend {
  categoryId: number;
  categoryName: string;
  monthlyData: Array<{
    month: string;
    revenue: number;
    orders: number;
    growth: number;
  }>;
  totalRevenue: number;
  totalOrders: number;
  averageMonthlyRevenue: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  growthRate: number;
}

export interface IPeakHour {
  hour: number;
  revenue: number;
  orders: number;
}

// Product Performance interfaces
export interface IProductPerformance {
  performanceRankings: IProductRanking[];
  productTrends: IProductTrend[];
  categoryAnalysis: ICategoryProductAnalysis[];
  stockAnalysis: IProductStockAnalysis[];
  reviewAnalytics: IProductReviewAnalytics[];
  profitabilityMetrics: IProductProfitability[];
  lifecycleAnalysis: IProductLifecycle[];
  conversionRates: IProductConversion[];
}

export interface IProductRanking {
  productId: number;
  productName: string;
  revenue: number;
  orders: number;
  ranking: number;
  category: string;
}

export interface IProductTrend {
  productId: number;
  productName: string;
  currentPeriod: {
    revenue: number;
    orders: number;
  };
  previousPeriod: {
    revenue: number;
    orders: number;
  };
  growthRate: number;
}

export interface ICategoryProductAnalysis {
  categoryId: number;
  categoryName: string;
  totalProducts: number;
  topProduct: {
    id: number;
    name: string;
    revenue: number;
  };
  averageRevenue: number;
  totalRevenue: number;
}

export interface IProductStockAnalysis {
  productId: number;
  productName: string;
  currentStock: number;
  stockValue: number; // stock * average price
  turnoverRate: number; // sales velocity
  outOfStockDays: number;
  reorderPoint: number;
}

export interface IProductReviewAnalytics {
  productId: number;
  productName: string;
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  recentRatingTrend: number; // rating change over last 30 days
}

export interface IProductProfitability {
  productId: number;
  productName: string;
  revenue: number;
  costOfGoods?: number; // if available
  profit?: number;
  profitMargin?: number;
  breakEvenPoint: number; // units needed to break even
}

export interface IProductLifecycle {
  productId: number;
  productName: string;
  ageInDays: number;
  lifecycleStage: 'new' | 'growing' | 'mature' | 'declining';
  firstSaleDate: Date;
  lastSaleDate: Date;
  consistencyScore: number; // sales regularity
}

export interface IProductConversion {
  productId: number;
  productName: string;
  views?: number; // if tracking available
  cartAdditions: number;
  purchases: number;
  conversionRate: number; // purchases / cart additions
  abandonmentRate: number; // (cart additions - purchases) / cart additions
}

// Customer Analytics interfaces
export interface ICustomerAnalytics {
  customerDemographics: ICustomerDemographics[];
  customerLifetimeValue: ICustomerLifetimeValue[];
  repeatPurchaseAnalysis: IRepeatPurchaseAnalysis;
  customerRetention: ICustomerRetention;
  customerSegmentation: ICustomerSegment[];
  customerAcquisition: ICustomerAcquisition;
  customerSatisfaction: ICustomerSatisfaction;
  customerBehavior: ICustomerBehavior;
}

export interface ICustomerDemographics {
  ageGroup: string;
  count: number;
  percentage: number;
  averageOrderValue: number;
}

export interface ICustomerLifetimeValue {
  customerId: number;
  customerName: string;
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate: Date;
  customerSegment: 'high' | 'medium' | 'low' | 'new';
}

export interface IRepeatPurchaseAnalysis {
  totalCustomers: number;
  oneTimeCustomers: number;
  repeatCustomers: number;
  oneTimePercentage: number;
  repeatPercentage: number;
  averageOrdersPerRepeatCustomer: number;
  averageDaysBetweenPurchases: number;
}

export interface ICustomerRetention {
  cohortAnalysis: ICohortData[];
  retentionRate: number;
  churnRate: number;
  averageCustomerLifespan: number; // in days
}

export interface ICohortData {
  cohort: string; // e.g., "2024-01"
  month0: number; // initial customers
  month1: number;
  month2: number;
  month3: number;
  retentionRate: number; // percentage retained after 3 months
}

export interface ICustomerSegment {
  segment: string;
  customerCount: number;
  percentage: number;
  averageOrderValue: number;
  totalRevenue: number;
  averageOrdersPerCustomer: number;
}

export interface ICustomerAcquisition {
  newCustomers: number;
  returningCustomers: number;
  acquisitionRate: number; // new customers / total customers
  averageAcquisitionCost?: number; // if tracking marketing spend
  customerAcquisitionTrend: ICustomerTrend[];
}

export interface ICustomerTrend {
  period: string;
  newCustomers: number;
  returningCustomers: number;
  totalCustomers: number;
}

export interface ICustomerSatisfaction {
  overallRating: number;
  totalReviews: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  netPromoterScore?: number; // if available
  customerSatisfactionTrend: ISatisfactionTrend[];
}

export interface ISatisfactionTrend {
  period: string;
  averageRating: number;
  reviewCount: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface ICustomerBehavior {
  averageTimeBetweenPurchases: number; // in days
  preferredPurchaseDay: string; // Monday, Tuesday, etc.
  preferredPurchaseHour: number;
  averageCartSize: number; // items per order
  averageOrderFrequency: number; // orders per month
  topCategories: string[]; // most purchased categories
  cartAbandonmentRate: number;
}
