'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Generic hook for fetching data from Supabase services.
 * Returns data, loading state, total count, error, and a refresh function.
 *
 * Usage:
 *   const { data, loading, count, refresh } = useSupabaseData(
 *     () => listarSolicitacoes({ status, search, page }),
 *     [status, search, page]
 *   );
 */
export function useSupabaseData<T>(
  fetcher: () => Promise<{ data: T[] | null; error: unknown; count?: number | null }>,
  deps: unknown[] = [],
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (!mountedRef.current) return;
      if (result.error) {
        const err = result.error as { message?: string };
        setError(err.message ?? 'Erro ao carregar dados');
        setData([]);
        setCount(0);
      } else {
        setData((result.data ?? []) as T[]);
        setCount(result.count ?? result.data?.length ?? 0);
      }
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      const e = err as { message?: string };
      setError(e.message ?? 'Erro inesperado');
      setData([]);
      setCount(0);
    }
    if (mountedRef.current) setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    return () => {
      mountedRef.current = false;
    };
  }, [refresh]);

  return { data, loading, count, error, refresh };
}
