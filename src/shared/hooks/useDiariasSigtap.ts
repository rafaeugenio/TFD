'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const CODIGO_DIARIA_COMPLETA = '08.03.01.001-0';
const CODIGO_DIARIA_RETORNO = '08.03.01.002-8';

let cache: { completa: number; retorno: number; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

async function fetchDiarias() {
  const { data } = await createClient()
    .from('sigtap_procedimentos')
    .select('codigo, valor_unitario')
    .in('codigo', [CODIGO_DIARIA_COMPLETA, CODIGO_DIARIA_RETORNO]);
  const rows = (data ?? []) as Array<{ codigo: string; valor_unitario: string | number }>;
  const byCodigo = (codigo: string) => {
    const row = rows.find((r) => r.codigo === codigo);
    return row ? parseFloat(String(row.valor_unitario)) : 0;
  };
  return {
    completa: byCodigo(CODIGO_DIARIA_COMPLETA),
    retorno: byCodigo(CODIGO_DIARIA_RETORNO),
  };
}

export function useDiariasSigtap(): { completa: number; retorno: number; loading: boolean } {
  const [state, setState] = useState({ completa: 0, retorno: 0, loading: true });

  useEffect(() => {
    if (cache && Date.now() - cache.ts < CACHE_TTL) {
      setState({ completa: cache.completa, retorno: cache.retorno, loading: false });
      return;
    }
    fetchDiarias().then(({ completa, retorno }) => {
      cache = { completa, retorno, ts: Date.now() };
      setState({ completa, retorno, loading: false });
    });
  }, []);

  return state;
}

export function useDiariaCompleta(): { valor: number; loading: boolean } {
  const { completa, loading } = useDiariasSigtap();
  return { valor: completa, loading };
}

export function useDiariaRetorno(): { valor: number; loading: boolean } {
  const { retorno, loading } = useDiariasSigtap();
  return { valor: retorno, loading };
}
