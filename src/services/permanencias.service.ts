import { createClient } from '@/lib/supabase/client';
import type { InsertDTO } from '@/lib/supabase/database.types';
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
      '*, prorrogacoes(*), solicitacoes(numero_processo, pacientes(nome_completo))',
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

export async function criarPermanencia(data: InsertDTO<'permanencias'>) {
  const supabase = getSupabase();
  return supabase.from('permanencias').insert(data).select().single();
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
