import { createClient } from '@/lib/supabase/client';
import type { InsertDTO, UpdateDTO, DecisaoProrrogacao } from '@/lib/supabase/database.types';

function getSupabase() {
  return createClient();
}

/** Post-regulation statuses */
const POS_REGULACAO = [
  'AGUARDANDO_AGENDAMENTO', 'AGUARDANDO_EMISSAO', 'EMITIDA',
  'EM_VIAGEM', 'EM_PAGAMENTO', 'EM_PERMANENCIA', 'CONCLUIDO',
];

/**
 * Lists all solicitações that passed through regulação.
 */
export async function listarSolicitacoesPoRegulacao() {
  const supabase = getSupabase();
  return supabase
    .from('solicitacoes')
    .select(
      'id, numero_processo, status, created_at, pacientes(nome_completo), viagens(id, tipo), ajudas_custo(id, valor_total), permanencias(id, prorrogacoes(id, decisao, complemento_ajuda_id, viagem_prorrogacao_id))',
      { count: 'exact' },
    )
    .in('status', POS_REGULACAO)
    .order('created_at', { ascending: false })
    .range(0, 499);
}

/**
 * Fetches detailed data for the drawer.
 */
export async function buscarDetalhesPermanencia(solicitacaoId: string) {
  const supabase = getSupabase();

  const [viagens, ajudas, permanencia] = await Promise.all([
    supabase
      .from('viagens')
      .select('id, tipo, situacao, embarcou, data_embarque_prevista, companhia, numero_bilhete, valor, prorrogacao_id, origem_cidade, origem_uf, destino_cidade, destino_uf')
      .eq('solicitacao_id', solicitacaoId)
      .order('created_at', { ascending: true }),
    supabase
      .from('ajudas_custo')
      .select('id, tipo, data_inicio, data_fim, dias_elegiveis, valor_diaria, valor_total, valor_pago, status')
      .eq('solicitacao_id', solicitacaoId)
      .order('data_inicio', { ascending: true }),
    supabase
      .from('permanencias')
      .select('id, data_comunicacao, motivo, nova_data_retorno_prevista, prorrogacoes(*)')
      .eq('solicitacao_id', solicitacaoId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Enrich prorrogações with linked viagem and ajuda data
  const rawProrrogacoes = ((permanencia.data as any)?.prorrogacoes ?? []) as any[];
  const viagensMap = new Map((viagens.data ?? []).map((v: any) => [v.id, v]));
  const ajudasMap = new Map((ajudas.data ?? []).map((a: any) => [a.id, a]));

  const prorrogacoes = rawProrrogacoes
    .map((p: any) => ({
      ...p,
      viagem: p.viagem_prorrogacao_id ? viagensMap.get(p.viagem_prorrogacao_id) ?? null : null,
      ajuda: p.complemento_ajuda_id ? ajudasMap.get(p.complemento_ajuda_id) ?? null : null,
    }))
    .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  return {
    viagens: viagens.data ?? [],
    ajudas: ajudas.data ?? [],
    permanencia: permanencia.data,
    prorrogacoes,
  };
}

/**
 * Ensures a permanência record exists for a solicitação.
 */
export async function garantirPermanencia(solicitacaoId: string): Promise<string | null> {
  const supabase = getSupabase();

  const { data: existing } = await supabase
    .from('permanencias')
    .select('id')
    .eq('solicitacao_id', solicitacaoId)
    .limit(1)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('permanencias')
    .insert({ solicitacao_id: solicitacaoId } as any)
    .select('id')
    .single();

  if (error) return null;
  return (created as any).id;
}

export async function criarProrrogacao(data: InsertDTO<'prorrogacoes'>) {
  const supabase = getSupabase();
  return supabase.from('prorrogacoes').insert(data).select().single();
}

export async function aprovarProrrogacao(id: string) {
  const supabase = getSupabase();
  return supabase
    .from('prorrogacoes')
    .update({
      decisao: 'APROVADA' as DecisaoProrrogacao,
      nova_passagem_necessaria: true,
      decisao_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
}

export async function indeferirProrrogacao(id: string, justificativa: string) {
  const supabase = getSupabase();
  return supabase
    .from('prorrogacoes')
    .update({
      decisao: 'INDEFERIDA' as DecisaoProrrogacao,
      justificativa_decisao: justificativa,
      decisao_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
}

export async function excluirProrrogacao(id: string) {
  const supabase = getSupabase();
  return supabase.from('prorrogacoes').delete().eq('id', id);
}

/**
 * Creates a viagem (passagem) linked to a prorrogação.
 */
export async function criarViagemProrrogacao(
  solicitacaoId: string,
  prorrogacaoId: string,
  dados: {
    tipo: string;
    origemCidade: string;
    origemUf: string;
    destinoCidade: string;
    destinoUf: string;
    dataEmbarque: string;
    companhia?: string;
    valor?: number;
  },
) {
  const supabase = getSupabase();

  const { data: viagem, error } = await supabase
    .from('viagens')
    .insert({
      solicitacao_id: solicitacaoId,
      prorrogacao_id: prorrogacaoId,
      tipo: dados.tipo,
      modal: 'AEREO',
      origem_cidade: dados.origemCidade,
      origem_uf: dados.origemUf,
      destino_cidade: dados.destinoCidade,
      destino_uf: dados.destinoUf,
      com_pernoite: false,
      data_embarque_prevista: dados.dataEmbarque,
      medif_necessario: false,
      companhia: dados.companhia || null,
      valor: dados.valor ?? null,
    } as any)
    .select()
    .single();

  if (!error && viagem) {
    // Link viagem to the prorrogação
    await supabase
      .from('prorrogacoes')
      .update({ viagem_prorrogacao_id: (viagem as any).id, updated_at: new Date().toISOString() })
      .eq('id', prorrogacaoId);
  }

  return { data: viagem, error };
}

/**
 * Creates an ajuda de custo linked to a prorrogação.
 */
export async function criarAjudaCustoProrrogacao(
  solicitacaoId: string,
  prorrogacaoId: string,
  dados: {
    dataInicio: string;
    dataFim: string;
    valorDiaria: number;
    valorTotal: number;
    tipo?: string;
  },
) {
  const supabase = getSupabase();

  const { data: ajuda, error } = await supabase
    .from('ajudas_custo')
    .insert({
      solicitacao_id: solicitacaoId,
      tipo: dados.tipo || 'PACIENTE',
      data_inicio: dados.dataInicio,
      data_fim: dados.dataFim,
      valor_diaria: dados.valorDiaria,
      valor_total: dados.valorTotal,
      status: 'EM_ANALISE',
    } as any)
    .select()
    .single();

  if (!error && ajuda) {
    // Link ajuda to the prorrogação
    await supabase
      .from('prorrogacoes')
      .update({ complemento_ajuda_id: (ajuda as any).id, updated_at: new Date().toISOString() })
      .eq('id', prorrogacaoId);
  }

  return { data: ajuda, error };
}

/* ---- Legacy functions ---- */

export async function listarPermanencias(filters?: { search?: string; page?: number; pageSize?: number }) {
  const supabase = getSupabase();
  let query = supabase
    .from('permanencias')
    .select('*, prorrogacoes(*), solicitacoes(numero_processo, status, pacientes(nome_completo))', { count: 'exact' })
    .order('created_at', { ascending: false });
  const page = filters?.page ?? 1;
  const size = filters?.pageSize ?? 500;
  query = query.range((page - 1) * size, page * size - 1);
  return query;
}

export async function listarSolicitacoesEmPermanencia() {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('solicitacoes')
    .select('id, numero_processo, status, created_at, pacientes(nome_completo)')
    .eq('status', 'EM_PERMANENCIA')
    .order('created_at', { ascending: true });
  if (error || !data) return { data: [], error };
  const { data: existentes } = await supabase.from('permanencias').select('solicitacao_id');
  const ids = new Set((existentes ?? []).map((p: any) => p.solicitacao_id));
  return { data: data.filter((s: any) => !ids.has(s.id)), error: null };
}

export async function criarPermanencia(data: InsertDTO<'permanencias'>) {
  const supabase = getSupabase();
  return supabase.from('permanencias').insert(data).select().single();
}

export async function atualizarPermanencia(id: string, data: UpdateDTO<'permanencias'>) {
  const supabase = getSupabase();
  return supabase.from('permanencias').update(data).eq('id', id).select().single();
}

export async function excluirPermanencia(id: string) {
  const supabase = getSupabase();
  return supabase.from('permanencias').delete().eq('id', id);
}
