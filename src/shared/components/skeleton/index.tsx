'use client';

import { Skeleton } from '@/components/ui/skeleton';

/* -------------------------------------------------------------------------- */
/*  Primitivas reutilizáveis de skeleton                                       */
/*  Use no lugar de Loader2 quando o estado é "carregamento inicial de dados". */
/*  Mantenha Loader2 apenas para ações inline (botões, submits).               */
/* -------------------------------------------------------------------------- */

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}

export function TableSkeleton({ rows = 6, columns = 4, showHeader = true }: TableSkeletonProps) {
  return (
    <div
      style={{
        background: 'white',
        border: '1px solid var(--tfd-surface-border)',
        borderRadius: 'var(--tfd-radius-lg)',
        overflow: 'hidden',
      }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          {showHeader && (
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--tfd-surface-border)' }}>
                {Array.from({ length: columns }).map((_, i) => (
                  <th key={i} className="px-4 py-3 text-left">
                    <Skeleton className="h-3 w-24" />
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r} style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}>
                {Array.from({ length: columns }).map((_, c) => (
                  <td key={c} className="px-4 py-3.5">
                    <Skeleton className={`h-4 ${c === 0 ? 'w-48' : c === columns - 1 ? 'w-20' : 'w-32'}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CardListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg p-3"
          style={{ border: '1px solid var(--tfd-surface-border)', background: 'white' }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-40" />
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function KpiBarSkeleton({ items = 3 }: { items?: number }) {
  return (
    <div
      className="mb-6 overflow-hidden"
      style={{
        background: 'white',
        border: '1px solid #E2E8F0',
        borderRadius: 10,
        boxShadow: '0 1px 0 rgba(15,23,42,0.02)',
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 kpi-bar-skeleton">
        {Array.from({ length: items }).map((_, i) => (
          <div key={i} className="px-5 py-4 kpi-cell-skeleton space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-6 w-16" />
          </div>
        ))}
      </div>
      <style jsx>{`
        @media (min-width: 640px) {
          .kpi-cell-skeleton + .kpi-cell-skeleton { border-left: 1px solid #F1F5F9; }
        }
      `}</style>
    </div>
  );
}

export function DetailHeaderSkeleton() {
  return (
    <div
      className="mb-6 overflow-hidden"
      style={{
        background: 'white',
        border: '1px solid #E2E8F0',
        borderRadius: 10,
        boxShadow: '0 1px 0 rgba(15,23,42,0.02)',
      }}
    >
      <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-3">
        <div className="min-w-0 flex items-center gap-3 flex-wrap">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-9 w-20 shrink-0" />
      </div>
      <div className="px-6 pb-3 flex items-center gap-4 flex-wrap">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="px-6 pb-5 flex items-center gap-3 flex-wrap">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-3 w-56" />
        <Skeleton className="h-3 w-48" />
      </div>
    </div>
  );
}

export function TabsSkeleton({ tabs = 3 }: { tabs?: number }) {
  return (
    <div className="flex items-center gap-1 mb-6" style={{ borderBottom: '1px solid #E2E8F0' }}>
      {Array.from({ length: tabs }).map((_, i) => (
        <div key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  );
}

export function SectionSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div
      style={{
        background: 'white',
        border: '1px solid var(--tfd-surface-border)',
        borderRadius: 'var(--tfd-radius-lg)',
        padding: '1.25rem',
      }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-5 w-40" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 flex-1 max-w-[200px]" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DetailPageSkeleton({
  withKpis = true,
  tabs = 3,
}: { withKpis?: boolean; tabs?: number } = {}) {
  return (
    <div>
      <Skeleton className="h-3 w-32 mb-3" />
      <DetailHeaderSkeleton />
      {withKpis && <KpiBarSkeleton />}
      <TabsSkeleton tabs={tabs} />
      <SectionSkeleton />
    </div>
  );
}

/**
 * Linhas de skeleton para uso DENTRO de um <tbody> existente.
 * Mantém a estrutura de células (td) coerente com a tabela hospedeira.
 */
export function TableRowsSkeleton({
  rows = 6,
  columns = 4,
  lastColRight = true,
}: { rows?: number; columns?: number; lastColRight?: boolean }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={`sk-${r}`} style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}>
          {Array.from({ length: columns }).map((__, c) => {
            const isLast = c === columns - 1;
            const isFirst = c === 0;
            return (
              <td key={c} className="px-4 py-3.5">
                <Skeleton
                  className={
                    isFirst ? 'h-4 w-48'
                    : isLast && lastColRight ? 'h-4 w-16 ml-auto'
                    : 'h-4 w-32'
                  }
                />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}

export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}
