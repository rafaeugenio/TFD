import { createClient } from '@/lib/supabase/client';
import type { InsertDTO, UpdateDTO } from '@/lib/supabase/database.types';

function getSupabase() {
  return createClient();
}

export async function listarUsuarios(filters?: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = getSupabase();

  let query = supabase
    .from('usuarios')
    .select('*', { count: 'exact' })
    .order('nome_completo', { ascending: true });

  if (filters?.search) {
    query = query.or(
      `nome_completo.ilike.%${filters.search}%,email.ilike.%${filters.search}%,cpf.ilike.%${filters.search}%`,
    );
  }

  const page = filters?.page ?? 1;
  const size = filters?.pageSize ?? 10;
  query = query.range((page - 1) * size, page * size - 1);

  return query;
}

export async function criarUsuario(data: InsertDTO<'usuarios'>) {
  const supabase = getSupabase();
  return supabase.from('usuarios').insert(data).select().single();
}

export async function atualizarUsuario(
  id: string,
  data: UpdateDTO<'usuarios'>,
) {
  const supabase = getSupabase();
  return supabase
    .from('usuarios')
    .update(data)
    .eq('id', id)
    .select()
    .single();
}

export interface UsuarioAtivoResumo {
  id: string;
  nome_completo: string;
  perfil: string;
}

/**
 * Lista usuários ativos para seletores de responsável (ex.: escolher quem
 * responde pela solicitação ao tramitar entre setores). Sem paginação —
 * usada em drawers, não em listagens.
 */
export async function listarUsuariosAtivos() {
  const supabase = getSupabase();
  return supabase
    .from('usuarios')
    .select('id, nome_completo, perfil')
    .eq('ativo', true)
    .order('nome_completo', { ascending: true }) as unknown as Promise<{
      data: UsuarioAtivoResumo[] | null;
      error: unknown;
    }>;
}

export async function desativarUsuario(id: string) {
  const supabase = getSupabase();
  return supabase
    .from('usuarios')
    .update({
      ativo: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
}
