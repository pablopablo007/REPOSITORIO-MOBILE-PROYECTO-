import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import prisma from '../../config/database';

// ── GET /api/notifications ──────────────────────────────────
export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
    });

    const normalized = notifications.map((n) => ({
      id: n.id,
      userId: n.userId,
      title: n.title,
      message: n.message,
      type: n.type.toLowerCase(),
      read: n.isRead,
      date: n.createdAt.toISOString(),
    }));

    res.json({ success: true, data: { notifications: normalized } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener notificaciones' });
  }
};

// ── GET /api/notifications/unread-count ─────────────────────
export const getUnreadCount = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.userId, isRead: false },
    });

    res.json({ success: true, data: { count } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al contar notificaciones' });
  }
};

// ── PUT /api/notifications/:id/read ─────────────────────────
export const markRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: { isRead: true },
    });

    res.json({ success: true, message: 'Notificación marcada como leída' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al marcar notificación' });
  }
};

// ── PUT /api/notifications/mark-all-read ────────────────────
export const markAllRead = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.userId, isRead: false },
      data: { isRead: true },
    });

    res.json({ success: true, message: 'Todas las notificaciones marcadas como leídas' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al marcar notificaciones' });
  }
};
