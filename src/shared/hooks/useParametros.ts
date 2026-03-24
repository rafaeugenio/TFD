'use client';

import { useState, useEffect } from 'react';
import { listarParametros, type Parametro } from '@/services/parametros.service';

let parametrosCache: { data: Parametro[]; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export function useParametros() {
  const [parametros, setParametros] = useState<Parametro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (parametrosCache && Date.now() - parametrosCache.ts < CACHE_TTL) {
      setParametros(parametrosCache.data);
      setLoading(false);
      return;
    }

    listarParametros().then(({ data, error }) => {
      if (!error && data) {
        const rows = data as unknown as Parametro[];
        parametrosCache = { data: rows, ts: Date.now() };
        setParametros(rows);
      }
      setLoading(false);
    });
  }, []);

  return { parametros, loading };
}

export function useParametro(chave: string): { valor: string | null; loading: boolean } {
  const { parametros, loading } = useParametros();
  const param = parametros.find((p) => p.chave === chave);
  return { valor: param?.valor ?? null, loading };
}

export function useParametroNumero(chave: string): { valor: number; loading: boolean } {
  const { valor, loading } = useParametro(chave);
  return { valor: valor ? parseFloat(valor) : 0, loading };
}

export function useParametroBooleano(chave: string): { valor: boolean; loading: boolean } {
  const { valor, loading } = useParametro(chave);
  return { valor: valor === 'true', loading };
}

export function invalidateParametrosCache() {
  parametrosCache = null;
}
