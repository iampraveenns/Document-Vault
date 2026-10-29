import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title?: string;
  message: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full px-4 sm:px-0 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const config = {
    success: {
      bg: 'bg-white border-emerald-200 text-slate-800 shadow-lg shadow-emerald-500/10',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
      accent: 'border-l-4 border-l-emerald-600',
    },
    error: {
      bg: 'bg-white border-rose-200 text-slate-800 shadow-lg shadow-rose-500/10',
      icon: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
      accent: 'border-l-4 border-l-rose-600',
    },
    info: {
      bg: 'bg-white border-indigo-200 text-slate-800 shadow-lg shadow-indigo-500/10',
      icon: <Info className="w-5 h-5 text-indigo-600 shrink-0" />,
      accent: 'border-l-4 border-l-indigo-600',
    },
  }[toast.type];

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-lg border ${config.bg} ${config.accent} transition-all duration-200 animate-in fade-in slide-in-from-bottom-2`}
      role="alert"
    >
      {config.icon}
      <div className="flex-1 min-w-0">
        {toast.title && <h4 className="font-semibold text-sm text-slate-900">{toast.title}</h4>}
        <p className="text-xs text-slate-600 mt-0.5 break-words">{toast.message}</p>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
