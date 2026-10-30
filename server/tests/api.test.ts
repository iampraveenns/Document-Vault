import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../src/app.ts';
import { connectDB, disconnectDB } from '../src/config/database.ts';
import { DocumentModel } from '../src/models/Document.ts';
import { UserModel } from '../src/models/User.ts';

let app: Express;

beforeAll(async () => {
  await connectDB();
  app = await createApp();
  await DocumentModel.deleteMany({});
  await UserModel.deleteMany({});
});

afterAll(async () => {
  await DocumentModel.deleteMany({});
  await UserModel.deleteMany({});
  await disconnectDB();
});

describe('Document Vault REST API Tests (JWT Authentication & Cloud Storage)', () => {
  let userAToken: string;
  let userAId: string;
  let userBToken: string;
  let userADocId: string;

  const sampleJsonContent = JSON.stringify({ name: 'Document Vault', version: '3.0.0', auth: 'JWT' }, null, 2);

  describe('Authentication Endpoints (/api/auth)', () => {
    it('POST /api/auth/signup should register User A and return JWT token', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        email: 'alice@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('alice@example.com');
      expect(res.body.user.password).toBeUndefined(); // Hash not leaked

      userAToken = res.body.token;
      userAId = res.body.user.id;
    });

    it('POST /api/auth/signup should reject duplicate email (409)', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        email: 'alice@example.com',
        password: 'anotherpassword',
      });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EMAIL_EXISTS');
    });

    it('POST /api/auth/signup should reject weak passwords under 6 characters (400)', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        email: 'weak@example.com',
        password: '123',
      });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('WEAK_PASSWORD');
    });

    it('POST /api/auth/login should authenticate User A with valid credentials', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'alice@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('alice@example.com');
    });

    it('POST /api/auth/login should reject invalid password (401)', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'alice@example.com',
        password: 'wrongpassword',
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('GET /api/auth/me should return authenticated user profile with Bearer token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(userAId);
      expect(res.body.user.email).toBe('alice@example.com');
    });

    it('GET /api/auth/me should reject request without token (401)', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Route Protection & User Document Isolation (/api/documents)', () => {
    beforeAll(async () => {
      // Register User B
      const resB = await request(app).post('/api/auth/signup').send({
        email: 'bob@example.com',
        password: 'password123',
      });
      userBToken = resB.body.token;
    });

    it('should reject unauthenticated upload attempt (401)', async () => {
      const res = await request(app)
        .post('/api/documents')
        .attach('file', Buffer.from('hello'), 'unauthorized.txt');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should allow User A to upload document with Bearer token', async () => {
      const res = await request(app)
        .post('/api/documents')
        .set('Authorization', `Bearer ${userAToken}`)
        .attach('file', Buffer.from(sampleJsonContent), 'alice-spec.json');

      expect(res.status).toBe(201);
      expect(res.body.document.originalName).toBe('alice-spec.json');
      expect(res.body.document.userId).toBe(userAId);
      userADocId = res.body.document._id;
    });

    it('User A should see their uploaded document in the list', async () => {
      const res = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.documents.length).toBe(1);
      expect(res.body.documents[0]._id).toBe(userADocId);
    });

    it('User B should NOT see User A documents in their list (user isolation)', async () => {
      const res = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(200);
      expect(res.body.documents.length).toBe(0); // Isolated!
    });

    it('User B should NOT be able to download User A document (404/unauthorized)', async () => {
      const res = await request(app)
        .get(`/api/documents/${userADocId}/download`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('DOCUMENT_NOT_FOUND');
    });

    it('User B should NOT be able to delete User A document (404/unauthorized)', async () => {
      const res = await request(app)
        .delete(`/api/documents/${userADocId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('DOCUMENT_NOT_FOUND');
    });

    it('User A should be able to download their own document', async () => {
      const res = await request(app)
        .get(`/api/documents/${userADocId}/download`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.text).toBe(sampleJsonContent);
    });

    it('User A should be able to preview their own document', async () => {
      const res = await request(app)
        .get(`/api/documents/${userADocId}/preview`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.content).toBe(sampleJsonContent);
    });

    it('User A should be able to delete their own document', async () => {
      const res = await request(app)
        .delete(`/api/documents/${userADocId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Document deleted successfully');
    });
  });

  describe('GET /api/health', () => {
    it('should return 200 OK without requiring authentication', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.database).toBe('connected');
    });
  });
});
