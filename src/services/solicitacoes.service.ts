import { createClient } from '@/lib/supabase/client';
import type { InsertDTO, UpdateDTO, StatusSolicitacao } from '@/lib/supabase/database.types';

function getSupabase() {
  return createClient();
}

export async function listarSolicitacoes(filters?: {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  includeIds?: string[];
}) {
  const supabase = getSupabase();

  let query = supabase
    .from('solicitacoes')
    .select('*, pacientes(*, municipio_pac:municipio_residencia_id(id, nome, uf)), municipios:municipio_origem_id(id, nome, uf)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'TODOS') {
    if (filters?.includeIds && filters.includeIds.length > 0) {
      query = query.or(`status.eq.${filters.status},id.in.(${filters.includeIds.join(',')})`);
    } else {
      query = query.eq('status', filters.status as StatusSolicitacao);
    }
  }

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

export async function buscarSolicitacao(id: string) {
  const supabase = getSupabase();

  return supabase
    .from('solicitacoes')
    .select(
      '*, pacientes(*, municipios:municipio_residencia_id(id, nome, uf)), municipios:municipio_origem_id(id, nome, uf), solicitacao_acompanhantes(*, acompanhantes(*)), documentos(*), pareceres(*, usuarios:medico_auditor_id(id, nome_completo, perfil, crm, crm_uf, especialidade_medica)), rotas_regulacao(*, cobrancas_externas(*)), agendamentos(*), viagens(*), ajudas_custo(*), permanencias(*, prorrogacoes(*)), encerramentos(*), devolucoes(*)',
    )
    .eq('id', id)
    .single();
}

export async function buscarSolicitacaoPorNumero(numero: string) {
  const supabase = getSupabase();
  return supabase
    .from('solicitacoes')
    .select('id, numero_processo, pacientes(nome_completo)')
    .ilike('numero_processo', `%${numero}%`)
    .limit(10);
}

/**
 * Lista solicitações ativas com dados do paciente para selects de vinculação.
 * Exclui CONCLUIDO, INDEFERIDO e CANCELADO.
 */
export async function listarSolicitacoesAtivas() {
  const supabase = getSupabase();
  return supabase
    .from('solicitacoes')
    .select('id, numero_processo, status, pacientes(id, nome_completo)')
    .not('status', 'in', '("CONCLUIDO","INDEFERIDO","CANCELADO")')
    .order('created_at', { ascending: false });
}

export async function criarSolicitacao(data: InsertDTO<'solicitacoes'>) {
  const supabase = getSupabase();
  return supabase.from('solicitacoes').insert(data).select().single();
}

export async function atualizarSolicitacao(
  id: string,
  data: UpdateDTO<'solicitacoes'>,
) {
  const supabase = getSupabase();
  return supabase
    .from('solicitacoes')
    .update(data)
    .eq('id', id)
    .select()
    .single();
}

export async function excluirSolicitacao(id: string) {
  const supabase = getSupabase();
  return supabase.from('solicitacoes').delete().eq('id', id);
}

export async function atualizarStatus(id: string, status: StatusSolicitacao) {
  const supabase = getSupabase();
  return supabase
    .from('solicitacoes')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
}

export async function contarPorStatus() {
  const supabase = getSupabase();

  return supabase
    .from('solicitacoes')
    .select('status')
    .then(({ data, error }) => {
      if (error) return { data: null, error };
      const counts: Record<string, number> = {};
      data?.forEach((s) => {
        counts[s.status] = (counts[s.status] || 0) + 1;
      });
      return { data: counts, error: null };
    });
}
