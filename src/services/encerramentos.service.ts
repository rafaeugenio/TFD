import { createClient } from '@/lib/supabase/client';
import type { InsertDTO, UpdateDTO } from '@/lib/supabase/database.types';

function getSupabase() {
  return createClient();
}

export async function listarEncerramentos(filters?: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = getSupabase();

  let query = supabase
    .from('encerramentos')
    .select(
      '*, solicitacoes(numero_processo, status, pacientes(nome_completo))',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false });

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

/**
 * Lists ALL active solicitações that don't have an encerramento yet.
 * Any process can be closed at any stage (óbito, abandono, desistência, etc.)
 * Excludes CONCLUIDO, INDEFERIDO, CANCELADO.
 */
export async function listarSolicitacoesParaEncerramento() {
  const supabase = getSupabase();
  const { data: solicitacoes, error } = await supabase
    .from('solicitacoes')
    .select('id, numero_processo, status, created_at, pacientes(nome_completo)')
    .not('status', 'in', '("CONCLUIDO","INDEFERIDO","CANCELADO")')
    .order('created_at', { ascending: true });
  if (error || !solicitacoes) return { data: [], error };
  const { data: existentes } = await supabase.from('encerramentos').select('solicitacao_id');
  const ids = new Set((existentes ?? []).map((e: any) => e.solicitacao_id));
  return { data: solicitacoes.filter((s: any) => !ids.has(s.id)), error: null };
}

export async function atualizarEncerramento(id: string, data: UpdateDTO<'encerramentos'>) {
  const supabase = getSupabase();
  return supabase.from('encerramentos').update(data).eq('id', id).select().single();
}

export async function excluirEncerramento(id: string) {
  const supabase = getSupabase();
  return supabase.from('encerramentos').delete().eq('id', id);
}

export async function criarEncerramento(data: InsertDTO<'encerramentos'>) {
  const supabase = getSupabase();

  // Insert the closure record
  const result = await supabase
    .from('encerramentos')
    .insert(data)
    .select()
    .single();

  if (result.error) return result;

  // Update the parent solicitacao to CONCLUIDO
  await supabase
    .from('solicitacoes')
    .update({
      status: 'CONCLUIDO',
      data_encerramento: data.data_encerramento,
      motivo_encerramento: data.motivo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', data.solicitacao_id);

  return result;
}
