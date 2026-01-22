import express from 'express';
import { DashboardController } from './dashboard.controller';
import auth from '../../middleware/auth';
import { ENUM_USER_ROLE } from '../../enum/user';

const router = express.Router();

// All dashboard routes require admin authentication
router.get('/overview', auth(ENUM_USER_ROLE.ADMIN), DashboardController.getDashboardOverview);
router.get('/sales-analytics', auth(ENUM_USER_ROLE.ADMIN), DashboardController.getSalesAnalytics);
router.get('/product-performance', auth(ENUM_USER_ROLE.ADMIN), DashboardController.getProductPerformance);
router.get('/customer-analytics', auth(ENUM_USER_ROLE.ADMIN), DashboardController.getCustomerAnalytics);

export const dashboardRoute = router;
