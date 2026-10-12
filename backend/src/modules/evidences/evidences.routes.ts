import { Router } from 'express';
import { authMiddleware, requireAdmin } from '../../middlewares/auth.middleware';
import { uploadDocument } from '../../middlewares/upload.middleware';
import {
  getEvidences,
  getEvidenceById,
  uploadEvidence,
  reviewEvidence,
  deleteEvidence,
  updateEvidence,
} from './evidences.controller';

const router = Router();

router.use(authMiddleware);

// GET /api/evidences?status=&type=&search=
router.get('/', getEvidences);

// GET /api/evidences/:id
router.get('/:id', getEvidenceById);

// POST /api/evidences  (con archivo adjunto)
router.post('/', uploadDocument.single('file'), uploadEvidence);

// PUT /api/evidences/:id/review  (solo ADMIN/REVISOR)
router.put('/:id/review', requireAdmin, reviewEvidence);

// PUT /api/evidences/:id
router.put('/:id', updateEvidence);

// DELETE /api/evidences/:id
router.delete('/:id', deleteEvidence);

export default router;
