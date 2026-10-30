# Document Vault — Production-Grade MERN Document Management System

A robust, placement-ready Document Management System built with the **MERN** stack (MongoDB Atlas, Express, React, Node.js), **JWT & bcrypt User Authentication**, and cloud object storage powered by **AWS S3 / Cloudflare R2 / MinIO**, featuring defensive in-memory validation pipelines, direct cloud streaming, and comprehensive OpenAPI documentation.

---

## 1. Architectural Highlights

- **User Authentication & Session Management**:
  - Secure registration and authentication with **bcrypt** password hashing (10 salt rounds) and **JSON Web Tokens (JWT)**.
  - User model with unique email index (`server/src/models/User.ts`).
  - Auth routes: `POST /api/auth/signup`, `POST /api/auth/login`, and protected `GET /api/auth/me`.
  - Frontend `AuthContext` with automatic session restoration and token persistence.
- **User Document Isolation**:
  - All document records in MongoDB Atlas are strictly associated with the authenticated `userId`.
  - Users can only upload, list, download, preview, or delete documents belonging to their own account.
- **Cloud Object Storage (S3 / R2)**:
  - Physical files are stored directly in cloud buckets using `@aws-sdk/client-s3` with unique user-scoped keys: `documents/${userId}/${uuid}${extension}`.
  - Zero disk storage footprint: files are received into memory (`multer.memoryStorage()`) and streamed to S3 without writing temporary files to the local filesystem.
  - MongoDB Atlas strictly persists document metadata and cloud references (`userId`, `s3Key`, `bucket`, `region`).
- **Authoritative Validation Pipeline**:
  - Strict extension allowlist: `.txt`, `.md`, and `.json`.
  - Configurable maximum size limit (default `5 MB`).
  - Text encoding verification ensuring valid UTF-8 strings and rejecting binary/null bytes.
  - Full syntax parsing via `JSON.parse()` for `.json` files.
  - Safe compensation: automatically issues `DeleteObjectCommand` on the cloud bucket if metadata persistence fails after upload.
- **Two-Phase Recoverable Deletion**:
  1. Document status is set to `'deleting'` in MongoDB, hiding it from user lists and downloads.
  2. `DeleteObjectCommand` is executed on the S3 bucket to securely wipe the physical object.
  3. The MongoDB metadata record is permanently removed.
- **RFC 5987 Streaming & Pre-Signed URLs**:
  - Downloads stream directly from S3 with proper UTF-8 encoded `Content-Disposition: attachment; filename="..."` headers.
  - Generates ephemeral pre-signed download URLs via `@aws-sdk/s3-request-presigner` (`GET /api/documents/:id/download?presigned=true` and `X-Presigned-Url` header).
- **Interactive Documentation**: Full OpenAPI 3.0 specification served via Swagger UI at `/api-docs`.

---

## 2. Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React icons.
- **Backend**: Node.js, Express 4.x, Multer (memory storage), Mongoose 8.x.
- **Authentication**: JSON Web Tokens (`jsonwebtoken`), password hashing (`bcryptjs`).
- **Cloud Storage**: AWS S3 SDK (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`) supporting AWS S3, Cloudflare R2, and MinIO.
- **Database**: MongoDB Atlas with automatic embedded MongoMemoryServer fallback for self-contained local development.
- **Documentation**: OpenAPI 3.0 & Swagger UI Express.
- **Testing**: Vitest & Supertest.

---

## 3. Project Directory Structure

```text
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts        # Mongoose connection & embedded Mongo fallback
│   │   │   └── s3.ts              # S3Client config (AWS S3 / Cloudflare R2 / MinIO)
│   │   ├── controllers/
│   │   │   ├── authController.ts  # Signup, Login, and GetMe handlers
│   │   │   └── documentController.ts # HTTP handlers, S3 streams, and pre-signed URLs
│   │   ├── middleware/
│   │   │   ├── authMiddleware.ts  # Bearer token verification & req.user injection
│   │   │   ├── errorHandler.ts    # Centralized JSON error formatting
│   │   │   ├── notFound.ts        # 404 handler for API routes
│   │   │   ├── uploadMiddleware.ts# Multer memoryStorage configuration
│   │   │   └── validateDocument.ts# Buffer-level UTF-8 and JSON parser validation
│   │   ├── models/
│   │   │   ├── User.ts            # Mongoose user model with bcrypt hashing
│   │   │   └── Document.ts        # Mongoose schema with userId, s3Key, bucket, region
│   │   ├── routes/
│   │   │   ├── authRoutes.ts      # Auth endpoints (/api/auth/signup, /login, /me)
│   │   │   └── documentRoutes.ts  # Protected document endpoints (/api/documents)
│   │   ├── services/
│   │   │   └── documentService.ts # User-scoped S3 upload, download, and delete
│   │   ├── utils/
│   │   │   ├── AppError.ts        # Custom operational error class
│   │   │   ├── jwt.ts             # JWT token signing and verification
│   │   │   └── storage.ts         # S3 PutObject, GetObject, DeleteObject, and presigner
│   │   ├── app.ts                 # Express application factory with Swagger UI
│   │   └── server.ts              # Standalone server launcher
│   ├── tests/
│   │   └── api.test.ts            # Supertest automated API tests (auth + S3)
│   └── openapi.yaml               # OpenAPI 3.0 API specification
├── src/
│   ├── api/
│   │   ├── authApi.ts             # Signup, login, and profile API client
│   │   └── documentsApi.ts        # Protected REST client & download workflows
│   ├── context/
│   │   └── AuthContext.tsx        # Authentication provider & user session hook
│   ├── components/
│   │   ├── AppHeader.tsx          # Branding, user email, sign out, DB health badge
│   │   ├── ConfirmDeleteDialog.tsx# Accessible delete confirmation modal
│   │   ├── DocumentPreviewModal.tsx# In-browser text/markdown/json previewer
│   │   ├── DocumentRow.tsx        # Individual document row with actions
│   │   ├── DocumentTable.tsx      # Filterable, searchable document table
│   │   ├── EmptyState.tsx         # Clean empty & no-results states
│   │   ├── SummaryStats.tsx       # Live computed storage metrics & counts
│   │   ├── Toast.tsx              # Notification toast system
│   │   └── UploadArea.tsx         # Drag & drop upload area with file checks
│   ├── hooks/
│   │   └── useDocuments.ts        # Custom React hook orchestrating document state
│   ├── pages/
│   │   ├── Login.tsx              # User login page with form validation
│   │   ├── Signup.tsx             # User registration page with password strength checks
│   │   └── DocumentsPage.tsx      # Protected main dashboard page
│   ├── utils/
│   │   ├── formatters.ts          # Byte, date, and extension formatters
│   │   └── formatters.test.ts     # Frontend unit tests
│   ├── App.tsx                    # Root routing with AuthProvider
│   ├── main.tsx
│   └── index.css
├── server.ts                      # Full-stack production entry
├── vite.config.ts                 # Dev server with integrated Express backend
├── package.json
└── README.md
```

---

## 4. REST API Endpoints

| Method | Endpoint | Auth | Description | Status Codes |
|---|---|---|---|---|
| `GET` | `/api/health` | None | Service, MongoDB, and S3 status check | `200`, `503` |
| `POST` | `/api/auth/signup` | None | Register a new user with bcrypt password hash | `201`, `400`, `409` |
| `POST` | `/api/auth/login` | None | Authenticate credentials and return signed JWT token | `200`, `400`, `401` |
| `GET` | `/api/auth/me` | Bearer | Get current authenticated user profile | `200`, `401`, `404` |
| `POST` | `/api/documents` | Bearer | Upload `.txt`, `.md`, or `.json` file scoped to user | `201`, `400`, `401`, `413`, `415`, `500` |
| `GET` | `/api/documents` | Bearer | List documents belonging to authenticated user | `200`, `401`, `500` |
| `GET` | `/api/documents/:id/download` | Bearer | Stream user's S3 object or return pre-signed URL | `200`, `400`, `401`, `404` |
| `GET` | `/api/documents/:id/preview` | Bearer | In-browser preview of user's document content from S3 | `200`, `400`, `401`, `404` |
| `DELETE` | `/api/documents/:id` | Bearer | Two-phase deletion (S3 `DeleteObjectCommand` + MongoDB) | `200`, `400`, `401`, `404` |
| `GET` | `/api-docs` | None | Interactive Swagger UI API documentation | `200` |

---

## 5. Environment Variables Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `JWT_SECRET` | `...` | Secret key used for signing JWT tokens |
| `JWT_EXPIRES_IN` | `7d` | Token expiration duration |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/document_management` | MongoDB connection URI / Atlas string |
| `AWS_REGION` | `us-east-1` | AWS region or S3-compatible region |
| `AWS_ACCESS_KEY_ID` | `your-aws-access-key-id` | AWS IAM or Cloudflare R2 access key ID |
| `AWS_SECRET_ACCESS_KEY` | `your-aws-secret-access-key` | AWS IAM or Cloudflare R2 secret access key |
| `S3_BUCKET_NAME` | `document-vault-bucket` | Name of the S3 / R2 target bucket |
| `S3_ENDPOINT` | *(optional)* | Custom S3 endpoint for Cloudflare R2 or MinIO |
| `MAX_FILE_SIZE_MB` | `5` | Maximum allowed file size in megabytes |
| `CLIENT_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |

---

## 6. Installation & Execution

```bash
# 1. Install dependencies
npm install

# 2. Run in development mode (starts React + Express on port 3000)
npm run dev

# 3. Run automated tests (vitest + supertest)
npm test

# 4. Production build & start
npm run build
npm start
```
