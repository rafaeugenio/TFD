'use client';

/* -------------------------------------------------------------------------- */
/*  Competências do Financeiro. Cada competência é um mês (ex.: setembro de   */
/*  2026) com quatro frentes independentes: Faturamento, BPA, Reembolso e     */
/*  Óbito. Cada frente começa vazia, recebe linhas escolhidas pelo usuário,   */
/*  é fechada (fica só leitura) e pode ser reaberta com motivo. Tudo fica no  */
/*  histórico.                                                                */
/*                                                                            */
/*  Ao fechar, a frente guarda uma cópia de cada linha (dados, valores,       */
/*  valor SIGTAP, quantidades e totais). Fechada, a tela mostra sempre essa   */
/*  cópia; aberta, tudo vem da origem em tempo real. Ao reabrir, a cópia      */
/*  continua guardada no fechamento correspondente, para consulta.            */
/*                                                                            */
/*  No protótipo o registro fica no navegador (localStorage). No sistema real */
/*  vai para o banco, com o usuário de cada ação e a checagem de conflito     */
/*  feita no servidor.                                                        */
/* -------------------------------------------------------------------------- */

import { useSyncExternalStore } from 'react';
import type { LinhaBpa, LinhaFaturamento, LinhaObito, LinhaReembolso } from './dados';

export type Frente = 'faturamento' | 'bpa' | 'reembolso' | 'obito';

/** Ordem das abas da competência. */
export const FRENTES: Frente[] = ['faturamento', 'bpa', 'reembolso', 'obito'];

export type TipoEvento = 'aberta' | 'linhas_incluidas' | 'linha_removida' | 'fechada' | 'reaberta' | 'reembolso_registrado' | 'despesas_registradas';

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
  /** Fechamento ligado ao evento "fechada" (cópia do que foi enviado). */
  fechamentoId?: string;
}

export interface ItemCompetencia {
  /** Chave da linha na origem (ver `chave` em dados.ts). */
  chave: string;
  incluidoEm: string;
  incluidoPor: string;
  /** Linha incluída depois de uma reabertura: fica destacada para auditoria. */
  aposReabertura?: boolean;
  /** Aba Reembolso: data e valor a receber registrados na linha. */
  reembolso?: RegistroReembolso;
  /** Aba Óbito: despesas pagas e data do pagamento. */
  obito?: RegistroDespesasObito;
}

export interface RegistroReembolso {
  /** Data do reembolso (AAAA-MM-DD). */
  data: string;
  /** Valor a receber, maior que zero. */
  valor: number;
  por: string;
  em: string;
}

export interface DespesaObito {
  id: string;
  /** Código do item na tabela auxiliar `despesa_funeraria`. */
  codigo: string;
  /** Nome do item, como estava na tabela auxiliar no registro. */
  item: string;
  descricao?: string;
  valor: number;
}

export interface RegistroDespesasObito {
  /** Data do pagamento das despesas (AAAA-MM-DD), diferente da do falecimento. */
  dataPagamento: string;
  despesas: DespesaObito[];
  por: string;
  em: string;
}

/** Cópia do que foi enviado num fechamento. */
export interface Fechamento {
  id: string;
  em: string;
  por: string;
  /** Mês da competência (AAAA-MM), para o aviso de linha fora do período. */
  mesCompetencia: string;
  linhasFaturamento?: LinhaFaturamento[];
  linhasBpa?: LinhaBpa[];
  linhasReembolso?: LinhaReembolso[];
  linhasObito?: LinhaObito[];
  /** Registros de reembolso das linhas, como estavam no fechamento. */
  registrosReembolso?: Record<string, RegistroReembolso>;
  /** Despesas de óbito das linhas, como estavam no fechamento. */
  registrosObito?: Record<string, RegistroDespesasObito>;
  /** Valor unitário SIGTAP de cada código usado, como estava no fechamento. */
  sigtap?: Record<string, number>;
  /** Linhas marcadas como lançadas no BPA no fechamento. */
  lancados?: string[];
  /** Linhas que tinham entrado depois de uma reabertura. */
  aposReabertura: string[];
  /** Totais exibidos no fechamento. */
  totais: Record<string, number>;
  /** Frente fechada antes de existir a cópia: preenchida na primeira consulta. */
  legado?: boolean;
  /** Quando a frente foi reaberta depois deste fechamento. */
  reabertaEm?: string;
}

export interface FrenteCompetencia {
  status: 'aberta' | 'fechada';
  itens: ItemCompetencia[];
  historico: EventoHistorico[];
  fechadaEm?: string;
  reaberturas: number;
  /** Todos os fechamentos, do mais antigo ao mais recente. Com a frente
   *  fechada, o último é o que a tela mostra. */
  fechamentos: Fechamento[];
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
const uuid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : uid('comp'));
const agora = () => new Date().toISOString();
const avisar = () => listeners.forEach((l) => l());

/** Aceita registros gravados antes da cópia de fechamento (sem `fechamentos`). */
function migrarFrente(f: Partial<FrenteCompetencia> | undefined): FrenteCompetencia {
  return {
    status: f?.status === 'fechada' ? 'fechada' : 'aberta',
    itens: Array.isArray(f?.itens) ? f.itens : [],
    historico: Array.isArray(f?.historico) ? f.historico : [],
    fechadaEm: f?.fechadaEm,
    reaberturas: Number(f?.reaberturas ?? 0),
    fechamentos: Array.isArray(f?.fechamentos) ? f.fechamentos : [],
  };
}

/** Competência gravada antes das abas Reembolso e Óbito ganha as duas vazias e abertas. */
function migrar(bruto: unknown): Competencia[] {
  if (!Array.isArray(bruto)) return [];
  return bruto
    .filter((c): c is Competencia => !!c && typeof c === 'object' && 'id' in c && 'ano' in c && 'mes' in c)
    .map((c) => ({
      ...c,
      frentes: {
        faturamento: migrarFrente(c.frentes?.faturamento),
        bpa: migrarFrente(c.frentes?.bpa),
        reembolso: migrarFrente(c.frentes?.reembolso),
        obito: migrarFrente(c.frentes?.obito),
      },
    }));
}

/** Competências gravadas agora (fora de componente, ex.: indicadores do Painel). */
export function competenciasAtuais(): Competencia[] {
  return typeof window === 'undefined' ? VAZIO : lerArmazenamento();
}

function lerArmazenamento(): Competencia[] {
  try {
    const bruto = typeof window !== 'undefined' ? window.localStorage.getItem(CHAVE) : null;
    return bruto ? migrar(JSON.parse(bruto)) : [];
  } catch {
    return [];
  }
}

function ler(): Competencia[] {
  if (!cache) cache = lerArmazenamento();
  return cache;
}

function gravar(lista: Competencia[]) {
  cache = lista;
  try {
    window.localStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch {
    /* sem armazenamento: mantém só em memória */
  }
  avisar();
}

/** Mostra o estado gravado agora (outra pessoa pode ter mudado). */
function sincronizar(lista: Competencia[]) {
  cache = lista;
  avisar();
}

// Outra aba do navegador gravou: descarta o cache e avisa a tela.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== CHAVE) return;
    cache = null;
    avisar();
  });
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

const evento = (tipo: TipoEvento, por: string, extra: Partial<EventoHistorico> = {}): EventoHistorico => ({ id: uid('ev'), tipo, em: agora(), por, ...extra });

export type Conflito = 'aba_fechada' | 'linha_em_outra' | 'nao_encontrada' | 'linha_fora';

/** Resultado das ações que podem esbarrar em mudança feita por outra pessoa. */
export type Resultado = { ok: true } | { ok: false; conflito: Conflito };

export const MENSAGEM_CONFLITO: Record<Conflito, string> = {
  aba_fechada: 'Esta aba foi fechada por outra pessoa. Atualize a tela.',
  linha_em_outra: 'Esta linha já foi incluída em outra competência. Atualize a tela para ver a lista atual.',
  nao_encontrada: 'Esta competência foi excluída por outra pessoa. Atualize a tela.',
  linha_fora: 'Esta linha foi removida da competência por outra pessoa. Atualize a tela.',
};

/**
 * Lê o estado gravado no momento da confirmação (e não o da tela), aplica a
 * mudança e grava. Simula a checagem que o servidor fará no sistema real.
 */
function mudarFrente(
  id: string,
  frente: Frente,
  fn: (f: FrenteCompetencia, lista: Competencia[]) => FrenteCompetencia | Resultado,
): Resultado {
  const lista = lerArmazenamento();
  const c = lista.find((x) => x.id === id);
  if (!c) {
    sincronizar(lista);
    return { ok: false, conflito: 'nao_encontrada' };
  }
  const r = fn(c.frentes[frente], lista);
  if ('ok' in r) {
    // Conflito: a tela passa a mostrar o estado atual.
    sincronizar(lista);
    return r;
  }
  gravar(lista.map((x) => (x.id === id ? { ...x, frentes: { ...x.frentes, [frente]: r } } : x)));
  return { ok: true };
}

/** Confere no estado gravado agora se a frente segue aberta (antes de uma
 *  ação fora do store, como marcar "Lançada no BPA"). */
export function conferirFrenteAberta(id: string, frente: Frente): Resultado {
  const lista = lerArmazenamento();
  const c = lista.find((x) => x.id === id);
  if (c && c.frentes[frente].status === 'aberta') return { ok: true };
  sincronizar(lista);
  return { ok: false, conflito: c ? 'aba_fechada' : 'nao_encontrada' };
}

/** Abre a competência do mês. Uma por mês; devolve a existente se já houver. */
export function abrirCompetencia(ano: number, mes: number, por: string): Competencia {
  const lista = lerArmazenamento();
  const existente = lista.find((c) => c.ano === ano && c.mes === mes);
  if (existente) {
    sincronizar(lista);
    return existente;
  }
  const frenteNova = (): FrenteCompetencia => ({ status: 'aberta', itens: [], historico: [evento('aberta', por)], reaberturas: 0, fechamentos: [] });
  const nova: Competencia = {
    id: uuid(), ano, mes, criadaEm: agora(),
    frentes: { faturamento: frenteNova(), bpa: frenteNova(), reembolso: frenteNova(), obito: frenteNova() },
  };
  gravar([nova, ...lista].sort((a, b) => b.ano - a.ano || b.mes - a.mes));
  return nova;
}

/** A frente já foi fechada alguma vez (mesmo que reaberta depois). */
export const frenteJaFechada = (f: FrenteCompetencia) => f.fechamentos.length > 0 || f.historico.some((e) => e.tipo === 'fechada');

/** Só dá para excluir a competência se nenhuma das abas foi fechada alguma vez. */
export const podeExcluirCompetencia = (c: Competencia) => FRENTES.every((fr) => !frenteJaFechada(c.frentes[fr]));

/** Exclui a competência; as linhas dela voltam a ficar disponíveis. */
export function excluirCompetencia(id: string): Resultado {
  const lista = lerArmazenamento();
  const c = lista.find((x) => x.id === id);
  if (!c) {
    sincronizar(lista);
    return { ok: false, conflito: 'nao_encontrada' };
  }
  if (!podeExcluirCompetencia(c)) {
    sincronizar(lista);
    return { ok: false, conflito: 'aba_fechada' };
  }
  gravar(lista.filter((x) => x.id !== id));
  return { ok: true };
}

export function incluirLinhas(id: string, frente: Frente, chaves: string[], por: string, detalhe: string): Resultado {
  return mudarFrente(id, frente, (f, lista) => {
    if (f.status === 'fechada') return { ok: false, conflito: 'aba_fechada' };
    // Uma linha só pode estar em uma competência: confere no estado gravado agora.
    const usadas = chavesUsadas(lista, frente);
    if (chaves.some((k) => usadas.has(k))) return { ok: false, conflito: 'linha_em_outra' };
    if (chaves.length === 0) return f;
    const aposReabertura = f.reaberturas > 0;
    return {
      ...f,
      itens: [...f.itens, ...chaves.map((chave) => ({ chave, incluidoEm: agora(), incluidoPor: por, aposReabertura: aposReabertura || undefined }))],
      historico: [...f.historico, evento('linhas_incluidas', por, { quantidade: chaves.length, detalhe })],
    };
  });
}

export function removerLinha(id: string, frente: Frente, chave: string, por: string, detalhe: string): Resultado {
  return mudarFrente(id, frente, (f) =>
    f.status === 'fechada'
      ? { ok: false, conflito: 'aba_fechada' }
      : { ...f, itens: f.itens.filter((i) => i.chave !== chave), historico: [...f.historico, evento('linha_removida', por, { quantidade: 1, detalhe })] },
  );
}

/** Completa quando Faturamento e BPA estão fechados; reabrir qualquer um dos dois desfaz.
 *  Reembolso e Óbito ficam de fora: há meses sem nenhuma linha nessas abas. */
export function competenciaCompleta(c: Competencia): boolean {
  return c.frentes.faturamento.status === 'fechada' && c.frentes.bpa.status === 'fechada';
}

/** Cópia mostrada pela frente fechada (a do último fechamento). */
export function copiaAtual(f: FrenteCompetencia): Fechamento | undefined {
  return f.status === 'fechada' ? f.fechamentos[f.fechamentos.length - 1] : undefined;
}

export const linhasDaCopia = (x: Fechamento): Array<{ chave: string }> =>
  x.linhasFaturamento ?? x.linhasBpa ?? x.linhasReembolso ?? x.linhasObito ?? [];

/** Quantidade de linhas da frente: a da cópia se fechada, a atual se aberta. */
export function quantidadeLinhas(f: FrenteCompetencia): number {
  const copia = copiaAtual(f);
  return copia ? linhasDaCopia(copia).length : f.itens.length;
}

export type CopiaNova = Omit<Fechamento, 'id' | 'em' | 'por'>;

/**
 * Fecha a frente gravando a cópia das linhas. Só as linhas presentes na cópia
 * continuam vinculadas (linha cuja origem saiu, como passagem cancelada, sai).
 */
export function fecharFrente(id: string, frente: Frente, por: string, copia: CopiaNova): Resultado {
  return mudarFrente(id, frente, (f) => {
    if (f.status === 'fechada') return { ok: false, conflito: 'aba_fechada' };
    const fechamento: Fechamento = { ...copia, id: uid('fech'), em: agora(), por };
    const linhas = linhasDaCopia(copia as Fechamento);
    const naCopia = new Set(linhas.map((l) => l.chave));
    return {
      ...f,
      status: 'fechada',
      fechadaEm: fechamento.em,
      itens: f.itens.filter((i) => naCopia.has(i.chave)),
      fechamentos: [...f.fechamentos, fechamento],
      historico: [...f.historico, evento('fechada', por, { quantidade: linhas.length, fechamentoId: fechamento.id })],
    };
  });
}

/** Frente fechada antes da cópia existir: grava a cópia na primeira consulta. */
export function completarCopiaLegada(id: string, frente: Frente, copia: CopiaNova) {
  mudarFrente(id, frente, (f) => {
    if (f.status !== 'fechada' || copiaAtual(f)) return f;
    const ultimo = [...f.historico].reverse().find((e) => e.tipo === 'fechada');
    const fechamento: Fechamento = { ...copia, id: uid('fech'), em: f.fechadaEm ?? ultimo?.em ?? agora(), por: ultimo?.por ?? 'Não registrado', legado: true };
    return {
      ...f,
      fechamentos: [...f.fechamentos, fechamento],
      historico: f.historico.map((e) => (e === ultimo ? { ...e, fechamentoId: fechamento.id } : e)),
    };
  });
}

export function reabrirFrente(id: string, frente: Frente, por: string, motivo: string): Resultado {
  return mudarFrente(id, frente, (f) => {
    if (f.status === 'aberta') return f;
    const ev = evento('reaberta', por, { motivo });
    return {
      ...f,
      status: 'aberta',
      reaberturas: f.reaberturas + 1,
      fechamentos: f.fechamentos.map((x, i) => (i === f.fechamentos.length - 1 ? { ...x, reabertaEm: ev.em } : x)),
      historico: [...f.historico, ev],
    };
  });
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

/**
 * Muda uma linha da frente aberta (registro de reembolso ou de despesas de
 * óbito), conferindo no estado gravado agora que a linha continua lá.
 */
function mudarItem(id: string, frente: Frente, chave: string, por: string, tipo: TipoEvento, detalhe: string, fn: (i: ItemCompetencia) => ItemCompetencia): Resultado {
  return mudarFrente(id, frente, (f) => {
    if (f.status === 'fechada') return { ok: false, conflito: 'aba_fechada' };
    if (!f.itens.some((i) => i.chave === chave)) return { ok: false, conflito: 'linha_fora' };
    return {
      ...f,
      itens: f.itens.map((i) => (i.chave === chave ? fn(i) : i)),
      historico: [...f.historico, evento(tipo, por, { quantidade: 1, detalhe })],
    };
  });
}

/** Registra (ou corrige) a data e o valor a receber de uma linha do Reembolso. */
export function registrarReembolso(id: string, chave: string, dados: { data: string; valor: number }, por: string, detalhe: string): Resultado {
  return mudarItem(id, 'reembolso', chave, por, 'reembolso_registrado', detalhe, (i) => ({ ...i, reembolso: { ...dados, por, em: agora() } }));
}

/** Registra (ou substitui) as despesas e a data do pagamento de uma linha do Óbito. */
export function registrarDespesasObito(
  id: string, chave: string, dados: { dataPagamento: string; despesas: DespesaObito[] }, por: string, detalhe: string,
): Resultado {
  return mudarItem(id, 'obito', chave, por, 'despesas_registradas', detalhe, (i) => ({ ...i, obito: { ...dados, por, em: agora() } }));
}

/** Primeiro evento do histórico da competência (quem abriu e quando). */
export function aberturaDaCompetencia(c: Competencia): { por: string; em: string } {
  const primeiro = FRENTES.flatMap((fr) => c.frentes[fr].historico).sort((a, b) => a.em.localeCompare(b.em))[0];
  return primeiro ? { por: primeiro.por, em: primeiro.em } : { por: 'Não registrado', em: c.criadaEm };
}

/** Id curto para uma despesa nova. */
export const idDespesa = () => uid('desp');
