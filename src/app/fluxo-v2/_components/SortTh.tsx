'use client';

import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

export type SortDir = 'asc' | 'desc' | null;

interface Props {
  label: string;
  field: string;
  currentField: string;
  currentDir: SortDir;
  onToggle: (field: string) => void;
  align?: 'left' | 'right';
  className?: string;
}

/**
 * Header de tabela v2 com ordenação clicável.
 * Mantém o visual upperCase + 12px + letter-spacing dos `<Th>` originais.
 */
export default function SortTh({
  label,
  field,
  currentField,
  currentDir,
  onToggle,
  align = 'left',
  className = '',
}: Props) {
  const active = currentField === field && currentDir !== null;
  const Icon = !active ? ArrowUpDown : currentDir === 'asc' ? ArrowUp : ArrowDown;

  return (
    <th
      className={`px-4 py-3 font-semibold cursor-pointer select-none ${align === 'right' ? 'text-right' : 'text-left'} ${className}`}
      style={{
        color: active ? '#1A1D2B' : '#64748B',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        transition: 'color 120ms',
      }}
      onClick={() => onToggle(field)}
      title="Ordenar"
    >
      <span className={`inline-flex items-center gap-1.5 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        {label}
        <Icon size={12} style={{ opacity: active ? 1 : 0.5 }} />
      </span>
    </th>
  );
}

/**
 * Toggle: null → asc → desc → null para a mesma coluna.
 * Para outra coluna, sempre começa em asc.
 */
export function nextSort(
  field: string,
  prev: { field: string; dir: SortDir },
): { field: string; dir: SortDir } {
  if (prev.field !== field) return { field, dir: 'asc' };
  if (prev.dir === 'asc') return { field, dir: 'desc' };
  return { field: '', dir: null };
}

/** Compara valores genéricos com fallback consistente. */
export function compareValues(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'pt-BR', { numeric: true, sensitivity: 'base' });
}
