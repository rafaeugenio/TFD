import { createClient } from '@/lib/supabase/client';

export interface MesDados {
  mes: number;
  quadri: 1 | 2 | 3;
  ac_qtd_lanc: number;
  ac_qtd_aprov: number;
  ac_diarias: number;
  ac_valor_lanc: number;
  ac_valor_aprov: number;
  ac_valor_pago: number;
  vi_qtd_lanc: number;
  vi_qtd_aprov: number;
  vi_valor_lanc: number;
  vi_valor_aprov: number;
  vi_fatura_paga: number;
  vi_bpa: number;
  qtd_proc: number;
  qtd_processos: number;
  qtd_obitos: number;
  valor_funeraria: number;
}

export interface QuadriDados extends Omit<MesDados, 'mes' | 'quadri'> {
  quadri: 1 | 2 | 3;
}

export interface DemandaQuadri {
  quadri: 1 | 2 | 3;
  pacientes: number;
  acompanhantes: number;
}

export interface AvaliacaoMeta {
  prevista_anual: number;
  executada_anual: number;
  diferenca: number;
  percentual: number;
  prevista_quadri: number;
}

export interface RelatorioFinanceiro {
  ano: number;
  meta_anual: number;
  alcancada: number;
  meses: MesDados[];
  quadrimestres: QuadriDados[];
  demanda: DemandaQuadri[];
  avaliacao_meta: AvaliacaoMeta;
}

export interface MetaAnual {
  id: string;
  ano: number;
  valor_procedimentos: number;
  observacoes: string | null;
}

function getSupabase() {
  return createClient();
}

// Casts são necessários porque a tabela `metas_anuais` e a RPC `obter_relatorio_financeiro`
// foram adicionadas após a última geração dos tipos do Supabase.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

export async function obterRelatorioFinanceiro(ano: number) {
  const { data, error } = await (getSupabase() as AnyClient).rpc('obter_relatorio_financeiro', {
    p_ano: ano,
  });
  return { data: data as RelatorioFinanceiro | null, error };
}

export async function listarMetasAnuais() {
  return (getSupabase() as AnyClient)
    .from('metas_anuais')
    .select('*')
    .order('ano', { ascending: false });
}

export async function salvarMetaAnual(ano: number, valor_procedimentos: number) {
  return (getSupabase() as AnyClient)
    .from('metas_anuais')
    .upsert({ ano, valor_procedimentos, updated_at: new Date().toISOString() }, { onConflict: 'ano' })
    .select()
    .single();
}
