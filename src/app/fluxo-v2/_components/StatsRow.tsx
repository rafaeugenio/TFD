'use client';

import type { CSSProperties, ReactNode } from 'react';

/**
 * StatsRow — mini-dashboard de métricas no topo das telas do Fluxo v2.
 *
 * Visual alinhado com o `FinStat` do `FinanceiroTab`: cells lado-a-lado num
 * container branco com borda neutra, divisor vertical de 1px entre cells,
 * label uppercase pequeno, valor mono em destaque e hint opcional.
 *
 * Estados:
 * - `onClick`: cell vira <button> com hover sutil (#F8FAFC).
 * - `active`: cell ganha borda superior 2px Citiesoft (#146BFA) e o label
 *   troca pra azul. Sem ponto colorido — visual mais limpo.
 *
 * Linha secundária (Regulação): cells menores (py-3, label 11px, valor 14px)
 * com header pequeno acima ("POR CARIMBO").
 *
 * Responsivo: <md (768px) empilha vertical com divisor horizontal entre cells.
 */

export interface Stat {
  label: string;
  value: string | number;
  /** Texto secundário pequeno abaixo do valor (ex.: "do mês corrente"). */
  hint?: string;
  /** Quando informado, o stat vira clicável. */
  onClick?: () => void;
  /** Estado "filtro aplicado": borda superior + label azul. */
  active?: boolean;
  /** Tooltip opcional. */
  title?: string;
}

export interface StatsRowProps {
  stats: Stat[];
  /** Linha secundária (cells menores). Usada na Regulação para distribuição por carimbo. */
  secondLine?: Stat[];
  /** Header pequeno acima da linha secundária (ex.: "Por carimbo"). */
  secondLineLabel?: string;
}

const COLOR_LABEL = '#64748B';
const COLOR_VALUE = '#0F172A';
const COLOR_HINT = '#94A3B8';
const COLOR_BORDER = '#E2E8F0';
const COLOR_BLUE = '#146BFA';
const COLOR_HOVER_BG = '#F8FAFC';

export default function StatsRow({ stats, secondLine, secondLineLabel }: StatsRowProps) {
  const hasSecond = !!secondLine && secondLine.length > 0;

  return (
    <div
      className="stats-row"
      style={{
        background: 'white',
        border: `1px solid ${COLOR_BORDER}`,
        borderRadius: 10,
        marginBottom: 16,
        overflow: 'hidden',
        boxShadow: '0 1px 0 rgba(15,23,42,0.02)',
      }}
    >
      <CellsLine stats={stats} variant="primary" />

      {hasSecond && (
        <>
          <div style={{ borderTop: `1px solid ${COLOR_BORDER}` }} />
          {secondLineLabel && (
            <div
              style={{
                padding: '10px 20px 0',
                color: COLOR_LABEL,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {secondLineLabel}
            </div>
          )}
          <CellsLine stats={secondLine!} variant="secondary" />
        </>
      )}

      <style jsx>{`
        @media (max-width: 767px) {
          .stats-row :global(.stats-row-line) {
            flex-direction: column;
            align-items: stretch;
          }
          .stats-row :global(.stats-row-divider) {
            width: 100% !important;
            height: 1px !important;
          }
        }
      `}</style>
    </div>
  );
}

function CellsLine({ stats, variant }: { stats: Stat[]; variant: 'primary' | 'secondary' }) {
  return (
    <div
      className="stats-row-line"
      style={{
        display: 'flex',
        alignItems: 'stretch',
      }}
    >
      {stats.map((s, idx) => (
        <ContentsFragment key={`${s.label}-${idx}`}>
          {idx > 0 && (
            <div
              className="stats-row-divider"
              aria-hidden
              style={{ width: 1, background: COLOR_BORDER, alignSelf: 'stretch' }}
            />
          )}
          <Cell stat={s} variant={variant} />
        </ContentsFragment>
      ))}
    </div>
  );
}

function ContentsFragment({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function Cell({ stat, variant }: { stat: Stat; variant: 'primary' | 'secondary' }) {
  const { label, value, hint, onClick, active, title } = stat;
  const clickable = !!onClick;
  const isPrimary = variant === 'primary';

  const padding = isPrimary ? '16px 20px' : '12px 20px';
  const labelSize = isPrimary ? 12 : 11;
  const valueSize = isPrimary ? 17 : 14;
  const hintSize = isPrimary ? 12 : 11;

  // Borda superior 2px no active. Reservamos sempre 2px (transparente quando
  // inativo) pra evitar "pulo" visual ao alternar o filtro.
  const topBorderColor = active ? COLOR_BLUE : 'transparent';

  const inner: ReactNode = (
    <>
      <div
        style={{
          color: active ? COLOR_BLUE : COLOR_LABEL,
          fontSize: labelSize,
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          marginBottom: 4,
          transition: 'color 120ms ease',
          lineHeight: 1.2,
        }}
      >
        {label}
      </div>
      <div
        className="font-mono"
        style={{
          color: COLOR_VALUE,
          fontSize: valueSize,
          fontWeight: 600,
          letterSpacing: '-0.01em',
          lineHeight: 1.2,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      {hint && (
        <div
          style={{
            color: COLOR_HINT,
            fontSize: hintSize,
            marginTop: 4,
            lineHeight: 1.3,
          }}
        >
          {hint}
        </div>
      )}
    </>
  );

  // Estilo base — sempre garantimos altura uniforme via flex column + padding
  // consistente. min-h também ajuda quando todos os hints estão vazios.
  const baseStyle: CSSProperties = {
    flex: '1 1 0%',
    minWidth: 0,
    padding,
    borderTop: `2px solid ${topBorderColor}`,
    transition: 'background 120ms ease, border-color 120ms ease',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
  };

  if (!clickable) {
    return (
      <div title={title} style={baseStyle}>
        {inner}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="stats-row-cell-btn"
      style={{
        ...baseStyle,
        background: 'transparent',
        border: 0,
        borderTop: `2px solid ${topBorderColor}`,
        cursor: 'pointer',
        textAlign: 'left',
        font: 'inherit',
      }}
    >
      {inner}
      <style jsx>{`
        .stats-row-cell-btn:hover {
          background: ${COLOR_HOVER_BG};
        }
        .stats-row-cell-btn:focus-visible {
          outline: 2px solid ${COLOR_BLUE};
          outline-offset: -2px;
        }
      `}</style>
    </button>
  );
}
