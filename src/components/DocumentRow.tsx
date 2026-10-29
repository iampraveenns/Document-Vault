import React from 'react';
import { Download, Trash2, Eye, FileText, Code2, BookOpen } from 'lucide-react';
import { PublicDocument } from '../api/documentsApi.ts';
import { formatBytes, formatDate, formatRelativeTime, getExtensionMeta } from '../utils/formatters.ts';

interface DocumentRowProps {
  document: PublicDocument;
  onPreview: (doc: PublicDocument) => void;
  onDownload: (id: string, name: string) => void;
  onDeleteRequest: (doc: PublicDocument) => void;
}

export const DocumentRow: React.FC<DocumentRowProps> = ({
  document,
  onPreview,
  onDownload,
  onDeleteRequest,
}) => {
  const meta = getExtensionMeta(document.extension);

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
    <tr className="hover:bg-slate-50/80 transition-colors group">
      {/* File Name & Icon */}
      <td className="px-5 py-3.5 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 group-hover:bg-white group-hover:shadow-xs transition-all border border-transparent group-hover:border-slate-200">
            {renderIcon()}
          </div>
          <div className="min-w-0 max-w-xs sm:max-w-md lg:max-w-lg">
            <span
              className="text-sm font-semibold text-slate-900 block truncate"
              title={document.originalName}
            >
              {document.originalName}
            </span>
            <span className="text-xs text-slate-400 block sm:hidden">
              {formatBytes(document.size)} · {formatRelativeTime(document.createdAt)}
            </span>
          </div>
        </div>
      </td>

      {/* Extension Badge */}
      <td className="px-5 py-3.5 whitespace-nowrap hidden sm:table-cell">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${meta.badgeClass}`}
        >
          {meta.label}
        </span>
      </td>

      {/* Size */}
      <td className="px-5 py-3.5 whitespace-nowrap text-xs font-mono text-slate-600 hidden sm:table-cell">
        {formatBytes(document.size)}
      </td>

      {/* Date */}
      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-slate-500 hidden md:table-cell">
        <span title={formatDate(document.createdAt)}>
          {formatRelativeTime(document.createdAt)}
        </span>
      </td>

      {/* Actions */}
      <td className="px-5 py-3.5 whitespace-nowrap text-right">
        <div className="flex items-center justify-end gap-1">
          {/* Quick Preview Button */}
          <button
            onClick={() => onPreview(document)}
            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
            title="Preview text content"
            aria-label={`Preview ${document.originalName}`}
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Download Button */}
          <button
            onClick={() => onDownload(document._id, document.originalName)}
            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
            title="Download document file"
            aria-label={`Download ${document.originalName}`}
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Delete Button */}
          <button
            onClick={() => onDeleteRequest(document)}
            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
            title="Delete document"
            aria-label={`Delete ${document.originalName}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};
