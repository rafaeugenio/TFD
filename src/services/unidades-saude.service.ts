import { createClient } from '@/lib/supabase/client';
import type { UnidadeSaude } from '@/core/models';

function getSupabase() {
  return createClient();
}

/** Lista unidades ativas com busca por nome ou CNES */
export async function listarUnidadesSaude(filters?: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  let query = getSupabase()
    .from('unidades_destino')
    .select('*, tabelas_auxiliares!regional_id(nome)', { count: 'exact' })
    .eq('ativo', true)
    .order('nome', { ascending: true });

  if (filters?.search) {
    query = query.or(
      `nome.ilike.%${filters.search}%,cnes.ilike.%${filters.search}%`,
    );
  }

  const page = filters?.page ?? 1;
  const size = filters?.pageSize ?? 10;
  query = query.range((page - 1) * size, page * size - 1);

  return query;
}

/** Lista todas (admin, inclusive inativas) */
export async function listarUnidadesSaudeAdmin(filters?: { search?: string }) {
  let query = getSupabase()
    .from('unidades_destino')
    .select('*, tabelas_auxiliares!regional_id(nome)', { count: 'exact' })
    .order('nome', { ascending: true })
    .range(0, 49999);

  if (filters?.search) {
    query = query.or(
      `nome.ilike.%${filters.search}%,cnes.ilike.%${filters.search}%`,
    );
  }

  return query;
}

/** Busca unidade por ID */
export async function buscarUnidadeSaude(id: string) {
  return getSupabase()
    .from('unidades_destino')
    .select('*, tabelas_auxiliares!regional_id(nome)')
    .eq('id', id)
    .single();
}

/** Busca por CNES (validacao de unicidade) */
export async function buscarPorCnes(cnes: string) {
  return getSupabase()
    .from('unidades_destino')
    .select('*')
    .eq('cnes', cnes)
    .maybeSingle();
}

/** Cria nova unidade */
export async function criarUnidadeSaude(data: Omit<UnidadeSaude, 'id' | 'ativo' | 'created_at' | 'updated_at'>) {
  return getSupabase()
    .from('unidades_destino')
    .insert(data)
    .select()
    .single();
}

/** Atualiza unidade */
export async function atualizarUnidadeSaude(id: string, data: Partial<UnidadeSaude>) {
  return getSupabase()
    .from('unidades_destino')
    .update(data)
    .eq('id', id)
    .select()
    .single();
}

/** Desativa unidade (soft delete) */
export async function desativarUnidadeSaude(id: string) {
  return getSupabase()
    .from('unidades_destino')
    .update({ ativo: false })
    .eq('id', id)
    .select()
    .single();
}

/**
 * Tipo de vínculo entre uma solicitação e uma unidade de saúde. Uma mesma
 * solicitação pode estar vinculada à unidade por dois caminhos distintos —
 * essa distinção é importante para relatórios.
 *
 * - `origem_laudo`: a unidade emitiu o laudo médico da solicitação
 *   (`solicitacoes.origem_laudo_unidade_id`).
 * - `destino_agendamento`: a unidade é onde o paciente foi agendado para
 *   realizar o procedimento (`agendamentos.unidade_destino_id`).
 */
export type VinculoSolicitacaoUnidade = 'origem_laudo' | 'destino_agendamento';

export const VINCULO_SOLICITACAO_UNIDADE_LABEL: Record<VinculoSolicitacaoUnidade, string> = {
  origem_laudo: 'Origem do laudo',
  destino_agendamento: 'Destino de agendamento',
};

export interface SolicitacaoVinculadaUnidade {
  solicitacao: Record<string, unknown>;
  vinculos: VinculoSolicitacaoUnidade[];
}

/**
 * Lista TODAS as solicitações vinculadas a uma unidade, considerando os dois
 * tipos de vínculo possíveis (origem do laudo + destino de agendamento).
 * Uma solicitação que estiver nas duas pontas aparece uma única vez com
 * `vinculos: ['origem_laudo', 'destino_agendamento']`.
 */
export async function listarSolicitacoesPorUnidade(unidadeId: string): Promise<{
  data: SolicitacaoVinculadaUnidade[];
  error: { message: string } | null;
}> {
  const supabase = getSupabase();

  const [agendamentosRes, laudoRes] = await Promise.all([
    supabase
      .from('agendamentos')
      .select('solicitacao_id, solicitacoes(*, pacientes(nome_completo))')
      .eq('unidade_destino_id', unidadeId)
      .order('created_at', { ascending: false }),
    supabase
      .from('solicitacoes')
      .select('*, pacientes(nome_completo)')
      .eq('origem_laudo_unidade_id', unidadeId)
      .order('created_at', { ascending: false }),
  ]);

  if (agendamentosRes.error) return { data: [], error: { message: agendamentosRes.error.message } };
  if (laudoRes.error) return { data: [], error: { message: laudoRes.error.message } };

  const byId = new Map<string, SolicitacaoVinculadaUnidade>();

  // Destino de agendamento
  for (const row of (agendamentosRes.data ?? []) as Record<string, unknown>[]) {
    const sol = row.solicitacoes as Record<string, unknown> | null;
    if (!sol) continue;
    const solId = sol.id as string;
    const existing = byId.get(solId);
    if (existing) {
      if (!existing.vinculos.includes('destino_agendamento')) existing.vinculos.push('destino_agendamento');
    } else {
      byId.set(solId, { solicitacao: sol, vinculos: ['destino_agendamento'] });
    }
  }

  // Origem do laudo
  for (const sol of (laudoRes.data ?? []) as Record<string, unknown>[]) {
    const solId = sol.id as string;
    const existing = byId.get(solId);
    if (existing) {
      if (!existing.vinculos.includes('origem_laudo')) existing.vinculos.unshift('origem_laudo');
    } else {
      byId.set(solId, { solicitacao: sol, vinculos: ['origem_laudo'] });
    }
  }

  const lista = Array.from(byId.values()).sort((a, b) => {
    const da = new Date((a.solicitacao.created_at as string) ?? '').getTime();
    const db = new Date((b.solicitacao.created_at as string) ?? '').getTime();
    return db - da;
  });

  return { data: lista, error: null };
}
