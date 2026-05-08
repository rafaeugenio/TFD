import {
  STATUS_LABEL,
  type SetorAtivo,
  type SolicitacaoMock,
} from '@/core/mocks/fluxo-v2-v3-seed';

/** Setor de ação (exclui 'encerrada' — quando encerrada, ninguém edita). */
export type SetorAcao = 'dados_basicos' | 'regulacao' | 'financeiro';

/** Setor responsável pela próxima ação na solicitação, derivado do status. */
export function setorAtual(s: SolicitacaoMock): SetorAtivo {
  if (s.status === 'encerrada') return 'encerrada';
  if (s.status === 'em_dados_basicos') return 'dados_basicos';
  if (s.status === 'em_regulacao') return 'regulacao';
  if (s.status === 'em_financeiro') return 'financeiro';
  return 'dados_basicos';
}

/**
 * Retorna `true` quando o setor de ação NÃO bate com o setor atual da
 * solicitação — ou seja, a ação está bloqueada por lock de setor.
 * Solicitações encerradas estão sempre locked.
 */
export function isLocked(
  s: SolicitacaoMock,
  setorAcao: SetorAcao,
): boolean {
  if (s.status === 'encerrada') return true;
  return setorAtual(s) !== setorAcao;
}

/**
 * Texto do tooltip mostrado em ações locked. Explica em qual setor a
 * solicitação está e que precisa retornar pra poder ser editada.
 */
export function tooltipLocked(
  s: SolicitacaoMock,
  _setorAcao: SetorAcao,
): string {
  if (s.status === 'encerrada') {
    return 'Solicitação encerrada — sem ações disponíveis.';
  }
  const atual = STATUS_LABEL[s.status];
  return `Solicitação está em ${atual} — só pode ser editada quando voltar para o setor.`;
}

/** Cor de destaque do botão de envio por destino. */
export const COR_DESTINO: Record<SetorAcao, string> = {
  regulacao: '#7C3AED',
  financeiro: '#D97706',
  dados_basicos: '#475569',
};

/** Versão suave (bg) das cores de destino. */
export const BG_DESTINO: Record<SetorAcao, string> = {
  regulacao: '#F5F3FF',
  financeiro: '#FFFBEB',
  dados_basicos: '#F1F5F9',
};

export const BORDER_DESTINO: Record<SetorAcao, string> = {
  regulacao: '#DDD6FE',
  financeiro: '#FCD34D',
  dados_basicos: '#CBD5E1',
};
