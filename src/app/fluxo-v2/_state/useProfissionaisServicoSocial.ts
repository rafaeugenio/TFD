'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  PROFISSIONAIS_SERVICO_SOCIAL_DEMO,
  type ProfissionalSocial,
} from '@/core/mocks/servico-social-seed';

/** Papel "Serviço Social" no catálogo de permissões (migration 00082). */
export const PAPEL_SERVICO_SOCIAL_ID = '00000000-0000-0000-0000-000000000008';

interface Resultado {
  profissionais: ProfissionalSocial[];
  isLoading: boolean;
  /** Mensagem pronta para a interface quando a leitura falha. */
  erro: string | null;
  /** `true` quando o banco não tem usuário com o perfil e a lista exibida é
   *  o fallback de demonstração. */
  demonstracao: boolean;
}

/**
 * Profissionais do Serviço Social: os usuários ativos com o perfil "Serviço
 * Social" (PBI 16409, RN09), sem lista fixa de nomes. Alimenta o seletor
 * "Profissional responsável" do drawer "Assumir demanda".
 *
 * Fallback de demonstração: enquanto nenhum usuário tiver o perfil no banco,
 * o seletor usa `PROFISSIONAIS_SERVICO_SOCIAL_DEMO` para a validação
 * presencial não travar. Nada é gravado na tabela `usuarios`.
 */
export function useProfissionaisServicoSocial(ativo = true): Resultado {
  const [estado, setEstado] = useState<Resultado>({
    profissionais: [],
    isLoading: true,
    erro: null,
    demonstracao: false,
  });

  useEffect(() => {
    if (!ativo) return;
    let cancelado = false;

    createClient()
      .from('usuarios')
      .select('id, nome_completo')
      .eq('papel_id', PAPEL_SERVICO_SOCIAL_ID)
      .eq('ativo', true)
      .order('nome_completo', { ascending: true })
      .then(({ data, error }) => {
        if (cancelado) return;
        if (error) {
          setEstado({
            profissionais: [],
            isLoading: false,
            erro: 'Não foi possível carregar as profissionais do Serviço Social.',
            demonstracao: false,
          });
          return;
        }
        const lista = (data ?? []).map((u) => ({ id: u.id, nome: u.nome_completo }));
        setEstado(
          lista.length > 0
            ? { profissionais: lista, isLoading: false, erro: null, demonstracao: false }
            : { profissionais: PROFISSIONAIS_SERVICO_SOCIAL_DEMO, isLoading: false, erro: null, demonstracao: true },
        );
      });

    return () => {
      cancelado = true;
    };
  }, [ativo]);

  return estado;
}
