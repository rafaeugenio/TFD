'use client';

import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * T2.AL — Modal centralizado de confirmação de exclusão. Reutilizado por
 * todas as listas (pareceres, tentativas, passagens, ajudas, adicionais).
 *
 * Diferente do Drawer (lateral), este modal aparece ao centro porque
 * confirmação de exclusão é uma decisão rápida — drawer seria overkill.
 */
interface Props {
  open: boolean;
  onClose: () => void;
  onConfirmar: () => void;
  /** Tipo legível do item — ex.: "parecer", "tentativa", "passagem". */
  tipo: string;
  /** Snapshot curto do item — ex.: "Parecer #2 — Deferido — Dr. Marcos Lima". */
  snapshot: string;
}

export default function ConfirmarExclusaoModal({
  open,
  onClose,
  onConfirmar,
  tipo,
  snapshot,
}: Props) {
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

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        style={{ backgroundColor: 'rgba(15,23,42,0.45)' }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Excluir ${tipo}`}
        className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[min(440px,calc(100vw-32px))]"
        style={{
          background: 'white',
          borderRadius: 'var(--tfd-radius-lg)',
          boxShadow: '0 24px 60px rgba(15,23,42,0.24)',
          overflow: 'hidden',
        }}
      >
        <div className="flex items-start gap-3 px-5 pt-5">
          <div
            className="inline-flex items-center justify-center shrink-0"
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              background: '#FEE2E2',
              color: '#B91C1C',
            }}
          >
            <AlertTriangle size={20} strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[16px] font-semibold leading-tight" style={{ color: '#1A1D2B' }}>
              Excluir {tipo}?
            </h3>
            <p className="mt-1 text-[12.5px]" style={{ color: '#6B7280' }}>
              Esta ação não pode ser desfeita.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 -mt-1 inline-flex items-center justify-center"
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              color: '#94A3B8',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mx-5 mt-4 mb-5 px-3 py-2.5 text-[12.5px]"
          style={{
            background: '#F8FAFC',
            border: '1px solid var(--tfd-surface-border)',
            borderRadius: 8,
            color: '#1A1D2B',
            fontWeight: 500,
          }}
        >
          {snapshot}
        </div>

        <div
          className="flex items-center justify-end gap-2 px-5 py-3"
          style={{ borderTop: '1px solid var(--tfd-surface-border)', background: '#FBFCFE' }}
        >
          <button type="button" className="tfd-btn tfd-btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirmar();
              onClose();
            }}
            className="inline-flex items-center justify-center px-4 py-2 text-[13px] font-semibold transition-colors"
            style={{
              background: '#B91C1C',
              color: 'white',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#991B1B')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#B91C1C')}
          >
            Excluir
          </button>
        </div>
      </div>
    </>
  );
}
