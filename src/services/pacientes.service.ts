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
  return supabase.from('pacientes').select('*, acompanhantes(*)').eq('id', id).single();
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
  // Inclui:
  //  - origem_laudo_unidade: unidade que emitiu o laudo (FK na solicitação)
  //  - agendamentos.unidade_destino: unidade onde o paciente foi agendado
  // Cada uma rende uma tag de tipo de vínculo no card da solicitação.
  return supabase
    .from('solicitacoes')
    .select(
      '*, viagens(*), ajudas_custo(*), ' +
      'origem_laudo_unidade:unidades_destino!solicitacoes_origem_laudo_unidade_id_fkey(id, nome, cnes), ' +
      'agendamentos(id, unidade_destino_id, unidades_destino!agendamentos_unidade_destino_id_fkey(id, nome, cnes))',
    )
    .eq('paciente_id', pacienteId)
    .order('created_at', { ascending: false });
}

/**
 * Busca solicitações com dados completos para consulta pública (sem dados sensíveis de usuários internos).
 */
export async function historicoProcessosCompleto(pacienteId: string) {
  const supabase = getSupabase();
  return supabase
    .from('solicitacoes')
    .select(
      '*, pareceres(id, decisao, observacoes_medicas, created_at), rotas_regulacao(id, tipo_rota, justificativa, created_at), agendamentos(id, unidade_executante, cidade_destino, uf_destino, data_hora_agendamento, status, tipo_atendimento), viagens(id, tipo, origem_cidade, origem_uf, destino_cidade, destino_uf, data_embarque_prevista, situacao, companhia), ajudas_custo(id, valor_diaria, data_inicio, data_fim, status), permanencias(id, data_comunicacao, motivo, nova_data_retorno_prevista, prorrogacoes(id, dias_adicionais_solicitados, nova_data_retorno, decisao)), encerramentos(id, motivo, data_encerramento, observacoes, created_at)',
    )
    .eq('paciente_id', pacienteId)
    .order('created_at', { ascending: false });
}
