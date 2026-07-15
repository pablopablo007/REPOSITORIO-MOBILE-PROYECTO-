import { Router } from 'express';
import { authMiddleware, requireAdmin } from '../../middlewares/auth.middleware';
import { getTasks, createTask, completeTask } from './tasks.controller';

const router = Router();

router.use(authMiddleware);

// GET /api/tasks?completed=false
router.get('/', getTasks);

// POST /api/tasks  (solo ADMIN)
router.post('/', requireAdmin, createTask);

// PUT /api/tasks/:id/complete
router.put('/:id/complete', completeTask);

export default router;
