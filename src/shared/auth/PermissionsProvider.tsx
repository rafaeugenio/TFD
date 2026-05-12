'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

/* -------------------------------------------------------------------------- */
/*  Tipos                                                                     */
/* -------------------------------------------------------------------------- */

interface SessionUser {
  id: string;
  nome_completo: string;
  email: string;
  cpf: string;
  perfil: string;
  is_admin: boolean;
  papel_id: string | null;
  ativo: boolean;
}

interface PermissionsContextValue {
  /** Usuário autenticado + dados da tabela usuarios. `null` enquanto carrega. */
  user: SessionUser | null;
  /** `true` enquanto a sessão e/ou as permissões ainda estão carregando. */
  isLoading: boolean;
  /** Atalho: o usuário é admin master. */
  isAdmin: boolean;
  /**
   * Verifica se o usuário pode executar uma ação numa tela.
   * Aceita `"tela.acao"` (formato dot) ou `"tela.acao"` em snake_case combinados.
   * Admin master sempre retorna true.
   */
  can: (permission: string) => boolean;
  /** Conjunto de chaves `"tela.acao"` que o user tem permissão. */
  permissions: Set<string>;
  /** Recarrega permissões (útil após alterar papel do usuário). */
  refresh: () => Promise<void>;
}

/* -------------------------------------------------------------------------- */
/*  Context                                                                   */
/* -------------------------------------------------------------------------- */

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        setUser(null);
        setPermissions(new Set());
        return;
      }

      const { data: row } = await supabase
        .from('usuarios')
        .select('id, nome_completo, email, cpf, perfil, is_admin, papel_id, ativo')
        .eq('id', authUser.id)
        .maybeSingle();

      if (!row) {
        setUser(null);
        setPermissions(new Set());
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = row as any;
      const sessionUser: SessionUser = {
        id: r.id,
        nome_completo: r.nome_completo,
        email: r.email,
        cpf: r.cpf,
        perfil: r.perfil,
        is_admin: r.is_admin === true,
        papel_id: r.papel_id,
        ativo: r.ativo !== false,
      };
      setUser(sessionUser);

      // Admin master não precisa carregar permissões.
      if (sessionUser.is_admin) {
        setPermissions(new Set());
        return;
      }

      if (!sessionUser.papel_id) {
        setPermissions(new Set());
        return;
      }

      const { data: perms } = await supabase
        .from('papel_tela_acoes')
        .select('tela_id, acao')
        .eq('papel_id', sessionUser.papel_id);

      const acc = new Set<string>();
      for (const p of (perms ?? []) as Array<{ tela_id: string; acao: string }>) {
        acc.add(`${p.tela_id}.${p.acao}`);
      }
      setPermissions(acc);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Reage a login/logout em outra aba.
    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      load();
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const can = useCallback(
    (permission: string) => {
      if (!user) return false;
      if (user.is_admin) return true;
      return permissions.has(permission);
    },
    [user, permissions],
  );

  const value = useMemo<PermissionsContextValue>(
    () => ({
      user,
      isLoading,
      isAdmin: user?.is_admin === true,
      can,
      permissions,
      refresh: load,
    }),
    [user, isLoading, can, permissions, load],
  );

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions(): PermissionsContextValue {
  const ctx = useContext(PermissionsContext);
  if (!ctx) throw new Error('usePermissions must be used within PermissionsProvider');
  return ctx;
}
