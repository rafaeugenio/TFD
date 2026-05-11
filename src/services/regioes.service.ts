import { createClient } from '@/lib/supabase/client';
import type { Regiao } from '@/core/models/regiao.model';

export type RegiaoInput = Pick<Regiao, 'nome'> & { ordem?: number };

function getSupabase() {
  return createClient();
}

/** Lista regiões ativas (para selects). */
export async function listarRegioes() {
  return getSupabase()
    .from('regioes')
    .select('*')
    .eq('ativo', true)
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true })
    .range(0, 49999);
}

/** Lista todas (admin, inclusive inativas). */
export async function listarRegioesAdmin() {
  return getSupabase()
    .from('regioes')
    .select('*')
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true })
    .range(0, 49999);
}

export async function criarRegiao(input: RegiaoInput) {
  return getSupabase()
    .from('regioes')
    .insert({ nome: input.nome, ordem: input.ordem ?? 0 })
    .select()
    .single();
}

export async function atualizarRegiao(id: string, input: Partial<RegiaoInput> & { ativo?: boolean }) {
  return getSupabase()
    .from('regioes')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
}

export async function excluirRegiao(id: string) {
  return getSupabase()
    .from('regioes')
    .delete()
    .eq('id', id);
}
