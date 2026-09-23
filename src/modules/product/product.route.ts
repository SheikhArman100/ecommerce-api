import express from 'express';
import { ENUM_USER_ROLE } from '../../enum/user';
import { FileUploadHelper } from '../../helpers/fileUploadHelpers';
import auth from '../../middleware/auth';
import transformFormData from '../../middleware/transformFormData';
import validateRequest from '../../middleware/validateRequest';
import { ProductController } from './product.controller';
import { ProductValidation } from './product.validation';

const router = express.Router();

router.post(
  '/',
  auth(ENUM_USER_ROLE.ADMIN),
  FileUploadHelper.uploadAny('product'),
  transformFormData,
  validateRequest(ProductValidation.createProductSchema),
  ProductController.createProduct
);

router.get('/',auth(ENUM_USER_ROLE.ADMIN), ProductController.getAllProducts);

// Public storefront feed (no auth): ACTIVE products for the shop grid, with
// display-safe fields only and the storefront's own filter set (see
// product.constant.ts). Declared as a literal before the /id|/slug prefixes so
// it can never be shadowed by them.
router.get('/public', ProductController.getPublicProducts);

// Public storefront feed: active + featured products (home page section).
// Kept above the other GET routes so the literal "featured" can never be
// swallowed by a future `/:param` route added here.
router.get('/featured', ProductController.getFeaturedProducts);

router.get('/id/:productId',auth(ENUM_USER_ROLE.ADMIN), ProductController.getSingleProduct);
router.get('/slug/:slug', ProductController.getSingleProductBySlug);


router.patch(
  '/:productId',
  auth(ENUM_USER_ROLE.ADMIN),
  FileUploadHelper.uploadAny('product'),
  transformFormData,
  validateRequest(ProductValidation.updateProductSchemaNew),
  ProductController.updateProduct
);

router.delete(
  '/:productId',
  auth(ENUM_USER_ROLE.ADMIN),
  ProductController.deleteProduct
);

export const productRoute = router;
