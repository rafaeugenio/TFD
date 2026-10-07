import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { VALOR_DIARIA_PERNOITE, calcularValorAjuda } from '@/core/mocks/fluxo-v2-v3-seed';
import type { ItemValor } from '@/app/relatorios/_assistente/contrato';
import {
  BENEFICIARIO_ROTULO, MODAL_ROTULO, STATUS_ROTULO,
  type Agrupamento, type Beneficiario, type Filtros, type Modal, type RelatorioId, type StatusSolicitacao,
} from './catalogo';
import { TEMPO_LIMITE_MS } from './config';
import { ErroServico } from './http';
import type { PeriodoResolvido } from './periodo';

/**
 * Consultas autorizadas do assistente. Todas são SÓ leitura, usam o cliente
 * do Supabase com a sessão do usuário (respeitando a RLS existente) e somam
 * os valores em código determinístico. Nenhuma consulta é montada pela IA.
 */

/** Maior quantidade de registros lida por pergunta (proteção de volume e tempo). */
export const LIMITE_REGISTROS = 20_000;
const PAGINA = 1_000;
/** Quantos grupos a resposta mostra; o resto entra como "omitidos". */
const MAX_GRUPOS = 12;

export interface ResultadoConsulta {
  total: number;
  unidade: 'BRL' | 'quantidade';
  registros: number;
  rotulo: string;
  composicao?: ItemValor[];
  grupos?: { itens: ItemValor[]; omitidos: number; cronologico: boolean };
  /** O que ficou de fora do cálculo por limitação do banco atual. */
  avisos?: string[];
}

type Linha = Record<string, unknown>;

/** Coluna que o código conhece mas o banco ainda não tem (migration não aplicada). */
class ColunaAusente extends Error {}

const centavos = (v: number) => Math.round(v * 100) / 100;
const numero = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : 0);
const texto = (v: unknown) => (typeof v === 'string' ? v : '');

const inicioTs = (p: PeriodoResolvido) => `${p.inicio}T00:00:00-03:00`;
const fimTs = (p: PeriodoResolvido) => `${p.fim}T23:59:59.999-03:00`;

const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
/** Mês (AAAA-MM) de um timestamp no fuso de Brasília. */
function mesBrasilia(ts: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(ts)) return ts.slice(0, 7);
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  const [a, m] = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(d).split('-');
  return `${a}-${m}`;
}
const rotuloMes = (am: string) => (am ? `${MESES_ABREV[Number(am.slice(5, 7)) - 1]}/${am.slice(0, 4)}` : 'Sem data');

/** Lê todas as páginas de uma consulta até o limite de registros. */
async function paginar(montar: (de: number, ate: number) => PromiseLike<{ data: unknown; error: unknown }>): Promise<Linha[]> {
  const linhas: Linha[] = [];
  const prazo = Date.now() + TEMPO_LIMITE_MS.banco;
  for (let de = 0; ; de += PAGINA) {
    if (Date.now() > prazo) throw new ErroServico('banco', 'timeout');
    const { data, error } = await montar(de, de + PAGINA - 1);
    if (error) {
      if ((error as { code?: string }).code === '42703') throw new ColunaAusente();
      throw new ErroServico('banco', 'indisponivel');
    }
    const lote = Array.isArray(data) ? (data as Linha[]) : [];
    linhas.push(...lote);
    if (linhas.length > LIMITE_REGISTROS) throw new ErroServico('banco', 'limite');
    if (lote.length < PAGINA) return linhas;
  }
}

/** Soma por chave e devolve os grupos ordenados (por valor ou por mês). */
function agrupar(entradas: { chave: string; rotulo: string; valor: number }[], cronologico: boolean): ResultadoConsulta['grupos'] {
  const mapa = new Map<string, ItemValor & { chave: string }>();
  for (const e of entradas) {
    const atual = mapa.get(e.chave) ?? { chave: e.chave, rotulo: e.rotulo, valor: 0, quantidade: 0 };
    atual.valor += e.valor;
    atual.quantidade = (atual.quantidade ?? 0) + 1;
    mapa.set(e.chave, atual);
  }
  const itens = [...mapa.values()].map((i) => ({ ...i, valor: centavos(i.valor) }));
  itens.sort(cronologico ? (a, b) => a.chave.localeCompare(b.chave) : (a, b) => b.valor - a.valor || a.rotulo.localeCompare(b.rotulo, 'pt-BR'));
  const limite = cronologico ? itens.length : MAX_GRUPOS;
  return {
    itens: itens.slice(0, limite).map(({ rotulo, valor, quantidade }) => ({ rotulo, valor, quantidade })),
    omitidos: Math.max(0, itens.length - limite),
    cronologico,
  };
}

/* ---------------------------------------------------------------------- */
/*  Passagens (mesma regra do indicador "Total emitido" do Painel)        */
/* ---------------------------------------------------------------------- */

interface ItemPassagem { valor: number; mes: string; modal: string; destino: string; origem: string; tipo: 'passagem' | 'adicional' }

const AVISO_ADICIONAIS = 'Os adicionais ligados a passagens não entraram: o banco deste ambiente ainda não tem o vínculo do adicional com a passagem.';
const AVISO_DIARIAS = 'O tipo de cálculo e a diária do último dia das ajudas ainda não existem no banco deste ambiente: todas foram calculadas como padrão, com R$ 8,40 no dia de retorno.';

async function itensPassagens(sb: SupabaseClient, p: PeriodoResolvido, filtros: Filtros, avisos: string[]): Promise<ItemPassagem[]> {
  const colunas = 'id, modal, origem_cidade, origem_uf, destino_cidade, destino_uf, valor, valor_reembolso, created_at';
  const viagens = await paginar((de, ate) => {
    let q = sb.from('viagens').select(colunas).eq('ativa', true).gte('created_at', inicioTs(p)).lte('created_at', fimTs(p)).order('id').range(de, ate);
    if (filtros.modal?.length) q = q.in('modal', filtros.modal);
    return q;
  });

  const cidade = (c: unknown, uf: unknown) => (texto(c) ? `${texto(c)}${texto(uf) ? `/${texto(uf)}` : ''}` : 'Não informada');
  const itens: ItemPassagem[] = viagens.map((v) => ({
    valor: numero(v.valor) - numero(v.valor_reembolso),
    mes: mesBrasilia(texto(v.created_at)),
    modal: texto(v.modal),
    destino: cidade(v.destino_cidade, v.destino_uf),
    origem: cidade(v.origem_cidade, v.origem_uf),
    tipo: 'passagem',
  }));

  // Adicionais ligados a uma passagem, lançados no período e não indeferidos.
  let adicionais: Linha[] = [];
  try {
    adicionais = await paginar((de, ate) =>
      sb.from('adicionais').select('id, valor, data_ocorrencia, viagem_id').not('viagem_id', 'is', null).neq('status', 'INDEFERIDO')
        .gte('data_ocorrencia', p.inicio).lte('data_ocorrencia', p.fim).order('id').range(de, ate),
    );
  } catch (e) {
    if (!(e instanceof ColunaAusente)) throw e;
    if (!avisos.includes(AVISO_ADICIONAIS)) avisos.push(AVISO_ADICIONAIS);
  }
  if (adicionais.length) {
    // A passagem do adicional pode ter sido cadastrada fora do período: busca
    // só os atributos (modal e cidades) para filtrar e agrupar.
    const ids = [...new Set(adicionais.map((a) => texto(a.viagem_id)).filter(Boolean))];
    const atributos = new Map<string, Linha>();
    for (let i = 0; i < ids.length; i += 200) {
      const { data, error } = await sb.from('viagens').select('id, modal, origem_cidade, origem_uf, destino_cidade, destino_uf').in('id', ids.slice(i, i + 200));
      if (error) throw new ErroServico('banco', 'indisponivel');
      for (const v of (data ?? []) as Linha[]) atributos.set(texto(v.id), v);
    }
    for (const a of adicionais) {
      const v = atributos.get(texto(a.viagem_id));
      const modal = texto(v?.modal);
      if (filtros.modal?.length && !(filtros.modal as string[]).includes(modal)) continue;
      itens.push({
        valor: numero(a.valor),
        mes: mesBrasilia(texto(a.data_ocorrencia)),
        modal,
        destino: cidade(v?.destino_cidade, v?.destino_uf),
        origem: cidade(v?.origem_cidade, v?.origem_uf),
        tipo: 'adicional',
      });
    }
  }
  return itens;
}

function resultadoPassagens(itens: ItemPassagem[], agrupamento: Agrupamento): ResultadoConsulta {
  const passagens = itens.filter((i) => i.tipo === 'passagem');
  const adicionais = itens.filter((i) => i.tipo === 'adicional');
  const soma = (l: ItemPassagem[]) => centavos(l.reduce((t, i) => t + i.valor, 0));
  const r: ResultadoConsulta = {
    total: soma(itens),
    unidade: 'BRL',
    registros: passagens.length,
    rotulo: 'Gasto com passagens',
    composicao: [
      { rotulo: 'Passagens (valor menos reembolso)', valor: soma(passagens), quantidade: passagens.length },
      { rotulo: 'Adicionais ligados a passagens', valor: soma(adicionais), quantidade: adicionais.length },
    ],
  };
  const chave = (i: ItemPassagem): { chave: string; rotulo: string } | null => {
    switch (agrupamento) {
      case 'mes': return { chave: i.mes, rotulo: rotuloMes(i.mes) };
      case 'modal': return { chave: i.modal || '-', rotulo: MODAL_ROTULO[i.modal as Modal] ?? 'Não informado' };
      case 'destino': return { chave: i.destino, rotulo: i.destino };
      case 'origem': return { chave: i.origem, rotulo: i.origem };
      default: return null;
    }
  };
  if (agrupamento !== 'nenhum') {
    r.grupos = agrupar(itens.flatMap((i) => { const k = chave(i); return k ? [{ ...k, valor: i.valor }] : []; }), agrupamento === 'mes');
  }
  return r;
}

/* ---------------------------------------------------------------------- */
/*  Diárias (mesma regra do indicador "Total em diárias" do Painel)       */
/* ---------------------------------------------------------------------- */

interface ItemDiaria { valor: number; mes: string; beneficiario: Beneficiario }

async function itensDiarias(sb: SupabaseClient, p: PeriodoResolvido, filtros: Filtros, avisos: string[]): Promise<ItemDiaria[]> {
  const consultar = (colunas: string) => paginar((de, ate) => {
    let q = sb.from('ajudas_custo')
      .select(colunas)
      .eq('ativa', true).eq('status', 'CONCLUIDO').gte('concluido_em', p.inicio).lte('concluido_em', p.fim)
      .order('id').range(de, ate);
    if (filtros.beneficiario?.length) q = q.in('tipo', filtros.beneficiario);
    return q;
  });
  let linhas: Linha[];
  try {
    linhas = await consultar('id, tipo, data_inicio, data_fim, concluido_em, tipo_calculo, valor_diaria_final, valor_reembolso');
  } catch (e) {
    if (!(e instanceof ColunaAusente)) throw e;
    if (!avisos.includes(AVISO_DIARIAS)) avisos.push(AVISO_DIARIAS);
    linhas = await consultar('id, tipo, data_inicio, data_fim, concluido_em, valor_reembolso');
  }
  const itens: ItemDiaria[] = [];
  for (const a of linhas) {
    const calculo = texto(a.tipo_calculo).toUpperCase();
    if (calculo === 'ADITIVA' || calculo === 'SUBTRATIVA') continue;
    const inicio = texto(a.data_inicio); const fim = texto(a.data_fim);
    if (!inicio || !fim) continue;
    const pernoite = numero(a.valor_diaria_final) === VALOR_DIARIA_PERNOITE;
    itens.push({
      valor: calcularValorAjuda(inicio, fim, pernoite).valor - numero(a.valor_reembolso),
      mes: mesBrasilia(texto(a.concluido_em)),
      beneficiario: texto(a.tipo) === 'ACOMPANHANTE' ? 'ACOMPANHANTE' : 'PACIENTE',
    });
  }
  return itens;
}

function resultadoDiarias(itens: ItemDiaria[], agrupamento: Agrupamento): ResultadoConsulta {
  const r: ResultadoConsulta = { total: centavos(itens.reduce((t, i) => t + i.valor, 0)), unidade: 'BRL', registros: itens.length, rotulo: 'Gasto com diárias' };
  if (agrupamento === 'mes') r.grupos = agrupar(itens.map((i) => ({ chave: i.mes, rotulo: rotuloMes(i.mes), valor: i.valor })), true);
  if (agrupamento === 'beneficiario') r.grupos = agrupar(itens.map((i) => ({ chave: i.beneficiario, rotulo: BENEFICIARIO_ROTULO[i.beneficiario], valor: i.valor })), false);
  return r;
}

/* ---------------------------------------------------------------------- */
/*  Solicitações                                                           */
/* ---------------------------------------------------------------------- */

async function resultadoSolicitacoes(sb: SupabaseClient, p: PeriodoResolvido, filtros: Filtros, agrupamento: Agrupamento): Promise<ResultadoConsulta> {
  const linhas = await paginar((de, ate) => {
    let q = sb.from('solicitacoes').select('id, status, created_at').gte('created_at', inicioTs(p)).lte('created_at', fimTs(p)).order('id').range(de, ate);
    if (filtros.status?.length) q = q.in('status', filtros.status);
    return q;
  });
  const r: ResultadoConsulta = { total: linhas.length, unidade: 'quantidade', registros: linhas.length, rotulo: 'Solicitações abertas no período' };
  const entradas = linhas.map((l) => {
    const st = texto(l.status) as StatusSolicitacao;
    return agrupamento === 'mes'
      ? { chave: mesBrasilia(texto(l.created_at)), rotulo: rotuloMes(mesBrasilia(texto(l.created_at))), valor: 1 }
      : { chave: st, rotulo: STATUS_ROTULO[st] ?? (st || 'Sem situação'), valor: 1 };
  });
  r.grupos = agrupar(entradas, agrupamento === 'mes');
  return r;
}

/* ---------------------------------------------------------------------- */
/*  Execução por relatório do catálogo                                     */
/* ---------------------------------------------------------------------- */

export async function executarConsulta(
  sb: SupabaseClient,
  relatorio: RelatorioId,
  periodo: PeriodoResolvido,
  filtros: Filtros,
  agrupamento: Agrupamento,
): Promise<ResultadoConsulta> {
  const avisos: string[] = [];
  const comAvisos = (r: ResultadoConsulta): ResultadoConsulta => (avisos.length ? { ...r, avisos } : r);
  switch (relatorio) {
    case 'gasto_passagens':
    case 'passagens_por_modal':
    case 'custo_por_destino':
      return comAvisos(resultadoPassagens(await itensPassagens(sb, periodo, filtros, avisos), agrupamento));
    case 'gasto_diarias':
      return comAvisos(resultadoDiarias(await itensDiarias(sb, periodo, filtros, avisos), agrupamento));
    case 'solicitacoes_por_status':
      return resultadoSolicitacoes(sb, periodo, filtros, agrupamento);
    case 'custo_total': {
      const [passagens, diarias] = await Promise.all([itensPassagens(sb, periodo, {}, avisos), itensDiarias(sb, periodo, {}, avisos)]);
      const soma = (l: { valor: number }[]) => centavos(l.reduce((t, i) => t + i.valor, 0));
      const soPassagens = passagens.filter((i) => i.tipo === 'passagem');
      const soAdicionais = passagens.filter((i) => i.tipo === 'adicional');
      const r: ResultadoConsulta = {
        total: centavos(soma(passagens) + soma(diarias)),
        unidade: 'BRL',
        registros: passagens.length + diarias.length,
        rotulo: 'Custo total do TFD',
        composicao: [
          { rotulo: 'Passagens (valor menos reembolso)', valor: soma(soPassagens), quantidade: soPassagens.length },
          { rotulo: 'Adicionais ligados a passagens', valor: soma(soAdicionais), quantidade: soAdicionais.length },
          { rotulo: 'Diárias (ajuda de custo)', valor: soma(diarias), quantidade: diarias.length },
        ],
      };
      if (agrupamento === 'mes') {
        r.grupos = agrupar([...passagens.map((i) => ({ chave: i.mes, rotulo: rotuloMes(i.mes), valor: i.valor })), ...diarias.map((i) => ({ chave: i.mes, rotulo: rotuloMes(i.mes), valor: i.valor }))], true);
      }
      if (agrupamento === 'categoria') r.grupos = { itens: [...(r.composicao ?? [])].sort((a, b) => b.valor - a.valor), omitidos: 0, cronologico: false };
      return comAvisos(r);
    }
  }
}
