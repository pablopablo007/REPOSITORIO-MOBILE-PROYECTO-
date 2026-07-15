import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { getSummary } from './dashboard.controller';

const router = Router();

router.use(authMiddleware);

// GET /api/dashboard/summary
router.get('/summary', getSummary);

export default router;
