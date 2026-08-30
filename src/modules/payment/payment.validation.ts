import { z } from 'zod';
import { PaymentStatus } from '../../generated/enums';

const initiatePayment = z.object({
  body: z.object({
    orderId: z.number({
      error: 'Order ID must be a number',
    }).int().positive({ message: 'Order ID must be a positive integer' }),
  }),
});

const updatePayment = z.object({
  body: z.object({
    paymentStatus: z.nativeEnum(PaymentStatus).optional(),
    bankTranId: z.string().optional(),
  }),
});

export const PaymentValidation = {
  initiatePayment,
  updatePayment,
};
