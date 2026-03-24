'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Search,
  RefreshCw,
  Download,
  Info,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import { formatDateTime } from '@/shared/pipes/formatters';

/* -------------------------------------------------- */
/*  Types                                              */
/* -------------------------------------------------- */

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
/*  Mock data                                          */
/* -------------------------------------------------- */

const MOCK_LOGS: LogEntry[] = [
  {
    id: 'log-001',
    solicitacao_id: 'sol-001',
    usuario_id: 'usr-001',
    nome_usuario: 'Rafael Eugenio',
    perfil_usuario: 'ADMIN',
    acao: 'SOLICITACAO_CRIADA',
    entidade_alterada: 'solicitacoes',
    entidade_id: 'sol-001',
    campo_alterado: null,
    valor_anterior: null,
    valor_novo: null,
    ip: '192.168.1.10',
    user_agent: 'Mozilla/5.0',
    created_at: '2026-03-24T14:32:00',
    modulo: 'Operacional',
    descricao: 'Criou solicitação TFD-2026-0047 para paciente Maria das Graças',
  },
  {
    id: 'log-002',
    solicitacao_id: 'sol-001',
    usuario_id: 'usr-002',
    nome_usuario: 'Maria Silva',
    perfil_usuario: 'MEDICO_AUDITOR',
    acao: 'PARECER_EMITIDO',
    entidade_alterada: 'regulacao',
    entidade_id: 'reg-001',
    campo_alterado: 'parecer',
    valor_anterior: null,
    valor_novo: 'DEFERIDO',
    ip: '192.168.1.22',
    user_agent: 'Mozilla/5.0',
    created_at: '2026-03-24T13:45:00',
    modulo: 'Regulação',
    descricao: 'Emitiu parecer DEFERIDO para solicitação TFD-2026-0047',
  },
  {
    id: 'log-003',
    solicitacao_id: 'sol-002',
    usuario_id: 'usr-003',
    nome_usuario: 'João Santos',
    perfil_usuario: 'PASSAGENS',
    acao: 'PASSAGEM_EMITIDA',
    entidade_alterada: 'viagens',
    entidade_id: 'viag-001',
    campo_alterado: null,
    valor_anterior: null,
    valor_novo: null,
    ip: '192.168.1.35',
    user_agent: 'Mozilla/5.0',
    created_at: '2026-03-24T11:20:00',
    modulo: 'Passagens',
    descricao: 'Emitiu passagem aérea SLZ → BSB para paciente José Oliveira',
  },
  {
    id: 'log-004',
    solicitacao_id: 'sol-003',
    usuario_id: 'usr-004',
    nome_usuario: 'Ana Costa',
    perfil_usuario: 'FINANCEIRO',
    acao: 'DIARIA_APROVADA',
    entidade_alterada: 'diarias',
    entidade_id: 'dia-001',
    campo_alterado: 'status',
    valor_anterior: 'PENDENTE',
    valor_novo: 'APROVADA',
    ip: '192.168.1.41',
    user_agent: 'Mozilla/5.0',
    created_at: '2026-03-24T10:15:00',
    modulo: 'Financeiro',
    descricao: 'Aprovou diária de R$ 320,00 para paciente Raimunda Ferreira',
  },
  {
    id: 'log-005',
    solicitacao_id: 'sol-002',
    usuario_id: 'usr-001',
    nome_usuario: 'Rafael Eugenio',
    perfil_usuario: 'ADMIN',
    acao: 'STATUS_ALTERADO',
    entidade_alterada: 'solicitacoes',
    entidade_id: 'sol-002',
    campo_alterado: 'status',
    valor_anterior: 'AGUARDANDO_REGULACAO',
    valor_novo: 'REGULADA_DEFERIDA',
    ip: '192.168.1.10',
    user_agent: 'Mozilla/5.0',
    created_at: '2026-03-24T09:50:00',
    modulo: 'Operacional',
    descricao: 'Alterou status da solicitação TFD-2026-0032 para Regulada (Deferida)',
  },
  {
    id: 'log-006',
    solicitacao_id: null,
    usuario_id: 'usr-005',
    nome_usuario: 'Carlos Mendes',
    perfil_usuario: 'COORDENACAO',
    acao: 'USUARIO_CRIADO',
    entidade_alterada: 'usuarios',
    entidade_id: 'usr-006',
    campo_alterado: null,
    valor_anterior: null,
    valor_novo: null,
    ip: '192.168.1.50',
    user_agent: 'Mozilla/5.0',
    created_at: '2026-03-23T16:30:00',
    modulo: 'Sistema',
    descricao: 'Criou usuário Fernanda Lima com perfil Atendente',
  },
  {
    id: 'log-007',
    solicitacao_id: 'sol-004',
    usuario_id: 'usr-003',
    nome_usuario: 'João Santos',
    perfil_usuario: 'PASSAGENS',
    acao: 'EMBARQUE_CONFIRMADO',
    entidade_alterada: 'viagens',
    entidade_id: 'viag-002',
    campo_alterado: 'embarque',
    valor_anterior: 'PENDENTE',
    valor_novo: 'CONFIRMADO',
    ip: '192.168.1.35',
    user_agent: 'Mozilla/5.0',
    created_at: '2026-03-23T15:10:00',
    modulo: 'Passagens',
    descricao: 'Confirmou embarque do paciente Antonio Pereira no voo GLO-1234',
  },
  {
    id: 'log-008',
    solicitacao_id: 'sol-005',
    usuario_id: 'usr-002',
    nome_usuario: 'Maria Silva',
    perfil_usuario: 'MEDICO_AUDITOR',
    acao: 'PRIORIDADE_ALTERADA',
    entidade_alterada: 'solicitacoes',
    entidade_id: 'sol-005',
    campo_alterado: 'prioridade',
    valor_anterior: 'NORMAL',
    valor_novo: 'URGENTE',
    ip: '192.168.1.22',
    user_agent: 'Mozilla/5.0',
    created_at: '2026-03-23T14:05:00',
    modulo: 'Regulação',
    descricao: 'Alterou prioridade para URGENTE na solicitação TFD-2026-0041',
  },
  {
    id: 'log-009',
    solicitacao_id: 'sol-006',
    usuario_id: 'usr-004',
    nome_usuario: 'Ana Costa',
    perfil_usuario: 'FINANCEIRO',
    acao: 'DIARIA_PAGA',
    entidade_alterada: 'diarias',
    entidade_id: 'dia-002',
    campo_alterado: 'status',
    valor_anterior: 'APROVADA',
    valor_novo: 'PAGA',
    ip: '192.168.1.41',
    user_agent: 'Mozilla/5.0',
    created_at: '2026-03-23T11:45:00',
    modulo: 'Financeiro',
    descricao: 'Registrou pagamento de diária R$ 480,00 para paciente Luiza Santos',
  },
  {
    id: 'log-010',
    solicitacao_id: 'sol-007',
    usuario_id: 'usr-006',
    nome_usuario: 'Fernanda Lima',
    perfil_usuario: 'ATENDENTE',
    acao: 'SOLICITACAO_CRIADA',
    entidade_alterada: 'solicitacoes',
    entidade_id: 'sol-007',
    campo_alterado: null,
    valor_anterior: null,
    valor_novo: null,
    ip: '192.168.1.60',
    user_agent: 'Mozilla/5.0',
    created_at: '2026-03-23T10:20:00',
    modulo: 'Operacional',
    descricao: 'Criou solicitação TFD-2026-0048 para paciente Pedro Almeida',
  },
  {
    id: 'log-011',
    solicitacao_id: 'sol-003',
    usuario_id: 'usr-003',
    nome_usuario: 'João Santos',
    perfil_usuario: 'PASSAGENS',
    acao: 'NO_SHOW_REGISTRADO',
    entidade_alterada: 'viagens',
    entidade_id: 'viag-003',
    campo_alterado: 'situacao',
    valor_anterior: 'EMITIDA',
    valor_novo: 'NO_SHOW',
    ip: '192.168.1.35',
    user_agent: 'Mozilla/5.0',
    created_at: '2026-03-23T09:00:00',
    modulo: 'Passagens',
    descricao: 'Registrou NO-SHOW para paciente Raimunda Ferreira no voo AZU-5678',
  },
  {
    id: 'log-012',
    solicitacao_id: 'sol-008',
    usuario_id: 'usr-001',
    nome_usuario: 'Rafael Eugenio',
    perfil_usuario: 'ADMIN',
    acao: 'PROCESSO_ENCERRADO',
    entidade_alterada: 'encerramentos',
    entidade_id: 'enc-001',
    campo_alterado: 'status',
    valor_anterior: 'EM_ANDAMENTO',
    valor_novo: 'ENCERRADO_ALTA',
    ip: '192.168.1.10',
    user_agent: 'Mozilla/5.0',
    created_at: '2026-03-22T17:30:00',
    modulo: 'Operacional',
    descricao: 'Encerrou processo TFD-2026-0025 por alta médica',
  },
  {
    id: 'log-013',
    solicitacao_id: 'sol-009',
    usuario_id: 'usr-002',
    nome_usuario: 'Maria Silva',
    perfil_usuario: 'MEDICO_AUDITOR',
    acao: 'ROTA_DEFINIDA',
    entidade_alterada: 'regulacao',
    entidade_id: 'reg-002',
    campo_alterado: 'rota',
    valor_anterior: null,
    valor_novo: 'SLZ → GRU',
    ip: '192.168.1.22',
    user_agent: 'Mozilla/5.0',
    created_at: '2026-03-22T16:15:00',
    modulo: 'Regulação',
    descricao: 'Definiu rota SLZ → GRU para solicitação TFD-2026-0044',
  },
  {
    id: 'log-014',
    solicitacao_id: null,
    usuario_id: 'usr-005',
    nome_usuario: 'Carlos Mendes',
    perfil_usuario: 'COORDENACAO',
    acao: 'STATUS_ALTERADO',
    entidade_alterada: 'parametros',
    entidade_id: 'param-001',
    campo_alterado: 'valor_diaria',
    valor_anterior: 'R$ 300,00',
    valor_novo: 'R$ 320,00',
    ip: '192.168.1.50',
    user_agent: 'Mozilla/5.0',
    created_at: '2026-03-22T14:00:00',
    modulo: 'Sistema',
    descricao: 'Atualizou valor da diária padrão de R$ 300,00 para R$ 320,00',
  },
  {
    id: 'log-015',
    solicitacao_id: 'sol-010',
    usuario_id: 'usr-006',
    nome_usuario: 'Fernanda Lima',
    perfil_usuario: 'ATENDENTE',
    acao: 'SOLICITACAO_CRIADA',
    entidade_alterada: 'solicitacoes',
    entidade_id: 'sol-010',
    campo_alterado: null,
    valor_anterior: null,
    valor_novo: null,
    ip: '192.168.1.60',
    user_agent: 'Mozilla/5.0',
    created_at: '2026-03-22T11:30:00',
    modulo: 'Operacional',
    descricao: 'Criou solicitação TFD-2026-0049 para paciente Francisca Ribeiro',
  },
  {
    id: 'log-016',
    solicitacao_id: 'sol-004',
    usuario_id: 'usr-004',
    nome_usuario: 'Ana Costa',
    perfil_usuario: 'FINANCEIRO',
    acao: 'DIARIA_APROVADA',
    entidade_alterada: 'diarias',
    entidade_id: 'dia-003',
    campo_alterado: 'status',
    valor_anterior: 'PENDENTE',
    valor_novo: 'APROVADA',
    ip: '192.168.1.41',
    user_agent: 'Mozilla/5.0',
    created_at: '2026-03-22T10:05:00',
    modulo: 'Financeiro',
    descricao: 'Aprovou diária de R$ 640,00 para paciente Antonio Pereira (2 dias)',
  },
  {
    id: 'log-017',
    solicitacao_id: 'sol-011',
    usuario_id: 'usr-003',
    nome_usuario: 'João Santos',
    perfil_usuario: 'PASSAGENS',
    acao: 'PASSAGEM_EMITIDA',
    entidade_alterada: 'viagens',
    entidade_id: 'viag-004',
    campo_alterado: null,
    valor_anterior: null,
    valor_novo: null,
    ip: '192.168.1.35',
    user_agent: 'Mozilla/5.0',
    created_at: '2026-03-21T15:45:00',
    modulo: 'Passagens',
    descricao: 'Emitiu passagem rodoviária SLZ → THE para paciente Marcos Sousa',
  },
  {
    id: 'log-018',
    solicitacao_id: 'sol-012',
    usuario_id: 'usr-002',
    nome_usuario: 'Maria Silva',
    perfil_usuario: 'MEDICO_AUDITOR',
    acao: 'PARECER_EMITIDO',
    entidade_alterada: 'regulacao',
    entidade_id: 'reg-003',
    campo_alterado: 'parecer',
    valor_anterior: null,
    valor_novo: 'INDEFERIDO',
    ip: '192.168.1.22',
    user_agent: 'Mozilla/5.0',
    created_at: '2026-03-21T14:10:00',
    modulo: 'Regulação',
    descricao: 'Emitiu parecer INDEFERIDO para solicitação TFD-2026-0038 — CID disponível em SLZ',
  },
  {
    id: 'log-019',
    solicitacao_id: 'sol-001',
    usuario_id: 'usr-001',
    nome_usuario: 'Rafael Eugenio',
    perfil_usuario: 'ADMIN',
    acao: 'STATUS_ALTERADO',
    entidade_alterada: 'solicitacoes',
    entidade_id: 'sol-001',
    campo_alterado: 'status',
    valor_anterior: 'NOVO',
    valor_novo: 'EM_ANALISE',
    ip: '192.168.1.10',
    user_agent: 'Mozilla/5.0',
    created_at: '2026-03-21T09:30:00',
    modulo: 'Operacional',
    descricao: 'Alterou status da solicitação TFD-2026-0047 de Novo para Em Análise',
  },
  {
    id: 'log-020',
    solicitacao_id: null,
    usuario_id: 'usr-005',
    nome_usuario: 'Carlos Mendes',
    perfil_usuario: 'COORDENACAO',
    acao: 'DIARIA_GLOSADA',
    entidade_alterada: 'diarias',
    entidade_id: 'dia-004',
    campo_alterado: 'status',
    valor_anterior: 'PENDENTE',
    valor_novo: 'GLOSADA',
    ip: '192.168.1.50',
    user_agent: 'Mozilla/5.0',
    created_at: '2026-03-21T08:15:00',
    modulo: 'Financeiro',
    descricao: 'Glosou diária de R$ 160,00 — documentação incompleta',
  },
];

/* -------------------------------------------------- */
/*  Constants                                          */
/* -------------------------------------------------- */

const PAGE_SIZE = 20;

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function LogsAuditoriaPage() {
  const [search, setSearch] = useState('');
  const [filterAcao, setFilterAcao] = useState('ALL');
  const [filterModulo, setFilterModulo] = useState('ALL');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  /* ---- Filter logic (local on mock data) ---- */
  const filtered = useMemo(() => {
    return MOCK_LOGS.filter((log) => {
      const matchAcao = filterAcao === 'ALL' || log.acao === filterAcao;
      const matchModulo = filterModulo === 'ALL' || log.modulo === filterModulo;
      const matchSearch =
        search === '' ||
        log.nome_usuario.toLowerCase().includes(search.toLowerCase()) ||
        log.descricao.toLowerCase().includes(search.toLowerCase()) ||
        log.acao.toLowerCase().includes(search.toLowerCase()) ||
        log.entidade_alterada.toLowerCase().includes(search.toLowerCase());
      return matchAcao && matchModulo && matchSearch;
    });
  }, [search, filterAcao, filterModulo]);

  /* ---- Pagination ---- */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  /* Reset page when filters change */
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleAcaoChange = useCallback((value: string) => {
    setFilterAcao(value);
    setPage(1);
  }, []);

  const handleModuloChange = useCallback((value: string) => {
    setFilterModulo(value);
    setPage(1);
  }, []);

  /* ---- Refresh simulation ---- */
  const handleRefresh = useCallback(() => {
    setLoading(true);
    setTimeout(() => setLoading(false), 800);
  }, []);

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
  }, [filtered]);

  return (
    <>
      <PageHeader
        title="Logs e Auditoria"
        subtitle="Acompanhe todas as ações realizadas no sistema"
      />

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

      {/* ========== Toolbar ========== */}
      <div className="tfd-toolbar mb-4 flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--tfd-text-muted)' }}
          />
          <input
            type="text"
            className="tfd-input tfd-input--sm pl-9"
            placeholder="Buscar por usuário, descrição..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        {/* Filter: Ação */}
        <select
          className="tfd-input tfd-input--sm"
          style={{ width: 'auto', minWidth: '160px' }}
          value={filterAcao}
          onChange={(e) => handleAcaoChange(e.target.value)}
        >
          {ACAO_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Filter: Módulo */}
        <select
          className="tfd-input tfd-input--sm"
          style={{ width: 'auto', minWidth: '150px' }}
          value={filterModulo}
          onChange={(e) => handleModuloChange(e.target.value)}
        >
          {MODULO_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Action buttons */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            className="tfd-btn tfd-btn-secondary tfd-btn--sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <RefreshCw size={14} />
            )}
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

      {/* ========== Table ========== */}
      <div className="tfd-card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2
              size={28}
              className="animate-spin"
              style={{ color: 'var(--tfd-primary-500)' }}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tfd-table">
              <thead>
                <tr>
                  <th>Usuário</th>
                  <th>Ação</th>
                  <th>Entidade</th>
                  <th className="hidden md:table-cell">Módulo</th>
                  <th className="hidden lg:table-cell">Descrição</th>
                  <th>Data/Hora</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <Search
                          size={32}
                          style={{ color: 'var(--tfd-text-muted)' }}
                        />
                        <p
                          className="text-sm"
                          style={{ color: 'var(--tfd-text-muted)' }}
                        >
                          Nenhum log encontrado com os filtros aplicados
                        </p>
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
                      <tr key={log.id}>
                        {/* Usuário */}
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div
                              className="tfd-avatar tfd-avatar--circle"
                              style={{
                                backgroundColor: avatarColor.bg,
                                color: avatarColor.color,
                                fontSize: '0.6875rem',
                              }}
                            >
                              {getInitials(log.nome_usuario)}
                            </div>
                            <div className="min-w-0">
                              <p
                                className="text-sm font-medium truncate"
                                style={{ color: 'var(--tfd-text-primary)' }}
                              >
                                {log.nome_usuario}
                              </p>
                              <p
                                className="text-xs truncate"
                                style={{ color: 'var(--tfd-text-muted)' }}
                              >
                                {log.perfil_usuario}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Ação */}
                        <td>
                          <span
                            className="tfd-tag tfd-tag--rounded"
                            style={{
                              backgroundColor: severityStyle.bg,
                              color: severityStyle.color,
                            }}
                          >
                            {getAcaoLabel(log.acao)}
                          </span>
                        </td>

                        {/* Entidade */}
                        <td>
                          <span
                            className="tfd-tag tfd-tag--rounded"
                            style={{
                              backgroundColor: 'var(--tfd-surface-100)',
                              color: 'var(--tfd-surface-700)',
                            }}
                          >
                            {getEntidadeIcon(log.entidade_alterada)}{' '}
                            {log.entidade_alterada}
                          </span>
                        </td>

                        {/* Módulo */}
                        <td className="hidden md:table-cell">
                          <span
                            className="tfd-tag tfd-tag--rounded"
                            style={{
                              backgroundColor: moduloStyle.bg,
                              color: moduloStyle.color,
                            }}
                          >
                            {log.modulo}
                          </span>
                        </td>

                        {/* Descrição */}
                        <td className="hidden lg:table-cell">
                          <p
                            className="text-sm max-w-[320px] truncate"
                            style={{ color: 'var(--tfd-text-secondary)' }}
                            title={log.descricao}
                          >
                            {log.descricao}
                          </p>
                        </td>

                        {/* Data/Hora */}
                        <td className="whitespace-nowrap">
                          <span
                            className="text-sm"
                            style={{ color: 'var(--tfd-text-secondary)' }}
                          >
                            {formatDateTimeShort(log.created_at)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ========== Pagination ========== */}
        {!loading && filtered.length > 0 && (
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid var(--tfd-surface-border)' }}
          >
            <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
              Exibindo{' '}
              <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                {(page - 1) * PAGE_SIZE + 1}
              </span>
              {' '}&ndash;{' '}
              <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                {Math.min(page * PAGE_SIZE, filtered.length)}
              </span>
              {' '}de{' '}
              <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                {filtered.length}
              </span>
              {' '}registros
            </p>

            <div className="flex items-center gap-1">
              <button
                className="tfd-btn tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                aria-label="Página anterior"
              >
                <ChevronLeft size={16} />
              </button>

              <span
                className="text-sm px-3 font-medium"
                style={{ color: 'var(--tfd-text-primary)' }}
              >
                {page} / {totalPages}
              </span>

              <button
                className="tfd-btn tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                aria-label="Próxima página"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
