import { Router } from 'express';
import { login, register, refreshToken } from './auth.controller';

const router = Router();

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/refresh
router.post('/refresh', refreshToken);

export default router;
