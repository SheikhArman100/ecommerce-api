import express from 'express';
import { CategoryController } from './category.controller';
import validateRequest from '../../middleware/validateRequest';
import { CategoryValidation } from './category.validation';
import { ENUM_USER_ROLE } from '../../enum/user';
import auth from '../../middleware/auth';


const router = express.Router();

router
    .post('/',auth(ENUM_USER_ROLE.ADMIN),validateRequest(CategoryValidation.createCategorySchema), CategoryController.createCategory)
    .get('/', CategoryController.getAllCategories)
    .get('/:id', CategoryController.getCategoryByID)
    .patch('/:id',auth(ENUM_USER_ROLE.ADMIN),validateRequest(CategoryValidation.updateCategorySchema), CategoryController.updateCategory)
    .delete('/:id',auth(ENUM_USER_ROLE.ADMIN), CategoryController.deleteCategoryByID)

export const categoryRoute = router;
