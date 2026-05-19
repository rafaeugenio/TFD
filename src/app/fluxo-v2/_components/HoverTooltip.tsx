'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface HoverTooltipProps {
  children: ReactNode;
  content: ReactNode;
  /** Atraso em ms antes de mostrar (default 200ms). Evita flicker em rolagens rápidas. */
  delay?: number;
  /** Largura máxima do tooltip (default 320). */
  maxWidth?: number;
  /** Inativa o tooltip (ex.: conteúdo vazio). */
  disabled?: boolean;
}

/**
 * Tooltip rico em hover. Usa Portal pra renderizar no `document.body` —
 * essencial dentro de tabelas com `overflow: hidden` que cortariam tooltips
 * absolutos. Posiciona-se acima do elemento por padrão, e flipa pra baixo se
 * não couber no viewport.
 */
export default function HoverTooltip({
  children,
  content,
  delay = 200,
  maxWidth = 320,
  disabled = false,
}: HoverTooltipProps) {
  const [pos, setPos] = useState<{ x: number; y: number; placement: 'top' | 'bottom' } | null>(null);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const show = () => {
    if (disabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      // Decide top/bottom baseado em espaço disponível acima (200px reservado).
      const spaceAbove = rect.top;
      const placement: 'top' | 'bottom' = spaceAbove > 200 ? 'top' : 'bottom';
      setPos({
        x: rect.left + rect.width / 2,
        y: placement === 'top' ? rect.top : rect.bottom,
        placement,
      });
    }, delay);
  };

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setPos(null);
  };

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        style={{ display: 'inline-flex', alignItems: 'center' }}
      >
        {children}
      </span>
      {pos && !disabled && typeof document !== 'undefined' &&
        createPortal(
          <div
            role="tooltip"
            style={{
              position: 'fixed',
              left: pos.x,
              top: pos.placement === 'top' ? pos.y - 8 : pos.y + 8,
              transform: pos.placement === 'top'
                ? 'translate(-50%, -100%)'
                : 'translate(-50%, 0)',
              background: '#1A1D2B',
              color: 'white',
              padding: '10px 12px',
              borderRadius: 8,
              fontSize: 12,
              lineHeight: 1.55,
              maxWidth,
              zIndex: 9999,
              pointerEvents: 'none',
              boxShadow: '0 10px 24px rgba(15,23,42,0.35)',
              fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
            }}
          >
            {content}
          </div>,
          document.body,
        )}
    </>
  );
}

/** Conteúdo padronizado de tooltip: linhas key/value para tooltips estruturados. */
export function TooltipKV({
  rows,
}: {
  rows: Array<{ k: string; v: ReactNode; mono?: boolean }>;
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 10, rowGap: 4 }}>
      {rows.map((r, i) => (
        <span key={`row-${i}`} style={{ display: 'contents' }}>
          <span
            style={{
              color: '#94A3B8',
              fontSize: 10.5,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              fontWeight: 600,
              alignSelf: 'baseline',
            }}
          >
            {r.k}
          </span>
          <span
            style={{
              color: 'white',
              fontSize: 12,
              fontFamily: r.mono ? 'var(--tfd-mono, ui-monospace, monospace)' : 'inherit',
            }}
          >
            {r.v}
          </span>
        </span>
      ))}
    </div>
  );
}
