import { Response } from 'express';
import { AuthRequest } from '../../middlewares/auth.middleware';
import prisma from '../../config/database';
import {
  DocumentType,
  EvidenceStatus,
  NotificationType,
} from '@prisma/client';
import fs from 'fs';
import path from 'path';

// Mapea los strings del frontend a los enums de Prisma
const mapDocumentType = (type: string): DocumentType => {
  const map: Record<string, DocumentType> = {
    'Académico': DocumentType.ACADEMICO,
    'Título/Certificado': DocumentType.TITULO,
    'Informe': DocumentType.INFORME,
    'Acta': DocumentType.ACTA,
    'Generado con IA': DocumentType.GENERADO_IA,
    'Escaneado': DocumentType.ESCANEADO,
    'Otro': DocumentType.OTRO,
    'ACADEMICO': DocumentType.ACADEMICO,
    'TITULO': DocumentType.TITULO,
    'INFORME': DocumentType.INFORME,
    'ACTA': DocumentType.ACTA,
    'GENERADO_IA': DocumentType.GENERADO_IA,
    'ESCANEADO': DocumentType.ESCANEADO,
    'OTRO': DocumentType.OTRO,
  };
  return map[type] || DocumentType.OTRO;
};

// Mapea el enum de vuelta al label del frontend
const mapDocTypeLabel = (type: DocumentType): string => {
  const map: Record<DocumentType, string> = {
    [DocumentType.ACADEMICO]: 'Académico',
    [DocumentType.TITULO]: 'Título/Certificado',
    [DocumentType.INFORME]: 'Informe',
    [DocumentType.ACTA]: 'Acta',
    [DocumentType.GENERADO_IA]: 'Generado con IA',
    [DocumentType.ESCANEADO]: 'Escaneado',
    [DocumentType.OTRO]: 'Otro',
  };
  return map[type];
};

const mapStatusLabel = (status: EvidenceStatus): string => {
  const map: Record<EvidenceStatus, string> = {
    [EvidenceStatus.PENDIENTE]: 'Pendiente',
    [EvidenceStatus.VALIDADO]: 'Validado',
    [EvidenceStatus.OBSERVADO]: 'Observado',
  };
  return map[status];
};

// ── GET /api/evidences ──────────────────────────────────────
export const getEvidences = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const status = req.query.status as string | undefined;
    const type = req.query.type as string | undefined;
    const search = req.query.search as string | undefined;
    const docenteIdQuery = req.query.docenteId as string | undefined;

    // Si es ADMIN o REVISOR, puede ver todas o filtrar por un docente específico.
    // Si es DOCENTE, solo puede ver las suyas.
    const isAdminOrRevisor = req.userRole === 'ADMIN' || req.userRole === 'REVISOR';

    const evidences = await prisma.evidence.findMany({
      where: {
        ...(isAdminOrRevisor ? (docenteIdQuery ? { docenteId: docenteIdQuery } : {}) : { docenteId: req.userId }),
        ...(status && { status: status as EvidenceStatus }),
        ...(type && { documentType: mapDocumentType(type) }),
        ...(search && { fileName: { contains: search, mode: 'insensitive' } }),
      },
      include: {
        docente: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
    });

    // Normaliza al formato que espera el frontend
    const normalized = evidences.map((e) => ({
      id: e.id,
      docenteId: e.docenteId,
      docenteName: e.docente?.name || '',
      documentType: mapDocTypeLabel(e.documentType),
      periodo: e.periodo,
      fileName: e.fileName,
      fileUrl: e.fileUrl,
      date: e.createdAt.toISOString(),
      status: mapStatusLabel(e.status),
      comment: e.comment,
      description: e.description,
      iaGenerated: e.iaGenerated,
      scanned: e.scanned,
    }));

    res.json({ success: true, data: { evidences: normalized } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener evidencias' });
  }
};

// ── GET /api/evidences/:id ──────────────────────────────────
export const getEvidenceById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const isAdminOrRevisor = req.userRole === 'ADMIN' || req.userRole === 'REVISOR';

    const evidence = await prisma.evidence.findFirst({
      where: { 
        id: (req.params.id as string), 
        ...(isAdminOrRevisor ? {} : { docenteId: req.userId })
      },
      include: {
        docente: { select: { name: true } }
      }
    });

    if (!evidence) {
      res.status(404).json({ success: false, message: 'Evidencia no encontrada' });
      return;
    }

    res.json({ success: true, data: { evidence } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener evidencia' });
  }
};

// ── POST /api/evidences ─────────────────────────────────────
export const uploadEvidence = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const documentType = req.body.documentType as string | undefined;
    const periodo = req.body.periodo as string | undefined;
    const description = req.body.description as string | undefined;
    const indicatorId = req.body.indicatorId as string | undefined;
    const taskId = req.body.taskId as string | undefined;
    const iaGenerated = req.body.iaGenerated;
    const scanned = req.body.scanned;

    if (!documentType || !periodo) {
      res.status(400).json({ success: false, message: 'documentType y periodo son requeridos' });
      return;
    }

    // El archivo puede venir del escáner (ya convertido en PDF local) o subido directamente
    let fileName = req.body.fileName || 'Documento.pdf';
    let fileUrl: string | null = null;

    if (req.file) {
      fileName = req.file.originalname;

      // Determinar el nombre de la actividad (o usar tipo de documento)
      let nombreActi = documentType || 'General';
      if (taskId && taskId !== 'ninguna') {
        const task = await prisma.task.findUnique({ where: { id: taskId } });
        if (task) {
          nombreActi = task.title;
        }
      }

      // Limpiar nombre para ser seguro en el sistema de archivos
      const safeNombreActi = nombreActi
        .normalize('NFD').replace(/[\u0300-\u036f]/g, "") // Quitar tildes
        .replace(/[^a-zA-Z0-9]/g, '_') // Reemplazar caracteres no alfanuméricos por guión bajo
        .toLowerCase();

      // Rutas
      const finalDirRelative = `/uploads/docentes/${req.userId}/${safeNombreActi}`;
      const finalDirAbsolute = path.join(__dirname, '..', '..', '..', 'uploads', 'docentes', req.userId!, safeNombreActi);

      if (!fs.existsSync(finalDirAbsolute)) {
        fs.mkdirSync(finalDirAbsolute, { recursive: true });
      }

      // Mover de tempDir a carpeta final
      const finalFilePath = path.join(finalDirAbsolute, req.file.filename);
      fs.renameSync(req.file.path, finalFilePath);

      fileUrl = `${finalDirRelative}/${req.file.filename}`;
    }

    const evidence = await prisma.evidence.create({
      data: {
        docenteId: req.userId!,
        documentType: mapDocumentType(documentType),
        periodo,
        fileName,
        fileUrl,
        fileSize: req.file ? `${Math.round(req.file.size / 1024)} KB` : null,
        description: description || null,
        indicatorId: indicatorId || null,
        iaGenerated: iaGenerated === 'true' || iaGenerated === true,
        scanned: scanned === 'true' || scanned === true,
      },
    });

    // Si viene asociada a una tarea, completarla
    if (taskId && taskId !== 'ninguna') {
      await prisma.task.update({
        where: { id: taskId, docenteId: req.userId },
        data: { completed: true, completedEvidenceId: evidence.id },
      });
    }

    console.log(`[uploadEvidence] Creado evidenceId: "${evidence.id}" para el archivo "${fileName}"`);

    res.status(201).json({
      success: true,
      data: {
        evidence: {
          ...evidence,
          documentType: mapDocTypeLabel(evidence.documentType),
          status: mapStatusLabel(evidence.status),
          date: evidence.createdAt.toISOString(),
        },
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Error al subir evidencia' });
  }
};

// ── PUT /api/evidences/:id/review ───────────────────────────
export const reviewEvidence = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, comment } = req.body;

    if (!status) {
      res.status(400).json({ success: false, message: 'status es requerido' });
      return;
    }

    const statusMap: Record<string, EvidenceStatus> = {
      Pendiente: EvidenceStatus.PENDIENTE,
      Validado: EvidenceStatus.VALIDADO,
      Observado: EvidenceStatus.OBSERVADO,
      PENDIENTE: EvidenceStatus.PENDIENTE,
      VALIDADO: EvidenceStatus.VALIDADO,
      OBSERVADO: EvidenceStatus.OBSERVADO,
    };

    const mappedStatus = statusMap[status];
    if (!mappedStatus) {
      res.status(400).json({ success: false, message: 'status inválido' });
      return;
    }

    const reviewer = await prisma.user.findUnique({ where: { id: req.userId! } });
    const reviewerName = reviewer?.name || 'Administrador';

    const evidence = await prisma.evidence.update({
      where: { id: (req.params.id as string) },
      data: { status: mappedStatus, comment: comment || null, reviewerName },
    });

    // Crear notificación automática para el docente
    const isValidated = mappedStatus === EvidenceStatus.VALIDADO;
    await prisma.notification.create({
      data: {
        userId: evidence.docenteId,
        title: isValidated ? 'Documento validado ✅' : 'Documento observado ⚠️',
        message: isValidated
          ? `Tu documento '${evidence.fileName}' fue validado por ${reviewerName}.`
          : `Tu documento '${evidence.fileName}' tiene observaciones: ${comment}`,
        type: isValidated ? NotificationType.SUCCESS : NotificationType.WARNING,
        evidenceId: evidence.id,
      },
    });

    res.json({
      success: true,
      data: {
        evidence: {
          ...evidence,
          documentType: mapDocTypeLabel(evidence.documentType),
          status: mapStatusLabel(evidence.status),
          date: evidence.createdAt.toISOString(),
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al revisar evidencia' });
  }
};

// ── DELETE /api/evidences/:id ───────────────────────────────
export const deleteEvidence = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const isAdminOrRevisor = req.userRole === 'ADMIN' || req.userRole === 'REVISOR';

    const evidence = await prisma.evidence.findFirst({
      where: { 
        id: (req.params.id as string), 
        ...(isAdminOrRevisor ? {} : { docenteId: req.userId })
      },
    });

    if (!evidence) {
      res.status(404).json({ success: false, message: 'Evidencia no encontrada' });
      return;
    }

    // Eliminar archivo físico si existe
    if (evidence.fileUrl) {
      const filePath = path.join(__dirname, '..', '..', '..', evidence.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await prisma.evidence.delete({ where: { id: (req.params.id as string) } });

    res.json({ success: true, message: 'Evidencia eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al eliminar evidencia' });
  }
};

// ── PUT /api/evidences/:id ──────────────────────────────────
export const updateEvidence = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { description, periodo, documentType, indicatorId } = req.body;
    const isAdminOrRevisor = req.userRole === 'ADMIN' || req.userRole === 'REVISOR';
    const evidenceId = req.params.id as string;

    const evidence = await prisma.evidence.findFirst({
      where: { 
        id: evidenceId, 
        ...(isAdminOrRevisor ? {} : { docenteId: req.userId })
      },
    });

    if (!evidence) {
      res.status(404).json({ success: false, message: 'Evidencia no encontrada o sin permisos' });
      return;
    }

    const updated = await prisma.evidence.update({
      where: { id: evidenceId },
      data: {
        ...(description && { description }),
        ...(periodo && { periodo }),
        ...(documentType && { documentType: mapDocumentType(documentType) }),
        ...(indicatorId && { indicatorId }),
      },
    });

    res.json({
      success: true,
      data: {
        evidence: {
          ...updated,
          documentType: mapDocTypeLabel(updated.documentType),
          status: mapStatusLabel(updated.status),
          date: updated.createdAt.toISOString(),
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al actualizar evidencia' });
  }
};
