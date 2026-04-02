import { createClient } from '@/lib/supabase/client';
import type { InsertDTO, UpdateDTO, StatusAgendamento, StatusSolicitacao } from '@/lib/supabase/database.types';
import { buscarDevolucaoAtiva, resolverDevolucao } from './devolucoes.service';

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
      '*, solicitacoes(numero_processo, status, pacientes(nome_completo))',
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
  const result = await supabase.from('agendamentos').insert(data).select().single();

  // Auto-transition: verificar devolução ativa antes de seguir fluxo normal
  if (!result.error && data.solicitacao_id) {
    const devolucao = await buscarDevolucaoAtiva(data.solicitacao_id, 'AGENDAMENTO');

    let novoStatus: StatusSolicitacao = 'AGUARDANDO_EMISSAO';
    if (devolucao.data) {
      novoStatus = devolucao.data.status_retorno as StatusSolicitacao;
      await resolverDevolucao(
        devolucao.data.id,
        'Agendamento registrado. Retorno direto ao setor de origem.',
      );
    }

    await supabase
      .from('solicitacoes')
      .update({ status: novoStatus, updated_at: new Date().toISOString() })
      .eq('id', data.solicitacao_id);
  }

  return result;
}

export async function atualizarAgendamento(id: string, data: UpdateDTO<'agendamentos'>) {
  const supabase = getSupabase();
  return supabase
    .from('agendamentos')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
}

export async function excluirAgendamento(id: string) {
  const supabase = getSupabase();
  return supabase.from('agendamentos').delete().eq('id', id);
}

/**
 * Fetches the last routing decision for a solicitação to pre-fill agendamento fields.
 */
export async function buscarRotaParaAgendamento(solicitacaoId: string) {
  const supabase = getSupabase();
  return supabase
    .from('rotas_regulacao')
    .select('tipo_rota, justificativa')
    .eq('solicitacao_id', solicitacaoId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
}

/**
 * Lists solicitações with AGUARDANDO_AGENDAMENTO status that don't have an agendamento yet.
 * These appear as "available for scheduling" in the agendamento table.
 */
export async function listarSolicitacoesAguardandoAgendamento() {
  const supabase = getSupabase();

  // Get all solicitacoes in AGUARDANDO_AGENDAMENTO
  const { data: solicitacoes, error: solErr } = await supabase
    .from('solicitacoes')
    .select('id, numero_processo, status, created_at, cid10_principal, pacientes(nome_completo)')
    .eq('status', 'AGUARDANDO_AGENDAMENTO')
    .order('created_at', { ascending: true });

  if (solErr || !solicitacoes) return { data: [], error: solErr };

  // Get IDs that already have an agendamento
  const { data: agendados } = await supabase
    .from('agendamentos')
    .select('solicitacao_id');

  const agendadoIds = new Set((agendados ?? []).map((a: any) => a.solicitacao_id));

  // Filter out those that already have an agendamento
  const disponíveis = solicitacoes.filter((s: any) => !agendadoIds.has(s.id));

  return { data: disponíveis, error: null };
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
