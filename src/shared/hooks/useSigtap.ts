'use client';

import { useState, useEffect, useRef } from 'react';
import { listarSigtap } from '@/services/sigtap.service';
import type { SigtapProcedimento } from '@/core/models';

interface SigtapOption {
  value: number;
  label: string;
  codigo: string;
  tipo: string;
  subtipo?: string;
  beneficiario: string;
  valor_unitario: number;
  unidade_medida?: string;
  cnrac: boolean;
}

// Cache em memória
let sigtapCache: { data: SigtapOption[]; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Hook para listar procedimentos SIGTAP.
 * Filtro opcional por tipo e beneficiário.
 */
export function useSigtap(filtros?: {
  tipo?: 'ajuda_custo' | 'deslocamento';
  subtipo?: 'aereo' | 'terrestre' | 'fluvial';
  beneficiario?: 'paciente' | 'acompanhante';
}) {
  const [options, setOptions] = useState<SigtapOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    // Sem filtros, usar cache global
    if (!filtros?.tipo && !filtros?.subtipo && !filtros?.beneficiario) {
      if (sigtapCache && Date.now() - sigtapCache.ts < CACHE_TTL) {
        setOptions(sigtapCache.data);
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(true);

    listarSigtap(filtros).then(({ data, error }) => {
      if (!mountedRef.current) return;

      if (error || !data) {
        setOptions([]);
      } else {
        const rows = data as unknown as SigtapProcedimento[];
        const mapped = rows.map((p) => ({
          value: p.id,
          label: `${p.codigo} — ${p.descricao}`,
          codigo: p.codigo,
          tipo: p.tipo,
          subtipo: p.subtipo,
          beneficiario: p.beneficiario,
          valor_unitario: p.valor_unitario,
          unidade_medida: p.unidade_medida,
          cnrac: p.cnrac,
        }));

        if (!filtros?.tipo && !filtros?.subtipo && !filtros?.beneficiario) {
          sigtapCache = { data: mapped, ts: Date.now() };
        }
        setOptions(mapped);
      }
      setIsLoading(false);
    });
  }, [filtros?.tipo, filtros?.subtipo, filtros?.beneficiario]);

  return { options, isLoading };
}
