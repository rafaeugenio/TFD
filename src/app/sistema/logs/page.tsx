'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  Download,
  Info,
  Loader2,
  ArrowRight,
  Plus,
  Trash2,
  Calendar,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import Pagination from '@/shared/components/pagination/Pagination';
import { TableRowsSkeleton } from '@/shared/components/skeleton';
import SortTh from '@/shared/components/sort-th/SortTh';
import { useToast } from '@/shared/components/toast/Toast';
import { formatDateTime } from '@/shared/pipes/formatters';
import Drawer from '@/shared/components/drawer/Drawer';
import { useTableControls } from '@/shared/hooks/useTableControls';
import {
  listarLogs,
  diffCampos,
  ACAO_LABEL as ACAO_REAL_LABEL,
  ENTIDADE_LABEL,
  ENTIDADE_MODULO,
  type LogAuditoria,
} from '@/services/logs.service';

/* -------------------------------------------------- */
/*  Types                                              */
/* -------------------------------------------------- */

interface Alteracao {
  campo: string;
  label: string;
  anterior: string | null;
  novo: string | null;
}

interface LogEntry {
  id: string;
  solicitacao_id: string | null;
  usuario_id: string;
  nome_usuario: string;
  perfil_usuario: string;
  acao: string;
  entidade_alterada: string;
  entidade_id: string | null;
  campo_alterado: string | null;
  valor_anterior: string | null;
  valor_novo: string | null;
  ip: string;
  user_agent: string;
  created_at: string;
  modulo: string;
  descricao: string;
  referencia?: string;
  alteracoes?: Alteracao[];
}

/* -------------------------------------------------- */
/*  Action badge severity mapping                      */
/* -------------------------------------------------- */

type Severity = 'success' | 'info' | 'danger' | 'neutral';

const ACAO_SEVERITY: Record<string, Severity> = {
  SOLICITACAO_CRIADA: 'success',
  USUARIO_CRIADO: 'success',
  DIARIA_APROVADA: 'success',
  EMBARQUE_CONFIRMADO: 'success',
  STATUS_ALTERADO: 'info',
  PARECER_EMITIDO: 'info',
  ROTA_DEFINIDA: 'info',
  PASSAGEM_EMITIDA: 'info',
  NO_SHOW_REGISTRADO: 'danger',
  PROCESSO_ENCERRADO: 'danger',
  DIARIA_GLOSADA: 'danger',
  PRIORIDADE_ALTERADA: 'danger',
};

const SEVERITY_STYLES: Record<Severity, { bg: string; color: string }> = {
  success: { bg: '#DCFCE7', color: '#15803D' },
  info: { bg: '#DBEAFE', color: '#1D4ED8' },
  danger: { bg: '#FEE2E2', color: '#B91C1C' },
  neutral: { bg: 'var(--tfd-surface-100)', color: 'var(--tfd-surface-600)' },
};

function getAcaoSeverity(acao: string): Severity {
  return ACAO_SEVERITY[acao] ?? 'neutral';
}

/* -------------------------------------------------- */
/*  Acao label mapping                                 */
/* -------------------------------------------------- */

const ACAO_LABELS: Record<string, string> = {
  SOLICITACAO_CRIADA: 'Criou',
  STATUS_ALTERADO: 'Editou',
  PARECER_EMITIDO: 'Parecer',
  PASSAGEM_EMITIDA: 'Emitiu',
  EMBARQUE_CONFIRMADO: 'Confirmou',
  NO_SHOW_REGISTRADO: 'NO-SHOW',
  DIARIA_APROVADA: 'Aprovou',
  DIARIA_PAGA: 'Pagou',
  DIARIA_GLOSADA: 'Glosou',
  PROCESSO_ENCERRADO: 'Encerrou',
  USUARIO_CRIADO: 'Criou',
  PRIORIDADE_ALTERADA: 'Editou',
  ROTA_DEFINIDA: 'Definiu',
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  VISUALIZOU: 'Visualizou',
  EXPORTOU: 'Exportou',
};

function getAcaoLabel(acao: string): string {
  return ACAO_LABELS[acao] ?? acao;
}

/* -------------------------------------------------- */
/*  Entity icon mapping                                */
/* -------------------------------------------------- */

const ENTIDADE_ICONS: Record<string, string> = {
  solicitacoes: '\u{1F4C4}',
  viagens: '\u{2708}\uFE0F',
  regulacao: '\u{1FA7A}',
  diarias: '\u{1F4B0}',
  usuarios: '\u{1F464}',
  permanencias: '\u{1F3E8}',
  encerramentos: '\u{1F6D1}',
  parametros: '\u{2699}\uFE0F',
  sessoes: '\u{1F511}',
};

function getEntidadeIcon(entidade: string): string {
  return ENTIDADE_ICONS[entidade.toLowerCase()] ?? '\u{1F4CB}';
}

const ENTIDADE_LABELS: Record<string, string> = {
  solicitacoes: 'Solicitação',
  viagens: 'Viagem',
  regulacao: 'Regulação',
  diarias: 'Diária',
  usuarios: 'Usuário',
  permanencias: 'Permanência',
  encerramentos: 'Encerramento',
  parametros: 'Parâmetro',
  sessoes: 'Sessão',
};

function getResumoTabela(log: LogEntry): string {
  const entidadeLabel =
    ENTIDADE_LABELS[log.entidade_alterada.toLowerCase()] ?? log.entidade_alterada;
  if (log.referencia) return `${entidadeLabel} · ${log.referencia}`;
  return entidadeLabel;
}

/* -------------------------------------------------- */
/*  Module badge colors                                */
/* -------------------------------------------------- */

const MODULO_STYLES: Record<string, { bg: string; color: string }> = {
  Operacional: { bg: '#DBEAFE', color: '#1D4ED8' },
  'Regulação': { bg: '#F5F3FF', color: '#7C3AED' },
  Passagens: { bg: '#FFEDD5', color: '#C2410C' },
  Financeiro: { bg: '#DCFCE7', color: '#15803D' },
  Sistema: { bg: 'var(--tfd-surface-100)', color: 'var(--tfd-surface-600)' },
  'Autenticação': { bg: '#FEF3C7', color: '#92400E' },
};

/* -------------------------------------------------- */
/*  Filter options                                     */
/* -------------------------------------------------- */

const ACAO_OPTIONS = [
  { value: 'ALL', label: 'Todas' },
  { value: 'SOLICITACAO_CRIADA', label: 'Criou' },
  { value: 'STATUS_ALTERADO', label: 'Editou' },
  { value: 'PARECER_EMITIDO', label: 'Parecer' },
  { value: 'PASSAGEM_EMITIDA', label: 'Emitiu' },
  { value: 'EMBARQUE_CONFIRMADO', label: 'Confirmou' },
  { value: 'NO_SHOW_REGISTRADO', label: 'NO-SHOW' },
  { value: 'DIARIA_APROVADA', label: 'Aprovou diária' },
  { value: 'DIARIA_PAGA', label: 'Pagou diária' },
  { value: 'PROCESSO_ENCERRADO', label: 'Encerrou' },
  { value: 'USUARIO_CRIADO', label: 'Criou usuário' },
  { value: 'PRIORIDADE_ALTERADA', label: 'Alterou prioridade' },
  { value: 'ROTA_DEFINIDA', label: 'Definiu rota' },
];

const MODULO_OPTIONS = [
  { value: 'ALL', label: 'Todos' },
  { value: 'Operacional', label: 'Operacional' },
  { value: 'Regulação', label: 'Regulação' },
  { value: 'Passagens', label: 'Passagens' },
  { value: 'Financeiro', label: 'Financeiro' },
  { value: 'Sistema', label: 'Sistema' },
  { value: 'Autenticação', label: 'Autenticação' },
];

/* -------------------------------------------------- */
/*  Avatar helper                                      */
/* -------------------------------------------------- */

const AVATAR_COLORS = [
  { bg: '#3B82F6', color: '#FFFFFF' },
  { bg: '#8B5CF6', color: '#FFFFFF' },
  { bg: '#EC4899', color: '#FFFFFF' },
  { bg: '#F59E0B', color: '#FFFFFF' },
  { bg: '#10B981', color: '#FFFFFF' },
  { bg: '#EF4444', color: '#FFFFFF' },
  { bg: '#06B6D4', color: '#FFFFFF' },
  { bg: '#6366F1', color: '#FFFFFF' },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/* -------------------------------------------------- */
/*  DateTime short format (DD/MM/AA HH:MM)             */
/* -------------------------------------------------- */

function formatDateTimeShort(iso: string): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = String(d.getFullYear()).slice(-2);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/* -------------------------------------------------- */
/*  Constants                                          */
/* -------------------------------------------------- */

const PAGE_SIZE = 20;

/* -------------------------------------------------- */
/*  Acao tipo mapping (for drawer content labels)      */
/* -------------------------------------------------- */

type TipoAcao = 'criar' | 'editar' | 'encerrar';

const ACAO_TIPO_MAP: Record<string, TipoAcao> = {
  SOLICITACAO_CRIADA: 'criar',
  USUARIO_CRIADO: 'criar',
  PROCESSO_ENCERRADO: 'encerrar',
};

function getTipoAcao(acao: string): TipoAcao {
  return ACAO_TIPO_MAP[acao] ?? 'editar';
}

/* -------------------------------------------------- */
/*  LogDrawer component                                */
/* -------------------------------------------------- */

function LogDrawer({ log, onClose }: { log: LogEntry | null; onClose: () => void }) {
  if (!log) return null;

  const tipo = getTipoAcao(log.acao);
  const severity = getAcaoSeverity(log.acao);
  const severityStyle = SEVERITY_STYLES[severity];
  const avatarColor = getAvatarColor(log.nome_usuario);
  const entidadeLabel =
    ENTIDADE_LABELS[log.entidade_alterada.toLowerCase()] ?? log.entidade_alterada;

  // Build alteracoes: prefer explicit array, fallback to campo_alterado
  const alteracoes: Alteracao[] =
    log.alteracoes && log.alteracoes.length > 0
      ? log.alteracoes
      : log.campo_alterado
      ? [
          {
            campo: log.campo_alterado,
            label: log.campo_alterado,
            anterior: log.valor_anterior,
            novo: log.valor_novo,
          },
        ]
      : [];

  const secaoAlteracoesLabel =
    tipo === 'criar'
      ? 'Campos do item criado'
      : tipo === 'encerrar'
      ? 'Dados do item encerrado'
      : 'Campos alterados';

  return (
    <Drawer
      open={true}
      onClose={onClose}
      title={`${getAcaoLabel(log.acao)} · ${entidadeLabel}`}
      subtitle={formatDateTime(log.created_at)}
      width="540px"
    >
      <div className="flex flex-col gap-5">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="tfd-tag tfd-tag--rounded"
            style={{ backgroundColor: severityStyle.bg, color: severityStyle.color }}
          >
            {getAcaoLabel(log.acao)}
          </span>
          <span
            className="tfd-tag tfd-tag--rounded"
            style={{
              backgroundColor: 'var(--tfd-surface-100)',
              color: 'var(--tfd-surface-700)',
            }}
          >
            {getEntidadeIcon(log.entidade_alterada)} {log.entidade_alterada}
          </span>
          {(() => {
            const moduloStyle =
              MODULO_STYLES[log.modulo] ?? MODULO_STYLES['Sistema'];
            return (
              <span
                className="tfd-tag tfd-tag--rounded"
                style={{ backgroundColor: moduloStyle.bg, color: moduloStyle.color }}
              >
                {log.modulo}
              </span>
            );
          })()}
        </div>

        {/* Description */}
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-wide mb-1"
            style={{ color: 'var(--tfd-text-muted)' }}
          >
            Descrição
          </p>
          <p className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>
            {log.descricao}
          </p>
        </div>

        {/* User */}
        <div style={{ borderTop: '1px solid var(--tfd-surface-border)', paddingTop: '1.25rem' }}>
          <p
            className="text-xs font-semibold uppercase tracking-wide mb-3"
            style={{ color: 'var(--tfd-text-muted)' }}
          >
            Usuário responsável
          </p>
          <div className="flex items-center gap-3">
            <div
              className="tfd-avatar tfd-avatar--circle shrink-0"
              style={{
                backgroundColor: avatarColor.bg,
                color: avatarColor.color,
                fontSize: '0.75rem',
                width: '2.25rem',
                height: '2.25rem',
              }}
            >
              {getInitials(log.nome_usuario)}
            </div>
            <div className="min-w-0">
              <p
                className="text-sm font-medium"
                style={{ color: 'var(--tfd-text-primary)' }}
              >
                {log.nome_usuario}
              </p>
              <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                {log.perfil_usuario} · IP {log.ip}
              </p>
            </div>
          </div>
        </div>

        {/* Alterações */}
        {alteracoes.length > 0 && (
          <div style={{ borderTop: '1px solid var(--tfd-surface-border)', paddingTop: '1.25rem' }}>
            <p
              className="text-xs font-semibold uppercase tracking-wide mb-3"
              style={{ color: 'var(--tfd-text-muted)' }}
            >
              {secaoAlteracoesLabel}
            </p>
            <div className="flex flex-col gap-2">
              {alteracoes.map((alt) => (
                <div
                  key={alt.campo}
                  className="rounded-md px-3 py-2.5"
                  style={{ backgroundColor: 'var(--tfd-surface-50, var(--tfd-surface-100))' }}
                >
                  <p
                    className="text-xs font-medium mb-1.5"
                    style={{ color: 'var(--tfd-text-muted)' }}
                  >
                    {alt.label}
                  </p>

                  {tipo === 'criar' ? (
                    /* Create: show only new value with + icon */
                    <div className="flex items-center gap-2">
                      <Plus size={13} style={{ color: '#15803D', flexShrink: 0 }} />
                      <span
                        className="text-sm font-medium"
                        style={{ color: 'var(--tfd-text-primary)' }}
                      >
                        {alt.novo ?? '—'}
                      </span>
                    </div>
                  ) : tipo === 'encerrar' ? (
                    /* Encerrar: show only anterior value with - icon */
                    <div className="flex items-center gap-2">
                      <Trash2 size={13} style={{ color: '#B91C1C', flexShrink: 0 }} />
                      <span
                        className="text-sm"
                        style={{ color: 'var(--tfd-text-secondary)' }}
                      >
                        {alt.anterior ?? '—'}
                      </span>
                    </div>
                  ) : (
                    /* Edit: show before → after */
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-sm px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: '#FEE2E2',
                          color: '#B91C1C',
                          textDecoration: alt.anterior ? 'line-through' : 'none',
                        }}
                      >
                        {alt.anterior ?? '—'}
                      </span>
                      <ArrowRight
                        size={14}
                        style={{ color: 'var(--tfd-text-muted)', flexShrink: 0 }}
                      />
                      <span
                        className="text-sm px-2 py-0.5 rounded font-medium"
                        style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}
                      >
                        {alt.novo ?? '—'}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

/**
 * Converte uma linha real de log_auditoria no shape `LogEntry` usado pela UI.
 * Mapeia acao genérica (INSERT/UPDATE/DELETE) + entidade_alterada para
 * labels de ação/módulo/descrição amigáveis.
 */
function toLogEntry(row: LogAuditoria): LogEntry {
  const entidadeNome = ENTIDADE_LABEL[row.entidade_alterada] ?? row.entidade_alterada;
  const modulo = ENTIDADE_MODULO[row.entidade_alterada] ?? 'Sistema';
  const acaoLabel = ACAO_REAL_LABEL[row.acao] ?? row.acao;

  let descricao = `${acaoLabel} ${entidadeNome}`;
  const novo = row.valor_novo as Record<string, unknown> | null;
  const anterior = row.valor_anterior as Record<string, unknown> | null;
  const ref =
    (novo?.['numero_processo'] as string) ??
    (novo?.['nome_completo'] as string) ??
    (novo?.['nome'] as string) ??
    (anterior?.['numero_processo'] as string) ??
    (anterior?.['nome_completo'] as string) ??
    (anterior?.['nome'] as string) ??
    undefined;
  if (ref) descricao = `${acaoLabel} ${entidadeNome}: ${ref}`;

  const alteracoes: Alteracao[] = diffCampos(row).map((d) => ({
    campo: d.campo,
    label: d.campo,
    anterior: d.antes === null || d.antes === undefined ? null : String(d.antes),
    novo: d.depois === null || d.depois === undefined ? null : String(d.depois),
  }));

  return {
    id: row.id,
    solicitacao_id: row.solicitacao_id,
    usuario_id: row.usuario_id ?? '',
    nome_usuario: row.nome_usuario ?? 'Sistema',
    perfil_usuario: row.perfil_usuario ?? '',
    acao: row.acao,
    entidade_alterada: row.entidade_alterada,
    entidade_id: row.entidade_id,
    campo_alterado: null,
    valor_anterior: null,
    valor_novo: null,
    ip: row.ip ?? '',
    user_agent: row.user_agent ?? '',
    created_at: row.created_at,
    modulo,
    descricao,
    referencia: ref,
    alteracoes,
  };
}

export default function LogsAuditoriaPage() {
  return <LogsPanel showHeader />;
}

export function LogsPanel({ showHeader = true }: { showHeader?: boolean }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await listarLogs({ limit: 500 });
      if (error) {
        toast.error('Erro ao carregar logs', 'Verifique permissões ou conexão.');
        setLogs([]);
        return;
      }
      setLogs(data.map(toLogEntry));
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const table = useTableControls({
    data: logs as unknown as Record<string, unknown>[],
    searchFields: ['nome_usuario', 'descricao', 'entidade_alterada'],
    dateField: 'created_at',
  });

  /* Typed helpers */
  const paginatedLogs = table.paginated as unknown as LogEntry[];
  const filtered = table.filtered as unknown as LogEntry[];

  /* Filtros de coluna disponíveis */
  const acaoOptions = table.getFilterOptions('acao');
  const moduloOptions = table.getFilterOptions('modulo');
  const filterAcao = table.getActiveFilters('acao')[0] ?? '';
  const filterModulo = table.getActiveFilters('modulo')[0] ?? '';

  /* ---- Refresh real ---- */
  const handleRefresh = useCallback(async () => {
    await loadLogs();
    toast.info('Logs atualizados', 'Dados recarregados do banco.');
  }, [loadLogs, toast]);

  /* ---- CSV Export ---- */
  const handleExportCSV = useCallback(() => {
    const header = [
      'Data/Hora',
      'Usuário',
      'Perfil',
      'Ação',
      'Entidade',
      'Módulo',
      'Descrição',
      'IP',
    ].join(';');

    const rows = filtered.map((log) =>
      [
        formatDateTime(log.created_at),
        log.nome_usuario,
        log.perfil_usuario,
        log.acao,
        log.entidade_alterada,
        log.modulo,
        `"${log.descricao}"`,
        log.ip,
      ].join(';'),
    );

    const csvString = '\uFEFF' + [header, ...rows].join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'logs-tfd.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado!', 'O arquivo de logs foi gerado com sucesso.');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered]);

  return (
    <>
      {showHeader && (
        <PageHeader
          title="Logs e Auditoria"
          subtitle="Acompanhe todas as ações realizadas no sistema"
        />
      )}

      {/* ========== Demo banner ========== */}
      <div
        className="tfd-message tfd-message--info mb-4"
        role="status"
      >
        <Info size={16} className="tfd-message-icon" />
        <span>
          Exibindo dados de demonstração. Os logs reais aparecerão conforme o
          sistema for utilizado.
        </span>
      </div>

      {/* ========== Toolbar (estilo v2) ========== */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div
          className="flex items-center gap-2 px-3"
          style={{
            background: 'white', border: '1px solid var(--tfd-surface-border)',
            borderRadius: 8, height: 36, minWidth: 280, flex: 1, maxWidth: 360,
          }}
        >
          <Search size={14} style={{ color: '#9CA3AF' }} />
          <input
            type="text"
            placeholder="Buscar por usuário, descrição..."
            value={table.search}
            onChange={(e) => table.setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-[13px]"
          />
        </div>

        <div
          className="flex items-center gap-2 px-3"
          style={{
            background: 'white', border: '1px solid var(--tfd-surface-border)',
            borderRadius: 8, height: 36,
          }}
        >
          <Calendar size={14} style={{ color: '#9CA3AF', flexShrink: 0 }} />
          <input type="date" className="bg-transparent outline-none text-[13px]"
            value={table.dateStart} onChange={(e) => table.setDateStart(e.target.value)} title="Data início" />
          <span className="text-[12px]" style={{ color: '#94A3B8' }}>até</span>
          <input type="date" className="bg-transparent outline-none text-[13px]"
            value={table.dateEnd} onChange={(e) => table.setDateEnd(e.target.value)} title="Data fim" />
        </div>

        <select
          value={filterAcao}
          onChange={(e) => table.setColumnFilter('acao', e.target.value ? [e.target.value] : [])}
          style={{
            height: 36, padding: '0 12px',
            background: 'white', border: '1px solid var(--tfd-surface-border)',
            borderRadius: 8, fontSize: 13, color: '#1A1D2B',
          }}
        >
          <option value="">Todas as ações</option>
          {acaoOptions.map((a) => (
            <option key={a} value={a}>{ACAO_LABELS[a] ?? a}</option>
          ))}
        </select>

        <select
          value={filterModulo}
          onChange={(e) => table.setColumnFilter('modulo', e.target.value ? [e.target.value] : [])}
          style={{
            height: 36, padding: '0 12px',
            background: 'white', border: '1px solid var(--tfd-surface-border)',
            borderRadius: 8, fontSize: 13, color: '#1A1D2B',
          }}
        >
          <option value="">Todos os módulos</option>
          {moduloOptions.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>

        <div className="flex items-center gap-2 ml-auto">
          <button
            className="tfd-btn tfd-btn-secondary tfd-btn--sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Atualizar
          </button>
          <button
            className="tfd-btn tfd-btn-primary tfd-btn--sm tfd-btn--outlined"
            onClick={handleExportCSV}
          >
            <Download size={14} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* ========== Tabela (fluxo v2) ========== */}
      <div
        style={{
          background: 'white',
          border: '1px solid var(--tfd-surface-border)',
          borderRadius: 'var(--tfd-radius-lg)',
          overflow: 'hidden',
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--tfd-surface-border)' }}>
                <SortTh label="Usuário" field="nome_usuario" currentField={table.sort.field} currentDir={table.sort.direction} onToggle={table.toggleSort} />
                <SortTh label="Ação" field="acao" currentField={table.sort.field} currentDir={table.sort.direction} onToggle={table.toggleSort} />
                <SortTh label="Entidade" field="entidade_alterada" currentField={table.sort.field} currentDir={table.sort.direction} onToggle={table.toggleSort} />
                <SortTh label="Módulo" field="modulo" className="hidden md:table-cell" currentField={table.sort.field} currentDir={table.sort.direction} onToggle={table.toggleSort} />
                <Th className="hidden lg:table-cell">Descrição</Th>
                <SortTh label="Data/Hora" field="created_at" currentField={table.sort.field} currentDir={table.sort.direction} onToggle={table.toggleSort} align="right" />
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <TableRowsSkeleton rows={6} columns={6} />
              ) : paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center" style={{ color: '#9CA3AF' }}>
                    <div className="flex flex-col items-center gap-3">
                      <Search size={26} style={{ color: 'var(--tfd-text-muted)' }} />
                      <p className="text-sm">Nenhum log encontrado com os filtros aplicados.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
                  const severity = getAcaoSeverity(log.acao);
                  const severityStyle = SEVERITY_STYLES[severity];
                  const avatarColor = getAvatarColor(log.nome_usuario);
                  const moduloStyle = MODULO_STYLES[log.modulo] ?? MODULO_STYLES['Sistema'];

                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}
                      className="cursor-pointer hover:bg-[#F8FAFC] transition-colors"
                    >
                      {/* Usuário */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 text-[11px] font-semibold"
                            style={{ backgroundColor: avatarColor.bg, color: avatarColor.color }}
                          >
                            {getInitials(log.nome_usuario)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold truncate" style={{ color: '#1A1D2B' }}>
                              {log.nome_usuario}
                            </p>
                            <p className="text-[11px] truncate" style={{ color: 'var(--tfd-text-muted)' }}>
                              {log.perfil_usuario}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Ação */}
                      <td className="px-4 py-3.5">
                        <span
                          className="tfd-tag tfd-tag--rounded"
                          style={{ backgroundColor: severityStyle.bg, color: severityStyle.color }}
                        >
                          {getAcaoLabel(log.acao)}
                        </span>
                      </td>

                      {/* Entidade */}
                      <td className="px-4 py-3.5">
                        <span
                          className="tfd-tag tfd-tag--rounded"
                          style={{ backgroundColor: 'var(--tfd-surface-100)', color: 'var(--tfd-surface-700)' }}
                        >
                          {getEntidadeIcon(log.entidade_alterada)}{' '}
                          {log.entidade_alterada}
                        </span>
                      </td>

                      {/* Módulo */}
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        <span
                          className="tfd-tag tfd-tag--rounded"
                          style={{ backgroundColor: moduloStyle.bg, color: moduloStyle.color }}
                        >
                          {log.modulo}
                        </span>
                      </td>

                      {/* Descrição */}
                      <td className="px-4 py-3.5 hidden lg:table-cell max-w-[320px]" style={{ color: 'var(--tfd-text-secondary)' }}>
                        <p className="truncate" title={log.descricao}>
                          {getResumoTabela(log)}
                        </p>
                      </td>

                      {/* Data/Hora */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)', fontSize: 12 }}>
                        {formatDateTimeShort(log.created_at)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length > 0 && (
          <Pagination
            total={filtered.length}
            pageSize={table.pageSize}
            page={table.page}
            onPageChange={table.setPage}
            onPageSizeChange={table.setPageSize}
            recordLabel="eventos"
          />
        )}
      </div>

      <LogDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />
    </>
  );
}

/* -------------------------------------------------- */
/*  Helpers                                            */
/* -------------------------------------------------- */

function Th({
  children,
  align = 'left',
  className = '',
}: {
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}) {
  const cls = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  return (
    <th
      className={`px-4 py-3 font-semibold ${cls} ${className}`}
      style={{ color: '#64748B', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}
    >
      {children}
    </th>
  );
}
