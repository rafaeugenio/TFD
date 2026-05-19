'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Cache em memória entre renders da página — chave = `versao:codigo`.
 * Persistir a sessão evita refetch quando a tabela re-renderiza ou paginação muda.
 */
const cache = new Map<string, string>();

interface CidRow {
  codigo: string;
  descricao: string;
}

function cacheKey(versao: '10' | '11', codigo: string) {
  return `${versao}:${codigo}`;
}

/**
 * Resolve descrições de CIDs em batch para uma lista de pareceres da tabela.
 * Em vez de buscar 1 por 1 (centenas de requests), faz UMA query por versão
 * (`in('codigo', [...códigos únicos])`) e mantém o resultado num Map.
 *
 * Uso típico:
 *   const cidMap = useCidLookup(pareceres.map(p => ({ codigo, versao })));
 *   const desc = cidMap.get(cacheKey('10', 'C50.9'));
 *
 * Códigos que já trazem `cidPrincipalNome` na seed continuam funcionando — o
 * componente consumidor checa primeiro o nome embarcado antes de chamar o map.
 */
export function useCidLookup(
  pares: Array<{ codigo: string | undefined; versao: '10' | '11' | undefined }>,
): Map<string, string> {
  // Sinaliza re-render quando o cache é atualizado por uma resolução assíncrona.
  const [, force] = useState(0);

  // Códigos únicos por versão, com cache filtrado fora.
  const aResolver = useMemo(() => {
    const por10 = new Set<string>();
    const por11 = new Set<string>();
    for (const { codigo, versao } of pares) {
      if (!codigo) continue;
      const v = versao ?? '10';
      const key = cacheKey(v, codigo);
      if (cache.has(key)) continue;
      if (v === '11') por11.add(codigo);
      else por10.add(codigo);
    }
    return { por10: [...por10], por11: [...por11] };
  }, [pares]);

  useEffect(() => {
    if (aResolver.por10.length === 0 && aResolver.por11.length === 0) return;
    let cancelled = false;

    (async () => {
      const sb = createClient();
      const tasks: Array<Promise<void>> = [];

      if (aResolver.por10.length > 0) {
        tasks.push(
          (async () => {
            const { data, error } = await sb
              .from('cid10')
              .select('codigo, descricao')
              .in('codigo', aResolver.por10);
            if (cancelled || error) return;
            for (const row of (data ?? []) as CidRow[]) {
              cache.set(cacheKey('10', row.codigo), row.descricao);
            }
          })(),
        );
      }
      if (aResolver.por11.length > 0) {
        tasks.push(
          (async () => {
            const { data, error } = await sb
              .from('cid11')
              .select('codigo, descricao')
              .in('codigo', aResolver.por11);
            if (cancelled || error) return;
            for (const row of (data ?? []) as CidRow[]) {
              cache.set(cacheKey('11', row.codigo), row.descricao);
            }
          })(),
        );
      }

      await Promise.all(tasks);
      if (!cancelled) force((n) => n + 1);
    })();

    return () => {
      cancelled = true;
    };
  }, [aResolver]);

  // Retorna sempre o cache atual (é o mesmo Map mutado pelos effects).
  return cache;
}

/** Helper para uso fora do hook (componentes filhos que recebem o map). */
export function getCidDescricao(
  map: Map<string, string>,
  codigo: string | undefined,
  versao: '10' | '11' | undefined,
): string | undefined {
  if (!codigo) return undefined;
  return map.get(cacheKey(versao ?? '10', codigo));
}
