import express from 'express';

import validateRequest from '../../middleware/validateRequest';
import { AuthValidation } from './auth.validation';
import passport from '../../middleware/passport';
import { AuthController } from './auth.controller';



const router = express.Router();

router
    .post('/signup', validateRequest(AuthValidation.SignupSchema), AuthController.signup)
    

export const authRoute = router;
