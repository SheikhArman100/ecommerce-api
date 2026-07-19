import { prisma } from '../../client';
import { SSLCommerzService } from './sslcommerz.service';
import ApiError from '../../errors/ApiError';
import status from 'http-status';
import { PaymentStatus } from '../../generated/enums';
import { Prisma } from '../../generated/client';
import { IPaymentFilters, IPaymentUpdate } from './payment.interface';
import { IPaginationOptions } from '../../interfaces/common';
import { calculatePagination } from '../../helpers/paginationHelper';
import { paymentSearchableFields } from './payment.constant';
import { OrderService } from '../order/order.service';
import { NotificationService } from '../notification/notification.service';

const handleSuccess = async (tran_id: string, val_id: string) => {
  const verificationResponse = await SSLCommerzService.verifyPayment(val_id) as any;

  if (verificationResponse?.status === 'VALID' || verificationResponse?.status === 'AUTHENTICATED') {
    // Capture order info for email notifications (payment variable is scoped inside the transaction)
    let orderInfo: any = null;

    await prisma.$transaction(async (tx: any) => {
      // 1. Update payment record
      const payment = await tx.payment.update({
        where: { transactionId: tran_id },
        data: {
          paymentStatus: PaymentStatus.PAID,
          bankTranId: verificationResponse?.bank_tran_id,
          validationResponse: verificationResponse,
        },
        include: {
          order: {
            include: {
              user: true,
            },
          },
        },
      });

      // Capture order/user info for emails before transaction closes
      orderInfo = {
        orderId: payment.orderId,
        userEmail: payment.order.user.email,
        userName: payment.order.user.name,
        payableAmount: payment.order.payableAmount,
        transactionId: payment.transactionId,
      };

      // 2. Update order status to Paid
      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          status: 'Paid',
          paymentStatus: PaymentStatus.PAID,
        },
      });
    });

    // 3. Send payment success email (after transaction committed)
    if (orderInfo) {
      NotificationService.sendPaymentSuccessEmail(orderInfo.userEmail, {
        userName: orderInfo.userName,
        orderId: orderInfo.orderId,
        payableAmount: orderInfo.payableAmount,
        transactionId: orderInfo.transactionId,
      }).catch(err => console.error('Payment Success Email Error:', err));
    }

    // 4. Create order items from cart snapshot, decrement stock, clear cart
    await OrderService.createOrderItemsFromSnapshot(tran_id);

    // 5. Send order confirmation emails (async, non-blocking)
    if (orderInfo) {
      const completedOrder = await prisma.order.findUnique({
        where: { id: orderInfo.orderId },
        include: {
          items: true,
        },
      });

      if (completedOrder) {
        NotificationService.sendOrderConfirmationEmail(orderInfo.userEmail, {
          userName: orderInfo.userName,
          orderId: completedOrder.id,
          payableAmount: completedOrder.payableAmount,
          discountAmount: completedOrder.discountAmount,
          deliveryCharge: completedOrder.deliveryCharge,
          items: completedOrder.items,
        }).catch(err => console.error('Order Confirmation Email Error:', err));

        NotificationService.sendAdminOrderAlert({
          orderId: completedOrder.id,
          userName: orderInfo.userName,
          userEmail: orderInfo.userEmail,
          payableAmount: completedOrder.payableAmount,
        }).catch(err => console.error('Admin Order Alert Error:', err));
      }
    }

    return { success: true };
  } else {
    await (prisma as any).payment.update({
      where: { transactionId: tran_id },
      data: {
        paymentStatus: PaymentStatus.FAILED,
        validationResponse: verificationResponse,
      },
    });

    // Clean up the shell order since payment verification failed
    await cleanupFailedPayment(tran_id);

    return { success: false };
  }
};

const handleFail = async (tran_id: string) => {
  await prisma.$transaction(async (tx: any) => {
    const payment = await tx.payment.update({
      where: { transactionId: tran_id },
      data: {
        paymentStatus: PaymentStatus.FAILED,
      },
    });

    await tx.order.update({
      where: { id: payment.orderId },
      data: {
        status: 'Failed',
      },
    });
  });
};

const handleCancel = async (tran_id: string) => {
  const payment = await (prisma as any).payment.findUnique({
    where: { transactionId: tran_id },
    include: {
      order: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!payment || !payment.order) return;

  await prisma.$transaction(async (tx: any) => {
    // Delete payment record
    await tx.payment.delete({
      where: { id: payment.id },
    });

    // Delete the shell order (no items/stock affected yet)
    await tx.order.delete({
      where: { id: payment.order.id },
    });
  });
};

const cleanupFailedPayment = async (tran_id: string) => {
  const payment = await (prisma as any).payment.findUnique({
    where: { transactionId: tran_id },
  });

  if (!payment) return;

  await prisma.$transaction(async (tx: any) => {
    // Mark payment as failed
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        paymentStatus: PaymentStatus.FAILED,
      },
    });

    // Delete the shell order
    await tx.order.delete({
      where: { id: payment.orderId },
    });
  });
};

const refundPayment = async (orderId: number, refundAmount: number, refundRemark: string) => {
  const payment = await (prisma as any).payment.findFirst({
    where: { 
      orderId,
      paymentStatus: PaymentStatus.PAID,
    },
  });

  if (!payment) {
    throw new ApiError(status.NOT_FOUND, 'Paid payment not found for this order');
  }

  if (!payment.bankTranId) {
    throw new ApiError(status.BAD_REQUEST, 'Bank transaction ID missing for this payment');
  }

  const refundResponse = await SSLCommerzService.initiateRefund({
    bank_tran_id: payment.bankTranId,
    refund_amount: refundAmount,
    refund_remark: refundRemark,
  }) as any;

  if (refundResponse?.status === 'success') {
    await prisma.$transaction(async (tx: any) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          paymentStatus: PaymentStatus.REFUNDED,
          gatewayResponse: {
            ...(payment.gatewayResponse as object),
            refund_response: refundResponse,
          },
        },
      });

      await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: PaymentStatus.REFUNDED,
        },
      });
    });
    return refundResponse;
  } else {
    throw new ApiError(status.BAD_REQUEST, refundResponse?.error || 'Refund initiation failed');
  }
};

const getAllPayments = async (
  filters: IPaymentFilters,
  paginationOptions: IPaginationOptions,
) => {
  const { searchTerm, ...filtersData } = filters;
  const { page, limit, skip, orderBy } = calculatePagination(paginationOptions);

  let whereConditions: Prisma.PaymentWhereInput = {};

  if (searchTerm) {
    whereConditions = {
      OR: paymentSearchableFields.map(field => ({
        [field]: {
          contains: searchTerm,
        },
      })),
    };
  }

  const andConditions: Prisma.PaymentWhereInput[] = [];

  if (filtersData.orderId) {
    andConditions.push({ orderId: Number(filtersData.orderId) });
  }

  if (filtersData.transactionId) {
    andConditions.push({ transactionId: filtersData.transactionId });
  }

  if (filtersData.paymentStatus) {
    andConditions.push({ paymentStatus: filtersData.paymentStatus as any });
  }

  if (filtersData.paymentGateway) {
    andConditions.push({ paymentGateway: filtersData.paymentGateway });
  }

  if (filtersData.minAmount) {
    andConditions.push({ amount: { gte: Number(filtersData.minAmount) } });
  }

  if (filtersData.maxAmount) {
    andConditions.push({ amount: { lte: Number(filtersData.maxAmount) } });
  }

  if (andConditions.length > 0) {
    whereConditions = {
      ...whereConditions,
      AND: andConditions,
    };
  }

  const count = await (prisma as any).payment.count({ where: whereConditions });
  const result = await (prisma as any).payment.findMany({
    where: whereConditions,
    orderBy,
    skip,
    take: limit,
    include: {
      order: true,
    },
  });

  return {
    meta: {
      page,
      limit,
      count,
    },
    data: result,
  };
};

const getSinglePayment = async (id: string) => {
  const result = await (prisma as any).payment.findUnique({
    where: { id },
    include: {
      order: true,
    },
  });

  if (!result) {
    throw new ApiError(status.NOT_FOUND, 'Payment not found');
  }

  return result;
};

const updatePayment = async (id: string, payload: IPaymentUpdate) => {
  const isExist = await (prisma as any).payment.findUnique({
    where: { id },
  });

  if (!isExist) {
    throw new ApiError(status.NOT_FOUND, 'Payment not found');
  }

  const result = await (prisma as any).payment.update({
    where: { id },
    data: payload,
  });

  return result;
};

export const PaymentService = {
  handleSuccess,
  handleFail,
  handleCancel,
  refundPayment,
  getAllPayments,
  getSinglePayment,
  updatePayment,
};