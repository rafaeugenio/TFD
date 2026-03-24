import { createClient } from '@/lib/supabase/client';
import type { InsertDTO, UpdateDTO } from '@/lib/supabase/database.types';

function getSupabase() {
  return createClient();
}

export async function listarPacientes(filters?: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = getSupabase();

  let query = supabase
    .from('pacientes')
    .select('*', { count: 'exact' })
    .eq('ativo', true)
    .order('nome_completo', { ascending: true });

  if (filters?.search) {
    query = query.or(
      `nome_completo.ilike.%${filters.search}%,cpf.ilike.%${filters.search}%,cns.ilike.%${filters.search}%`,
    );
  }

  const page = filters?.page ?? 1;
  const size = filters?.pageSize ?? 10;
  query = query.range((page - 1) * size, page * size - 1);

  return query;
}

export async function buscarPaciente(id: string) {
  const supabase = getSupabase();
  return supabase.from('pacientes').select('*').eq('id', id).single();
}

export async function buscarPorCpf(cpf: string) {
  const supabase = getSupabase();
  return supabase.from('pacientes').select('*').eq('cpf', cpf).maybeSingle();
}

export async function buscarPorCns(cns: string) {
  const supabase = getSupabase();
  return supabase.from('pacientes').select('*').eq('cns', cns).maybeSingle();
}

export async function criarPaciente(data: InsertDTO<'pacientes'>) {
  const supabase = getSupabase();
  return supabase.from('pacientes').insert(data).select().single();
}

export async function atualizarPaciente(
  id: string,
  data: UpdateDTO<'pacientes'>,
) {
  const supabase = getSupabase();
  return supabase
    .from('pacientes')
    .update(data)
    .eq('id', id)
    .select()
    .single();
}

export async function historicoProcessos(pacienteId: string) {
  const supabase = getSupabase();
  return supabase
    .from('solicitacoes')
    .select('*, viagens(*), ajudas_custo(*)')
    .eq('paciente_id', pacienteId)
    .order('created_at', { ascending: false });
}
