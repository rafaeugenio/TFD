import { createClient } from '@/lib/supabase/client';
import type { ModalTransporte } from '@/lib/supabase/database.types';

function getSupabase() {
  return createClient();
}

export interface TabelaAuxiliar {
  id: string;
  categoria: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  ordem: number;
  created_at: string;
  updated_at: string;
}

export interface UnidadeDestino {
  id: string;
  nome: string;
  cnes: string | null;
  cidade: string;
  uf: string;
  tipo: string | null;
  contato_nome: string | null;
  contato_telefone: string | null;
  contato_email: string | null;
  endereco: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompanhiaTransporte {
  id: string;
  nome: string;
  tipo_modal: ModalTransporte;
  cnpj: string | null;
  contato: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

// ─── TABELAS AUXILIARES (genérica) ──────────────────────────

export async function listarPorCategoria(categoria: string) {
  return getSupabase()
    .from('tabelas_auxiliares')
    .select('*')
    .eq('categoria', categoria)
    .eq('ativo', true)
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true });
}

/** Admin: lista todos os itens de uma categoria (inclusive inativos) */
export async function listarPorCategoriaAdmin(categoria: string) {
  return getSupabase()
    .from('tabelas_auxiliares')
    .select('*')
    .eq('categoria', categoria)
    .order('ordem', { ascending: true })
    .order('nome', { ascending: true });
}

export async function listarTodasCategorias() {
  return getSupabase()
    .from('tabelas_auxiliares')
    .select('*')
    .order('categoria', { ascending: true })
    .order('ordem', { ascending: true });
}

export async function criarItemAuxiliar(data: {
  categoria: string;
  codigo: string;
  nome: string;
  descricao?: string;
  ordem?: number;
}) {
  return getSupabase()
    .from('tabelas_auxiliares')
    .insert(data)
    .select()
    .single();
}

export async function atualizarItemAuxiliar(
  id: string,
  data: { nome?: string; descricao?: string; ativo?: boolean; ordem?: number; codigo?: string },
) {
  return getSupabase()
    .from('tabelas_auxiliares')
    .update(data)
    .eq('id', id)
    .select()
    .single();
}

export async function excluirItemAuxiliar(id: string) {
  return getSupabase()
    .from('tabelas_auxiliares')
    .delete()
    .eq('id', id);
}

// ─── UNIDADES DE DESTINO ────────────────────────────────────

export async function listarUnidadesDestino() {
  return getSupabase()
    .from('unidades_destino')
    .select('*')
    .eq('ativo', true)
    .order('nome', { ascending: true });
}

/** Admin: lista todas as unidades (inclusive inativas) */
export async function listarUnidadesDestinoAdmin() {
  return getSupabase()
    .from('unidades_destino')
    .select('*')
    .order('nome', { ascending: true });
}

export async function criarUnidadeDestino(data: Omit<UnidadeDestino, 'id' | 'created_at' | 'updated_at'>) {
  return getSupabase()
    .from('unidades_destino')
    .insert(data)
    .select()
    .single();
}

export async function atualizarUnidadeDestino(id: string, data: Partial<UnidadeDestino>) {
  return getSupabase()
    .from('unidades_destino')
    .update(data)
    .eq('id', id)
    .select()
    .single();
}

export async function excluirUnidadeDestino(id: string) {
  return getSupabase()
    .from('unidades_destino')
    .delete()
    .eq('id', id);
}

// ─── COMPANHIAS DE TRANSPORTE ───────────────────────────────

export async function listarCompanhias() {
  return getSupabase()
    .from('companhias_transporte')
    .select('*')
    .eq('ativo', true)
    .order('nome', { ascending: true });
}

/** Admin: lista todas as companhias (inclusive inativas) */
export async function listarCompanhiasAdmin() {
  return getSupabase()
    .from('companhias_transporte')
    .select('*')
    .order('nome', { ascending: true });
}

export async function criarCompanhia(data: Omit<CompanhiaTransporte, 'id' | 'created_at' | 'updated_at'>) {
  return getSupabase()
    .from('companhias_transporte')
    .insert(data)
    .select()
    .single();
}

export async function atualizarCompanhia(id: string, data: Partial<CompanhiaTransporte>) {
  return getSupabase()
    .from('companhias_transporte')
    .update(data)
    .eq('id', id)
    .select()
    .single();
}

export async function excluirCompanhia(id: string) {
  return getSupabase()
    .from('companhias_transporte')
    .delete()
    .eq('id', id);
}
