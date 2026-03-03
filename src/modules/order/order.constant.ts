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
  OrderStatus.Paid,
  OrderStatus.Shipped,
  OrderStatus.Delivered,
  OrderStatus.Cancelled,
  OrderStatus.Failed,
] as const;

// Status transition validation
export const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.Pending]: [OrderStatus.Paid, OrderStatus.Cancelled, OrderStatus.Failed],
  [OrderStatus.Paid]: [OrderStatus.Shipped, OrderStatus.Delivered, OrderStatus.Cancelled],
  [OrderStatus.Shipped]: [OrderStatus.Delivered, OrderStatus.Cancelled],
  [OrderStatus.Delivered]: [],
  [OrderStatus.Cancelled]: [],
  [OrderStatus.Failed]: [OrderStatus.Paid] // Allow retry
};
