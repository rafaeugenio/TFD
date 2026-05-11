'use client';

import { useEffect, useMemo, useState } from 'react';
import { listarPorCategoria } from '@/services/tabelas-auxiliares.service';
import { TIPO_PROCEDIMENTO_LABEL } from '@/core/mocks/fluxo-v2-v3-seed';

export interface TipoProcedimentoItem {
  /** Código normalizado (lowercase) — compatível com `TipoProcedimento`. */
  codigo: string;
  /** Rótulo apresentável. */
  nome: string;
}

/**
 * Cache em memória — única requisição por sessão.
 * A categoria muda raramente (manutenção em /sistema/configuracoes).
 */
let cache: TipoProcedimentoItem[] | null = null;
let inflight: Promise<TipoProcedimentoItem[]> | null = null;

async function fetchTipos(): Promise<TipoProcedimentoItem[]> {
  if (cache) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    const { data } = await listarPorCategoria('tipo_procedimento');
    const rows = (data ?? []) as { codigo: string; nome: string; ativo?: boolean }[];
    const list = rows
      .filter((r) => r.ativo !== false)
      .map((r) => ({ codigo: (r.codigo ?? '').toLowerCase(), nome: r.nome }));
    cache = list;
    inflight = null;
    return list;
  })();
  return inflight;
}

/**
 * Hook compartilhado para carregar tipos de procedimento dinâmicos.
 * Faz fetch uma única vez por sessão e expõe helpers de label.
 */
export function useTiposProcedimento() {
  const [tipos, setTipos] = useState<TipoProcedimentoItem[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    if (cache) return;
    let alive = true;
    fetchTipos()
      .then((list) => { if (alive) setTipos(list); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  /** Resolve um código para o nome humanizado.
   *  Fallback para `TIPO_PROCEDIMENTO_LABEL` (mocks antigos). */
  const getLabel = useMemo(() => {
    const map = new Map(tipos.map((t) => [t.codigo, t.nome] as const));
    return (codigo: string | undefined | null) => {
      if (!codigo) return '—';
      const key = codigo.toLowerCase();
      if (map.has(key)) return map.get(key)!;
      if (key in TIPO_PROCEDIMENTO_LABEL) {
        return TIPO_PROCEDIMENTO_LABEL[key as keyof typeof TIPO_PROCEDIMENTO_LABEL];
      }
      return codigo;
    };
  }, [tipos]);

  return { tipos, loading, getLabel };
}
