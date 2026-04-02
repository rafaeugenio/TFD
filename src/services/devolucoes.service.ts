import { createClient } from '@/lib/supabase/client';
import type { SetorTFD, StatusDevolucao, UrgenciaDevolucao, StatusSolicitacao } from '@/lib/supabase/database.types';

function getSupabase() {
  return createClient();
}

/**
 * Cria uma devolução — qualquer setor downstream pode devolver para um setor upstream.
 * Registra o status_retorno (status atual da solicitação) para que, ao resolver,
 * o processo volte DIRETAMENTE para o setor de origem (não segue o fluxo normal).
 */
export async function criarDevolucao(data: {
  solicitacao_id: string;
  setor_origem: SetorTFD;
  setor_destino: SetorTFD;
  motivo: string;
  urgencia?: UrgenciaDevolucao;
  devolvido_por?: string;
  status_retorno: StatusSolicitacao;
}) {
  const supabase = getSupabase();

  return supabase
    .from('devolucoes')
    .insert({
      solicitacao_id: data.solicitacao_id,
      setor_origem: data.setor_origem,
      setor_destino: data.setor_destino,
      motivo: data.motivo,
      urgencia: data.urgencia ?? 'NORMAL',
      status_devolucao: 'PENDENTE' as StatusDevolucao,
      devolvido_por: data.devolvido_por ?? null,
      status_retorno: data.status_retorno,
    } as any)
    .select()
    .single();
}

/**
 * Lista devoluções de uma solicitação.
 */
export async function listarDevolucoesPorSolicitacao(solicitacaoId: string) {
  const supabase = getSupabase();

  return supabase
    .from('devolucoes')
    .select('*')
    .eq('solicitacao_id', solicitacaoId)
    .order('created_at', { ascending: false });
}

/**
 * Lista devoluções ativas ENVIADAS por um setor (setor_origem).
 * Usado para sinalizar na tabela quais itens estão aguardando retorno.
 */
export async function listarDevolucoesEnviadas(setorOrigem: SetorTFD) {
  const supabase = getSupabase();

  return supabase
    .from('devolucoes')
    .select('id, solicitacao_id, setor_destino, status_devolucao, urgencia, created_at')
    .eq('setor_origem', setorOrigem)
    .in('status_devolucao', ['PENDENTE', 'RECEBIDA']);
}

/**
 * Lista devoluções pendentes destinadas a um setor específico.
 */
export async function listarDevolucoesPendentes(setorDestino: SetorTFD) {
  const supabase = getSupabase();

  return supabase
    .from('devolucoes')
    .select('*, solicitacoes(id, numero_processo, status, pacientes(nome_completo))')
    .eq('setor_destino', setorDestino)
    .in('status_devolucao', ['PENDENTE', 'RECEBIDA'])
    .order('created_at', { ascending: true });
}

/**
 * Marca a devolução como recebida pelo setor destino.
 */
export async function receberDevolucao(devolucaoId: string, recebidoPor?: string) {
  const supabase = getSupabase();

  return supabase
    .from('devolucoes')
    .update({
      status_devolucao: 'RECEBIDA' as StatusDevolucao,
      recebido_por: recebidoPor ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', devolucaoId)
    .select()
    .single();
}

/**
 * Resolve a devolução e retorna o status_retorno — o service que chamou
 * deve usar esse status para restaurar a solicitação ao setor de origem.
 */
export async function resolverDevolucao(
  devolucaoId: string,
  observacaoResolucao: string,
  resolvidoPor?: string,
) {
  const supabase = getSupabase();

  return supabase
    .from('devolucoes')
    .update({
      status_devolucao: 'RESOLVIDA' as StatusDevolucao,
      observacao_resolucao: observacaoResolucao,
      resolvido_por: resolvidoPor ?? null,
      resolvido_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', devolucaoId)
    .select()
    .single();
}

/**
 * Busca devolução pendente/recebida para uma solicitação num setor destino.
 * Se existir, o service de transição DEVE usar o status_retorno em vez do fluxo normal.
 */
export async function buscarDevolucaoAtiva(solicitacaoId: string, setorDestino: SetorTFD) {
  const supabase = getSupabase();

  return supabase
    .from('devolucoes')
    .select('*')
    .eq('solicitacao_id', solicitacaoId)
    .eq('setor_destino', setorDestino)
    .in('status_devolucao', ['PENDENTE', 'RECEBIDA'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
}

/**
 * Conta devoluções pendentes por setor (para badges nos menus).
 */
export async function contarDevolucoesPendentes() {
  const supabase = getSupabase();

  return supabase
    .from('devolucoes')
    .select('setor_destino')
    .in('status_devolucao', ['PENDENTE', 'RECEBIDA'])
    .then(({ data, error }) => {
      if (error) return { data: null, error };
      const counts: Record<string, number> = {};
      data?.forEach((d: any) => {
        counts[d.setor_destino] = (counts[d.setor_destino] || 0) + 1;
      });
      return { data: counts, error: null };
    });
}
