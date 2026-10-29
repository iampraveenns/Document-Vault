import { Router } from 'express';
import { documentController } from '../controllers/documentController.ts';
import { uploadSingleFile } from '../middleware/uploadMiddleware.ts';
import { validateDocument } from '../middleware/validateDocument.ts';

const router = Router();

// Upload document (Multer parsing -> Content & security validation -> Controller)
router.post(
  '/',
  uploadSingleFile,
  validateDocument,
  (req, res, next) => documentController.upload(req, res, next)
);

// List all documents (newest first)
router.get('/', (req, res, next) => documentController.list(req, res, next));

// Download document file stream with original filename
router.get('/:id/download', (req, res, next) => documentController.download(req, res, next));

// Preview document content for UI inspector
router.get('/:id/preview', (req, res, next) => documentController.preview(req, res, next));

// Delete document and remove physical file
router.delete('/:id', (req, res, next) => documentController.remove(req, res, next));

export default router;
