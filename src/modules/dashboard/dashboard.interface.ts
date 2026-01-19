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
