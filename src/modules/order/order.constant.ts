import { OrderStatus } from "../../generated/enums";

export const orderFilterableFields: string[] = [
  'searchTerm',
  'userId',
  'status',
  'minAmount',
  'maxAmount',
  'startDate',
  'endDate',
  'productId'
];

// Define searchable fields for Order
export const orderSearchableFields: string[] = [
  'user.name',
  'user.email'
];

// Order status options
export const ORDER_STATUSES = [
  OrderStatus.Pending,
  OrderStatus.Shipped,
  OrderStatus.Delivered,
  OrderStatus.Cancelled
] as const;

// Status transition validation
export const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.Pending]: [OrderStatus.Shipped, OrderStatus.Delivered, OrderStatus.Cancelled],
  [OrderStatus.Shipped]: [OrderStatus.Delivered, OrderStatus.Cancelled],
  [OrderStatus.Delivered]: [], // Final status, no further transitions
  [OrderStatus.Cancelled]: [] // Final status, no further transitions
};
