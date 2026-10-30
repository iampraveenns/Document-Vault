import React from 'react';
import { Files, HardDrive, FileText, Code2, BookOpen } from 'lucide-react';
import { PublicDocument } from '../api/documentsApi.ts';
import { formatBytes } from '../utils/formatters.ts';

interface SummaryStatsProps {
  documents: PublicDocument[];
}

export const SummaryStats: React.FC<SummaryStatsProps> = ({ documents }) => {
  const totalCount = documents.length;
  const totalSize = documents.reduce((sum, doc) => sum + (doc.size || 0), 0);

  const txtCount = documents.filter((d) => d.extension === '.txt').length;
  const mdCount = documents.filter((d) => d.extension === '.md').length;
  const jsonCount = documents.filter((d) => d.extension === '.json').length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {/* Total Documents Card */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
          <Files className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Documents</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl font-bold text-slate-900">{totalCount}</span>
            <span className="text-xs text-slate-400">stored</span>
          </div>
        </div>
      </div>

      {/* Total Storage Used */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 shrink-0">
          <HardDrive className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Cloud Storage</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl font-bold text-slate-900">{formatBytes(totalSize)}</span>
            <span className="text-xs text-slate-400">in S3 bucket</span>
          </div>
        </div>
      </div>

      {/* Format Breakdown */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs col-span-2">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
          File Types Breakdown
        </p>
        <div className="grid grid-cols-3 gap-2">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-emerald-50/70 border border-emerald-100">
            <FileText className="w-4 h-4 text-emerald-600" />
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-800">{txtCount}</span>
              <span className="text-[11px] text-emerald-700 ml-1 font-mono">.txt</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-sky-50/70 border border-sky-100">
            <BookOpen className="w-4 h-4 text-sky-600" />
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-800">{mdCount}</span>
              <span className="text-[11px] text-sky-700 ml-1 font-mono">.md</span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-amber-50/70 border border-amber-100">
            <Code2 className="w-4 h-4 text-amber-600" />
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-800">{jsonCount}</span>
              <span className="text-[11px] text-amber-700 ml-1 font-mono">.json</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
