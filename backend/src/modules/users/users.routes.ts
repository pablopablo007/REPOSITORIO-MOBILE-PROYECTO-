import { Router } from 'express';
import { authMiddleware, requireAdmin } from '../../middlewares/auth.middleware';
import { getMe, updateMe, updatePushToken, getUsers, updateUser, deleteUser } from './users.controller';
import { uploadAvatar } from '../../middlewares/upload.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// GET /api/users (solo ADMIN/REVISOR)
router.get('/', requireAdmin, getUsers);



// GET /api/users/me
router.get('/me', getMe);

// PUT /api/users/me
router.put('/me', updateMe);

// PUT /api/users/me/avatar
router.put('/me/avatar', uploadAvatar.single('avatar'), updateMe);

// PUT /api/users/me/push-token
router.put('/me/push-token', updatePushToken);

// PUT /api/users/:id (solo ADMIN)
router.put('/:id', requireAdmin, updateUser);

// DELETE /api/users/:id (solo ADMIN)
router.delete('/:id', requireAdmin, deleteUser);

export default router;
