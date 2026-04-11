import { createClient } from '@/lib/supabase/client';
import type { InsertDTO, UpdateDTO, SituacaoViagem, StatusSolicitacao, TipoViagem } from '@/lib/supabase/database.types';
import { buscarDevolucaoAtiva, resolverDevolucao } from './devolucoes.service';

function getSupabase() {
  return createClient();
}

const SITUACOES_TERMINAIS: SituacaoViagem[] = ['CANCELADA', 'NO_SHOW', 'REMARCADA'];

export async function listarViagens(filters?: {
  situacao?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const supabase = getSupabase();

  let query = supabase
    .from('viagens')
    .select('*, solicitacoes!inner(numero_processo, status, pacientes(nome_completo))', {
      count: 'exact',
    })
    .not('solicitacoes.status', 'in', '("CONCLUIDO","CANCELADO")')
    .order('created_at', { ascending: false });

  if (filters?.situacao && filters.situacao !== 'TODOS') {
    query = query.eq('situacao', filters.situacao as SituacaoViagem);
  }

  if (filters?.search) {
    query = query.or(
      `numero_bilhete.ilike.%${filters.search}%,origem_cidade.ilike.%${filters.search}%,destino_cidade.ilike.%${filters.search}%`,
    );
  }

  const page = filters?.page ?? 1;
  const size = filters?.pageSize ?? 10;
  query = query.range((page - 1) * size, page * size - 1);

  return query;
}

export async function buscarViagem(id: string) {
  const supabase = getSupabase();
  return supabase
    .from('viagens')
    .select('*, solicitacoes(numero_processo, pacientes(*)), remarcacoes(*)')
    .eq('id', id)
    .single();
}

/**
 * Lists solicitações with AGUARDANDO_EMISSAO that don't have an active viagem yet.
 */
export async function listarSolicitacoesAguardandoEmissao(filters?: { includeIds?: string[] }) {
  const supabase = getSupabase();
  let query = supabase
    .from('solicitacoes')
    .select('id, numero_processo, status, created_at, pacientes(nome_completo)');

  if (filters?.includeIds && filters.includeIds.length > 0) {
    query = query.or(`status.eq.AGUARDANDO_EMISSAO,id.in.(${filters.includeIds.join(',')})`);
  } else {
    query = query.eq('status', 'AGUARDANDO_EMISSAO');
  }

  const { data: solicitacoes, error } = await query.order('created_at', { ascending: true });
  if (error || !solicitacoes) return { data: [], error };
  // Excluir solicitações que já possuem viagem ATIVA (não-terminal)
  const { data: existentes } = await supabase
    .from('viagens')
    .select('solicitacao_id, situacao')
    .not('situacao', 'in', `("${SITUACOES_TERMINAIS.join('","')}")`);
  const ids = new Set((existentes ?? []).map((v: any) => v.solicitacao_id));
  return { data: solicitacoes.filter((s: any) => !ids.has(s.id)), error: null };
}

/**
 * Lista TODAS as viagens de uma solicitação (incluindo terminais), para histórico completo.
 */
export async function listarTodasViagensSolicitacao(solicitacaoId: string) {
  const supabase = getSupabase();
  return supabase
    .from('viagens')
    .select('*, remarcacoes(*)')
    .eq('solicitacao_id', solicitacaoId)
    .order('tipo', { ascending: true })
    .order('created_at', { ascending: true });
}

// ─── HELPERS INTERNOS ────────────────────────────────────────

async function verificarEAvancarSolicitacao(solicitacaoId: string) {
  const supabase = getSupabase();
  const { data: existing } = await supabase
    .from('viagens')
    .select('tipo, situacao')
    .eq('solicitacao_id', solicitacaoId);

  const ativas = (existing ?? []).filter(
    (v: any) => !SITUACOES_TERMINAIS.includes(v.situacao),
  );
  const temIda = ativas.some((v: any) => v.tipo === 'IDA');
  const temVolta = ativas.some((v: any) => v.tipo === 'VOLTA' || v.tipo === 'RETORNO');

  if (temIda && temVolta) {
    const devolucao = await buscarDevolucaoAtiva(solicitacaoId, 'PASSAGENS');
    let novoStatus: StatusSolicitacao = 'EM_PAGAMENTO';
    if (devolucao.data) {
      novoStatus = devolucao.data.status_retorno as StatusSolicitacao;
      await resolverDevolucao(devolucao.data.id, 'Viagens (ida + volta) emitidas. Retorno ao setor de origem.');
    }
    await supabase
      .from('solicitacoes')
      .update({ status: novoStatus, updated_at: new Date().toISOString() })
      .eq('id', solicitacaoId);
  }
}

// ─── CRIAÇÃO ─────────────────────────────────────────────────

/** Remove numero_sequencial do payload se presente — a coluna pode não existir no banco. */
function stripSequencial<T extends Record<string, unknown>>(data: T): T {
  const { numero_sequencial: _, ...rest } = data as any;
  return rest as T;
}

/**
 * Cria uma viagem. Avança para EM_PAGAMENTO quando existem IDA + VOLTA ativas.
 */
export async function criarViagem(data: InsertDTO<'viagens'>) {
  const supabase = getSupabase();

  const result = await supabase.from('viagens').insert(stripSequencial(data)).select().single();

  if (!result.error && data.solicitacao_id) {
    await verificarEAvancarSolicitacao(data.solicitacao_id);
  }

  return result;
}

/**
 * Cadastro obrigatório de ida + volta no mesmo momento.
 */
export async function criarViagemIdaVolta(
  ida: InsertDTO<'viagens'>,
  volta: InsertDTO<'viagens'>,
) {
  const supabase = getSupabase();

  const idaResult = await supabase.from('viagens').insert(stripSequencial(ida)).select().single();
  if (idaResult.error) return { ida: idaResult, volta: null, error: idaResult.error };

  const voltaResult = await supabase.from('viagens').insert(stripSequencial(volta)).select().single();
  if (voltaResult.error) return { ida: idaResult, volta: voltaResult, error: voltaResult.error };

  if (ida.solicitacao_id) {
    await verificarEAvancarSolicitacao(ida.solicitacao_id);
  }

  return { ida: idaResult, volta: voltaResult, error: null };
}

export async function atualizarViagem(id: string, data: UpdateDTO<'viagens'>) {
  const supabase = getSupabase();
  return supabase.from('viagens').update({ ...data, updated_at: new Date().toISOString() }).eq('id', id).select().single();
}

/**
 * P6 — Atualiza viagem já emitida gravando diff de cada campo alterado no log_auditoria.
 * Requer snapshot do estado anterior para calcular o diff.
 */
export async function atualizarViagemComAuditoria(
  id: string,
  dadosAnteriores: Record<string, unknown>,
  dadosNovos: UpdateDTO<'viagens'>,
  usuarioId: string,
  perfilUsuario: string,
  solicitacaoId?: string,
) {
  const supabase = getSupabase();
  const { data: atualizada, error } = await supabase
    .from('viagens')
    .update({ ...dadosNovos, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error || !atualizada) {
    return { data: atualizada, error };
  }

  // Calcula diff e grava uma linha por campo alterado
  const camposAuditados: string[] = [
    'modal', 'origem_cidade', 'origem_uf', 'destino_cidade', 'destino_uf',
    'data_embarque_prevista', 'companhia', 'numero_bilhete', 'valor',
    'medif_necessario', 'observacoes',
  ];

  const logs: Array<Record<string, unknown>> = [];
  for (const campo of camposAuditados) {
    const antes = dadosAnteriores[campo];
    const depois = (dadosNovos as Record<string, unknown>)[campo];
    if (depois === undefined) continue; // campo não foi enviado no payload
    const antesStr = antes == null ? '' : String(antes);
    const depoisStr = depois == null ? '' : String(depois);
    if (antesStr === depoisStr) continue;
    logs.push({
      solicitacao_id: solicitacaoId ?? null,
      usuario_id: usuarioId,
      perfil_usuario: perfilUsuario,
      acao: 'PASSAGEM_REMARCADA',
      entidade_alterada: 'viagens',
      entidade_id: id,
      campo_alterado: campo,
      valor_anterior: antesStr || null,
      valor_novo: depoisStr || null,
    });
  }

  if (logs.length > 0) {
    // Insere em batch — falha silenciosa para não bloquear edição
    await supabase.from('log_auditoria').insert(logs as never);
  }

  return { data: atualizada, error: null };
}

/**
 * P6 — Lista histórico de alterações de uma viagem (para exibir na tela de detalhes).
 */
export async function listarHistoricoViagem(viagemId: string) {
  const supabase = getSupabase();
  return supabase
    .from('log_auditoria')
    .select('*, usuarios(nome_completo)')
    .eq('entidade_alterada', 'viagens')
    .eq('entidade_id', viagemId)
    .order('timestamp', { ascending: false });
}

// ─── TRANSIÇÕES DE SITUAÇÃO ──────────────────────────────────

/**
 * AGUARDANDO_EMISSAO → EMITIDA
 */
export async function marcarComoEmitida(id: string, numeroBilhete?: string, companhia?: string) {
  const supabase = getSupabase();
  const payload: any = {
    situacao: 'EMITIDA' as SituacaoViagem,
    emitido_em: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (numeroBilhete !== undefined) payload.numero_bilhete = numeroBilhete;
  if (companhia !== undefined) payload.companhia = companhia;

  return supabase.from('viagens').update(payload).eq('id', id).select().single();
}

/**
 * EMITIDA → UTILIZADA. Auto-transiciona solicitação → EM_VIAGEM.
 */
export async function confirmarEmbarque(id: string, registradoPor?: string | null) {
  const supabase = getSupabase();
  const result = await supabase
    .from('viagens')
    .update({
      situacao: 'UTILIZADA',
      embarcou: true,
      embarcou_registrado_por: registradoPor || null,
      embarcou_registrado_em: new Date().toISOString(),
      data_embarque_real: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (!result.error && (result.data as any)?.solicitacao_id) {
    await supabase
      .from('solicitacoes')
      .update({ status: 'EM_VIAGEM', updated_at: new Date().toISOString() })
      .eq('id', (result.data as any).solicitacao_id);
  }

  return result;
}

/**
 * EMITIDA → NO_SHOW
 */
export async function registrarNoShow(id: string, registradoPor?: string | null) {
  const supabase = getSupabase();
  return supabase
    .from('viagens')
    .update({
      situacao: 'NO_SHOW',
      embarcou: false,
      embarcou_registrado_por: registradoPor || null,
      embarcou_registrado_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
}

/**
 * Qualquer não-terminal → CANCELADA, com motivo obrigatório.
 */
export async function cancelarViagem(id: string, motivo?: string) {
  const supabase = getSupabase();
  return supabase
    .from('viagens')
    .update({
      situacao: 'CANCELADA',
      motivo_cancelamento: motivo ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();
}

/**
 * Remarca uma viagem: marca a antiga como REMARCADA e cria uma nova viagem vinculada.
 * Retorna a viagem nova criada.
 */
export async function remarcarViagem(
  viagemAnteriorId: string,
  novaViagem: InsertDTO<'viagens'>,
  motivo: string,
  userId?: string,
) {
  const supabase = getSupabase();

  // 1. Buscar viagem anterior para pegar solicitacao_id e tipo
  const { data: anterior } = await supabase
    .from('viagens')
    .select('solicitacao_id, tipo')
    .eq('id', viagemAnteriorId)
    .single();
  if (!anterior) return { data: null, error: { message: 'Viagem anterior não encontrada' } };

  // 2. Marcar viagem antiga como REMARCADA
  await supabase
    .from('viagens')
    .update({
      situacao: 'REMARCADA' as SituacaoViagem,
      motivo_cancelamento: motivo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', viagemAnteriorId);

  // 3. Criar nova viagem
  const result = await supabase
    .from('viagens')
    .insert(stripSequencial({
      ...novaViagem,
      solicitacao_id: anterior.solicitacao_id,
      tipo: anterior.tipo,
      viagem_anterior_id: viagemAnteriorId,
      situacao: 'AGUARDANDO_EMISSAO' as SituacaoViagem,
    }))
    .select()
    .single();

  // 4. Criar registro de remarcação para auditoria
  if (!result.error && result.data) {
    await supabase.from('remarcacoes').insert({
      viagem_id: viagemAnteriorId,
      motivo_remarcacao: motivo,
      nova_data_embarque: novaViagem.data_embarque_prevista,
      solicitada_por: userId ?? null,
    } as any);
  }

  return result;
}

/**
 * Cria uma nova volta vinculada a uma prorrogação (pós-extensão de permanência).
 * Cancela a volta ativa atual se existir.
 */
export async function criarNovaVolta(
  solicitacaoId: string,
  prorrogacaoId: string,
  viagemData: InsertDTO<'viagens'>,
) {
  const supabase = getSupabase();

  // 1. Buscar volta ativa atual (se houver) e cancelar
  const { data: voltaAtiva } = await supabase
    .from('viagens')
    .select('id')
    .eq('solicitacao_id', solicitacaoId)
    .in('tipo', ['RETORNO'] as TipoViagem[])
    .not('situacao', 'in', `("${SITUACOES_TERMINAIS.join('","')}")`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let viagemAnteriorId: string | null = null;
  if (voltaAtiva) {
    viagemAnteriorId = voltaAtiva.id;
    await supabase
      .from('viagens')
      .update({
        situacao: 'CANCELADA' as SituacaoViagem,
        motivo_cancelamento: 'Prorrogação aprovada — nova passagem de volta necessária',
        updated_at: new Date().toISOString(),
      })
      .eq('id', voltaAtiva.id);
  }

  // 2. Criar nova volta
  const result = await supabase
    .from('viagens')
    .insert(stripSequencial({
      ...viagemData,
      solicitacao_id: solicitacaoId,
      tipo: viagemData.tipo ?? ('RETORNO' as any),
      prorrogacao_id: prorrogacaoId,
      viagem_anterior_id: viagemAnteriorId,
      situacao: 'AGUARDANDO_EMISSAO' as SituacaoViagem,
    }))
    .select()
    .single();

  return result;
}

// ─── QUERIES ─────────────────────────────────────────────────

export async function buscarViagensPorSolicitacao(solicitacaoId: string) {
  const supabase = getSupabase();
  return supabase
    .from('viagens')
    .select('id, tipo, data_embarque_prevista, situacao, origem_cidade, origem_uf, destino_cidade, destino_uf')
    .eq('solicitacao_id', solicitacaoId)
    .not('situacao', 'in', '("CANCELADA","NO_SHOW")')
    .order('data_embarque_prevista', { ascending: true });
}

export async function criarRemarcacao(data: InsertDTO<'remarcacoes'>) {
  const supabase = getSupabase();
  return supabase.from('remarcacoes').insert(data).select().single();
}

// ─── DEPRECATED ──────────────────────────────────────────────

/** @deprecated Não mais utilizado. Transições agora via funções individuais. */
export async function excluirViagem(id: string) {
  const supabase = getSupabase();
  return supabase.from('viagens').delete().eq('id', id);
}
