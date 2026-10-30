import React, { useState } from 'react';
import { X, Download, Copy, Check, FileText, Code2, BookOpen } from 'lucide-react';
import { PublicDocument } from '../api/documentsApi.ts';
import { formatBytes, formatDate } from '../utils/formatters.ts';

interface DocumentPreviewModalProps {
  document: PublicDocument | null;
  content: string | null;
  isLoading: boolean;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (id: string, name: string) => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document,
  content,
  isLoading,
  isOpen,
  onClose,
  onDownload,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !document) return null;

  const handleCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback or ignore
    }
  };

  const renderIcon = () => {
    switch (document.extension) {
      case '.json':
        return <Code2 className="w-5 h-5 text-amber-600" />;
      case '.md':
        return <BookOpen className="w-5 h-5 text-sky-600" />;
      default:
        return <FileText className="w-5 h-5 text-emerald-600" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
    >
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-xs shrink-0">
              {renderIcon()}
            </div>
            <div className="min-w-0">
              <h3 id="preview-modal-title" className="text-sm font-bold text-slate-900 truncate">
                {document.originalName}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {formatBytes(document.size)} · Uploaded {formatDate(document.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {content && (
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors"
                title="Copy content to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => onDownload(document._id, document.originalName)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-xs shadow-indigo-200 transition-colors"
              title="Download file"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors ml-1"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed selection:bg-indigo-600">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <span className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mb-3"></span>
              <span>Loading document preview...</span>
            </div>
          ) : content ? (
            <pre className="whitespace-pre-wrap break-words">{content}</pre>
          ) : (
            <div className="text-center py-12 text-slate-400">
              No content available.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Read-only document preview</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-md font-medium text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
