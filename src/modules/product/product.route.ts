import express from 'express';
import auth from '../../middleware/auth';
import { ENUM_USER_ROLE } from '../../enum/user';
import { FileUploadHelper } from '../../helpers/fileUploadHelpers';
import validateRequest from '../../middleware/validateRequest';
import jsonParse from '../../middleware/jsonParse';
import { ProductValidation } from './product.validation';
import { ProductController } from './product.controller';
const router = express.Router();


router.post(
    '/create-product',
    auth(ENUM_USER_ROLE.ADMIN),
    FileUploadHelper.uploadMultiple('product', 'files', 10),
    jsonParse,
    validateRequest(ProductValidation.createProductSchema),
    ProductController.createProduct
  );

export const ProductReportRoutes = router;