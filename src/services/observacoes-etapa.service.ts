import { createClient } from '@/lib/supabase/client';
import type { AcaoAuditoria } from '@/lib/supabase/database.types';

function getSupabase() {
  return createClient();
}

/**
 * Observações estruturadas por etapa (D1 — Ata 07).
 *
 * Como o schema não tem tabela dedicada, reaproveitamos `log_auditoria` com
 * `acao = 'OBSERVACAO_REGISTRADA'`, onde:
 *  - `entidade_alterada` = 'solicitacoes'
 *  - `entidade_id` = solicitacao_id
 *  - `campo_alterado` = 'observacao_<etapa>' (parecer, regulacao, agendamento, passagens, ajuda_custo)
 *  - `valor_novo` = texto da observação
 *  - `usuario_id` = autor
 *  - `timestamp` = data
 *
 * Assim cada observação vira também um evento na linha do tempo (D2).
 */

export type EtapaObservacao =
  | 'parecer'
  | 'regulacao'
  | 'agendamento'
  | 'passagens'
  | 'ajuda_custo'
  | 'permanencia'
  | 'encerramento';

export interface ObservacaoEtapa {
  id: string;
  solicitacaoId: string;
  etapa: EtapaObservacao;
  texto: string;
  autorId: string;
  autorNome?: string;
  data: string;
}

const CAMPO_PREFIX = 'observacao_';

export async function registrarObservacao(params: {
  solicitacaoId: string;
  etapa: EtapaObservacao;
  texto: string;
  autorId: string;
  autorPerfil: string;
}) {
  const supabase = getSupabase();
  return supabase
    .from('log_auditoria')
    .insert({
      solicitacao_id: params.solicitacaoId,
      usuario_id: params.autorId,
      perfil_usuario: params.autorPerfil as any,
      acao: 'OBSERVACAO_REGISTRADA' as AcaoAuditoria,
      entidade_alterada: 'solicitacoes',
      entidade_id: params.solicitacaoId,
      campo_alterado: `${CAMPO_PREFIX}${params.etapa}`,
      valor_novo: params.texto,
    } as any)
    .select()
    .single();
}

export async function listarObservacoesPorSolicitacao(
  solicitacaoId: string,
): Promise<ObservacaoEtapa[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('log_auditoria')
    .select('*, usuarios(nome_completo)')
    .eq('solicitacao_id', solicitacaoId)
    .eq('acao', 'OBSERVACAO_REGISTRADA')
    .order('timestamp', { ascending: false });

  if (error || !data) return [];

  return (data as any[])
    .filter((r) => r.campo_alterado?.startsWith(CAMPO_PREFIX))
    .map((r) => ({
      id: r.id,
      solicitacaoId: r.solicitacao_id,
      etapa: r.campo_alterado.slice(CAMPO_PREFIX.length) as EtapaObservacao,
      texto: r.valor_novo ?? '',
      autorId: r.usuario_id,
      autorNome: r.usuarios?.nome_completo,
      data: r.timestamp,
    }));
}

export function agruparObservacoesPorEtapa(
  observacoes: ObservacaoEtapa[],
): Record<EtapaObservacao, ObservacaoEtapa[]> {
  const out: Record<string, ObservacaoEtapa[]> = {};
  for (const o of observacoes) {
    (out[o.etapa] ||= []).push(o);
  }
  return out as Record<EtapaObservacao, ObservacaoEtapa[]>;
}
