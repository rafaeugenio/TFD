'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SetorTFD } from '@/lib/supabase/database.types';
import { listarDevolucoesEnviadas } from '@/services/devolucoes.service';

export interface DevolucaoEnviada {
  id: string;
  solicitacao_id: string;
  setor_destino: SetorTFD;
  status_devolucao: string;
  urgencia: string;
  created_at: string;
}

const SETOR_LABELS: Record<SetorTFD, string> = {
  SOLICITACOES: 'Solicitações',
  DIAGNOSTICO_CLINICO: 'Diag. Clínico',
  PARECER_MEDICO: 'Parecer Médico',
  REGULACAO: 'Regulação',
  AGENDAMENTO: 'Agendamento',
  PASSAGENS: 'Viagens',
  AJUDA_CUSTO: 'Ajuda de Custo',
  PERMANENCIA: 'Permanência',
  ENCERRAMENTO: 'Encerramento',
};

/**
 * Hook that fetches active devoluções sent FROM this setor.
 * Returns a Map<solicitacao_id, DevolucaoEnviada> for fast lookup in tables,
 * plus a helper to get a human-readable label.
 */
export function useDevolucoesPendentes(setorOrigem: SetorTFD) {
  const [mapa, setMapa] = useState<Map<string, DevolucaoEnviada>>(new Map());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    listarDevolucoesEnviadas(setorOrigem).then(({ data }) => {
      const m = new Map<string, DevolucaoEnviada>();
      if (data) {
        for (const d of data as DevolucaoEnviada[]) {
          // Keep only the most recent per solicitação
          if (!m.has(d.solicitacao_id)) {
            m.set(d.solicitacao_id, d);
          }
        }
      }
      setMapa(m);
      setLoading(false);
    });
  }, [setorOrigem]);

  useEffect(() => { refresh(); }, [refresh]);

  function labelDestino(solicitacaoId: string): string | null {
    const d = mapa.get(solicitacaoId);
    if (!d) return null;
    return SETOR_LABELS[d.setor_destino] ?? d.setor_destino;
  }

  return { mapa, loading, refresh, labelDestino };
}
