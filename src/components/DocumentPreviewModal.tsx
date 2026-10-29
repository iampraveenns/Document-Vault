import React, { useState } from 'react';
import { X, Copy, Check, Download, FileText, Code2, BookOpen } from 'lucide-react';
import { PublicDocument } from '../api/documentsApi.ts';
import { formatBytes, formatDate, getExtensionMeta } from '../utils/formatters.ts';

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

  const meta = getExtensionMeta(document.extension);

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-xs shrink-0">
              {renderIcon()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 truncate">
                  {document.originalName}
                </h3>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${meta.badgeClass}`}>
                  {meta.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {formatBytes(document.size)} · Uploaded {formatDate(document.createdAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={isLoading || !content}
              className="p-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-md transition-colors flex items-center gap-1"
              title="Copy content to clipboard"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>

            <button
              onClick={() => onDownload(document._id, document.originalName)}
              className="p-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-md transition-colors flex items-center gap-1"
              title="Download original file"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Download</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-md transition-colors"
              aria-label="Close preview modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-4 overflow-auto bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed select-text">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <span>Loading file preview from server...</span>
            </div>
          ) : content ? (
            <pre className="whitespace-pre-wrap break-all font-mono">
              <code>{content}</code>
            </pre>
          ) : (
            <div className="text-center py-12 text-slate-400">
              No content available.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Read-only preview generated from verified UTF-8 disk storage</span>
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
