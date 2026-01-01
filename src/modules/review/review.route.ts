import express from 'express';
import { ReviewController } from './review.controller';
import validateRequest from '../../middleware/validateRequest';
import { ReviewValidation } from './review.validation';
import { ENUM_USER_ROLE } from '../../enum/user';
import auth from '../../middleware/auth';
import { FileUploadHelper } from '../../helpers/fileUploadHelpers';
import transformFormData from '../../middleware/transformFormData';

const router = express.Router();

router
  .post(
    '/',
    auth(),
    FileUploadHelper.uploadAny('review'),
    transformFormData,
    validateRequest(ReviewValidation.createReviewSchema),
    ReviewController.createReview
  )
  .get('/', ReviewController.getAllReviews)
  .get('/:id', ReviewController.getReviewByID)
  .patch(
    '/:id',
    auth(),
    FileUploadHelper.uploadAny('review'),
    transformFormData,
    validateRequest(ReviewValidation.updateReviewSchema),
    ReviewController.updateReview
  )
  .delete('/:id', auth(ENUM_USER_ROLE.ADMIN), ReviewController.deleteReviewByID);

export const reviewRoute = router;
