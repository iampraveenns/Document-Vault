import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../src/app.ts';
import { connectDB, disconnectDB } from '../src/config/database.ts';
import { DocumentModel } from '../src/models/Document.ts';

let app: Express;

beforeAll(async () => {
  // Connect to isolated in-memory or configured database
  await connectDB();
  app = await createApp();
  // Clear any existing documents
  await DocumentModel.deleteMany({});
});

afterAll(async () => {
  await DocumentModel.deleteMany({});
  await disconnectDB();
});

describe('Document Vault REST API Tests (Cloud Object Storage)', () => {
  let createdDocId: string;
  const sampleJsonContent = JSON.stringify({ name: 'Document Vault', version: '2.0.0', storage: 'S3' }, null, 2);

  describe('GET /api/health', () => {
    it('should return 200 OK with healthy status, connected database, and s3 storageProvider', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.database).toBe('connected');
      expect(res.body.storageProvider).toBe('s3');
      expect(typeof res.body.uptime).toBe('number');
    });
  });

  describe('POST /api/documents (Cloud S3 Upload)', () => {
    it('should successfully upload and stream a valid .txt document to S3', async () => {
      const res = await request(app)
        .post('/api/documents')
        .attach('file', Buffer.from('Hello world from S3 Document Vault test text file!'), 'readme.txt');

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Document uploaded successfully');
      expect(res.body.document).toBeDefined();
      expect(res.body.document.originalName).toBe('readme.txt');
      expect(res.body.document.extension).toBe('.txt');
      expect(res.body.document.mimeType).toBe('text/plain');
      expect(res.body.document.bucket).toBeDefined();
      expect(res.body.document.region).toBeDefined();
      expect(res.body.document.size).toBeGreaterThan(0);
    });

    it('should successfully upload and persist a valid .md document to S3', async () => {
      const res = await request(app)
        .post('/api/documents')
        .attach('file', Buffer.from('# Release Notes\n\n- S3 Storage Enabled\n- R2 Support'), 'notes.md');

      expect(res.status).toBe(201);
      expect(res.body.document.originalName).toBe('notes.md');
      expect(res.body.document.extension).toBe('.md');
      expect(res.body.document.mimeType).toBe('text/markdown');
      expect(res.body.document.bucket).toBeDefined();
    });

    it('should successfully upload and validate a valid .json document', async () => {
      const res = await request(app)
        .post('/api/documents')
        .attach('file', Buffer.from(sampleJsonContent), 'config.json');

      expect(res.status).toBe(201);
      expect(res.body.document.originalName).toBe('config.json');
      expect(res.body.document.extension).toBe('.json');
      expect(res.body.document.mimeType).toBe('application/json');

      createdDocId = res.body.document._id;
    });

    it('should reject request when no file is provided (400 MISSING_FILE)', async () => {
      const res = await request(app).post('/api/documents');
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('MISSING_FILE');
    });

    it('should reject unsupported file extension like .pdf or .exe (415 UNSUPPORTED_MEDIA_TYPE)', async () => {
      const res = await request(app)
        .post('/api/documents')
        .attach('file', Buffer.from('dummy binary content'), 'malware.exe');

      expect(res.status).toBe(415);
      expect(res.body.error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
    });

    it('should reject empty 0-byte file (400 EMPTY_FILE)', async () => {
      const res = await request(app)
        .post('/api/documents')
        .attach('file', Buffer.from(''), 'empty.txt');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('EMPTY_FILE');
    });

    it('should reject malformed JSON syntax (400 MALFORMED_JSON)', async () => {
      const brokenJson = '{ "title": "test", broken: true, }';
      const res = await request(app)
        .post('/api/documents')
        .attach('file', Buffer.from(brokenJson), 'invalid.json');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('MALFORMED_JSON');
    });
  });

  describe('GET /api/documents (List from MongoDB)', () => {
    it('should retrieve all documents ordered newest first with S3 metadata', async () => {
      const res = await request(app).get('/api/documents');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.documents)).toBe(true);
      expect(res.body.documents.length).toBeGreaterThanOrEqual(3);

      // Verify newest first order
      const docs = res.body.documents;
      for (let i = 0; i < docs.length - 1; i++) {
        const currentDate = new Date(docs[i].createdAt).getTime();
        const nextDate = new Date(docs[i + 1].createdAt).getTime();
        expect(currentDate).toBeGreaterThanOrEqual(nextDate);
      }

      // Verify cloud bucket metadata is populated
      expect(docs[0].bucket).toBeDefined();
      expect(docs[0].region).toBeDefined();
    });
  });

  describe('GET /api/documents/:id/download (Stream & Pre-signed URL)', () => {
    it('should stream the file directly with original filename in header', async () => {
      const res = await request(app).get(`/api/documents/${createdDocId}/download`);

      expect(res.status).toBe(200);
      expect(res.header['content-disposition']).toContain('config.json');
      expect(res.header['content-type']).toContain('application/json');
      expect(res.text).toBe(sampleJsonContent);
    });

    it('should return a pre-signed URL when ?presigned=true is passed', async () => {
      const res = await request(app).get(`/api/documents/${createdDocId}/download?presigned=true`);

      expect(res.status).toBe(200);
      expect(res.body.document).toBeDefined();
      expect(res.body.downloadUrl).toBeDefined();
    });

    it('should return 400 for malformed document ID', async () => {
      const res = await request(app).get('/api/documents/invalid-id-123/download');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_DOCUMENT_ID');
    });

    it('should return 404 for nonexistent document ID', async () => {
      const nonExistentId = '67215c0e189a022567df48ab';
      const res = await request(app).get(`/api/documents/${nonExistentId}/download`);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('DOCUMENT_NOT_FOUND');
    });
  });

  describe('GET /api/documents/:id/preview (S3 Content Preview)', () => {
    it('should stream document content directly from S3 for in-browser preview', async () => {
      const res = await request(app).get(`/api/documents/${createdDocId}/preview`);

      expect(res.status).toBe(200);
      expect(res.body.document).toBeDefined();
      expect(res.body.document.originalName).toBe('config.json');
      expect(res.body.content).toBe(sampleJsonContent);
    });
  });

  describe('DELETE /api/documents/:id (DeleteObjectCommand & MongoDB removal)', () => {
    it('should delete document metadata and wipe cloud object from S3', async () => {
      const res = await request(app).delete(`/api/documents/${createdDocId}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Document deleted successfully');
      expect(res.body.id).toBe(createdDocId);

      // Verify subsequent list does not include it
      const listRes = await request(app).get('/api/documents');
      const found = listRes.body.documents.find((d: any) => d._id === createdDocId);
      expect(found).toBeUndefined();

      // Verify download returns 404
      const downloadRes = await request(app).get(`/api/documents/${createdDocId}/download`);
      expect(downloadRes.status).toBe(404);
    });

    it('should return 404 when attempting to delete already deleted document', async () => {
      const res = await request(app).delete(`/api/documents/${createdDocId}`);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('DOCUMENT_NOT_FOUND');
    });

    it('should return 400 for malformed document ID on delete', async () => {
      const res = await request(app).delete('/api/documents/bad-id-123');
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_DOCUMENT_ID');
    });
  });
});
