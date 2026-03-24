'use client';

import { StatusSolicitacao } from '@/core/models';

/* -------------------------------------------------- */
/*  Color + label mappings per status                  */
/*  Uses PrimeNG Aura Tag tokens:                      */
/*    padding 0.25rem 0.625rem, font 0.75rem/700       */
/*    radius pill (2rem), dot indicator                 */
/* -------------------------------------------------- */

interface StatusStyle {
  bg: string;
  text: string;
  label: string;
}

const statusMap: Record<StatusSolicitacao, StatusStyle> = {
  NOVO: {
    bg: 'var(--tfd-surface-100)',
    text: 'var(--tfd-surface-700)',
    label: 'Novo',
  },
  EM_ANALISE: {
    bg: '#DBEAFE',
    text: '#1D4ED8',
    label: 'Em Análise',
  },
  EXIGENCIA: {
    bg: '#FEF3C7',
    text: '#92400E',
    label: 'Exigência',
  },
  AGUARDANDO_REGULACAO: {
    bg: '#EDE9FE',
    text: '#6D28D9',
    label: 'Ag. Regulação',
  },
  AGUARDANDO_AGENDAMENTO: {
    bg: '#CFFAFE',
    text: '#0E7490',
    label: 'Ag. Agendamento',
  },
  AGUARDANDO_EMISSAO: {
    bg: '#E0E7FF',
    text: '#4338CA',
    label: 'Ag. Emissão',
  },
  EMITIDA: {
    bg: '#CCFBF1',
    text: '#0F766E',
    label: 'Emitida',
  },
  EM_VIAGEM: {
    bg: '#DBEAFE',
    text: '#1E40AF',
    label: 'Em Viagem',
  },
  EM_PERMANENCIA: {
    bg: '#FFEDD5',
    text: '#C2410C',
    label: 'Em Permanência',
  },
  CONCLUIDO: {
    bg: '#DCFCE7',
    text: '#15803D',
    label: 'Concluído',
  },
  INDEFERIDO: {
    bg: '#FEE2E2',
    text: '#B91C1C',
    label: 'Indeferido',
  },
  CANCELADO: {
    bg: 'var(--tfd-surface-100)',
    text: 'var(--tfd-surface-500)',
    label: 'Cancelado',
  },
};

/* -------------------------------------------------- */
/*  Component — uses tfd-tag classes                   */
/* -------------------------------------------------- */

interface StatusTagProps {
  status: StatusSolicitacao;
}

export default function StatusTag({ status }: StatusTagProps) {
  const { bg, text, label } = statusMap[status];

  return (
    <span
      className="tfd-tag tfd-tag--rounded tfd-tag--dot"
      style={{ backgroundColor: bg, color: text }}
    >
      {label}
    </span>
  );
}
