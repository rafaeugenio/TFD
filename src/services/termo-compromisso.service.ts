import { createClient } from '@/lib/supabase/client';

function getSupabase() {
  return createClient();
}

/* ── Listar termos de compromisso ── */

export async function listarTermos(filters?: {
  status?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = getSupabase();

  let query = supabase
    .from('termos_compromisso')
    .select('*, solicitacoes(*, pacientes(*))', { count: 'exact' })
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'TODOS') {
    query = query.eq('status', filters.status);
  }

  if (filters?.search) {
    query = query.or(
      `numero_processo.ilike.%${filters.search}%,paciente_nome.ilike.%${filters.search}%`,
    );
  }

  const page = filters?.page ?? 1;
  const size = filters?.pageSize ?? 10;
  query = query.range((page - 1) * size, page * size - 1);

  return query;
}

/* ── Buscar termo por ID ── */

export async function buscarTermo(id: string) {
  const supabase = getSupabase();

  return supabase
    .from('termos_compromisso')
    .select('*, solicitacoes(*, pacientes(*))')
    .eq('id', id)
    .single();
}

/* ── Buscar termo por solicitação (relação 1:1) ── */

export async function buscarTermoPorSolicitacao(solicitacaoId: string) {
  const supabase = getSupabase();

  return supabase
    .from('termos_compromisso')
    .select('*')
    .eq('solicitacao_id', solicitacaoId)
    .maybeSingle();
}

/* ── Criar (registrar) termo de compromisso ── */

export async function criarTermo(data: {
  solicitacao_id: string;
  numero_processo: string;
  paciente_nome: string;
  paciente_cpf: string;
  paciente_rg?: string;
  paciente_cns?: string;
  paciente_endereco?: string;
  paciente_municipio?: string;
  status: string;
  modalidade_aceite: string;
  responsavel_nome?: string;
  responsavel_cpf?: string;
  responsavel_parentesco?: string;
  arquivo_url?: string;
  arquivo_nome?: string;
  confirmacao_leitura?: boolean;
  data_registro?: string;
  registrado_por?: string;
}) {
  const supabase = getSupabase();
  return supabase.from('termos_compromisso').insert(data).select().single();
}

/* ── Contar termos por status ── */

export async function contarTermosPorStatus() {
  const supabase = getSupabase();

  return supabase
    .from('termos_compromisso')
    .select('status')
    .then(({ data, error }) => {
      if (error) return { data: null, error };
      const counts: Record<string, number> = {};
      data?.forEach((t) => {
        counts[t.status] = (counts[t.status] || 0) + 1;
      });
      return { data: counts, error: null };
    });
}
