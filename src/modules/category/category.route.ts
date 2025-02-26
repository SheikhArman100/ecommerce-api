import express from 'express';
import { CategoryController } from './category.controller';
import validateRequest from '../../middleware/validateRequest';
import { CategoryValidation } from './category.validation';
import { ENUM_USER_ROLE } from '../../enum/user';
import auth from '../../middleware/auth';


const router = express.Router();

router
    .post('/create-category',auth(ENUM_USER_ROLE.ADMIN),validateRequest(CategoryValidation.createCategorySchema), CategoryController.createCategory)
    .get('/', CategoryController.getAllCategories)
    .get('/:id', CategoryController.getCategoryByID)
    .delete('/:id',auth(ENUM_USER_ROLE.ADMIN), CategoryController.deleteCategoryByID)
    .patch('/:id',auth(ENUM_USER_ROLE.ADMIN), CategoryController.updateCategory);

export const categoryRoute = router;
