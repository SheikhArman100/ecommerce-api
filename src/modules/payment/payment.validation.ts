import { z } from 'zod';
import { PaymentStatus } from '../../generated/enums';

const updatePayment = z.object({
  body: z.object({
    paymentStatus: z.nativeEnum(PaymentStatus).optional(),
    bankTranId: z.string().optional(),
  }),
});

export const PaymentValidation = {
  updatePayment,
};
