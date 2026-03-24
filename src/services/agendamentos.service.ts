import { createClient } from '@/lib/supabase/client';
import type { InsertDTO, StatusAgendamento } from '@/lib/supabase/database.types';

function getSupabase() {
  return createClient();
}

export async function listarAgendamentos(filters?: {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = getSupabase();

  let query = supabase
    .from('agendamentos')
    .select(
      '*, solicitacoes(numero_processo, pacientes(nome_completo))',
      { count: 'exact' },
    )
    .order('data_hora_agendamento', { ascending: true });

  if (filters?.status && filters.status !== 'TODOS') {
    query = query.eq('status', filters.status as StatusAgendamento);
  }

  if (filters?.search) {
    query = query.or(
      `unidade_executante.ilike.%${filters.search}%,cidade_destino.ilike.%${filters.search}%,numero_cnrac.ilike.%${filters.search}%`,
    );
  }

  const page = filters?.page ?? 1;
  const size = filters?.pageSize ?? 10;
  query = query.range((page - 1) * size, page * size - 1);

  return query;
}

export async function criarAgendamento(data: InsertDTO<'agendamentos'>) {
  const supabase = getSupabase();
  return supabase.from('agendamentos').insert(data).select().single();
}

export async function confirmarAgendamento(
  id: string,
  confirmadoPor: string,
) {
  const supabase = getSupabase();
  return supabase
    .from('agendamentos')
    .update({
      status: 'CONFIRMADO',
      confirmed_at: new Date().toISOString(),
      confirmed_by: confirmadoPor,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
}
