import React from 'react';
import { useDocuments } from '../hooks/useDocuments.ts';
import { AppHeader } from '../components/AppHeader.tsx';
import { SummaryStats } from '../components/SummaryStats.tsx';
import { UploadArea } from '../components/UploadArea.tsx';
import { DocumentTable } from '../components/DocumentTable.tsx';
import { ConfirmDeleteDialog } from '../components/ConfirmDeleteDialog.tsx';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal.tsx';
import { ToastContainer } from '../components/Toast.tsx';

export const DocumentsPage: React.FC = () => {
  const {
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
    handleUpload,
    handleDownload,
    handleOpenPreview,
    handleClosePreview,
    handleRequestDelete,
    handleCancelDelete,
    handleConfirmDelete,
  } = useDocuments();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* App Header */}
      <AppHeader
        health={health}
        healthLoading={healthLoading}
        onRefresh={fetchDocuments}
      />

      {/* Main Dashboard Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Dynamic Summary Cards */}
        <SummaryStats documents={documents} />

        {/* Upload Dropzone & Selector */}
        <UploadArea
          onUpload={handleUpload}
          isUploading={isUploading}
        />

        {/* Document Repository Table */}
        <DocumentTable
          documents={documents}
          isLoading={isLoading}
          error={error}
          onRefresh={fetchDocuments}
          onPreview={handleOpenPreview}
          onDownload={handleDownload}
          onDeleteRequest={handleRequestDelete}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-5 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Document Vault</span>
            <span>—</span>
            <span>Production MERN Architecture</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/api-docs"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-indigo-600 transition-colors"
            >
              OpenAPI 3.0 Specification
            </a>
            <span className="text-slate-300">|</span>
            <span>UTF-8 & JSON Verified Storage</span>
          </div>
        </div>
      </footer>

      {/* Delete Confirmation Dialog */}
      <ConfirmDeleteDialog
        document={deleteTarget}
        isOpen={Boolean(deleteTarget)}
        isDeleting={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
      />

      {/* Text/Markdown/JSON Content Preview Modal */}
      <DocumentPreviewModal
        document={previewDoc}
        content={previewContent}
        isLoading={isPreviewLoading}
        isOpen={Boolean(previewDoc)}
        onClose={handleClosePreview}
        onDownload={handleDownload}
      />
    </div>
  );
};
