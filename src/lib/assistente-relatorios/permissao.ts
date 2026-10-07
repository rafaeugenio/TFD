import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Checagem no servidor: usuário autenticado e com acesso à tela Relatórios
 * (administrador ou papel com `tela.relatorios.visualizar`). Mesma regra do
 * gate de rota do cliente, repetida aqui porque o endpoint não pode confiar
 * no navegador.
 */
export const PERMISSAO_RELATORIOS = 'tela.relatorios.visualizar';

export type Acesso = { ok: true; usuarioId: string } | { ok: false; status: 401 | 403 };

export async function verificarAcessoRelatorios(sb: SupabaseClient): Promise<Acesso> {
  const { data: auth } = await sb.auth.getUser();
  const user = auth?.user;
  if (!user) return { ok: false, status: 401 };

  const { data: linha } = await sb.from('usuarios').select('is_admin, papel_id, ativo').eq('id', user.id).maybeSingle();
  const u = linha as { is_admin?: boolean; papel_id?: string | null; ativo?: boolean } | null;
  if (!u || u.ativo === false) return { ok: false, status: 403 };
  if (u.is_admin) return { ok: true, usuarioId: user.id };
  if (!u.papel_id) return { ok: false, status: 403 };

  const { data: perm } = await sb
    .from('papel_permissoes')
    .select('permissao_id')
    .eq('papel_id', u.papel_id)
    .eq('permissao_id', PERMISSAO_RELATORIOS)
    .maybeSingle();
  return perm ? { ok: true, usuarioId: user.id } : { ok: false, status: 403 };
}

/* Limite simples por usuário (memória do processo): evita rajadas que
   gastariam a cota das APIs. Em produção, trocar por um limitador
   compartilhado (ex.: Redis) se houver mais de uma instância. */
const JANELA_MS = 60_000;
const MAX_POR_JANELA = 12;
const chamadas = new Map<string, number[]>();

export function dentroDoLimite(usuarioId: string, agora = Date.now()): boolean {
  const recentes = (chamadas.get(usuarioId) ?? []).filter((t) => agora - t < JANELA_MS);
  if (recentes.length >= MAX_POR_JANELA) {
    chamadas.set(usuarioId, recentes);
    return false;
  }
  recentes.push(agora);
  chamadas.set(usuarioId, recentes);
  return true;
}
