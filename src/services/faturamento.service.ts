import { createClient } from '@/lib/supabase/client';
import type { Fatura, StatusFatura } from '@/core/models/faturamento.model';
import {
  MOCK_FATURAS,
  MOCK_ITENS_FATURA,
  MOCK_HISTORICO_FATURA,
} from '@/core/mocks/faturamento.mock';

function getSupabase() {
  return createClient();
}

export async function listarFaturas(filtros?: {
  status?: string;
  search?: string;
  periodo?: string;
  municipio?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ data: Fatura[]; count: number; error: unknown }> {
  try {
    const supabase = getSupabase();
    const { error: testError } = await supabase
      .from('faturas')
      .select('id', { count: 'exact', head: true });
    if (testError) throw testError;
    throw new Error('Not implemented — using mock data');
  } catch {
    let filtered = [...MOCK_FATURAS];

    if (filtros?.status && filtros.status !== 'TODAS') {
      filtered = filtered.filter((f) => f.status === filtros.status);
    }
    if (filtros?.periodo) {
      filtered = filtered.filter((f) => f.periodo === filtros.periodo);
    }
    if (filtros?.municipio) {
      filtered = filtered.filter((f) =>
        f.municipio.toLowerCase().includes(filtros.municipio!.toLowerCase()),
      );
    }
    if (filtros?.search) {
      const term = filtros.search.toLowerCase();
      filtered = filtered.filter(
        (f) =>
          f.numero.toLowerCase().includes(term) ||
          f.municipio.toLowerCase().includes(term),
      );
    }

    filtered.sort(
      (a, b) =>
        new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime(),
    );

    const total = filtered.length;
    const page = filtros?.page ?? 1;
    const size = filtros?.pageSize ?? 8;
    const start = (page - 1) * size;
    const paged = filtered.slice(start, start + size);

    return { data: paged, count: total, error: null };
  }
}

export async function buscarFatura(id: string) {
  const fatura = MOCK_FATURAS.find((f) => f.id === id);
  const itens = MOCK_ITENS_FATURA.filter((i) => i.faturaId === id);
  const historico = MOCK_HISTORICO_FATURA.filter((h) => h.faturaId === id);
  return { data: fatura ? { ...fatura, itens, historico } : null, error: null };
}

export async function criarFatura(data: {
  periodo: string;
  municipioId: string;
  municipio: string;
}): Promise<{ data: Fatura | null; error: unknown }> {
  // Mock: return a new RASCUNHO fatura
  const nova: Fatura = {
    id: `fat-${Date.now()}`,
    numero: `${data.periodo.replace('-', '')}-${data.municipio.substring(0, 5).toUpperCase()}-001`,
    periodo: data.periodo,
    municipioId: data.municipioId,
    municipio: data.municipio,
    status: 'RASCUNHO',
    totalPassagens: 0,
    totalDiarias: 0,
    totalReembolsos: 0,
    totalCreditos: 0,
    totalGeral: 0,
    criadoPor: 'Usuário Atual',
    criadoEm: new Date().toISOString(),
  };
  return { data: nova, error: null };
}

export async function atualizarStatusFatura(
  id: string,
  novoStatus: StatusFatura,
): Promise<{ data: Fatura | null; error: unknown }> {
  const fatura = MOCK_FATURAS.find((f) => f.id === id);
  if (!fatura) return { data: null, error: { message: 'Fatura não encontrada' } };
  return { data: { ...fatura, status: novoStatus }, error: null };
}
