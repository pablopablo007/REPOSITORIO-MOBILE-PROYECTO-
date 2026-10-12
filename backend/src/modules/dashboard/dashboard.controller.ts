import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import prisma from '../../config/database';
import { EvidenceStatus } from '@prisma/client';

// ── GET /api/dashboard/summary ──────────────────────────────
export const getSummary = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const isAdminOrRevisor = req.userRole === 'ADMIN' || req.userRole === 'REVISOR';
    
    // Si es ADMIN o REVISOR, obtenemos estadísticas de toda la plataforma
    const userFilter = isAdminOrRevisor ? {} : { docenteId: userId };

    // Conteo de evidencias por estado
    const [pendientes, validados, observados, totalEvidences] = await Promise.all([
      prisma.evidence.count({ where: { ...userFilter, status: EvidenceStatus.PENDIENTE } }),
      prisma.evidence.count({ where: { ...userFilter, status: EvidenceStatus.VALIDADO } }),
      prisma.evidence.count({ where: { ...userFilter, status: EvidenceStatus.OBSERVADO } }),
      prisma.evidence.count({ where: { ...userFilter } }),
    ]);

    // Progreso de tareas
    const [totalTasks, completedTasks] = await Promise.all([
      prisma.task.count({ where: { ...userFilter } }),
      prisma.task.count({ where: { ...userFilter, completed: true } }),
    ]);

    // Último archivo subido
    const lastEvidence = await prisma.evidence.findFirst({
      where: { ...userFilter },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        status: true,
        createdAt: true,
      },
    });

    // Notificaciones no leídas (estas siempre son del usuario actual)
    const unreadNotifications = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    // Tareas próximas a vencer (próximas 7 días)
    const urgentTasks = await prisma.task.findMany({
      where: {
        ...userFilter,
        completed: false,
        deadline: {
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { deadline: 'asc' },
      take: 3,
    });

    res.json({
      success: true,
      data: {
        evidences: {
          total: totalEvidences,
          pendientes,
          validados,
          observados,
        },
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          progressPercent: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
          urgent: urgentTasks.map((t) => ({
            id: t.id,
            title: t.title,
            deadline: t.deadline.toISOString(),
            daysLeft: Math.ceil((t.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
          })),
        },
        lastEvidence: lastEvidence
          ? {
              id: lastEvidence.id,
              fileName: lastEvidence.fileName,
              status: lastEvidence.status,
              date: lastEvidence.createdAt.toISOString(),
            }
          : null,
        unreadNotifications,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener resumen del dashboard' });
  }
};
