import express from 'express';

import validateRequest from '../../middleware/validateRequest';
import { AuthController } from './auth.controller';
import { AuthValidation } from './auth.validation';
import passport from '../../middleware/passport';
import auth from '../../middleware/auth';



const router = express.Router();

router.post('/signup', validateRequest(AuthValidation.SignupSchema), AuthController.signup),
router.put('/verify-email',validateRequest(AuthValidation.verifyEmailSchema),AuthController.verifyEmail)
router.post('/resend-verification', validateRequest(AuthValidation.resendVerificationSchema), AuthController.resendVerification)

router.post('/signin',validateRequest(AuthValidation.SigninSchema), passport.authenticate('local', { session: false }),AuthController.signin)

// Redirect to Google login page
router.get("/google", passport.authenticate("google"));

// Google callback route
router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
 AuthController.googleSignIn
);

router.get('/token', AuthController.updateToken);
router.post('/signout', AuthController.signOut);

router.get('/user', AuthController.checkUser);

//change password
router.put(
  '/change-password',
  auth(),
  validateRequest(AuthValidation.changePasswordSchema),
  AuthController.changePassword,
);

//forget password
router.post(
  '/forget-password',
  validateRequest(AuthValidation.forgetPasswordSchema),
  AuthController.forgetPassword,
);

//reset password
router.put(
  '/reset-Password',
  validateRequest(AuthValidation.resetPasswordSchema),
  AuthController.resetPassword,
);

export const authRoute = router;
