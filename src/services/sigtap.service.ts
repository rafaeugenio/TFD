import { createClient } from '@/lib/supabase/client';
import type { SigtapProcedimento } from '@/core/models';

function getSupabase() {
  return createClient();
}

/** Lista todos os procedimentos SIGTAP ativos */
export async function listarSigtap(filtros?: {
  tipo?: 'ajuda_custo' | 'deslocamento';
  subtipo?: 'aereo' | 'terrestre' | 'fluvial';
  beneficiario?: 'paciente' | 'acompanhante';
}) {
  let query = getSupabase()
    .from('sigtap_procedimentos')
    .select('*')
    .eq('ativo', true)
    .order('codigo', { ascending: true });

  if (filtros?.tipo) {
    query = query.eq('tipo', filtros.tipo);
  }
  if (filtros?.subtipo) {
    query = query.eq('subtipo', filtros.subtipo);
  }
  if (filtros?.beneficiario) {
    query = query.eq('beneficiario', filtros.beneficiario);
  }

  return query;
}

/** Lista todos (admin, inclusive inativos) */
export async function listarSigtapAdmin() {
  return getSupabase()
    .from('sigtap_procedimentos')
    .select('*')
    .order('codigo', { ascending: true });
}

/** Busca procedimento por ID */
export async function buscarSigtap(id: number) {
  return getSupabase()
    .from('sigtap_procedimentos')
    .select('*')
    .eq('id', id)
    .single();
}

/** Cria novo procedimento SIGTAP */
export async function criarSigtap(data: Omit<SigtapProcedimento, 'id' | 'ativo'>) {
  return getSupabase()
    .from('sigtap_procedimentos')
    .insert(data)
    .select()
    .single();
}

/** Atualiza procedimento SIGTAP */
export async function atualizarSigtap(id: number, data: Partial<SigtapProcedimento>) {
  return getSupabase()
    .from('sigtap_procedimentos')
    .update(data)
    .eq('id', id)
    .select()
    .single();
}

/** Desativa procedimento SIGTAP (soft delete) */
export async function desativarSigtap(id: number) {
  return getSupabase()
    .from('sigtap_procedimentos')
    .update({ ativo: false })
    .eq('id', id)
    .select()
    .single();
}
