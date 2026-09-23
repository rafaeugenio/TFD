'use client';

/* -------------------------------------------------------------------------- */
/*  Competências do Financeiro. Cada competência é um mês (ex.: setembro de   */
/*  2026) com duas frentes independentes, Faturamento e BPA. Cada frente      */
/*  começa vazia, recebe linhas escolhidas pelo usuário, é fechada (fica só   */
/*  leitura) e pode ser reaberta com motivo. Tudo fica no histórico.          */
/*                                                                            */
/*  No protótipo o registro fica no navegador (localStorage). No sistema real */
/*  vai para o banco, com o usuário de cada ação.                             */
/* -------------------------------------------------------------------------- */

import { useSyncExternalStore } from 'react';

export type Frente = 'faturamento' | 'bpa';

export type TipoEvento = 'aberta' | 'linhas_incluidas' | 'linha_removida' | 'fechada' | 'reaberta';

export interface EventoHistorico {
  id: string;
  tipo: TipoEvento;
  em: string;
  por: string;
  /** Quantidade de linhas afetadas (inclusão/remoção). */
  quantidade?: number;
  /** Descrição curta das linhas afetadas, para auditoria. */
  detalhe?: string;
  /** Motivo informado na reabertura. */
  motivo?: string;
}

export interface ItemCompetencia {
  /** Chave da linha na origem (ver `chaveLinha` em dados.ts). */
  chave: string;
  incluidoEm: string;
  incluidoPor: string;
  /** Linha incluída depois de uma reabertura: fica destacada para auditoria. */
  aposReabertura?: boolean;
}

export interface FrenteCompetencia {
  status: 'aberta' | 'fechada';
  itens: ItemCompetencia[];
  historico: EventoHistorico[];
  fechadaEm?: string;
  reaberturas: number;
}

export interface Competencia {
  id: string;
  ano: number;
  /** 1 a 12 */
  mes: number;
  criadaEm: string;
  frentes: Record<Frente, FrenteCompetencia>;
}

const CHAVE = 'tfd.financeiro.competencias.v1';
const listeners = new Set<() => void>();
let cache: Competencia[] | null = null;
const VAZIO: Competencia[] = [];

const uid = (p: string) => `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const agora = () => new Date().toISOString();

function ler(): Competencia[] {
  if (cache) return cache;
  try {
    const bruto = typeof window !== 'undefined' ? window.localStorage.getItem(CHAVE) : null;
    cache = bruto ? (JSON.parse(bruto) as Competencia[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function gravar(lista: Competencia[]) {
  cache = lista;
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch {
    /* sem armazenamento: mantém só em memória */
  }
  listeners.forEach((l) => l());
}

export function useCompetencias(): Competencia[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    ler,
    () => VAZIO,
  );
}

function atualizarFrente(id: string, frente: Frente, fn: (f: FrenteCompetencia) => FrenteCompetencia) {
  gravar(ler().map((c) => (c.id === id ? { ...c, frentes: { ...c.frentes, [frente]: fn(c.frentes[frente]) } } : c)));
}

const evento = (tipo: TipoEvento, por: string, extra: Partial<EventoHistorico> = {}): EventoHistorico => ({ id: uid('ev'), tipo, em: agora(), por, ...extra });

/** Abre a competência do mês. Uma por mês; devolve a existente se já houver. */
export function abrirCompetencia(ano: number, mes: number, por: string): Competencia {
  const existente = ler().find((c) => c.ano === ano && c.mes === mes);
  if (existente) return existente;
  const frenteNova = (): FrenteCompetencia => ({ status: 'aberta', itens: [], historico: [evento('aberta', por)], reaberturas: 0 });
  const nova: Competencia = { id: uid('comp'), ano, mes, criadaEm: agora(), frentes: { faturamento: frenteNova(), bpa: frenteNova() } };
  gravar([nova, ...ler()].sort((a, b) => b.ano - a.ano || b.mes - a.mes));
  return nova;
}

export function incluirLinhas(id: string, frente: Frente, chaves: string[], por: string, detalhe: string) {
  atualizarFrente(id, frente, (f) => {
    if (f.status === 'fechada') return f;
    const ja = new Set(f.itens.map((i) => i.chave));
    const novas = chaves.filter((c) => !ja.has(c));
    if (novas.length === 0) return f;
    const aposReabertura = f.reaberturas > 0;
    return {
      ...f,
      itens: [...f.itens, ...novas.map((chave) => ({ chave, incluidoEm: agora(), incluidoPor: por, aposReabertura: aposReabertura || undefined }))],
      historico: [...f.historico, evento('linhas_incluidas', por, { quantidade: novas.length, detalhe })],
    };
  });
}

export function removerLinha(id: string, frente: Frente, chave: string, por: string, detalhe: string) {
  atualizarFrente(id, frente, (f) =>
    f.status === 'fechada'
      ? f
      : { ...f, itens: f.itens.filter((i) => i.chave !== chave), historico: [...f.historico, evento('linha_removida', por, { quantidade: 1, detalhe })] },
  );
}

export function fecharFrente(id: string, frente: Frente, por: string) {
  atualizarFrente(id, frente, (f) =>
    f.status === 'fechada' ? f : { ...f, status: 'fechada', fechadaEm: agora(), historico: [...f.historico, evento('fechada', por, { quantidade: f.itens.length })] },
  );
}

export function reabrirFrente(id: string, frente: Frente, por: string, motivo: string) {
  atualizarFrente(id, frente, (f) =>
    f.status === 'aberta'
      ? f
      : { ...f, status: 'aberta', reaberturas: f.reaberturas + 1, historico: [...f.historico, evento('reaberta', por, { motivo })] },
  );
}

/** Chaves já usadas em qualquer competência (aberta ou fechada) da frente:
 *  uma linha só pode estar em uma competência. */
export function chavesUsadas(lista: Competencia[], frente: Frente, excetoId?: string): Map<string, Competencia> {
  const mapa = new Map<string, Competencia>();
  for (const c of lista) {
    if (c.id === excetoId) continue;
    for (const i of c.frentes[frente].itens) mapa.set(i.chave, c);
  }
  return mapa;
}
