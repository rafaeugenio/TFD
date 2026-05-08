'use client';

/**
 * StatusDot — badge corporativo padrão do Fluxo v2.
 *
 * Visual no estilo "ponto + label" (Linear/Notion):
 * - fundo cinza claro neutro
 * - ponto de 8px com a cor semântica (única fonte de cor)
 * - label em slate-700
 *
 * Use a prop `tone` para escolher a cor do ponto. Tudo o mais é neutro.
 */

export type StatusDotTone =
  | 'neutral'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'muted';

const DOT_COLOR: Record<StatusDotTone, string> = {
  neutral: '#94A3B8', // slate-400
  success: '#16A34A', // green
  danger:  '#DC2626', // red
  warning: '#D97706', // amber
  info:    '#146BFA', // citiesoft blue
  muted:   '#CBD5E1', // slate-300
};

interface Props {
  tone?: StatusDotTone;
  children: React.ReactNode;
  /** Para rótulos críticos pode-se ativar negrito leve. Default false. */
  strong?: boolean;
  title?: string;
}

export default function StatusDot({
  tone = 'neutral',
  children,
  strong = false,
  title,
}: Props) {
  return (
    <span
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px 3px 8px',
        borderRadius: 999,
        background: '#F1F5F9',
        color: '#334155',
        fontSize: 12,
        fontWeight: strong ? 600 : 500,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        border: '1px solid #E2E8F0',
      }}
    >
      <span
        aria-hidden
        style={{
          width: 7,
          height: 7,
          borderRadius: 999,
          background: DOT_COLOR[tone],
          flexShrink: 0,
        }}
      />
      {children}
    </span>
  );
}
