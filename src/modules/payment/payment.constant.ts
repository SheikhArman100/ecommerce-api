export const paymentFilterableFields: string[] = [
  'searchTerm',
  'orderId',
  'orderNumber',
  'transactionId',
  'paymentStatus',
  'paymentGateway',
  'minAmount',
  'maxAmount',
];

export const paymentSearchableFields: string[] = [
  'transactionId',
  'bankTranId',
  'order.orderNumber', // handled specially in the service (relation field)
];
