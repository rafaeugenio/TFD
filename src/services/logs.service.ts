import { createClient } from '@/lib/supabase/client';

/**
 * Linha bruta da tabela log_auditoria, enriquecida com nome do usuário
 * (vem do JOIN com usuarios).
 */
export interface LogAuditoria {
  id: string;
  solicitacao_id: string | null;
  usuario_id: string | null;
  nome_usuario: string | null;
  perfil_usuario: string | null;
  acao: 'INSERT' | 'UPDATE' | 'DELETE' | string;
  entidade_alterada: string;
  entidade_id: string | null;
  valor_anterior: Record<string, unknown> | null;
  valor_novo: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface ListarLogsOptions {
  /** Limite por página (default 100). */
  limit?: number;
  /** Offset pra paginação server-side. */
  offset?: number;
  /** Data inicial (ISO). */
  dataInicio?: string;
  /** Data final (ISO). */
  dataFim?: string;
  /** Filtra por entidade (ex: 'solicitacoes', 'usuarios'). */
  entidade?: string;
  /** Filtra por ação ('INSERT' | 'UPDATE' | 'DELETE'). */
  acao?: string;
  /** Filtra por usuário (id). */
  usuarioId?: string;
  /** Filtra por solicitação (id). */
  solicitacaoId?: string;
}

/**
 * Lista logs do banco. JOIN com `usuarios` traz o `nome_completo`.
 * Requer permissão `sys_logs.visualizar` (a RLS bloqueia o select se não tiver).
 */
export async function listarLogs(options: ListarLogsOptions = {}) {
  const supabase = createClient();
  const limit = options.limit ?? 100;
  const offset = options.offset ?? 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = supabase
    .from('log_auditoria')
    .select(
      `
      id, solicitacao_id, usuario_id, perfil_usuario, acao,
      entidade_alterada, entidade_id,
      valor_anterior, valor_novo, ip, user_agent, created_at,
      usuario:usuarios!log_auditoria_usuario_id_fkey(nome_completo)
    `,
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (options.dataInicio) q = q.gte('created_at', options.dataInicio);
  if (options.dataFim) q = q.lte('created_at', options.dataFim);
  if (options.entidade) q = q.eq('entidade_alterada', options.entidade);
  if (options.acao) q = q.eq('acao', options.acao);
  if (options.usuarioId) q = q.eq('usuario_id', options.usuarioId);
  if (options.solicitacaoId) q = q.eq('solicitacao_id', options.solicitacaoId);

  const { data, error, count } = await q;
  if (error) return { data: [] as LogAuditoria[], error, total: 0 };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = ((data as any[]) ?? []).map((r: any) => ({
    id: r.id,
    solicitacao_id: r.solicitacao_id,
    usuario_id: r.usuario_id,
    nome_usuario: r.usuario?.nome_completo ?? null,
    perfil_usuario: r.perfil_usuario,
    acao: r.acao,
    entidade_alterada: r.entidade_alterada,
    entidade_id: r.entidade_id,
    valor_anterior: r.valor_anterior,
    valor_novo: r.valor_novo,
    ip: r.ip,
    user_agent: r.user_agent,
    created_at: r.created_at,
  })) as LogAuditoria[];

  return { data: rows, error: null, total: count ?? 0 };
}

/**
 * Para uma linha de log, calcula quais campos mudaram entre valor_anterior
 * e valor_novo. Útil pra renderizar diff na UI.
 */
export interface CampoAlterado {
  campo: string;
  antes: unknown;
  depois: unknown;
}
export function diffCampos(log: LogAuditoria): CampoAlterado[] {
  if (log.acao !== 'UPDATE') return [];
  const old = log.valor_anterior ?? {};
  const next = log.valor_novo ?? {};
  const todasChaves = new Set([...Object.keys(old), ...Object.keys(next)]);

  const ignorar = new Set(['updated_at', 'created_at']);
  const out: CampoAlterado[] = [];
  for (const k of todasChaves) {
    if (ignorar.has(k)) continue;
    const a = (old as Record<string, unknown>)[k];
    const b = (next as Record<string, unknown>)[k];
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      out.push({ campo: k, antes: a, depois: b });
    }
  }
  return out;
}

/* -------------------------------------------------------------------------- */
/*  Labels humanos                                                            */
/* -------------------------------------------------------------------------- */

export const ACAO_LABEL: Record<string, string> = {
  INSERT: 'Criou',
  UPDATE: 'Editou',
  DELETE: 'Excluiu',
};

export const ENTIDADE_LABEL: Record<string, string> = {
  solicitacoes: 'Solicitação',
  pacientes: 'Paciente',
  acompanhantes: 'Acompanhante',
  dados_bancarios: 'Dados Bancários',
  pareceres: 'Parecer',
  exigencias: 'Exigência',
  rotas_regulacao: 'Rota de Regulação',
  agendamentos: 'Agendamento',
  tentativas_agendamento: 'Tentativa de Agendamento',
  viagens: 'Viagem',
  remarcacoes: 'Remarcação',
  ajudas_custo: 'Ajuda de Custo',
  adicionais: 'Adicional',
  permanencias: 'Permanência',
  prorrogacoes: 'Prorrogação',
  encerramentos: 'Encerramento',
  devolucoes: 'Devolução',
  termos_compromisso: 'Termo de Compromisso',
  documentos: 'Documento',
  usuarios: 'Usuário',
  papeis: 'Papel',
  papel_tela_acoes: 'Permissão',
  regionais_saude: 'Regional',
  unidades_destino: 'Unidade',
};

export const ENTIDADE_MODULO: Record<string, string> = {
  solicitacoes: 'Solicitações',
  pacientes: 'Pacientes',
  acompanhantes: 'Pacientes',
  dados_bancarios: 'Pacientes',
  documentos: 'Pacientes',
  pareceres: 'Regulação',
  exigencias: 'Regulação',
  rotas_regulacao: 'Regulação',
  agendamentos: 'Regulação',
  tentativas_agendamento: 'Regulação',
  viagens: 'Financeiro',
  remarcacoes: 'Financeiro',
  ajudas_custo: 'Financeiro',
  adicionais: 'Financeiro',
  permanencias: 'Financeiro',
  prorrogacoes: 'Financeiro',
  encerramentos: 'Solicitações',
  devolucoes: 'Solicitações',
  termos_compromisso: 'Solicitações',
  usuarios: 'Sistema',
  papeis: 'Sistema',
  papel_tela_acoes: 'Sistema',
  regionais_saude: 'Cadastros',
  unidades_destino: 'Cadastros',
};
