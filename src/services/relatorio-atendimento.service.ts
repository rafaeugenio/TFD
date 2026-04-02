import { createClient } from '@/lib/supabase/client';

function getSupabase() {
  return createClient();
}

export async function listarRelatoriosAtendimento(filters?: {
  solicitacaoId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = getSupabase();

  let query = supabase
    .from('relatorios_atendimento')
    .select(
      '*, solicitacoes(numero_processo, status, pacientes(nome_completo, cns))',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false });

  if (filters?.solicitacaoId) {
    query = query.eq('solicitacao_id', filters.solicitacaoId);
  }

  if (filters?.search) {
    query = query.or(
      `hospital_atendimento.ilike.%${filters.search}%,solicitacoes.numero_processo.ilike.%${filters.search}%`,
    );
  }

  const page = filters?.page ?? 1;
  const size = filters?.pageSize ?? 10;
  query = query.range((page - 1) * size, page * size - 1);

  return query;
}

export async function buscarRelatorioAtendimento(id: string) {
  const supabase = getSupabase();
  return supabase
    .from('relatorios_atendimento')
    .select(
      '*, solicitacoes(numero_processo, pacientes(nome_completo, cns))',
    )
    .eq('id', id)
    .single();
}

export async function criarRelatorioAtendimento(data: Record<string, unknown>) {
  const supabase = getSupabase();
  return supabase
    .from('relatorios_atendimento')
    .insert(data)
    .select()
    .single();
}

export async function atualizarRelatorioAtendimento(id: string, data: Record<string, unknown>) {
  const supabase = getSupabase();
  return supabase
    .from('relatorios_atendimento')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
}

export async function excluirRelatorioAtendimento(id: string) {
  const supabase = getSupabase();
  return supabase
    .from('relatorios_atendimento')
    .delete()
    .eq('id', id);
}

export async function concluirRelatorioAtendimento(id: string) {
  const supabase = getSupabase();
  return supabase
    .from('relatorios_atendimento')
    .update({
      status: 'CONCLUIDO',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
}
