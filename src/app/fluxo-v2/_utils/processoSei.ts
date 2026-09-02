import type { ProcessoSeiMock, SolicitacaoMock } from '@/core/mocks/fluxo-v2-v3-seed';

/**
 * Processo SEI vigente da solicitação — o último adicionado ao histórico.
 * Solicitações antigas, criadas antes desta funcionalidade (26/08/2026),
 * não têm `processosSei` preenchido; nesse caso cai para o par legado
 * `numeroSEI`/`seiUrl`. `undefined` quando a solicitação nunca teve
 * processo SEI registrado.
 */
export function processoSeiVigente(
  s: Pick<SolicitacaoMock, 'processosSei' | 'numeroSEI' | 'seiUrl'>,
): { numero: string; url?: string } | undefined {
  const lista = s.processosSei ?? [];
  if (lista.length > 0) {
    const ultimo = lista[lista.length - 1];
    return { numero: ultimo.numero, url: ultimo.url };
  }
  if (s.numeroSEI) return { numero: s.numeroSEI, url: s.seiUrl };
  return undefined;
}

/**
 * Histórico completo de processos SEI, do mais antigo ao mais recente (o
 * último é o vigente). Solicitações sem `processosSei` preenchido devolvem
 * o par legado como item único; sem nenhum processo, devolve lista vazia.
 */
export function historicoProcessosSei(
  s: Pick<SolicitacaoMock, 'processosSei' | 'numeroSEI' | 'seiUrl' | 'dataCriacao'>,
): ProcessoSeiMock[] {
  if (s.processosSei && s.processosSei.length > 0) return s.processosSei;
  if (s.numeroSEI) {
    return [{ id: 'sei-legado', numero: s.numeroSEI, url: s.seiUrl, data: s.dataCriacao }];
  }
  return [];
}

export function novoProcessoSeiId(): string {
  return `sei-${Math.random().toString(36).slice(2, 9)}`;
}
