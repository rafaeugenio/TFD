import { createClient } from '@/lib/supabase/client';
import type { InsertDTO } from '@/lib/supabase/database.types';

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
      '*, solicitacoes(numero_processo, pacientes(nome_completo))',
      { count: 'exact' },
    )
    .order('registrado_em', { ascending: false });

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
