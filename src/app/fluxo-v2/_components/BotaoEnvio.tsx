'use client';

import type { LucideIcon } from 'lucide-react';
import { BG_DESTINO, BORDER_DESTINO, COR_DESTINO, type SetorAcao } from '../_utils/lock';

interface Props {
  /**
   * Quando ausente, o botão usa a variante neutra azul-acinzentada
   * (estado padrão a partir do T2.AE — uma única CTA "Enviar" por linha
   * abre o drawer onde o usuário escolhe o destino). Mantemos a prop
   * opcional pra preservar compat caso outros pontos do app ainda
   * queiram a variante colorida por destino.
   */
  destino?: SetorAcao;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  /** Quando true, mostra o texto curto ao lado do ícone. Default false. */
  showLabel?: boolean;
}

/** Paleta neutra azul-acinzentada — usada quando não há destino específico. */
const NEUTRO = {
  bg: '#EFF6FF',
  border: '#BFDBFE',
  fg: '#1D4ED8',
};

/**
 * Botão de tramitação destacado, exibido na coluna de ações das tabelas dos
 * setores. A partir do T2.AE a variante padrão é neutra (azul-acinzentada):
 * existe um único botão "Enviar" por linha, e a escolha do destino
 * acontece dentro do drawer. A variante colorida-por-destino continua
 * disponível pra outros contextos via prop `destino`.
 */
export default function BotaoEnvio({
  destino,
  icon: Icon,
  label,
  onClick,
  showLabel = false,
}: Props) {
  const fg = destino ? COR_DESTINO[destino] : NEUTRO.fg;
  const bg = destino ? BG_DESTINO[destino] : NEUTRO.bg;
  const border = destino ? BORDER_DESTINO[destino] : NEUTRO.border;

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="inline-flex items-center justify-center gap-1 transition-all"
      style={{
        height: 32,
        minWidth: 32,
        padding: showLabel ? '0 10px' : '0 8px',
        marginLeft: 4,
        borderRadius: 8,
        background: bg,
        color: fg,
        border: `1px solid ${border}`,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.02em',
        cursor: 'pointer',
        boxShadow: `0 1px 0 ${border}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = fg;
        e.currentTarget.style.color = 'white';
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = `0 4px 10px -2px ${fg}40`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = bg;
        e.currentTarget.style.color = fg;
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = `0 1px 0 ${border}`;
      }}
    >
      <Icon size={14} strokeWidth={2.4} />
      {showLabel && <span className="uppercase tracking-wider">{label}</span>}
    </button>
  );
}
