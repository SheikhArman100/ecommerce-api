import express from 'express';
import validateRequest from '../../middleware/validateRequest';
import auth from '../../middleware/auth';
import { OrderController } from './order.controller';
import { OrderValidation } from './order.validation';
import { ENUM_USER_ROLE } from '../../enum/user';

const router = express.Router();

// Create order from cart - authenticated users
router.post(
  '/',
  auth(),
  validateRequest(OrderValidation.createOrderSchema),
  OrderController.createOrder,
);

// Get all orders - admin only
router.get(
  '/',
  auth(ENUM_USER_ROLE.ADMIN),
  validateRequest(OrderValidation.getOrdersSchema),
  OrderController.getAllOrders,
);

// Get user's own orders - authenticated users
router.get(
  '/my-orders',
  auth(),
  OrderController.getUserOrders,
);

// Get single order by ID - admin or order owner
router.get(
  '/:orderId',
  auth(),
  OrderController.getSingleOrder,
);

// Update order status - admin only
router.patch(
  '/:orderId/status',
  auth(ENUM_USER_ROLE.ADMIN),
  validateRequest(OrderValidation.updateOrderStatusSchema),
  OrderController.updateOrderStatus,
);

export const orderRoute = router;
