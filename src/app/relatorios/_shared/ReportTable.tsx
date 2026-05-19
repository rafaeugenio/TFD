'use client';

import type { CSSProperties, ReactNode } from 'react';

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
  render: (row: T, index: number) => ReactNode;
}

export function ReportTable<T>({
  columns,
  rows,
  emptyLabel = 'Nenhum registro para os filtros aplicados.',
  footerRow,
  rowStyle,
}: {
  columns: ReportColumn<T>[];
  rows: T[];
  emptyLabel?: string;
  footerRow?: ReactNode;
  rowStyle?: (row: T, index: number) => CSSProperties | undefined;
}) {
  return (
    <table className="report-table w-full" style={{ borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {columns.map((c) => (
            <th
              key={c.key}
              style={{
                background: '#F8FAFC',
                borderBottom: '1px solid var(--tfd-surface-border)',
                padding: '10px 12px',
                fontSize: 10.5,
                fontWeight: 700,
                color: '#475569',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                textAlign: c.align ?? 'left',
                width: c.width,
                whiteSpace: 'nowrap',
              }}
            >
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td
              colSpan={columns.length}
              style={{ padding: '32px 12px', textAlign: 'center', color: '#94A3B8', fontSize: 13 }}
            >
              {emptyLabel}
            </td>
          </tr>
        ) : (
          rows.map((row, idx) => (
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
                    style={{
                      padding: '10px 12px',
                      fontSize: 12.5,
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
          ))
        )}
      </tbody>
      {footerRow && (
        <tfoot>
          {footerRow}
        </tfoot>
      )}

      <style jsx>{`
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
