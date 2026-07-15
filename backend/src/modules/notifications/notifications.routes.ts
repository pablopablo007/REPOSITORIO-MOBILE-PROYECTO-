import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
} from './notifications.controller';

const router = Router();

router.use(authMiddleware);

// GET /api/notifications
router.get('/', getNotifications);

// GET /api/notifications/unread-count
router.get('/unread-count', getUnreadCount);

// PUT /api/notifications/:id/read
router.put('/:id/read', markRead);

// PUT /api/notifications/mark-all-read
router.put('/mark-all-read', markAllRead);

export default router;
