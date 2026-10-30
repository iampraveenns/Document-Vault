import { Request, Response, NextFunction } from 'express';
import { documentService } from '../services/documentService.ts';
import { isDatabaseConnected } from '../config/database.ts';
import { AppError } from '../utils/AppError.ts';

export class DocumentController {
  /**
   * POST /api/documents
   * Upload and process a new document directly into Cloud Object Storage
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
   * Stream document file download directly from Cloud Object Storage or return presigned URL
   */
  async download(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const wantsPresigned = req.query.presigned === 'true';

      const { document, stream, contentType, contentLength, presignedUrl } =
        await documentService.getDocumentForDownload(id);

      // If client explicitly requests the pre-signed URL (e.g. for direct client-to-S3 download)
      if (wantsPresigned && presignedUrl) {
        res.status(200).json({
          downloadUrl: presignedUrl,
          document: {
            _id: document._id.toString(),
            originalName: document.originalName,
          },
        });
        return;
      }

      // Stream file directly from S3 to client with RFC 5987 Content-Disposition
      const encodedFilename = encodeURIComponent(document.originalName);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${document.originalName.replace(/"/g, '\\"')}"; filename*=UTF-8''${encodedFilename}`
      );
      res.setHeader('Content-Type', contentType || document.mimeType);
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }

      // Also expose pre-signed URL in a header if available
      if (presignedUrl) {
        res.setHeader('X-Presigned-Url', presignedUrl);
      }

      stream.on('error', (streamErr) => {
        console.error('Error streaming cloud object download:', streamErr);
        if (!res.headersSent) {
          next(new AppError(500, 'STREAM_ERROR', 'Failed while streaming file content from cloud storage.'));
        }
      });

      stream.pipe(res);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/documents/:id/preview
   * Retrieve document text content directly from S3 for in-browser inspection
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
   * Remove a document record from MongoDB and delete the object from Cloud Storage
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
   * Service, database, and cloud storage health check
   */
  async health(_req: Request, res: Response): Promise<void> {
    const dbConnected = isDatabaseConnected();
    const statusCode = dbConnected ? 200 : 503;

    res.status(statusCode).json({
      status: dbConnected ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      database: dbConnected ? 'connected' : 'disconnected',
      storageProvider: 's3',
      uptime: process.uptime(),
    });
  }
}

export const documentController = new DocumentController();
