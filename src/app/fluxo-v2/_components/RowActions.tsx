'use client';

import type { LucideIcon } from 'lucide-react';

export interface RowAction {
  key: string;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  /** Se false, o ícone some. Default true. RBAC vai gancho aqui na Fase 4. */
  visivel?: boolean;
  /** Cor de hover/foreground (default: --tfd-blue). */
  tone?: 'default' | 'danger' | 'amber';
  disabled?: boolean;
}

/**
 * Conjunto de ações rápidas em ícones, exibidas na coluna "Ações" das listas.
 * Cada ação é um botão 28x28 ghost-style com tooltip nativo (`title`). Mantém
 * a tabela limpa em desktop. TODO Fase 4: integrar permissões/RBAC via `visivel`.
 */
export default function RowActions({ actions }: { actions: RowAction[] }) {
  const tones = {
    default: { hover: '#EBF0FF', fg: 'var(--tfd-blue)' },
    danger:  { hover: '#FEE2E2', fg: '#B91C1C' },
    amber:   { hover: '#FEF3C7', fg: '#92400E' },
  } as const;

  return (
    <div className="inline-flex items-center gap-0.5">
      {actions
        .filter((a) => a.visivel !== false)
        .map((a) => {
          const t = tones[a.tone ?? 'default'];
          const Icon = a.icon;
          return (
            <button
              key={a.key}
              type="button"
              title={a.label}
              aria-label={a.label}
              disabled={a.disabled}
              onClick={(e) => {
                e.stopPropagation();
                if (!a.disabled) a.onClick();
              }}
              className="inline-flex items-center justify-center transition-colors"
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: 'transparent',
                color: a.disabled ? '#CBD5E1' : '#475569',
                cursor: a.disabled ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={(e) => {
                if (a.disabled) return;
                e.currentTarget.style.background = t.hover;
                e.currentTarget.style.color = t.fg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = a.disabled ? '#CBD5E1' : '#475569';
              }}
            >
              <Icon size={15} />
            </button>
          );
        })}
    </div>
  );
}
