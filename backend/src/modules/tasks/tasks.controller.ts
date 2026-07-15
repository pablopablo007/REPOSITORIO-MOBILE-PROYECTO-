import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import prisma from '../../config/database';
import { DocumentType } from '@prisma/client';

const mapDocumentType = (type: string): DocumentType => {
  const map: Record<string, DocumentType> = {
    'Académico': DocumentType.ACADEMICO,
    'Título/Certificado': DocumentType.TITULO,
    'Informe': DocumentType.INFORME,
    'Acta': DocumentType.ACTA,
    'Generado con IA': DocumentType.GENERADO_IA,
    'Escaneado': DocumentType.ESCANEADO,
    'Otro': DocumentType.OTRO,
  };
  return map[type] || DocumentType.OTRO;
};

// ── GET /api/tasks ──────────────────────────────────────────
export const getTasks = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { completed } = req.query;

    const tasks = await prisma.task.findMany({
      where: {
        docenteId: req.userId,
        ...(completed !== undefined && { completed: completed === 'true' }),
      },
      include: {
        completedEvidence: {
          select: { id: true, fileName: true, createdAt: true },
        },
      },
      orderBy: { deadline: 'asc' },
    });

    const normalized = tasks.map((t) => ({
      id: t.id,
      docenteId: t.docenteId,
      title: t.title,
      description: t.description,
      deadline: t.deadline.toISOString(),
      documentType: t.documentType,
      completed: t.completed,
      completedEvidenceId: t.completedEvidenceId,
      completedEvidence: t.completedEvidence
        ? {
            ...t.completedEvidence,
            date: t.completedEvidence.createdAt.toISOString(),
          }
        : null,
    }));

    res.json({ success: true, data: { tasks: normalized } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener tareas' });
  }
};

// ── POST /api/tasks ─────────────────────────────────────────
export const createTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { docenteId, title, description, deadline, documentType } = req.body;

    if (!docenteId || !title || !description || !deadline || !documentType) {
      res.status(400).json({ success: false, message: 'Todos los campos son requeridos' });
      return;
    }

    const task = await prisma.task.create({
      data: {
        docenteId,
        title,
        description,
        deadline: new Date(deadline),
        documentType: mapDocumentType(documentType),
      },
    });

    res.status(201).json({ success: true, data: { task } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al crear tarea' });
  }
};

// ── PUT /api/tasks/:id/complete ─────────────────────────────
export const completeTask = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { evidenceId } = req.body;

    if (!evidenceId) {
      res.status(400).json({ success: false, message: 'evidenceId es requerido' });
      return;
    }

    console.log(`[completeTask] Tarea: ${req.params.id}, evidenceId: "${evidenceId}"`);

    const task = await prisma.task.update({
      where: { id: req.params.id, docenteId: req.userId },
      data: {
        completed: true,
        completedEvidenceId: evidenceId,
      },
    });

    res.json({ success: true, data: { task } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al completar tarea' });
  }
};
