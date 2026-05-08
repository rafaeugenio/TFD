'use client';

import type { LucideIcon } from 'lucide-react';

/**
 * Mini-dashboard card — versão corporativa neutra.
 *
 * Antes usávamos preenchimentos coloridos (verde, amber, indigo, pink, gradiente
 * escuro de "highlight"). O novo padrão é:
 *   - card branco com borda neutra `#E2E8F0`
 *   - ícone com tinta sutil cinza (ou azul Citiesoft em `highlight`)
 *   - número grande slate-900
 *   - label slate-500 uppercase tracking
 *
 * A prop `color` é mantida para compatibilidade mas tratada como cosmético leve
 * (apenas a cor do ícone). O acento só aparece no `highlight` (Total geral).
 */

export type MiniDashboardColor =
  | 'green'
  | 'red'
  | 'amber'
  | 'blue'
  | 'indigo'
  | 'pink'
  | 'slate'
  | 'highlight';

const ICON_TINT: Record<MiniDashboardColor, string> = {
  green: '#16A34A',
  red:   '#DC2626',
  amber: '#D97706',
  blue:  '#146BFA',
  indigo:'#475569',
  pink:  '#475569',
  slate: '#64748B',
  highlight: '#146BFA',
};

interface Props {
  label: string;
  value: string | number;
  color?: MiniDashboardColor;
  icon?: LucideIcon;
  hint?: string;
}

export default function MiniDashboardCard({ label, value, color = 'slate', icon: Icon, hint }: Props) {
  const isHighlight = color === 'highlight';
  const iconColor = ICON_TINT[color];
  return (
    <div
      className="p-5"
      style={{
        background: 'white',
        border: '1px solid #E2E8F0',
        borderRadius: 10,
        minHeight: 96,
        boxShadow: '0 1px 0 rgba(15,23,42,0.02)',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-[12px] font-semibold uppercase"
          style={{ color: '#64748B', letterSpacing: '0.06em' }}
        >
          {label}
        </span>
        {Icon && (
          <span
            style={{
              width: 28, height: 28, borderRadius: 8,
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: iconColor,
            }}
          >
            <Icon size={14} strokeWidth={2} />
          </span>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <span
          style={{
            color: '#0F172A',
            fontSize: isHighlight ? 22 : 20,
            fontWeight: isHighlight ? 700 : 600,
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
          }}
        >
          {value}
        </span>
        {hint && (
          <span className="text-[12px]" style={{ color: '#94A3B8' }}>
            {hint}
          </span>
        )}
      </div>
    </div>
  );
}
