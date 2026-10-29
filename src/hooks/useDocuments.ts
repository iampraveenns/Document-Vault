import { useState, useEffect, useCallback } from 'react';
import { documentsApi, PublicDocument, HealthStatus } from '../api/documentsApi.ts';
import { ToastMessage } from '../components/Toast.tsx';

export function useDocuments() {
  const [documents, setDocuments] = useState<PublicDocument[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteTarget, setDeleteTarget] = useState<PublicDocument | null>(null);

  // Preview modal state
  const [previewDoc, setPreviewDoc] = useState<PublicDocument | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);

  // Health status
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthLoading, setHealthLoading] = useState<boolean>(false);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((type: 'success' | 'error' | 'info', message: string, title?: string) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, type, title, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Check health
  const checkHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const data = await documentsApi.checkHealth();
      setHealth(data);
    } catch {
      setHealth({
        status: 'disconnected',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
        uptime: 0,
      });
    } finally {
      setHealthLoading(false);
    }
  }, []);

  // Fetch documents list
  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const docs = await documentsApi.fetchDocuments();
      setDocuments(docs);
    } catch (err: any) {
      const message = err.message || 'Failed to fetch documents from server.';
      setError(message);
      addToast('error', message, 'Connection Error');
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  // Initial load
  useEffect(() => {
    fetchDocuments();
    checkHealth();

    // Periodic health poll
    const healthInterval = setInterval(checkHealth, 30000);
    return () => clearInterval(healthInterval);
  }, [fetchDocuments, checkHealth]);

  // Upload handler
  const handleUpload = async (file: File): Promise<boolean> => {
    setIsUploading(true);
    try {
      const result = await documentsApi.uploadDocument(file);
      addToast('success', `"${result.document.originalName}" uploaded successfully.`, 'Upload Complete');
      // Prepend newest document to list immediately or reload
      await fetchDocuments();
      return true;
    } catch (err: any) {
      addToast('error', err.message || 'Failed to upload document.', 'Upload Failed');
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  // Download handler
  const handleDownload = async (id: string, originalName: string) => {
    try {
      await documentsApi.downloadDocument(id, originalName);
      addToast('info', `Downloaded "${originalName}".`, 'Download Started');
    } catch (err: any) {
      addToast('error', err.message || 'Could not download document file.', 'Download Error');
    }
  };

  // Open Preview
  const handleOpenPreview = async (doc: PublicDocument) => {
    setPreviewDoc(doc);
    setPreviewContent(null);
    setIsPreviewLoading(true);

    try {
      const data = await documentsApi.fetchDocumentPreview(doc._id);
      setPreviewContent(data.content);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to load document preview content.', 'Preview Failed');
      setPreviewDoc(null);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleClosePreview = () => {
    setPreviewDoc(null);
    setPreviewContent(null);
  };

  // Delete flow
  const handleRequestDelete = (doc: PublicDocument) => {
    setDeleteTarget(doc);
  };

  const handleCancelDelete = () => {
    setDeleteTarget(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      await documentsApi.deleteDocument(deleteTarget._id);
      addToast(
        'success',
        `"${deleteTarget.originalName}" and physical file deleted successfully.`,
        'Document Deleted'
      );
      // Remove from state immediately
      setDocuments((prev) => prev.filter((d) => d._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to delete document.', 'Deletion Failed');
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    documents,
    isLoading,
    error,
    isUploading,
    isDeleting,
    deleteTarget,
    previewDoc,
    previewContent,
    isPreviewLoading,
    health,
    healthLoading,
    toasts,
    dismissToast,
    fetchDocuments,
    checkHealth,
    handleUpload,
    handleDownload,
    handleOpenPreview,
    handleClosePreview,
    handleRequestDelete,
    handleCancelDelete,
    handleConfirmDelete,
  };
}
