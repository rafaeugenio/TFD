'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

/**
 * Tabela tipográfica padrão dos relatórios — densa, com header sticky-ish,
 * tabular-nums e linhas zebradas leves.
 */

export interface ReportColumn<T> {
  key: string;
  header: ReactNode;
  /** 'right' para valores monetários; 'center' para badges; default 'left'. */
  align?: 'left' | 'center' | 'right';
  /** Largura sugerida (CSS). Ex.: '90px' ou '12%'. */
  width?: string;
  /** Se true, aplica fonte mono (tabular). Default true para align='right'. */
  mono?: boolean;
  /** Oculta a coluna na impressão (CSS `no-print`). */
  printHide?: boolean;
  render: (row: T, index: number) => ReactNode;
}

const DEFAULT_PAGE_SIZE = 20;

export function ReportTable<T>({
  columns,
  rows,
  emptyLabel = 'Nenhum registro para os filtros aplicados.',
  footerRow,
  rowStyle,
  compact = false,
  pageSize = DEFAULT_PAGE_SIZE,
}: {
  columns: ReportColumn<T>[];
  rows: T[];
  emptyLabel?: string;
  footerRow?: ReactNode;
  rowStyle?: (row: T, index: number) => CSSProperties | undefined;
  /** Impressão compacta (fonte menor, padding reduzido) para tabelas largas. */
  compact?: boolean;
  /** Itens por página. A tabela inteira continua disponível na impressão. */
  pageSize?: number;
}) {
  const [page, setPage] = useState(1);
  // Volta pra primeira página sempre que o conjunto de dados muda (novo filtro/período).
  useEffect(() => { setPage(1); }, [rows]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const inicio = rows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const fim = Math.min(currentPage * pageSize, rows.length);

  return (
    <div>
    <table
      className={compact ? 'report-table report-table--compact w-full' : 'report-table w-full'}
      style={{ borderCollapse: 'collapse' }}
    >
      <thead>
        <tr>
          {columns.map((c) => (
            <th
              key={c.key}
              className={c.printHide ? 'no-print' : undefined}
              style={{
                background: '#F8FAFC',
                borderBottom: '1px solid var(--tfd-surface-border)',
                padding: compact ? '7px 8px' : '10px 12px',
                fontSize: compact ? 9.5 : 10.5,
                fontWeight: 700,
                color: '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                textAlign: c.align ?? 'left',
                width: c.width,
                whiteSpace: compact ? 'normal' : 'nowrap',
              }}
            >
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      {(() => {
        const renderRow = (row: T, idx: number) => (
          <tr
            key={(row as { id?: string }).id ?? idx}
            className="report-row"
            style={{
              borderBottom: '1px solid var(--tfd-surface-border)',
              background: idx % 2 === 1 ? 'rgba(248,250,252,0.5)' : 'white',
              ...(rowStyle?.(row, idx) ?? {}),
            }}
          >
            {columns.map((c) => {
              const useMono = c.mono ?? c.align === 'right';
              return (
                <td
                  key={c.key}
                  className={c.printHide ? 'no-print' : undefined}
                  style={{
                    padding: compact ? '6px 8px' : '8px 10px',
                    fontSize: compact ? 11.5 : 12.5,
                    color: '#1A1D2B',
                    textAlign: c.align ?? 'left',
                    fontFamily: useMono ? 'var(--tfd-font-mono)' : undefined,
                    fontVariantNumeric: useMono ? 'tabular-nums' : undefined,
                    verticalAlign: 'top',
                    whiteSpace: c.align === 'right' ? 'nowrap' : undefined,
                  }}
                >
                  {c.render(row, idx)}
                </td>
              );
            })}
          </tr>
        );
        const emptyRow = (
          <tr>
            <td
              colSpan={columns.length}
              style={{ padding: '32px 12px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}
            >
              {emptyLabel}
            </td>
          </tr>
        );
        return (
          <>
            {/* Tela: só a página atual. A impressão precisa do relatório completo,
                então existe um segundo corpo com todas as linhas, oculto na tela
                e exibido só no @media print (ver .report-table-print-body abaixo). */}
            <tbody className="no-print">
              {rows.length === 0 ? emptyRow : pagedRows.map(renderRow)}
            </tbody>
            <tbody className="report-table-print-body">
              {rows.length > 0 && rows.map(renderRow)}
            </tbody>
          </>
        );
      })()}
      {footerRow && (
        <tfoot>
          {footerRow}
        </tfoot>
      )}

      <style jsx>{`
        .report-table-print-body {
          display: none;
        }
        @media print {
          .report-table-print-body {
            display: table-row-group !important;
          }
        }
        :global(.report-table tbody tr.report-row:hover) {
          background: var(--tfd-primary-50, #EBF0FF) !important;
        }
        :global(.report-table tfoot tr td) {
          background: #F1F5F9;
          font-weight: 700;
          color: #0F172A;
          border-top: 2px solid #CBD5E1;
        }
      `}</style>
    </table>
    {totalPages > 1 && (
      <div
        className="no-print flex items-center justify-between gap-3"
        style={{ padding: '8px 10px', borderTop: '1px solid var(--tfd-surface-border)', fontSize: 12, color: '#64748B' }}
      >
        <span>
          Mostrando {inicio}–{fim} de {rows.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="tfd-btn tfd-btn-ghost"
            style={{ padding: '4px 8px' }}
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            aria-label="Página anterior"
          >
            <ChevronLeft size={14} />
          </button>
          <span style={{ minWidth: 88, textAlign: 'center' }}>
            Página {currentPage} de {totalPages}
          </span>
          <button
            type="button"
            className="tfd-btn tfd-btn-ghost"
            style={{ padding: '4px 8px' }}
            disabled={currentPage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            aria-label="Próxima página"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    )}
    </div>
  );
}

/* Badges úteis para colunas de relatório. */

export function TipoBeneficiarioBadge({ tipo }: { tipo: 'paciente' | 'acompanhante' }) {
  const PAC = { bg: '#DBEAFE', fg: '#1E40AF', label: 'P', title: 'Paciente' };
  const ACO = { bg: '#EDE9FE', fg: '#6D28D9', label: 'A', title: 'Acompanhante' };
  const v = tipo === 'paciente' ? PAC : ACO;
  return (
    <span
      title={v.title}
      className="inline-flex items-center justify-center text-[10px] font-bold"
      style={{
        width: 18,
        height: 18,
        borderRadius: 4,
        background: v.bg,
        color: v.fg,
      }}
    >
      {v.label}
    </span>
  );
}

export function DoadorBadge() {
  return (
    <span
      title="Acompanhante doador (órgão/tecido) — conta como paciente no SIGTAP"
      className="inline-flex items-center justify-center text-[10px] font-bold"
      style={{
        width: 18,
        height: 18,
        borderRadius: 4,
        background: '#FFE4E6',
        color: '#9F1239',
      }}
    >
      D
    </span>
  );
}

export function TipoPercursoBadge({ tipo }: { tipo: 'IDA' | 'VOLTA' | 'IDA_E_VOLTA' | string }) {
  const MAP: Record<string, { label: string; bg: string; fg: string }> = {
    IDA:         { label: 'Ida',       bg: '#DBEAFE', fg: '#1E40AF' },
    VOLTA:       { label: 'Volta',     bg: '#FCE7F3', fg: '#9D174D' },
    IDA_E_VOLTA: { label: 'Ida/Volta', bg: '#E0F2FE', fg: '#075985' },
  };
  const v = MAP[tipo] ?? { label: tipo, bg: '#F1F5F9', fg: '#475569' };
  return (
    <span
      className="inline-flex items-center text-[10.5px] font-semibold px-1.5 py-0.5"
      style={{ background: v.bg, color: v.fg, borderRadius: 4, whiteSpace: 'nowrap' }}
    >
      {v.label}
    </span>
  );
}
