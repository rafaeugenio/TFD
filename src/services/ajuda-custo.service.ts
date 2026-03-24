import { createClient } from '@/lib/supabase/client';
import type { InsertDTO, StatusAjudaCusto } from '@/lib/supabase/database.types';

function getSupabase() {
  return createClient();
}

export async function listarAjudasCusto(filters?: {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = getSupabase();

  let query = supabase
    .from('ajudas_custo')
    .select(
      '*, solicitacoes(numero_processo, pacientes(nome_completo, cpf)), dados_bancarios(*)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'TODOS') {
    query = query.eq('status', filters.status as StatusAjudaCusto);
  }

  if (filters?.search) {
    query = query.or(
      `solicitacoes.numero_processo.ilike.%${filters.search}%`,
    );
  }

  const page = filters?.page ?? 1;
  const size = filters?.pageSize ?? 10;
  query = query.range((page - 1) * size, page * size - 1);

  return query;
}

export async function buscarAjudaCusto(id: string) {
  const supabase = getSupabase();
  return supabase
    .from('ajudas_custo')
    .select(
      '*, solicitacoes(numero_processo, pacientes(*)), dados_bancarios(*)',
    )
    .eq('id', id)
    .single();
}

export async function criarAjudaCusto(data: InsertDTO<'ajudas_custo'>) {
  const supabase = getSupabase();
  return supabase.from('ajudas_custo').insert(data).select().single();
}

export async function aprovarAjudaCusto(id: string, aprovadoPor: string) {
  const supabase = getSupabase();
  return supabase
    .from('ajudas_custo')
    .update({
      status: 'APROVADA',
      aprovado_por: aprovadoPor,
      aprovado_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
}

export async function pagarAjudaCusto(id: string, pagoPor: string) {
  const supabase = getSupabase();
  return supabase
    .from('ajudas_custo')
    .update({
      status: 'CONCLUIDA',
      pago_por: pagoPor,
      pago_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
}

export async function glosarAjudaCusto(id: string, observacoes: string) {
  const supabase = getSupabase();
  return supabase
    .from('ajudas_custo')
    .update({
      status: 'GLOSADA',
      observacoes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
}
