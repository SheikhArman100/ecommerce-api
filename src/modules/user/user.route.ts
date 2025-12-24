import express from 'express';
import { UserController } from './user.controller';
import validateRequest from '../../middleware/validateRequest';
import { UserValidation } from './user.validation';
import { ENUM_USER_ROLE } from '../../enum/user';
import auth from '../../middleware/auth';
import { FileUploadHelper } from '../../helpers/fileUploadHelpers';
import transformFormData from '../../middleware/transformFormData';

const router = express.Router();

// User self-access routes (users can view/edit their own profile)
router.get('/profile', auth(), UserController.getMyProfile);
router.patch(
  '/profile',
  auth(),
  FileUploadHelper.uploadSingle('user'),
  transformFormData,
  validateRequest(UserValidation.updateProfileSchema),
  UserController.updateMyProfile,
);

// Admin-only routes for managing all users
router.post(
  '/',
  auth(ENUM_USER_ROLE.ADMIN),
  FileUploadHelper.uploadSingle('user'),
  transformFormData,
  validateRequest(UserValidation.createUserSchema),
  UserController.createUser,
);
router.get('/', auth(ENUM_USER_ROLE.ADMIN), UserController.getAllUsers);
router.get('/:id', auth(ENUM_USER_ROLE.ADMIN), UserController.getUserByID);
router.patch(
  '/:id',
  auth(ENUM_USER_ROLE.ADMIN),
  FileUploadHelper.uploadSingle('user'),
  transformFormData,
  validateRequest(UserValidation.updateUserSchema),
  UserController.updateUser,
);
router.delete(
  '/:id',
  auth(ENUM_USER_ROLE.ADMIN),
  UserController.deleteUserByID,
);

export const userRoute = router;
