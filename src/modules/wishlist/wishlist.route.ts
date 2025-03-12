import express from 'express';
import { WishlistController } from './wishlist.controller';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { WishlistValidation } from './wishlist.validation';
import { ENUM_USER_ROLE } from '../../enum/user';



const router = express.Router();

router.post('/',auth(),validateRequest(WishlistValidation.createWishlistSchema), WishlistController.createWishlist)
router.get('/', WishlistController.getAllWishlists)
router.get('/:id', WishlistController.getWishlistByID)
router.delete('/:id',auth(), WishlistController.deleteWishlistByID)
router.patch('/:id', WishlistController.updateWishlist);

export const WishlistRoute = router;
