import { createClient } from '@/lib/supabase/client';
import type {
  TetoFinanceiro,
  ResumoTetoEstadual,
  AlertaTeto,
} from '@/core/models/teto-financeiro.model';
import {
  MOCK_RESUMO_ESTADUAL,
  MOCK_TETOS_MUNICIPIO,
  MOCK_ALERTAS_TETO,
} from '@/core/mocks/teto-financeiro.mock';

function getSupabase() {
  return createClient();
}

export async function buscarResumoEstadual(filtros?: {
  exercicio?: number;
  periodoAte?: number;
}): Promise<{ data: ResumoTetoEstadual | null; error: unknown }> {
  try {
    const supabase = getSupabase();
    const { error: testError } = await supabase
      .from('tetos_financeiros')
      .select('id', { count: 'exact', head: true });
    if (testError) throw testError;
    throw new Error('Not implemented — using mock data');
  } catch {
    return { data: MOCK_RESUMO_ESTADUAL, error: null };
  }
}

export async function listarTetosPorMunicipio(filtros?: {
  exercicio?: number;
  periodoAte?: number;
  municipio?: string;
}): Promise<{ data: TetoFinanceiro[]; count: number; error: unknown }> {
  try {
    const supabase = getSupabase();
    const { error: testError } = await supabase
      .from('tetos_financeiros')
      .select('id', { count: 'exact', head: true });
    if (testError) throw testError;
    throw new Error('Not implemented — using mock data');
  } catch {
    let filtered = [...MOCK_TETOS_MUNICIPIO];

    if (filtros?.exercicio) {
      filtered = filtered.filter((t) => t.exercicio === filtros.exercicio);
    }
    if (filtros?.municipio) {
      const term = filtros.municipio.toLowerCase();
      filtered = filtered.filter((t) =>
        t.municipio.toLowerCase().includes(term),
      );
    }

    // Sort by % utilização desc (most critical first)
    filtered.sort((a, b) => b.percentualUtilizacao - a.percentualUtilizacao);

    return { data: filtered, count: filtered.length, error: null };
  }
}

export async function listarAlertasTeto(filtros?: {
  exercicio?: number;
}): Promise<{ data: AlertaTeto[]; error: unknown }> {
  try {
    const supabase = getSupabase();
    const { error: testError } = await supabase
      .from('alertas_teto')
      .select('id', { count: 'exact', head: true });
    if (testError) throw testError;
    throw new Error('Not implemented — using mock data');
  } catch {
    return { data: MOCK_ALERTAS_TETO, error: null };
  }
}
