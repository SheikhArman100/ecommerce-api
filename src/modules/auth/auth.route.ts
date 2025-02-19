import express from 'express';

import validateRequest from '../../middleware/validateRequest';
import { AuthController } from './auth.controller';
import { AuthValidation } from './auth.validation';
import passport from '../../middleware/passport';



const router = express.Router();

router.post('/signup', validateRequest(AuthValidation.SignupSchema), AuthController.signup),
router.put('/verify-email',validateRequest(AuthValidation.verifyEmailSchema),AuthController.verifyEmail)
router.post('/signin',validateRequest(AuthValidation.SigninSchema), passport.authenticate('local', { session: false }),AuthController.signin)

    

export const authRoute = router;
