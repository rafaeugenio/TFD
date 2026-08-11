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
    em_passagens: 0,
    em_ajuda_custo: 0,
    em_acompanhamento: 0,
    em_aprovacao: 0,
    em_encerramento: 0,
  };
  for (const s of solicitacoes) acc[s.status] += 1;
  return acc;
}

export function contarEncerradasNoMes(solicitacoes: SolicitacaoMock[]): number {
  return solicitacoes.filter(
    (s) => s.status === 'em_encerramento' && s.encerramento && dentroDoMesAtual(s.encerramento.data),
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
  SAAS: number;
  AGENDAMENTO: number;
  sem: number;
}

/**
 * Conta solicitações em regulação por carimbo. "sem" = sem carimbo definido.
 */
export function contarPorCarimbo(solicitacoes: SolicitacaoMock[]): DistribuicaoCarimbo {
  const acc: DistribuicaoCarimbo = {
    APROVADO_DIRETO: 0, CNRAC: 0, CET: 0, SAAS: 0, AGENDAMENTO: 0, sem: 0,
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

/** Setores "financeiro-família" (PBI 13237): Passagens, Ajuda de Custo e
 *  Acompanhamento — sucessores do antigo setor único "Financeiro". */
const EM_FINANCEIRO_OU_ACOMPANHAMENTO = new Set<StatusGlobalV2>([
  'em_passagens',
  'em_ajuda_custo',
  'em_acompanhamento',
]);

export function contarSolicitacoesAguardandoEmissao(solicitacoes: SolicitacaoMock[]): number {
  // Solicitações no setor de Passagens ainda sem passagem ativa.
  let n = 0;
  for (const s of solicitacoes) {
    if (s.status !== 'em_passagens') continue;
    const temPassagem = s.viagens.some((v) => v.ativa !== false);
    if (!temPassagem) n += 1;
  }
  return n;
}

export function contarSolicitacoesAjudaPendente(solicitacoes: SolicitacaoMock[]): number {
  // Solicitações com passagem ativa, mas sem nenhuma ajuda de custo ativa.
  let n = 0;
  for (const s of solicitacoes) {
    if (!EM_FINANCEIRO_OU_ACOMPANHAMENTO.has(s.status)) continue;
    const temPassagem = s.viagens.some((v) => v.ativa !== false);
    const temAjuda = s.ajudasCusto.some((a) => a.ativa !== false);
    if (temPassagem && !temAjuda) n += 1;
  }
  return n;
}

// ── Funções legadas (ainda usadas pelo dashboard geral) ─────────────
export function contarViagensAguardandoEmissao(solicitacoes: SolicitacaoMock[]): number {
  let n = 0;
  for (const s of solicitacoes) {
    if (!EM_FINANCEIRO_OU_ACOMPANHAMENTO.has(s.status)) continue;
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
    if (!EM_FINANCEIRO_OU_ACOMPANHAMENTO.has(s.status)) continue;
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
  // No modelo novo, "pendente" = emitido (ainda não concluído nem glosado).
  let n = 0;
  for (const s of solicitacoes) {
    n += s.ajudasCusto.filter((a) => a.status === 'emitido').length;
  }
  return n;
}

/**
 * Total emitido no mês: valor líquido (valor menos reembolso) das passagens
 * ativas criadas no mês corrente, mais os adicionais vinculados a uma passagem
 * (viagemId) lançados no mês. Adicionais indeferidos não contam.
 */
export function totalEmitidoNoMes(solicitacoes: SolicitacaoMock[]): number {
  let total = 0;
  for (const s of solicitacoes) {
    for (const v of s.viagens) {
      if (v.ativa === false) continue;
      const dataRef = v.dataCriacao ?? v.data;
      if (!dentroDoMesAtual(dataRef)) continue;
      total += v.valor - (v.valorReembolso ?? 0);
    }
    for (const ad of s.adicionais) {
      if (!ad.viagemId) continue;
      if (ad.status === 'indeferido') continue;
      if (!dentroDoMesAtual(ad.data)) continue;
      total += ad.valor;
    }
  }
  return total;
}

/**
 * Total em diárias no mês: soma das ajudas de custo concluídas cuja data de
 * conclusão caiu no mês corrente (valor calculado menos reembolso).
 */
export function totalDiariasNoMes(solicitacoes: SolicitacaoMock[]): number {
  let total = 0;
  for (const s of solicitacoes) {
    for (const a of s.ajudasCusto) {
      if (a.ativa === false) continue;
      if (a.status !== 'concluido') continue;
      if (!a.dataConclusao || !dentroDoMesAtual(a.dataConclusao)) continue;
      // Correção de regra (11/08/2026) — aditiva e subtrativa não são
      // pagamento de fato, ficam fora do total (alimentam o saldo do
      // paciente em vez disso).
      const tipo = a.tipoCalculo ?? 'padrao';
      if (tipo === 'aditiva' || tipo === 'subtrativa') continue;
      const calc = calcularValorAjuda(a.dataInicio, a.dataFim, a.pernoiteRetorno).valor;
      total += calc - (a.valorReembolso ?? 0);
    }
  }
  return total;
}
