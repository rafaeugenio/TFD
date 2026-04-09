'use client';

import { useState, useEffect, useCallback } from 'react';
import { listarPorCategoria, listarUnidadesDestino, listarCompanhias } from '@/services/tabelas-auxiliares.service';
import type { TabelaAuxiliar, UnidadeDestino, CompanhiaTransporte } from '@/services/tabelas-auxiliares.service';
import type { RotaDeslocamento } from '@/core/models/rota-deslocamento.model';
import { createClient } from '@/lib/supabase/client';

interface LookupOption {
  value: string;
  label: string;
  descricao?: string | null;
  codigo_ibge?: string;
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

  const load = useCallback(() => {
    setLoading(true);
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

  useEffect(() => { load(); }, [load]);

  return { options, loading, refresh: load };
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
      .select('id, nome, regional, codigo_ibge')
      .eq('ativo', true)
      .order('nome')
      .then(({ data, error }) => {
        if (error || !data) {
          setOptions([]);
        } else {
          const rows = data as unknown as { id: string; nome: string; regional: string; codigo_ibge: string }[];
          const mapped = rows.map((m) => ({
            value: m.id,
            label: m.nome,
            descricao: m.regional,
            codigo_ibge: m.codigo_ibge,
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

export function useRotas() {
  const [rotas, setRotas] = useState<RotaDeslocamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    createClient()
      .from('rotas_deslocamento')
      .select('*')
      .eq('ativo', true)
      .order('cidade_origem', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setRotas([]);
        } else {
          setRotas(data as unknown as RotaDeslocamento[]);
        }
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return { rotas, loading };
}
