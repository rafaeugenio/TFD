'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

type Props = {
  total: number;
  pageSize: number;
  page: number; // 1-based
  onPageChange: (page: number) => void;
};

/**
 * Paginação compartilhada das tabelas do Fluxo v2.
 * - 10 itens por página por padrão (definido pelo caller)
 * - Botões 32x32 ghost; ativo com bg azul claro Citiesoft
 * - Esconde-se completamente se total === 0
 */
export default function Pagination({ total, pageSize, page, onPageChange }: Props) {
  if (total === 0) return null;

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize + 1;
  const end = Math.min(total, safePage * pageSize);

  const pageNumbers = computePageNumbers(safePage, totalPages);

  return (
    <div
      className="flex items-center justify-between flex-wrap gap-3"
      style={{
        padding: '12px 16px',
        borderTop: '1px solid #E2E8F0',
        background: 'white',
      }}
    >
      <span style={{ fontSize: 13, color: '#64748B' }}>
        Mostrando <strong style={{ color: '#1E293B', fontWeight: 600 }}>{start}-{end}</strong> de{' '}
        <strong style={{ color: '#1E293B', fontWeight: 600 }}>{total}</strong> resultados
      </span>

      <div className="flex items-center gap-1">
        <NavButton
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft size={14} />
          <span className="ml-1" style={{ fontSize: 12 }}>Anterior</span>
        </NavButton>

        {pageNumbers.map((p, idx) =>
          p === '…' ? (
            <span
              key={`gap-${idx}`}
              style={{
                width: 32, height: 32, display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center',
                color: '#94A3B8', fontSize: 13,
              }}
            >
              …
            </span>
          ) : (
            <PageButton
              key={p}
              active={p === safePage}
              onClick={() => onPageChange(p)}
            >
              {p}
            </PageButton>
          ),
        )}

        <NavButton
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          aria-label="Próxima página"
        >
          <span className="mr-1" style={{ fontSize: 12 }}>Próxima</span>
          <ChevronRight size={14} />
        </NavButton>
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
        height: 32,
        padding: '0 10px',
        borderRadius: 6,
        background: 'transparent',
        color: disabled ? '#CBD5E1' : '#475569',
        border: '1px solid transparent',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontWeight: 500,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = '#F1F5F9';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {children}
    </button>
  );
}

function PageButton({
  children, active, onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className="inline-flex items-center justify-center transition-colors"
      style={{
        width: 32, height: 32,
        borderRadius: 6,
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        background: active ? '#EBF0FF' : 'transparent',
        color: active ? '#146BFA' : '#475569',
        border: '1px solid transparent',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => {
        if (active) return;
        e.currentTarget.style.background = '#F1F5F9';
      }}
      onMouseLeave={(e) => {
        if (active) return;
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {children}
    </button>
  );
}

/**
 * Algoritmo de elipses: tenta mostrar até 5 botões numéricos + elipses.
 * - <=5 páginas: mostra todas
 * - perto do início: 1 2 3 4 … N
 * - perto do fim:    1 … N-3 N-2 N-1 N
 * - no meio:         1 … p-1 p p+1 … N
 */
function computePageNumbers(page: number, total: number): (number | '…')[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (page <= 3) {
    return [1, 2, 3, 4, '…', total];
  }
  if (page >= total - 2) {
    return [1, '…', total - 3, total - 2, total - 1, total];
  }
  return [1, '…', page - 1, page, page + 1, '…', total];
}
