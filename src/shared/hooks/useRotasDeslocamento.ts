'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { buscarRota, calcularProcedimentos } from '@/services/rotas-deslocamento.service';
import type { RotaDeslocamento } from '@/core/models';

interface CalculoProcedimentos {
  quantidade: number;
  distancia: number;
  unidade: string;
}

interface RotaResult {
  rota: RotaDeslocamento | null;
  calculo: CalculoProcedimentos | null;
  encontrada: boolean;
}

/**
 * Hook para buscar rotas de deslocamento.
 * Recebe origem + destino, retorna distâncias e cálculo de procedimentos.
 */
export function useRotasDeslocamento() {
  const [resultado, setResultado] = useState<RotaResult>({
    rota: null,
    calculo: null,
    encontrada: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const buscar = useCallback(
    async (
      cidadeOrigem: string,
      ufOrigem: string,
      cidadeDestino: string,
      ufDestino: string,
      modal?: 'aereo' | 'terrestre' | 'fluvial',
    ) => {
      setIsLoading(true);

      const { data, error } = await buscarRota(cidadeOrigem, ufOrigem, cidadeDestino, ufDestino);

      if (!mountedRef.current) return;

      if (error || !data) {
        setResultado({ rota: null, calculo: null, encontrada: false });
      } else {
        const rota = data as unknown as RotaDeslocamento;
        const calculo = modal ? calcularProcedimentos(rota, modal) : null;
        setResultado({ rota, calculo, encontrada: true });
      }
      setIsLoading(false);
    },
    [],
  );

  const limpar = useCallback(() => {
    setResultado({ rota: null, calculo: null, encontrada: false });
  }, []);

  return { ...resultado, isLoading, buscar, limpar };
}
