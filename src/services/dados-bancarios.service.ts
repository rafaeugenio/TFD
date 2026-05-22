import { createClient } from '@/lib/supabase/client';
import type { InsertDTO, UpdateDTO, Tables } from '@/lib/supabase/database.types';

function getSupabase() {
  return createClient();
}

/**
 * Vínculo do titular agora é texto livre vindo da tabela auxiliar `vinculo`
 * (mesma tabela usada pelos acompanhantes). O valor armazenado é o NOME do
 * vínculo (ex.: "Pai/Mãe", "Cônjuge", "Próprio paciente"), pronto para
 * exibição direta sem dicionário de tradução.
 */
export type TitularVinculo = string;

export type DadosBancariosRow = Tables<'dados_bancarios'>;

/**
 * Pool de contas bancárias de um paciente — contas reutilizáveis em qualquer
 * solicitação de Ajuda de Custo. Filtra apenas ativas (soft-delete).
 */
export async function listarPoolPorPaciente(pacienteId: string) {
  const supabase = getSupabase();
  return supabase
    .from('dados_bancarios')
    .select('*')
    .eq('paciente_id', pacienteId)
    .eq('ativo', true)
    .order('created_at', { ascending: true });
}

/**
 * Variação que inclui também contas inativas — usada quando uma solicitação
 * antiga aponta para uma conta hoje desativada e a UI precisa exibir.
 */
export async function listarTodasPorPaciente(pacienteId: string) {
  const supabase = getSupabase();
  return supabase
    .from('dados_bancarios')
    .select('*')
    .eq('paciente_id', pacienteId)
    .order('created_at', { ascending: true });
}

export async function criarConta(data: InsertDTO<'dados_bancarios'>) {
  const supabase = getSupabase();
  return supabase.from('dados_bancarios').insert(data).select().single();
}

export async function atualizarConta(
  id: string,
  data: UpdateDTO<'dados_bancarios'>,
) {
  const supabase = getSupabase();
  return supabase
    .from('dados_bancarios')
    .update(data)
    .eq('id', id)
    .select()
    .single();
}

/**
 * Soft-delete: preserva o vínculo das solicitações antigas que já referenciaram
 * essa conta, mas deixa de aparecer no select de novas solicitações.
 */
export async function inativarConta(id: string) {
  return atualizarConta(id, { ativo: false });
}

export async function reativarConta(id: string) {
  return atualizarConta(id, { ativo: true });
}

/**
 * Hard-delete — só use se a conta nunca foi referenciada por uma solicitação.
 * Caso contrário a constraint ON DELETE SET NULL apaga o vínculo (que é o
 * comportamento desejado, mas perde a "linha viva"). Prefira `inativarConta`.
 */
export async function removerContaSeNaoUsada(id: string) {
  const supabase = getSupabase();
  return supabase.from('dados_bancarios').delete().eq('id', id);
}

/**
 * Snapshot de uma conta em uma solicitação — usado na vinculação. Replica os
 * campos da conta no momento da aprovação para que edições futuras na conta-mãe
 * não afetem o histórico financeiro.
 */
interface ContaSnapshot {
  dados_bancarios_id: string;
  snapshot_banco: string | null;
  snapshot_agencia: string | null;
  snapshot_conta: string | null;
  snapshot_tipo_conta: DadosBancariosRow['tipo_conta'];
  snapshot_nome_titular: string;
  snapshot_cpf_titular: string;
  snapshot_titular_vinculo: string | null;
  snapshot_pix_tipo: DadosBancariosRow['pix_tipo'];
  snapshot_pix_chave: string | null;
  snapshot_at: string;
}

export function buildSnapshot(conta: DadosBancariosRow): ContaSnapshot {
  return {
    dados_bancarios_id: conta.id,
    snapshot_banco: conta.banco ?? null,
    snapshot_agencia: conta.agencia ?? null,
    snapshot_conta: conta.conta ?? null,
    snapshot_tipo_conta: conta.tipo_conta,
    snapshot_nome_titular: conta.nome_titular,
    snapshot_cpf_titular: conta.cpf_titular,
    snapshot_titular_vinculo: conta.titular_vinculo ?? null,
    snapshot_pix_tipo: conta.pix_tipo,
    snapshot_pix_chave: conta.pix_chave,
    snapshot_at: new Date().toISOString(),
  };
}

/**
 * Vincula uma conta do pool a uma solicitação e congela o snapshot. Caminho
 * principal do setor de Ajuda de Custo após escolher do select.
 */
export async function vincularASolicitacao(
  solicitacaoId: string,
  conta: DadosBancariosRow,
) {
  const supabase = getSupabase();
  return supabase
    .from('solicitacoes')
    .update(buildSnapshot(conta))
    .eq('id', solicitacaoId)
    .select()
    .single();
}

/**
 * Limpa o vínculo e os snapshots de uma solicitação (usado quando o operador
 * decide trocar de conta antes de aprovar).
 */
export async function desvincularDaSolicitacao(solicitacaoId: string) {
  const supabase = getSupabase();
  return supabase
    .from('solicitacoes')
    .update({
      dados_bancarios_id: null,
      snapshot_banco: null,
      snapshot_agencia: null,
      snapshot_conta: null,
      snapshot_tipo_conta: null,
      snapshot_nome_titular: null,
      snapshot_cpf_titular: null,
      snapshot_titular_vinculo: null,
      snapshot_pix_tipo: null,
      snapshot_pix_chave: null,
      snapshot_at: null,
    })
    .eq('id', solicitacaoId)
    .select()
    .single();
}

/**
 * Lê o vínculo atual e o snapshot de uma solicitação. Retorna o snapshot
 * mesmo se a conta-mãe tiver sido editada/inativada — esse é justamente o
 * ponto do snapshot.
 */
export async function buscarVinculoDaSolicitacao(solicitacaoId: string) {
  const supabase = getSupabase();
  return supabase
    .from('solicitacoes')
    .select('dados_bancarios_id, snapshot_banco, snapshot_agencia, snapshot_conta, snapshot_tipo_conta, snapshot_nome_titular, snapshot_cpf_titular, snapshot_titular_vinculo, snapshot_pix_tipo, snapshot_pix_chave, snapshot_at')
    .eq('id', solicitacaoId)
    .maybeSingle();
}

/* ──────────────────────────────────────────────────────────────────────────
   DEPRECATED — APIs do modelo "1 por solicitação". Mantidas como shims para
   compatibilidade enquanto outros lugares do código ainda chamam. Migrar.
   ────────────────────────────────────────────────────────────────────────── */

/** @deprecated Use `buscarVinculoDaSolicitacao` + `listarPoolPorPaciente`. */
export async function buscarPorSolicitacao(solicitacaoId: string) {
  const { data } = await buscarVinculoDaSolicitacao(solicitacaoId);
  if (!data || !data.dados_bancarios_id) return { data: null };
  // Retorna no formato antigo (Row de dados_bancarios) baseado no snapshot.
  return {
    data: {
      id: data.dados_bancarios_id,
      banco: data.snapshot_banco,
      agencia: data.snapshot_agencia,
      conta: data.snapshot_conta,
      tipo_conta: data.snapshot_tipo_conta,
      nome_titular: data.snapshot_nome_titular,
      cpf_titular: data.snapshot_cpf_titular,
      titular_vinculo: data.snapshot_titular_vinculo,
      pix_tipo: data.snapshot_pix_tipo,
      pix_chave: data.snapshot_pix_chave,
    },
  };
}

/** @deprecated Renomeado para `listarPoolPorPaciente`. */
export const listarPorPaciente = listarPoolPorPaciente;
