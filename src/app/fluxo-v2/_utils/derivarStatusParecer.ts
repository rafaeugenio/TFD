/**
 * Status do último parecer de uma solicitação — usado no filtro da fila de
 * Regulação, no mesmo padrão dos demais filtros derivados (`derivarRegional.ts`,
 * `derivarResponsavel.ts`). "ajuste" não é um valor de `decisao` — é derivado
 * da presença de `observacaoAjuste` no parecer (ver comentário em
 * `ParecerMock`, no seed).
 */

import type { ParecerMock, SolicitacaoMock } from '@/core/mocks/fluxo-v2-v3-seed';

export type StatusParecerFiltro = 'all' | 'sem_parecer' | 'deferido' | 'indeferido' | 'ajuste';

export const STATUS_PARECER_FILTRO_LABEL: Record<StatusParecerFiltro, string> = {
  all: 'Todos os pareceres',
  sem_parecer: 'Sem parecer',
  deferido: 'Deferido',
  indeferido: 'Indeferido',
  ajuste: 'Em ajuste',
};

/** Status do parecer mais recente da solicitação — 'sem_parecer' quando a
 *  lista de pareceres está vazia. */
export function statusUltimoParecer(s: Pick<SolicitacaoMock, 'pareceres'>): Exclude<StatusParecerFiltro, 'all'> {
  const ultimo = s.pareceres[s.pareceres.length - 1];
  if (!ultimo) return 'sem_parecer';
  return statusDoParecer(ultimo);
}

/** Status de um parecer específico — 'ajuste' quando há observação de ajuste
 *  pendente, independentemente da decisão registrada pelo médico. */
export function statusDoParecer(p: Pick<ParecerMock, 'decisao' | 'observacaoAjuste'>): 'deferido' | 'indeferido' | 'ajuste' {
  if (p.observacaoAjuste) return 'ajuste';
  return p.decisao;
}

/** Testa se a solicitação casa com o filtro por status de parecer selecionado. */
export function casaComFiltroStatusParecer(s: Pick<SolicitacaoMock, 'pareceres'>, filtro: StatusParecerFiltro): boolean {
  if (filtro === 'all') return true;
  return statusUltimoParecer(s) === filtro;
}
