import { createClient } from '@/lib/supabase/client';
import type { InsertDTO, UpdateDTO, SituacaoViagem, StatusSolicitacao } from '@/lib/supabase/database.types';
import { buscarDevolucaoAtiva, resolverDevolucao } from './devolucoes.service';

function getSupabase() {
  return createClient();
}

export async function listarViagens(filters?: {
  situacao?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = getSupabase();

  let query = supabase
    .from('viagens')
    .select('*, solicitacoes!inner(numero_processo, status, pacientes(nome_completo))', {
      count: 'exact',
    })
    .eq('solicitacoes.status', 'AGUARDANDO_EMISSAO')
    .order('created_at', { ascending: false });

  if (filters?.situacao && filters.situacao !== 'TODOS') {
    query = query.eq('situacao', filters.situacao as SituacaoViagem);
  }

  if (filters?.search) {
    query = query.or(
      `numero_bilhete.ilike.%${filters.search}%,origem_cidade.ilike.%${filters.search}%,destino_cidade.ilike.%${filters.search}%`,
    );
  }

  const page = filters?.page ?? 1;
  const size = filters?.pageSize ?? 10;
  query = query.range((page - 1) * size, page * size - 1);

  return query;
}

export async function buscarViagem(id: string) {
  const supabase = getSupabase();
  return supabase
    .from('viagens')
    .select('*, solicitacoes(numero_processo, pacientes(*)), remarcacoes(*)')
    .eq('id', id)
    .single();
}

/**
 * Lists solicitações with AGUARDANDO_EMISSAO that don't have a viagem yet.
 */
export async function listarSolicitacoesAguardandoEmissao() {
  const supabase = getSupabase();
  const { data: solicitacoes, error } = await supabase
    .from('solicitacoes')
    .select('id, numero_processo, status, created_at, pacientes(nome_completo)')
    .eq('status', 'AGUARDANDO_EMISSAO')
    .order('created_at', { ascending: true });
  if (error || !solicitacoes) return { data: [], error };
  const { data: existentes } = await supabase.from('viagens').select('solicitacao_id');
  const ids = new Set((existentes ?? []).map((v: any) => v.solicitacao_id));
  return { data: solicitacoes.filter((s: any) => !ids.has(s.id)), error: null };
}

/**
 * Cria uma viagem. Só avança para EM_PAGAMENTO quando AMBAS (ida + volta) existirem.
 */
export async function criarViagem(data: InsertDTO<'viagens'>) {
  const supabase = getSupabase();
  const result = await supabase.from('viagens').insert(data).select().single();

  if (!result.error && data.solicitacao_id) {
    // Check if both ida and volta now exist
    const { data: existing } = await supabase
      .from('viagens')
      .select('tipo')
      .eq('solicitacao_id', data.solicitacao_id);
    const tipos = new Set((existing ?? []).map((v: any) => v.tipo));
    const temIda = tipos.has('IDA');
    const temVolta = tipos.has('VOLTA') || tipos.has('RETORNO');

    if (temIda && temVolta) {
      const devolucao = await buscarDevolucaoAtiva(data.solicitacao_id, 'PASSAGENS');
      let novoStatus: StatusSolicitacao = 'EM_PAGAMENTO';
      if (devolucao.data) {
        novoStatus = devolucao.data.status_retorno as StatusSolicitacao;
        await resolverDevolucao(devolucao.data.id, 'Viagens (ida + volta) emitidas. Retorno ao setor de origem.');
      }
      await supabase
        .from('solicitacoes')
        .update({ status: novoStatus, updated_at: new Date().toISOString() })
        .eq('id', data.solicitacao_id);
    }
  }

  return result;
}

/**
 * Cadastro obrigatório de ida + volta no mesmo momento.
 * Após criar ambas as viagens, avança a solicitação para EM_PAGAMENTO (Ajuda de Custo).
 */
export async function criarViagemIdaVolta(
  ida: InsertDTO<'viagens'>,
  volta: InsertDTO<'viagens'>,
) {
  const supabase = getSupabase();

  // Inserir ida
  const idaResult = await supabase.from('viagens').insert(ida).select().single();
  if (idaResult.error) return { ida: idaResult, volta: null, error: idaResult.error };

  // Inserir volta
  const voltaResult = await supabase.from('viagens').insert(volta).select().single();
  if (voltaResult.error) return { ida: idaResult, volta: voltaResult, error: voltaResult.error };

  // Auto-transition: verificar devolução ativa antes de seguir fluxo normal
  const solicitacaoId = ida.solicitacao_id;
  if (solicitacaoId) {
    const devolucao = await buscarDevolucaoAtiva(solicitacaoId, 'PASSAGENS');

    let novoStatus: StatusSolicitacao = 'EM_PAGAMENTO';
    if (devolucao.data) {
      novoStatus = devolucao.data.status_retorno as StatusSolicitacao;
      await resolverDevolucao(
        devolucao.data.id,
        'Viagens (ida + volta) emitidas. Retorno direto ao setor de origem.',
      );
    }

    await supabase
      .from('solicitacoes')
      .update({ status: novoStatus, updated_at: new Date().toISOString() })
      .eq('id', solicitacaoId);
  }

  return { ida: idaResult, volta: voltaResult, error: null };
}

export async function atualizarViagem(id: string, data: UpdateDTO<'viagens'>) {
  const supabase = getSupabase();
  return supabase.from('viagens').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select().single();
}

export async function excluirViagem(id: string) {
  const supabase = getSupabase();
  return supabase.from('viagens').delete().eq('id', id);
}

export async function confirmarEmbarque(id: string, registradoPor: string) {
  const supabase = getSupabase();
  const result = await supabase
    .from('viagens')
    .update({
      situacao: 'UTILIZADA',
      embarcou: true,
      embarcou_registrado_por: registradoPor,
      embarcou_registrado_em: new Date().toISOString(),
      data_embarque_real: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  // Auto-transition: solicitação → EM_VIAGEM
  if (!result.error && (result.data as any)?.solicitacao_id) {
    await supabase
      .from('solicitacoes')
      .update({ status: 'EM_VIAGEM', updated_at: new Date().toISOString() })
      .eq('id', (result.data as any).solicitacao_id);
  }

  return result;
}

export async function registrarNoShow(id: string, registradoPor: string) {
  const supabase = getSupabase();
  return supabase
    .from('viagens')
    .update({
      situacao: 'NO_SHOW',
      embarcou: false,
      embarcou_registrado_por: registradoPor,
      embarcou_registrado_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
}

export async function cancelarViagem(id: string) {
  const supabase = getSupabase();
  return supabase
    .from('viagens')
    .update({
      situacao: 'CANCELADA',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
}

export async function buscarViagensPorSolicitacao(solicitacaoId: string) {
  const supabase = getSupabase();
  return supabase
    .from('viagens')
    .select('id, tipo, data_embarque_prevista, situacao')
    .eq('solicitacao_id', solicitacaoId)
    .in('situacao', ['EMITIDA', 'UTILIZADA'])
    .order('data_embarque_prevista', { ascending: true });
}

export async function criarRemarcacao(data: InsertDTO<'remarcacoes'>) {
  const supabase = getSupabase();
  return supabase.from('remarcacoes').insert(data).select().single();
}
