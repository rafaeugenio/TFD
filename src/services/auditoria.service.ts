import { createClient } from '@/lib/supabase/client';
import type { InsertDTO, AcaoAuditoria } from '@/lib/supabase/database.types';

function getSupabase() {
  return createClient();
}

export async function registrarLog(data: InsertDTO<'log_auditoria'>) {
  const supabase = getSupabase();
  return supabase.from('log_auditoria').insert(data).select().single();
}

export async function buscarTimeline(solicitacaoId: string) {
  const supabase = getSupabase();
  return supabase
    .from('log_auditoria')
    .select('*, usuarios(nome_completo)')
    .eq('solicitacao_id', solicitacaoId)
    .order('timestamp', { ascending: true });
}

export async function listarLogs(filters?: {
  dataInicio?: string;
  dataFim?: string;
  usuarioId?: string;
  acao?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = getSupabase();

  let query = supabase
    .from('log_auditoria')
    .select('*, usuarios(nome_completo)', { count: 'exact' })
    .order('timestamp', { ascending: false });

  if (filters?.dataInicio) {
    query = query.gte('timestamp', filters.dataInicio);
  }

  if (filters?.dataFim) {
    query = query.lte('timestamp', filters.dataFim);
  }

  if (filters?.usuarioId) {
    query = query.eq('usuario_id', filters.usuarioId);
  }

  if (filters?.acao) {
    query = query.eq('acao', filters.acao as AcaoAuditoria);
  }

  const page = filters?.page ?? 1;
  const size = filters?.pageSize ?? 20;
  query = query.range((page - 1) * size, page * size - 1);

  return query;
}
