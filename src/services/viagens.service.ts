import { createClient } from '@/lib/supabase/client';
import type { InsertDTO, SituacaoViagem } from '@/lib/supabase/database.types';

function getSupabase() {
  return createClient();
}

export async function listarViagens(filters?: {
  situacao?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = getSupabase();

  let query = supabase
    .from('viagens')
    .select('*, solicitacoes(numero_processo, pacientes(nome_completo))', {
      count: 'exact',
    })
    .order('created_at', { ascending: false });

  if (filters?.situacao && filters.situacao !== 'TODOS') {
    query = query.eq('situacao', filters.situacao as SituacaoViagem);
  }

  if (filters?.search) {
    query = query.or(
      `numero_bilhete.ilike.%${filters.search}%,origem_cidade.ilike.%${filters.search}%,destino_cidade.ilike.%${filters.search}%`,
    );
  }

  const page = filters?.page ?? 1;
  const size = filters?.pageSize ?? 10;
  query = query.range((page - 1) * size, page * size - 1);

  return query;
}

export async function buscarViagem(id: string) {
  const supabase = getSupabase();
  return supabase
    .from('viagens')
    .select('*, solicitacoes(numero_processo, pacientes(*)), remarcacoes(*)')
    .eq('id', id)
    .single();
}

export async function criarViagem(data: InsertDTO<'viagens'>) {
  const supabase = getSupabase();
  return supabase.from('viagens').insert(data).select().single();
}

export async function confirmarEmbarque(id: string, registradoPor: string) {
  const supabase = getSupabase();
  return supabase
    .from('viagens')
    .update({
      situacao: 'UTILIZADA',
      embarcou: true,
      embarcou_registrado_por: registradoPor,
      embarcou_registrado_em: new Date().toISOString(),
      data_embarque_real: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
}

export async function registrarNoShow(id: string, registradoPor: string) {
  const supabase = getSupabase();
  return supabase
    .from('viagens')
    .update({
      situacao: 'NO_SHOW',
      embarcou: false,
      embarcou_registrado_por: registradoPor,
      embarcou_registrado_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
}

export async function cancelarViagem(id: string) {
  const supabase = getSupabase();
  return supabase
    .from('viagens')
    .update({
      situacao: 'CANCELADA',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
}

export async function criarRemarcacao(data: InsertDTO<'remarcacoes'>) {
  const supabase = getSupabase();
  return supabase.from('remarcacoes').insert(data).select().single();
}
