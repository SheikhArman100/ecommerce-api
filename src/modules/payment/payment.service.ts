import { prisma } from '../../client';
import { SSLCommerzService } from './sslcommerz.service';
import ApiError from '../../errors/ApiError';
import status from 'http-status';
import { PaymentStatus } from '../../generated/enums';
import { nanoid } from 'nanoid';
import config from '../../config';
import { OrderItem, Prisma } from '../../generated/client';
import { IPaymentFilters, IPaymentUpdate } from './payment.interface';
import { IPaginationOptions } from '../../interfaces/common';
import { calculatePagination } from '../../helpers/paginationHelper';
import { paymentSearchableFields } from './payment.constant';
import { NotificationService } from '../notification/notification.service';

const initiatePayment = async (orderId: number) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        include: {
          detail: true,
        },
      },
      items: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!order) {
    throw new ApiError(status.NOT_FOUND, 'Order not found');
  }

  const tranId = `TRAN-${nanoid(10)}`;
  const payableAmount = order.payableAmount || order.totalAmount;

  const paymentData = {
    total_amount: payableAmount,
    currency: 'BDT' as const,
    tran_id: tranId,
    success_url: `${config.app_base_url}/api/v1/payment/success?tran_id=${tranId}`,
    fail_url: `${config.app_base_url}/api/v1/payment/fail?tran_id=${tranId}`,
    cancel_url: `${config.app_base_url}/api/v1/payment/cancel?tran_id=${tranId}`,
    ipn_url: `${config.app_base_url}/api/v1/payment/ipn`,
    shipping_method: 'Courier' as const,
    product_name: order.items.map((item: OrderItem) => item.productTitle).join(', '),
    product_category: 'Ecommerce',
    product_profile: 'general',
    cus_name: order.user.name,
    cus_email: order.user.email,
    cus_add1: order.user.detail?.address || 'N/A',
    cus_city: order.user.detail?.city || 'N/A',
    cus_postcode: '1000',
    cus_country: 'Bangladesh',
    cus_phone: order.user.phoneNumber,
  };

  const sslResponse = await SSLCommerzService.initiatePayment(paymentData) as any;

  if (sslResponse?.status === 'SUCCESS') {
    await (prisma as any).payment.create({
      data: {
        orderId: order.id,
        transactionId: tranId,
        amount: payableAmount,
        paymentStatus: PaymentStatus.PENDING,
        gatewayResponse: sslResponse,
      },
    });
    return (sslResponse as any).GatewayPageURL;
  } else {
    throw new ApiError(status.BAD_REQUEST, 'Payment initiation failed');
  }
};

const handleSuccess = async (tran_id: string, val_id: string) => {
  const verificationResponse = await SSLCommerzService.verifyPayment(val_id) as any;

  if (verificationResponse?.status === 'VALID' || verificationResponse?.status === 'AUTHENTICATED') {
    await prisma.$transaction(async (tx: any) => {
      const payment = await tx.payment.update({
        where: { transactionId: tran_id },
        data: {
          paymentStatus: PaymentStatus.PAID,
          bankTranId: verificationResponse?.bank_tran_id,
          validationResponse: verificationResponse,
        },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          status: 'Paid',
          paymentStatus: PaymentStatus.PAID,
        },
      });

      // Notify User
      NotificationService.sendPaymentSuccessEmail(payment.order.user.email, {
        userName: payment.order.user.name,
        orderId: payment.orderId,
        payableAmount: payment.order.payableAmount,
        transactionId: payment.transactionId,
      }).catch(err => console.error('Payment Success Email Error:', err));
    });
    return { success: true };
  } else {
    await (prisma as any).payment.update({
      where: { transactionId: tran_id },
      data: {
        paymentStatus: PaymentStatus.FAILED,
        validationResponse: verificationResponse,
      },
    });
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
          items: true,
        },
      },
    },
  });

  if (!payment || !payment.order) return;

  await prisma.$transaction(async (tx: any) => {
    // 1. Get or create user cart
    let userCart = await tx.cart.findUnique({
      where: { userId: payment.order.userId },
    });

    if (!userCart) {
      userCart = await tx.cart.create({
        data: { userId: payment.order.userId },
      });
    }

    // 2. Restore Stock and Cart Items
    for (const item of payment.order.items) {
      // Restore Stock
      await tx.productFlavorSize.update({
        where: {
          productId_flavorId_sizeId: {
            productId: item.productId,
            flavorId: item.flavorId,
            sizeId: item.sizeId,
          },
        },
        data: {
          stock: { increment: item.quantity },
        },
      });

      // Restore to Cart
      await tx.cartItem.create({
        data: {
          cartId: userCart.id,
          productId: item.productId,
          flavorId: item.flavorId,
          sizeId: item.sizeId,
          quantity: item.quantity,
        },
      });
    }

    // 3. Delete Payment and Order (Cleanup)
    await tx.payment.delete({
      where: { id: payment.id },
    });

    await tx.order.delete({
      where: { id: payment.order.id },
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
  initiatePayment,
  handleSuccess,
  handleFail,
  handleCancel,
  refundPayment,
  getAllPayments,
  getSinglePayment,
  updatePayment,
};
