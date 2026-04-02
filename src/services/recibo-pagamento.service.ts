import { createClient } from '@/lib/supabase/client';

function getSupabase() {
  return createClient();
}

export async function listarRecibos(filters?: {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = getSupabase();

  let query = supabase
    .from('recibos_pagamento')
    .select(
      '*, solicitacoes(numero_processo, status, pacientes(nome_completo, cns, data_nascimento, endereco))',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'TODOS') {
    query = query.eq('status', filters.status);
  }

  if (filters?.search) {
    query = query.or(
      `numero_recibo.ilike.%${filters.search}%,solicitacoes.numero_processo.ilike.%${filters.search}%`,
    );
  }

  const page = filters?.page ?? 1;
  const size = filters?.pageSize ?? 10;
  query = query.range((page - 1) * size, page * size - 1);

  return query;
}

export async function buscarRecibo(id: string) {
  const supabase = getSupabase();
  return supabase
    .from('recibos_pagamento')
    .select(
      '*, solicitacoes(numero_processo, pacientes(*))',
    )
    .eq('id', id)
    .single();
}

export async function gerarRecibo(data: Record<string, unknown>) {
  const supabase = getSupabase();
  return supabase
    .from('recibos_pagamento')
    .insert({ ...data, status: 'GERADO' })
    .select()
    .single();
}

export async function atualizarStatusRecibo(id: string, status: string) {
  const supabase = getSupabase();
  return supabase
    .from('recibos_pagamento')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
}
