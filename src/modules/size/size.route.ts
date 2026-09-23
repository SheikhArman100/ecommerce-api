import express from 'express';
import { SizeController } from './size.controller';
import validateRequest from '../../middleware/validateRequest';
import { SizeValidation } from './size.validation';
import { ENUM_USER_ROLE } from '../../enum/user';
import auth from '../../middleware/auth';


const router = express.Router();

// Public storefront feed (no auth): ACTIVE sizes for the shop's filter chips,
// display-safe fields only (GET /size also ships full creator/updater user
// rows — admin data that must not be public). Declared BEFORE '/:id' so the
// literal "public" is never parsed as an id (see category.route.ts).
router.get('/public', SizeController.getPublicSizes);

router
    .post('/',auth(ENUM_USER_ROLE.ADMIN),validateRequest(SizeValidation.createSizeSchema), SizeController.createSize)
    .get('/',auth(ENUM_USER_ROLE.ADMIN), SizeController.getAllSizes)
    .get('/:id',auth(ENUM_USER_ROLE.ADMIN), SizeController.getSizeByID)
    .patch('/:id',auth(ENUM_USER_ROLE.ADMIN),validateRequest(SizeValidation.updateSizeSchema), SizeController.updateSize)
    .delete('/:id',auth(ENUM_USER_ROLE.ADMIN), SizeController.deleteSizeByID)

export const sizeRoute = router;
