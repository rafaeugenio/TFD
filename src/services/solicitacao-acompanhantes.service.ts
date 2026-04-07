import { createClient } from '@/lib/supabase/client';

function getSupabase() {
  return createClient();
}

export async function vincularAcompanhantes(
  solicitacaoId: string,
  acompanhanteIds: string[],
  principalId?: string,
) {
  const supabase = getSupabase();

  const rows = acompanhanteIds.map((acompanhanteId) => ({
    solicitacao_id: solicitacaoId,
    acompanhante_id: acompanhanteId,
    principal: acompanhanteId === principalId,
  }));

  return supabase
    .from('solicitacao_acompanhantes')
    .insert(rows as any)
    .select();
}

export async function listarPorSolicitacao(solicitacaoId: string) {
  const supabase = getSupabase();
  return supabase
    .from('solicitacao_acompanhantes')
    .select('*, acompanhantes(*)')
    .eq('solicitacao_id', solicitacaoId)
    .order('principal', { ascending: false });
}

export async function desvincularAcompanhante(
  solicitacaoId: string,
  acompanhanteId: string,
) {
  const supabase = getSupabase();
  return supabase
    .from('solicitacao_acompanhantes')
    .delete()
    .eq('solicitacao_id', solicitacaoId)
    .eq('acompanhante_id', acompanhanteId);
}

export async function atualizarPrincipal(
  solicitacaoId: string,
  acompanhanteId: string,
) {
  const supabase = getSupabase();

  await supabase
    .from('solicitacao_acompanhantes')
    .update({ principal: false } as any)
    .eq('solicitacao_id', solicitacaoId);

  return supabase
    .from('solicitacao_acompanhantes')
    .update({ principal: true } as any)
    .eq('solicitacao_id', solicitacaoId)
    .eq('acompanhante_id', acompanhanteId)
    .select()
    .single();
}
