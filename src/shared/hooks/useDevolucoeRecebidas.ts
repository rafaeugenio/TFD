'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SetorTFD } from '@/lib/supabase/database.types';
import { listarDevolucoesPendentes } from '@/services/devolucoes.service';

export interface DevolucaoRecebida {
  id: string;
  solicitacao_id: string;
  setor_origem: SetorTFD;
  setor_destino: SetorTFD;
  motivo: string;
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
 * Hook that fetches active devoluções sent TO this setor (received returns).
 * Returns a Map<solicitacao_id, DevolucaoRecebida> for fast lookup in tables,
 * plus a helper to get a human-readable label of the ORIGIN setor.
 */
export function useDevolucoeRecebidas(setorDestino: SetorTFD) {
  const [mapa, setMapa] = useState<Map<string, DevolucaoRecebida>>(new Map());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    listarDevolucoesPendentes(setorDestino).then(({ data }) => {
      const m = new Map<string, DevolucaoRecebida>();
      if (data) {
        for (const d of data as DevolucaoRecebida[]) {
          if (!m.has(d.solicitacao_id)) {
            m.set(d.solicitacao_id, d);
          }
        }
      }
      setMapa(m);
      setLoading(false);
    });
  }, [setorDestino]);

  useEffect(() => { refresh(); }, [refresh]);

  function labelOrigem(solicitacaoId: string): string | null {
    const d = mapa.get(solicitacaoId);
    if (!d) return null;
    return SETOR_LABELS[d.setor_origem] ?? d.setor_origem;
  }

  return { mapa, loading, refresh, labelOrigem };
}
