import express from 'express';

import validateRequest from '../../middleware/validateRequest';
import auth from '../../middleware/auth';
import { CartValidation } from './cart.validation';
import { CartController } from './cart.controller';
import { ENUM_USER_ROLE } from '../../enum/user';



const router = express.Router();

router.post('/',auth(),validateRequest(CartValidation.createCartSchema), CartController.createCart);
router.get('/',auth(ENUM_USER_ROLE.ADMIN), CartController.getAllCarts);
router.get('/user',auth(), CartController.getSingleCart)
router.get('/:cartId',auth(ENUM_USER_ROLE.ADMIN), CartController.getCartByID);
router.delete('/:cartItemId',auth(), CartController.deleteCartItemByID)
router.patch('/:cartItemId',auth(),validateRequest(CartValidation.updateCartItemSchema), CartController.updateCartItemByID);

export const cartRoute = router;
