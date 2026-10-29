import React from 'react';
import { FolderOpen, SearchX, UploadCloud } from 'lucide-react';

interface EmptyStateProps {
  isFiltering?: boolean;
  onClearFilters?: () => void;
  onUploadClick?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  isFiltering,
  onClearFilters,
  onUploadClick,
}) => {
  if (isFiltering) {
    return (
      <div className="py-16 px-4 text-center">
        <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-3">
          <SearchX className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-slate-900">No documents found</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          No documents matched your current search query or file type filter.
        </p>
        {onClearFilters && (
          <button
            onClick={onClearFilters}
            className="mt-4 px-3.5 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="py-16 px-4 text-center">
      <div className="w-12 h-12 mx-auto rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3">
        <FolderOpen className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-slate-900">Vault is empty</h3>
      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
        No documents uploaded yet. Add your first <span className="font-mono text-slate-700">.txt</span>,{' '}
        <span className="font-mono text-slate-700">.md</span>, or{' '}
        <span className="font-mono text-slate-700">.json</span> document using the upload area above.
      </p>
      {onUploadClick && (
        <button
          onClick={onUploadClick}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-xs shadow-indigo-200 transition-colors"
        >
          <UploadCloud className="w-4 h-4" />
          Choose a File
        </button>
      )}
    </div>
  );
};
