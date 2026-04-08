import { createClient } from '@/lib/supabase/client';
import type { RotaDeslocamento } from '@/core/models';

function getSupabase() {
  return createClient();
}

/** Lista rotas ativas com busca opcional */
export async function listarRotas(filters?: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  let query = getSupabase()
    .from('rotas_deslocamento')
    .select('*', { count: 'exact' })
    .eq('ativo', true)
    .order('cidade_origem', { ascending: true });

  if (filters?.search) {
    query = query.or(
      `cidade_origem.ilike.%${filters.search}%,cidade_destino.ilike.%${filters.search}%`,
    );
  }

  const page = filters?.page ?? 1;
  const size = filters?.pageSize ?? 20;
  query = query.range((page - 1) * size, page * size - 1);

  return query;
}

/** Lista todas (admin, inclusive inativas) */
export async function listarRotasAdmin(filters?: { search?: string }) {
  let query = getSupabase()
    .from('rotas_deslocamento')
    .select('*', { count: 'exact' })
    .order('cidade_origem', { ascending: true });

  if (filters?.search) {
    query = query.or(
      `cidade_origem.ilike.%${filters.search}%,cidade_destino.ilike.%${filters.search}%`,
    );
  }

  return query;
}

/** Busca rota por origem + destino */
export async function buscarRota(
  cidadeOrigem: string,
  ufOrigem: string,
  cidadeDestino: string,
  ufDestino: string,
) {
  return getSupabase()
    .from('rotas_deslocamento')
    .select('*')
    .eq('cidade_origem', cidadeOrigem)
    .eq('uf_origem', ufOrigem)
    .eq('cidade_destino', cidadeDestino)
    .eq('uf_destino', ufDestino)
    .eq('ativo', true)
    .maybeSingle();
}

/** Busca rota por ID */
export async function buscarRotaPorId(id: number) {
  return getSupabase()
    .from('rotas_deslocamento')
    .select('*')
    .eq('id', id)
    .single();
}

/** Cria nova rota */
export async function criarRota(data: Omit<RotaDeslocamento, 'id' | 'ativo'>) {
  return getSupabase()
    .from('rotas_deslocamento')
    .insert(data)
    .select()
    .single();
}

/** Atualiza rota */
export async function atualizarRota(id: number, data: Partial<RotaDeslocamento>) {
  return getSupabase()
    .from('rotas_deslocamento')
    .update(data)
    .eq('id', id)
    .select()
    .single();
}

/** Desativa rota (soft delete) */
export async function desativarRota(id: number) {
  return getSupabase()
    .from('rotas_deslocamento')
    .update({ ativo: false })
    .eq('id', id)
    .select()
    .single();
}

/**
 * Calcula número de procedimentos SIGTAP para uma rota e modal.
 * A distância é sempre em milhas independente do modal.
 * - Aéreo: cada 200 milhas = 1 procedimento
 * - Terrestre: cada 50 milhas = 1 procedimento
 * - Fluvial: cada 27 milhas = 1 procedimento
 */
export function calcularProcedimentos(
  rota: RotaDeslocamento,
  modal: 'aereo' | 'terrestre' | 'fluvial',
): { quantidade: number; distancia: number; unidade: string } | null {
  if (!rota.distancia_milhas) return null;

  switch (modal) {
    case 'aereo':
      return {
        quantidade: Math.ceil(rota.distancia_milhas / 200),
        distancia: rota.distancia_milhas,
        unidade: 'milhas',
      };
    case 'terrestre':
      return {
        quantidade: Math.ceil(rota.distancia_milhas / 50),
        distancia: rota.distancia_milhas,
        unidade: 'milhas',
      };
    case 'fluvial':
      return {
        quantidade: Math.ceil(rota.distancia_milhas / 27),
        distancia: rota.distancia_milhas,
        unidade: 'milhas',
      };
    default:
      return null;
  }
}
