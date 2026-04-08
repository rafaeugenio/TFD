'use client';

import { useState, useEffect, useRef } from 'react';
import { buscarCid10 } from '@/services/cid10.service';

interface Cid10Option {
  value: string;
  label: string;
  codigo: string;
  descricao: string;
}

// Cache em memória por termo de busca
const cache = new Map<string, { data: Cid10Option[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Hook com debounce para autocomplete de CID-10.
 * Busca da tabelas_auxiliares (categoria 'cid10') — gerenciada via Configurações.
 * Recebe `query` (string), retorna `{ options, isLoading }`.
 */
export function useCid10(query: string, debounceMs = 300) {
  const [options, setOptions] = useState<Cid10Option[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const termo = query.trim();

    if (termo.length < 2) {
      setOptions([]);
      setIsLoading(false);
      return;
    }

    // Verificar cache
    const cached = cache.get(termo);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setOptions(cached.data);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    // Debounce
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      const { data, error } = await buscarCid10(termo);
      if (!mountedRef.current) return;

      if (error || !data) {
        setOptions([]);
      } else {
        const rows = data as unknown as { codigo: string; descricao: string | null; nome: string }[];
        const mapped = rows.map((item) => ({
          value: item.codigo,
          label: `${item.codigo} — ${item.descricao || item.nome}`,
          codigo: item.codigo,
          descricao: item.descricao || item.nome,
        }));
        cache.set(termo, { data: mapped, ts: Date.now() });
        setOptions(mapped);
      }
      setIsLoading(false);
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, debounceMs]);

  return { options, isLoading };
}
