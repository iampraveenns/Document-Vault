export interface PublicDocument {
  _id: string;
  userId?: string;
  originalName: string;
  extension: '.txt' | '.md' | '.json';
  mimeType: string;
  size: number;
  bucket?: string;
  region?: string;
  status: 'ready' | 'deleting';
  createdAt: string;
  updatedAt: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

export interface HealthStatus {
  status: string;
  database: string;
  storageProvider?: string;
  timestamp: string;
  uptime: number;
}

const RAW_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const API_BASE = RAW_BASE_URL.replace(/\/+$/, '');
const TOKEN_KEY = 'document_vault_token';

let inMemoryToken: string | null = null;

export function setAuthToken(token: string | null) {
  inMemoryToken = token;
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getAuthToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function getAuthHeaders(existingHeaders: HeadersInit = {}): HeadersInit {
  const token = getAuthToken();
  const headers: Record<string, string> = { ...existingHeaders as Record<string, string> };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

class ApiClientError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = 'API_ERROR', status = 500) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorCode = 'API_ERROR';
    let errorMessage = `HTTP error ${res.status}: ${res.statusText}`;

    try {
      const data = await res.json();
      if (data?.error) {
        errorCode = data.error.code || errorCode;
        errorMessage = data.error.message || errorMessage;
      }
    } catch {
      // response wasn't JSON
    }

    throw new ApiClientError(errorMessage, errorCode, res.status);
  }

  return res.json();
}

export const documentsApi = {
  /**
   * Fetch all documents for authenticated user, sorted newest first
   */
  async fetchDocuments(): Promise<PublicDocument[]> {
    const res = await fetch(`${API_BASE}/api/documents`, {
      headers: getAuthHeaders(),
    });
    const data = await handleResponse<{ documents: PublicDocument[] }>(res);
    return data.documents;
  },

  /**
   * Upload a new document file via multipart/form-data
   */
  async uploadDocument(file: File): Promise<{ message: string; document: PublicDocument }> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/api/documents`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });

    return handleResponse<{ message: string; document: PublicDocument }>(res);
  },

  /**
   * Trigger real file download in the browser
   */
  async downloadDocument(id: string, originalName: string): Promise<void> {
    const res = await fetch(`${API_BASE}/api/documents/${id}/download`, {
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      let msg = `Download failed with status ${res.status}`;
      try {
        const errData = await res.json();
        if (errData?.error?.message) msg = errData.error.message;
      } catch {}
      throw new Error(msg);
    }

    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = originalName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Release memory after short timeout
    setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 1000);
  },

  /**
   * Preview text content of a document
   */
  async fetchDocumentPreview(id: string): Promise<{ document: PublicDocument; content: string }> {
    const res = await fetch(`${API_BASE}/api/documents/${id}/preview`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<{ document: PublicDocument; content: string }>(res);
  },

  /**
   * Delete document by id
   */
  async deleteDocument(id: string): Promise<{ message: string; id: string; originalName?: string }> {
    const res = await fetch(`${API_BASE}/api/documents/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse<{ message: string; id: string; originalName?: string }>(res);
  },

  /**
   * Check system, database, and cloud storage health
   */
  async checkHealth(): Promise<HealthStatus> {
    const res = await fetch(`${API_BASE}/api/health`);
    return handleResponse<HealthStatus>(res);
  },
};
