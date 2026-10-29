import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import { documentService } from '../services/documentService.ts';
import { isDatabaseConnected } from '../config/database.ts';
import { AppError } from '../utils/AppError.ts';

export class DocumentController {
  /**
   * POST /api/documents
   * Upload and process a new document
   */
  async upload(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.validatedFile) {
        throw new AppError(400, 'MISSING_FILE', 'No validated file received.');
      }

      const document = await documentService.uploadDocument(req.validatedFile);

      res.status(201).json({
        message: 'Document uploaded successfully',
        document,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/documents
   * List all ready documents, newest first
   */
  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const documents = await documentService.listDocuments();
      res.status(200).json({ documents });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/documents/:id/download
   * Stream document file download with original filename
   */
  async download(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { document, filePath } = await documentService.getDocumentForDownload(id);

      // Encode filename for RFC 5987 compliance (supports non-ASCII characters safely)
      const encodedFilename = encodeURIComponent(document.originalName);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${document.originalName.replace(/"/g, '\\"')}"; filename*=UTF-8''${encodedFilename}`
      );
      res.setHeader('Content-Type', document.mimeType);
      res.setHeader('Content-Length', document.size);

      const readStream = fs.createReadStream(filePath);

      readStream.on('error', (streamErr) => {
        console.error('Error streaming document download:', streamErr);
        if (!res.headersSent) {
          next(new AppError(500, 'STREAM_ERROR', 'Failed while streaming file content.'));
        }
      });

      readStream.pipe(res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/documents/:id/preview
   * Retrieve document text content for in-browser inspection
   */
  async preview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const previewData = await documentService.getDocumentContent(id);
      res.status(200).json(previewData);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/documents/:id
   * Remove a document and its stored physical file
   */
  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await documentService.deleteDocument(id);

      res.status(200).json({
        message: 'Document deleted successfully',
        id: result.id,
        originalName: result.originalName,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/health
   * Service and database health check
   */
  async health(_req: Request, res: Response): Promise<void> {
    const dbConnected = isDatabaseConnected();
    const statusCode = dbConnected ? 200 : 503;

    res.status(statusCode).json({
      status: dbConnected ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      database: dbConnected ? 'connected' : 'disconnected',
      uptime: process.uptime(),
    });
  }
}

export const documentController = new DocumentController();
