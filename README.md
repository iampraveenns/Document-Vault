# Document Vault — Production-Grade MERN Document Management System

A robust, placement-ready Document Management System built with the **MERN** stack (MongoDB Atlas, Express, React, Node.js) and cloud object storage powered by **AWS S3 / Cloudflare R2 / MinIO**, featuring defensive in-memory validation pipelines, direct cloud streaming, and comprehensive OpenAPI documentation.

---

## 1. Architectural Highlights

- **Decoupled Responsibilities**: Clean separation between UI presentation (`src/`), Express routing, controller request handling, business service layer, and persistence models (`server/src/`).
- **Cloud Object Storage (S3 / R2)**:
  - Physical files are stored directly in cloud buckets using `@aws-sdk/client-s3` with unique UUID-based keys.
  - Zero disk storage footprint: files are received directly into memory (`multer.memoryStorage()`) and streamed to S3 without writing temporary files to the local filesystem.
  - MongoDB Atlas strictly persists document metadata and cloud references (`s3Key`, `bucket`, `region`).
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
- **Cloud Storage**: AWS S3 SDK (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`) supporting AWS S3, Cloudflare R2, and MinIO.
- **Database**: MongoDB Atlas with automatic embedded MongoMemoryServer fallback for self-contained, out-of-the-box local development.
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
│   │   │   └── documentController.ts # HTTP handlers, S3 streams, and pre-signed URLs
│   │   ├── middleware/
│   │   │   ├── errorHandler.ts    # Centralized JSON error formatting
│   │   │   ├── notFound.ts        # 404 handler for API routes
│   │   │   ├── uploadMiddleware.ts# Multer memoryStorage configuration
│   │   │   └── validateDocument.ts# Buffer-level UTF-8 and JSON parser validation
│   │   ├── models/
│   │   │   └── Document.ts        # Mongoose schema with s3Key, bucket, and region
│   │   ├── routes/
│   │   │   └── documentRoutes.ts  # REST route definitions
│   │   ├── services/
│   │   │   └── documentService.ts # S3 upload, download, preview, and two-phase delete
│   │   ├── utils/
│   │   │   ├── AppError.ts        # Custom operational error class
│   │   │   └── storage.ts         # S3 PutObject, GetObject, DeleteObject, and presigner
│   │   ├── app.ts                 # Express application factory with Swagger UI
│   │   └── server.ts              # Standalone server launcher
│   ├── tests/
│   │   └── api.test.ts            # Supertest automated API tests
│   └── openapi.yaml               # OpenAPI 3.0 API specification
├── src/
│   ├── api/
│   │   └── documentsApi.ts        # REST client & browser download workflows
│   ├── components/
│   │   ├── AppHeader.tsx          # Branding, DB health badge, Swagger link
│   │   ├── ConfirmDeleteDialog.tsx# Accessible delete confirmation modal
│   │   ├── DocumentPreviewModal.tsx# In-browser text/markdown/json previewer
│   │   ├── DocumentRow.tsx        # Individual document row with actions
│   │   ├── DocumentTable.tsx      # Filterable, searchable document table
│   │   ├── EmptyState.tsx         # Clean empty & no-results states
│   │   ├── SummaryStats.tsx       # Live computed storage metrics & counts
│   │   ├── Toast.tsx              # Notification toast system
│   │   └── UploadArea.tsx         # Drag & drop upload area with file checks
│   ├── hooks/
│   │   └── useDocuments.ts        # Custom React hook orchestrating state
│   ├── pages/
│   │   └── DocumentsPage.tsx      # Main application page
│   ├── utils/
│   │   ├── formatters.ts          # Byte, date, and extension formatters
│   │   └── formatters.test.ts     # Frontend unit tests
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── server.ts                      # Full-stack production entry
├── vite.config.ts                 # Dev server with integrated Express backend
├── package.json
└── README.md
```

---

## 4. REST API Endpoints

| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `GET` | `/api/health` | Service, MongoDB, and S3 storageProvider check | `200`, `503` |
| `POST` | `/api/documents` | Upload `.txt`, `.md`, or `.json` file directly to S3 (`file` field) | `201`, `400`, `413`, `415`, `500` |
| `GET` | `/api/documents` | List ready documents from MongoDB ordered newest first | `200`, `500` |
| `GET` | `/api/documents/:id/download` | Stream S3 object or return pre-signed URL (`?presigned=true`) | `200`, `400`, `404`, `500` |
| `GET` | `/api/documents/:id/preview` | In-browser preview of document content directly from S3 | `200`, `400`, `404` |
| `DELETE` | `/api/documents/:id` | Two-phase deletion (S3 `DeleteObjectCommand` + MongoDB wipe) | `200`, `400`, `404` |
| `GET` | `/api-docs` | Interactive Swagger UI API documentation | `200` |

---

## 5. Environment Variables Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/document_management` | MongoDB connection URI / Atlas string. If omitted or offline in development, an embedded in-memory MongoDB starts automatically. |
| `AWS_REGION` | `us-east-1` | AWS region or S3-compatible region |
| `AWS_ACCESS_KEY_ID` | `your-aws-access-key-id` | AWS IAM or Cloudflare R2 access key ID |
| `AWS_SECRET_ACCESS_KEY` | `your-aws-secret-access-key` | AWS IAM or Cloudflare R2 secret access key |
| `S3_BUCKET_NAME` | `document-vault-bucket` | Name of the S3 / R2 target bucket |
| `S3_ENDPOINT` | *(optional)* | Custom endpoint (e.g. `https://<account_id>.r2.cloudflarestorage.com` for R2 or `http://localhost:9000` for MinIO) |
| `S3_FORCE_PATH_STYLE` | `false` | Enable path-style addressing if using MinIO |
| `MAX_FILE_SIZE_MB` | `5` | Maximum allowed file size in megabytes |
| `CLIENT_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |

---

## 6. Installation & Execution

### 1. Install dependencies
```bash
npm install
```

### 2. Development Mode
Runs Vite dev server with integrated Express backend, Swagger UI, and S3 client on port 3000:
```bash
npm run dev
```
Open **http://localhost:3000** in your browser.
Interactive API documentation: **http://localhost:3000/api-docs**.

### 3. Run Automated Tests
Execute the complete test suite (backend S3 API tests with Supertest and frontend unit tests):
```bash
npm test
```

### 4. Production Build & Start
```bash
npm run build
npm start
```
