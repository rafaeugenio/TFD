import { createClient } from '@/lib/supabase/client';
import type { InsertDTO, UpdateDTO } from '@/lib/supabase/database.types';

function getSupabase() {
  return createClient();
}

export async function listarPorPaciente(pacienteId: string) {
  const supabase = getSupabase();
  return supabase
    .from('acompanhantes')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('created_at', { ascending: true });
}

export async function buscarAcompanhante(id: string) {
  const supabase = getSupabase();
  return supabase.from('acompanhantes').select('*').eq('id', id).single();
}

export async function criarAcompanhante(data: InsertDTO<'acompanhantes'>) {
  const supabase = getSupabase();
  return supabase.from('acompanhantes').insert(data).select().single();
}

export async function atualizarAcompanhante(
  id: string,
  data: UpdateDTO<'acompanhantes'>,
) {
  const supabase = getSupabase();
  return supabase
    .from('acompanhantes')
    .update(data)
    .eq('id', id)
    .select()
    .single();
}

export async function excluirAcompanhante(id: string) {
  const supabase = getSupabase();

  const { data: vinculos } = await verificarVinculoSolicitacao(id);
  if (vinculos && vinculos.length > 0) {
    return {
      data: null,
      error: {
        message:
          'Acompanhante vinculado a uma ou mais solicitações ativas. Desvincule antes de excluir.',
        code: 'VINCULO_ATIVO',
      },
    };
  }

  return supabase.from('acompanhantes').delete().eq('id', id);
}

export async function verificarVinculoSolicitacao(acompanhanteId: string) {
  const supabase = getSupabase();
  return supabase
    .from('solicitacao_acompanhantes')
    .select('id, solicitacao_id')
    .eq('acompanhante_id', acompanhanteId);
}
