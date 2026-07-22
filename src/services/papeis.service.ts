import { createClient } from '@/lib/supabase/client';

function getSupabase() {
  return createClient();
}

export interface Papel {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  created_at: string;
  updated_at: string;
  usuario_count?: number;
}

export interface AcaoCatalogo {
  acao: string;
  nome_humano: string;
  descricao: string | null;
  ordem: number;
}

export interface TelaSistema {
  id: string;
  nome: string;
  modulo: string;
  rota: string;
  ordem: number;
  /** Ações disponíveis para essa tela, vindas de acoes_catalogo. */
  acoes: AcaoCatalogo[];
}

export async function listarPapeis() {
  return getSupabase()
    .from('papeis')
    .select('*')
    .order('nome');
}

export async function buscarPapel(id: string) {
  return getSupabase()
    .from('papeis')
    .select('*')
    .eq('id', id)
    .single();
}

export async function criarPapel(data: { nome: string; descricao?: string; cor?: string }) {
  return getSupabase()
    .from('papeis')
    .insert(data)
    .select()
    .single();
}

export async function atualizarPapel(id: string, data: { nome?: string; descricao?: string; cor?: string }) {
  return getSupabase()
    .from('papeis')
    .update(data)
    .eq('id', id)
    .select()
    .single();
}

export async function excluirPapel(id: string) {
  return getSupabase().from('papeis').delete().eq('id', id);
}

export interface TelaMenu {
  id: string;
  nome: string;
  modulo: string;
  rota: string;
  ordem: number;
}

export async function listarTelas() {
  return getSupabase()
    .from('telas_sistema')
    .select('id, nome, modulo, rota, ordem')
    .order('modulo')
    .order('ordem') as unknown as Promise<{ data: TelaMenu[] | null; error: unknown }>;
}

/**
 * Carrega todas as telas com suas ações disponíveis populadas a partir de
 * acoes_catalogo. Esta é a função que a tela /sistema/papeis deve usar.
 */
export async function listarTelasComAcoes(): Promise<{ data: TelaSistema[]; error: unknown }> {
  const supabase = getSupabase();
  const [telasRes, acoesRes] = await Promise.all([
    supabase.from('telas_sistema').select('*').order('modulo').order('ordem'),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any).from('acoes_catalogo').select('tela_id, acao, nome_humano, descricao, ordem').order('ordem'),
  ]);

  if (telasRes.error) return { data: [], error: telasRes.error };

  const acoesByTela: Record<string, AcaoCatalogo[]> = {};
  const acoesRows =
    (acoesRes.data as unknown as Array<{
      tela_id: string;
      acao: string;
      nome_humano: string;
      descricao: string | null;
      ordem: number;
    }>) ?? [];
  for (const a of acoesRows) {
    if (!acoesByTela[a.tela_id]) acoesByTela[a.tela_id] = [];
    acoesByTela[a.tela_id].push({
      acao: a.acao,
      nome_humano: a.nome_humano,
      descricao: a.descricao,
      ordem: a.ordem,
    });
  }

  const telas =
    ((telasRes.data as unknown as Array<{
      id: string;
      nome: string;
      modulo: string;
      rota: string;
      ordem: number;
    }>) ?? []).map((t) => ({ ...t, acoes: acoesByTela[t.id] ?? [] }));

  return { data: telas, error: null };
}

/** Retorna todas as linhas (tela_id, acao) atribuídas a um papel. */
export async function listarTelasDoPapel(papelId: string) {
  return getSupabase()
    .from('papel_tela_acoes')
    .select('tela_id, acao')
    .eq('papel_id', papelId);
}

/** Salva as permissões de um papel, substituindo completamente as anteriores. */
export async function salvarTelasDoPapel(
  papelId: string,
  telaAcoes: { tela_id: string; acao: string }[],
) {
  const supabase = getSupabase();
  await supabase.from('papel_tela_acoes').delete().eq('papel_id', papelId);
  if (telaAcoes.length > 0) {
    const rows = telaAcoes.map(({ tela_id, acao }) => ({ papel_id: papelId, tela_id, acao }));
    return supabase.from('papel_tela_acoes').insert(rows);
  }
  return { data: null, error: null };
}

/* -------------------------------------------------- */
/*  Permissões — modelo simplificado (PBI 13230)       */
/* -------------------------------------------------- */

export interface Permissao {
  id: string;
  familia: 'tela' | 'item' | 'acao';
  nome: string;
  descricao: string | null;
  grupo: string | null;
  ordem: number;
  /** Tela dona da permissão, usada para agrupar por tela na tela de Permissões. */
  tela_id: string | null;
  /** Ordem de exibição da permissão dentro da tela dona. */
  ordem_tela: number;
  /** Rótulo curto da pill (ex.: "Visualizar", "Criar", "Encerrar"). */
  rotulo_curto: string | null;
  /** Outras telas onde esta mesma permissão também vale (permissão é única e global). */
  tambem_em: string[];
}

/**
 * Lista o catálogo de permissões do modelo simplificado, agrupável por tela
 * dona (`tela_id`) e módulo (via `telas_sistema.modulo`). Ver migrations
 * `00068_pbi13230_permissoes_simplificadas.sql`,
 * `00069_pbi13230_permissoes_por_tela.sql` e
 * `00070_pbi13230_rotulos_curtos.sql`.
 */
export async function listarPermissoes(): Promise<{ data: Permissao[]; error: unknown }> {
  const supabase = getSupabase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const res = await (supabase as any)
    .from('permissoes')
    .select('id, familia, nome, descricao, grupo, ordem, tela_id, ordem_tela, rotulo_curto, tambem_em')
    .order('ordem_tela');
  return { data: (res.data as Permissao[]) ?? [], error: res.error };
}

/** Retorna os IDs de permissão atribuídos a um papel. */
export async function listarPermissoesDoPapel(papelId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (getSupabase() as any)
    .from('papel_permissoes')
    .select('permissao_id')
    .eq('papel_id', papelId);
}

/** Retorna todos os vínculos papel_id → permissao_id, para contagens em lote na listagem. */
export async function listarTodosPapelPermissoes() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (getSupabase() as any)
    .from('papel_permissoes')
    .select('papel_id, permissao_id');
}

/** Salva as permissões de um papel, substituindo completamente as anteriores. */
export async function salvarPermissoesDoPapel(papelId: string, permissaoIds: string[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = getSupabase() as any;
  await sb.from('papel_permissoes').delete().eq('papel_id', papelId);
  if (permissaoIds.length > 0) {
    const rows = permissaoIds.map((permissao_id) => ({ papel_id: papelId, permissao_id }));
    return sb.from('papel_permissoes').insert(rows);
  }
  return { data: null, error: null };
}

export async function contarUsuariosPorPapel() {
  return getSupabase()
    .from('usuarios')
    .select('papel_id')
    .not('papel_id', 'is', null);
}

// Convites
export async function buscarCodigoAtivo() {
  return getSupabase()
    .from('codigos_convite')
    .select('*')
    .eq('ativo', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
}

export async function regenerarCodigo() {
  const supabase = getSupabase();
  await supabase.from('codigos_convite').update({ ativo: false }).eq('ativo', true);
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const part = (len: number) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const codigo = `${part(6)}-${part(6)}`;
  return supabase.from('codigos_convite').insert({ codigo, ativo: true }).select().single();
}
