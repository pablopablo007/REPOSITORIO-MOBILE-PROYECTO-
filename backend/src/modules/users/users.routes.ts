import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { getMe, updateMe, updatePushToken } from './users.controller';
import { uploadAvatar } from '../../middlewares/upload.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// GET /api/users/me
router.get('/me', getMe);

// PUT /api/users/me
router.put('/me', updateMe);

// PUT /api/users/me/avatar
router.put('/me/avatar', uploadAvatar.single('avatar'), updateMe);

// PUT /api/users/me/push-token
router.put('/me/push-token', updatePushToken);

export default router;
