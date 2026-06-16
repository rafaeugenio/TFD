import { createClient } from '@/lib/supabase/client';
import type { RepresentanteDespacho } from '@/core/despacho/representantes';

function getSupabase() {
  return createClient();
}

export async function buscarPorSolicitacao(solicitacaoId: string) {
  return getSupabase()
    .from('despachos_financeiros')
    .select('*')
    .eq('solicitacao_id', solicitacaoId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function buscarPorId(id: string) {
  return getSupabase()
    .from('despachos_financeiros')
    .select('*')
    .eq('id', id)
    .maybeSingle();
}

export async function criarDespacho(data: {
  solicitacao_id: string;
  numero_sei?: string | null;
  texto_despacho?: string | null;
  observacoes?: string | null;
  representantes?: RepresentanteDespacho[] | null;
}) {
  return getSupabase()
    .from('despachos_financeiros')
    .insert(data)
    .select()
    .single();
}

export async function atualizarDespacho(id: string, patch: {
  numero_sei?: string | null;
  texto_despacho?: string | null;
  observacoes?: string | null;
  representantes?: RepresentanteDespacho[] | null;
}) {
  return getSupabase()
    .from('despachos_financeiros')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
}
