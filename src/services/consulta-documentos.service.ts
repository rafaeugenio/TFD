import { createClient } from '@/lib/supabase/client';
import { MOCK_DOCUMENTOS, type DocumentoConsulta } from '@/core/mocks/consulta-documentos.mock';

function getSupabase() {
  return createClient();
}

export interface FiltrosConsultaDocumentos {
  dataInicio?: string;
  dataFim?: string;
  tipoFormulario?: string;
  tipoDocumento?: string;
  etapa?: string;
  statusList?: string[];
  pacienteBusca?: string;
  numeroProcesso?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Busca transversal de documentos com filtros avançados.
 * Fallback para mock data quando Supabase não está disponível.
 */
export async function consultarDocumentos(filtros: FiltrosConsultaDocumentos): Promise<{
  data: DocumentoConsulta[];
  count: number;
  error: unknown;
}> {
  try {
    const supabase = getSupabase();
    // Attempt real query (table may not exist yet)
    const { error: testError } = await supabase
      .from('documentos')
      .select('id', { count: 'exact', head: true });

    if (testError) throw testError;

    // Real implementation would query multiple tables and unify results
    // For now, fall back to mock
    throw new Error('Not implemented — using mock data');
  } catch {
    // Fallback to mock data with client-side filtering
    let filtered = [...MOCK_DOCUMENTOS];

    if (filtros.dataInicio) {
      filtered = filtered.filter((d) => d.dataInclusao >= filtros.dataInicio!);
    }
    if (filtros.dataFim) {
      const fimDate = filtros.dataFim + 'T23:59:59';
      filtered = filtered.filter((d) => d.dataInclusao <= fimDate);
    }
    if (filtros.tipoFormulario) {
      filtered = filtered.filter((d) => d.tipoFormulario === filtros.tipoFormulario);
    }
    if (filtros.tipoDocumento) {
      filtered = filtered.filter((d) => d.tipoDocumento === filtros.tipoDocumento);
    }
    if (filtros.etapa) {
      filtered = filtered.filter((d) => d.etapa === filtros.etapa);
    }
    if (filtros.statusList && filtros.statusList.length > 0) {
      filtered = filtered.filter((d) => filtros.statusList!.includes(d.status));
    }
    if (filtros.pacienteBusca && filtros.pacienteBusca.length >= 3) {
      const term = filtros.pacienteBusca.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.paciente.toLowerCase().includes(term) ||
          d.numeroProcesso.toLowerCase().includes(term),
      );
    }
    if (filtros.numeroProcesso) {
      const term = filtros.numeroProcesso.toLowerCase();
      filtered = filtered.filter((d) =>
        d.numeroProcesso.toLowerCase().includes(term),
      );
    }

    // Sort by data inclusão desc
    filtered.sort(
      (a, b) =>
        new Date(b.dataInclusao).getTime() - new Date(a.dataInclusao).getTime(),
    );

    const total = filtered.length;
    const page = filtros.page ?? 1;
    const size = filtros.pageSize ?? 20;
    const start = (page - 1) * size;
    const paged = filtered.slice(start, start + size);

    return { data: paged, count: total, error: null };
  }
}
