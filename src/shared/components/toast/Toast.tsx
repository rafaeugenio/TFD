'use client';

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (type: ToastType, title: string, description?: string) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 size={18} />,
  error: <XCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info: <Info size={18} />,
};

const STYLES: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: 'var(--tfd-status-success-bg)', border: 'var(--tfd-status-success)', icon: 'var(--tfd-status-success)' },
  error: { bg: 'var(--tfd-status-danger-bg)', border: 'var(--tfd-status-danger)', icon: 'var(--tfd-status-danger)' },
  warning: { bg: 'var(--tfd-status-warning-bg)', border: 'var(--tfd-status-warning)', icon: 'var(--tfd-status-warning)' },
  info: { bg: 'var(--tfd-status-info-bg)', border: 'var(--tfd-status-info)', icon: 'var(--tfd-status-info)' },
};

const DURATION = 4000;

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const style = STYLES[toast.type];
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(toast.id), DURATION);
    return () => clearTimeout(timerRef.current);
  }, [toast.id, onDismiss]);

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg pointer-events-auto animate-slide-in"
      style={{
        backgroundColor: 'var(--tfd-surface-card)',
        border: `1px solid ${style.border}`,
        borderLeft: `4px solid ${style.border}`,
        minWidth: 320,
        maxWidth: 420,
      }}
    >
      <span className="mt-0.5 shrink-0" style={{ color: style.icon }}>
        {ICONS[toast.type]}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
          {toast.title}
        </p>
        {toast.description && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--tfd-text-secondary)' }}>
            {toast.description}
          </p>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 p-0.5 rounded hover:bg-black/5"
        style={{ color: 'var(--tfd-text-muted)' }}
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, title: string, description?: string) => {
    const id = ++counterRef.current;
    setToasts((prev) => [...prev.slice(-4), { id, type, title, description }]);
  }, []);

  const value: ToastContextValue = {
    toast: addToast,
    success: useCallback((t: string, d?: string) => addToast('success', t, d), [addToast]),
    error: useCallback((t: string, d?: string) => addToast('error', t, d), [addToast]),
    warning: useCallback((t: string, d?: string) => addToast('warning', t, d), [addToast]),
    info: useCallback((t: string, d?: string) => addToast('info', t, d), [addToast]),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container */}
      <div
        className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
