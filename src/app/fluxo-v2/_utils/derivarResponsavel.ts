/**
 * Filtro por responsável — mesmo padrão dos filtros em cascata de região
 * (`derivarRegional.ts`): string vazia representa "todos", e um valor
 * sentinela cobre o estado "sem responsável definido".
 */

import type { SolicitacaoMock } from '@/core/mocks/fluxo-v2-v3-seed';

/** Sentinela para "sem responsável" — não colide com um id real de usuário. */
export const SEM_RESPONSAVEL = '__sem_responsavel__';

export type ResponsavelFiltroValue = string; // '' | SEM_RESPONSAVEL | id do usuário

export const RESPONSAVEL_FILTRO_VAZIO: ResponsavelFiltroValue = '';

/** Testa se a solicitação casa com o filtro por responsável selecionado —
 *  encontra a solicitação por qualquer uma das pessoas responsáveis. */
export function casaComFiltroResponsavel(
  s: Pick<SolicitacaoMock, 'responsaveisAtuais'>,
  filtro: ResponsavelFiltroValue,
): boolean {
  if (!filtro) return true;
  if (filtro === SEM_RESPONSAVEL) return !s.responsaveisAtuais?.length;
  return !!s.responsaveisAtuais?.some((r) => r.id === filtro);
}
