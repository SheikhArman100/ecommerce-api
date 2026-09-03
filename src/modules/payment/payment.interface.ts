import { PaymentStatus } from "../../generated/enums";

export type IPaymentFilters = {
  searchTerm?: string;
  orderId?: string;
  orderNumber?: string;
  transactionId?: string;
  paymentStatus?: string;
  paymentGateway?: string;
  minAmount?: string;
  maxAmount?: string;
};

export type IPaymentUpdate = {
  paymentStatus?: PaymentStatus;
  bankTranId?: string;
};
