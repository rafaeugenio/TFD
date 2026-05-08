'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Undo2, Info } from 'lucide-react';
import type { UltimaTramitacao } from '@/core/mocks/fluxo-v2-v3-seed';
import {
  formatarTempoDesdeTramitacao,
  horasDesdeTramitacao,
} from '../_utils/tramitacao';

/**
 * T2.Z — Badge "Chegou há Xh" exibido à esquerda do número da solicitação
 * quando a tramitação é recente. Cor segue o destino:
 * - amber: devolução para Regulação
 * - azul:  encaminhamento para Financeiro
 * - cinza: variant `neutral` (usado na tabela master de Solicitações)
 */
export function TramitacaoBadge({
  tramitacao,
  variant,
}: {
  tramitacao: UltimaTramitacao;
  variant: 'amber' | 'blue' | 'neutral';
}) {
  // Re-render leve a cada minuto pra "Chegou há Xh" sair da tela depois de 24h
  // sem precisar reload. Custo desprezível — uma fila típica tem dezenas de linhas.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const palette = {
    amber: { bg: '#FEF3C7', fg: '#92400E', border: '#FCD34D' },
    blue:  { bg: '#DBEAFE', fg: '#1D4ED8', border: '#93C5FD' },
    neutral: { bg: '#F1F5F9', fg: '#64748B', border: '#E2E8F0' },
  }[variant];

  const Icon =
    tramitacao.tipo === 'devolucao_regulacao' ||
    tramitacao.tipo === 'devolucao_dados_basicos'
      ? Undo2
      : ArrowRight;

  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-[2px] text-[10px] font-bold uppercase whitespace-nowrap"
      style={{
        background: palette.bg,
        color: palette.fg,
        border: `1px solid ${palette.border}`,
        borderRadius: 999,
        letterSpacing: '0.04em',
      }}
      title={tooltipText(tramitacao)}
    >
      <Icon size={9} strokeWidth={2.5} />
      Chegou {formatarTempoDesdeTramitacao(tramitacao)}
    </span>
  );
}

/**
 * Popover discreto ativado por hover/click no ícone Info — mostra a observação
 * completa, autor e tempo. Implementado com CSS-only (`group-hover`) para evitar
 * dependências e ser acessível ao leitor de tela via `aria-describedby` simulado
 * pelo `title` no ícone (fallback nativo).
 */
export function TramitacaoInfoPopover({
  tramitacao,
  variant,
}: {
  tramitacao: UltimaTramitacao;
  variant: 'amber' | 'blue';
}) {
  const palette = {
    amber: { fg: '#B45309', accent: '#92400E', border: '#FCD34D', bg: '#FFFBEB' },
    blue:  { fg: '#1D4ED8', accent: '#1E3A8A', border: '#93C5FD', bg: '#EFF6FF' },
  }[variant];

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; placement: 'below' | 'above' } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Recalcula posição quando abre. Usa rect do trigger + dimensões estimadas
  // do popover (w=320). Se não couber abaixo da viewport, abre acima.
  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const POPOVER_W = 320;
    const POPOVER_H_EST = 140; // estimativa conservadora
    const GAP = 6;
    const rect = triggerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const spaceBelow = vh - rect.bottom;
    const placement: 'below' | 'above' = spaceBelow >= POPOVER_H_EST + GAP ? 'below' : 'above';

    let left = rect.left;
    if (left + POPOVER_W + 8 > vw) left = vw - POPOVER_W - 8;
    if (left < 8) left = 8;

    const top = placement === 'below'
      ? rect.bottom + GAP
      : rect.top - GAP - POPOVER_H_EST;

    setCoords({ top, left, placement });
  }, [isOpen]);

  // Fecha ao scrollar/redimensionar pra não ficar "pendurado".
  useEffect(() => {
    if (!isOpen) return;
    const close = () => setIsOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [isOpen]);

  return (
    <span className="relative inline-flex align-middle ml-1">
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex items-center justify-center transition-colors hover:bg-white"
        aria-label="Ver observação da tramitação"
        style={{
          width: 20, height: 20, borderRadius: 999,
          background: 'transparent',
          color: palette.fg,
        }}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onClick={(e) => e.stopPropagation()}
      >
        <Info size={12} />
      </button>
      {mounted && isOpen && coords && createPortal(
        <div
          role="tooltip"
          className="pointer-events-none p-3 text-[11.5px] leading-relaxed"
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            zIndex: 9999,
            background: 'white',
            border: `1px solid ${palette.border}`,
            borderRadius: 10,
            boxShadow: '0 12px 32px -8px rgba(15, 23, 42, 0.18), 0 2px 6px -2px rgba(15, 23, 42, 0.08)',
            color: '#1A1D2B',
            width: 320,
          }}
        >
          <div
            className="text-[10px] font-bold uppercase tracking-wider mb-1.5"
            style={{ color: palette.accent, letterSpacing: '0.06em' }}
          >
            {labelTramitacao(tramitacao)}
          </div>
          {tramitacao.observacao ? (
            <p style={{ color: '#1F2937' }}>{tramitacao.observacao}</p>
          ) : (
            <p style={{ color: '#9CA3AF', fontStyle: 'italic' }}>
              Nenhuma observação registrada.
            </p>
          )}
          <div
            className="mt-2 pt-2 text-[10.5px]"
            style={{ borderTop: '1px dashed #E5E7EB', color: '#6B7280' }}
          >
            por <strong style={{ color: '#374151' }}>{tramitacao.autor}</strong> — {tramitacao.perfilAutor}
            {' · '}
            {formatarTempoDesdeTramitacao(tramitacao)}
          </div>
        </div>,
        document.body,
      )}
    </span>
  );
}

export function labelTramitacao(t: UltimaTramitacao): string {
  switch (t.tipo) {
    case 'devolucao_regulacao': return 'Devolvido pelo Financeiro';
    case 'devolucao_dados_basicos': return 'Devolvido pela Regulação';
    case 'envio_regulacao': return 'Enviado para Regulação';
    case 'envio_financeiro':
    case 'encaminhamento_financeiro':
    default:
      return 'Encaminhado pela Regulação';
  }
}

export function tooltipText(t: UltimaTramitacao): string {
  const cabecalho = labelTramitacao(t);
  const horas = horasDesdeTramitacao(t);
  const tempo = horas !== null ? ` (há ${horas}h)` : '';
  const obs = t.observacao ? `\n\n${t.observacao}` : '';
  return `${cabecalho}${tempo}\nPor ${t.autor} — ${t.perfilAutor}${obs}`;
}
