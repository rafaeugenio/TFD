'use client';

import { useState, useCallback } from 'react';
import {
  Search,
  RefreshCw,
  Download,
  Info,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowRight,
  Plus,
  Trash2,
  Calendar,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import { useToast } from '@/shared/components/toast/Toast';
import { formatDateTime } from '@/shared/pipes/formatters';
import Drawer from '@/shared/components/drawer/Drawer';
import SortableHeader from '@/shared/components/table/SortableHeader';
import { useTableControls } from '@/shared/hooks/useTableControls';

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
    referencia: 'TFD-2026-0047',
    alteracoes: [
      { campo: 'paciente', label: 'Paciente', anterior: null, novo: 'Maria das Graças Pereira' },
      { campo: 'cid', label: 'CID', anterior: null, novo: 'C50.9 – Neoplasia maligna da mama' },
      { campo: 'municipio_origem', label: 'Município de origem', anterior: null, novo: 'São Luís – MA' },
      { campo: 'municipio_destino', label: 'Município de destino', anterior: null, novo: 'São Paulo – SP' },
      { campo: 'prioridade', label: 'Prioridade', anterior: null, novo: 'NORMAL' },
      { campo: 'status', label: 'Status', anterior: null, novo: 'NOVO' },
    ],
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
    referencia: 'TFD-2026-0047',
    alteracoes: [
      { campo: 'parecer', label: 'Parecer', anterior: null, novo: 'DEFERIDO' },
      { campo: 'justificativa', label: 'Justificativa', anterior: null, novo: 'Tratamento não disponível na rede municipal.' },
    ],
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
    referencia: 'José Oliveira',
    alteracoes: [
      { campo: 'tipo', label: 'Tipo', anterior: null, novo: 'Aérea' },
      { campo: 'origem', label: 'Origem', anterior: null, novo: 'SLZ – São Luís' },
      { campo: 'destino', label: 'Destino', anterior: null, novo: 'BSB – Brasília' },
      { campo: 'localizador', label: 'Localizador', anterior: null, novo: 'GLO-3321' },
    ],
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
    referencia: 'Raimunda Ferreira',
    alteracoes: [
      { campo: 'status', label: 'Status', anterior: 'PENDENTE', novo: 'APROVADA' },
      { campo: 'valor', label: 'Valor', anterior: null, novo: 'R$ 320,00' },
    ],
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
    referencia: 'TFD-2026-0032',
    alteracoes: [
      { campo: 'status', label: 'Status', anterior: 'AGUARDANDO_REGULACAO', novo: 'REGULADA_DEFERIDA' },
    ],
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
    referencia: 'Fernanda Lima',
    alteracoes: [
      { campo: 'nome', label: 'Nome', anterior: null, novo: 'Fernanda Lima' },
      { campo: 'email', label: 'E-mail', anterior: null, novo: 'fernanda.lima@saude.ma.gov.br' },
      { campo: 'perfil', label: 'Perfil', anterior: null, novo: 'ATENDENTE' },
      { campo: 'status', label: 'Status', anterior: null, novo: 'ATIVO' },
    ],
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
    referencia: 'Antonio Pereira',
    alteracoes: [
      { campo: 'embarque', label: 'Embarque', anterior: 'PENDENTE', novo: 'CONFIRMADO' },
      { campo: 'voo', label: 'Voo', anterior: null, novo: 'GLO-1234' },
    ],
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
    referencia: 'TFD-2026-0041',
    alteracoes: [
      { campo: 'prioridade', label: 'Prioridade', anterior: 'NORMAL', novo: 'URGENTE' },
      { campo: 'justificativa_prioridade', label: 'Justificativa', anterior: null, novo: 'Piora do quadro clínico relatada pelo médico assistente.' },
    ],
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
    referencia: 'Luiza Santos',
    alteracoes: [
      { campo: 'status', label: 'Status', anterior: 'APROVADA', novo: 'PAGA' },
      { campo: 'valor', label: 'Valor pago', anterior: null, novo: 'R$ 480,00' },
    ],
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
    referencia: 'TFD-2026-0048',
    alteracoes: [
      { campo: 'paciente', label: 'Paciente', anterior: null, novo: 'Pedro Almeida da Silva' },
      { campo: 'cid', label: 'CID', anterior: null, novo: 'I25.1 – Doença aterosclerótica do coração' },
      { campo: 'municipio_origem', label: 'Município de origem', anterior: null, novo: 'Imperatriz – MA' },
      { campo: 'municipio_destino', label: 'Município de destino', anterior: null, novo: 'São Paulo – SP' },
      { campo: 'status', label: 'Status', anterior: null, novo: 'NOVO' },
    ],
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
    referencia: 'Raimunda Ferreira',
    alteracoes: [
      { campo: 'situacao', label: 'Situação', anterior: 'EMITIDA', novo: 'NO_SHOW' },
      { campo: 'voo', label: 'Voo', anterior: null, novo: 'AZU-5678' },
    ],
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
    referencia: 'TFD-2026-0025',
    alteracoes: [
      { campo: 'paciente', label: 'Paciente', anterior: 'Francisco Moraes', novo: null },
      { campo: 'status_processo', label: 'Status do processo', anterior: 'EM_ANDAMENTO', novo: null },
      { campo: 'motivo_encerramento', label: 'Motivo', anterior: 'Alta médica', novo: null },
      { campo: 'data_encerramento', label: 'Data de encerramento', anterior: '22/03/2026', novo: null },
    ],
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
    referencia: 'TFD-2026-0044',
    alteracoes: [
      { campo: 'rota', label: 'Rota', anterior: null, novo: 'SLZ → GRU' },
      { campo: 'modal', label: 'Modal', anterior: null, novo: 'Aérea' },
    ],
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
    referencia: 'Valor de Diária',
    alteracoes: [
      { campo: 'valor_diaria', label: 'Valor da diária', anterior: 'R$ 300,00', novo: 'R$ 320,00' },
    ],
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
    referencia: 'TFD-2026-0049',
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
    referencia: 'Antonio Pereira',
    alteracoes: [
      { campo: 'status', label: 'Status', anterior: 'PENDENTE', novo: 'APROVADA' },
      { campo: 'valor', label: 'Valor', anterior: null, novo: 'R$ 640,00' },
      { campo: 'dias', label: 'Quantidade de dias', anterior: null, novo: '2 dias' },
    ],
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
    referencia: 'Marcos Sousa',
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
    referencia: 'TFD-2026-0038',
    alteracoes: [
      { campo: 'parecer', label: 'Parecer', anterior: null, novo: 'INDEFERIDO' },
      { campo: 'justificativa', label: 'Justificativa', anterior: null, novo: 'CID disponível na rede municipal de São Luís.' },
    ],
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
    referencia: 'TFD-2026-0047',
    alteracoes: [
      { campo: 'status', label: 'Status', anterior: 'NOVO', novo: 'EM_ANALISE' },
    ],
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
    referencia: 'R$ 160,00',
    alteracoes: [
      { campo: 'status', label: 'Status', anterior: 'PENDENTE', novo: 'GLOSADA' },
      { campo: 'motivo_glosa', label: 'Motivo da glosa', anterior: null, novo: 'Documentação incompleta' },
    ],
  },
];

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

export default function LogsAuditoriaPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  const table = useTableControls({
    data: MOCK_LOGS as unknown as Record<string, unknown>[],
    searchFields: ['nome_usuario', 'descricao', 'entidade_alterada'],
    dateField: 'created_at',
  });

  /* Typed helpers */
  const paginatedLogs = table.paginated as unknown as LogEntry[];
  const filtered = table.filtered as unknown as LogEntry[];

  /* Filter options for columns */
  const acaoFilterOptions = table.getFilterOptions('acao').map((v) => ({
    value: v,
    label: ACAO_LABELS[v] ?? v,
  }));
  const moduloFilterOptions = table.getFilterOptions('modulo');
  const entidadeFilterOptions = table.getFilterOptions('entidade_alterada');

  /* ---- Refresh simulation ---- */
  const handleRefresh = useCallback(() => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.info('Logs atualizados', 'Os dados foram recarregados.');
    }, 800);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    toast.success('CSV exportado!', 'O arquivo de logs foi gerado com sucesso.');
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
            className="tfd-input-leading-icon"
            style={{ color: 'var(--tfd-text-muted)' }}
          />
          <input
            type="text"
            className="tfd-input tfd-input--sm tfd-input--with-leading-icon"
            placeholder="Buscar por usuário, descrição..."
            value={table.search}
            onChange={(e) => table.setSearch(e.target.value)}
          />
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <Calendar size={14} style={{ color: 'var(--tfd-text-muted)', flexShrink: 0 }} />
          <input
            type="date"
            className="tfd-input tfd-input--sm"
            style={{ width: 'auto' }}
            value={table.dateStart}
            onChange={(e) => table.setDateStart(e.target.value)}
            placeholder="Início"
            title="Data início"
          />
          <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>até</span>
          <input
            type="date"
            className="tfd-input tfd-input--sm"
            style={{ width: 'auto' }}
            value={table.dateEnd}
            onChange={(e) => table.setDateEnd(e.target.value)}
            placeholder="Fim"
            title="Data fim"
          />
        </div>

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
                  <SortableHeader
                    label="Usuário"
                    sortDirection={table.getSortDirection('nome_usuario')}
                    onSort={() => table.toggleSort('nome_usuario')}
                  />
                  <SortableHeader
                    label="Ação"
                    sortDirection={table.getSortDirection('acao')}
                    onSort={() => table.toggleSort('acao')}
                    filterOptions={acaoFilterOptions}
                    activeFilters={table.getActiveFilters('acao')}
                    onFilterChange={(v) => table.setColumnFilter('acao', v)}
                  />
                  <SortableHeader
                    label="Entidade"
                    sortDirection={table.getSortDirection('entidade_alterada')}
                    onSort={() => table.toggleSort('entidade_alterada')}
                    filterOptions={entidadeFilterOptions}
                    activeFilters={table.getActiveFilters('entidade_alterada')}
                    onFilterChange={(v) => table.setColumnFilter('entidade_alterada', v)}
                  />
                  <SortableHeader
                    label="Módulo"
                    className="hidden md:table-cell"
                    sortDirection={table.getSortDirection('modulo')}
                    onSort={() => table.toggleSort('modulo')}
                    filterOptions={moduloFilterOptions}
                    activeFilters={table.getActiveFilters('modulo')}
                    onFilterChange={(v) => table.setColumnFilter('modulo', v)}
                  />
                  <th className="hidden lg:table-cell">Descrição</th>
                  <SortableHeader
                    label="Data/Hora"
                    sortDirection={table.getSortDirection('created_at')}
                    onSort={() => table.toggleSort('created_at')}
                  />
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
                      <tr
                        key={log.id}
                        onClick={() => setSelectedLog(log)}
                        className="cursor-pointer"
                        style={{ transition: 'background-color 0.12s' }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                            'var(--tfd-surface-50, var(--tfd-surface-100))';
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '';
                        }}
                      >
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
                            className="text-sm max-w-[280px] truncate"
                            style={{ color: 'var(--tfd-text-secondary)' }}
                            title={log.descricao}
                          >
                            {getResumoTabela(log)}
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
                {(table.page - 1) * 20 + 1}
              </span>
              {' '}&ndash;{' '}
              <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                {Math.min(table.page * 20, filtered.length)}
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
                onClick={() => table.setPage(Math.max(1, table.page - 1))}
                disabled={table.page === 1}
                aria-label="Página anterior"
              >
                <ChevronLeft size={16} />
              </button>

              <span
                className="text-sm px-3 font-medium"
                style={{ color: 'var(--tfd-text-primary)' }}
              >
                {table.page} / {table.totalPages}
              </span>

              <button
                className="tfd-btn tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only"
                onClick={() => table.setPage(Math.min(table.totalPages, table.page + 1))}
                disabled={table.page === table.totalPages}
                aria-label="Próxima página"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      <LogDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />
    </>
  );
}
