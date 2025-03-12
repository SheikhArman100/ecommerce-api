import express from 'express';
import { WishlistController } from './wishlist.controller';
import auth from '../../middleware/auth';
import validateRequest from '../../middleware/validateRequest';
import { WishlistValidation } from './wishlist.validation';



const router = express.Router();

router.post('/',auth(),validateRequest(WishlistValidation.createWishlistSchema), WishlistController.createWishlist)
router.get('/', WishlistController.getAllWishlists)
router.get('/:id', WishlistController.getWishlistByID)
router.delete('/:id', WishlistController.deleteWishlistByID)
router.patch('/:id', WishlistController.updateWishlist);

export const WishlistRoute = router;
