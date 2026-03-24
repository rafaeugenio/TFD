'use client';

import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

export default function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = '480px',
}: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          transition: 'opacity 0.2s ease-in-out',
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed inset-y-0 right-0 z-50 flex flex-col ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{
          width: `min(${width}, 100vw)`,
          backgroundColor: 'var(--tfd-surface-card)',
          boxShadow: 'var(--tfd-shadow-modal)',
          transition: 'transform 0.25s ease-in-out',
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between gap-4 px-6 py-5 shrink-0"
          style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}
        >
          <div className="min-w-0">
            <h2
              className="text-lg font-semibold leading-tight"
              style={{ color: 'var(--tfd-text-primary)' }}
            >
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="tfd-btn tfd-btn--text tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only shrink-0 -mr-1"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className="flex items-center justify-end gap-2 px-6 py-4 shrink-0"
            style={{ borderTop: '1px solid var(--tfd-surface-border)' }}
          >
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
