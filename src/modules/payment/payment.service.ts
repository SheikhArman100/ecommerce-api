import { prisma } from '../../client';
import { SSLCommerzService } from './sslcommerz.service';
import ApiError from '../../errors/ApiError';
import status from 'http-status';
import { PaymentStatus, OrderStatus } from '../../generated/enums';
import { Prisma } from '../../generated/client';
import { IPaymentFilters, IPaymentUpdate } from './payment.interface';
import { IPaginationOptions } from '../../interfaces/common';
import { calculatePagination } from '../../helpers/paginationHelper';
import { paymentSearchableFields } from './payment.constant';
import { OrderService, createStatusHistory } from '../order/order.service';
import { NotificationService } from '../notification/notification.service';
import { UserInfoFromToken } from '../../types/common';
import { ENUM_USER_ROLE } from '../../enum/user';
import config from '../../config';
import { generateTransactionId } from '../../helpers/transactionId';

const initiatePayment = async (
  orderId: number,
  userInfo: UserInfoFromToken,
) => {
  // Fetch the order with its user (order is a "shell" until payment succeeds)
  const order: any = await (prisma as any).order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        include: { detail: true },
      },
    },
  });

  if (!order) {
    throw new ApiError(status.NOT_FOUND, 'Order not found');
  }

  // Only the order owner (or an admin) can initiate its payment
  const isAdmin = userInfo.role === ENUM_USER_ROLE.ADMIN;
  if (!isAdmin && order.userId !== Number(userInfo.id)) {
    throw new ApiError(
      status.FORBIDDEN,
      'You are not authorized to pay for this order',
    );
  }

  // Order must still be payable
  if (order.status === 'Paid' || order.paymentStatus === PaymentStatus.PAID) {
    throw new ApiError(status.BAD_REQUEST, 'Order is already paid');
  }
  if (order.status === 'Failed' || order.status === 'Cancelled') {
    throw new ApiError(status.BAD_REQUEST, `Order is ${order.status.toLowerCase()} and cannot be paid`);
  }

  // SSLCommerz gateway sessions expire after a short while — reusing a stale
  // GatewayPageURL shows "There is an error to process your payment!". So any
  // previous PENDING payment for this order is superseded (marked FAILED) and
  // a fresh session is created below.
  const previousPendingPayments: any[] = await (prisma as any).payment.findMany({
    where: { orderId, paymentStatus: PaymentStatus.PENDING },
  });
  await (prisma as any).payment.updateMany({
    where: { orderId, paymentStatus: PaymentStatus.PENDING },
    data: { paymentStatus: PaymentStatus.FAILED },
  });

  // Carry over the cart snapshot from the superseded payment (if any) — it is
  // required later by createOrderItemsFromSnapshot() when payment succeeds.
  const carriedSnapshot = previousPendingPayments.find(
    (p) => (p.gatewayResponse as any)?.cartSnapshot?.items?.length > 0,
  )?.gatewayResponse?.cartSnapshot;

  // Generate transaction ID (Tran-YYYYMMDD-XXXXXX)
  const tranId = generateTransactionId();

  // Build SSLCommerz payload from order + user
  const sslPaymentData = {
    total_amount: order.payableAmount ?? order.totalAmount,
    currency: 'BDT' as const,
    tran_id: tranId,
    success_url: `${config.backend_url}/api/v1/payment/success`,
    fail_url: `${config.backend_url}/api/v1/payment/fail`,
    cancel_url: `${config.backend_url}/api/v1/payment/cancel`,
    ipn_url: `${config.backend_url}/api/v1/payment/ipn`,
    shipping_method: 'Courier' as const,
    product_name: `Order ${order.orderNumber}`,
    product_category: 'Ecommerce',
    product_profile: 'general',
    cus_name: order.user.name,
    cus_email: order.user.email,
    cus_add1: order.user.detail?.address || 'N/A',
    cus_add2: order.user.detail?.address || 'N/A',
    cus_city: order.user.detail?.city || 'N/A',
    cus_state: order.user.detail?.city || 'N/A',
    cus_postcode: '1000',
    cus_country: 'Bangladesh',
    cus_phone: order.user.phoneNumber,
    cus_fax: order.user.phoneNumber,
    ship_name: order.user.name,
    ship_add1: order.user.detail?.address || 'N/A',
    ship_add2: order.user.detail?.address || 'N/A',
    ship_city: order.user.detail?.city || 'N/A',
    ship_state: order.user.detail?.city || 'N/A',
    ship_postcode: '1000',
    ship_country: 'Bangladesh',
  };

  const sslResponse = await SSLCommerzService.initiatePayment(sslPaymentData) as any;

  console.log('SSLCommerz Initiation Response:', sslResponse);

  if (sslResponse?.status !== 'SUCCESS') {
    throw new ApiError(status.BAD_REQUEST, 'Payment initiation failed');
  }

  // Store only what we need from the initiation response — the full response
  // (gateway list, logos, session URLs) is heavy and useless after redirect.
  // cartSnapshot is REQUIRED: createOrderItemsFromSnapshot() reads it when the
  // payment succeeds. GatewayPageURL kept for debugging re-initiation issues.
  const payment = await (prisma as any).payment.create({
    data: {
      orderId: order.id,
      transactionId: tranId,
      amount: order.payableAmount ?? order.totalAmount,
      paymentStatus: PaymentStatus.PENDING,
      gatewayResponse: {
        GatewayPageURL: sslResponse.GatewayPageURL,
        ...(carriedSnapshot && { cartSnapshot: carriedSnapshot }),
      },
    },
  });

  return {
    GatewayPageURL: sslResponse.GatewayPageURL,
    transactionId: payment.transactionId,
    paymentId: payment.id,
    orderId: order.id,
    amount: payment.amount,
  };
};

const handleSuccess = async (tran_id: string, val_id: string) => {
  // Idempotency guard: /success (browser redirect) and /ipn (server-to-server,
  // possibly retried) can both fire for the same tran_id. If this payment was
  // already processed, do nothing so order items/emails are never duplicated.
  const existingPayment: any = await (prisma as any).payment.findUnique({
    where: { transactionId: tran_id },
  });
  if (!existingPayment) {
    return { success: false };
  }
  if (existingPayment.paymentStatus === PaymentStatus.PAID) {
    return { success: true };
  }

  const verificationResponse = await SSLCommerzService.verifyPayment(val_id) as any;

  if (verificationResponse?.status === 'VALID' || verificationResponse?.status === 'AUTHENTICATED') {
    // Capture order info for email notifications (payment variable is scoped inside the transaction)
    let orderInfo: any = null;

    await prisma.$transaction(async (tx: any) => {
      // 1. Create order items from cart snapshot, decrement stock, clear cart.
      // Runs FIRST and inside the transaction: if the snapshot is missing or
      // stock fails, everything rolls back — so an order can never end up
      // marked PAID with empty items.
      await OrderService.createOrderItemsFromSnapshot(tran_id, tx);

      // 2. Update payment record
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
        orderNumber: payment.order.orderNumber,
        userEmail: payment.order.user.email,
        userName: payment.order.user.name,
        payableAmount: payment.order.payableAmount,
        transactionId: payment.transactionId,
      };

      // 3. Update order status to Paid
      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          status: 'Paid',
          paymentStatus: PaymentStatus.PAID,
        },
      });

      // Record Paid in the status timeline
      await createStatusHistory(tx, payment.orderId, OrderStatus.Paid);
    });

    // 4. Send payment success email (after transaction committed)
    if (orderInfo) {
      NotificationService.sendPaymentSuccessEmail(orderInfo.userEmail, {
        userName: orderInfo.userName,
        orderId: orderInfo.orderNumber,
        payableAmount: orderInfo.payableAmount,
        transactionId: orderInfo.transactionId,
      }).catch(err => console.error('Payment Success Email Error:', err));
    }

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
          orderId: completedOrder.orderNumber,
          payableAmount: completedOrder.payableAmount,
          discountAmount: completedOrder.discountAmount,
          deliveryCharge: completedOrder.deliveryCharge,
          items: completedOrder.items,
        }).catch(err => console.error('Order Confirmation Email Error:', err));

        NotificationService.sendAdminOrderAlert({
          orderId: completedOrder.id, // numeric id — used for the admin panel link
          orderNumber: completedOrder.orderNumber, // shown in the email
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

    // Record Failed in the status timeline
    await createStatusHistory(tx, payment.orderId, OrderStatus.Failed);
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
    // Roll back the coupon consumed by this shell order (floored at 0),
    // otherwise abandoned checkouts permanently burn coupon usage.
    if (payment.order.couponId) {
      await tx.coupon.updateMany({
        where: { id: payment.order.couponId, usedCount: { gt: 0 } },
        data: { usedCount: { decrement: 1 } },
      });
    }

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
    // Fetch the order's coupon before deletion so usage can be rolled back
    const order = await tx.order.findUnique({
      where: { id: payment.orderId },
      select: { couponId: true },
    });

    // Roll back the coupon consumed by this shell order (floored at 0)
    if (order?.couponId) {
      await tx.coupon.updateMany({
        where: { id: order.couponId, usedCount: { gt: 0 } },
        data: { usedCount: { decrement: 1 } },
      });
    }

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

const getRefundStatus = async (tranId: string) => {
  const payment: any = await (prisma as any).payment.findUnique({
    where: { transactionId: tranId },
  });

  if (!payment) {
    throw new ApiError(status.NOT_FOUND, 'Payment not found');
  }

  const refundRefId = (payment.gatewayResponse as any)?.refund_response?.refund_ref_id;
  if (!refundRefId) {
    throw new ApiError(
      status.BAD_REQUEST,
      'No refund has been initiated for this payment',
    );
  }

  const refundStatus = await SSLCommerzService.queryRefundStatus(refundRefId) as any;

  return {
    transactionId: payment.transactionId,
    paymentStatus: payment.paymentStatus,
    gatewayRefundStatus: refundStatus,
  };
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

  if (payment.paymentStatus === PaymentStatus.REFUNDED) {
    throw new ApiError(status.BAD_REQUEST, 'This payment has already been refunded');
  }

  // Refund amount must not exceed the amount actually paid
  if (refundAmount > payment.amount) {
    throw new ApiError(
      status.BAD_REQUEST,
      `Refund amount (${refundAmount}) must not be more than the customer's transaction amount (${payment.amount})`,
    );
  }

  const valId = (payment.validationResponse as any)?.val_id;
  if (!valId) {
    throw new ApiError(
      status.BAD_REQUEST,
      'Validation data missing for this payment (val_id not found)',
    );
  }

  const refundResponse = await SSLCommerzService.initiateRefund({
    refund_trans_id: valId,
    refund_amount: refundAmount,
    refund_remarks: refundRemark,
    bank_tran_id: payment.bankTranId,
  }) as any;

  

  if (refundResponse?.status === 'success') {
    await prisma.$transaction(async (tx: any) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          paymentStatus: PaymentStatus.REFUNDED,
          // Replace with just the refund response — the cart snapshot is no
          // longer needed once order items have been created.
          gatewayResponse: {
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
    console.error('SSLCommerz Refund Rejected:', refundResponse);
    throw new ApiError(
      status.BAD_REQUEST,
      refundResponse?.error ||
        refundResponse?.failedreason ||
        `Refund initiation failed (gateway status: ${refundResponse?.status ?? 'unknown'})`,
    );
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
      OR: [
        // Relation field — searched via the related order
        {
          order: {
            orderNumber: {
              contains: searchTerm,
              mode: 'insensitive' as const,
            },
          },
        },
        // Flat fields on the payment record itself
        ...paymentSearchableFields
          .filter((field) => field !== 'order.orderNumber')
          .map((field) => ({
            [field]: {
              contains: searchTerm,
              mode: 'insensitive' as const,
            },
          })),
      ],
    };
  }

  const andConditions: Prisma.PaymentWhereInput[] = [];

  if (filtersData.orderId) {
    andConditions.push({ orderId: Number(filtersData.orderId) });
  }

  // Allow admins to find payments by the human-friendly order number
  if (filtersData.orderNumber) {
    andConditions.push({
      order: { orderNumber: { contains: filtersData.orderNumber, mode: 'insensitive' as const } },
    });
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

  // Strip the heavy JSON blobs from list responses — they're multi-KB each and
  // only needed in the single-payment detail view (gateway audit log).
  // Keep a lightweight `paymentMethod` derived from the validation response
  // (SSLCommerz `card_type`, e.g. BKASH / VISA / BANKASIA-...), set after a
  // successful payment; null for pending/failed attempts.
  const data = result.map(({ gatewayResponse, validationResponse, ...rest }: any) => ({
    ...rest,
    paymentMethod: validationResponse?.card_type ?? null,
  }));

  return {
    meta: {
      page,
      limit,
      count,
    },
    data,
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

// Manual override policy: admins may only move a payment to statuses that are
// honest about money. PAID requires the order-completion flow (or a real
// gateway callback); REFUNDED must go through the SSLCommerz S2S refund flow,
// never a hand-edit. PAID/REFUNDED payments are frozen — no status override.
const ALLOWED_MANUAL_STATUS_CHANGES: Record<PaymentStatus, PaymentStatus[]> = {
  [PaymentStatus.PENDING]: [PaymentStatus.FAILED, PaymentStatus.CANCELLED, PaymentStatus.PAID],
  [PaymentStatus.FAILED]: [PaymentStatus.CANCELLED, PaymentStatus.PAID],
  [PaymentStatus.CANCELLED]: [PaymentStatus.PAID],
  [PaymentStatus.PAID]: [],
  [PaymentStatus.REFUNDED]: [],
};

const updatePayment = async (id: string, payload: IPaymentUpdate) => {
  const isExist = await (prisma as any).payment.findUnique({
    where: { id },
  });

  if (!isExist) {
    throw new ApiError(status.NOT_FOUND, 'Payment not found');
  }

  // Enforce the manual override policy (the UI only offers valid options, but
  // the API is the source of truth — a crafted request must not bypass it).
  if (
    payload.paymentStatus &&
    payload.paymentStatus !== isExist.paymentStatus &&
    !ALLOWED_MANUAL_STATUS_CHANGES[isExist.paymentStatus as PaymentStatus]?.includes(
      payload.paymentStatus,
    )
  ) {
    const hint =
      isExist.paymentStatus === PaymentStatus.PAID
        ? 'Paid payments cannot be manually overridden — use the refund flow instead'
        : isExist.paymentStatus === PaymentStatus.REFUNDED
          ? 'Refunded payments are final and cannot be overridden'
          : `Manual override from ${isExist.paymentStatus} to ${payload.paymentStatus} is not allowed`;
    throw new ApiError(status.BAD_REQUEST, hint);
  }

  // Manually marking a payment PAID completes the (shell) order atomically —
  // otherwise the order would become "paid" with no items and its cart never
  // cleared. Reuses the exact same logic as the real gateway success path.
  if (payload.paymentStatus === PaymentStatus.PAID) {
    const order: any = await (prisma as any).order.findUnique({
      where: { id: isExist.orderId },
    });

    if (order.paymentStatus === PaymentStatus.PAID || order.status === OrderStatus.Paid) {
      throw new ApiError(status.BAD_REQUEST, 'Order is already paid');
    }

    await prisma.$transaction(async (tx: any) => {
      // 1. Create order items from cart snapshot, decrement stock, clear cart.
      // Throws + rolls back if the snapshot is missing, so we never end up
      // with a manually-paid order that has no items.
      await OrderService.createOrderItemsFromSnapshot(isExist.transactionId, tx);

      // 2. Update payment record to PAID
      await tx.payment.update({
        where: { id: isExist.id },
        data: {
          paymentStatus: PaymentStatus.PAID,
          ...(payload.bankTranId ? { bankTranId: payload.bankTranId } : {}),
        },
      });

      // 3. Mark the order Paid
      await tx.order.update({
        where: { id: isExist.orderId },
        data: {
          status: OrderStatus.Paid,
          paymentStatus: PaymentStatus.PAID,
        },
      });

      // 4. Record Paid in the status timeline
      await createStatusHistory(tx, isExist.orderId, OrderStatus.Paid);
    });

    return await (prisma as any).payment.findUnique({
      where: { id: isExist.id },
    });
  }

  // Non-PAID manual overrides are pure record-keeping (e.g. correcting a bank
  // tran id, or flipping a genuinely-dead session to FAILED/CANCELLED).
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
  getRefundStatus,
  getAllPayments,
  getSinglePayment,
  updatePayment,
};