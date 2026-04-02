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
      '*, solicitacoes(numero_processo, status, pacientes(nome_completo, cpf)), dados_bancarios(*)',
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
  const size = filters?.pageSize ?? 10;
  query = query.range((page - 1) * size, page * size - 1);

  return query;
}

export async function buscarAjudaCusto(id: string) {
  const supabase = getSupabase();
  return supabase
    .from('ajudas_custo')
    .select(
      '*, solicitacoes(numero_processo, pacientes(*)), dados_bancarios(*)',
    )
    .eq('id', id)
    .single();
}

/**
 * Lists solicitações with EM_PAGAMENTO that don't have an ajuda de custo yet.
 */
export async function listarSolicitacoesParaAjudaCusto() {
  const supabase = getSupabase();
  const { data: solicitacoes, error } = await supabase
    .from('solicitacoes')
    .select('id, numero_processo, status, created_at, pacientes(nome_completo)')
    .eq('status', 'EM_PAGAMENTO')
    .order('created_at', { ascending: true });
  if (error || !solicitacoes) return { data: [], error };
  const { data: existentes } = await supabase.from('ajudas_custo').select('solicitacao_id');
  const ids = new Set((existentes ?? []).map((a: any) => a.solicitacao_id));
  return { data: solicitacoes.filter((s: any) => !ids.has(s.id)), error: null };
}

export async function criarAjudaCusto(data: InsertDTO<'ajudas_custo'>) {
  const supabase = getSupabase();
  const result = await supabase.from('ajudas_custo').insert(data).select().single();

  // Auto-transition: solicitação → EM_PERMANENCIA
  if (!result.error && data.solicitacao_id) {
    await supabase
      .from('solicitacoes')
      .update({ status: 'EM_PERMANENCIA' as StatusSolicitacao, updated_at: new Date().toISOString() })
      .eq('id', data.solicitacao_id);
  }

  return result;
}

export async function aprovarAjudaCusto(id: string, aprovadoPor: string) {
  const supabase = getSupabase();
  const result = await supabase
    .from('ajudas_custo')
    .update({
      status: 'APROVADA',
      aprovado_por: aprovadoPor,
      aprovado_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  // Auto-transition: solicitação → EM_PAGAMENTO
  if (!result.error && (result.data as any)?.solicitacao_id) {
    await supabase
      .from('solicitacoes')
      .update({ status: 'EM_PAGAMENTO', updated_at: new Date().toISOString() })
      .eq('id', (result.data as any).solicitacao_id);
  }

  return result;
}

export async function pagarAjudaCusto(id: string, pagoPor: string) {
  const supabase = getSupabase();
  const result = await supabase
    .from('ajudas_custo')
    .update({
      status: 'CONCLUIDA',
      pago_por: pagoPor,
      pago_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  // Auto-transition: criar registro de encerramento pendente para aparecer em Alta/Encerramento
  if (!result.error && (result.data as any)?.solicitacao_id) {
    const solicitacaoId = (result.data as any).solicitacao_id;

    // Verificar se já existe encerramento para esta solicitação
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
