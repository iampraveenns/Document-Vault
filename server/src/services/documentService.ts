import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';
import { DocumentModel, formatPublicDocument, PublicDocument, IDocument } from '../models/Document.ts';
import { ValidatedFileInfo } from '../middleware/validateDocument.ts';
import {
  uploadObjectToStorage,
  getObjectStreamFromStorage,
  getObjectStringFromStorage,
  deleteObjectFromStorage,
  generatePresignedDownloadUrl,
} from '../utils/storage.ts';
import { AppError } from '../utils/AppError.ts';

export class DocumentService {
  /**
   * Process and persist a validated file: streams buffer directly to cloud S3 bucket
   * and saves cloud-specific reference properties (s3Key, bucket, region) in MongoDB.
   */
  async uploadDocument(fileInfo: ValidatedFileInfo): Promise<PublicDocument> {
    const uniqueId = uuidv4();
    const s3Key = `documents/${uniqueId}${fileInfo.extension}`;
    let uploadSuccess = false;

    try {
      // 1. Upload file buffer directly to Cloud Object Storage (S3 / R2)
      const s3Result = await uploadObjectToStorage(
        s3Key,
        fileInfo.buffer,
        fileInfo.mimeType,
        {
          originalName: encodeURIComponent(fileInfo.originalName),
        }
      );
      uploadSuccess = true;

      // 2. Persist metadata in MongoDB Atlas with cloud properties
      const doc = await DocumentModel.create({
        originalName: fileInfo.originalName,
        s3Key: s3Result.key,
        bucket: s3Result.bucket,
        region: s3Result.region,
        extension: fileInfo.extension,
        mimeType: fileInfo.mimeType,
        size: fileInfo.size,
        status: 'ready',
      });

      return formatPublicDocument(doc);
    } catch (error: any) {
      console.error('Failed to upload/persist document:', error);

      // Safe compensation: wipe cloud object if MongoDB save failed after S3 put
      if (uploadSuccess) {
        await deleteObjectFromStorage(s3Key).catch((delErr) =>
          console.error('Compensation failed - could not remove uploaded S3 object:', delErr)
        );
      }

      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, 'PERSISTENCE_FAILED', 'Failed to save document metadata to database.');
    }
  }

  /**
   * Retrieve all ready documents from MongoDB, sorted newest first.
   */
  async listDocuments(): Promise<PublicDocument[]> {
    const docs = await DocumentModel.find({ status: 'ready' })
      .sort({ createdAt: -1, _id: -1 })
      .exec();

    return docs.map(formatPublicDocument);
  }

  /**
   * Retrieve document metadata and stream directly from S3, with optional presigned URL.
   */
  async getDocumentForDownload(id: string): Promise<{
    document: IDocument;
    stream: Readable;
    contentType: string;
    contentLength?: number;
    presignedUrl?: string;
  }> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(400, 'INVALID_DOCUMENT_ID', `Invalid document identifier format: '${id}'`);
    }

    const doc = await DocumentModel.findOne({ _id: id, status: 'ready' }).exec();
    if (!doc) {
      throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'The requested document does not exist or has been removed.');
    }

    // Retrieve stream from cloud object storage
    const { stream, contentType, contentLength } = await getObjectStreamFromStorage(doc.s3Key);

    // Also generate an ephemeral pre-signed URL (valid for 1 hour)
    const presignedUrl = await generatePresignedDownloadUrl(doc.s3Key, doc.originalName, 3600);

    return {
      document: doc,
      stream,
      contentType: contentType || doc.mimeType,
      contentLength: contentLength || doc.size,
      presignedUrl,
    };
  }

  /**
   * Read file content directly from S3 for in-browser text/markdown/json preview.
   */
  async getDocumentContent(id: string): Promise<{ document: PublicDocument; content: string }> {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new AppError(400, 'INVALID_DOCUMENT_ID', `Invalid document identifier format: '${id}'`);
    }

    const doc = await DocumentModel.findOne({ _id: id, status: 'ready' }).exec();
    if (!doc) {
      throw new AppError(404, 'DOCUMENT_NOT_FOUND', 'The requested document does not exist.');
    }

    const content = await getObjectStringFromStorage(doc.s3Key);

    return {
      document: formatPublicDocument(doc),
      content,
    };
  }

  /**
   * Safely delete a document using two-phase deletion:
   * 1. Mark status as 'deleting' in MongoDB
   * 2. Execute DeleteObjectCommand in cloud storage
   * 3. Wipe MongoDB document metadata record
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
    const s3Key = doc.s3Key;

    // Phase 1: Mark as 'deleting' so it immediately disappears from user lists & queries
    doc.status = 'deleting';
    await doc.save();

    // Phase 2: Execute DeleteObjectCommand on S3 cloud bucket
    await deleteObjectFromStorage(s3Key);

    // Phase 3: Remove MongoDB metadata
    await DocumentModel.findByIdAndDelete(id).exec();

    return { id, originalName };
  }
}

export const documentService = new DocumentService();
