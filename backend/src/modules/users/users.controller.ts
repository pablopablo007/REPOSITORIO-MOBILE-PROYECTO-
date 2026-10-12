import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import prisma from '../../config/database';
import path from 'path';

// ── GET /api/users/me ───────────────────────────────────────
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        active: true,
        phone: true,
        department: true,
        period: true,
        initials: true,
        degree: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'Usuario no encontrado' });
      return;
    }

    res.json({ success: true, data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// ── PUT /api/users/me ───────────────────────────────────────
export const updateMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { phone, department, period, degree, name } = req.body;

    // Si se subió un avatar (multer)
    let avatarUrl: string | undefined;
    if (req.file) {
      avatarUrl = `/uploads/avatars/${req.file.filename}`;
    }

    const updated = await prisma.user.update({
      where: { id: req.userId },
      data: {
        ...(name && { name }),
        ...(phone !== undefined && { phone }),
        ...(department !== undefined && { department }),
        ...(period !== undefined && { period }),
        ...(degree !== undefined && { degree }),
        ...(avatarUrl && { avatar: avatarUrl }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        phone: true,
        department: true,
        period: true,
        initials: true,
        degree: true,
        role: true,
      },
    });

    res.json({ success: true, data: { user: updated } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar perfil' });
  }
};

// ── PUT /api/users/me/push-token ────────────────────────────
export const updatePushToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { pushToken } = req.body;

    if (!pushToken) {
      res.status(400).json({ success: false, message: 'pushToken es requerido' });
      return;
    }

    await prisma.user.update({
      where: { id: req.userId },
      data: { pushToken },
    });

    res.json({ success: true, message: 'Push token actualizado' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar push token' });
  }
};

// ── GET /api/users ──────────────────────────────────────────
export const getUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const role = req.query.role as string | undefined;
    const users = await prisma.user.findMany({
      where: {
        ...(role && { role: role as any }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        active: true,
        department: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: { users } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener usuarios' });
  }
};

// ── PUT /api/users/:id ──────────────────────────────────────
export const updateUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role, active, department } = req.body;
    const userId = req.params.id as string;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(role && { role }),
        ...(active !== undefined && { active }),
        ...(department && { department }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
      }
    });

    res.json({ success: true, data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar usuario' });
  }
};

// ── DELETE /api/users/:id ───────────────────────────────────
export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.id as string;

    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({ success: true, message: 'Usuario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar usuario' });
  }
};
