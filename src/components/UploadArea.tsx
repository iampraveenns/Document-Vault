import React, { useState, useRef } from 'react';
import { UploadCloud, File, AlertCircle, Check, Loader2, X } from 'lucide-react';
import { formatBytes, getExtensionMeta } from '../utils/formatters.ts';

interface UploadAreaProps {
  onUpload: (file: File) => Promise<boolean>;
  isUploading: boolean;
}

const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.txt', '.md', '.json'];

export const UploadArea: React.FC<UploadAreaProps> = ({ onUpload, isUploading }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const validateFile = (file: File): boolean => {
    setClientError(null);

    // Validate extension
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      setClientError(
        `Unsupported file type '${ext}'. Please choose a .txt, .md, or .json file.`
      );
      return false;
    }

    // Validate size
    if (file.size > MAX_SIZE_BYTES) {
      setClientError(
        `File is too large (${formatBytes(file.size)}). Maximum allowed size is ${MAX_SIZE_MB} MB.`
      );
      return false;
    }

    if (file.size === 0) {
      setClientError('Cannot upload empty file (0 bytes).');
      return false;
    }

    return true;
  };

  const handleFileSelect = (file: File | undefined) => {
    if (!file) return;
    if (validateFile(file)) {
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);

    if (isUploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isUploading) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleUploadSubmit = async () => {
    if (!selectedFile || isUploading) return;

    const success = await onUpload(selectedFile);
    if (success) {
      setSelectedFile(null);
      setClientError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setClientError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const selectedExt = selectedFile ? '.' + selectedFile.name.split('.').pop()?.toLowerCase() : '';
  const meta = getExtensionMeta(selectedExt);

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-5 mb-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900 tracking-tight">Upload Document</h2>
          <p className="text-xs text-slate-500">
            Select or drag and drop your text, markdown, or JSON files.
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
          <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">.txt</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">.md</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200">.json</span>
          <span className="text-[11px] text-slate-400 ml-1">· max {MAX_SIZE_MB}MB</span>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.md,.json,text/plain,text/markdown,application/json"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
          }
        }}
      />

      {/* Drag & Drop Zone */}
      {!selectedFile ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
            isDragOver
              ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]'
              : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
          }`}
        >
          <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-600 mb-3 group-hover:scale-105 transition-transform">
            <UploadCloud className="w-6 h-6 text-indigo-600" />
          </div>
          <p className="text-sm font-semibold text-slate-800">
            Click to browse or drag & drop a file here
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative UTF-8 validation and JSON syntax checks performed on server
          </p>
        </div>
      ) : (
        /* Selected File Card */
        <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shadow-xs shrink-0">
              <File className={`w-5 h-5 ${meta.iconColor}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-900 truncate">
                  {selectedFile.name}
                </span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${meta.badgeClass}`}>
                  {meta.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-mono">
                {formatBytes(selectedFile.size)} · ready for upload
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={handleClear}
              disabled={isUploading}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-white rounded-md border border-transparent hover:border-slate-200 transition-colors flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              Remove
            </button>

            <button
              type="button"
              onClick={handleUploadSubmit}
              disabled={isUploading}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 rounded-md shadow-xs shadow-indigo-200 transition-colors flex items-center gap-1.5"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Validating & Storing...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirm Upload</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Validation / Client Error Notice */}
      {clientError && (
        <div className="mt-3 flex items-start gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{clientError}</span>
        </div>
      )}
    </div>
  );
};
