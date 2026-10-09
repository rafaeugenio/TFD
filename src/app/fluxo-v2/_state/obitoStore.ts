'use client';

import { useSyncExternalStore } from 'react';

/**
 * Sinalização de óbito do paciente, separada do encerramento: a solicitação
 * continua no fluxo (ainda pode haver documentos, ajuda de custo e outras
 * etapas a concluir), mas fica marcada em todas as telas.
 *
 * No protótipo o registro fica no navegador (localStorage). No sistema real
 * vai para o banco (ex.: colunas data_obito, obito_registrado_por e
 * obito_registrado_em em solicitacoes), com a mesma regra.
 *
 * A data de falecimento é diferente da data de pagamento das despesas de
 * óbito (registrada na aba Óbito da competência do Financeiro): podem cair
 * em meses diferentes.
 */

export interface RegistroObito {
  solicitacaoId: string;
  /** Data do falecimento (AAAA-MM-DD). É ela que conta para "óbitos no mês". */
  dataFalecimento: string;
  observacao?: string;
  registradoPor: string;
  registradoEm: string;
}

const CHAVE = 'tfd.obitos.v1';
const listeners = new Set<() => void>();
let cache: Record<string, RegistroObito> | null = null;
const VAZIO: Record<string, RegistroObito> = {};

function ler(): Record<string, RegistroObito> {
  if (cache) return cache;
  try {
    const bruto = JSON.parse(localStorage.getItem(CHAVE) ?? '{}') as unknown;
    cache = bruto && typeof bruto === 'object' && !Array.isArray(bruto) ? (bruto as Record<string, RegistroObito>) : {};
  } catch {
    cache = {};
  }
  return cache;
}

function gravar(prox: Record<string, RegistroObito>) {
  cache = prox;
  try {
    localStorage.setItem(CHAVE, JSON.stringify(prox));
  } catch {
    // Sem localStorage (modo privado): fica só na memória desta aba.
  }
  listeners.forEach((l) => l());
}

function assinar(l: () => void) {
  listeners.add(l);
  const sync = (e: StorageEvent) => {
    if (e.key === CHAVE) {
      cache = null;
      l();
    }
  };
  window.addEventListener('storage', sync);
  return () => {
    listeners.delete(l);
    window.removeEventListener('storage', sync);
  };
}

/** Todos os óbitos sinalizados, por id da solicitação. */
export function useObitos(): Record<string, RegistroObito> {
  return useSyncExternalStore(assinar, ler, () => VAZIO);
}

/** Óbito de uma solicitação (ou undefined). */
export function useObitoDe(solicitacaoId: string | undefined): RegistroObito | undefined {
  const todos = useObitos();
  return solicitacaoId ? todos[solicitacaoId] : undefined;
}

export function obitosAtuais(): Record<string, RegistroObito> {
  return typeof window === 'undefined' ? VAZIO : ler();
}

export function sinalizarObito(r: Omit<RegistroObito, 'registradoEm'>): RegistroObito {
  const novo: RegistroObito = { ...r, registradoEm: new Date().toISOString() };
  gravar({ ...ler(), [r.solicitacaoId]: novo });
  return novo;
}

/** Desfaz uma sinalização feita por engano. */
export function removerObito(solicitacaoId: string) {
  const { [solicitacaoId]: _removido, ...resto } = ler();
  void _removido;
  gravar(resto);
}

/** Quantidade de óbitos com data de falecimento no mês (AAAA-MM). */
export function obitosNoMes(todos: Record<string, RegistroObito>, anoMes: string): number {
  return Object.values(todos).filter((o) => o.dataFalecimento.startsWith(anoMes)).length;
}
