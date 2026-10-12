import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/database';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Token de autenticación requerido' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'secret';

    const decoded = jwt.verify(token, secret) as { userId: string; role: string };

    // Verificar que el usuario sigue activo en DB
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, active: true, role: true },
    });

    if (!user || !user.active) {
      res.status(401).json({ success: false, message: 'Usuario no encontrado o inactivo' });
      return;
    }

    req.userId = decoded.userId;
    req.userRole = user.role;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token inválido o expirado' });
  }
};

export const requireAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.userRole !== 'ADMIN' && req.userRole !== 'REVISOR') {
    res.status(403).json({ success: false, message: 'Acceso denegado: se requiere rol de administrador' });
    return;
  }
  next();
};
