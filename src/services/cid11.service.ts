import { createClient } from '@/lib/supabase/client';
import type { Cid11 } from '@/core/models/cid11.model';

export type Cid11Input = Pick<Cid11, 'codigo' | 'descricao'>;

export interface ListarCid11Params {
  page?: number;
  pageSize?: number;
  search?: string;
}

export interface ListarCid11Result {
  data: Cid11[];
  count: number;
}

function getSupabase() {
  return createClient();
}

/** Busca CID-11 por código ou descrição (autocomplete, max 20). */
export async function buscarCid11(query: string) {
  const termo = `%${query}%`;
  return getSupabase()
    .from('cid11')
    .select('*')
    .or(`codigo.ilike.${termo},descricao.ilike.${termo}`)
    .order('codigo', { ascending: true })
    .limit(20);
}

/** Busca um CID-11 específico por código exato. */
export async function buscarCid11PorCodigo(codigo: string) {
  return getSupabase()
    .from('cid11')
    .select('*')
    .eq('codigo', codigo)
    .maybeSingle();
}

/** Lista CID-11 paginado no servidor. Retorna { data, count }. */
export async function listarCid11(params: ListarCid11Params = {}): Promise<ListarCid11Result> {
  const { page = 1, pageSize = 50, search } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let q = getSupabase()
    .from('cid11')
    .select('*', { count: 'exact' })
    .order('codigo', { ascending: true })
    .range(from, to);

  if (search) {
    const termo = `%${search}%`;
    q = q.or(`codigo.ilike.${termo},descricao.ilike.${termo}`);
  }

  const { data, count, error } = await q;
  if (error) throw error;
  return { data: (data ?? []) as Cid11[], count: count ?? 0 };
}

/** Cria um novo CID-11. */
export async function criarCid11(input: Cid11Input) {
  return getSupabase()
    .from('cid11')
    .insert({ codigo: input.codigo, descricao: input.descricao })
    .select()
    .single();
}

/** Atualiza um CID-11 existente. */
export async function atualizarCid11(id: number, input: Cid11Input) {
  return getSupabase()
    .from('cid11')
    .update({ codigo: input.codigo, descricao: input.descricao })
    .eq('id', id)
    .select()
    .single();
}

/** Exclui (hard delete) um CID-11. */
export async function excluirCid11(id: number) {
  return getSupabase()
    .from('cid11')
    .delete()
    .eq('id', id);
}
