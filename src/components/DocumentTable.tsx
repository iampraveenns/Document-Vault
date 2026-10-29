import React, { useState, useMemo } from 'react';
import { Search, Filter, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { PublicDocument } from '../api/documentsApi.ts';
import { DocumentRow } from './DocumentRow.tsx';
import { EmptyState } from './EmptyState.tsx';

interface DocumentTableProps {
  documents: PublicDocument[];
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  onPreview: (doc: PublicDocument) => void;
  onDownload: (id: string, name: string) => void;
  onDeleteRequest: (doc: PublicDocument) => void;
  onUploadClick?: () => void;
}

export const DocumentTable: React.FC<DocumentTableProps> = ({
  documents,
  isLoading,
  error,
  onRefresh,
  onPreview,
  onDownload,
  onDeleteRequest,
  onUploadClick,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExtension, setSelectedExtension] = useState<string>('all');

  // Filter documents by name and extension
  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch = doc.originalName
        .toLowerCase()
        .includes(searchQuery.toLowerCase().trim());
      const matchesExtension =
        selectedExtension === 'all' || doc.extension === selectedExtension;
      return matchesSearch && matchesExtension;
    });
  }, [documents, searchQuery, selectedExtension]);

  const isFiltering = searchQuery.trim() !== '' || selectedExtension !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedExtension('all');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-4 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/40">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Documents Repository</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 font-semibold text-slate-600 border border-slate-200">
            {documents.length}
          </span>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 sm:flex-none">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Extension Filter Chips */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-200 text-xs">
            {['all', '.txt', '.md', '.json'].map((ext) => (
              <button
                key={ext}
                onClick={() => setSelectedExtension(ext)}
                className={`px-2 py-1 rounded font-medium transition-all ${
                  selectedExtension === ext
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {ext === 'all' ? 'All' : ext}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {error ? (
        <div className="p-8 text-center">
          <div className="w-10 h-10 mx-auto rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-2">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Failed to load documents</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">{error}</p>
          <button
            onClick={onRefresh}
            className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md shadow-xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry
          </button>
        </div>
      ) : isLoading && documents.length === 0 ? (
        <div className="p-16 text-center">
          <Loader2 className="w-8 h-8 mx-auto text-indigo-600 animate-spin mb-3" />
          <p className="text-xs font-medium text-slate-600">Retrieving documents from repository...</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <EmptyState
          isFiltering={isFiltering}
          onClearFilters={clearFilters}
          onUploadClick={onUploadClick}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/70">
                <th className="px-5 py-3">Document Name</th>
                <th className="px-5 py-3 hidden sm:table-cell">Type</th>
                <th className="px-5 py-3 hidden sm:table-cell">Size</th>
                <th className="px-5 py-3 hidden md:table-cell">Uploaded</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDocuments.map((doc) => (
                <DocumentRow
                  key={doc._id}
                  document={doc}
                  onPreview={onPreview}
                  onDownload={onDownload}
                  onDeleteRequest={onDeleteRequest}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
