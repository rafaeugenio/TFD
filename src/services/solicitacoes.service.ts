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
}) {
  const supabase = getSupabase();

  let query = supabase
    .from('solicitacoes')
    .select('*, pacientes(*), acompanhantes(*)', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'TODOS') {
    query = query.eq('status', filters.status as StatusSolicitacao);
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
      '*, pacientes(*), acompanhantes(*), documentos(*), pareceres(*), agendamentos(*), viagens(*), ajudas_custo(*), permanencias(*, prorrogacoes(*)), encerramentos(*)',
    )
    .eq('id', id)
    .single();
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
