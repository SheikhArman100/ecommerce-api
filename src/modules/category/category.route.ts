import express from 'express';
import { CategoryController } from './category.controller';
import validateRequest from '../../middleware/validateRequest';
import { CategoryValidation } from './category.validation';
import { ENUM_USER_ROLE } from '../../enum/user';
import auth from '../../middleware/auth';
import { FileUploadHelper } from '../../helpers/fileUploadHelpers';
import transformFormData from '../../middleware/transformFormData';

const router = express.Router();

// ─── Public storefront routes (no auth) ─────────────────────────────────────
// Consumed by the storefront "Category Section"/navigation: active categories
// in display order, display-safe fields only (see category.service.ts).
// Declared BEFORE '/:id' so the literal "public" is never parsed as an id —
// the same reason the campaign module declares '/active' first.
router.get('/public', CategoryController.getPublicCategories);

// ─── Category management (admin) + full reads ───────────────────────────────
router
    .post(
        '/',
        auth(ENUM_USER_ROLE.ADMIN),
        FileUploadHelper.uploadSingle('category'),
        transformFormData,
        validateRequest(CategoryValidation.createCategorySchema),
        CategoryController.createCategory
    )
    .get('/',auth(ENUM_USER_ROLE.ADMIN), CategoryController.getAllCategories)
    .get('/:id',auth(ENUM_USER_ROLE.ADMIN), CategoryController.getCategoryByID)
    .patch(
        '/:id',
        auth(ENUM_USER_ROLE.ADMIN),
        FileUploadHelper.uploadSingle('category'),
        transformFormData,
        validateRequest(CategoryValidation.updateCategorySchema),
        CategoryController.updateCategory
    )
    .delete('/:id', auth(ENUM_USER_ROLE.ADMIN), CategoryController.deleteCategoryByID);

export const categoryRoute = router;
