import { createClient } from '@/lib/supabase/client';
import type { Cid10 } from '@/core/models/cid10.model';

export type Cid10Input = Pick<Cid10, 'codigo' | 'descricao'>;

export interface ListarCid10Params {
  /** 1-based. */
  page?: number;
  pageSize?: number;
  /** Termo livre — buscado em codigo e descricao via ilike. */
  search?: string;
  /** Filtra pela primeira letra do código (capítulo). Ex.: 'C' para Oncologia. */
  capituloPrefix?: string;
}

export interface ListarCid10Result {
  data: Cid10[];
  count: number;
}

function getSupabase() {
  return createClient();
}

/** Busca CID-10 por código ou descrição (autocomplete, max 20). */
export async function buscarCid10(query: string) {
  const termo = `%${query}%`;
  return getSupabase()
    .from('cid10')
    .select('*')
    .or(`codigo.ilike.${termo},descricao.ilike.${termo}`)
    .order('codigo', { ascending: true })
    .limit(20);
}

/** Busca um CID-10 específico por código exato. */
export async function buscarCid10PorCodigo(codigo: string) {
  return getSupabase()
    .from('cid10')
    .select('*')
    .eq('codigo', codigo)
    .maybeSingle();
}

/** Lista CID-10 paginado no servidor. Retorna { data, count }. */
export async function listarCid10(params: ListarCid10Params = {}): Promise<ListarCid10Result> {
  const { page = 1, pageSize = 50, search, capituloPrefix } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = getSupabase()
    .from('cid10')
    .select('*', { count: 'exact' })
    .order('codigo', { ascending: true })
    .range(from, to);

  if (search) {
    const termo = `%${search}%`;
    q = q.or(`codigo.ilike.${termo},descricao.ilike.${termo}`);
  }
  if (capituloPrefix) {
    // Filtra códigos que começam com a letra (ex: C50.1 → começa com 'C')
    q = q.ilike('codigo', `${capituloPrefix}%`);
  }

  const { data, count, error } = await q;
  if (error) throw error;
  return { data: (data ?? []) as Cid10[], count: count ?? 0 };
}

/** Cria um novo CID-10. */
export async function criarCid10(input: Cid10Input) {
  return getSupabase()
    .from('cid10')
    .insert({ codigo: input.codigo, descricao: input.descricao })
    .select()
    .single();
}

/** Atualiza um CID-10 existente. */
export async function atualizarCid10(id: number, input: Cid10Input) {
  return getSupabase()
    .from('cid10')
    .update({ codigo: input.codigo, descricao: input.descricao })
    .eq('id', id)
    .select()
    .single();
}

/** Exclui (hard delete) um CID-10. */
export async function excluirCid10(id: number) {
  return getSupabase()
    .from('cid10')
    .delete()
    .eq('id', id);
}
