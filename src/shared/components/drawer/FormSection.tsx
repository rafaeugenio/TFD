import type { ReactNode } from 'react';

interface FormSectionProps {
  /** Título exibido como `<legend>` em uppercase com tracking. */
  title: string;
  /** Ícone opcional à esquerda do título. */
  icon?: ReactNode;
  /** Cor do título + ícone. Defaults para o cinza médio do design system. */
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  /** Ação opcional à direita (botão Adicionar, link, etc.). */
  action?: ReactNode;
  /** Texto auxiliar abaixo do título (subtítulo curto). */
  hint?: string;
  children: ReactNode;
  /** className extra no fieldset. */
  className?: string;
  /** Desabilita todos os campos da seção (nativo do `<fieldset>`). */
  disabled?: boolean;
}

/**
 * Decisão de design (2026-05): título + ícone do `FormSection` sempre usam o
 * azul primário do sistema. Os tons semânticos (success/warning/etc.) ficavam
 * "festa de cores" quando o drawer tinha 6+ seções. Mantemos o prop `tone`
 * como noop para não quebrar callers e permitir re-introduzir variantes
 * caso seja necessário no futuro.
 */
const TITLE_COLOR = 'var(--tfd-blue-700)';
const TONES: Record<NonNullable<FormSectionProps['tone']>, { fg: string }> = {
  default: { fg: TITLE_COLOR },
  primary: { fg: TITLE_COLOR },
  success: { fg: TITLE_COLOR },
  warning: { fg: TITLE_COLOR },
  danger: { fg: TITLE_COLOR },
  info: { fg: TITLE_COLOR },
};

/**
 * Bloco visual de agrupamento de campos num drawer/form. Usa `<fieldset>`
 * com borda suave + `<legend>` em uppercase com tracking pequeno (estilo
 * dos cards do design system TFD). Substitui o padrão antigo de
 * `<hr class="tfd-divider"> + <h3>`.
 */
export default function FormSection({
  title,
  icon,
  tone = 'default',
  action,
  hint,
  children,
  className,
  disabled,
}: FormSectionProps) {
  const palette = TONES[tone];
  return (
    <fieldset
      disabled={disabled}
      className={`px-3 pt-3 pb-4 mb-4 min-w-0 ${className ?? ''}`}
      style={{
        border: '1px solid var(--tfd-surface-border)',
        borderRadius: 10,
        background: disabled ? '#F8FAFC' : 'white',
        minWidth: 0,
      }}
    >
      <legend
        className="px-1.5 text-[11px] font-semibold uppercase tracking-wider inline-flex items-center gap-1.5"
        style={{ color: palette.fg }}
      >
        {icon}
        {title}
      </legend>

      {(action || hint) && (
        <div className="flex items-start justify-between gap-3 -mt-1 mb-3">
          {hint ? (
            <p className="text-[11.5px]" style={{ color: 'var(--tfd-text-muted)' }}>
              {hint}
            </p>
          ) : (
            <span />
          )}
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}

      {children}
    </fieldset>
  );
}
