import express from 'express';
import { FlavorController } from './flavor.controller';
import validateRequest from '../../middleware/validateRequest';
import { FlavorValidation } from './flavor.validation';
import { ENUM_USER_ROLE } from '../../enum/user';
import auth from '../../middleware/auth';


const router = express.Router();

// Public storefront feed (no auth): ACTIVE flavors for the shop's filter chips,
// display-safe fields only (GET /flavor also ships full creator/updater user
// rows — admin data that must not be public). Declared BEFORE '/:id' so the
// literal "public" is never parsed as an id (see category.route.ts).
router.get('/public', FlavorController.getPublicFlavors);

router
    .post('/',auth(ENUM_USER_ROLE.ADMIN),validateRequest(FlavorValidation.createFlavorSchema), FlavorController.createFlavor)
    .get('/',auth(ENUM_USER_ROLE.ADMIN), FlavorController.getAllFlavors)
    .get('/:id',auth(ENUM_USER_ROLE.ADMIN), FlavorController.getFlavorByID)
    .patch('/:id',auth(ENUM_USER_ROLE.ADMIN),validateRequest(FlavorValidation.updateFlavorSchema), FlavorController.updateFlavor)
    .delete('/:id',auth(ENUM_USER_ROLE.ADMIN), FlavorController.deleteFlavorByID)

export const flavorRoute = router;
