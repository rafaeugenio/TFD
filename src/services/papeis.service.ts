import { createClient } from '@/lib/supabase/client';

function getSupabase() {
  return createClient();
}

export interface Papel {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  created_at: string;
  updated_at: string;
  telas?: string[];
  usuario_count?: number;
}

export interface TelaSistema {
  id: string;
  nome: string;
  modulo: string;
  rota: string;
  ordem: number;
}

export async function listarPapeis() {
  return getSupabase()
    .from('papeis')
    .select('*')
    .order('nome');
}

export async function buscarPapel(id: string) {
  return getSupabase()
    .from('papeis')
    .select('*')
    .eq('id', id)
    .single();
}

export async function criarPapel(data: { nome: string; descricao?: string; cor?: string }) {
  return getSupabase()
    .from('papeis')
    .insert(data)
    .select()
    .single();
}

export async function atualizarPapel(id: string, data: { nome?: string; descricao?: string; cor?: string }) {
  return getSupabase()
    .from('papeis')
    .update(data)
    .eq('id', id)
    .select()
    .single();
}

export async function excluirPapel(id: string) {
  return getSupabase().from('papeis').delete().eq('id', id);
}

export async function listarTelas() {
  return getSupabase()
    .from('telas_sistema')
    .select('*')
    .order('modulo')
    .order('ordem');
}

export async function listarTelasDoPapel(papelId: string) {
  return getSupabase()
    .from('papel_telas')
    .select('tela_id')
    .eq('papel_id', papelId);
}

export async function salvarTelasDoPapel(papelId: string, telaIds: string[]) {
  const supabase = getSupabase();
  // Remove all existing
  await supabase.from('papel_telas').delete().eq('papel_id', papelId);
  // Insert new
  if (telaIds.length > 0) {
    const rows = telaIds.map((tela_id) => ({ papel_id: papelId, tela_id }));
    return supabase.from('papel_telas').insert(rows);
  }
  return { data: null, error: null };
}

export async function contarUsuariosPorPapel() {
  return getSupabase()
    .from('usuarios')
    .select('papel_id')
    .not('papel_id', 'is', null);
}

// Convites
export async function buscarCodigoAtivo() {
  return getSupabase()
    .from('codigos_convite')
    .select('*')
    .eq('ativo', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
}

export async function regenerarCodigo() {
  const supabase = getSupabase();
  // Desativar todos os anteriores
  await supabase.from('codigos_convite').update({ ativo: false }).eq('ativo', true);
  // Gerar novo
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const part = (len: number) => Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const codigo = `${part(6)}-${part(6)}`;
  return supabase.from('codigos_convite').insert({ codigo, ativo: true }).select().single();
}
