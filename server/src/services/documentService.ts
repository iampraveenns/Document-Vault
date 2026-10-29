import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { DocumentModel, formatPublicDocument, PublicDocument, IDocument } from '../models/Document.ts';
import { ValidatedFileInfo } from '../middleware/validateDocument.ts';
import {
  moveToPermanentStorage,
  deleteStoredFile,
  cleanupTempFile,
  fileExists,
  getStoredFilePath,
} from '../utils/storage.ts';
import { AppError } from '../utils/AppError.ts';

export class DocumentService {
  /**
   * Process and persist a validated file: moves to disk storage and saves Mongoose metadata.
   */
  async uploadDocument(fileInfo: ValidatedFileInfo): Promise<PublicDocument> {
    const uniqueId = uuidv4();
    const storedName = `${uniqueId}${fileInfo.extension}`;
    let permanentPath: string | null = null;

    try {
      // 1. Move file from temp upload location to permanent storage
      permanentPath = await moveToPermanentStorage(fileInfo.tempPath, storedName);

      // 2. Persist metadata in MongoDB
      const doc = await DocumentModel.create({
        originalName: fileInfo.originalName,
        storedName,
        extension: fileInfo.extension,
        mimeType: fileInfo.mimeType,
        size: fileInfo.size,
        storagePath: `storage/documents/${storedName}`,
        status: 'ready',
      });

      return formatPublicDocument(doc);
    } catch (error: any) {
      console.error('Failed to persist document metadata:', error);

      // Compensation: clean up permanent file if already moved
      if (permanentPath) {
        await deleteStoredFile(storedName).catch(delErr =>
          console.error('Compensation failed - could not remove permanent file:', delErr)
        );
      }
      // Ensure temp file is also removed
      await cleanupTempFile(fileInfo.tempPath);

      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, 'PERSISTENCE_FAILED', 'Failed to save document metadata.');
    }
  }

  /**
   * Retrieve all ready documents, sorted newest first.
   */
  async listDocuments(): Promise<PublicDocument[]> {
    const docs = await DocumentModel.find({ status: 'ready' })
      .sort({ createdAt: -1, _id: -1 })
      .exec();

    return docs.map(formatPublicDocument);
  }

  /**
   * Retrieve document metadata and resolved storage file path for download streaming.
   */
  async getDocumentForDownload(id: string): Promise<{ document: IDocument; filePath: string }> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(400, 'INVALID_DOCUMENT_ID', `Invalid document identifier format: '${id}'`);
    }

    const doc = await DocumentModel.findOne({ _id: id, status: 'ready' }).exec();
    if (!doc) {
      throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'The requested document does not exist or has been removed.');
    }

    const filePath = getStoredFilePath(doc.storedName);
    const exists = await fileExists(filePath);

    if (!exists) {
      console.error(`Physical file missing for document ID: ${id}, storedName: ${doc.storedName}`);
      throw new AppError(404, 'FILE_MISSING_ON_DISK', 'The document metadata exists, but the physical file is not found.');
    }

    return { document: doc, filePath };
  }

  /**
   * Read file content for in-browser text/markdown/json preview.
   */
  async getDocumentContent(id: string): Promise<{ document: PublicDocument; content: string }> {
    const { document, filePath } = await this.getDocumentForDownload(id);
    const content = await fs.promises.readFile(filePath, 'utf-8');
    return {
      document: formatPublicDocument(document),
      content,
    };
  }

  /**
   * Safely delete a document using a two-phase deletion strategy.
   */
  async deleteDocument(id: string): Promise<{ id: string; originalName: string }> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(400, 'INVALID_DOCUMENT_ID', `Invalid document identifier format: '${id}'`);
    }

    const doc = await DocumentModel.findById(id).exec();
    if (!doc) {
      throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'Document not found or already deleted.');
    }

    const originalName = doc.originalName;
    const storedName = doc.storedName;

    // Phase 1: Mark as 'deleting' so it immediately disappears from user lists & downloads
    doc.status = 'deleting';
    await doc.save();

    // Phase 2: Remove physical file from disk (handles already-missing file safely)
    await deleteStoredFile(storedName);

    // Phase 3: Remove MongoDB metadata
    await DocumentModel.findByIdAndDelete(id).exec();

    return { id, originalName };
  }
}

export const documentService = new DocumentService();
