import { createClient } from '@/lib/supabase/client';

function getSupabase() {
  return createClient();
}

/**
 * Busca CID-10 por código ou descrição (para autocomplete, max 20 resultados).
 * Fonte: tabelas_auxiliares com categoria 'cid10' — gerenciada via Configurações.
 */
export async function buscarCid10(query: string) {
  const termo = `%${query}%`;

  return getSupabase()
    .from('tabelas_auxiliares')
    .select('*')
    .eq('categoria', 'cid10')
    .eq('ativo', true)
    .or(`codigo.ilike.${termo},descricao.ilike.${termo}`)
    .order('codigo', { ascending: true })
    .limit(20);
}

/** Busca um CID-10 específico por código exato */
export async function buscarCid10PorCodigo(codigo: string) {
  return getSupabase()
    .from('tabelas_auxiliares')
    .select('*')
    .eq('categoria', 'cid10')
    .eq('codigo', codigo)
    .maybeSingle();
}

/** Lista todos os CIDs ativos (para select/listagem) */
export async function listarCid10() {
  return getSupabase()
    .from('tabelas_auxiliares')
    .select('*')
    .eq('categoria', 'cid10')
    .eq('ativo', true)
    .order('codigo', { ascending: true });
}
