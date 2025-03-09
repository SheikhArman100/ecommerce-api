import express from 'express';
import { SizeController } from './size.controller';
import validateRequest from '../../middleware/validateRequest';
import { SizeValidation } from './size.validation';
import { ENUM_USER_ROLE } from '../../enum/user';
import auth from '../../middleware/auth';


const router = express.Router();

router
    .post('/',auth(ENUM_USER_ROLE.ADMIN),validateRequest(SizeValidation.createSizeSchema), SizeController.createSize)
    .get('/', SizeController.getAllSizes)
    .get('/:id', SizeController.getSizeByID)
    .patch('/:id',auth(ENUM_USER_ROLE.ADMIN),validateRequest(SizeValidation.updateSizeSchema), SizeController.updateSize)
    .delete('/:id',auth(ENUM_USER_ROLE.ADMIN), SizeController.deleteSizeByID)

export const sizeRoute = router;
