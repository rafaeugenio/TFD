import { createClient } from '@/lib/supabase/client';
import type { RegionalSaude } from '@/core/models/regional-saude.model';

function getSupabase() {
  return createClient();
}

/** Lista regionais ativas com busca por nome ou código */
export async function listarRegionaisSaude(filters?: {
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  let query = getSupabase()
    .from('regionais_saude')
    .select('*', { count: 'exact' })
    .eq('ativo', true)
    .order('ordem', { ascending: true });

  if (filters?.search) {
    query = query.or(
      `nome.ilike.%${filters.search}%,codigo.ilike.%${filters.search}%,municipio_sede.ilike.%${filters.search}%`,
    );
  }

  const page = filters?.page ?? 1;
  const size = filters?.pageSize ?? 10;
  query = query.range((page - 1) * size, page * size - 1);

  return query;
}

/** Lista todas (inclusive inativas) */
export async function listarRegionaisSaudeAdmin(filters?: { search?: string }) {
  let query = getSupabase()
    .from('regionais_saude')
    .select('*', { count: 'exact' })
    .order('ordem', { ascending: true });

  if (filters?.search) {
    query = query.or(
      `nome.ilike.%${filters.search}%,codigo.ilike.%${filters.search}%`,
    );
  }

  return query;
}

/** Busca regional por ID */
export async function buscarRegionalSaude(id: string) {
  return getSupabase()
    .from('regionais_saude')
    .select('*')
    .eq('id', id)
    .single();
}

/** Busca por código (validação de unicidade) */
export async function buscarPorCodigo(codigo: string) {
  return getSupabase()
    .from('regionais_saude')
    .select('*')
    .eq('codigo', codigo)
    .maybeSingle();
}

/** Cria nova regional */
export async function criarRegionalSaude(
  data: Omit<RegionalSaude, 'id' | 'created_at' | 'updated_at'>,
) {
  return getSupabase()
    .from('regionais_saude')
    .insert(data)
    .select()
    .single();
}

/** Atualiza regional */
export async function atualizarRegionalSaude(id: string, data: Partial<RegionalSaude>) {
  return getSupabase()
    .from('regionais_saude')
    .update(data)
    .eq('id', id)
    .select()
    .single();
}

/** Desativa regional (soft delete) */
export async function desativarRegionalSaude(id: string) {
  return getSupabase()
    .from('regionais_saude')
    .update({ ativo: false })
    .eq('id', id)
    .select()
    .single();
}

/** Lista municípios vinculados a uma regional */
export async function listarMunicipiosPorRegional(regionalId: string) {
  return getSupabase()
    .from('regionais_saude_municipios')
    .select('*')
    .eq('regional_saude_id', regionalId)
    .order('municipio_nome', { ascending: true });
}

/** Substitui todos os municípios de uma regional */
export async function atualizarMunicipiosRegional(
  regionalId: string,
  municipioNomes: string[],
) {
  const supabase = getSupabase();

  const { error: delError } = await supabase
    .from('regionais_saude_municipios')
    .delete()
    .eq('regional_saude_id', regionalId);

  if (delError) return { error: delError };

  if (municipioNomes.length === 0) return { error: null };

  return supabase
    .from('regionais_saude_municipios')
    .insert(
      municipioNomes.map((nome) => ({
        regional_saude_id: regionalId,
        municipio_nome: nome,
      })),
    );
}

/** Busca regional pelo nome do município (para CEP autofill) */
export async function buscarRegionalPorMunicipio(municipioNome: string) {
  return getSupabase()
    .from('regionais_saude_municipios')
    .select('regional_saude_id, regionais_saude(id, codigo, nome)')
    .ilike('municipio_nome', municipioNome)
    .maybeSingle();
}

/** Lista solicitações ativas vinculadas à regional via agendamentos */
export async function listarSolicitacoesPorRegional(regionalId: string) {
  return getSupabase()
    .from('agendamentos')
    .select('solicitacao_id, solicitacoes(*, pacientes(nome_completo))')
    .eq('unidades_destino.regional_saude_id', regionalId)
    .order('created_at', { ascending: false });
}
