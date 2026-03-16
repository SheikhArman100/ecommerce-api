import express from 'express';
import validateRequest from '../../middleware/validateRequest';
import auth from '../../middleware/auth';
import { ENUM_USER_ROLE } from '../../enum/user';
import { CouponController } from './coupon.controller';
import { CouponValidation } from './coupon.validation';

const router = express.Router();

router.get('/', auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.USER), CouponController.getAllCoupons);

router.post(
  '/validate',
  auth(),
  CouponController.validateCoupon
);

router.get('/:id', auth(ENUM_USER_ROLE.ADMIN), CouponController.getCouponByID);

router.post(
  '/',
  auth(ENUM_USER_ROLE.ADMIN),
  validateRequest(CouponValidation.createCouponSchema),
  CouponController.createCoupon
);

router.patch(
  '/:id',
  auth(ENUM_USER_ROLE.ADMIN),
  validateRequest(CouponValidation.updateCouponSchema),
  CouponController.updateCoupon
);

router.delete('/:id', auth(ENUM_USER_ROLE.ADMIN), CouponController.deleteCouponByID);

export const couponRoute = router;
