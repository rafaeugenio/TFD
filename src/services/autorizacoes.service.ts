import { createClient } from '@/lib/supabase/client';
import type { AcaoAuditoria } from '@/lib/supabase/database.types';

function getSupabase() {
  return createClient();
}

/**
 * Autorizações da coordenação (AZ1-AZ3 — Ata 07).
 *
 * Reaproveita `log_auditoria` com `acao = 'EXCECAO_SINALIZADA'`. O conteúdo da
 * autorização é serializado em JSON dentro de `valor_novo` e a decisão
 * (APROVADA/NEGADA) fica no `valor_anterior` quando encerrada.
 *
 * Estado de uma autorização:
 *  - PENDENTE: sem decisão (valor_anterior vazio)
 *  - APROVADA: valor_anterior = 'APROVADA|<motivo>'
 *  - NEGADA: valor_anterior = 'NEGADA|<motivo>'
 *
 * Isso mantém todas as autorizações na linha do tempo da solicitação
 * automaticamente (D2/AZ3) sem precisar de tabela nova.
 */

export type TipoAutorizacao =
  | 'PRAZO_CURTO'
  | 'ACOMPANHANTE_ADICIONAL'
  | 'ACOMPANHANTE_SUBSTITUICAO'
  | 'ACOMPANHANTE_FORA_FAIXA'
  | 'DADOS_DIVERGENTES'
  | 'OUTRO';

export type StatusAutorizacao = 'PENDENTE' | 'APROVADA' | 'NEGADA';

export const tipoAutorizacaoLabels: Record<TipoAutorizacao, string> = {
  PRAZO_CURTO: 'Entrada com prazo < 45 dias',
  ACOMPANHANTE_ADICIONAL: 'Acompanhante adicional',
  ACOMPANHANTE_SUBSTITUICAO: 'Substituição de acompanhante',
  ACOMPANHANTE_FORA_FAIXA: 'Acompanhante fora da faixa etária',
  DADOS_DIVERGENTES: 'Divergência cadastral justificada',
  OUTRO: 'Outra exceção',
};

export interface AutorizacaoCoordenacao {
  id: string;
  solicitacaoId: string | null;
  numeroProcesso?: string;
  pacienteNome?: string;
  tipo: TipoAutorizacao;
  justificativa: string;
  status: StatusAutorizacao;
  decisaoMotivo?: string;
  solicitadoPorId: string;
  solicitadoPorNome?: string;
  decididoPorId?: string;
  decididoPorNome?: string;
  createdAt: string;
  decididoEm?: string;
}

interface AutorizacaoPayload {
  tipo: TipoAutorizacao;
  justificativa: string;
  decisao?: StatusAutorizacao;
  decisaoMotivo?: string;
  decididoPorId?: string;
  decididoEm?: string;
}

function encodeValor(payload: AutorizacaoPayload) {
  return JSON.stringify(payload);
}

function decodeValor(valor: string | null): AutorizacaoPayload | null {
  if (!valor) return null;
  try {
    return JSON.parse(valor) as AutorizacaoPayload;
  } catch {
    return null;
  }
}

export async function criarAutorizacao(params: {
  solicitacaoId: string;
  tipo: TipoAutorizacao;
  justificativa: string;
  solicitadoPorId: string;
  solicitadoPorPerfil: string;
}) {
  const supabase = getSupabase();
  const payload = encodeValor({
    tipo: params.tipo,
    justificativa: params.justificativa,
  });

  return supabase
    .from('log_auditoria')
    .insert({
      solicitacao_id: params.solicitacaoId,
      usuario_id: params.solicitadoPorId,
      perfil_usuario: params.solicitadoPorPerfil as any,
      acao: 'EXCECAO_SINALIZADA' as AcaoAuditoria,
      entidade_alterada: 'autorizacoes_coordenacao',
      entidade_id: params.solicitacaoId,
      campo_alterado: 'autorizacao_solicitada',
      valor_novo: payload,
    } as any)
    .select()
    .single();
}

export async function decidirAutorizacao(params: {
  logId: string;
  decisao: 'APROVADA' | 'NEGADA';
  decisaoMotivo: string;
  decididoPorId: string;
  decididoPorPerfil: string;
  solicitacaoId: string;
}) {
  const supabase = getSupabase();

  // 1. Lê o log original para preservar o payload
  const { data: original } = await supabase
    .from('log_auditoria')
    .select('valor_novo')
    .eq('id', params.logId)
    .single();

  const originalPayload = decodeValor((original as any)?.valor_novo ?? null);
  if (!originalPayload) return { data: null, error: { message: 'Log original não encontrado' } };

  // 2. Atualiza o log com a decisão
  const updatedPayload = encodeValor({
    ...originalPayload,
    decisao: params.decisao,
    decisaoMotivo: params.decisaoMotivo,
    decididoPorId: params.decididoPorId,
    decididoEm: new Date().toISOString(),
  });

  const updateResult = await supabase
    .from('log_auditoria')
    .update({ valor_novo: updatedPayload, valor_anterior: params.decisao })
    .eq('id', params.logId);

  if (updateResult.error) return { data: null, error: updateResult.error };

  // 3. Registra um novo evento de decisão na linha do tempo (AZ3)
  return supabase
    .from('log_auditoria')
    .insert({
      solicitacao_id: params.solicitacaoId,
      usuario_id: params.decididoPorId,
      perfil_usuario: params.decididoPorPerfil as any,
      acao: 'EXCECAO_SINALIZADA' as AcaoAuditoria,
      entidade_alterada: 'autorizacoes_coordenacao',
      entidade_id: params.solicitacaoId,
      campo_alterado: 'autorizacao_decidida',
      valor_anterior: params.decisao,
      valor_novo: updatedPayload,
    } as any)
    .select()
    .single();
}

/**
 * Lista todas as autorizações solicitadas (pendentes e decididas).
 * Caixa de entrada da coordenadora.
 */
export async function listarAutorizacoes(filtros?: {
  status?: StatusAutorizacao;
}): Promise<AutorizacaoCoordenacao[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('log_auditoria')
    .select('*, usuarios(nome_completo), solicitacoes(numero_processo, pacientes(nome_completo))')
    .eq('acao', 'EXCECAO_SINALIZADA')
    .eq('entidade_alterada', 'autorizacoes_coordenacao')
    .eq('campo_alterado', 'autorizacao_solicitada')
    .order('timestamp', { ascending: false });

  if (error || !data) return [];

  const items: AutorizacaoCoordenacao[] = (data as any[]).map((r) => {
    const payload = decodeValor(r.valor_novo);
    const status: StatusAutorizacao = (payload?.decisao as StatusAutorizacao) ?? 'PENDENTE';
    return {
      id: r.id,
      solicitacaoId: r.solicitacao_id,
      numeroProcesso: r.solicitacoes?.numero_processo,
      pacienteNome: r.solicitacoes?.pacientes?.nome_completo,
      tipo: (payload?.tipo ?? 'OUTRO') as TipoAutorizacao,
      justificativa: payload?.justificativa ?? '',
      status,
      decisaoMotivo: payload?.decisaoMotivo,
      solicitadoPorId: r.usuario_id,
      solicitadoPorNome: r.usuarios?.nome_completo,
      decididoPorId: payload?.decididoPorId,
      decididoEm: payload?.decididoEm,
      createdAt: r.timestamp,
    };
  });

  if (filtros?.status) {
    return items.filter((it) => it.status === filtros.status);
  }
  return items;
}

/**
 * Lista autorizações de uma solicitação específica (para linha do tempo AZ3).
 */
export async function listarAutorizacoesPorSolicitacao(
  solicitacaoId: string,
): Promise<AutorizacaoCoordenacao[]> {
  const all = await listarAutorizacoes();
  return all.filter((a) => a.solicitacaoId === solicitacaoId);
}

export async function contarPendentes(): Promise<number> {
  const lista = await listarAutorizacoes({ status: 'PENDENTE' });
  return lista.length;
}
