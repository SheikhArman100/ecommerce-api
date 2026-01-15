import { OrderStatus } from "../../generated/enums";

// Interface for Order creation payload
export interface IOrderCreate {
  // Orders are created from cart, so no direct payload needed
  // The order creation process will use cart items
}

// Interface for Order updates
export interface IOrderUpdate {
  status?: OrderStatus;
}

// Interface for Order filters
export interface IOrderFilters {
  searchTerm?: string;
  userId?: string;
  status?: OrderStatus;
  minAmount?: string;
  maxAmount?: string;
  startDate?: string;
  endDate?: string;
  productId?: string;
}

// Interface for Order response
export interface IOrder {
  id: number;
  status: OrderStatus;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
  userId: number;
  user?: {
    id: number;
    name: string;
    email: string;
  };
  items?: IOrderItem[];
}

// Interface for OrderItem
export interface IOrderItem {
  id: number;
  orderId: number;
  productId: number;
  flavorId: number;
  sizeId: number;
  quantity: number;
  price: number;
  createdAt: Date;
  updatedAt: Date;
  product?: {
    id: number;
    title: string;
    slug: string;
  };
  productFlavorSize?: {
    price: number;
    stock: number;
  };
}
