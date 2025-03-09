import express from 'express';
import { FlavorController } from './flavor.controller';
import validateRequest from '../../middleware/validateRequest';
import { FlavorValidation } from './flavor.validation';
import { ENUM_USER_ROLE } from '../../enum/user';
import auth from '../../middleware/auth';


const router = express.Router();

router
    .post('/',auth(ENUM_USER_ROLE.ADMIN),validateRequest(FlavorValidation.createFlavorSchema), FlavorController.createFlavor)
    .get('/', FlavorController.getAllFlavors)
    .get('/:id', FlavorController.getFlavorByID)
    .patch('/:id',auth(ENUM_USER_ROLE.ADMIN),validateRequest(FlavorValidation.updateFlavorSchema), FlavorController.updateFlavor)
    .delete('/:id',auth(ENUM_USER_ROLE.ADMIN), FlavorController.deleteFlavorByID)

export const flavorRoute = router;
