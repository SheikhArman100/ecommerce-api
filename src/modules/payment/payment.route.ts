import express from 'express';

import { PaymentController } from './payment.controller';
import validateRequest from '../../middleware/validateRequest';
import { PaymentValidation } from './payment.validation';
import auth from '../../middleware/auth';

const router = express.Router();

// Initiate payment for an existing order (returns SSLCommerz GatewayPageURL)
router.post(
  '/initiate',
  auth(),
  validateRequest(PaymentValidation.initiatePayment),
  PaymentController.initiatePayment,
);

// These are redirection URLs called by SSLCommerz
// Payment is now initiated automatically inside POST /order
router.post('/success', PaymentController.handleSuccess);
router.post('/fail', PaymentController.handleFail);
router.post('/cancel', PaymentController.handleCancel);

// IPN (Instant Payment Notification)
router.post('/ipn', PaymentController.handleIPN);

router.post('/refund', auth('admin'), PaymentController.initiateRefund);
router.get(
  '/refund-status/:transactionId',
  auth('admin'),
  PaymentController.getRefundStatus,
);

router.get('/', auth('admin'), PaymentController.getAllPayments);
router.get('/:id', auth('admin'), PaymentController.getSinglePayment);
router.patch('/:id', auth('admin'), validateRequest(PaymentValidation.updatePayment), PaymentController.updatePayment);

export const paymentRoute = router;
