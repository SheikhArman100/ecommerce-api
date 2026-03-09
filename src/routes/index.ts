import express from 'express';
import { userRoute } from '../modules/user/user.route';
import { authRoute } from '../modules/auth/auth.route';
import { categoryRoute } from '../modules/category/category.route';
import { flavorRoute } from '../modules/flavor/flavor.route';
import { sizeRoute } from '../modules/size/size.route';
import { productRoute } from '../modules/product/product.route';
import { WishlistRoute } from '../modules/wishlist/wishlist.route';
import { cartRoute } from '../modules/cart/cart.route';
import { orderRoute } from '../modules/order/order.route';
import { reviewRoute } from '../modules/review/review.route';
import { dashboardRoute } from '../modules/dashboard/dashboard.route';
import { couponRoute } from '../modules/coupon/coupon.route';
import { paymentRoute } from '../modules/payment/payment.route';
import { CampaignRoutes } from '../modules/campaign/campaign.route';

const router = express.Router();

interface Route {
  path: string;
  route: express.Router;
}

const moduleRoutes: Route[] = [
  {
    path: '/auth',
    route: authRoute,
  },
  {
    path: '/user',
    route: userRoute,
  },
  {
    path: '/category',
    route: categoryRoute,
  },
  {
    path: '/flavor',
    route: flavorRoute,
  },
  {
    path: '/size',
    route: sizeRoute,
  },
  {
    path: '/product',
    route: productRoute,
  },
  {
    path:'/wishlist',
    route:WishlistRoute
  },
  {
    path:'/cart',
    route:cartRoute
  },
  {
    path: '/order',
    route: orderRoute,
  },
  {
    path: '/review',
    route: reviewRoute,
  },
  {
    path: '/dashboard',
    route: dashboardRoute,
  },
  {
    path: '/coupon',
    route: couponRoute,
  },
  {
    path: '/payment',
    route: paymentRoute,
  },
  {
    path: '/campaigns',
    route: CampaignRoutes,
  },
];

moduleRoutes.forEach(route => router.use(route.path, route.route));

export const ApplicationRouters = router;
