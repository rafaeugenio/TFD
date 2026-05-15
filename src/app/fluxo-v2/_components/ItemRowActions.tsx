'use client';

import { Pencil, Trash2, RotateCcw } from 'lucide-react';

/**
 * T2.AL — Botões de Editar/Reembolso/Cancelar (Excluir) para itens das listas.
 * `onReembolso` opcional — quando informado, adiciona o botão amarelo entre
 * Editar e Excluir.
 */
interface Props {
  onEditar: () => void;
  onExcluir: () => void;
  onReembolso?: () => void;
  /** Tooltip do botão de excluir — útil pra dizer "Cancelar passagem". */
  labelExcluir?: string;
  /** Tooltip do botão de reembolso. */
  labelReembolso?: string;
  disabled?: boolean;
  tooltipDisabled?: string;
  /** Quando true, botão de reembolso fica destacado (amarelo cheio). */
  reembolsado?: boolean;
}

export default function ItemRowActions({
  onEditar,
  onExcluir,
  onReembolso,
  labelExcluir = 'Excluir',
  labelReembolso = 'Reembolsar',
  disabled = false,
  tooltipDisabled,
  reembolsado = false,
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
      {onReembolso && (
        <IconButton
          icon={RotateCcw}
          label={reembolsado ? `${labelReembolso} (já registrado)` : labelReembolso}
          onClick={onReembolso}
          disabled={disabled}
          tooltipDisabled={tooltipDisabled}
          color={reembolsado ? '#B45309' : '#92400E'}
          hoverBg="#FEF3C7"
        />
      )}
      <IconButton
        icon={Trash2}
        label={labelExcluir}
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
