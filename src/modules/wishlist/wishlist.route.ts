import express from 'express';
import { WishlistController } from './wishlist.controller';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { WishlistValidation } from './wishlist.validation';
import { ENUM_USER_ROLE } from '../../enum/user';



const router = express.Router();

router.post('/', auth(), validateRequest(WishlistValidation.createWishlistSchema), WishlistController.createWishlist);
router.get('/', auth(), WishlistController.getAllWishlists);
router.get('/:id', auth(), WishlistController.getWishlistByID);
router.patch('/:id', auth(), validateRequest(WishlistValidation.updateWishlistSchema), WishlistController.updateWishlist);
router.delete('/:id', auth(), WishlistController.deleteWishlistByID);

export const WishlistRoute = router;
