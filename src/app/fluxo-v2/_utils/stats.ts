/**
 * Pure helpers que agregam métricas a partir das solicitações mockadas.
 * Usados pelas StatsRow das telas Solicitações, Regulação e Financeiro.
 */

import {
  calcularValorAjuda,
  type SolicitacaoMock,
  type StatusGlobalV2,
  type CarimboRegulacao,
} from '@/core/mocks/fluxo-v2-v3-seed';

/* ------------------------------------------------------------------ *
 * Helpers genéricos
 * ------------------------------------------------------------------ */

export function dentroDoMesAtual(iso: string): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const hoje = new Date();
  return (
    d.getFullYear() === hoje.getFullYear() &&
    d.getMonth() === hoje.getMonth()
  );
}

export function formatBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/* ------------------------------------------------------------------ *
 * Solicitações
 * ------------------------------------------------------------------ */

export function contarPorStatus(
  solicitacoes: SolicitacaoMock[],
): Record<StatusGlobalV2, number> {
  const acc: Record<StatusGlobalV2, number> = {
    em_dados_basicos: 0,
    em_regulacao: 0,
    em_financeiro: 0,
    encerrada: 0,
  };
  for (const s of solicitacoes) acc[s.status] += 1;
  return acc;
}

export function contarEncerradasNoMes(solicitacoes: SolicitacaoMock[]): number {
  return solicitacoes.filter(
    (s) => s.status === 'encerrada' && s.encerramento && dentroDoMesAtual(s.encerramento.data),
  ).length;
}

export function contarPareceres(
  solicitacoes: SolicitacaoMock[],
  decisao?: 'deferido' | 'indeferido',
  dentroDoMes = false,
): number {
  let n = 0;
  for (const s of solicitacoes) {
    for (const p of s.pareceres) {
      if (decisao && p.decisao !== decisao) continue;
      if (dentroDoMes && !dentroDoMesAtual(p.data)) continue;
      n += 1;
    }
  }
  return n;
}

/**
 * Taxa de aprovação = pareceres deferidos / total de pareceres com decisão.
 * Como toda decisão de parecer no mock é deferido|indeferido, total = todos.
 * Retorna 0–100 (number). Quando não há pareceres, retorna 0.
 */
export function taxaAprovacao(solicitacoes: SolicitacaoMock[]): number {
  const total = contarPareceres(solicitacoes);
  if (total === 0) return 0;
  const def = contarPareceres(solicitacoes, 'deferido');
  return Math.round((def / total) * 100);
}

/* ------------------------------------------------------------------ *
 * Regulação
 * ------------------------------------------------------------------ */

export function contarAguardandoParecer(solicitacoes: SolicitacaoMock[]): number {
  return solicitacoes.filter(
    (s) => s.status === 'em_regulacao' && s.pareceres.length === 0,
  ).length;
}

export function contarAguardandoAgendamento(solicitacoes: SolicitacaoMock[]): number {
  return solicitacoes.filter((s) => {
    if (s.status !== 'em_regulacao') return false;
    if (s.carimboRegulacao !== 'CNRAC' && s.carimboRegulacao !== 'CET') return false;
    const tentativas = s.agendamento?.tentativas ?? [];
    const confirmado = tentativas.some((t) => t.desfecho === 'agendamento_confirmado');
    return !confirmado;
  }).length;
}

export interface DistribuicaoCarimbo {
  APROVADO_DIRETO: number;
  CNRAC: number;
  CET: number;
  SAIS_DUTRA: number;
  AGENDAMENTO: number;
  sem: number;
}

/**
 * Conta solicitações em regulação por carimbo. "sem" = sem carimbo definido.
 */
export function contarPorCarimbo(solicitacoes: SolicitacaoMock[]): DistribuicaoCarimbo {
  const acc: DistribuicaoCarimbo = {
    APROVADO_DIRETO: 0, CNRAC: 0, CET: 0, SAIS_DUTRA: 0, AGENDAMENTO: 0, sem: 0,
  };
  for (const s of solicitacoes) {
    if (s.status !== 'em_regulacao') continue;
    const c: CarimboRegulacao | undefined = s.carimboRegulacao;
    if (!c) acc.sem += 1;
    else acc[c] += 1;
  }
  return acc;
}

/* ------------------------------------------------------------------ *
 * Financeiro
 * ------------------------------------------------------------------ */

export function contarViagensAguardandoEmissao(solicitacoes: SolicitacaoMock[]): number {
  let n = 0;
  for (const s of solicitacoes) {
    if (s.status !== 'em_financeiro') continue;
    n += s.viagens.filter((v) => v.status === 'agendada').length;
  }
  return n;
}

export function contarViagensProximas7Dias(solicitacoes: SolicitacaoMock[]): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const limite = new Date(hoje);
  limite.setDate(limite.getDate() + 7);
  let n = 0;
  for (const s of solicitacoes) {
    if (s.status !== 'em_financeiro') continue;
    for (const v of s.viagens) {
      const d = new Date(v.data);
      if (Number.isNaN(d.getTime())) continue;
      if (d >= hoje && d <= limite) n += 1;
    }
  }
  return n;
}

export function contarAdicionaisPendentes(solicitacoes: SolicitacaoMock[]): number {
  let n = 0;
  for (const s of solicitacoes) {
    n += s.adicionais.filter((a) => a.status === 'pendente_aprovacao').length;
  }
  return n;
}

export function contarAjudasPendentes(solicitacoes: SolicitacaoMock[]): number {
  let n = 0;
  for (const s of solicitacoes) {
    n += s.ajudasCusto.filter(
      (a) => a.status === 'aprovada' || a.status === 'em_pagamento',
    ).length;
  }
  return n;
}

/**
 * Total de passagens emitidas no mês corrente (status confirmada/utilizada).
 * Note: 'utilizada' não é um status declarado no enum atual (StatusViagem) — então
 * consideramos apenas o que existe: 'confirmada'. Mantemos a checagem por string
 * pra ser tolerante caso o seed ganhe novos status mais tarde.
 */
export function totalEmitidoNoMes(solicitacoes: SolicitacaoMock[]): number {
  let total = 0;
  for (const s of solicitacoes) {
    for (const v of s.viagens) {
      if (!dentroDoMesAtual(v.data)) continue;
      if (v.status === 'confirmada' || (v.status as string) === 'utilizada') {
        total += v.valor;
      }
    }
  }
  return total;
}

export function totalDiariasNoMes(solicitacoes: SolicitacaoMock[]): number {
  let total = 0;
  for (const s of solicitacoes) {
    for (const a of s.ajudasCusto) {
      if (!dentroDoMesAtual(a.dataInicio)) continue;
      if (a.status !== 'aprovada' && a.status !== 'concluida') continue;
      total += calcularValorAjuda(a.dataInicio, a.dataFim, a.pernoiteRetorno).valor;
    }
  }
  return total;
}
