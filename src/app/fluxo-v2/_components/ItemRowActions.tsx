'use client';

import { Pencil, Trash2 } from 'lucide-react';

/**
 * T2.AL — Botões de Editar e Excluir para itens das listas (pareceres,
 * tentativas, passagens, ajudas, adicionais). Padrão visual consistente em
 * todo o Fluxo v2: 24x24, ghost-style, tooltip via title, lock-aware.
 */
interface Props {
  onEditar: () => void;
  onExcluir: () => void;
  disabled?: boolean;
  /** Tooltip mostrado quando disabled (lock). */
  tooltipDisabled?: string;
}

export default function ItemRowActions({
  onEditar,
  onExcluir,
  disabled = false,
  tooltipDisabled,
}: Props) {
  return (
    <span className="inline-flex items-center gap-0.5">
      <IconButton
        icon={Pencil}
        label="Editar"
        onClick={onEditar}
        disabled={disabled}
        tooltipDisabled={tooltipDisabled}
        color="var(--tfd-blue-700, #1D4ED8)"
        hoverBg="#EBF0FF"
      />
      <IconButton
        icon={Trash2}
        label="Excluir"
        onClick={onExcluir}
        disabled={disabled}
        tooltipDisabled={tooltipDisabled}
        color="#B91C1C"
        hoverBg="#FEE2E2"
      />
    </span>
  );
}

function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  tooltipDisabled,
  color,
  hoverBg,
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tooltipDisabled?: string;
  color: string;
  hoverBg: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={disabled ? tooltipDisabled || label : label}
      aria-label={label}
      className="inline-flex items-center justify-center transition-colors"
      style={{
        width: 24,
        height: 24,
        borderRadius: 6,
        background: 'transparent',
        border: 'none',
        color: disabled ? '#CBD5E1' : color,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!disabled) e.currentTarget.style.background = hoverBg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <Icon size={13} strokeWidth={2} />
    </button>
  );
}
