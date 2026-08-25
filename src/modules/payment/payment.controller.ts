import { Request, Response } from 'express';
import catchAsync from '../../shared/catchAsync';
import { PaymentService } from './payment.service';
import sendResponse from '../../shared/sendResponse';
import status from 'http-status';
import config from '../../config';
import pick from '../../helpers/pick';
import { paymentFilterableFields } from './payment.constant';
import { paginationFields } from '../../constant';

const handleSuccess = catchAsync(async (req: Request, res: Response) => {
  const { tran_id, val_id } = req.body.tran_id ? req.body : req.query;
  const result = await PaymentService.handleSuccess(tran_id as string, val_id as string);

  if (result.success) {
    res.redirect(`${config.frontend_url}/checkout/success?tran_id=${tran_id}`);
  } else {
    res.redirect(`${config.frontend_url}/checkout/fail?tran_id=${tran_id}`);
  }
});

const handleFail = catchAsync(async (req: Request, res: Response) => {
  const { tran_id } = req.body.tran_id ? req.body : req.query;
  await PaymentService.handleFail(tran_id as string);
  res.redirect(`${config.frontend_url}/checkout/fail?tran_id=${tran_id}`);
});

const handleCancel = catchAsync(async (req: Request, res: Response) => {
  const { tran_id } = req.body.tran_id ? req.body : req.query;
  await PaymentService.handleCancel(tran_id as string);
  res.redirect(`${config.frontend_url}/checkout/cancel?tran_id=${tran_id}`);
});

const handleIPN = catchAsync(async (req: Request, res: Response) => {
  // SSLCommerz calls this asynchronously
  console.log('IPN Received:', req.body);
  const { tran_id, val_id, status: paymentStatus } = req.body;
  
  if (paymentStatus === 'VALID' || paymentStatus === 'AUTHENTICATED') {
     await PaymentService.handleSuccess(tran_id, val_id);
  }
  
  res.status(200).send('OK');
});

const initiateRefund = catchAsync(async (req: Request, res: Response) => {
  const { orderId, refundAmount, refundRemark } = req.body;
  const result = await PaymentService.refundPayment(
    Number(orderId),
    Number(refundAmount),
    refundRemark
  );

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Refund initiated successfully',
    data: result,
  });
});

const getAllPayments = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, paymentFilterableFields);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await PaymentService.getAllPayments(filters, paginationOptions);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Payments retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getSinglePayment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await PaymentService.getSinglePayment(id as string);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Payment retrieved successfully',
    data: result,
  });
});

const updatePayment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await PaymentService.updatePayment(id as string, req.body);

  sendResponse(res, {
    statusCode: status.OK,
    success: true,
    message: 'Payment updated successfully',
    data: result,
  });
});

export const PaymentController = {
  handleSuccess,
  handleFail,
  handleCancel,
  handleIPN,
  initiateRefund,
  getAllPayments,
  getSinglePayment,
  updatePayment,
};