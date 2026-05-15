'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface CurrentUser {
  id: string;
  nome: string;
  perfil: string;
  iniciais: string;
  email: string;
  /** Campos profissionais usados quando o usuário emite parecer médico. */
  crm?: string;
  crmUf?: string;
  especialidadeMedica?: string;
}

/**
 * Hook que retorna o usuário autenticado no sistema.
 * Usa Supabase Auth para obter a sessão e busca os dados na tabela usuarios.
 */
export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      // Get authenticated user from Supabase Auth
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        setLoading(false);
        return;
      }

      // Fetch the corresponding usuarios record (inclui dados profissionais para parecer)
      const { data } = await supabase
        .from('usuarios')
        .select('id, nome_completo, perfil, email, crm, crm_uf, especialidade_medica')
        .eq('id', authUser.id)
        .single();

      if (data) {
        const row = data as Record<string, unknown>;
        const nome = (row.nome_completo as string) ?? 'Usuário';
        const partes = nome.split(' ');
        const iniciais = partes.length >= 2
          ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
          : nome.slice(0, 2).toUpperCase();

        setUser({
          id: row.id as string,
          nome,
          perfil: (row.perfil as string) ?? 'ATENDENTE_MUNICIPAL',
          iniciais,
          email: (row.email as string) ?? authUser.email ?? '',
          crm: (row.crm as string | null) ?? undefined,
          crmUf: (row.crm_uf as string | null) ?? undefined,
          especialidadeMedica: (row.especialidade_medica as string | null) ?? undefined,
        });
      }

      setLoading(false);
    }

    loadUser();

    // Listen for auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          setUser(null);
        }
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
