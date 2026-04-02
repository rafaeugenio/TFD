'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface CurrentUser {
  id: string;
  nome: string;
  perfil: string;
  iniciais: string;
  email: string;
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

      // Fetch the corresponding usuarios record
      const { data } = await supabase
        .from('usuarios')
        .select('id, nome_completo, perfil, email')
        .eq('id', authUser.id)
        .single();

      if (data) {
        const nome = data.nome_completo ?? 'Usuário';
        const partes = nome.split(' ');
        const iniciais = partes.length >= 2
          ? (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
          : nome.slice(0, 2).toUpperCase();

        setUser({
          id: data.id,
          nome,
          perfil: data.perfil ?? 'ATENDENTE_MUNICIPAL',
          iniciais,
          email: data.email ?? authUser.email ?? '',
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
