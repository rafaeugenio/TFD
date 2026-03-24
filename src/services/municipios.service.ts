import { createClient } from '@/lib/supabase/client';
import type { InsertDTO, UpdateDTO } from '@/lib/supabase/database.types';

function getSupabase() {
  return createClient();
}

export async function listarMunicipios(filters?: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = getSupabase();

  let query = supabase
    .from('municipios')
    .select('*', { count: 'exact' })
    .eq('ativo', true)
    .order('nome', { ascending: true });

  if (filters?.search) {
    query = query.or(
      `nome.ilike.%${filters.search}%,codigo_ibge.ilike.%${filters.search}%`,
    );
  }

  const page = filters?.page ?? 1;
  const size = filters?.pageSize ?? 50;
  query = query.range((page - 1) * size, page * size - 1);

  return query;
}

export async function criarMunicipio(data: InsertDTO<'municipios'>) {
  const supabase = getSupabase();
  return supabase.from('municipios').insert(data).select().single();
}

export async function atualizarMunicipio(
  id: string,
  data: UpdateDTO<'municipios'>,
) {
  const supabase = getSupabase();
  return supabase
    .from('municipios')
    .update(data)
    .eq('id', id)
    .select()
    .single();
}
