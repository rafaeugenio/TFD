'use client';

import { useState, useEffect } from 'react';
import { listarPorCategoria } from '@/services/tabelas-auxiliares.service';
import type { TabelaAuxiliar } from '@/services/tabelas-auxiliares.service';
import type { TipoSistemaViagem } from '@/lib/supabase/database.types';

export interface StatusOperacional {
  id: string;
  codigo: string;
  nome: string;
  tipoSistema: TipoSistemaViagem | null;
  ordem: number;
}

const CATEGORIA = 'situacao_viagem_operacional';

/**
 * Hook que busca os status operacionais de viagem da tabela auxiliar.
 * Cada status tem um `tipoSistema` que mapeia para o enum fixo do sistema,
 * permitindo que o usuário crie nomes customizados mas o sistema saiba
 * qual auto-transition disparar.
 */
export function useStatusOperacional() {
  const [options, setOptions] = useState<StatusOperacional[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    listarPorCategoria(CATEGORIA).then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data) {
        setOptions([]);
      } else {
        const rows = data as unknown as (TabelaAuxiliar & { tipo_sistema?: string })[];
        setOptions(
          rows.map((item) => ({
            id: item.id,
            codigo: item.codigo,
            nome: item.nome,
            tipoSistema: (item.tipo_sistema as TipoSistemaViagem) ?? null,
            ordem: item.ordem,
          })),
        );
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, []);

  return { options, loading };
}
