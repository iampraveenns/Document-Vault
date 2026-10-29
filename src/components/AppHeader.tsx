import React from 'react';
import { ShieldCheck, BookOpen, RefreshCw, Database } from 'lucide-react';
import { HealthStatus } from '../api/documentsApi.ts';

interface AppHeaderProps {
  health: HealthStatus | null;
  healthLoading: boolean;
  onRefresh: () => void;
  onOpenUpload?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  health,
  healthLoading,
  onRefresh,
}) => {
  const isConnected = health?.database === 'connected';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
                  Document Vault
                </h1>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  MERN
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">
                Secure validation, local disk storage, and Mongoose metadata persistence
              </p>
            </div>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-3">
            {/* Live Database Status Indicator */}
            <div
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                isConnected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
              title={
                isConnected
                  ? `MongoDB Connected (Uptime: ${Math.round(health?.uptime || 0)}s)`
                  : 'Checking backend / database connection...'
              }
            >
              <span className="relative flex h-2 w-2">
                {isConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                ></span>
              </span>
              <Database className="w-3.5 h-3.5 opacity-70" />
              <span className="hidden md:inline">
                {isConnected ? 'MongoDB Active' : 'Connecting DB'}
              </span>
            </div>

            {/* Swagger Docs Link */}
            <a
              href="/api-docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors border border-slate-200"
              title="Open OpenAPI 3.0 Swagger UI documentation"
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">API Docs</span>
            </a>

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={healthLoading}
              className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200"
              title="Refresh documents list"
              aria-label="Refresh documents list"
            >
              <RefreshCw className={`w-4 h-4 ${healthLoading ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
