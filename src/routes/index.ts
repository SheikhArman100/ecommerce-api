import express from 'express';
import { userRoute } from '../modules/user/user.route';
import { authRoute } from '../modules/auth/auth.route';
import { categoryRoute } from '../modules/category/category.route';

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
  }
];

moduleRoutes.forEach(route => router.use(route.path, route.route));

export const ApplicationRouters = router;
