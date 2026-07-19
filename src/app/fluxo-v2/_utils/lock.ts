import {
  STATUS_LABEL,
  type SetorAtivo,
  type SolicitacaoMock,
} from '@/core/mocks/fluxo-v2-v3-seed';

/** Setor de ação (exclui 'encerramento' — quando encerrada, ninguém edita). */
export type SetorAcao = 'dados_basicos' | 'regulacao' | 'passagens' | 'ajuda_custo' | 'acompanhamento';

/** Setor responsável pela próxima ação na solicitação, derivado do status. */
export function setorAtual(s: SolicitacaoMock): SetorAtivo {
  switch (s.status) {
    case 'em_encerramento':   return 'encerramento';
    case 'em_dados_basicos':  return 'dados_basicos';
    case 'em_regulacao':      return 'regulacao';
    case 'em_passagens':      return 'passagens';
    case 'em_ajuda_custo':    return 'ajuda_custo';
    case 'em_acompanhamento': return 'acompanhamento';
    default:                  return 'dados_basicos';
  }
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
  if (s.status === 'em_encerramento') return true;
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
  if (s.status === 'em_encerramento') {
    return 'Solicitação encerrada — sem ações disponíveis.';
  }
  const atual = STATUS_LABEL[s.status];
  return `Solicitação está em ${atual} — só pode ser editada quando voltar para o setor.`;
}

/** Cor de destaque do botão de envio por destino. */
export const COR_DESTINO: Record<SetorAcao, string> = {
  regulacao: '#7C3AED',
  passagens: '#D97706',
  ajuda_custo: '#C2410C',
  acompanhamento: '#1D4ED8',
  dados_basicos: '#475569',
};

/** Versão suave (bg) das cores de destino. */
export const BG_DESTINO: Record<SetorAcao, string> = {
  regulacao: '#F5F3FF',
  passagens: '#FFFBEB',
  ajuda_custo: '#FFF7ED',
  acompanhamento: '#EFF6FF',
  dados_basicos: '#F1F5F9',
};

export const BORDER_DESTINO: Record<SetorAcao, string> = {
  regulacao: '#DDD6FE',
  passagens: '#FCD34D',
  ajuda_custo: '#FED7AA',
  acompanhamento: '#BFDBFE',
  dados_basicos: '#CBD5E1',
};
