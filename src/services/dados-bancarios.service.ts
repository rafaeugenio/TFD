import { createClient } from '@/lib/supabase/client';
import type { InsertDTO, UpdateDTO } from '@/lib/supabase/database.types';

function getSupabase() {
  return createClient();
}

/**
 * Busca os dados bancários de um paciente. Retorna `null` em `data` quando o
 * paciente ainda não tem nenhum registro (campo opcional do cadastro).
 */
export async function buscarPorPaciente(pacienteId: string) {
  const supabase = getSupabase();
  return supabase
    .from('dados_bancarios')
    .select('*')
    .eq('paciente_id', pacienteId)
    .maybeSingle();
}

export async function criarDadosBancarios(data: InsertDTO<'dados_bancarios'>) {
  const supabase = getSupabase();
  return supabase.from('dados_bancarios').insert(data).select().single();
}

export async function atualizarDadosBancarios(
  id: string,
  data: UpdateDTO<'dados_bancarios'>,
) {
  const supabase = getSupabase();
  return supabase
    .from('dados_bancarios')
    .update(data)
    .eq('id', id)
    .select()
    .single();
}

export async function removerDadosBancarios(id: string) {
  const supabase = getSupabase();
  return supabase.from('dados_bancarios').delete().eq('id', id);
}

/**
 * Upsert por `paciente_id`: cria se não existir, atualiza se existir. Útil pra
 * fluxos onde o cadastro do paciente trata os dados bancários como um bloco
 * único (não enxerga o `id` do registro).
 */
export async function upsertPorPaciente(
  pacienteId: string,
  data: Omit<InsertDTO<'dados_bancarios'>, 'paciente_id' | 'id'>,
) {
  const existente = await buscarPorPaciente(pacienteId);
  if (existente.data) {
    return atualizarDadosBancarios(existente.data.id, data);
  }
  return criarDadosBancarios({ ...data, paciente_id: pacienteId });
}
