'use client';

/* -------------------------------------------------------------------------- */
/*  O que cada aba da competência mostra (Vista) e o resumo da competência    */
/*  inteira. Aba aberta: linhas da origem em tempo real; fechada: a cópia     */
/*  gravada no fechamento. O mesmo cálculo serve ao cabeçalho da competência  */
/*  e ao Painel (`indicadoresDoMes`).                                         */
/* -------------------------------------------------------------------------- */

import { obitosAtuais } from '@/app/fluxo-v2/_state/obitoStore';
import {
  carregarBpa, carregarDadosSolicitacoes, carregarFaturamento, carregarReembolsos, carregarValoresSigtap, montarLinhasObito, valorBpa,
  type LinhaBpa, type LinhaFaturamento, type LinhaObito, type LinhaReembolso,
} from './dados';
import {
  FRENTES, aberturaDaCompetencia, competenciasAtuais, copiaAtual,
  type Competencia, type Fechamento, type Frente, type RegistroDespesasObito, type RegistroReembolso,
} from './store';

/** Linhas da origem (todas, de qualquer competência). */
export interface Origem {
  fat: LinhaFaturamento[];
  bpa: LinhaBpa[];
  sig: Record<string, number>;
  lancados: Set<string>;
  reembolsos: LinhaReembolso[];
  obitos: LinhaObito[];
}

/** O que uma aba mostra. */
export interface Vista {
  fat: LinhaFaturamento[];
  bpa: LinhaBpa[];
  reembolsos: LinhaReembolso[];
  obitos: LinhaObito[];
  sig: Record<string, number>;
  lancados: Set<string>;
  regReembolso: Record<string, RegistroReembolso>;
  regObito: Record<string, RegistroDespesasObito>;
  aposReabertura: Set<string>;
  mesCompetencia: string;
}

export const mesDaCompetencia = (c: Pick<Competencia, 'ano' | 'mes'>) => `${c.ano}-${String(c.mes).padStart(2, '0')}`;

export const vistaDaCopia = (x: Fechamento): Vista => ({
  fat: x.linhasFaturamento ?? [],
  bpa: x.linhasBpa ?? [],
  reembolsos: x.linhasReembolso ?? [],
  obitos: x.linhasObito ?? [],
  sig: x.sigtap ?? {},
  lancados: new Set(x.lancados ?? []),
  regReembolso: x.registrosReembolso ?? {},
  regObito: x.registrosObito ?? {},
  aposReabertura: new Set(x.aposReabertura),
  mesCompetencia: x.mesCompetencia,
});

/** Vista da aba com os dados da origem (aba aberta, ou fechada antes da cópia existir). */
export function vistaDaOrigem(c: Competencia, frente: Frente, o: Origem): Vista {
  const f = c.frentes[frente];
  const itens = new Set(f.itens.map((i) => i.chave));
  const regReembolso: Record<string, RegistroReembolso> = {};
  const regObito: Record<string, RegistroDespesasObito> = {};
  for (const i of f.itens) {
    if (i.reembolso) regReembolso[i.chave] = i.reembolso;
    if (i.obito) regObito[i.chave] = i.obito;
  }
  // Cada vista só carrega as linhas da própria aba.
  return {
    fat: frente === 'faturamento' ? o.fat.filter((l) => itens.has(l.chave)) : [],
    bpa: frente === 'bpa' ? o.bpa.filter((l) => itens.has(l.chave)) : [],
    reembolsos: frente === 'reembolso' ? o.reembolsos.filter((l) => itens.has(l.chave)) : [],
    obitos: frente === 'obito' ? o.obitos.filter((l) => itens.has(l.chave)) : [],
    sig: o.sig,
    lancados: o.lancados,
    regReembolso,
    regObito,
    aposReabertura: new Set(f.itens.filter((i) => i.aposReabertura).map((i) => i.chave)),
    mesCompetencia: mesDaCompetencia(c),
  };
}

/** Vista que a aba mostra: cópia do fechamento quando fechada; origem quando aberta. */
export function vistaDaFrente(c: Competencia, frente: Frente, o: Origem): Vista {
  const copia = copiaAtual(c.frentes[frente]);
  return copia ? vistaDaCopia(copia) : vistaDaOrigem(c, frente, o);
}

/* ── Cálculos por aba ────────────────────────────────────────────────────── */

/** Total do Faturamento: soma do valor das passagens (reembolso fica na aba Reembolso). */
export const totalFaturamento = (linhas: LinhaFaturamento[]) => linhas.reduce((s, l) => s + l.valor, 0);

/** Procedimentos de uma linha do BPA: na ajuda de custo, diárias com pernoite
 *  mais diárias sem pernoite; no deslocamento, a quantidade. */
export const procedimentosDaLinha = (l: LinhaBpa) =>
  l.procedimento === 'ajuda_custo' ? (l.qtdPernoite ?? 0) + (l.qtdSemPernoite ?? 0) : (l.quantidade ?? 0);

export const procedimentosBpa = (linhas: LinhaBpa[]) => linhas.reduce((s, l) => s + procedimentosDaLinha(l), 0);

/** Pessoas distintas nas linhas do BPA, cruzando Ajuda de custo e Deslocamento.
 *  Chave: documento (CNS, senão CPF) só com dígitos; sem documento, o processo. */
export function pacientesUnicos(linhas: LinhaBpa[]): number {
  const chaves = new Set<string>();
  for (const l of linhas) {
    const doc = (l.documento ?? '').replace(/\D/g, '');
    chaves.add(doc ? `doc:${doc}` : `proc:${l.processo || l.solicitacaoId}`);
  }
  return chaves.size;
}

export function totaisReembolso(linhas: LinhaReembolso[], reg: Record<string, RegistroReembolso>) {
  const comValor = linhas.filter((l) => reg[l.chave]);
  return {
    linhas: linhas.length,
    comValor: comValor.length,
    pendentes: linhas.length - comValor.length,
    totalReceber: comValor.reduce((s, l) => s + reg[l.chave].valor, 0),
  };
}

export const totalDespesas = (r?: RegistroDespesasObito) => (r ? r.despesas.reduce((s, d) => s + d.valor, 0) : 0);

export function totaisObito(linhas: LinhaObito[], reg: Record<string, RegistroDespesasObito>) {
  const comDespesa = linhas.filter((l) => (reg[l.chave]?.despesas.length ?? 0) > 0);
  return {
    linhas: linhas.length,
    comDespesa: comDespesa.length,
    pendentes: linhas.length - comDespesa.length,
    totalDespesas: comDespesa.reduce((s, l) => s + totalDespesas(reg[l.chave]), 0),
  };
}

/* ── Resumo da competência ───────────────────────────────────────────────── */

export interface ResumoCompetencia {
  competenciaId: string;
  ano: number;
  /** 1 a 12 */
  mes: number;
  /** Autor e data (ISO) do primeiro evento do histórico. */
  abertaPor: string;
  abertaEm: string;
  status: Record<Frente, 'aberta' | 'fechada'>;
  faturamento: { bilhetes: number; total: number };
  reembolso: { linhas: number; comValor: number; pendentes: number; totalReceber: number };
  /** Total do Faturamento menos o total a receber do Reembolso. */
  totalLiquido: number;
  bpa: {
    linhas: number;
    valorSigtap: number;
    procedimentos: number;
    procedimentosAjudaCusto: number;
    procedimentosDeslocamento: number;
    pacientesUnicos: number;
  };
  obito: { linhas: number; comDespesa: number; totalDespesas: number };
}

/** Resumo da competência a partir das linhas da origem (abas fechadas usam a cópia). */
export function resumoCompetencia(c: Competencia, o: Origem): ResumoCompetencia {
  const v = Object.fromEntries(FRENTES.map((fr) => [fr, vistaDaFrente(c, fr, o)])) as Record<Frente, Vista>;
  const fat = totalFaturamento(v.faturamento.fat);
  const reemb = totaisReembolso(v.reembolso.reembolsos, v.reembolso.regReembolso);
  const ob = totaisObito(v.obito.obitos, v.obito.regObito);
  const bpa = v.bpa.bpa;
  const ajuda = bpa.filter((l) => l.procedimento === 'ajuda_custo');
  const desloc = bpa.filter((l) => l.procedimento === 'deslocamento');
  const abertura = aberturaDaCompetencia(c);
  return {
    competenciaId: c.id,
    ano: c.ano,
    mes: c.mes,
    abertaPor: abertura.por,
    abertaEm: abertura.em,
    status: Object.fromEntries(FRENTES.map((fr) => [fr, c.frentes[fr].status])) as Record<Frente, 'aberta' | 'fechada'>,
    faturamento: { bilhetes: v.faturamento.fat.length, total: fat },
    reembolso: reemb,
    totalLiquido: fat - reemb.totalReceber,
    bpa: {
      linhas: bpa.length,
      valorSigtap: bpa.reduce((s, l) => s + valorBpa(l, v.bpa.sig), 0),
      procedimentos: procedimentosBpa(bpa),
      procedimentosAjudaCusto: procedimentosBpa(ajuda),
      procedimentosDeslocamento: procedimentosBpa(desloc),
      pacientesUnicos: pacientesUnicos(bpa),
    },
    obito: { linhas: ob.linhas, comDespesa: ob.comDespesa, totalDespesas: ob.totalDespesas },
  };
}

/** Linhas da origem só das abas abertas (fechadas usam a cópia, sem consulta). */
async function carregarOrigem(c: Competencia): Promise<Origem> {
  const aberta = (fr: Frente) => !copiaAtual(c.frentes[fr]);
  const obitos = obitosAtuais();
  const [fat, bpa, reembolsos, dados] = await Promise.all([
    aberta('faturamento') ? carregarFaturamento() : Promise.resolve([]),
    aberta('bpa') ? carregarBpa() : Promise.resolve([]),
    aberta('reembolso') ? carregarReembolsos() : Promise.resolve([]),
    aberta('obito') ? carregarDadosSolicitacoes(Object.keys(obitos)) : Promise.resolve(new Map()),
  ]);
  const sig = bpa.length ? await carregarValoresSigtap(bpa) : {};
  return { fat, bpa, sig, lancados: new Set(), reembolsos, obitos: montarLinhasObito(obitos, dados) };
}

/**
 * Indicadores da competência do mês, para o Painel. Devolve `null` quando o
 * mês não tem competência aberta. Lança `ErroCarregamento` se a consulta
 * à origem falhar (o Painel mostra o erro em vez de zeros).
 */
export async function indicadoresDoMes(ano: number, mes: number): Promise<ResumoCompetencia | null> {
  const c = competenciasAtuais().find((x) => x.ano === ano && x.mes === mes);
  if (!c) return null;
  return resumoCompetencia(c, await carregarOrigem(c));
}
