# Document Vault — Production-Grade MERN Document Management System

A robust, placement-ready Document Management System built with the **MERN** stack (MongoDB, Express, React, Node.js) demonstrating clean architecture, defensive validation pipelines, safe local file storage, and comprehensive API documentation.

---

## 1. Architectural Highlights

- **Decoupled Responsibilities**: Clear separation between UI presentation (`src/`), Express routing, controller request handling, business service layer, and persistence models (`server/src/`).
- **Storage Separation**: Physical files are stored securely in dedicated disk storage (`storage/documents/`), completely isolated from the database. MongoDB persists strictly document metadata (`DocumentModel`).
- **Authoritative Validation Pipeline**:
  - Multipart uploads handled by **Multer** into isolated temporary storage (`storage/tmp/`).
  - Strict extension allowlist: `.txt`, `.md`, and `.json`.
  - Configurable maximum size limit (default `5 MB`).
  - Text encoding verification ensuring valid UTF-8 strings and rejecting binary/null bytes.
  - Full syntax parsing via `JSON.parse()` for `.json` files.
  - Safe cleanup guaranteeing temporary files are unlinked on validation failures.
- **Two-Phase Recoverable Deletion**: Documents are first flagged as `deleting` to remove them from query lists, followed by filesystem unlinking and metadata deletion.
- **RFC 5987 Compliant Streaming**: Downloads stream directly from disk with proper UTF-8 encoded `Content-Disposition: attachment; filename="..."` headers.
- **Interactive Documentation**: Full OpenAPI 3.0 specification served via Swagger UI at `/api-docs`.

---

## 2. Technology Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide React icons.
- **Backend**: Node.js, Express 4.x, Multer, Mongoose 8.x.
- **Database**: MongoDB with automatic embedded MongoMemoryServer fallback for self-contained, out-of-the-box execution.
- **Documentation**: OpenAPI 3.0 & Swagger UI Express.
- **Testing**: Vitest & Supertest.

---

## 3. Project Directory Structure

```text
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts        # Mongoose connection & embedded Mongo fallback
│   │   ├── controllers/
│   │   │   └── documentController.ts # HTTP request handlers & download streams
│   │   ├── middleware/
│   │   │   ├── errorHandler.ts    # Centralized JSON error formatting
│   │   │   ├── notFound.ts        # 404 handler for API routes
│   │   │   ├── uploadMiddleware.ts# Multer diskStorage configuration
│   │   │   └── validateDocument.ts# Content, UTF-8, and JSON parser validation
│   │   ├── models/
│   │   │   └── Document.ts        # Mongoose schema, indexes, and public sanitizer
│   │   ├── routes/
│   │   │   └── documentRoutes.ts  # REST route definitions
│   │   ├── services/
│   │   │   └── documentService.ts # Storage movement, compensation, and deletion
│   │   ├── utils/
│   │   │   ├── AppError.ts        # Custom operational error class
│   │   │   └── storage.ts         # Secure filesystem helpers
│   │   ├── app.ts                 # Express application factory with Swagger UI
│   │   └── server.ts              # Standalone server launcher
│   ├── tests/
│   │   └── api.test.ts            # Supertest automated API tests
│   └── openapi.yaml               # Complete OpenAPI 3.0 API specification
├── src/
│   ├── api/
│   │   └── documentsApi.ts        # Frontend HTTP client & download triggers
│   ├── components/
│   │   ├── AppHeader.tsx          # Branding, database health badge, Swagger link
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
├── storage/
│   ├── documents/                 # Validated physical documents on disk
│   └── tmp/                       # Temporary upload processing directory
├── server.ts                      # Full-stack production entry
├── vite.config.ts                 # Vite config with integrated Express backend
├── package.json
└── README.md
```

---

## 4. REST API Endpoints

| Method | Endpoint | Description | Status Codes |
|---|---|---|---|
| `GET` | `/api/health` | Service and MongoDB connectivity check | `200`, `503` |
| `POST` | `/api/documents` | Upload `.txt`, `.md`, or `.json` file (`file` field) | `201`, `400`, `413`, `415`, `500` |
| `GET` | `/api/documents` | List all documents ordered newest first | `200`, `500` |
| `GET` | `/api/documents/:id/download` | Stream file attachment with original filename | `200`, `400`, `404`, `500` |
| `GET` | `/api/documents/:id/preview` | In-browser preview of document content | `200`, `400`, `404` |
| `DELETE` | `/api/documents/:id` | Two-phase document and disk file deletion | `200`, `400`, `404` |
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
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/document_management` | MongoDB connection URI. If omitted or offline in dev/test, automatically launches embedded MongoMemoryServer. |
| `UPLOAD_DIR` | `./storage/documents` | Permanent physical storage directory |
| `TEMP_UPLOAD_DIR` | `./storage/tmp` | Temporary Multer upload directory |
| `MAX_FILE_SIZE_MB` | `5` | Maximum allowed file size in megabytes |
| `CLIENT_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |

---

## 6. Installation & Execution

### 1. Install dependencies
```bash
npm install
```

### 2. Development Mode
Runs Vite dev server with integrated Express backend, Swagger UI, and live MongoDB on port 3000:
```bash
npm run dev
```
Open **http://localhost:3000** in your browser.
Interactive API documentation: **http://localhost:3000/api-docs**.

### 3. Run Automated Tests
Execute the complete test suite (backend API tests with Supertest and frontend unit tests):
```bash
npm test
```

Or run backend tests specifically:
```bash
npm run test:backend
```

### 4. Production Build & Start
```bash
npm run build
npm start
```
