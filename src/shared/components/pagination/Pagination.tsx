'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

type Props = {
  total: number;
  pageSize: number;
  page: number; // 1-based
  onPageChange: (page: number) => void;
  /** Opcional: habilita o seletor de itens por página. */
  onPageSizeChange?: (size: number) => void;
  /** Opções do seletor de itens por página. Padrão: [10, 25, 50, 100, 200]. */
  pageSizeOptions?: number[];
  /** Nome dos registros no plural, usado em "Mostrando X a Y de N <rótulo>". Padrão: 'registros'. */
  recordLabel?: string;
};

const DEFAULT_OPTIONS = [10, 25, 50, 100, 200];

/**
 * Paginação padrão do sistema, em português:
 *   Mostrando 1 a 10 de 52 pacientes        ←  Página [1] de 6  →   [10 por página ▾]
 *
 * API mantida: page/pageSize/onPageChange seguem obrigatórios.
 * Passe `onPageSizeChange` para habilitar o seletor de tamanho.
 * `recordLabel` é o nome dos registros no plural (ex.: "pacientes").
 */
export default function Pagination({
  total,
  pageSize,
  page,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = DEFAULT_OPTIONS,
  recordLabel = 'registros',
}: Props) {
  const totalPages = Math.max(1, Math.ceil(Math.max(1, total) / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const [draft, setDraft] = useState<string>(String(safePage));

  useEffect(() => { setDraft(String(safePage)); }, [safePage]);

  if (total === 0) return null;

  const commitDraft = () => {
    const n = parseInt(draft, 10);
    if (!Number.isFinite(n)) { setDraft(String(safePage)); return; }
    const clamped = Math.min(Math.max(1, n), totalPages);
    setDraft(String(clamped));
    if (clamped !== safePage) onPageChange(clamped);
  };

  const primeiro = (safePage - 1) * pageSize + 1;
  const ultimo = Math.min(safePage * pageSize, total);
  const forte = { color: 'var(--tfd-text-primary, #1E293B)', fontWeight: 600 } as const;

  return (
    <div
      className="flex items-center justify-between flex-wrap gap-3"
      style={{
        padding: '10px 14px',
        borderTop: '1px solid var(--tfd-surface-border, #E2E8F0)',
        background: 'var(--tfd-surface-50, #F8FAFC)',
        fontSize: 13,
        color: 'var(--tfd-text-secondary, #475569)',
      }}
    >
      {/* Esquerda: faixa exibida e total */}
      <span role="status" aria-live="polite" style={{ fontSize: 13 }}>
        Mostrando <strong style={forte}>{primeiro.toLocaleString('pt-BR')}</strong> a{' '}
        <strong style={forte}>{ultimo.toLocaleString('pt-BR')}</strong> de{' '}
        <strong style={forte}>{total.toLocaleString('pt-BR')}</strong> {recordLabel}
      </span>

      {/* Direita: navegação por página e tamanho da página */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <NavButton
            disabled={safePage <= 1}
            onClick={() => onPageChange(safePage - 1)}
            aria-label="Página anterior"
          >
            <ChevronLeft size={16} />
          </NavButton>

          <span style={{ fontSize: 13 }}>Página</span>
          <input
            type="text"
            inputMode="numeric"
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ''))}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.currentTarget.blur(); }
              if (e.key === 'Escape') { setDraft(String(safePage)); e.currentTarget.blur(); }
            }}
            style={{
              width: Math.max(48, String(totalPages).length * 12 + 24),
              height: 30,
              textAlign: 'center',
              borderRadius: 6,
              border: '1px solid var(--tfd-surface-border, #E2E8F0)',
              background: 'white',
              color: 'var(--tfd-text-primary, #1E293B)',
              fontSize: 13,
              fontWeight: 600,
              padding: '0 6px',
            }}
            aria-label="Página atual"
          />
          <span style={{ fontSize: 13 }}>de <strong style={forte}>{totalPages.toLocaleString('pt-BR')}</strong></span>

          <NavButton
            disabled={safePage >= totalPages}
            onClick={() => onPageChange(safePage + 1)}
            aria-label="Próxima página"
          >
            <ChevronRight size={16} />
          </NavButton>
        </div>

        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => {
              const next = parseInt(e.target.value, 10);
              if (!Number.isFinite(next)) return;
              onPageSizeChange(next);
              // ao mudar tamanho, levar para página 1 para evitar overshoot
              onPageChange(1);
            }}
            style={{
              height: 30,
              padding: '0 8px',
              borderRadius: 6,
              border: '1px solid var(--tfd-surface-border, #E2E8F0)',
              background: 'white',
              color: 'var(--tfd-text-primary, #1E293B)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
            }}
            aria-label="Itens por página"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>{opt} por página</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

function NavButton({
  children, disabled, onClick, ...rest
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick: () => void;
  'aria-label'?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={rest['aria-label']}
      className="inline-flex items-center justify-center transition-colors"
      style={{
        width: 30, height: 30,
        borderRadius: 6,
        background: 'white',
        color: disabled ? 'var(--tfd-text-muted, #CBD5E1)' : 'var(--tfd-text-secondary, #475569)',
        border: '1px solid var(--tfd-surface-border, #E2E8F0)',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = 'var(--tfd-surface-100, #F1F5F9)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'white';
      }}
    >
      {children}
    </button>
  );
}
