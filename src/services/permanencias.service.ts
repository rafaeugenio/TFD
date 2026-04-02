import { createClient } from '@/lib/supabase/client';
import type { InsertDTO, UpdateDTO } from '@/lib/supabase/database.types';
import type { DecisaoProrrogacao } from '@/lib/supabase/database.types';

function getSupabase() {
  return createClient();
}

export async function listarPermanencias(filters?: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = getSupabase();

  let query = supabase
    .from('permanencias')
    .select(
      '*, prorrogacoes(*), solicitacoes(numero_processo, status, pacientes(nome_completo))',
      { count: 'exact' },
    )
    .order('registrado_em', { ascending: false });

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

/**
 * Lists solicitações with EM_PERMANENCIA that don't have a permanência record yet.
 */
export async function listarSolicitacoesEmPermanencia() {
  const supabase = getSupabase();
  const { data: solicitacoes, error } = await supabase
    .from('solicitacoes')
    .select('id, numero_processo, status, created_at, pacientes(nome_completo)')
    .eq('status', 'EM_PERMANENCIA')
    .order('created_at', { ascending: true });
  if (error || !solicitacoes) return { data: [], error };
  const { data: existentes } = await supabase.from('permanencias').select('solicitacao_id');
  const ids = new Set((existentes ?? []).map((p: any) => p.solicitacao_id));
  return { data: solicitacoes.filter((s: any) => !ids.has(s.id)), error: null };
}

export async function criarPermanencia(data: InsertDTO<'permanencias'>) {
  const supabase = getSupabase();
  const result = await supabase.from('permanencias').insert(data).select().single();

  // Auto-transition: solicitação → EM_PERMANENCIA
  if (!result.error && data.solicitacao_id) {
    await supabase
      .from('solicitacoes')
      .update({ status: 'EM_PERMANENCIA', updated_at: new Date().toISOString() })
      .eq('id', data.solicitacao_id);
  }

  return result;
}

export async function atualizarPermanencia(id: string, data: UpdateDTO<'permanencias'>) {
  const supabase = getSupabase();
  return supabase.from('permanencias').update(data).eq('id', id).select().single();
}

export async function excluirPermanencia(id: string) {
  const supabase = getSupabase();
  return supabase.from('permanencias').delete().eq('id', id);
}

export async function criarProrrogacao(data: InsertDTO<'prorrogacoes'>) {
  const supabase = getSupabase();
  return supabase.from('prorrogacoes').insert(data).select().single();
}

export async function decidirProrrogacao(
  id: string,
  decisao: DecisaoProrrogacao,
  justificativa: string | null,
  decisaoPor: string,
) {
  const supabase = getSupabase();
  return supabase
    .from('prorrogacoes')
    .update({
      decisao,
      justificativa_decisao: justificativa,
      decisao_por: decisaoPor,
      decisao_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
}
