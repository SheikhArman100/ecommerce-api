import express from 'express';
import { userRoute } from '../modules/user/user.route';
import { authRoute } from '../modules/auth/auth.route';
import { categoryRoute } from '../modules/category/category.route';
import { flavorRoute } from '../modules/flavor/flavor.route';
import { sizeRoute } from '../modules/size/size.route';
import { productRoute } from '../modules/product/product.route';
import { WishlistRoute } from '../modules/wishlist/wishlist.route';
import { cartRoute } from '../modules/cart/cart.route';

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
  },{
    path:'/cart',
    route:cartRoute
  }
];

moduleRoutes.forEach(route => router.use(route.path, route.route));

export const ApplicationRouters = router;
