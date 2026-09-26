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
  .get('/', auth(), ReviewController.getAllReviews)
  .get('/pending', auth(), ReviewController.getPendingReviews)
  .get('/:id', auth(), ReviewController.getReviewByID)
  .patch(
    '/:id',
    auth(),
    FileUploadHelper.uploadAny('review'),
    transformFormData,
    validateRequest(ReviewValidation.updateReviewSchema),
    ReviewController.updateReview
  )
  .delete('/:id', auth(ENUM_USER_ROLE.ADMIN), ReviewController.deleteReview);

export const reviewRoute = router;
