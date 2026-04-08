'use client';

import { useState, useEffect, useRef } from 'react';
import { listarMedicos } from '@/services/medicos.service';
import type { Medico } from '@/core/models';

interface MedicoOption {
  value: string;
  label: string;
  crm: string;
  crm_uf: string;
  especialidade?: string;
  nome_completo: string;
}

// Cache em memória
const cache = new Map<string, { data: MedicoOption[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

/**
 * Hook para listar e buscar médicos.
 * Retorna `{ options: {value, label, crm, crm_uf, especialidade, nome_completo}[], isLoading }`.
 */
export function useMedicos(search = '') {
  const [options, setOptions] = useState<MedicoOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const cacheKey = `medicos_${search}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setOptions(cached.data);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    listarMedicos({ search: search || undefined, pageSize: 50 }).then(({ data, error }) => {
      if (!mountedRef.current) return;

      if (error || !data) {
        setOptions([]);
      } else {
        const rows = data as unknown as Medico[];
        const mapped = rows.map((m) => ({
          value: m.id,
          label: `${m.nome_completo} — CRM ${m.crm}/${m.crm_uf}`,
          crm: m.crm,
          crm_uf: m.crm_uf,
          especialidade: m.especialidade,
          nome_completo: m.nome_completo,
        }));
        cache.set(cacheKey, { data: mapped, ts: Date.now() });
        setOptions(mapped);
      }
      setIsLoading(false);
    });
  }, [search]);

  return { options, isLoading };
}
