import { createClient } from '@/lib/supabase/client';
import type { UnidadeSaude } from '@/core/models';

function getSupabase() {
  return createClient();
}

/** Lista unidades ativas com busca por nome ou CNES */
export async function listarUnidadesSaude(filters?: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  let query = getSupabase()
    .from('unidades_destino')
    .select('*, tabelas_auxiliares!regional_id(nome)', { count: 'exact' })
    .eq('ativo', true)
    .order('nome', { ascending: true });

  if (filters?.search) {
    query = query.or(
      `nome.ilike.%${filters.search}%,cnes.ilike.%${filters.search}%`,
    );
  }

  const page = filters?.page ?? 1;
  const size = filters?.pageSize ?? 10;
  query = query.range((page - 1) * size, page * size - 1);

  return query;
}

/** Lista todas (admin, inclusive inativas) */
export async function listarUnidadesSaudeAdmin(filters?: { search?: string }) {
  let query = getSupabase()
    .from('unidades_destino')
    .select('*, tabelas_auxiliares!regional_id(nome)', { count: 'exact' })
    .order('nome', { ascending: true });

  if (filters?.search) {
    query = query.or(
      `nome.ilike.%${filters.search}%,cnes.ilike.%${filters.search}%`,
    );
  }

  return query;
}

/** Busca unidade por ID */
export async function buscarUnidadeSaude(id: string) {
  return getSupabase()
    .from('unidades_destino')
    .select('*, tabelas_auxiliares!regional_id(nome)')
    .eq('id', id)
    .single();
}

/** Busca por CNES (validacao de unicidade) */
export async function buscarPorCnes(cnes: string) {
  return getSupabase()
    .from('unidades_destino')
    .select('*')
    .eq('cnes', cnes)
    .maybeSingle();
}

/** Cria nova unidade */
export async function criarUnidadeSaude(data: Omit<UnidadeSaude, 'id' | 'ativo' | 'created_at' | 'updated_at'>) {
  return getSupabase()
    .from('unidades_destino')
    .insert(data)
    .select()
    .single();
}

/** Atualiza unidade */
export async function atualizarUnidadeSaude(id: string, data: Partial<UnidadeSaude>) {
  return getSupabase()
    .from('unidades_destino')
    .update(data)
    .eq('id', id)
    .select()
    .single();
}

/** Desativa unidade (soft delete) */
export async function desativarUnidadeSaude(id: string) {
  return getSupabase()
    .from('unidades_destino')
    .update({ ativo: false })
    .eq('id', id)
    .select()
    .single();
}

/** Lista solicitacoes vinculadas a uma unidade via agendamentos */
export async function listarSolicitacoesPorUnidade(unidadeId: string) {
  return getSupabase()
    .from('agendamentos')
    .select('solicitacao_id, solicitacoes(*, pacientes(nome_completo))')
    .eq('unidade_destino_id', unidadeId)
    .order('created_at', { ascending: false });
}
