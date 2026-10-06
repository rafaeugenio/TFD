'use client';

/* -------------------------------------------------------------------------- */
/*  Linhas do Faturamento e do BPA, com as mesmas consultas e regras das      */
/*  telas de Relatórios que existiam antes (Faturamento e BPA), mas sem       */
/*  filtro de mês: a competência escolhe as linhas de qualquer mês.           */
/* -------------------------------------------------------------------------- */

import { createClient } from '@/lib/supabase/client';
import {
  calcularQuantidadePassagem,
  resolveSigtapAjudaCusto,
  resolveSigtapPassagem,
  type Beneficiario,
  type Modal,
} from '@/app/relatorios/_shared/sigtap-mapper';

/** Falha de consulta: a tela mostra erro em vez de tratar como lista vazia. */
export class ErroCarregamento extends Error {
  constructor(consulta: string, causa?: unknown) {
    super(`Falha ao carregar ${consulta}`, { cause: causa });
    this.name = 'ErroCarregamento';
  }
}

/* ── Faturamento ─────────────────────────────────────────────────────────── */

export interface LinhaFaturamento {
  chave: string;
  id: string;
  solicitacaoId: string;
  processo: string;
  /** Data em que a agência emitiu o bilhete; define o mês de referência. */
  dataEmissao: string;
  passageiro: string;
  beneficiario: Beneficiario;
  tipo: 'IDA' | 'VOLTA' | 'IDA_E_VOLTA';
  dataViagem: string | null;
  dataVolta: string | null;
  origem: string;
  destino: string;
  valor: number;
  valorReembolso: number;
  dataReembolso: string | null;
}

export async function carregarFaturamento(): Promise<LinhaFaturamento[]> {
  const sb = createClient();
  const { data, error } = await sb
    .from('viagens')
    .select(
      'id, tipo, solicitacao_id, data_embarque_prevista, created_at, emitido_em, ' +
      'origem_cidade, origem_uf, destino_cidade, destino_uf, valor, valor_reembolso, data_reembolso, ativa, ' +
      'solicitacoes!inner(numero_processo, pacientes(nome_completo))',
    )
    .eq('ativa', true)
    .order('created_at', { ascending: false });
  if (error || !data) throw new ErroCarregamento('faturamento', error);
  const tipoDe = (t: string): LinhaFaturamento['tipo'] => (t === 'RETORNO' || t === 'VOLTA' ? 'VOLTA' : t === 'IDA_E_VOLTA' ? 'IDA_E_VOLTA' : 'IDA');
  return (data as unknown as Array<Record<string, unknown>>).map((r) => {
    const sol = r.solicitacoes as Record<string, unknown> | null;
    const pac = sol?.pacientes as Record<string, unknown> | null;
    return {
      chave: `v:${r.id}`,
      id: String(r.id),
      solicitacaoId: String(r.solicitacao_id),
      processo: (sol?.numero_processo as string) ?? '',
      dataEmissao: String((r.emitido_em as string) ?? (r.created_at as string) ?? '').slice(0, 10),
      passageiro: (pac?.nome_completo as string) ?? 'Paciente',
      beneficiario: 'paciente',
      tipo: tipoDe(String(r.tipo ?? '')),
      dataViagem: (r.data_embarque_prevista as string) ?? null,
      dataVolta: null,
      origem: [r.origem_cidade, r.origem_uf].filter(Boolean).join('/'),
      destino: [r.destino_cidade, r.destino_uf].filter(Boolean).join('/'),
      valor: Number(r.valor) || 0,
      valorReembolso: Number(r.valor_reembolso) || 0,
      dataReembolso: (r.data_reembolso as string) ?? null,
    };
  });
}

/* ── BPA ─────────────────────────────────────────────────────────────────── */

export type ProcedimentoBpa = 'ajuda_custo' | 'deslocamento';

export interface LinhaBpa {
  chave: string;
  procedimento: ProcedimentoBpa;
  origemId: string;
  solicitacaoId: string;
  processo: string;
  trecho: 'ida' | 'volta' | null;
  /** Início da ajuda ou data da viagem; define o mês de referência. */
  dataAtendimento: string;
  documento: string;
  nome: string;
  beneficiario: Beneficiario;
  sexo: string | null;
  nascimento: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
  bairro: string | null;
  cep: string | null;
  municipio: string | null;
  cid: string | null;
  // Ajuda de custo
  codigoPernoite?: string;
  descricaoPernoite?: string;
  qtdPernoite?: number;
  codigoSemPernoite?: string;
  descricaoSemPernoite?: string;
  qtdSemPernoite?: number;
  // Deslocamento
  modal?: Modal;
  rota?: string;
  distancia?: number | null;
  unidade?: string | null;
  divisor?: number;
  codigo?: string;
  descricao?: string;
  quantidade?: number | null;
}

type Pessoa = Record<string, unknown>;

async function acompanhantesPorSolicitacao(ids: string[]) {
  const mapa = new Map<string, Pessoa & { doador: boolean }>();
  if (ids.length === 0) return mapa;
  const { data, error } = await createClient()
    .from('solicitacao_acompanhantes')
    .select('solicitacao_id, doador, acompanhantes(nome_completo, cpf, cns, sexo, email, data_nascimento, telefone)')
    .in('solicitacao_id', ids);
  if (error) throw new ErroCarregamento('acompanhantes', error);
  for (const v of (data as unknown as Array<Record<string, unknown>>) ?? []) {
    const a = v.acompanhantes as Pessoa | null;
    const sid = v.solicitacao_id as string;
    if (a && !mapa.has(sid)) mapa.set(sid, { ...a, doador: Boolean(v.doador) });
  }
  return mapa;
}

const PACIENTE_CAMPOS = 'pacientes(cpf, cns, nome_completo, sexo, data_nascimento, telefone_celular, email, logradouro, numero, bairro, cep, municipio)';

function pessoaBase(pac: Pessoa | null, acomp: (Pessoa & { doador: boolean }) | null) {
  return {
    documento: acomp ? ((acomp.cns as string) || (acomp.cpf as string) || '') : ((pac?.cns as string) || (pac?.cpf as string) || ''),
    nome: (acomp?.nome_completo as string) ?? (pac?.nome_completo as string) ?? '',
    sexo: (acomp?.sexo as string) ?? (pac?.sexo as string) ?? null,
    nascimento: (acomp?.data_nascimento as string) ?? (pac?.data_nascimento as string) ?? null,
    telefone: (acomp?.telefone as string) ?? (pac?.telefone_celular as string) ?? null,
    email: (acomp?.email as string) ?? (pac?.email as string) ?? null,
    endereco: [pac?.logradouro, pac?.numero].filter(Boolean).join(', ') || null,
    bairro: (pac?.bairro as string) ?? null,
    cep: (pac?.cep as string) ?? null,
    municipio: (pac?.municipio as string) ?? null,
  };
}

export async function carregarBpa(): Promise<LinhaBpa[]> {
  const sb = createClient();
  const [aj, vg] = await Promise.all([
    sb.from('ajudas_custo')
      .select(`id, tipo, data_inicio, dias_elegiveis, solicitacao_id, solicitacoes!inner(numero_processo, cid10_principal, ${PACIENTE_CAMPOS})`)
      .order('data_inicio', { ascending: false }),
    sb.from('viagens')
      .select(`id, tipo, modal, solicitacao_id, data_embarque_prevista, origem_cidade, origem_uf, destino_cidade, destino_uf, ativa, distancia_valor, distancia_unidade, solicitacoes!inner(numero_processo, cid10_principal, tipo_solicitacao, ${PACIENTE_CAMPOS})`)
      .eq('ativa', true)
      .order('data_embarque_prevista', { ascending: false }),
  ]);
  if (aj.error || !aj.data) throw new ErroCarregamento('ajudas de custo', aj.error);
  if (vg.error || !vg.data) throw new ErroCarregamento('deslocamentos', vg.error);
  const ajudas = (aj.data as unknown as Array<Record<string, unknown>>) ?? [];
  const viagens = (vg.data as unknown as Array<Record<string, unknown>>) ?? [];
  const acomp = await acompanhantesPorSolicitacao([...new Set([...ajudas, ...viagens].map((r) => r.solicitacao_id as string).filter(Boolean))]);

  const linhasAjuda: LinhaBpa[] = ajudas.map((r) => {
    const sol = r.solicitacoes as Pessoa | null;
    const pac = sol?.pacientes as Pessoa | null;
    const ehAcomp = String(r.tipo ?? '').toUpperCase() === 'ACOMPANHANTE';
    const a = ehAcomp ? acomp.get(r.solicitacao_id as string) ?? null : null;
    // Acompanhante doador conta como paciente para o SIGTAP/BPA.
    const beneficiario: Beneficiario = a?.doador ? 'paciente' : ehAcomp ? 'acompanhante' : 'paciente';
    const dias = Number(r.dias_elegiveis ?? 0);
    const com = resolveSigtapAjudaCusto({ beneficiario, comPernoite: true, cnrac: false });
    const sem = resolveSigtapAjudaCusto({ beneficiario, comPernoite: false, cnrac: false });
    return {
      chave: `a:${r.id}`,
      procedimento: 'ajuda_custo',
      origemId: String(r.id),
      solicitacaoId: String(r.solicitacao_id),
      processo: (sol?.numero_processo as string) ?? '',
      trecho: null,
      dataAtendimento: String(r.data_inicio ?? ''),
      ...pessoaBase(pac, a),
      beneficiario,
      cid: (sol?.cid10_principal as string) ?? null,
      codigoPernoite: dias > 0 ? com.codigo : undefined,
      descricaoPernoite: dias > 0 ? com.descricao : undefined,
      qtdPernoite: dias > 0 ? dias : undefined,
      codigoSemPernoite: sem.codigo,
      descricaoSemPernoite: sem.descricao,
      qtdSemPernoite: 1,
    };
  });

  const linhasDesloc: LinhaBpa[] = viagens.map((v) => {
    const sol = v.solicitacoes as Pessoa | null;
    const pac = sol?.pacientes as Pessoa | null;
    const m = String(v.modal ?? '').toLowerCase();
    const modal: Modal = m === 'aereo' ? 'aereo' : m === 'fluvial' ? 'fluvial' : 'terrestre';
    const ehAcomp = String(sol?.tipo_solicitacao ?? '').toUpperCase() === 'ACOMPANHANTE';
    const a = ehAcomp ? acomp.get(v.solicitacao_id as string) ?? null : null;
    const beneficiario: Beneficiario = a?.doador ? 'paciente' : ehAcomp ? 'acompanhante' : 'paciente';
    const sig = resolveSigtapPassagem({ beneficiario, modal, cnrac: false });
    const distancia = (v.distancia_valor as number | null) ?? null;
    const volta = ['RETORNO', 'VOLTA'].includes(String(v.tipo ?? '').toUpperCase());
    const trecho: 'ida' | 'volta' = volta ? 'volta' : 'ida';
    const o = `${v.origem_uf}/${v.origem_cidade}`;
    const d = `${v.destino_uf}/${v.destino_cidade}`;
    return {
      chave: `d:${v.id}:${trecho}`,
      procedimento: 'deslocamento',
      origemId: String(v.id),
      solicitacaoId: String(v.solicitacao_id),
      processo: (sol?.numero_processo as string) ?? '',
      trecho,
      dataAtendimento: String(v.data_embarque_prevista ?? ''),
      ...pessoaBase(pac, a),
      beneficiario,
      cid: (sol?.cid10_principal as string) ?? null,
      modal,
      rota: volta ? `${d} → ${o}` : `${o} → ${d}`,
      distancia,
      unidade: (v.distancia_unidade as string) ?? sig.unidadeLabel,
      divisor: sig.unidadeDivisor,
      codigo: sig.codigo,
      descricao: sig.descricao,
      quantidade: calcularQuantidadePassagem(distancia, sig.unidadeDivisor),
    };
  });

  return [...linhasAjuda, ...linhasDesloc];
}

/** Valor unitário de cada código SIGTAP presente nas linhas. */
export async function carregarValoresSigtap(linhas: LinhaBpa[]): Promise<Record<string, number>> {
  const codigos = [...new Set(linhas.flatMap((l) => [l.codigo, l.codigoPernoite, l.codigoSemPernoite]).filter((c): c is string => !!c))];
  if (codigos.length === 0) return {};
  const { data, error } = await createClient().from('sigtap_procedimentos').select('codigo, valor_unitario').in('codigo', codigos);
  if (error || !data) throw new ErroCarregamento('valores SIGTAP', error);
  return Object.fromEntries(((data as Array<Record<string, unknown>>) ?? []).map((s) => [s.codigo as string, Number(s.valor_unitario) || 0]));
}

export function valorBpa(l: LinhaBpa, sig: Record<string, number>): number {
  if (l.procedimento === 'ajuda_custo') {
    const com = l.codigoPernoite && l.qtdPernoite ? (sig[l.codigoPernoite] ?? 0) * l.qtdPernoite : 0;
    const sem = l.codigoSemPernoite && l.qtdSemPernoite ? (sig[l.codigoSemPernoite] ?? 0) * l.qtdSemPernoite : 0;
    return com + sem;
  }
  return l.codigo && l.quantidade != null ? (sig[l.codigo] ?? 0) * l.quantidade : 0;
}

/* ── Lançado no BPA (mesma marcação das telas antigas) ───────────────────── */

export async function carregarLancados(): Promise<Set<string>> {
  const { data, error } = await createClient().from('bpa_lancamentos').select('tipo, origem_id, trecho');
  if (error || !data) throw new ErroCarregamento('lançamentos do BPA', error);
  const s = new Set<string>();
  for (const l of (data as Array<Record<string, unknown>>) ?? []) {
    s.add(l.tipo === 'ajuda_custo' ? `a:${l.origem_id}` : `d:${l.origem_id}:${l.trecho ?? 'ida'}`);
  }
  return s;
}

export async function marcarLancado(l: LinhaBpa, lancado: boolean) {
  const sb = createClient();
  const tipo = l.procedimento === 'ajuda_custo' ? 'ajuda_custo' : 'passagem';
  if (lancado) {
    await (sb.from('bpa_lancamentos') as unknown as { insert: (v: Record<string, unknown>) => Promise<unknown> }).insert({ tipo, origem_id: l.origemId, trecho: l.trecho });
  } else {
    let q = sb.from('bpa_lancamentos').delete().eq('tipo', tipo).eq('origem_id', l.origemId);
    q = l.trecho ? q.eq('trecho', l.trecho) : q.is('trecho', null);
    await q;
  }
}

/** Mês de referência da linha (AAAA-MM). */
export const mesDaLinha = (iso: string) => iso.slice(0, 7);
