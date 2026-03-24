import { createClient } from '@/lib/supabase/client';

function getSupabase() {
  return createClient();
}

export interface Parametro {
  id: string;
  grupo: string;
  chave: string;
  valor: string;
  tipo: string;
  label: string;
  descricao: string | null;
  editavel: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export async function listarParametros() {
  return getSupabase()
    .from('parametros_sistema')
    .select('*')
    .order('grupo')
    .order('ordem');
}

export async function listarParametrosPorGrupo(grupo: string) {
  return getSupabase()
    .from('parametros_sistema')
    .select('*')
    .eq('grupo', grupo)
    .order('ordem');
}

export async function atualizarParametro(id: string, valor: string) {
  return getSupabase()
    .from('parametros_sistema')
    .update({ valor, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
}

export async function buscarParametro(chave: string) {
  return getSupabase()
    .from('parametros_sistema')
    .select('*')
    .eq('chave', chave)
    .single();
}

export async function criarParametro(data: {
  grupo: string;
  chave: string;
  valor: string;
  tipo: string;
  label: string;
  descricao?: string;
  ordem?: number;
}) {
  return getSupabase()
    .from('parametros_sistema')
    .insert(data)
    .select()
    .single();
}

export async function excluirParametro(id: string) {
  return getSupabase()
    .from('parametros_sistema')
    .delete()
    .eq('id', id);
}
