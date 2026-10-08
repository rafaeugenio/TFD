import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { VALOR_DIARIA_PERNOITE, calcularValorAjuda } from '@/core/mocks/fluxo-v2-v3-seed';
import { calcularQuantidadePassagem, resolveSigtapAjudaCusto, resolveSigtapPassagem } from '@/app/relatorios/_shared/sigtap-mapper';
import type { ItemValor } from '@/app/relatorios/_assistente/contrato';
import {
  BENEFICIARIO_ROTULO, MODAL_ROTULO, PRIORIDADE_ROTULO, SETOR_ROTULO, STATUS_ENCERRADOS, STATUS_ROTULO,
  type Agrupamento, type Beneficiario, type CriterioExtremo, type EntidadeExtremo, type Filtros, type Modal, type Prioridade, type RelatorioId, type StatusSolicitacao,
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
  unidade: 'BRL' | 'quantidade' | 'dias' | 'data';
  registros: number;
  /** Registro em destaque: data (ISO) e atributos sem dado pessoal. */
  dataIso?: string;
  atributos?: { rotulo: string; valor: string }[];
  rotulo: string;
  composicao?: ItemValor[];
  grupos?: { itens: ItemValor[]; omitidos: number; cronologico: boolean };
  /** O que ficou de fora do cálculo por limitação do banco atual. */
  avisos?: string[];
  /** Informação curta extra para a legenda do número (ex.: distância total). */
  extra?: string;
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
    if (filtros.destino) q = q.ilike('destino_cidade', `%${filtros.destino}%`);
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
/*  Contagens gerais do sistema (solicitações, pareceres, agendamentos...) */
/* ---------------------------------------------------------------------- */

type Chave = { chave: string; rotulo: string } | null;
const SEM = (rotulo: string) => ({ chave: '-', rotulo });

/** Municípios (id, nome, regional) para rotular solicitações. Tabela pequena. */
async function mapaMunicipios(sb: SupabaseClient): Promise<Map<string, { nome: string; regional: string; uf: string }>> {
  const { data, error } = await sb.from('municipios').select('id, nome, regional, uf').limit(2000);
  if (error) throw new ErroServico('banco', 'indisponivel');
  return new Map(((data ?? []) as Linha[]).map((m) => [texto(m.id), { nome: texto(m.nome), regional: texto(m.regional), uf: texto(m.uf) }]));
}

const titulo = (s: string) => s.toLowerCase().replace(/(^|[\s/-])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase());

function chaveSolicitacao(l: Linha, ag: Agrupamento, mun: Map<string, { nome: string; regional: string; uf: string }>): Chave {
  switch (ag) {
    case 'status': { const st = texto(l.status) as StatusSolicitacao; return { chave: st || '-', rotulo: STATUS_ROTULO[st] ?? (st || 'Sem situação') }; }
    case 'setor': { const se = texto(l.setor_atual); return { chave: se || '-', rotulo: SETOR_ROTULO[se] ?? (se ? titulo(se.replace(/_/g, ' ')) : 'Sem setor') }; }
    case 'especialidade': { const e = texto(l.especialidade).trim(); return e ? { chave: e.toLowerCase(), rotulo: e } : SEM('Não informada'); }
    case 'prioridade': { const pr = texto(l.prioridade) as Prioridade; return { chave: pr || '-', rotulo: PRIORIDADE_ROTULO[pr] ?? (pr || 'Não informada') }; }
    case 'municipio': { const m = mun.get(texto(l.municipio_origem_id)); return m ? { chave: m.nome, rotulo: `${m.nome}${m.uf ? `/${m.uf}` : ''}` } : SEM('Não informado'); }
    case 'regional': { const m = mun.get(texto(l.municipio_origem_id)); return m?.regional ? { chave: m.regional, rotulo: titulo(m.regional) } : SEM('Não informada'); }
    case 'mes': { const m = mesBrasilia(texto(l.created_at)); return { chave: m, rotulo: rotuloMes(m) }; }
    default: return null;
  }
}

async function resultadoSolicitacoes(sb: SupabaseClient, p: PeriodoResolvido | null, filtros: Filtros, agrupamento: Agrupamento, emAndamento: boolean): Promise<ResultadoConsulta> {
  const linhas = await paginar((de, ate) => {
    let q = sb.from('solicitacoes').select('id, status, setor_atual, especialidade, prioridade, municipio_origem_id, cid10_principal, created_at').order('id').range(de, ate);
    if (p) q = q.gte('created_at', inicioTs(p)).lte('created_at', fimTs(p));
    if (emAndamento) q = q.not('status', 'in', `(${STATUS_ENCERRADOS.join(',')})`);
    if (filtros.status?.length) q = q.in('status', filtros.status);
    if (filtros.prioridade?.length) q = q.in('prioridade', filtros.prioridade);
    if (filtros.municipio) q = q.in('municipio_origem_id', filtros.municipio.ids);
    if (filtros.especialidade) q = q.ilike('especialidade', filtros.especialidade);
    if (filtros.cid) q = q.ilike('cid10_principal', `${filtros.cid}%`);
    return q;
  });
  const mun = agrupamento === 'municipio' || agrupamento === 'regional' ? await mapaMunicipios(sb) : new Map();
  if (agrupamento === 'cid') {
    // CID com a descrição da tabela CID-10 (só dos códigos que apareceram).
    const codigos = [...new Set(linhas.map((l) => texto(l.cid10_principal).trim()).filter(Boolean))];
    const desc = new Map<string, string>();
    for (let i = 0; i < codigos.length; i += 200) {
      const { data } = await sb.from('cid10').select('codigo, descricao').in('codigo', codigos.slice(i, i + 200));
      for (const c of (data ?? []) as Linha[]) desc.set(texto(c.codigo), texto(c.descricao));
    }
    const r: ResultadoConsulta = { total: linhas.length, unidade: 'quantidade', registros: linhas.length, rotulo: emAndamento ? 'Solicitações em andamento' : 'Solicitações abertas no período' };
    r.grupos = agrupar(linhas.map((l) => {
      const c = texto(l.cid10_principal).trim();
      const d = desc.get(c);
      return c ? { chave: c, rotulo: d ? `${c} · ${d.length > 26 ? `${d.slice(0, 25).trim()}…` : d}` : c, valor: 1 } : { chave: '-', rotulo: 'Sem CID', valor: 1 };
    }), false);
    return r;
  }
  const r: ResultadoConsulta = {
    total: linhas.length, unidade: 'quantidade', registros: linhas.length,
    rotulo: emAndamento ? (p ? 'Solicitações em andamento abertas no período' : 'Solicitações em andamento agora') : 'Solicitações abertas no período',
  };
  if (agrupamento !== 'nenhum') r.grupos = agrupar(linhas.flatMap((l) => { const k = chaveSolicitacao(l, agrupamento, mun); return k ? [{ ...k, valor: 1 }] : []; }), agrupamento === 'mes');
  return r;
}

async function resultadoPareceres(sb: SupabaseClient, p: PeriodoResolvido, agrupamento: Agrupamento): Promise<ResultadoConsulta> {
  const linhas = await paginar((de, ate) => sb.from('pareceres').select('id, decisao, created_at').gte('created_at', inicioTs(p)).lte('created_at', fimTs(p)).order('id').range(de, ate));
  const r: ResultadoConsulta = { total: linhas.length, unidade: 'quantidade', registros: linhas.length, rotulo: 'Pareceres emitidos' };
  r.grupos = agrupar(linhas.map((l) => {
    if (agrupamento === 'mes') { const m = mesBrasilia(texto(l.created_at)); return { chave: m, rotulo: rotuloMes(m), valor: 1 }; }
    const d = texto(l.decisao);
    return { chave: d || '-', rotulo: d ? titulo(d) : 'Sem decisão', valor: 1 };
  }), agrupamento === 'mes');
  return r;
}

async function resultadoAgendamentos(sb: SupabaseClient, p: PeriodoResolvido, agrupamento: Agrupamento): Promise<ResultadoConsulta> {
  const linhas = await paginar((de, ate) => sb.from('agendamentos').select('id, cidade_destino, uf_destino, status, data_hora_agendamento')
    .gte('data_hora_agendamento', inicioTs(p)).lte('data_hora_agendamento', fimTs(p)).order('id').range(de, ate));
  const r: ResultadoConsulta = { total: linhas.length, unidade: 'quantidade', registros: linhas.length, rotulo: 'Agendamentos marcados' };
  r.grupos = agrupar(linhas.map((l) => {
    if (agrupamento === 'mes') { const m = mesBrasilia(texto(l.data_hora_agendamento)); return { chave: m, rotulo: rotuloMes(m), valor: 1 }; }
    if (agrupamento === 'status') { const st = texto(l.status); return { chave: st || '-', rotulo: st ? titulo(st) : 'Sem situação', valor: 1 }; }
    const c = texto(l.cidade_destino).trim();
    return c ? { chave: c.toLowerCase(), rotulo: `${titulo(c)}${texto(l.uf_destino) ? `/${texto(l.uf_destino)}` : ''}`, valor: 1 } : { ...SEM('Não informada'), valor: 1 };
  }), agrupamento === 'mes');
  return r;
}

async function resultadoPacientes(sb: SupabaseClient, p: PeriodoResolvido | null, agrupamento: Agrupamento): Promise<ResultadoConsulta> {
  const linhas = await paginar((de, ate) => {
    let q = sb.from('pacientes').select('id, municipio, uf, sexo, created_at').eq('ativo', true).order('id').range(de, ate);
    if (p) q = q.gte('created_at', inicioTs(p)).lte('created_at', fimTs(p));
    return q;
  });
  const r: ResultadoConsulta = { total: linhas.length, unidade: 'quantidade', registros: linhas.length, rotulo: p ? 'Pacientes cadastrados no período' : 'Pacientes ativos no cadastro' };
  if (agrupamento !== 'nenhum') {
    r.grupos = agrupar(linhas.map((l) => {
      if (agrupamento === 'mes') { const m = mesBrasilia(texto(l.created_at)); return { chave: m, rotulo: rotuloMes(m), valor: 1 }; }
      if (agrupamento === 'sexo') { const sx = texto(l.sexo); return { chave: sx || '-', rotulo: sx ? titulo(sx) : 'Não informado', valor: 1 }; }
      const m = texto(l.municipio).trim();
      return m ? { chave: m.toLowerCase(), rotulo: `${titulo(m)}${texto(l.uf) ? `/${texto(l.uf)}` : ''}`, valor: 1 } : { ...SEM('Não informado'), valor: 1 };
    }), agrupamento === 'mes');
  }
  return r;
}

const DIA_MS = 86_400_000;

async function resultadoTempoMedio(sb: SupabaseClient, p: PeriodoResolvido, filtros: Filtros, agrupamento: Agrupamento): Promise<ResultadoConsulta> {
  const linhas = await paginar((de, ate) => {
    let q = sb.from('solicitacoes').select('id, especialidade, prioridade, created_at, data_encerramento')
      .eq('status', 'CONCLUIDO').not('data_encerramento', 'is', null)
      .gte('data_encerramento', inicioTs(p)).lte('data_encerramento', fimTs(p)).order('id').range(de, ate);
    if (filtros.prioridade?.length) q = q.in('prioridade', filtros.prioridade);
    return q;
  });
  const itens = linhas.flatMap((l) => {
    const ini = new Date(texto(l.created_at)).getTime(); const fim = new Date(texto(l.data_encerramento)).getTime();
    if (!Number.isFinite(ini) || !Number.isFinite(fim) || fim < ini) return [];
    return [{ l, dias: (fim - ini) / DIA_MS }];
  });
  const media = (v: number[]) => (v.length ? Math.round((v.reduce((t, x) => t + x, 0) / v.length) * 10) / 10 : 0);
  const r: ResultadoConsulta = { total: media(itens.map((i) => i.dias)), unidade: 'dias', registros: itens.length, rotulo: 'Tempo médio até a conclusão' };
  if (agrupamento !== 'nenhum') {
    const mapa = new Map<string, { rotulo: string; dias: number[] }>();
    for (const i of itens) {
      const k = chaveSolicitacao({ ...i.l, created_at: texto(i.l.data_encerramento) }, agrupamento, new Map());
      if (!k) continue;
      const g = mapa.get(k.chave) ?? { rotulo: k.rotulo, dias: [] };
      g.dias.push(i.dias); mapa.set(k.chave, g);
    }
    const cron = agrupamento === 'mes';
    const lista = [...mapa.entries()].map(([chave, g]) => ({ chave, rotulo: g.rotulo, valor: media(g.dias), quantidade: g.dias.length }));
    lista.sort(cron ? (a, b) => a.chave.localeCompare(b.chave) : (a, b) => b.valor - a.valor);
    const lim = cron ? lista.length : MAX_GRUPOS;
    r.grupos = { itens: lista.slice(0, lim).map(({ rotulo, valor, quantidade }) => ({ rotulo, valor, quantidade })), omitidos: Math.max(0, lista.length - lim), cronologico: cron };
  }
  return r;
}


/* ---------------------------------------------------------------------- */
/*  BPA / SIGTAP e deslocamentos (mesma regra do módulo Financeiro)        */
/* ---------------------------------------------------------------------- */

type ModalSigtap = 'terrestre' | 'aereo' | 'fluvial';
const modalSigtap = (m: string): ModalSigtap => (m === 'AEREO' ? 'aereo' : m === 'FLUVIAL' ? 'fluvial' : 'terrestre');

async function acompanhantesDoadores(sb: SupabaseClient, ids: string[]): Promise<Set<string>> {
  const doadores = new Set<string>();
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await sb.from('solicitacao_acompanhantes').select('solicitacao_id, doador').in('solicitacao_id', ids.slice(i, i + 200)).eq('doador', true);
    if (error) throw new ErroServico('banco', 'indisponivel');
    for (const r of (data ?? []) as Linha[]) doadores.add(texto(r.solicitacao_id));
  }
  return doadores;
}

async function resultadoBpa(sb: SupabaseClient, p: PeriodoResolvido, filtros: Filtros, agrupamento: Agrupamento): Promise<ResultadoConsulta> {
  const ajudas = filtros.modal?.length ? [] : await paginar((de, ate) => {
    let q = sb.from('ajudas_custo').select('id, tipo, data_inicio, dias_elegiveis, solicitacao_id').gte('data_inicio', p.inicio).lte('data_inicio', p.fim).order('id').range(de, ate);
    if (filtros.beneficiario?.length) q = q.in('tipo', filtros.beneficiario);
    return q;
  });
  const viagens = await paginar((de, ate) => {
    let q = sb.from('viagens').select('id, modal, solicitacao_id, data_embarque_prevista, distancia_valor').eq('ativa', true)
      .gte('data_embarque_prevista', p.inicio).lte('data_embarque_prevista', p.fim).order('id').range(de, ate);
    if (filtros.modal?.length) q = q.in('modal', filtros.modal);
    return q;
  });
  const doadores = await acompanhantesDoadores(sb, [...new Set(ajudas.filter((a) => texto(a.tipo) === 'ACOMPANHANTE').map((a) => texto(a.solicitacao_id)))]);

  const itens: { valor: number; procedimento: string; mes: string; modal: string; beneficiario: Beneficiario; codigos: string[]; qtd: number[]; semDistancia?: boolean }[] = [];
  for (const a of ajudas) {
    const acomp = texto(a.tipo) === 'ACOMPANHANTE' && !doadores.has(texto(a.solicitacao_id));
    const beneficiario: Beneficiario = acomp ? 'ACOMPANHANTE' : 'PACIENTE';
    const dias = numero(a.dias_elegiveis);
    const com = resolveSigtapAjudaCusto({ beneficiario: acomp ? 'acompanhante' : 'paciente', comPernoite: true, cnrac: false });
    const sem = resolveSigtapAjudaCusto({ beneficiario: acomp ? 'acompanhante' : 'paciente', comPernoite: false, cnrac: false });
    itens.push({ valor: 0, procedimento: 'Ajuda de custo', mes: mesBrasilia(texto(a.data_inicio)), modal: '', beneficiario, codigos: dias > 0 ? [com.codigo, sem.codigo] : [sem.codigo], qtd: dias > 0 ? [dias, 1] : [1] });
  }
  for (const v of viagens) {
    if (texto(v.modal) === 'TRANSFER') continue; // transfer não tem código de deslocamento no SIGTAP
    const sig = resolveSigtapPassagem({ beneficiario: 'paciente', modal: modalSigtap(texto(v.modal)), cnrac: false });
    const q = calcularQuantidadePassagem(numero(v.distancia_valor) || null, sig.unidadeDivisor);
    itens.push({ valor: 0, procedimento: 'Deslocamento', mes: mesBrasilia(texto(v.data_embarque_prevista)), modal: texto(v.modal), beneficiario: 'PACIENTE', codigos: q ? [sig.codigo] : [], qtd: q ? [q] : [], semDistancia: !q });
  }

  const codigos = [...new Set(itens.flatMap((i) => i.codigos))];
  const valores = new Map<string, number>();
  if (codigos.length) {
    const { data, error } = await sb.from('sigtap_procedimentos').select('codigo, valor_unitario').in('codigo', codigos);
    if (error) throw new ErroServico('banco', 'indisponivel');
    for (const r of (data ?? []) as Linha[]) valores.set(texto(r.codigo), numero(r.valor_unitario));
  }
  for (const i of itens) i.valor = i.codigos.reduce((t, c, k) => t + (valores.get(c) ?? 0) * i.qtd[k], 0);

  const soma = (l: typeof itens) => centavos(l.reduce((t, i) => t + i.valor, 0));
  const ajudasItens = itens.filter((i) => i.procedimento === 'Ajuda de custo');
  const desloc = itens.filter((i) => i.procedimento === 'Deslocamento');
  const semDist = desloc.filter((i) => i.semDistancia).length;
  const r: ResultadoConsulta = {
    total: soma(itens), unidade: 'BRL', registros: itens.length, rotulo: 'Valor SIGTAP (BPA)',
    composicao: [
      { rotulo: 'Ajudas de custo', valor: soma(ajudasItens), quantidade: ajudasItens.length },
      { rotulo: 'Deslocamentos', valor: soma(desloc), quantidade: desloc.length },
    ],
    extra: [ajudasItens.length ? `${QTD_(ajudasItens.length)} ${ajudasItens.length === 1 ? 'ajuda de custo' : 'ajudas de custo'}` : '', desloc.length ? `${QTD_(desloc.length)} ${desloc.length === 1 ? 'deslocamento' : 'deslocamentos'}` : ''].filter(Boolean).join(' e '),
  };
  if (semDist) r.avisos = [`${semDist} ${semDist === 1 ? 'deslocamento está' : 'deslocamentos estão'} sem distância informada e ficaram com valor SIGTAP zero.`];
  const chave = (i: (typeof itens)[number]): { chave: string; rotulo: string } | null => {
    switch (agrupamento) {
      case 'procedimento': return { chave: i.procedimento, rotulo: i.procedimento };
      case 'mes': return { chave: i.mes, rotulo: rotuloMes(i.mes) };
      case 'modal': return i.procedimento === 'Deslocamento' ? { chave: i.modal, rotulo: MODAL_ROTULO[i.modal as Modal] ?? 'Não informado' } : { chave: 'ajuda', rotulo: 'Ajuda de custo' };
      case 'beneficiario': return { chave: i.beneficiario, rotulo: BENEFICIARIO_ROTULO[i.beneficiario] };
      default: return null;
    }
  };
  if (agrupamento !== 'nenhum') r.grupos = agrupar(itens.flatMap((i) => { const k = chave(i); return k ? [{ ...k, valor: i.valor }] : []; }), agrupamento === 'mes');
  return r;
}
const QTD_ = (n: number) => n.toLocaleString('pt-BR');

async function resultadoDeslocamentos(sb: SupabaseClient, p: PeriodoResolvido, filtros: Filtros, agrupamento: Agrupamento): Promise<ResultadoConsulta> {
  const linhas = await paginar((de, ate) => {
    let q = sb.from('viagens').select('id, modal, origem_cidade, origem_uf, destino_cidade, destino_uf, data_embarque_prevista, distancia_valor, distancia_unidade')
      .eq('ativa', true).gte('data_embarque_prevista', p.inicio).lte('data_embarque_prevista', p.fim).order('id').range(de, ate);
    if (filtros.modal?.length) q = q.in('modal', filtros.modal);
    return q;
  });
  // Distância somada por unidade (km, milhas, milhas náuticas), sem converter.
  const porUnidade = new Map<string, number>();
  for (const l of linhas) {
    const d = numero(l.distancia_valor);
    if (d > 0) { const u = texto(l.distancia_unidade) || 'km'; porUnidade.set(u, (porUnidade.get(u) ?? 0) + d); }
  }
  const nomeUnidade: Record<string, string> = { km: 'km', milhas: 'milhas', milhas_nauticas: 'milhas náuticas', mi: 'milhas', mn: 'milhas náuticas' };
  const distancias = [...porUnidade.entries()].map(([u, v]) => `${Math.round(v).toLocaleString('pt-BR')} ${nomeUnidade[u] ?? u}`);
  const cidade = (c: unknown, uf: unknown) => (texto(c) ? `${texto(c)}${texto(uf) ? `/${texto(uf)}` : ''}` : 'Não informada');
  const r: ResultadoConsulta = {
    total: linhas.length, unidade: 'quantidade', registros: linhas.length, rotulo: 'Deslocamentos (trechos)',
    extra: distancias.length ? `${distancias.join(' + ')} percorridos` : undefined,
  };
  r.grupos = agrupar(linhas.map((l) => {
    if (agrupamento === 'mes') { const m = mesBrasilia(texto(l.data_embarque_prevista)); return { chave: m, rotulo: rotuloMes(m), valor: 1 }; }
    if (agrupamento === 'destino') { const c = cidade(l.destino_cidade, l.destino_uf); return { chave: c, rotulo: c, valor: 1 }; }
    if (agrupamento === 'origem') { const c = cidade(l.origem_cidade, l.origem_uf); return { chave: c, rotulo: c, valor: 1 }; }
    const m = texto(l.modal); return { chave: m || '-', rotulo: MODAL_ROTULO[m as Modal] ?? 'Não informado', valor: 1 };
  }), agrupamento === 'mes');
  return r;
}


/* ---------------------------------------------------------------------- */
/*  Registro em destaque (maior, menor, mais recente, mais antigo)         */
/* ---------------------------------------------------------------------- */

export interface ContextoCliente {
  competencias?: { ano: number; mes: number; faturamento: { status: string; fechadaEm?: string; linhas: number }; bpa: { status: string; fechadaEm?: string; linhas: number } }[];
}

const MESES_NOME = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const dataHoraBR = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso.split('-').reverse().join('/') : d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
};
const SITUACAO_VIAGEM: Record<string, string> = { AGUARDANDO_EMISSAO: 'Aguardando emissão', EMITIDA: 'Emitida', REMARCADA: 'Remarcada', CANCELADA: 'Cancelada', NO_SHOW: 'Não compareceu', UTILIZADA: 'Utilizada' };

async function registroExtremo(
  sb: SupabaseClient, p: PeriodoResolvido | null, filtros: Filtros,
  extremo: { entidade: EntidadeExtremo; criterio: CriterioExtremo }, ctx: ContextoCliente,
): Promise<ResultadoConsulta> {
  const { entidade, criterio } = extremo;
  const asc = criterio === 'menor_valor' || criterio === 'mais_antigo';
  const porValor = criterio === 'maior_valor' || criterio === 'menor_valor';
  const nada = (rotulo: string): ResultadoConsulta => ({ total: 0, unidade: 'data', registros: 0, rotulo });
  const noPeriodo = <T extends { gte: (c: string, v: string) => T; lte: (c: string, v: string) => T }>(q: T, col: string, data = false) =>
    p ? q.gte(col, data ? p.inicio : inicioTs(p)).lte(col, data ? p.fim : fimTs(p)) : q;
  const quando = (c: CriterioExtremo) => ({ maior_valor: 'mais cara', menor_valor: 'mais barata', mais_recente: 'mais recente', mais_antigo: 'mais antiga' } as Record<string, string>)[c];

  switch (entidade) {
    case 'passagem': {
      let q = sb.from('viagens').select('valor, modal, tipo, origem_cidade, origem_uf, destino_cidade, destino_uf, emitido_em, created_at, data_embarque_prevista, companhia, situacao').eq('ativa', true);
      q = noPeriodo(q, 'created_at');
      if (filtros.modal?.length) q = q.in('modal', filtros.modal);
      if (filtros.destino) q = q.ilike('destino_cidade', `%${filtros.destino}%`);
      if (porValor) q = q.not('valor', 'is', null);
      const { data, error } = await q.order(porValor ? 'valor' : 'created_at', { ascending: asc }).limit(1);
      if (error) throw new ErroServico('banco', 'indisponivel');
      const v = (data ?? [])[0] as Linha | undefined;
      if (!v) return nada('Passagem');
      const emissao = texto(v.emitido_em) || texto(v.created_at);
      const atributos = [
        { rotulo: 'Rota', valor: `${texto(v.origem_cidade)}/${texto(v.origem_uf)} → ${texto(v.destino_cidade)}/${texto(v.destino_uf)}` },
        { rotulo: 'Modal', valor: MODAL_ROTULO[texto(v.modal) as Modal] ?? texto(v.modal) },
        { rotulo: 'Trecho', valor: texto(v.tipo) === 'RETORNO' ? 'Volta' : 'Ida' },
        { rotulo: 'Emissão', valor: dataHoraBR(emissao) },
        { rotulo: 'Embarque previsto', valor: dataHoraBR(texto(v.data_embarque_prevista)) },
        ...(texto(v.companhia) ? [{ rotulo: 'Companhia', valor: texto(v.companhia) }] : []),
        { rotulo: 'Situação', valor: SITUACAO_VIAGEM[texto(v.situacao)] ?? texto(v.situacao) },
      ];
      return porValor
        ? { total: numero(v.valor), unidade: 'BRL', registros: 1, rotulo: `Passagem ${quando(criterio)}`, atributos }
        : { total: 0, unidade: 'data', registros: 1, rotulo: `Passagem ${quando(criterio)}`, dataIso: emissao, atributos: [{ rotulo: 'Valor', valor: numero(v.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }, ...atributos] };
    }
    case 'ajuda_custo': {
      let q = sb.from('ajudas_custo').select('tipo, data_inicio, data_fim, status, concluido_em, created_at, valor_reembolso').eq('ativa', true);
      q = noPeriodo(q, 'created_at');
      const linhas = await paginar((de, ate) => q.order('id').range(de, ate));
      if (!linhas.length) return nada('Ajuda de custo');
      const itens = linhas.filter((a) => texto(a.data_inicio) && texto(a.data_fim)).map((a) => ({ a, valor: calcularValorAjuda(texto(a.data_inicio), texto(a.data_fim)).valor - numero(a.valor_reembolso) }));
      itens.sort(porValor ? (x, y) => (asc ? x.valor - y.valor : y.valor - x.valor) : (x, y) => (asc ? 1 : -1) * texto(x.a.created_at).localeCompare(texto(y.a.created_at)));
      const top = itens[0];
      if (!top) return nada('Ajuda de custo');
      const atributos = [
        { rotulo: 'Período', valor: `${dataHoraBR(texto(top.a.data_inicio))} a ${dataHoraBR(texto(top.a.data_fim))}` },
        { rotulo: 'Beneficiário', valor: texto(top.a.tipo) === 'ACOMPANHANTE' ? 'Acompanhante' : 'Paciente' },
        { rotulo: 'Situação', valor: titulo(texto(top.a.status)) },
      ];
      return porValor
        ? { total: centavos(top.valor), unidade: 'BRL', registros: 1, rotulo: `Ajuda de custo ${quando(criterio)}`, atributos }
        : { total: 0, unidade: 'data', registros: 1, rotulo: `Ajuda de custo ${quando(criterio)}`, dataIso: texto(top.a.created_at), atributos: [{ rotulo: 'Valor', valor: top.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }, ...atributos] };
    }
    case 'adicional': {
      let q = sb.from('adicionais').select('categoria, valor, status, data_ocorrencia, descricao');
      q = noPeriodo(q, 'data_ocorrencia', true);
      const { data, error } = await q.order(porValor ? 'valor' : 'data_ocorrencia', { ascending: asc }).limit(1);
      if (error) throw new ErroServico('banco', 'indisponivel');
      const a = (data ?? [])[0] as Linha | undefined;
      if (!a) return nada('Adicional');
      const atributos = [{ rotulo: 'Categoria', valor: titulo(texto(a.categoria).replace(/_/g, ' ')) }, { rotulo: 'Situação', valor: titulo(texto(a.status).replace(/_/g, ' ')) }, { rotulo: 'Data', valor: dataHoraBR(texto(a.data_ocorrencia)) }];
      return porValor
        ? { total: numero(a.valor), unidade: 'BRL', registros: 1, rotulo: `Adicional ${quando(criterio)}`, atributos }
        : { total: 0, unidade: 'data', registros: 1, rotulo: `Adicional ${quando(criterio)}`, dataIso: texto(a.data_ocorrencia), atributos: [{ rotulo: 'Valor', valor: numero(a.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }, ...atributos] };
    }
    case 'solicitacao': case 'qualquer_registro': {
      let q = sb.from('solicitacoes').select('numero_processo, status, setor_atual, especialidade, prioridade, municipio_origem_id, created_at');
      q = noPeriodo(q, 'created_at');
      if (filtros.municipio) q = q.in('municipio_origem_id', filtros.municipio.ids);
      if (filtros.especialidade) q = q.ilike('especialidade', filtros.especialidade);
      const { data, error } = await q.order('created_at', { ascending: criterio !== 'mais_recente' && criterio !== 'maior_valor' }).limit(1);
      if (error) throw new ErroServico('banco', 'indisponivel');
      const l = (data ?? [])[0] as Linha | undefined;
      if (!l) return nada('Solicitação');
      const mun = await mapaMunicipios(sb);
      const m = mun.get(texto(l.municipio_origem_id));
      const recente = criterio === 'mais_recente' || criterio === 'maior_valor';
      return {
        total: 0, unidade: 'data', registros: 1, dataIso: texto(l.created_at),
        rotulo: entidade === 'qualquer_registro' ? (recente ? 'Registro mais recente (solicitação aberta)' : 'Primeiro registro (solicitação aberta)') : `Solicitação aberta ${recente ? 'mais recente' : 'mais antiga'}`,
        atributos: [
          { rotulo: 'Processo', valor: texto(l.numero_processo) },
          { rotulo: 'Setor atual', valor: SETOR_ROTULO[texto(l.setor_atual)] ?? texto(l.setor_atual) },
          { rotulo: 'Situação', valor: STATUS_ROTULO[texto(l.status) as StatusSolicitacao] ?? texto(l.status) },
          ...(texto(l.especialidade) ? [{ rotulo: 'Especialidade', valor: texto(l.especialidade) }] : []),
          ...(m ? [{ rotulo: 'Município', valor: `${m.nome}${m.uf ? `/${m.uf}` : ''}` }] : []),
          { rotulo: 'Prioridade', valor: PRIORIDADE_ROTULO[texto(l.prioridade) as Prioridade] ?? texto(l.prioridade) },
        ],
      };
    }
    case 'parecer': case 'agendamento': case 'encerramento': {
      const cfg = {
        parecer: { tabela: 'pareceres', col: 'created_at', sel: 'decisao, tipo, created_at', rot: 'Parecer', data: false },
        agendamento: { tabela: 'agendamentos', col: 'data_hora_agendamento', sel: 'cidade_destino, uf_destino, status, tipo_atendimento, data_hora_agendamento', rot: 'Agendamento', data: false },
        encerramento: { tabela: 'encerramentos', col: 'data_encerramento', sel: 'motivo, data_encerramento', rot: 'Encerramento', data: true },
      }[entidade];
      let q = sb.from(cfg.tabela).select(cfg.sel);
      q = noPeriodo(q, cfg.col, cfg.data);
      const { data, error } = await q.order(cfg.col, { ascending: criterio === 'mais_antigo' || criterio === 'menor_valor' }).limit(1);
      if (error) throw new ErroServico('banco', 'indisponivel');
      const l = (data ?? [])[0] as unknown as Linha | undefined;
      if (!l) return nada(cfg.rot);
      const atributos = Object.entries(l).filter(([k, v]) => k !== cfg.col && v).map(([k, v]) => ({ rotulo: titulo(k.replace(/_/g, ' ')), valor: titulo(texto(v).replace(/_/g, ' ')) }));
      return { total: 0, unidade: 'data', registros: 1, rotulo: `${cfg.rot} ${criterio === 'mais_antigo' || criterio === 'menor_valor' ? 'mais antigo' : 'mais recente'}`, dataIso: texto(l[cfg.col]), atributos };
    }
    case 'fechamento_faturamento': case 'fechamento_bpa': {
      const frente = entidade === 'fechamento_faturamento' ? 'faturamento' : 'bpa';
      const nome = frente === 'faturamento' ? 'Faturamento' : 'BPA';
      const fechadas = (ctx.competencias ?? []).filter((c) => c[frente].fechadaEm).sort((a, b) => texto(a[frente].fechadaEm).localeCompare(texto(b[frente].fechadaEm)));
      const c = criterio === 'mais_antigo' ? fechadas[0] : fechadas[fechadas.length - 1];
      if (!c) {
        // Sem fechamento: a última emissão de passagem é a referência mais próxima do faturamento.
        const { data } = await sb.from('viagens').select('emitido_em, created_at').eq('ativa', true).order('created_at', { ascending: false }).limit(1);
        const ult = (data ?? [])[0] as Linha | undefined;
        return {
          total: 0, unidade: 'data', registros: ult ? 1 : 0, rotulo: `Nenhum ${nome} fechado ainda`, dataIso: ult ? texto(ult.emitido_em) || texto(ult.created_at) : undefined,
          atributos: ult ? [{ rotulo: 'Referência', valor: 'Data da última passagem emitida (nenhuma competência fechada no Financeiro)' }] : [],
        };
      }
      return {
        total: 0, unidade: 'data', registros: 1, rotulo: `${criterio === 'mais_antigo' ? 'Primeiro' : 'Último'} fechamento do ${nome}`, dataIso: texto(c[frente].fechadaEm),
        atributos: [
          { rotulo: 'Competência', valor: `${MESES_NOME[c.mes - 1]}/${c.ano}` },
          { rotulo: 'Linhas', valor: String(c[frente].linhas) },
          { rotulo: 'Situação agora', valor: c[frente].status === 'fechada' ? 'Fechada' : 'Reaberta' },
        ],
      };
    }
  }
}

/** Primeira e última data com registro (para explicar resultado vazio). */
export async function coberturaDados(sb: SupabaseClient, relatorio: RelatorioId): Promise<{ inicio: string; fim: string } | null> {
  const fonte: Partial<Record<RelatorioId, [string, string]>> = {
    gasto_passagens: ['viagens', 'created_at'], passagens_por_modal: ['viagens', 'created_at'], custo_por_destino: ['viagens', 'created_at'],
    deslocamentos: ['viagens', 'data_embarque_prevista'], gasto_diarias: ['ajudas_custo', 'concluido_em'], bpa_sigtap: ['viagens', 'data_embarque_prevista'],
    custo_total: ['viagens', 'created_at'], solicitacoes_por_status: ['solicitacoes', 'created_at'], solicitacoes_em_andamento: ['solicitacoes', 'created_at'],
    pareceres_regulacao: ['pareceres', 'created_at'], agendamentos: ['agendamentos', 'data_hora_agendamento'], pacientes_cadastrados: ['pacientes', 'created_at'],
    tempo_medio_conclusao: ['solicitacoes', 'data_encerramento'],
  };
  const f = fonte[relatorio];
  if (!f) return null;
  const [tabela, col] = f;
  const ponta = async (asc: boolean) => {
    const { data } = await sb.from(tabela).select(col).not(col, 'is', null).order(col, { ascending: asc }).limit(1);
    return texto(((data ?? [])[0] as unknown as Linha | undefined)?.[col]).slice(0, 10);
  };
  const [inicio, fim] = await Promise.all([ponta(true), ponta(false)]);
  return inicio && fim ? { inicio, fim } : null;
}

/* ---------------------------------------------------------------------- */
/*  Execução por relatório do catálogo                                     */
/* ---------------------------------------------------------------------- */

export async function executarConsulta(
  sb: SupabaseClient,
  relatorio: RelatorioId,
  periodoOuNulo: PeriodoResolvido | null,
  filtros: Filtros,
  agrupamento: Agrupamento,
  extremo?: { entidade: EntidadeExtremo; criterio: CriterioExtremo },
  ctx: ContextoCliente = {},
): Promise<ResultadoConsulta> {
  const avisos: string[] = [];
  // Só as consultas com `periodoOpcional` aceitam rodar sem período.
  const periodo = periodoOuNulo as PeriodoResolvido;
  const comAvisos = (r: ResultadoConsulta): ResultadoConsulta => (avisos.length ? { ...r, avisos } : r);
  switch (relatorio) {
    case 'gasto_passagens':
    case 'passagens_por_modal':
    case 'custo_por_destino':
      return comAvisos(resultadoPassagens(await itensPassagens(sb, periodo, filtros, avisos), agrupamento));
    case 'gasto_diarias':
      return comAvisos(resultadoDiarias(await itensDiarias(sb, periodo, filtros, avisos), agrupamento));
    case 'solicitacoes_por_status':
      return resultadoSolicitacoes(sb, periodo, filtros, agrupamento, false);
    case 'solicitacoes_em_andamento':
      return resultadoSolicitacoes(sb, periodoOuNulo, filtros, agrupamento, true);
    case 'pareceres_regulacao':
      return resultadoPareceres(sb, periodo, agrupamento);
    case 'agendamentos':
      return resultadoAgendamentos(sb, periodo, agrupamento);
    case 'pacientes_cadastrados':
      return resultadoPacientes(sb, periodoOuNulo, agrupamento);
    case 'tempo_medio_conclusao':
      return resultadoTempoMedio(sb, periodo, filtros, agrupamento);
    case 'bpa_sigtap':
      return resultadoBpa(sb, periodo, filtros, agrupamento);
    case 'deslocamentos':
      return resultadoDeslocamentos(sb, periodo, filtros, agrupamento);
    case 'registro_extremo':
      return registroExtremo(sb, periodoOuNulo, filtros, extremo ?? { entidade: 'solicitacao', criterio: 'mais_recente' }, ctx);
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
