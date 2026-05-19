import { createClient } from '@/lib/supabase/client';

export interface Aeroporto {
  id: string;
  iata: string;
  icao: string | null;
  nome: string;
  cidade: string;
  uf: string;
  latitude: number;
  longitude: number;
}

/**
 * Lista aeroportos ativos. Usado pela emissão de passagem aérea pra calcular
 * a distância via coordenadas reais do aeroporto (mais precisa que o
 * centroide da cidade).
 */
export interface ListarAeroportosResult {
  data: Aeroporto[];
  error: string | null;
}

export async function listarAeroportos(): Promise<ListarAeroportosResult> {
  const supabase = createClient();
  // A tabela `aeroportos` foi adicionada na migration 00051; o `database.types.ts`
  // ainda não foi regenerado, então cast pra `any` por enquanto.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const base: any = sb.from('aeroportos');
  const { data, error } = await base
    .select('id, iata, icao, nome, cidade, uf, latitude, longitude')
    .eq('ativo', true)
    .order('uf', { ascending: true })
    .order('cidade', { ascending: true });

  if (error) {
    console.warn('[aeroportos.service] listarAeroportos:', error.message);
    return { data: [], error: error.message };
  }
  return { data: (data ?? []) as Aeroporto[], error: null };
}

/** Rótulo padrão pra exibir um aeroporto em listas/inputs. */
export function rotuloAeroporto(a: Aeroporto): string {
  return `${a.iata} — ${a.cidade}/${a.uf} (${a.nome})`;
}
