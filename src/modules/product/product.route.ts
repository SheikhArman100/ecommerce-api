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

router.get('/', ProductController.getAllProducts);

router.get('/id/:productId', ProductController.getSingleProduct);
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
