import { createClient } from '@/lib/supabase/client';
import type {
  InsertDTO,
  UpdateDTO,
  CategoriaAdicional,
  StatusAdicional,
} from '@/lib/supabase/database.types';

function getSupabase() {
  return createClient();
}

// ─── Labels ─────────────────────────────────────────────

export const CATEGORIA_ADICIONAL_LABELS: Record<CategoriaAdicional, string> = {
  PASSAGEM_EXTRA: 'Passagem Extra',
  AJUDA_CUSTO_EXTRA: 'Ajuda de Custo Extra',
  BAGAGEM: 'Bagagem',
  TRANSFER: 'Transfer',
  OUTRO: 'Outro',
};

export const STATUS_ADICIONAL_LABELS: Record<StatusAdicional, string> = {
  PENDENTE_APROVACAO: 'Pendente Aprovação',
  APROVADO: 'Aprovado',
  INDEFERIDO: 'Indeferido',
  PAGO: 'Pago',
};

// ─── CRUD ───────────────────────────────────────────────

export async function listarAdicionaisPorSolicitacao(solicitacaoId: string) {
  const supabase = getSupabase();
  return supabase
    .from('adicionais')
    .select('*, documentos(id, tipo, nome_arquivo, caminho_storage), aprovador:usuarios!adicionais_aprovado_por_fkey(nome_completo)')
    .eq('solicitacao_id', solicitacaoId)
    .order('created_at', { ascending: false });
}

export async function listarAdicionais(filters?: {
  status?: StatusAdicional;
  categoria?: CategoriaAdicional;
  dataInicio?: string;
  dataFim?: string;
}) {
  const supabase = getSupabase();
  let query = supabase
    .from('adicionais')
    .select('*, solicitacoes(numero_processo, pacientes(nome_completo))')
    .order('created_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.categoria) query = query.eq('categoria', filters.categoria);
  if (filters?.dataInicio) query = query.gte('data_ocorrencia', filters.dataInicio);
  if (filters?.dataFim) query = query.lte('data_ocorrencia', filters.dataFim);

  return query;
}

export async function criarAdicional(data: InsertDTO<'adicionais'>) {
  const supabase = getSupabase();
  const { data: created, error } = await supabase
    .from('adicionais')
    .insert(data)
    .select()
    .single();

  if (!error && created) {
    // AU1 — registra auditoria da criação
    await supabase.from('log_auditoria').insert({
      solicitacao_id: data.solicitacao_id,
      usuario_id: data.criado_por ?? '',
      perfil_usuario: 'COORDENADOR',
      acao: 'OBSERVACAO_REGISTRADA',
      entidade_alterada: 'adicionais',
      entidade_id: created.id,
      campo_alterado: null,
      valor_anterior: null,
      valor_novo: `Adicional criado: ${data.categoria} — ${data.descricao}`,
    } as never);
  }
  return { data: created, error };
}

export async function atualizarAdicional(
  id: string,
  dadosAnteriores: Record<string, unknown>,
  dadosNovos: UpdateDTO<'adicionais'>,
  usuarioId: string,
  perfilUsuario: string,
) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('adicionais')
    .update({ ...dadosNovos, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error || !data) return { data, error };

  // AU1 — diff por campo
  const camposAuditados: (keyof UpdateDTO<'adicionais'>)[] = [
    'categoria', 'descricao', 'valor', 'data_ocorrencia', 'status',
    'justificativa_solicitacao', 'justificativa_decisao', 'documento_id',
  ];

  const logs: Array<Record<string, unknown>> = [];
  for (const campo of camposAuditados) {
    const antes = (dadosAnteriores as Record<string, unknown>)[campo as string];
    const depois = (dadosNovos as Record<string, unknown>)[campo as string];
    if (depois === undefined) continue;
    const antesStr = antes == null ? '' : String(antes);
    const depoisStr = depois == null ? '' : String(depois);
    if (antesStr === depoisStr) continue;
    logs.push({
      solicitacao_id: (dadosAnteriores as any).solicitacao_id ?? null,
      usuario_id: usuarioId,
      perfil_usuario: perfilUsuario,
      acao: 'OBSERVACAO_REGISTRADA',
      entidade_alterada: 'adicionais',
      entidade_id: id,
      campo_alterado: String(campo),
      valor_anterior: antesStr || null,
      valor_novo: depoisStr || null,
    });
  }

  if (logs.length > 0) {
    await supabase.from('log_auditoria').insert(logs as never);
  }

  return { data, error: null };
}

export async function aprovarAdicional(
  id: string,
  usuarioId: string,
  perfilUsuario: string,
  justificativa?: string,
) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('adicionais')
    .update({
      status: 'APROVADO' as StatusAdicional,
      aprovado_por: usuarioId,
      aprovado_em: new Date().toISOString(),
      justificativa_decisao: justificativa ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (!error && data) {
    await supabase.from('log_auditoria').insert({
      solicitacao_id: (data as any).solicitacao_id,
      usuario_id: usuarioId,
      perfil_usuario: perfilUsuario,
      acao: 'DIARIA_APROVADA',
      entidade_alterada: 'adicionais',
      entidade_id: id,
      campo_alterado: 'status',
      valor_anterior: 'PENDENTE_APROVACAO',
      valor_novo: 'APROVADO',
    } as never);
  }

  return { data, error };
}

export async function indeferirAdicional(
  id: string,
  usuarioId: string,
  perfilUsuario: string,
  justificativa: string,
) {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('adicionais')
    .update({
      status: 'INDEFERIDO' as StatusAdicional,
      aprovado_por: usuarioId,
      aprovado_em: new Date().toISOString(),
      justificativa_decisao: justificativa,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (!error && data) {
    await supabase.from('log_auditoria').insert({
      solicitacao_id: (data as any).solicitacao_id,
      usuario_id: usuarioId,
      perfil_usuario: perfilUsuario,
      acao: 'DIARIA_GLOSADA',
      entidade_alterada: 'adicionais',
      entidade_id: id,
      campo_alterado: 'status',
      valor_anterior: 'PENDENTE_APROVACAO',
      valor_novo: 'INDEFERIDO',
    } as never);
  }

  return { data, error };
}

export async function marcarAdicionalPago(
  id: string,
  numeroRelatorio: string,
  usuarioId: string,
  perfilUsuario: string,
) {
  const supabase = getSupabase();
  const hoje = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('adicionais')
    .update({
      status: 'PAGO' as StatusAdicional,
      incluido_faturamento_em: hoje,
      numero_relatorio: numeroRelatorio,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (!error && data) {
    await supabase.from('log_auditoria').insert({
      solicitacao_id: (data as any).solicitacao_id,
      usuario_id: usuarioId,
      perfil_usuario: perfilUsuario,
      acao: 'DIARIA_PAGA',
      entidade_alterada: 'adicionais',
      entidade_id: id,
      campo_alterado: 'status',
      valor_anterior: 'APROVADO',
      valor_novo: `PAGO (${numeroRelatorio})`,
    } as never);
  }

  return { data, error };
}

export async function excluirAdicional(id: string) {
  const supabase = getSupabase();
  return supabase.from('adicionais').delete().eq('id', id);
}

// ─── Histórico AU1/AU2 ──────────────────────────────────

export async function listarHistoricoAdicional(adicionalId: string) {
  const supabase = getSupabase();
  return supabase
    .from('log_auditoria')
    .select('*, usuarios(nome_completo)')
    .eq('entidade_alterada', 'adicionais')
    .eq('entidade_id', adicionalId)
    .order('timestamp', { ascending: false });
}
