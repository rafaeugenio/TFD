import { createClient } from '@/lib/supabase/client';
import type { InsertDTO, UpdateDTO } from '@/lib/supabase/database.types';

function getSupabase() {
  return createClient();
}

export type TitularVinculo = 'PROPRIO' | 'PAI' | 'MAE' | 'CONJUGE' | 'RESPONSAVEL_LEGAL' | 'OUTRO';

export const TITULAR_VINCULO_LABEL: Record<TitularVinculo, string> = {
  PROPRIO: 'Próprio paciente',
  PAI: 'Pai',
  MAE: 'Mãe',
  CONJUGE: 'Cônjuge',
  RESPONSAVEL_LEGAL: 'Responsável legal',
  OUTRO: 'Outro',
};

/**
 * Busca dados bancários de uma solicitação (1:1 — restrição UNIQUE no banco).
 * Retorna `null` em `data` quando ainda não foi cadastrado.
 */
export async function buscarPorSolicitacao(solicitacaoId: string) {
  const supabase = getSupabase();
  return supabase
    .from('dados_bancarios')
    .select('*')
    .eq('solicitacao_id', solicitacaoId)
    .maybeSingle();
}

/**
 * Lista todos os dados bancários já cadastrados para um paciente
 * (1 por solicitação). Usado na tela do paciente como histórico read-only.
 */
export async function listarPorPaciente(pacienteId: string) {
  const supabase = getSupabase();
  return supabase
    .from('dados_bancarios')
    .select('*, solicitacoes(numero_processo, created_at)')
    .eq('paciente_id', pacienteId)
    .order('created_at', { ascending: false });
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
 * Upsert por `solicitacao_id`: cria se não existir, atualiza se existir.
 * Caminho principal do setor de Ajuda de Custo para cadastrar a conta de
 * recebimento de uma solicitação específica.
 */
export async function upsertPorSolicitacao(
  solicitacaoId: string,
  pacienteId: string,
  data: Omit<InsertDTO<'dados_bancarios'>, 'solicitacao_id' | 'paciente_id' | 'id'>,
) {
  const existente = await buscarPorSolicitacao(solicitacaoId);
  if (existente.data) {
    return atualizarDadosBancarios(existente.data.id, data);
  }
  return criarDadosBancarios({
    ...data,
    paciente_id: pacienteId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    solicitacao_id: solicitacaoId as any,
  });
}

/**
 * @deprecated Use `buscarPorSolicitacao`. Dados bancários agora são por
 * solicitação (a partir da migration 00053). Esta função retorna o registro
 * mais recente do paciente como compatibilidade temporária — não use em código
 * novo.
 */
export async function buscarPorPaciente(pacienteId: string) {
  const supabase = getSupabase();
  return supabase
    .from('dados_bancarios')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
}

/**
 * @deprecated Use `upsertPorSolicitacao`. Mantido temporariamente para o
 * drawer de cadastro de paciente, que ainda referencia. Sem efeito útil agora
 * que o vínculo principal é por solicitação — qualquer upsert daqui só
 * atualiza o registro mais recente do paciente.
 */
export async function upsertPorPaciente(
  pacienteId: string,
  data: Omit<InsertDTO<'dados_bancarios'>, 'paciente_id' | 'id'>,
) {
  const existente = await buscarPorPaciente(pacienteId);
  if (existente.data) {
    return atualizarDadosBancarios(existente.data.id, data);
  }
  // Sem solicitacao_id, o INSERT vai falhar (coluna NOT NULL). Retorna o erro
  // pra que o caller perceba que precisa migrar pra `upsertPorSolicitacao`.
  return criarDadosBancarios({ ...data, paciente_id: pacienteId });
}
