import { createClient } from '@/lib/supabase/client';
import type { InsertDTO, StatusAjudaCusto, StatusSolicitacao } from '@/lib/supabase/database.types';

function getSupabase() {
  return createClient();
}

export async function listarAjudasCusto(filters?: {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = getSupabase();

  let query = supabase
    .from('ajudas_custo')
    .select(
      '*, solicitacoes(numero_processo, status, pacientes(nome_completo, cpf))',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'TODOS') {
    query = query.eq('status', filters.status as StatusAjudaCusto);
  }

  if (filters?.search) {
    query = query.or(
      `solicitacoes.numero_processo.ilike.%${filters.search}%`,
    );
  }

  const page = filters?.page ?? 1;
  const size = filters?.pageSize ?? 500;
  query = query.range((page - 1) * size, page * size - 1);

  return query;
}

export async function buscarAjudaCusto(id: string) {
  const supabase = getSupabase();
  return supabase
    .from('ajudas_custo')
    .select(
      '*, solicitacoes(numero_processo, pacientes(*))',
    )
    .eq('id', id)
    .single();
}

/**
 * Lists all ajudas_custo for a given solicitação (multiple periods).
 */
export async function listarPeriodosPorSolicitacao(solicitacaoId: string) {
  const supabase = getSupabase();
  return supabase
    .from('ajudas_custo')
    .select('*')
    .eq('solicitacao_id', solicitacaoId)
    .order('data_inicio', { ascending: true });
}

/**
 * Lists solicitações eligible for ajuda de custo.
 * Includes EM_PAGAMENTO (first time) and EM_PERMANENCIA (additional periods).
 */
export async function listarSolicitacoesParaAjudaCusto() {
  const supabase = getSupabase();
  const { data: solicitacoes, error } = await supabase
    .from('solicitacoes')
    .select('id, numero_processo, status, created_at, pacientes(nome_completo)')
    .in('status', ['EM_PAGAMENTO', 'EM_PERMANENCIA'])
    .order('created_at', { ascending: true });
  if (error || !solicitacoes) return { data: [], error };

  const { data: existentes } = await supabase.from('ajudas_custo').select('solicitacao_id');
  const ids = new Set((existentes ?? []).map((a: any) => a.solicitacao_id));
  return { data: solicitacoes.filter((s: any) => !ids.has(s.id)), error: null };
}

export async function criarAjudaCusto(data: InsertDTO<'ajudas_custo'>) {
  const supabase = getSupabase();
  const result = await supabase.from('ajudas_custo').insert(data).select().single();

  // Auto-transition only on first period: solicitação → EM_PERMANENCIA
  if (!result.error && data.solicitacao_id) {
    const { count } = await supabase
      .from('ajudas_custo')
      .select('id', { count: 'exact', head: true })
      .eq('solicitacao_id', data.solicitacao_id);

    if ((count ?? 0) <= 1) {
      await supabase
        .from('solicitacoes')
        .update({ status: 'EM_PERMANENCIA' as StatusSolicitacao, updated_at: new Date().toISOString() })
        .eq('id', data.solicitacao_id);
    }
  }

  return result;
}

export async function aprovarAjudaCusto(id: string) {
  const supabase = getSupabase();
  return supabase
    .from('ajudas_custo')
    .update({
      status: 'APROVADA',
      aprovado_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
}

/**
 * Registers payment for a period.
 * If valorPago === valorTotal → CONCLUIDA
 * If valorPago !== valorTotal → PAGO_PARCIALMENTE
 */
export async function pagarAjudaCusto(id: string, valorPago: number) {
  const supabase = getSupabase();

  // Fetch current record to compare
  const { data: current } = await supabase
    .from('ajudas_custo')
    .select('valor_total, solicitacao_id')
    .eq('id', id)
    .single();

  const valorTotal = (current as any)?.valor_total ?? 0;
  const novoStatus: StatusAjudaCusto = valorPago === valorTotal ? 'CONCLUIDA' : 'PAGO_PARCIALMENTE';

  const result = await supabase
    .from('ajudas_custo')
    .update({
      status: novoStatus,
      valor_pago: valorPago,
      pago_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  // Auto-transition: criar encerramento se ALL períodos da solicitação estão pagos/glosados
  if (!result.error && (current as any)?.solicitacao_id) {
    const solicitacaoId = (current as any).solicitacao_id;
    const { data: todosP } = await supabase
      .from('ajudas_custo')
      .select('status')
      .eq('solicitacao_id', solicitacaoId);

    const todosFechados = (todosP ?? []).every(
      (p: any) => ['CONCLUIDA', 'PAGO_PARCIALMENTE', 'GLOSADA'].includes(p.status),
    );

    if (todosFechados) {
      const existing = await supabase
        .from('encerramentos')
        .select('id')
        .eq('solicitacao_id', solicitacaoId)
        .maybeSingle();

      if (!existing.data) {
        await supabase.from('encerramentos').insert({
          solicitacao_id: solicitacaoId,
          status: 'PENDENTE',
        } as any);
      }
    }
  }

  return result;
}

export async function glosarAjudaCusto(id: string, observacoes: string) {
  const supabase = getSupabase();
  return supabase
    .from('ajudas_custo')
    .update({
      status: 'GLOSADA',
      observacoes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
}

export async function atualizarAjudaCusto(id: string, data: Partial<InsertDTO<'ajudas_custo'>>) {
  const supabase = getSupabase();
  return supabase
    .from('ajudas_custo')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
}

/**
 * Edits a period and reverts it to EM_ANALISE for re-approval.
 */
export async function editarEReverterAjudaCusto(id: string, data: Partial<InsertDTO<'ajudas_custo'>>) {
  const supabase = getSupabase();
  return supabase
    .from('ajudas_custo')
    .update({
      ...data,
      status: 'EM_ANALISE',
      aprovado_em: null,
      valor_pago: null,
      pago_em: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
}

export async function buscarAjudaCustoPorSolicitacao(solicitacaoId: string) {
  const supabase = getSupabase();
  return supabase
    .from('ajudas_custo')
    .select('id, valor_diaria, data_inicio, data_fim')
    .eq('solicitacao_id', solicitacaoId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function excluirAjudaCusto(id: string) {
  const supabase = getSupabase();
  return supabase.from('ajudas_custo').delete().eq('id', id);
}
