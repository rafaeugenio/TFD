'use client';

/**
 * Conjunto de primitivas visuais usadas pelos relatórios do TFD.
 * Mantém um único padrão de toolbar de filtros, hero card SES,
 * stats row, table card e print mode em todos os relatórios.
 */

import { Printer } from 'lucide-react';
import type { ReactNode } from 'react';

/* ====================================================== */
/*  Toolbar de filtros (sticky no topo)                   */
/* ====================================================== */

export function ReportToolbar({
  filters,
  actions,
}: {
  filters: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div
      className="report-toolbar no-print"
      style={{
        background: 'white',
        border: '1px solid var(--tfd-surface-border)',
        borderRadius: 12,
        padding: '12px 16px',
        boxShadow: '0 1px 0 rgba(15,23,42,0.02)',
      }}
    >
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div className="flex items-end gap-3 flex-wrap">{filters}</div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function FilterField({ label, icon, children }: { label: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label
        className="text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1"
        style={{ color: 'var(--tfd-text-muted)', letterSpacing: '0.08em' }}
      >
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

export function PillButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1.5 text-[12px] font-semibold rounded-md transition-colors border"
      style={{
        background: active ? 'var(--tfd-primary-500)' : 'white',
        borderColor: active ? 'var(--tfd-primary-500)' : 'var(--tfd-surface-border)',
        color: active ? 'white' : 'var(--tfd-text-secondary)',
      }}
    >
      {children}
    </button>
  );
}

export function PrintButton({ label = 'Imprimir' }: { label?: string }) {
  return (
    <button className="tfd-btn tfd-btn-primary" onClick={() => window.print()}>
      <Printer size={14} /> {label}
    </button>
  );
}

/* ====================================================== */
/*  Hero card — identificação do relatório (SES)          */
/* ====================================================== */

export function ReportHero({
  numero,
  titulo,
  periodoLabel,
  situacao,
  rightSlot,
}: {
  numero?: string | number;
  titulo: string;
  periodoLabel: string;
  situacao?: { label: string; tone: 'draft' | 'approved' | 'closed' };
  rightSlot?: ReactNode;
}) {
  const TONE: Record<NonNullable<typeof situacao>['tone'], { bg: string; fg: string }> = {
    draft: { bg: '#FEF3C7', fg: '#92400E' },
    approved: { bg: '#DCFCE7', fg: '#15803D' },
    closed: { bg: '#F1F5F9', fg: '#475569' },
  };
  return (
    <div
      className="overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, var(--tfd-primary-500) 0%, #0D4FBD 100%)',
        borderRadius: 12,
        color: 'white',
      }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap p-5">
        <div className="min-w-0">
          <p
            className="text-[10px] font-bold uppercase tracking-widest opacity-80"
            style={{ letterSpacing: '0.12em' }}
          >
            Governo do Maranhão · Secretaria de Saúde
          </p>
          <h2 className="text-[17px] font-bold leading-tight mt-1">{titulo}</h2>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {numero != null && (
              <span
                className="inline-flex items-center gap-1 text-[12px] font-mono px-2 py-0.5 rounded"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                #{numero}
              </span>
            )}
            <span className="text-[12.5px] opacity-90">{periodoLabel}</span>
            {situacao && (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-bold uppercase px-2 py-0.5 rounded"
                style={{
                  background: TONE[situacao.tone].bg,
                  color: TONE[situacao.tone].fg,
                  letterSpacing: '0.04em',
                }}
              >
                {situacao.label}
              </span>
            )}
          </div>
        </div>
        {rightSlot && <div className="shrink-0">{rightSlot}</div>}
      </div>
    </div>
  );
}

/* ====================================================== */
/*  Stats row — KPI cards horizontais                     */
/* ====================================================== */

export type StatTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export function StatsRow({
  items,
}: {
  items: { label: string; value: string; hint?: string; tone?: StatTone; icon?: ReactNode }[];
}) {
  return (
    <div
      className="flex items-stretch flex-wrap"
      style={{
        background: 'white',
        border: '1px solid var(--tfd-surface-border)',
        borderRadius: 12,
        boxShadow: '0 1px 0 rgba(15,23,42,0.02)',
      }}
    >
      {items.map((it, i) => (
        <div key={i} className="flex-1 min-w-[140px] px-5 py-4 stat-cell">
          <div
            className="text-[10px] font-bold uppercase inline-flex items-center gap-1.5"
            style={{ color: '#64748B', letterSpacing: '0.08em' }}
          >
            {it.icon}
            {it.label}
          </div>
          <div
            className="font-mono mt-1"
            style={{
              color: toneColor(it.tone),
              fontSize: 19,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              lineHeight: 1.2,
            }}
          >
            {it.value}
          </div>
          {it.hint && (
            <div className="text-[11.5px] mt-1" style={{ color: '#94A3B8' }}>
              {it.hint}
            </div>
          )}
        </div>
      ))}
      <style jsx>{`
        @media (min-width: 640px) {
          .stat-cell + .stat-cell { border-left: 1px solid #F1F5F9; }
        }
      `}</style>
    </div>
  );
}

function toneColor(tone?: StatTone): string {
  switch (tone) {
    case 'success': return '#15803D';
    case 'warning': return '#B45309';
    case 'danger':  return '#B91C1C';
    case 'info':    return '#1D4ED8';
    default:        return '#0F172A';
  }
}

/* ====================================================== */
/*  Table card                                            */
/* ====================================================== */

export function TableCard({
  title,
  subtitle,
  count,
  rightSlot,
  children,
}: {
  title?: string;
  subtitle?: string;
  count?: number;
  rightSlot?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        background: 'white',
        border: '1px solid var(--tfd-surface-border)',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 1px 0 rgba(15,23,42,0.02)',
      }}
    >
      {title && (
        <header
          className="flex items-center justify-between gap-3 px-4 py-3"
          style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}
        >
          <div className="flex items-baseline gap-2 min-w-0">
            <h3 className="text-[14px] font-semibold" style={{ color: '#0F172A' }}>{title}</h3>
            {typeof count === 'number' && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'var(--tfd-primary-50, #EBF0FF)', color: 'var(--tfd-primary-500)' }}
              >
                {count}
              </span>
            )}
            {subtitle && <span className="text-[12px] ml-1" style={{ color: '#94A3B8' }}>{subtitle}</span>}
          </div>
          {rightSlot}
        </header>
      )}
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

/* ====================================================== */
/*  Print styles globais                                  */
/* ====================================================== */

export function ReportPrintStyles() {
  return (
    <style jsx global>{`
      @media print {
        body { background: white !important; }
        .no-print,
        aside,
        nav,
        header[role="banner"],
        footer { display: none !important; }
        .report-toolbar { display: none !important; }
        .tfd-card, [data-print-flat] {
          border: none !important;
          box-shadow: none !important;
        }
        @page {
          size: A4 landscape;
          margin: 1cm;
        }
      }
    `}</style>
  );
}
