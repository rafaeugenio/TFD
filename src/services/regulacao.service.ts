import { createClient } from '@/lib/supabase/client';
import type { InsertDTO, StatusSolicitacao } from '@/lib/supabase/database.types';
import { buscarDevolucaoAtiva, resolverDevolucao } from './devolucoes.service';

function getSupabase() {
  return createClient();
}

/** All routing decisions now advance directly to agendamento. */
const ROTA_STATUS_MAP: Record<string, string> = {
  APROVADO_DIRETO: 'AGUARDANDO_AGENDAMENTO',
  CNRAC: 'AGUARDANDO_AGENDAMENTO',
  SETI: 'AGUARDANDO_AGENDAMENTO',
  RESPOSTA_EXTERNA: 'AGUARDANDO_AGENDAMENTO',
  SERVICO_SOCIAL: 'AGUARDANDO_AGENDAMENTO',
};

export async function listarFilaRegulacao(filters?: {
  categoria?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = getSupabase();

  let query = supabase
    .from('solicitacoes')
    .select('*, pacientes(nome_completo, cpf)', { count: 'exact' })
    .eq('status', 'AGUARDANDO_REGULACAO')
    .order('prioridade', { ascending: true })
    .order('created_at', { ascending: true });

  if (filters?.categoria && filters.categoria !== 'TODOS') {
    query = query.eq('status', filters.categoria as StatusSolicitacao);
  }

  if (filters?.search) {
    query = query.or(
      `numero_processo.ilike.%${filters.search}%,pacientes.nome_completo.ilike.%${filters.search}%`,
    );
  }

  const page = filters?.page ?? 1;
  const size = filters?.pageSize ?? 20;
  query = query.range((page - 1) * size, page * size - 1);

  return query;
}

export async function criarRotaRegulacao(
  data: InsertDTO<'rotas_regulacao'>,
) {
  const supabase = getSupabase();

  // Insert the routing decision
  const rotaResult = await supabase
    .from('rotas_regulacao')
    .insert(data)
    .select()
    .single();

  if (rotaResult.error) return rotaResult;

  // Verificar se existe devolução ativa para REGULACAO
  const devolucao = await buscarDevolucaoAtiva(data.solicitacao_id, 'REGULACAO');

  let novoStatus: StatusSolicitacao;
  if (devolucao.data) {
    // Retorno direto: volta ao status do setor que originou a devolução
    novoStatus = devolucao.data.status_retorno as StatusSolicitacao;
    await resolverDevolucao(
      devolucao.data.id,
      `Rota de regulação definida (${data.tipo_rota}). Retorno direto ao setor de origem.`,
    );
  } else {
    // Fluxo normal
    novoStatus = (ROTA_STATUS_MAP[data.tipo_rota] as StatusSolicitacao) ?? 'AGUARDANDO_AGENDAMENTO';
  }

  await supabase
    .from('solicitacoes')
    .update({
      status: novoStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', data.solicitacao_id);

  return rotaResult;
}

export async function buscarUltimaRota(solicitacaoId: string) {
  const supabase = getSupabase();
  return supabase
    .from('rotas_regulacao')
    .select('id')
    .eq('solicitacao_id', solicitacaoId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function criarCobrancaExterna(
  data: InsertDTO<'cobrancas_externas'>,
) {
  const supabase = getSupabase();
  return supabase.from('cobrancas_externas').insert(data).select().single();
}

export async function registrarRespostaCobranca(
  id: string,
  resposta: { conteudo_resposta: string },
) {
  const supabase = getSupabase();
  return supabase
    .from('cobrancas_externas')
    .update({
      data_resposta: new Date().toISOString(),
      conteudo_resposta: resposta.conteudo_resposta,
      status_cobranca: 'RESPONDIDA',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
}

export async function criarValidacaoRPB(
  data: InsertDTO<'validacoes_rpb'>,
) {
  const supabase = getSupabase();
  return supabase.from('validacoes_rpb').insert(data).select().single();
}

/**
 * Confirma a conclusão de uma etapa externa (CNRAC, SETI, Serviço Social, etc.)
 * e avança a solicitação para AGUARDANDO_AGENDAMENTO.
 *
 * O usuário retorna ao sistema, informa que o processo externo foi concluído
 * e anexa documentos comprobatórios (feitos via uploadDocumento separadamente).
 */
export async function confirmarRetornoExterno(
  solicitacaoId: string,
  observacoes: string,
) {
  const supabase = getSupabase();

  // Atualizar a rota com a confirmação (usa campo lembrete para registrar observações de retorno)
  const ultimaRota = await buscarUltimaRota(solicitacaoId);
  if (ultimaRota.data) {
    await supabase
      .from('rotas_regulacao')
      .update({
        lembrete: observacoes,
        status_espera: 'CONCLUIDO',
      } as any)
      .eq('id', ultimaRota.data.id);
  }

  // Avançar a solicitação para agendamento
  return supabase
    .from('solicitacoes')
    .update({
      status: 'AGUARDANDO_AGENDAMENTO' as StatusSolicitacao,
      updated_at: new Date().toISOString(),
    })
    .eq('id', solicitacaoId)
    .select()
    .single();
}
