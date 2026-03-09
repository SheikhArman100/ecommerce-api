import express from 'express';
import validateRequest from '../../middleware/validateRequest';
import { CampaignController } from './campaign.controller';
import { CampaignValidation } from './campaign.validation';
import auth from '../../middleware/auth';
import { ENUM_USER_ROLE } from '../../enum/user';
import { FileUploadHelper } from '../../helpers/fileUploadHelpers';
import transformFormData from '../../middleware/transformFormData';

const router = express.Router();

router.get('/', CampaignController.getAllCampaigns);
router.get('/:id', CampaignController.getSingleCampaign);

router.post(
  '/',
  auth(ENUM_USER_ROLE.ADMIN),
  FileUploadHelper.uploadSingle('campaign'),
  transformFormData,
  validateRequest(CampaignValidation.createCampaignZodSchema),
  CampaignController.createCampaign
);

router.patch(
  '/:id',
  auth(ENUM_USER_ROLE.ADMIN),
  FileUploadHelper.uploadSingle('campaign'),
  transformFormData,
  validateRequest(CampaignValidation.updateCampaignZodSchema),
  CampaignController.updateCampaign
);

router.delete('/:id', auth(ENUM_USER_ROLE.ADMIN), CampaignController.deleteCampaign);

router.post(
  '/:id/products',
  auth(ENUM_USER_ROLE.ADMIN),
  validateRequest(CampaignValidation.addProductToCampaignZodSchema),
  CampaignController.addProductToCampaign
);

router.delete(
  '/:id/products/:productId',
  auth(ENUM_USER_ROLE.ADMIN),
  CampaignController.removeProductFromCampaign
);

export const CampaignRoutes = router;
