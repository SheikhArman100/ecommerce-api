import express from 'express';
import { CategoryController } from '../category/category.controller';
import validateRequest from '../../middleware/validateRequest';
import auth from '../../middleware/auth';
import { CartValidation } from './cartr.validation';



const router = express.Router();

router.post('/',auth(),validateRequest(CartValidation.createCartSchema), CategoryController.createCategory)
router.get('/', CategoryController.getAllCategories)
router.get('/:id', CategoryController.getCategoryByID)
router.delete('/:id', CategoryController.deleteCategoryByID)
router.patch('/:id', CategoryController.updateCategory);

export const categoryRoute = router;
