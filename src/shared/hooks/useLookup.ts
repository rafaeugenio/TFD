'use client';

import { useState, useEffect } from 'react';
import { listarPorCategoria, listarUnidadesDestino, listarCompanhias } from '@/services/tabelas-auxiliares.service';
import type { TabelaAuxiliar, UnidadeDestino, CompanhiaTransporte } from '@/services/tabelas-auxiliares.service';
import { createClient } from '@/lib/supabase/client';

interface LookupOption {
  value: string;
  label: string;
  descricao?: string | null;
}

// Cache em memória para evitar requisições repetidas na mesma sessão
const cache = new Map<string, { data: LookupOption[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export function useLookup(categoria: string): {
  options: LookupOption[];
  loading: boolean;
} {
  const [options, setOptions] = useState<LookupOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = cache.get(categoria);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setOptions(cached.data);
      setLoading(false);
      return;
    }

    let cancelled = false;

    listarPorCategoria(categoria).then(({ data, error }) => {
      if (cancelled) return;
      if (error || !data) {
        setOptions([]);
      } else {
        const rows = data as unknown as TabelaAuxiliar[];
        const mapped = rows.map((item) => ({
          value: item.codigo,
          label: item.nome,
          descricao: item.descricao,
        }));
        cache.set(categoria, { data: mapped, ts: Date.now() });
        setOptions(mapped);
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [categoria]);

  return { options, loading };
}

export function useUnidadesDestino() {
  const [options, setOptions] = useState<(UnidadeDestino & { label: string; value: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listarUnidadesDestino().then(({ data, error }) => {
      if (error || !data) {
        setOptions([]);
      } else {
        const rows = data as unknown as UnidadeDestino[];
        setOptions(
          rows.map((u) => ({
            ...u,
            value: u.id,
            label: `${u.nome} — ${u.cidade}/${u.uf}`,
          })),
        );
      }
      setLoading(false);
    });
  }, []);

  return { options, loading };
}

export function useCompanhias() {
  const [options, setOptions] = useState<(CompanhiaTransporte & { label: string; value: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listarCompanhias().then(({ data, error }) => {
      if (error || !data) {
        setOptions([]);
      } else {
        const rows = data as unknown as CompanhiaTransporte[];
        setOptions(
          rows.map((c) => ({
            ...c,
            value: c.id,
            label: `${c.nome} (${c.tipo_modal})`,
          })),
        );
      }
      setLoading(false);
    });
  }, []);

  return { options, loading };
}

export function useMunicipios() {
  const [options, setOptions] = useState<LookupOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = cache.get('_municipios');
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      setOptions(cached.data);
      setLoading(false);
      return;
    }

    createClient()
      .from('municipios')
      .select('id, nome, regional')
      .eq('ativo', true)
      .order('nome')
      .then(({ data, error }) => {
        if (error || !data) {
          setOptions([]);
        } else {
          const rows = data as unknown as { id: string; nome: string; regional: string }[];
          const mapped = rows.map((m) => ({
            value: m.id,
            label: m.nome,
            descricao: m.regional,
          }));
          cache.set('_municipios', { data: mapped, ts: Date.now() });
          setOptions(mapped);
        }
        setLoading(false);
      });
  }, []);

  return { options, loading };
}

// Invalida cache quando o usuário cria/edita itens na configuração
export function invalidateCache(categoria?: string) {
  if (categoria) {
    cache.delete(categoria);
  } else {
    cache.clear();
  }
}
