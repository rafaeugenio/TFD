import { createClient } from '@/lib/supabase/client';
import type { Medico } from '@/core/models';

function getSupabase() {
  return createClient();
}

/** Lista médicos ativos com busca opcional por nome ou CRM */
export async function listarMedicos(filters?: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  let query = getSupabase()
    .from('medicos')
    .select('*', { count: 'exact' })
    .eq('ativo', true)
    .order('nome_completo', { ascending: true });

  if (filters?.search) {
    query = query.or(
      `nome_completo.ilike.%${filters.search}%,crm.ilike.%${filters.search}%`,
    );
  }

  const page = filters?.page ?? 1;
  const size = filters?.pageSize ?? 20;
  query = query.range((page - 1) * size, page * size - 1);

  return query;
}

/** Lista todos (admin, inclusive inativos) */
export async function listarMedicosAdmin(filters?: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  let query = getSupabase()
    .from('medicos')
    .select('*', { count: 'exact' })
    .order('nome_completo', { ascending: true });

  if (filters?.search) {
    query = query.or(
      `nome_completo.ilike.%${filters.search}%,crm.ilike.%${filters.search}%`,
    );
  }

  if (filters?.page && filters?.pageSize) {
    const page = filters.page;
    const size = filters.pageSize;
    query = query.range((page - 1) * size, page * size - 1);
  }

  return query;
}

/** Busca médico por ID */
export async function buscarMedico(id: string) {
  return getSupabase()
    .from('medicos')
    .select('*')
    .eq('id', id)
    .single();
}

/** Busca médico por CRM + UF */
export async function buscarPorCrm(crm: string, crm_uf: string) {
  return getSupabase()
    .from('medicos')
    .select('*')
    .eq('crm', crm)
    .eq('crm_uf', crm_uf)
    .maybeSingle();
}

/** Cria novo médico */
export async function criarMedico(data: Omit<Medico, 'id' | 'ativo'>) {
  return getSupabase()
    .from('medicos')
    .insert(data)
    .select()
    .single();
}

/** Atualiza médico */
export async function atualizarMedico(id: string, data: Partial<Medico>) {
  return getSupabase()
    .from('medicos')
    .update(data)
    .eq('id', id)
    .select()
    .single();
}

/** Desativa médico (soft delete) */
export async function desativarMedico(id: string) {
  return getSupabase()
    .from('medicos')
    .update({ ativo: false })
    .eq('id', id)
    .select()
    .single();
}
