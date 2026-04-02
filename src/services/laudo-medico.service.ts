import { createClient } from '@/lib/supabase/client';

function getSupabase() {
  return createClient();
}

/* ============================================================
   Laudo Médico Digital — Supabase CRUD wrappers (C1)
   ============================================================ */

/**
 * Lista solicitações que precisam de laudo médico digital
 * (status PENDENTE_DIAGNOSTICO ou sem laudo existente).
 */
export async function listarSolicitacoesParaLaudo(filters?: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = getSupabase();

  let query = supabase
    .from('solicitacoes')
    .select(
      '*, pacientes(*, municipio_pac:municipio_residencia_id(id, nome, uf)), laudos_medicos(*)',
      { count: 'exact' },
    )
    .in('status', ['PENDENTE_DIAGNOSTICO', 'EM_ANALISE', 'EXIGENCIA'])
    .order('created_at', { ascending: false });

  if (filters?.search) {
    query = query.or(
      `numero_processo.ilike.%${filters.search}%,pacientes.nome_completo.ilike.%${filters.search}%`,
    );
  }

  const page = filters?.page ?? 1;
  const size = filters?.pageSize ?? 10;
  query = query.range((page - 1) * size, page * size - 1);

  return query;
}

/**
 * Busca o laudo médico de uma solicitação específica.
 */
export async function buscarLaudoPorSolicitacao(solicitacaoId: string) {
  const supabase = getSupabase();

  return supabase
    .from('laudos_medicos')
    .select('*')
    .eq('solicitacao_id', solicitacaoId)
    .maybeSingle();
}

/**
 * Cria um novo laudo médico (rascunho).
 */
export async function criarLaudo(data: Record<string, unknown>) {
  const supabase = getSupabase();

  return supabase
    .from('laudos_medicos')
    .insert(data)
    .select()
    .single();
}

/**
 * Atualiza um laudo médico existente (salvar rascunho ou concluir).
 */
export async function atualizarLaudo(id: string, data: Record<string, unknown>) {
  const supabase = getSupabase();

  return supabase
    .from('laudos_medicos')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
}

/**
 * Busca contadores de laudos por status.
 */
export async function contarLaudosPorStatus() {
  const supabase = getSupabase();

  return supabase
    .from('laudos_medicos')
    .select('status')
    .then(({ data, error }) => {
      if (error) return { data: null, error };
      const counts: Record<string, number> = {
        VAZIO: 0,
        RASCUNHO: 0,
        CONCLUIDO: 0,
      };
      data?.forEach((l) => {
        counts[l.status] = (counts[l.status] || 0) + 1;
      });
      return { data: counts, error: null };
    });
}
