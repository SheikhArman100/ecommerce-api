import { OrderStatus } from "../../generated/enums";

// Interface for Order creation payload
export interface IOrderCreate {
  couponCode?: string;
}

// Cart snapshot stored in payment gatewayResponse for deferred order creation
export interface ICartSnapshot {
  userId: number;
  items: ICartSnapshotItem[];
  totalAmount: number;
  discountAmount: number;
  payableAmount: number;
  deliveryCharge: number;
  couponId?: number;
  couponCode?: string;
}

export interface ICartSnapshotItem {
  productId: number;
  flavorId: number;
  sizeId: number | null;
  quantity: number;
  price: number;
  productTitle: string;
  flavorName: string | null;
  sizeName: string | null;
  stockToDecrement: number;
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

// Interface for payment initiation response
export interface IOrderInitiationResponse {
  GatewayPageURL: string;
  transactionId: string;
}

// Interface for Order response
export interface IOrder {
  id: number;
  status: OrderStatus;
  totalAmount: number;
  discountAmount: number;
  payableAmount: number;
  createdAt: Date;
  updatedAt: Date;
  userId: number;
  couponId?: number;
  deliveryCharge: number;
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
  sizeId: number | null;
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
    size?: {
      name: string;
      description: string;
    };
    productFlavor?: {
      flavor?: {
        name: string;
        color: string;
        description: string;
      };
      images?: Array<{
        path: string;
        originalName: string;
        type: string;
        modifiedName: string;
      }>;
    };
  };
}
