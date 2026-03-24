import { createClient } from '@/lib/supabase/client';
import type { InsertDTO, StatusSolicitacao } from '@/lib/supabase/database.types';

function getSupabase() {
  return createClient();
}

/** Maps TipoRota to the resulting StatusSolicitacao for the parent process. */
const ROTA_STATUS_MAP: Record<string, string> = {
  APROVADO_DIRETO: 'AGUARDANDO_AGENDAMENTO',
  CNRAC: 'AGUARDANDO_CNRAC',
  SETI: 'AGUARDANDO_SETI',
  RESPOSTA_EXTERNA: 'AGUARDANDO_RESPOSTA_EXTERNA',
  SERVICO_SOCIAL: 'ENCAMINHADO_SERVICO_SOCIAL',
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
    .in('status', [
      'AGUARDANDO_REGULACAO',
      'AGUARDANDO_CNRAC',
      'AGUARDANDO_SETI',
      'AGUARDANDO_RESPOSTA_EXTERNA',
      'ENCAMINHADO_SERVICO_SOCIAL',
    ])
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

  // Update the parent solicitacao status based on the route type
  const novoStatus = ROTA_STATUS_MAP[data.tipo_rota] as StatusSolicitacao | undefined;
  if (novoStatus) {
    await supabase
      .from('solicitacoes')
      .update({
        status: novoStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.solicitacao_id);
  }

  return rotaResult;
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
