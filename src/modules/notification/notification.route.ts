import express from 'express';
import validateRequest from '../../middleware/validateRequest';
import auth from '../../middleware/auth';
import { ENUM_USER_ROLE } from '../../enum/user';
import { NotificationController } from './notification.controller';
import { NotificationValidation } from './notification.validation';

const router = express.Router();

// ALL notification endpoints are ADMIN-ONLY — customers receive emails,
// not in-app notifications.
router.get('/unread-count', auth(ENUM_USER_ROLE.ADMIN), NotificationController.getUnreadCount);

// Admin-only: list all / any notification
router.get('/', auth(ENUM_USER_ROLE.ADMIN), NotificationController.getAllNotifications);

// Create (admin/system) — also used internally via NotificationService
router.post(
  '/',
  auth(ENUM_USER_ROLE.ADMIN),
  validateRequest(NotificationValidation.createNotificationSchema),
  NotificationController.createNotification,
);

// Bulk action
router.patch('/read-all', auth(ENUM_USER_ROLE.ADMIN), NotificationController.markAllAsRead);

// Scoped reads/updates
router.patch('/:id/read', auth(ENUM_USER_ROLE.ADMIN), NotificationController.markAsRead);
router.delete('/:id', auth(ENUM_USER_ROLE.ADMIN), NotificationController.deleteNotification);

export const NotificationRoutes = router;