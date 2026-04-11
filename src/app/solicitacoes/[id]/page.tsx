'use client';

import { use, useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Heart,
  FileText,
  Stethoscope,
  ClipboardCheck,
  Calendar,
  Plane,
  Wallet,
  CalendarClock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  Download,
  ExternalLink,
  RefreshCw,
  Building2,
  Users,
  ShieldCheck,
  Info,
  Loader2,
  Pencil,
  Upload,
  X,
  Paperclip,
  Trash2,
  Send,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import StatusTag from '@/shared/components/status-tag/StatusTag';
import { useReferrerBreadcrumb } from '@/shared/hooks/useReferrerBreadcrumb';
import TimelineTFD, { type TimelineEvent } from '@/shared/components/timeline-tfd/TimelineTFD';
import ObservacoesEtapa from '@/shared/components/observacoes-etapa/ObservacoesEtapa';
import AutorizacaoInline from '@/shared/components/autorizacao-inline/AutorizacaoInline';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import UfCidadeSelect from '@/shared/components/uf-cidade-select/UfCidadeSelect';
import { useToast } from '@/shared/components/toast/Toast';
import { buscarSolicitacao, atualizarSolicitacao, atualizarStatus } from '@/services/solicitacoes.service';
import { criarParecer } from '@/services/pareceres.service';
import { criarRotaRegulacao, criarCobrancaExterna } from '@/services/regulacao.service';
import { criarAgendamento, atualizarAgendamento } from '@/services/agendamentos.service';
import { criarViagem, atualizarViagem } from '@/services/viagens.service';
import { criarAjudaCusto, atualizarAjudaCusto } from '@/services/ajuda-custo.service';
import { buscarViagensPorSolicitacao } from '@/services/viagens.service';
import { criarPermanencia, atualizarPermanencia, criarProrrogacao } from '@/services/permanencias.service';
import { buscarAjudaCustoPorSolicitacao } from '@/services/ajuda-custo.service';
import { uploadDocumento, excluirDocumento } from '@/services/documentos.service';
import {
  listarObservacoesPorSolicitacao,
  agruparObservacoesPorEtapa,
  type EtapaObservacao,
  type ObservacaoEtapa,
} from '@/services/observacoes-etapa.service';
import {
  listarAutorizacoesPorSolicitacao,
  tipoAutorizacaoLabels,
  type AutorizacaoCoordenacao,
} from '@/services/autorizacoes.service';
import { useCompanhias } from '@/shared/hooks/useLookup';
import LookupSelect from '@/shared/components/lookup-select/LookupSelect';
import { useCurrentUser } from '@/shared/hooks/useCurrentUser';
import { useParametroNumero } from '@/shared/hooks/useParametros';
import { calcularTotalDiarias } from '@/shared/utils/diarias';
import { formatCPF, formatCNS, formatCurrency, formatDate, formatDateTime, maskCPF, maskCNS, maskPhone, maskCurrency, parseCurrency } from '@/shared/pipes/formatters';
import type { StatusSolicitacao, TipoDocumento } from '@/core/models';
import type { TipoDocumento as TipoDocumentoDB } from '@/lib/supabase/database.types';
import type { SituacaoViagem, TipoRota, StatusParecer, MotivoAlta } from '@/core/models';

/* -------------------------------------------------- */
/*  Step indicator config                              */
/* -------------------------------------------------- */

interface ProcessStep {
  key: string;
  label: string;
  icon: React.ReactNode;
}

const PROCESS_STEPS: ProcessStep[] = [
  { key: 'solicitacao', label: 'Solicitação', icon: <FileText size={16} /> },
  { key: 'parecer', label: 'Parecer', icon: <Stethoscope size={16} /> },
  { key: 'regulacao', label: 'Regulação', icon: <ClipboardCheck size={16} /> },
  { key: 'agendamento', label: 'Agendamento', icon: <Calendar size={16} /> },
  { key: 'viagem', label: 'Viagem', icon: <Plane size={16} /> },
  { key: 'permanencia', label: 'Permanência', icon: <CalendarClock size={16} /> },
  { key: 'conclusao', label: 'Conclusão', icon: <CheckCircle2 size={16} /> },
];

function getActiveStepIndex(sol: any): number {
  const s = sol.status;
  if (s === 'NOVO' || s === 'EM_ANALISE') return 0;
  if (s === 'EXIGENCIA') return 0;
  if (s === 'INDEFERIDO') return 1;
  if (s === 'AGUARDANDO_REGULACAO') return 2;
  if (s === 'AGUARDANDO_AGENDAMENTO') return 3;
  if (s === 'AGUARDANDO_EMISSAO') return 4;
  if (s === 'EMITIDA' || s === 'EM_VIAGEM') return 4;
  if (s === 'EM_PERMANENCIA') return 5;
  if (s === 'CONCLUIDO') return 6;
  if (s === 'CANCELADO') return -1;
  return 0;
}

/* -------------------------------------------------- */
/*  Label maps                                         */
/* -------------------------------------------------- */

const docTypeLabels: Record<TipoDocumento, string> = {
  RG: 'RG',
  CPF: 'CPF',
  CNS: 'Cartão SUS',
  COMPROVANTE_RESIDENCIA: 'Comp. Residência',
  DECLARACAO_RESIDENCIA: 'Declaração de Residência',
  DOCUMENTO_ACOMPANHANTE: 'Doc. Acompanhante',
  TERMO_COMPROMISSO: 'Termo de Compromisso',
  DECLARACAO_RENDIMENTOS: 'Declaração de Rendimentos',
  LAUDO_MEDICO: 'Laudo Médico',
  EXAME_COMPLEMENTAR: 'Exame Complementar',
  RELATORIO_TRATAMENTO_ANTERIOR: 'Relat. Tratamento Ant.',
  DOCUMENTO_ENCAMINHAMENTO: 'Doc. Encaminhamento',
  RELATORIO_MEDICO_ACOMPANHAMENTO: 'Relat. Médico Acomp.',
  PARECER_ASSINADO: 'Parecer Assinado',
  DOCUMENTO_REGULACAO: 'Doc. Regulação',
  RESPOSTA_CNRAC: 'Resposta CNRAC',
  RESPOSTA_SETI: 'Resposta SETI',
  COMPROVANTE_AGENDAMENTO: 'Comp. Agendamento',
  COMPROVANTE_AGENDAMENTO_APP: 'Comp. Agendamento (App)',
  PASSAGEM_EMITIDA: 'Passagem Emitida',
  COTACAO_PASSAGEM: 'Cotação Passagem',
  COMPROVANTE_EMBARQUE: 'Comp. Embarque',
  MEDIF: 'MEDIF',
  DADOS_BANCARIOS: 'Dados Bancários',
  AUTORIZACAO_CONTA_TERCEIROS: 'Autorização Conta Terceiros',
  COMPROVANTE_PAGAMENTO: 'Comp. Pagamento',
  COMUNICADO_PERMANENCIA: 'Comunicado Permanência',
  RELATORIO_PERMANENCIA: 'Relat. Permanência',
  RELATORIO_ALTA: 'Relatório de Alta',
  CERTIDAO_OBITO: 'Certidão de Óbito',
  OUTROS: 'Outros',
};

const rotaLabels: { [key: string]: string } = {
  CNRAC: 'CNRAC',
  SETI: 'SETI',
  SAAS_DUTRA: 'SAAS / Hospital Dutra',
  RESPOSTA_EXTERNA: 'Consulta SAAS/Dutra',
  SERVICO_SOCIAL: 'Serviço Social',
  APROVADO_DIRETO: 'Aprovação Direta',
  APROVADO_PRORROGACAO: 'Prorrogação Aprovada',
  REPROVADO_PRORROGACAO: 'Prorrogação Indeferida',
};

const parecerLabels: Record<StatusParecer, { label: string; bg: string; color: string }> = {
  DEFERIDO: { label: 'Deferido', bg: '#DCFCE7', color: '#15803D' },
  INDEFERIDO: { label: 'Indeferido', bg: '#FEE2E2', color: '#B91C1C' },
  EXIGENCIA: { label: 'Exigência', bg: '#FEF3C7', color: '#92400E' },
};

const situacaoViagemLabels: Record<SituacaoViagem, { label: string; bg: string; color: string }> = {
  AGUARDANDO_EMISSAO: { bg: '#FEF3C7', text: '#92400E', label: 'Pendente' } as never,
  EMITIDA: { bg: '#DBEAFE', text: '#1D4ED8', label: 'Emitida' } as never,
  REMARCADA: { bg: '#E0E7FF', text: '#4338CA', label: 'Remarcada' } as never,
  CANCELADA: { bg: 'var(--tfd-surface-100)', text: 'var(--tfd-surface-500)', label: 'Cancelada' } as never,
  NO_SHOW: { bg: '#FEE2E2', text: '#B91C1C', label: 'Não Compareceu' } as never,
  UTILIZADA: { bg: '#DCFCE7', text: '#15803D', label: 'Utilizada' } as never,
};

const motivoAltaLabels: Record<MotivoAlta, string> = {
  ALTA_MEDICA: 'Alta Médica',
  OBITO: 'Óbito',
  DESISTENCIA: 'Desistência',
  ABANDONO: 'Abandono',
  TRANSFERENCIA: 'Transferência',
};

const statusAjudaLabels: Record<string, { label: string; bg: string; color: string }> = {
  EM_ANALISE: { label: 'Em Análise', bg: '#FEF3C7', color: '#92400E' },
  APROVADA: { label: 'Aprovada', bg: '#DBEAFE', color: '#1D4ED8' },
  CONCLUIDA: { label: 'Paga', bg: '#DCFCE7', color: '#15803D' },
  PAGO_PARCIALMENTE: { label: 'Pago Parcial', bg: '#FFF7ED', color: '#C2410C' },
  GLOSADA: { label: 'Glosada', bg: '#FEE2E2', color: '#B91C1C' },
};

/* -------------------------------------------------- */
/*  Document type → section mapping                    */
/* -------------------------------------------------- */

const DOC_SECTION_MAP: Record<string, TipoDocumento[]> = {
  paciente: ['RG', 'CPF', 'CNS', 'COMPROVANTE_RESIDENCIA', 'DOCUMENTO_ACOMPANHANTE'],
  diagnostico: ['LAUDO_MEDICO', 'EXAME_COMPLEMENTAR', 'RELATORIO_TRATAMENTO_ANTERIOR', 'DOCUMENTO_ENCAMINHAMENTO', 'RELATORIO_MEDICO_ACOMPANHAMENTO'],
  parecer: ['PARECER_ASSINADO'],
  regulacao: ['DOCUMENTO_REGULACAO', 'RESPOSTA_CNRAC', 'RESPOSTA_SETI'],
  agendamento: ['COMPROVANTE_AGENDAMENTO', 'COMPROVANTE_AGENDAMENTO_APP'],
  viagens: ['PASSAGEM_EMITIDA', 'COTACAO_PASSAGEM', 'COMPROVANTE_EMBARQUE', 'MEDIF'],
  ajudaCusto: ['DADOS_BANCARIOS', 'COMPROVANTE_PAGAMENTO'],
  permanencia: ['COMUNICADO_PERMANENCIA', 'RELATORIO_PERMANENCIA'],
  encerramento: ['RELATORIO_ALTA', 'CERTIDAO_OBITO'],
};

function getDocsForSection(docs: any[], section: string): any[] {
  const tipos = DOC_SECTION_MAP[section];
  if (!tipos) return [];
  return docs.filter((d: any) => tipos.includes(d.tipo));
}

function getOrphanDocs(docs: any[]): any[] {
  const allMapped = Object.values(DOC_SECTION_MAP).flat();
  return docs.filter((d: any) => !allMapped.includes(d.tipo));
}

/* -------------------------------------------------- */
/*  DocumentList — reusable doc list per section       */
/* -------------------------------------------------- */

function DocumentList({ docs, docTypeLabels: labels }: { docs: any[]; docTypeLabels: Record<string, string> }) {
  if (docs.length === 0) return null;
  return (
    <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--tfd-surface-border)' }}>
      <div className="flex items-center gap-1.5 mb-2">
        <Paperclip size={13} style={{ color: 'var(--tfd-text-muted)' }} />
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--tfd-text-muted)' }}>
          Documentos ({docs.length})
        </span>
      </div>
      <div className="space-y-1">
        {docs.map((doc: any) => (
          <a
            key={doc.id}
            href={doc.url_arquivo}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[var(--tfd-surface-hover)] cursor-pointer"
            style={{ transition: 'background-color 0.15s', textDecoration: 'none' }}
          >
            <div
              className="flex items-center justify-center w-7 h-7 rounded shrink-0"
              style={{ backgroundColor: 'var(--tfd-surface-100)', color: 'var(--tfd-text-secondary)' }}
            >
              <FileText size={12} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--tfd-text-primary)' }}>
                {doc.nome_arquivo ?? '—'}
              </p>
              <p className="text-[11px]" style={{ color: 'var(--tfd-text-muted)' }}>
                {labels[doc.tipo as TipoDocumento] ?? doc.tipo}
              </p>
            </div>
            <ExternalLink size={12} className="shrink-0" style={{ color: 'var(--tfd-text-muted)' }} />
          </a>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------- */
/*  Section Component                                  */
/* -------------------------------------------------- */

function Section({
  title,
  icon,
  children,
  badge,
  empty,
  onEdit,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  badge?: React.ReactNode;
  empty?: boolean;
  onEdit?: () => void;
}) {
  return (
    <div className="tfd-card">
      <div className="flex items-center gap-2 mb-4">
        <span style={{ color: 'var(--tfd-primary-500)' }}>{icon}</span>
        <h2 className="text-base font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
          {title}
        </h2>
        {badge}
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="ml-auto tfd-btn tfd-btn-ghost tfd-btn--sm"
            style={{ color: 'var(--tfd-primary-500)', gap: '0.25rem' }}
          >
            <Pencil size={13} />
            Editar
          </button>
        )}
      </div>
      {empty ? (
        <p className="text-sm py-4 text-center" style={{ color: 'var(--tfd-text-muted)' }}>
          Etapa ainda não iniciada
        </p>
      ) : (
        children
      )}
    </div>
  );
}

/* -------------------------------------------------- */
/*  Info Row                                           */
/* -------------------------------------------------- */

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3">
      <span className="text-sm font-medium shrink-0 w-40" style={{ color: 'var(--tfd-text-secondary)' }}>
        {label}
      </span>
      <span
        className="text-sm"
        style={{
          color: 'var(--tfd-text-primary)',
          fontFamily: mono ? 'var(--tfd-font-mono)' : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* -------------------------------------------------- */
/*  Build timeline from Supabase data                  */
/* -------------------------------------------------- */

function buildTimeline(
  sol: any,
  extras?: {
    observacoes?: ObservacaoEtapa[];
    autorizacoes?: AutorizacaoCoordenacao[];
  },
): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  // D1 — Observações por etapa (D2 — também aparecem na linha do tempo)
  const etapaLabels: Record<string, string> = {
    parecer: 'Parecer',
    regulacao: 'Regulação',
    agendamento: 'Agendamento',
    passagens: 'Passagens',
    ajuda_custo: 'Ajuda de custo',
    permanencia: 'Permanência',
    encerramento: 'Encerramento',
  };
  for (const obs of extras?.observacoes ?? []) {
    events.push({
      id: `ev-obs-${obs.id}`,
      date: formatDate(obs.data),
      title: `Observação registrada — ${etapaLabels[obs.etapa] ?? obs.etapa}`,
      description: obs.texto,
      status: 'info',
      user: obs.autorNome,
    });
  }

  // AZ3 — Autorizações registradas na linha do tempo
  for (const auth of extras?.autorizacoes ?? []) {
    events.push({
      id: `ev-auth-${auth.id}`,
      date: formatDate(auth.createdAt),
      title: `Autorização solicitada — ${tipoAutorizacaoLabels[auth.tipo]}`,
      description: auth.justificativa,
      status: 'warning',
      user: auth.solicitadoPorNome,
    });
    if (auth.status !== 'PENDENTE' && auth.decididoEm) {
      events.push({
        id: `ev-auth-dec-${auth.id}`,
        date: formatDate(auth.decididoEm),
        title: `Autorização ${auth.status === 'APROVADA' ? 'aprovada' : 'negada'}`,
        description: auth.decisaoMotivo,
        status: auth.status === 'APROVADA' ? 'success' : 'danger',
      });
    }
  }

  events.push({
    id: 'ev-criacao',
    date: formatDate(sol.created_at),
    title: 'Solicitação criada',
    description: `Processo ${sol.numero_processo} aberto`,
    status: 'info',
    user: sol.criado_por,
  });

  const parecer = sol.pareceres?.[0];
  if (parecer) {
    const statusMap: Record<string, TimelineEvent['status']> = {
      DEFERIDO: 'success',
      INDEFERIDO: 'danger',
      EXIGENCIA: 'warning',
    };
    events.push({
      id: `ev-parecer-${parecer.id}`,
      date: formatDate(parecer.data_hora_parecer),
      title: `Parecer médico: ${parecerLabels[parecer.decisao as StatusParecer]?.label ?? parecer.decisao}`,
      description: parecer.observacoes_medicas,
      status: statusMap[parecer.decisao] ?? 'neutral',
      user: parecer.usuarios?.nome_completo ?? parecer.medico_auditor_id,
    });
  }

  // Regulação routing events
  for (const rota of (sol.rotas_regulacao ?? [])) {
    events.push({
      id: `ev-rota-${rota.id}`,
      date: formatDate(rota.created_at),
      title: `Regulação: ${rotaLabels[rota.tipo_rota] ?? rota.tipo_rota}`,
      description: rota.justificativa,
      status: rota.tipo_rota === 'APROVADO_DIRETO' || rota.tipo_rota === 'APROVADO_PRORROGACAO' ? 'success' : 'info',
    });
  }

  const agendamento = sol.agendamentos?.[0];
  if (agendamento) {
    events.push({
      id: `ev-agd-${agendamento.id}`,
      date: formatDate(agendamento.data_hora_agendamento),
      title: `Agendamento ${agendamento.status === 'CONFIRMADO' ? 'confirmado' : 'registrado'} — ${agendamento.unidade_executante ?? ''}`,
      description: agendamento.cidade_destino ? `${agendamento.cidade_destino}/${agendamento.uf_destino}` : undefined,
      status: agendamento.status === 'CONFIRMADO' ? 'success' : 'warning',
    });
  }

  for (const v of sol.viagens ?? []) {
    if (v.situacao === 'EMITIDA' || v.situacao === 'UTILIZADA') {
      events.push({
        id: `ev-viag-emitida-${v.id}`,
        date: formatDate(v.data_embarque_prevista),
        title: `Passagem ${v.tipo?.toLowerCase()} emitida — ${v.origem_cidade} → ${v.destino_cidade}`,
        description: v.numero_bilhete ? `Localizador: ${v.numero_bilhete}` : undefined,
        status: 'info',
      });
    }
    if (v.situacao === 'UTILIZADA' && v.data_embarque_real) {
      events.push({
        id: `ev-viag-embarque-${v.id}`,
        date: formatDate(v.data_embarque_real),
        title: `Embarque confirmado — ${v.tipo?.toLowerCase()}`,
        status: 'success',
      });
    }
    if (v.situacao === 'NO_SHOW') {
      events.push({
        id: `ev-viag-noshow-${v.id}`,
        date: formatDate(v.data_embarque_prevista),
        title: `NO-SHOW — paciente não compareceu`,
        description: v.observacoes ?? undefined,
        status: 'danger',
      });
    }
  }

  for (const ac of (sol.ajudas_custo ?? [])) {
    events.push({
      id: `ev-ac-${ac.id}`,
      date: formatDate(ac.data_inicio),
      title: `Ajuda de custo ${statusAjudaLabels[ac.status]?.label?.toLowerCase() ?? ac.status} — ${formatCurrency(ac.valor_total)}`,
      description: ac.observacoes ?? undefined,
      status: ac.status === 'CONCLUIDA' ? 'success' : ac.status === 'GLOSADA' ? 'danger' : 'info',
    });
  }

  const perm = sol.permanencias?.[0];
  if (perm) {
    events.push({
      id: `ev-perm-${perm.id}`,
      date: formatDate(perm.data_comunicacao),
      title: 'Permanência comunicada',
      description: perm.motivo ? `Motivo: ${perm.motivo.replace(/_/g, ' ')}` : undefined,
      status: 'info',
      user: perm.comunicado_por,
    });
    for (const pror of perm.prorrogacoes ?? []) {
      events.push({
        id: `ev-pror-${pror.id}`,
        date: formatDate(pror.created_at),
        title: `Prorrogação ${pror.decisao === 'APROVADA' ? 'aprovada' : pror.decisao ? pror.decisao.toLowerCase() : 'solicitada'} — +${pror.dias_adicionais_solicitados ?? '?'} dias`,
        description: pror.justificativa_medica,
        status: pror.decisao === 'APROVADA' ? 'success' : pror.decisao === 'REJEITADA' ? 'danger' : 'warning',
        user: pror.decisao_por,
      });
    }
  }

  const encerramento = sol.encerramentos?.[0];
  if (encerramento) {
    events.push({
      id: `ev-enc-${encerramento.id}`,
      date: formatDate(encerramento.created_at),
      title: `Encerramento — ${motivoAltaLabels[encerramento.motivo as MotivoAlta] ?? encerramento.motivo}`,
      description: encerramento.observacoes ?? undefined,
      status: encerramento.motivo === 'ALTA_MEDICA' ? 'success' : 'danger',
    });
  }

  if (sol.status === 'CONCLUIDO') {
    events.push({
      id: 'ev-concluido',
      date: formatDate(sol.updated_at),
      title: 'Processo concluído',
      status: 'success',
    });
  }

  if (sol.status === 'CANCELADO') {
    events.push({
      id: 'ev-cancelado',
      date: formatDate(sol.updated_at),
      title: 'Processo cancelado',
      description: sol.observacoes ?? undefined,
      status: 'danger',
    });
  }

  // Devoluções (retornos entre setores)
  const setorLabels: Record<string, string> = {
    SOLICITACOES: 'Solicitações',
    DIAGNOSTICO_CLINICO: 'Diagnóstico Clínico',
    PARECER_MEDICO: 'Parecer Médico',
    REGULACAO: 'Regulação',
    AGENDAMENTO: 'Agendamento',
    PASSAGENS: 'Viagens / Passagens',
    AJUDA_CUSTO: 'Ajuda de Custo',
    PERMANENCIA: 'Permanência',
    ENCERRAMENTO: 'Encerramento',
  };
  for (const dev of (sol.devolucoes ?? [])) {
    const origem = setorLabels[dev.setor_origem] ?? dev.setor_origem;
    const destino = setorLabels[dev.setor_destino] ?? dev.setor_destino;
    const urgente = dev.urgencia === 'URGENTE';

    // Evento de criação da devolução
    events.push({
      id: `ev-dev-${dev.id}`,
      date: formatDate(dev.created_at),
      title: `${urgente ? '⚠ ' : ''}Devolvido: ${origem} → ${destino}`,
      description: dev.motivo,
      status: urgente ? 'danger' : 'warning',
    });

    // Evento de resolução (se resolvida)
    if (dev.status_devolucao === 'RESOLVIDA' && dev.resolvido_em) {
      events.push({
        id: `ev-dev-res-${dev.id}`,
        date: formatDate(dev.resolvido_em),
        title: `Devolução resolvida — ${destino}`,
        description: dev.observacao_resolucao ?? undefined,
        status: 'success',
      });
    }
  }

  // Sort by date
  events.sort((a, b) => {
    const da = a.date.split('/').reverse().join('-');
    const db = b.date.split('/').reverse().join('-');
    return db.localeCompare(da);
  });

  return events;
}

/* -------------------------------------------------- */
/*  Main Component                                     */
/* -------------------------------------------------- */

export default function ProcessoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const parentCrumb = useReferrerBreadcrumb({ label: 'Solicitações', href: '/solicitacoes' });

  const toast = useToast();
  const [sol, setSol] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { options: companhiasList, loading: loadingCompanhias } = useCompanhias();
  const { user: currentUser } = useCurrentUser();
  const [editingSection, setEditingSection] = useState<string | null>(null);

  /* ---- Lookups for edit forms ---- */
  const { valor: valorDiariaCompleta } = useParametroNumero('diaria_valor_completa');
  const { valor: valorDiariaRetorno } = useParametroNumero('diaria_valor_retorno');

  /* ---- Edit form states ---- */

  // Diagnóstico
  const [edCid, setEdCid] = useState('');
  const [edDescDiag, setEdDescDiag] = useState('');
  const [edEspecialidade, setEdEspecialidade] = useState('');
  const [edProcedimento, setEdProcedimento] = useState('');
  const [edJustificativa, setEdJustificativa] = useState('');

  // Documentos
  interface PendingFile { file: File; tipo: TipoDocumentoDB; }
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);

  // Parecer
  const [edParecerDecisao, setEdParecerDecisao] = useState('');
  const [edParecerObs, setEdParecerObs] = useState('');
  const [edAutorizaAcompanhante, setEdAutorizaAcompanhante] = useState(false);

  // Regulação
  const [regPendingRoute, setRegPendingRoute] = useState<string | null>(null);
  const [regCobDestinatario, setRegCobDestinatario] = useState('');
  const [regCobCanal, setRegCobCanal] = useState('');
  const [regCobContatoCanal, setRegCobContatoCanal] = useState('');
  const [regCobDataEnvio, setRegCobDataEnvio] = useState(new Date().toISOString().split('T')[0]);
  const [regCobConteudo, setRegCobConteudo] = useState('');
  const [regDeciding, setRegDeciding] = useState(false);

  // Agendamento
  const [agNomeUnidade, setAgNomeUnidade] = useState('');
  const [agCnes, setAgCnes] = useState('');
  const [agCidade, setAgCidade] = useState('');
  const [agUf, setAgUf] = useState('');
  const [agTipoContato, setAgTipoContato] = useState('');
  const [agContatoUnidade, setAgContatoUnidade] = useState('');
  const [agTipoAtendimento, setAgTipoAtendimento] = useState('');
  const [agDataAgendamento, setAgDataAgendamento] = useState('');
  const [agOrigemAgendamento, setAgOrigemAgendamento] = useState('');
  const [agNumCnrac, setAgNumCnrac] = useState('');
  const [agStatusAgendamento, setAgStatusAgendamento] = useState('AGUARDANDO_CONFIRMACAO');
  const [agComprovante, setAgComprovante] = useState<File | null>(null);
  const [agEditingId, setAgEditingId] = useState<string | null>(null);

  // TODO A3 — Agrupamento de solicitações por viagem
  // Requer schema de banco: tabela de junção `viagem_solicitacoes` (viagem_id, solicitacao_id)
  // e tabela `viagens` com campos data, destino, modal, companhia.
  // Após migration, expor via serviço `viagens.service.ts` e exibir seção
  // "Viagem vinculada" nesta página com seletor de viagem existente ou criação inline.

  // A2 — Histórico de unidades consultadas (agendamento manual pela equipe)
  interface ConsultaUnidade {
    id: string;
    unidade: string;
    data: string;
    resposta: 'ACEITO' | 'NEGADO' | 'PENDENTE';
    observacao: string;
  }
  const [consultasUnidade, setConsultasUnidade] = useState<ConsultaUnidade[]>([]);
  const [showConsultaForm, setShowConsultaForm] = useState(false);
  const [consultaUnidade, setConsultaUnidade] = useState('');
  const [consultaData, setConsultaData] = useState('');
  const [consultaResposta, setConsultaResposta] = useState<'ACEITO' | 'NEGADO' | 'PENDENTE'>('PENDENTE');
  const [consultaObservacao, setConsultaObservacao] = useState('');

  // Viagens
  type DrawerTab = 'ida' | 'volta';
  const [viagDrawerTab, setViagDrawerTab] = useState<DrawerTab>('ida');
  const [viagEditingId, setViagEditingId] = useState<string | null>(null);
  const [idaOrigemUf, setIdaOrigemUf] = useState('MA');
  const [idaOrigem, setIdaOrigem] = useState('');
  const [idaDestinoUf, setIdaDestinoUf] = useState('');
  const [idaDestino, setIdaDestino] = useState('');
  const [idaDataEmbarque, setIdaDataEmbarque] = useState('');
  const [idaModalTransporte, setIdaModalTransporte] = useState('');
  const [idaCompanhia, setIdaCompanhia] = useState('');
  const [idaLocalizador, setIdaLocalizador] = useState('');
  const [idaValor, setIdaValor] = useState('');
  const [idaMedif, setIdaMedif] = useState(false);
  const [idaObservacoes, setIdaObservacoes] = useState('');
  const [voltaOrigemUf, setVoltaOrigemUf] = useState('');
  const [voltaOrigem, setVoltaOrigem] = useState('');
  const [voltaDestinoUf, setVoltaDestinoUf] = useState('MA');
  const [voltaDestino, setVoltaDestino] = useState('');
  const [voltaDataEmbarque, setVoltaDataEmbarque] = useState('');
  const [voltaModalTransporte, setVoltaModalTransporte] = useState('');
  const [voltaCompanhia, setVoltaCompanhia] = useState('');
  const [voltaLocalizador, setVoltaLocalizador] = useState('');
  const [voltaValor, setVoltaValor] = useState('');
  const [voltaMedif, setVoltaMedif] = useState(false);
  const [voltaObservacoes, setVoltaObservacoes] = useState('');

  // Ajuda de Custo
  const [acTipoBeneficiario, setAcTipoBeneficiario] = useState('PACIENTE');
  const [acDataInicio, setAcDataInicio] = useState('');
  const [acDataFim, setAcDataFim] = useState('');
  const [acDiasElegiveis, setAcDiasElegiveis] = useState('');
  const [acValorDiaria, setAcValorDiaria] = useState('');
  const [acObservacoes, setAcObservacoes] = useState('');
  const [acEditingId, setAcEditingId] = useState<string | null>(null);

  // Permanência
  const [permDataComunicacao, setPermDataComunicacao] = useState(new Date().toISOString().split('T')[0]);
  const [permComunicadoPor, setPermComunicadoPor] = useState('');
  const [permMotivo, setPermMotivo] = useState('');
  const [permMotivoDescricao, setPermMotivoDescricao] = useState('');
  const [permNovaDataRetorno, setPermNovaDataRetorno] = useState('');
  const [permSolicitarProrrogacao, setPermSolicitarProrrogacao] = useState(false);
  const [permDiasAdicionais, setPermDiasAdicionais] = useState('');
  const [permJustificativaMedica, setPermJustificativaMedica] = useState('');
  const [permEditingId, setPermEditingId] = useState<string | null>(null);
  const [permAjudaCustoInfo, setPermAjudaCustoInfo] = useState<{ valor_diaria: number; data_fim: string | null } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [saving, setSaving] = useState(false);

  /* ---- Computed values for Ajuda de Custo ---- */
  function calcularDias(inicio: string, fim: string): number {
    if (!inicio || !fim) return 0;
    const d1 = new Date(inicio);
    const d2 = new Date(fim);
    const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  }

  const acDataFimError = useMemo(() => {
    if (acDataInicio && acDataFim && acDataFim < acDataInicio) {
      return 'Data de fim não pode ser anterior à data de início.';
    }
    return '';
  }, [acDataInicio, acDataFim]);

  const acDiasCalc = useMemo(() => {
    if (acDiasElegiveis) return parseInt(acDiasElegiveis, 10) || 0;
    if (acDataFimError) return 0;
    return calcularDias(acDataInicio, acDataFim);
  }, [acDiasElegiveis, acDataInicio, acDataFim, acDataFimError]);

  const acValorDiariaNum = useMemo(() => {
    if (acValorDiaria) return parseCurrency(acValorDiaria);
    return valorDiariaCompleta;
  }, [acValorDiaria, valorDiariaCompleta]);

  // Portaria SAS/MS 55/1999: (dias - 1) × diária completa + diária de retorno.
  const acValorTotalCalc = useMemo(
    () =>
      calcularTotalDiarias({
        dias: acDiasCalc,
        valorDiariaCompleta: acValorDiariaNum,
        valorDiariaRetorno,
      }).valorTotal,
    [acDiasCalc, acValorDiariaNum, valorDiariaRetorno],
  );

  /* ---- Computed: Permanência cost impact ---- */
  const permCustoAdicional = useMemo(() => {
    if (!permAjudaCustoInfo || !permNovaDataRetorno || !permAjudaCustoInfo.data_fim) return null;
    const dataFimOriginal = new Date(permAjudaCustoInfo.data_fim + 'T00:00:00');
    const novaData = new Date(permNovaDataRetorno + 'T00:00:00');
    const diffMs = novaData.getTime() - dataFimOriginal.getTime();
    const diasExtras = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    if (diasExtras <= 0) return null;
    return {
      diasExtras,
      valorDiaria: permAjudaCustoInfo.valor_diaria,
      valorTotal: diasExtras * permAjudaCustoInfo.valor_diaria,
    };
  }, [permAjudaCustoInfo, permNovaDataRetorno]);

  /* ---- D1/AZ3 — Observações por etapa + autorizações da coordenação ---- */
  const [obsPorEtapa, setObsPorEtapa] = useState<Record<string, ObservacaoEtapa[]>>({});
  const [autorizacoes, setAutorizacoes] = useState<AutorizacaoCoordenacao[]>([]);

  const reloadObservacoes = useMemo(
    () => async () => {
      const list = await listarObservacoesPorSolicitacao(id);
      setObsPorEtapa(agruparObservacoesPorEtapa(list));
    },
    [id],
  );

  const reloadAutorizacoes = useMemo(
    () => async () => {
      const list = await listarAutorizacoesPorSolicitacao(id);
      setAutorizacoes(list);
    },
    [id],
  );

  useEffect(() => {
    reloadObservacoes();
    reloadAutorizacoes();
  }, [reloadObservacoes, reloadAutorizacoes]);

  function getObsEtapa(etapa: EtapaObservacao): ObservacaoEtapa[] {
    return obsPorEtapa[etapa] ?? [];
  }

  /* ---- Reload data helper ---- */
  function reloadSolicitacao() {
    buscarSolicitacao(id).then(({ data, error }) => {
      if (!error && data) setSol(data);
    });
    reloadObservacoes();
    reloadAutorizacoes();
  }

  /* ---- Open edit helpers — populate form from current data ---- */

  function openEditDiagnostico() {
    setEdCid(sol?.cid10_principal ?? '');
    setEdDescDiag(sol?.descricao_diagnostico ?? '');
    setEdEspecialidade(sol?.especialidade ?? '');
    setEdProcedimento(sol?.tipo_procedimento ?? '');
    setEdJustificativa(sol?.justificativa_tfd ?? '');
    setEditingSection('diagnostico');
  }

  function openEditParecer() {
    const p = sol?.pareceres?.[0];
    setEdParecerDecisao(p?.decisao ?? '');
    setEdParecerObs(p?.observacoes_medicas ?? '');
    setEdAutorizaAcompanhante(false);
    setEditingSection('parecer');
  }

  function openEditRegulacao() {
    setRegPendingRoute(null);
    setRegCobDestinatario('');
    setRegCobCanal('');
    setRegCobContatoCanal('');
    setRegCobDataEnvio(new Date().toISOString().split('T')[0]);
    setRegCobConteudo('');
    setRegDeciding(false);
    setEditingSection('regulacao');
  }

  function openEditAgendamento() {
    const ag = sol?.agendamentos?.[0];
    setAgEditingId(ag?.id ?? null);
    setAgNomeUnidade(ag?.unidade_executante ?? '');
    setAgCnes(ag?.cnes ?? '');
    setAgCidade(ag?.cidade_destino ?? '');
    setAgUf(ag?.uf_destino ?? '');
    setAgTipoContato('');
    setAgContatoUnidade(ag?.contato_unidade ?? '');
    setAgTipoAtendimento(ag?.tipo_atendimento ?? '');
    setAgDataAgendamento(ag?.data_hora_agendamento ? ag.data_hora_agendamento.split('T')[0] : '');
    setAgOrigemAgendamento(ag?.origem_agendamento ?? '');
    setAgNumCnrac(ag?.numero_cnrac ?? '');
    setAgStatusAgendamento(ag?.status ?? 'AGUARDANDO_CONFIRMACAO');
    setAgComprovante(null);
    setEditingSection('agendamento');
  }

  function openEditViagens() {
    const viagens = sol?.viagens ?? [];
    const ida = viagens.find((v: any) => v.tipo === 'IDA');
    const volta = viagens.find((v: any) => v.tipo === 'RETORNO');
    setViagEditingId(ida?.id ?? null);
    setViagDrawerTab('ida');
    // Ida
    setIdaOrigemUf(ida?.origem_uf ?? 'MA');
    setIdaOrigem(ida?.origem_cidade ?? '');
    setIdaDestinoUf(ida?.destino_uf ?? '');
    setIdaDestino(ida?.destino_cidade ?? '');
    setIdaDataEmbarque(ida?.data_embarque_prevista ? ida.data_embarque_prevista.split('T')[0] : '');
    setIdaModalTransporte(ida?.modal ?? '');
    setIdaCompanhia(ida?.companhia ?? '');
    setIdaLocalizador(ida?.numero_bilhete ?? '');
    setIdaValor(ida?.valor ? maskCurrency(String(Math.round(ida.valor * 100))) : '');
    setIdaMedif(ida?.medif_necessario ?? false);
    setIdaObservacoes(ida?.observacoes ?? '');
    // Volta
    setVoltaOrigemUf(volta?.origem_uf ?? '');
    setVoltaOrigem(volta?.origem_cidade ?? '');
    setVoltaDestinoUf(volta?.destino_uf ?? 'MA');
    setVoltaDestino(volta?.destino_cidade ?? '');
    setVoltaDataEmbarque(volta?.data_embarque_prevista ? volta.data_embarque_prevista.split('T')[0] : '');
    setVoltaModalTransporte(volta?.modal ?? '');
    setVoltaCompanhia(volta?.companhia ?? '');
    setVoltaLocalizador(volta?.numero_bilhete ?? '');
    setVoltaValor(volta?.valor ? maskCurrency(String(Math.round(volta.valor * 100))) : '');
    setVoltaMedif(volta?.medif_necessario ?? false);
    setVoltaObservacoes(volta?.observacoes ?? '');
    setEditingSection('viagens');
  }

  function openEditAjudaCusto() {
    const ac = sol?.ajudas_custo?.[0];
    setAcEditingId(ac?.id ?? null);
    setAcTipoBeneficiario(ac?.tipo ?? 'PACIENTE');
    setAcDataInicio(ac?.data_inicio ? (ac.data_inicio.includes('T') ? ac.data_inicio.split('T')[0] : ac.data_inicio) : '');
    setAcDataFim(ac?.data_fim ? (ac.data_fim.includes('T') ? ac.data_fim.split('T')[0] : ac.data_fim) : '');
    setAcDiasElegiveis(ac?.dias_elegiveis > 0 ? String(ac.dias_elegiveis) : '');
    const valCents = ac?.valor_diaria ? Math.round(ac.valor_diaria * 100) : 0;
    setAcValorDiaria(valCents > 0 ? maskCurrency(String(valCents)) : '');
    setAcObservacoes(ac?.observacoes ?? '');
    // If creating new, pre-fill dates from viagens
    if (!ac) {
      buscarViagensPorSolicitacao(id).then(({ data: viagens }) => {
        if (viagens && viagens.length > 0) {
          const idaV = viagens.find((v: any) => v.tipo === 'IDA');
          const voltaV = viagens.find((v: any) => v.tipo === 'RETORNO');
          if (idaV?.data_embarque_prevista) {
            setAcDataInicio(idaV.data_embarque_prevista.includes('T') ? idaV.data_embarque_prevista.split('T')[0] : idaV.data_embarque_prevista);
          }
          if (voltaV?.data_embarque_prevista) {
            setAcDataFim(voltaV.data_embarque_prevista.includes('T') ? voltaV.data_embarque_prevista.split('T')[0] : voltaV.data_embarque_prevista);
          }
        }
      });
      const defaultVal = Math.round(valorDiariaCompleta * 100);
      setAcValorDiaria(defaultVal > 0 ? maskCurrency(String(defaultVal)) : '');
    }
    setEditingSection('ajuda-custo');
  }

  async function openEditPermanencia() {
    const p = sol?.permanencias?.[0];
    setPermEditingId(p?.id ?? null);
    setPermDataComunicacao(p?.data_comunicacao ?? new Date().toISOString().split('T')[0]);
    setPermComunicadoPor(p?.comunicado_por ?? '');
    setPermMotivo(p?.motivo ?? '');
    setPermMotivoDescricao(p?.motivo_descricao ?? '');
    setPermNovaDataRetorno(p?.nova_data_retorno_prevista ?? '');
    setPermSolicitarProrrogacao(false);
    setPermDiasAdicionais('');
    setPermJustificativaMedica('');
    setPermAjudaCustoInfo(null);
    setEditingSection('permanencia');
    // Fetch ajuda de custo info for cost calculation
    const { data } = await buscarAjudaCustoPorSolicitacao(id);
    setPermAjudaCustoInfo(data ? { valor_diaria: data.valor_diaria, data_fim: data.data_fim } : null);
  }

  /* ---- Save handlers ---- */
  async function saveDiagnostico() {
    setSaving(true);
    const { error } = await atualizarSolicitacao(id, {
      cid10_principal: edCid,
      descricao_diagnostico: edDescDiag,
      especialidade: edEspecialidade || null,
      tipo_procedimento: edProcedimento,
      justificativa_tfd: edJustificativa,
    } as any);
    setSaving(false);
    if (error) { toast.error('Erro ao salvar', (error as any).message); return; }
    toast.success('Diagnóstico atualizado!');
    setEditingSection(null);
    reloadSolicitacao();
  }

  async function saveDocumentos() {
    if (pendingFiles.length === 0) { setEditingSection(null); return; }
    setSaving(true);
    setUploading(true);
    let errors = 0;
    for (const pf of pendingFiles) {
      const r = await uploadDocumento(id, pf.file, pf.tipo);
      if (r.error) errors++;
    }
    setUploading(false);
    setSaving(false);
    if (errors > 0) toast.warning('Upload parcial', `${errors} arquivo(s) falharam.`);
    else toast.success('Documentos enviados!', `${pendingFiles.length} documento(s) adicionado(s).`);
    setPendingFiles([]);
    setEditingSection(null);
    reloadSolicitacao();
  }

  async function handleDeleteDoc(docId: string, url: string) {
    const { error } = await excluirDocumento(docId, url);
    if (error) { toast.error('Erro ao excluir', (error as any).message); return; }
    toast.success('Documento removido!');
    reloadSolicitacao();
  }

  useEffect(() => {
    buscarSolicitacao(id).then(({ data, error }) => {
      if (!error && data) setSol(data);
      setLoading(false);
    });
  }, [id]);

  /* Loading state */
  if (loading) {
    return (
      <>
        <PageHeader title="Carregando..." />
        <div className="tfd-card text-center py-16">
          <Loader2 size={40} className="mx-auto mb-3 animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
          <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
            Carregando dados da solicitação...
          </p>
        </div>
      </>
    );
  }

  /* Not found state */
  if (!sol) {
    return (
      <>
        <PageHeader title="Processo não encontrado" />
        <div className="tfd-card text-center py-12">
          <XCircle size={48} className="mx-auto mb-3" style={{ color: 'var(--tfd-text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
            Solicitação com ID &quot;{id}&quot; não foi encontrada.
          </p>
          <Link href="/solicitacoes" className="tfd-btn tfd-btn-primary tfd-btn--sm mt-4 inline-flex">
            <ArrowLeft size={14} />
            Voltar para listagem
          </Link>
        </div>
      </>
    );
  }

  const activeStep = getActiveStepIndex(sol);
  const allObservacoes = Object.values(obsPorEtapa).flat();
  const timeline = buildTimeline(sol, {
    observacoes: allObservacoes,
    autorizacoes: autorizacoes,
  });
  const pac = sol.pacientes;
  const acomp = (sol as any).solicitacao_acompanhantes?.[0]?.acompanhantes;
  const parecer = sol.pareceres?.[0];
  const agendamento = sol.agendamentos?.[0];

  // Resolve município names from joins (instead of showing UUIDs)
  const municipioOrigem = (sol as any).municipios?.nome
    ? `${(sol as any).municipios.nome}/${(sol as any).municipios.uf}`
    : null;
  // Prefer the joined municipality name over the text field (which may contain a UUID)
  const municipioPaciente = (pac as any)?.municipios?.nome
    || (pac?.municipio && !pac.municipio.includes('-') ? pac.municipio : null)
    || null;
  const ajudasCusto: any[] = sol.ajudas_custo ?? [];
  const ajudaCustoTotal = ajudasCusto.reduce((s: number, ac: any) => s + (ac.valor_total ?? 0), 0);
  const ajudaCustoDias = ajudasCusto.reduce((s: number, ac: any) => s + (ac.dias_elegiveis ?? 0), 0);
  const ajudaCustoStatusDominante = ajudasCusto.length === 0 ? null
    : ajudasCusto.some((ac: any) => ac.status === 'EM_ANALISE') ? 'EM_ANALISE'
    : ajudasCusto.some((ac: any) => ac.status === 'APROVADA') ? 'APROVADA'
    : ajudasCusto.every((ac: any) => ac.status === 'CONCLUIDA') ? 'CONCLUIDA'
    : ajudasCusto.every((ac: any) => ac.status === 'GLOSADA') ? 'GLOSADA'
    : ajudasCusto[0].status;
  const perm = sol.permanencias?.[0];
  const isFinal = ['CONCLUIDO', 'INDEFERIDO', 'CANCELADO'].includes(sol.status);

  async function handleAvancarStatus(novoStatus: string, label: string) {
    const result = await atualizarStatus(id, novoStatus as any);
    if (result.error) return;
    setSol({ ...sol, status: novoStatus });
  }

  // Determine the next step action based on current status
  // Only "Iniciar Análise" is manual — regulation routing is automatic after parecer
  const nextAction = (() => {
    switch (sol.status) {
      case 'NOVO': return { label: 'Iniciar Análise', status: 'EM_ANALISE' };
      default: return null;
    }
  })();

  return (
    <>
      {/* ====== Header ====== */}
      <PageHeader
        title={sol.numero_processo}
        subtitle={`${pac?.nome_completo ?? '—'} — ${municipioOrigem ?? municipioPaciente ?? '—'}`}
        breadcrumbs={[
          { label: parentCrumb.label, href: parentCrumb.href },
          { label: sol.numero_processo },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {sol.url_sei && (
              <a
                href={sol.url_sei}
                target="_blank"
                rel="noopener noreferrer"
                className="tfd-btn tfd-btn-outline tfd-btn--sm"
                style={{ gap: '0.375rem' }}
              >
                <ExternalLink size={13} />
                SEI
              </a>
            )}
            <StatusTag status={sol.status} />
            {nextAction && (
              <button
                className="tfd-btn tfd-btn-primary tfd-btn--sm"
                onClick={() => handleAvancarStatus(nextAction.status, nextAction.label)}
              >
                {nextAction.label}
              </button>
            )}
          </div>
        }
      />

      {/* ====== Step Indicator ====== */}
      <div className="tfd-card mb-6 overflow-x-auto">
        <div className="flex items-center min-w-[640px]">
          {PROCESS_STEPS.map((step, idx) => {
            const isCompleted = activeStep > idx;
            const isCurrent = activeStep === idx;
            const isDisabled = activeStep < idx || (isFinal && activeStep < idx);
            const isCancelled = sol.status === 'CANCELADO';
            const isIndeferido = sol.status === 'INDEFERIDO' && idx >= 2;

            let dotBg = 'var(--tfd-surface-200)';
            let dotColor = 'var(--tfd-text-muted)';
            let labelColor = 'var(--tfd-text-muted)';

            if (isCompleted) {
              dotBg = 'var(--tfd-status-success)';
              dotColor = 'white';
              labelColor = 'var(--tfd-status-success)';
            } else if (isCurrent && !isCancelled) {
              dotBg = 'var(--tfd-primary-500)';
              dotColor = 'white';
              labelColor = 'var(--tfd-primary-600)';
            } else if (isCancelled || isIndeferido) {
              dotBg = 'var(--tfd-surface-200)';
              dotColor = 'var(--tfd-text-muted)';
            }

            return (
              <div key={step.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <div
                    className="flex items-center justify-center w-8 h-8 rounded-full shrink-0"
                    style={{ backgroundColor: dotBg, color: dotColor }}
                  >
                    {isCompleted ? <CheckCircle2 size={16} /> : step.icon}
                  </div>
                  <span
                    className="text-xs font-medium text-center"
                    style={{ color: labelColor }}
                  >
                    {step.label}
                  </span>
                </div>
                {idx < PROCESS_STEPS.length - 1 && (
                  <div
                    className="h-0.5 flex-1 mx-1 rounded-full -mt-5"
                    style={{
                      backgroundColor: isCompleted ? 'var(--tfd-status-success)' : 'var(--tfd-surface-200)',
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ====== LEFT COLUMN (2/3) — Process Sections ====== */}
        <div className="xl:col-span-2 space-y-4">

          {/* ── Dados do Paciente ── */}
          <Section title="Dados do Paciente" icon={<User size={18} />}>
            {pac?.id && (
              <div className="mb-3 flex justify-end">
                <Link
                  href={`/pacientes/${pac.id}/prontuario`}
                  className="tfd-btn tfd-btn-outline tfd-btn--sm"
                  style={{ gap: '0.375rem' }}
                >
                  <FileText size={13} />
                  Ver prontuário completo TFD
                </Link>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow label="Nome completo" value={pac?.nome_completo ?? '—'} />
              <InfoRow label="CPF" value={formatCPF(pac?.cpf ?? '')} mono />
              <InfoRow label="CNS" value={formatCNS(pac?.cns ?? '')} mono />
              <InfoRow label="Data Nascimento" value={formatDate(pac?.data_nascimento)} />
              <InfoRow label="Sexo" value={pac?.sexo === 'MASCULINO' ? 'Masculino' : pac?.sexo === 'FEMININO' ? 'Feminino' : pac?.sexo ?? '—'} />
              <InfoRow label="Telefone" value={pac?.telefone_celular ?? pac?.telefone_fixo ?? '—'} />
              {pac?.email && <InfoRow label="E-mail" value={pac.email} />}
              <InfoRow label="Município" value={municipioPaciente ?? '—'} />
              <InfoRow label="UF" value={pac?.uf ?? '—'} />
              <InfoRow
                label="Endereço"
                value={[pac?.logradouro, pac?.numero, pac?.bairro].filter(Boolean).join(', ') || '—'}
              />
            </div>

            <DocumentList docs={getDocsForSection(sol.documentos ?? [], 'paciente')} docTypeLabels={docTypeLabels} />

            {/* Acompanhante */}
            {acomp && (
              <div
                className="mt-4 pt-4"
                style={{ borderTop: '1px solid var(--tfd-surface-border)' }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Users size={16} style={{ color: 'var(--tfd-primary-500)' }} />
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                    Acompanhante
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InfoRow label="Nome" value={acomp.nome_completo ?? '—'} />
                  <InfoRow label="CPF" value={formatCPF(acomp.cpf ?? '')} mono />
                  <InfoRow label="Vínculo" value={acomp.vinculo ?? '—'} />
                  <InfoRow label="Telefone" value={acomp.telefone ?? '—'} />
                  {acomp.justificativa && (
                    <div className="sm:col-span-2">
                      <InfoRow label="Justificativa" value={acomp.justificativa} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </Section>

          {/* ── Diagnostico Clinico ── */}
          <Section title="Diagnóstico Clínico" icon={<Stethoscope size={18} />} onEdit={openEditDiagnostico}>
            <div className="space-y-5">
              {/* Dados do Laudo */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--tfd-text-muted)' }}>
                  Dados do Laudo
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InfoRow label="Origem do laudo" value={sol.origem_laudo?.replace(/_/g, ' ') ?? '—'} />
                  <InfoRow
                    label="Data do laudo"
                    value={
                      <span>
                        {formatDate(sol.data_laudo)}
                        {sol.data_validade_laudo && (
                          <span className="ml-2 text-xs" style={{
                            color: new Date(sol.data_validade_laudo) < new Date() ? '#B91C1C' :
                              (new Date(sol.data_validade_laudo).getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 30 ? '#92400E' : 'var(--tfd-text-muted)',
                          }}>
                            (válido até {formatDate(sol.data_validade_laudo)})
                          </span>
                        )}
                      </span>
                    }
                  />
                  <InfoRow label="Médico solicitante" value={
                    sol.medico_solicitante_nome
                      ? <span>{sol.medico_solicitante_nome}{sol.medico_solicitante_crm ? <span className="ml-1.5 text-xs" style={{ color: 'var(--tfd-text-muted)', fontFamily: 'var(--tfd-font-mono)' }}>CRM {sol.medico_solicitante_crm}{sol.medico_solicitante_uf ? `/${sol.medico_solicitante_uf}` : ''}</span> : ''}</span>
                      : '—'
                  } />
                  <InfoRow label="Caráter" value={sol.carater_atendimento?.replace(/_/g, ' ') ?? '—'} />
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--tfd-surface-border)' }} />

              {/* Diagnóstico */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--tfd-text-muted)' }}>
                  Diagnóstico
                </p>
                <div className="space-y-3">
                  <InfoRow
                    label="CID-10 principal"
                    value={
                      <span>
                        <code
                          className="px-1.5 py-0.5 rounded text-xs font-semibold"
                          style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-700)', fontFamily: 'var(--tfd-font-mono)' }}
                        >
                          {sol.cid10_principal ?? '—'}
                        </code>
                        {sol.descricao_diagnostico && <span className="ml-2">{sol.descricao_diagnostico}</span>}
                      </span>
                    }
                  />
                  {sol.cid10_secundario && (
                    <InfoRow
                      label="CID-10 secundário"
                      value={
                        <code
                          className="px-1.5 py-0.5 rounded text-xs font-semibold"
                          style={{ backgroundColor: 'var(--tfd-surface-100)', color: 'var(--tfd-text-secondary)', fontFamily: 'var(--tfd-font-mono)' }}
                        >
                          {sol.cid10_secundario}
                        </code>
                      }
                    />
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InfoRow label="Especialidade" value={sol.especialidade?.replace(/_/g, ' ') ?? '—'} />
                    <InfoRow label="Procedimento" value={sol.tipo_procedimento ?? '—'} />
                  </div>
                  <InfoRow label="Transporte sugerido" value={sol.tipo_transporte_sugerido?.replace(/_/g, ' ') ?? '—'} />
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--tfd-surface-border)' }} />

              {/* Justificativa */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--tfd-text-muted)' }}>
                  Justificativa TFD
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--tfd-text-primary)' }}>
                  {sol.justificativa_tfd ?? '—'}
                </p>
              </div>

              <DocumentList docs={getDocsForSection(sol.documentos ?? [], 'diagnostico')} docTypeLabels={docTypeLabels} />
            </div>
          </Section>

          {/* ── Parecer Medico ── */}
          <Section
            title="Parecer Médico"
            icon={<ShieldCheck size={18} />}
            empty={!parecer}
            onEdit={openEditParecer}
            badge={
              parecer ? (
                <span
                  className="tfd-tag tfd-tag--rounded tfd-tag--dot"
                  style={{
                    backgroundColor: parecerLabels[parecer.decisao as StatusParecer]?.bg ?? '#E5E7EB',
                    color: parecerLabels[parecer.decisao as StatusParecer]?.color ?? '#6B7280',
                  }}
                >
                  {parecerLabels[parecer.decisao as StatusParecer]?.label ?? parecer.decisao}
                </span>
              ) : undefined
            }
          >
            {parecer && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <InfoRow label="Médico auditor" value={parecer.usuarios?.nome_completo ?? '—'} />
                  <InfoRow label="Data do parecer" value={formatDateTime(parecer.created_at)} />
                </div>
                {parecer.autoriza_acompanhante && (
                  <div className="flex items-center gap-2">
                    <span
                      className="tfd-tag tfd-tag--rounded tfd-tag--dot"
                      style={{ backgroundColor: '#DBEAFE', color: '#1D4ED8' }}
                    >
                      Acompanhante autorizado
                    </span>
                  </div>
                )}
                <div style={{ borderTop: '1px solid var(--tfd-surface-border)', paddingTop: '0.75rem' }}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--tfd-text-muted)' }}>
                    Observações do parecer
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--tfd-text-primary)' }}>
                    {parecer.observacoes_medicas ?? '—'}
                  </p>
                </div>
                <DocumentList docs={getDocsForSection(sol.documentos ?? [], 'parecer')} docTypeLabels={docTypeLabels} />
              </div>
            )}

            <ObservacoesEtapa
              solicitacaoId={id}
              etapa="parecer"
              observacoes={getObsEtapa('parecer')}
              autorId={currentUser?.id}
              autorPerfil={currentUser?.perfil}
              autorNome={currentUser?.nome_completo}
              onRegistered={reloadSolicitacao}
            />
            <div className="mt-3">
              <AutorizacaoInline
                solicitacaoId={id}
                autorId={currentUser?.id}
                autorPerfil={currentUser?.perfil}
                onRequested={reloadSolicitacao}
              />
            </div>
          </Section>

          {/* ── Regulacao ── */}
          {(() => {
            const rota = sol.rotas_regulacao?.length
              ? sol.rotas_regulacao.reduce((latest: any, r: any) => (!latest || new Date(r.created_at) > new Date(latest.created_at) ? r : latest), null)
              : null;
            const cob = rota?.cobrancas_externas?.[0] ?? null;
            return (
              <Section
                title="Regulação"
                icon={<ClipboardCheck size={18} />}
                empty={!rota}
                onEdit={openEditRegulacao}
                badge={
                  rota ? (
                    <span className="tfd-tag tfd-tag--rounded tfd-tag--dot" style={{
                      backgroundColor: rota.tipo_rota === 'APROVADO_DIRETO' ? '#DCFCE7' : '#DBEAFE',
                      color: rota.tipo_rota === 'APROVADO_DIRETO' ? '#15803D' : '#1D4ED8',
                    }}>
                      {rotaLabels[rota.tipo_rota as string] ?? rota.tipo_rota}
                    </span>
                  ) : undefined
                }
              >
                {rota && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      <div>
                        <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Decisão</p>
                        <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                          {rotaLabels[rota.tipo_rota as string] ?? rota.tipo_rota}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Data</p>
                        <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>{formatDate(rota.created_at)}</p>
                      </div>
                    </div>
                    {rota.justificativa && (
                      <div>
                        <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Justificativa</p>
                        <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>{rota.justificativa}</p>
                      </div>
                    )}
                    {rota.lembrete && (
                      <div>
                        <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Observações de retorno</p>
                        <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>{rota.lembrete}</p>
                      </div>
                    )}

                    {/* Dados da cobrança externa (inline) */}
                    {cob && (
                      <>
                        <div style={{ borderTop: '1px solid var(--tfd-surface-border)' }} />
                        <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                          <div>
                            <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Destinatário</p>
                            <div className="flex items-center gap-2">
                              {agendamento?.unidade_executante ? (
                                <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{agendamento.unidade_executante}</p>
                              ) : (
                                <span
                                  className="tfd-tag tfd-tag--rounded"
                                  style={{ backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '0.625rem' }}
                                >
                                  Aguardando agendamento
                                </span>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Canal de envio</p>
                            <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>{cob.canal}</p>
                          </div>
                          <div>
                            <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Data do agendamento</p>
                            <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
                              {agendamento?.data_hora_agendamento ? formatDate(agendamento.data_hora_agendamento) : '—'}
                            </p>
                          </div>
                          {cob.contato_canal && (
                            <div>
                              <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Contato utilizado</p>
                              <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)', fontFamily: 'var(--tfd-font-mono)' }}>{cob.contato_canal}</p>
                            </div>
                          )}
                        </div>
                        {cob.conteudo_envio && (
                          <div>
                            <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Conteúdo da proposta</p>
                            <p className="text-sm mt-0.5" style={{ color: 'var(--tfd-text-secondary)' }}>{cob.conteudo_envio}</p>
                          </div>
                        )}
                        {cob.conteudo_resposta && (
                          <div>
                            <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Resposta recebida</p>
                            <p className="text-sm mt-0.5" style={{ color: 'var(--tfd-text-secondary)' }}>{cob.conteudo_resposta}</p>
                          </div>
                        )}
                      </>
                    )}

                    <DocumentList docs={getDocsForSection(sol.documentos ?? [], 'regulacao')} docTypeLabels={docTypeLabels} />
                  </div>
                )}

                <ObservacoesEtapa
                  solicitacaoId={id}
                  etapa="regulacao"
                  observacoes={getObsEtapa('regulacao')}
                  autorId={currentUser?.id}
                  autorPerfil={currentUser?.perfil}
                  autorNome={currentUser?.nome_completo}
                  onRegistered={reloadSolicitacao}
                />
                <div className="mt-3">
                  <AutorizacaoInline
                    solicitacaoId={id}
                    autorId={currentUser?.id}
                    autorPerfil={currentUser?.perfil}
                    onRequested={reloadSolicitacao}
                  />
                </div>
              </Section>
            );
          })()}

          {/* ── Agendamento ── */}
          <Section
            title="Agendamento no Destino"
            icon={<Calendar size={18} />}
            empty={!agendamento}
            onEdit={openEditAgendamento}
            badge={
              agendamento ? (
                <span className={`tfd-tag tfd-tag--rounded tfd-tag--dot ${agendamento.status === 'CONFIRMADO' ? 'tfd-tag--success' : 'tfd-tag--warning'}`}>
                  {agendamento.status === 'CONFIRMADO' ? 'Confirmado' : 'Pendente'}
                </span>
              ) : undefined
            }
          >
            {agendamento && (
              <div className="space-y-3">
                <InfoRow label="Unidade" value={agendamento.unidade_executante ?? '—'} />
                <InfoRow label="Destino" value={[agendamento.cidade_destino, agendamento.uf_destino].filter(Boolean).join('/') || '—'} />
                {agendamento.cnes && <InfoRow label="CNES" value={agendamento.cnes} mono />}
                <InfoRow label="Data" value={formatDateTime(agendamento.data_hora_agendamento)} />
                {agendamento.tipo_atendimento && (
                  <InfoRow label="Tipo" value={agendamento.tipo_atendimento.replace(/_/g, ' ')} />
                )}
                {agendamento.origem_agendamento && (
                  <InfoRow label="Origem" value={agendamento.origem_agendamento.replace(/_/g, ' ')} />
                )}
                {agendamento.numero_cnrac && <InfoRow label="Nº CNRAC" value={agendamento.numero_cnrac} mono />}
                {agendamento.contato_unidade && <InfoRow label="Contato" value={agendamento.contato_unidade} />}
                <DocumentList docs={getDocsForSection(sol.documentos ?? [], 'agendamento')} docTypeLabels={docTypeLabels} />
              </div>
            )}

            <ObservacoesEtapa
              solicitacaoId={id}
              etapa="agendamento"
              observacoes={getObsEtapa('agendamento')}
              autorId={currentUser?.id}
              autorPerfil={currentUser?.perfil}
              autorNome={currentUser?.nome_completo}
              onRegistered={reloadSolicitacao}
            />
            <div className="mt-3">
              <AutorizacaoInline
                solicitacaoId={id}
                autorId={currentUser?.id}
                autorPerfil={currentUser?.perfil}
                onRequested={reloadSolicitacao}
              />
            </div>
          </Section>

          {/* ── A2: Histórico de Unidades Consultadas ── */}
          <Section
            title="Unidades Consultadas (Busca de Agendamento)"
            icon={<Building2 size={18} />}
            empty={consultasUnidade.length === 0}
          >
            {consultasUnidade.length > 0 && (
              <div className="space-y-2 mb-3">
                {consultasUnidade.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-start justify-between gap-3 p-3 rounded-lg"
                    style={{ border: '1px solid var(--tfd-surface-border)' }}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{c.unidade}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                        <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>{formatDate(c.data)}</span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded font-medium"
                          style={{
                            backgroundColor: c.resposta === 'ACEITO' ? '#DCFCE7' : c.resposta === 'NEGADO' ? '#FEE2E2' : '#FEF3C7',
                            color: c.resposta === 'ACEITO' ? '#15803D' : c.resposta === 'NEGADO' ? '#B91C1C' : '#92400E',
                          }}
                        >
                          {c.resposta === 'ACEITO' ? 'Aceito' : c.resposta === 'NEGADO' ? 'Negado' : 'Pendente'}
                        </span>
                      </div>
                      {c.observacao && (
                        <p className="text-xs mt-1" style={{ color: 'var(--tfd-text-secondary)' }}>{c.observacao}</p>
                      )}
                    </div>
                    <button
                      className="tfd-btn tfd-btn-ghost tfd-btn--icon-only tfd-btn--sm shrink-0"
                      title="Remover consulta"
                      onClick={() => setConsultasUnidade((prev) => prev.filter((x) => x.id !== c.id))}
                    >
                      <X size={13} style={{ color: 'var(--tfd-status-danger)' }} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {showConsultaForm ? (
              <div
                className="p-3 rounded-lg"
                style={{ border: '1px solid var(--tfd-surface-border)', backgroundColor: 'var(--tfd-primary-50)' }}
              >
                <p className="text-xs font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Registrar consulta</p>
                <FormField label="Unidade consultada" required>
                  <input
                    type="text"
                    className="tfd-input tfd-input--sm"
                    placeholder="Ex: HC-SP, INCA, UNIFESO..."
                    value={consultaUnidade}
                    onChange={(e) => setConsultaUnidade(e.target.value)}
                  />
                </FormField>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Data da consulta" required>
                    <input
                      type="date"
                      className="tfd-input tfd-input--sm"
                      value={consultaData}
                      onChange={(e) => setConsultaData(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Resposta" required>
                    <select
                      className="tfd-input tfd-input--sm"
                      value={consultaResposta}
                      onChange={(e) => setConsultaResposta(e.target.value as 'ACEITO' | 'NEGADO' | 'PENDENTE')}
                    >
                      <option value="PENDENTE">Pendente</option>
                      <option value="ACEITO">Aceito</option>
                      <option value="NEGADO">Negado</option>
                    </select>
                  </FormField>
                </div>
                <FormField label="Observação">
                  <textarea
                    className="tfd-input tfd-input--sm"
                    rows={2}
                    placeholder="Motivo, documentação pedida, protocolo..."
                    value={consultaObservacao}
                    onChange={(e) => setConsultaObservacao(e.target.value)}
                  />
                </FormField>
                <div className="flex items-center gap-2">
                  <button
                    className="tfd-btn tfd-btn-primary tfd-btn--sm"
                    onClick={() => {
                      if (!consultaUnidade.trim() || !consultaData) return;
                      setConsultasUnidade((prev) => [...prev, {
                        id: `c-${Date.now()}`,
                        unidade: consultaUnidade.trim(),
                        data: consultaData,
                        resposta: consultaResposta,
                        observacao: consultaObservacao.trim(),
                      }]);
                      setConsultaUnidade('');
                      setConsultaData('');
                      setConsultaResposta('PENDENTE');
                      setConsultaObservacao('');
                      setShowConsultaForm(false);
                    }}
                  >
                    Salvar
                  </button>
                  <button
                    className="tfd-btn tfd-btn-secondary tfd-btn--sm"
                    onClick={() => { setShowConsultaForm(false); setConsultaUnidade(''); setConsultaData(''); setConsultaResposta('PENDENTE'); setConsultaObservacao(''); }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="tfd-btn tfd-btn-secondary tfd-btn--sm"
                onClick={() => setShowConsultaForm(true)}
              >
                <Plus size={14} />
                Registrar consulta
              </button>
            )}
          </Section>

          {/* ── Viagens ── */}
          <Section
            title="Viagens e Passagens"
            icon={<Plane size={18} />}
            empty={(sol.viagens ?? []).length === 0}
            onEdit={openEditViagens}
            badge={
              (sol.viagens ?? []).length > 0 ? (
                <span
                  className="tfd-badge tfd-badge--secondary"
                >
                  {(sol.viagens ?? []).length}
                </span>
              ) : undefined
            }
          >
            {(sol.viagens ?? []).length > 0 && (() => {
              const viagensSorted = [...(sol.viagens ?? [])].sort((a: any, b: any) => {
                const tipoOrder = a.tipo === 'IDA' ? 0 : 1;
                const tipoOrderB = b.tipo === 'IDA' ? 0 : 1;
                if (tipoOrder !== tipoOrderB) return tipoOrder - tipoOrderB;
                return (a.numero_sequencial ?? 1) - (b.numero_sequencial ?? 1);
              });
              return (
                <div className="space-y-3">
                  {viagensSorted.map((v: any) => {
                    const sit = situacaoViagemLabels[v.situacao as SituacaoViagem] as unknown as { bg: string; text: string; label: string };
                    const isTerminal = ['CANCELADA', 'NO_SHOW', 'REMARCADA'].includes(v.situacao);
                    const tipoLabel = v.tipo === 'IDA' ? 'IDA' : 'VOLTA';
                    const seq = v.numero_sequencial ?? 1;
                    return (
                      <div
                        key={v.id}
                        className="flex items-center gap-4 p-3 rounded-lg"
                        style={{ backgroundColor: 'var(--tfd-surface-50)', opacity: isTerminal ? 0.5 : 1 }}
                      >
                        <div
                          className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                          style={{
                            backgroundColor: v.tipo === 'IDA' ? '#DBEAFE' : '#F5F3FF',
                            color: v.tipo === 'IDA' ? '#1D4ED8' : '#7C3AED',
                          }}
                        >
                          <Plane size={16} className={v.tipo === 'RETORNO' ? 'rotate-180' : ''} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-xs font-semibold px-1.5 py-0.5 rounded" style={{
                              backgroundColor: v.tipo === 'IDA' ? '#DBEAFE' : '#F5F3FF',
                              color: v.tipo === 'IDA' ? '#1D4ED8' : '#7C3AED',
                            }}>
                              {tipoLabel} #{seq}
                            </span>
                            <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                              {v.origem_cidade ?? '—'}
                            </span>
                            <ArrowRight size={12} style={{ color: 'var(--tfd-text-muted)' }} />
                            <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                              {v.destino_cidade ?? '—'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                            <span style={{ textDecoration: isTerminal ? 'line-through' : undefined }}>
                              {formatDate(v.data_embarque_prevista)}
                            </span>
                            {v.companhia && <span>{companhiasList.find((c) => c.id === v.companhia)?.nome ?? v.companhia}</span>}
                            {v.numero_bilhete && (
                              <code style={{ fontFamily: 'var(--tfd-font-mono)', color: 'var(--tfd-text-secondary)' }}>
                                {v.numero_bilhete}
                              </code>
                            )}
                            {v.valor != null && v.valor > 0 && (
                              <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                                {formatCurrency(v.valor)}
                              </span>
                            )}
                          </div>
                          {v.motivo_cancelamento && (
                            <p className="text-xs mt-1" style={{ color: '#92400E' }}>
                              Motivo: {v.motivo_cancelamento}
                            </p>
                          )}
                        </div>
                        <span
                          className="tfd-tag tfd-tag--rounded tfd-tag--dot shrink-0"
                          style={{ backgroundColor: sit?.bg, color: sit?.text }}
                        >
                          {sit?.label ?? v.situacao}
                        </span>
                      </div>
                    );
                  })}
                  <DocumentList docs={getDocsForSection(sol.documentos ?? [], 'viagens')} docTypeLabels={docTypeLabels} />
                </div>
              );
            })()}

            <ObservacoesEtapa
              solicitacaoId={id}
              etapa="passagens"
              observacoes={getObsEtapa('passagens')}
              autorId={currentUser?.id}
              autorPerfil={currentUser?.perfil}
              autorNome={currentUser?.nome_completo}
              onRegistered={reloadSolicitacao}
            />
            <div className="mt-3">
              <AutorizacaoInline
                solicitacaoId={id}
                autorId={currentUser?.id}
                autorPerfil={currentUser?.perfil}
                onRequested={reloadSolicitacao}
              />
            </div>
          </Section>

          {/* ── Ajuda de Custo ── */}
          <Section
            title="Ajuda de Custo"
            icon={<Wallet size={18} />}
            empty={ajudasCusto.length === 0}
            onEdit={openEditAjudaCusto}
            badge={
              ajudaCustoStatusDominante ? (
                <span
                  className="tfd-tag tfd-tag--rounded tfd-tag--dot"
                  style={{
                    backgroundColor: statusAjudaLabels[ajudaCustoStatusDominante]?.bg,
                    color: statusAjudaLabels[ajudaCustoStatusDominante]?.color,
                  }}
                >
                  {statusAjudaLabels[ajudaCustoStatusDominante]?.label}
                </span>
              ) : undefined
            }
          >
            {ajudasCusto.length > 0 && (
              <div className="space-y-3">
                {/* Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg text-center" style={{ backgroundColor: 'var(--tfd-surface-50)' }}>
                    <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Períodos</p>
                    <p className="text-lg font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                      {ajudasCusto.length}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ backgroundColor: 'var(--tfd-surface-50)' }}>
                    <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Dias elegíveis</p>
                    <p className="text-lg font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                      {ajudaCustoDias}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ backgroundColor: 'var(--tfd-surface-50)' }}>
                    <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Valor/dia (base)</p>
                    <p className="text-lg font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                      {formatCurrency(ajudasCusto[0]?.valor_diaria ?? 0)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ backgroundColor: 'var(--tfd-primary-50)' }}>
                    <p className="text-xs" style={{ color: 'var(--tfd-primary-600)' }}>Total</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--tfd-primary-700)' }}>
                      {formatCurrency(ajudaCustoTotal)}
                    </p>
                  </div>
                </div>

                {/* Periods list */}
                <div className="flex flex-col gap-2">
                  {ajudasCusto.map((ac: any, idx: number) => {
                    const pStyle = statusAjudaLabels[ac.status] ?? statusAjudaLabels.EM_ANALISE;
                    const dias = ac.dias_elegiveis ?? 0;
                    return (
                      <div
                        key={ac.id}
                        className="rounded-lg px-4 py-3"
                        style={{ border: '1px solid var(--tfd-surface-border)', backgroundColor: 'var(--tfd-surface-50)' }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold" style={{ color: 'var(--tfd-text-muted)' }}>
                              #{idx + 1}
                            </span>
                            <span className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                              {formatDate(ac.data_inicio)} — {formatDate(ac.data_fim ?? ac.data_inicio)}
                            </span>
                          </div>
                          <span
                            className="tfd-tag tfd-tag--rounded tfd-tag--dot shrink-0"
                            style={{ backgroundColor: pStyle.bg, color: pStyle.color, fontSize: '0.65rem' }}
                          >
                            {pStyle.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>
                          <span>{ac.tipo === 'PACIENTE' ? 'Paciente' : 'Acompanhante'}</span>
                          <span>{dias} dias</span>
                          <span>{formatCurrency(ac.valor_diaria ?? 0)}/dia</span>
                          <span className="font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                            {formatCurrency(ac.valor_total ?? 0)}
                          </span>
                        </div>
                        {(ac.status === 'CONCLUIDA' || ac.status === 'PAGO_PARCIALMENTE') && ac.valor_pago != null && (
                          <div className="flex items-center gap-3 text-xs mt-1 px-2 py-1.5 rounded" style={{ backgroundColor: ac.status === 'CONCLUIDA' ? '#F0FDF4' : '#FFF7ED' }}>
                            <span style={{ color: 'var(--tfd-text-secondary)' }}>Pago:</span>
                            <span className="font-semibold" style={{ color: ac.status === 'CONCLUIDA' ? '#15803D' : '#C2410C' }}>
                              {formatCurrency(ac.valor_pago)}
                            </span>
                            {ac.status === 'PAGO_PARCIALMENTE' && (
                              <>
                                <span style={{ color: 'var(--tfd-text-muted)' }}>·</span>
                                <span style={{ color: '#C2410C' }}>Saldo: {formatCurrency((ac.valor_total ?? 0) - ac.valor_pago)}</span>
                              </>
                            )}
                          </div>
                        )}
                        {ac.observacoes && (
                          <p className="text-xs mt-1" style={{ color: 'var(--tfd-text-muted)' }}>
                            {ac.observacoes}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                <DocumentList docs={getDocsForSection(sol.documentos ?? [], 'ajudaCusto')} docTypeLabels={docTypeLabels} />
              </div>
            )}

            <ObservacoesEtapa
              solicitacaoId={id}
              etapa="ajuda_custo"
              observacoes={getObsEtapa('ajuda_custo')}
              autorId={currentUser?.id}
              autorPerfil={currentUser?.perfil}
              autorNome={currentUser?.nome_completo}
              onRegistered={reloadSolicitacao}
            />
            <div className="mt-3">
              <AutorizacaoInline
                solicitacaoId={id}
                autorId={currentUser?.id}
                autorPerfil={currentUser?.perfil}
                onRequested={reloadSolicitacao}
              />
            </div>
          </Section>

          {/* ── Permanencia ── */}
          <Section
            title="Permanência e Prorrogações"
            icon={<CalendarClock size={18} />}
            empty={!perm}
            onEdit={openEditPermanencia}
            badge={
              perm && (perm.prorrogacoes ?? []).length > 0 ? (
                <span className="tfd-tag tfd-tag--rounded" style={{ backgroundColor: '#FFEDD5', color: '#C2410C' }}>
                  <RefreshCw size={10} />
                  {(perm.prorrogacoes ?? []).length} prorrog.
                </span>
              ) : undefined
            }
          >
            {perm && (
              <div className="space-y-3">
                <InfoRow label="Comunicação" value={formatDate(perm.data_comunicacao)} />
                <InfoRow label="Comunicado por" value={perm.comunicado_por ?? '—'} />
                <InfoRow label="Motivo" value={perm.motivo?.replace(/_/g, ' ') ?? '—'} />
                {perm.motivo_descricao && (
                  <InfoRow label="Descrição" value={perm.motivo_descricao} />
                )}
                <InfoRow label="Retorno previsto" value={formatDate(perm.nova_data_retorno_prevista)} />

                {(perm.prorrogacoes ?? []).length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium mb-2" style={{ color: 'var(--tfd-text-secondary)' }}>
                      Prorrogações
                    </p>
                    <div className="space-y-2">
                      {(perm.prorrogacoes ?? []).map((pror: any, idx: number) => (
                        <div
                          key={pror.id}
                          className="flex items-start gap-3 p-3 rounded-lg"
                          style={{ backgroundColor: 'var(--tfd-surface-50)' }}
                        >
                          <div
                            className="flex items-center justify-center w-7 h-7 rounded-full shrink-0 text-xs font-bold"
                            style={{ backgroundColor: '#FFEDD5', color: '#C2410C' }}
                          >
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                              +{pror.dias_adicionais_solicitados ?? '?'} dias — retorno: {formatDate(pror.nova_data_retorno)}
                            </p>
                            <p className="text-sm mt-0.5" style={{ color: 'var(--tfd-text-secondary)' }}>
                              {pror.justificativa_medica ?? '—'}
                            </p>
                            {pror.decisao && (
                              <p className="text-xs mt-1" style={{ color: 'var(--tfd-text-muted)' }}>
                                {pror.decisao === 'APROVADA' ? 'Aprovada' : pror.decisao === 'REJEITADA' ? 'Rejeitada' : pror.decisao}
                                {pror.decisao_por && ` por ${pror.decisao_por}`}
                                {pror.decisao_em && ` em ${formatDate(pror.decisao_em)}`}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <DocumentList docs={getDocsForSection(sol.documentos ?? [], 'permanencia')} docTypeLabels={docTypeLabels} />
              </div>
            )}

            <ObservacoesEtapa
              solicitacaoId={id}
              etapa="permanencia"
              observacoes={getObsEtapa('permanencia')}
              autorId={currentUser?.id}
              autorPerfil={currentUser?.perfil}
              autorNome={currentUser?.nome_completo}
              onRegistered={reloadSolicitacao}
            />
            <div className="mt-3">
              <AutorizacaoInline
                solicitacaoId={id}
                autorId={currentUser?.id}
                autorPerfil={currentUser?.perfil}
                onRequested={reloadSolicitacao}
              />
            </div>
          </Section>

        </div>

        {/* ====== RIGHT COLUMN (1/3) — Timeline + Observacoes ====== */}
        <div className="space-y-4">
          {/* Resumo rápido */}
          <div className="tfd-card">
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
              Resumo
            </h3>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>Status</span>
                <StatusTag status={sol.status} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>Criado em</span>
                <span className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                  {formatDate(sol.created_at)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>Atualizado</span>
                <span className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                  {formatDate(sol.updated_at)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>CID</span>
                <code
                  className="text-xs px-1.5 py-0.5 rounded font-semibold"
                  style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-700)', fontFamily: 'var(--tfd-font-mono)' }}
                >
                  {sol.cid10_principal ?? '—'}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>Procedimento</span>
                <span className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>
                  {sol.tipo_procedimento ?? '—'}
                </span>
              </div>
              {sol.especialidade && (
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>Especialidade</span>
                  <span className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>
                    {sol.especialidade.replace(/_/g, ' ')}
                  </span>
                </div>
              )}
              {sol.tipo_transporte_sugerido && (
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>Transporte</span>
                  <span className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>
                    {sol.tipo_transporte_sugerido.replace(/_/g, ' ')}
                  </span>
                </div>
              )}
              {(sol.viagens ?? []).length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>Passagens</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                    {(sol.viagens ?? []).length}
                  </span>
                </div>
              )}
              {ajudasCusto.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>Diárias ({ajudasCusto.length} {ajudasCusto.length === 1 ? 'período' : 'períodos'})</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--tfd-primary-700)' }}>
                    {formatCurrency(ajudaCustoTotal)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Observacoes gerais */}
          {sol.observacoes && (
            <div className="tfd-card">
              <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--tfd-text-primary)' }}>
                Observações
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--tfd-text-secondary)' }}>
                {sol.observacoes}
              </p>
            </div>
          )}

          {/* Timeline */}
          <div className="tfd-card">
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--tfd-text-primary)' }}>
              Linha do Tempo
            </h3>
            <TimelineTFD events={timeline} />
          </div>
        </div>
      </div>

      {/* ====== Edit Drawers ====== */}

      {/* ── Diagnóstico ── */}
      <Drawer
        open={editingSection === 'diagnostico'}
        onClose={() => setEditingSection(null)}
        title="Editar Diagnóstico Clínico"
        subtitle="CID, procedimento e justificativa"
        width="520px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={() => setEditingSection(null)}>Cancelar</button>
            <button className="tfd-btn tfd-btn-primary" onClick={saveDiagnostico} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </>
        }
      >
        <FormField label="CID-10" required>
          <input type="text" className="tfd-input" placeholder="ex: G40.0" value={edCid} onChange={(e) => setEdCid(e.target.value)} />
        </FormField>
        <FormField label="Descrição do diagnóstico" required>
          <textarea className="tfd-input" rows={3} value={edDescDiag} onChange={(e) => setEdDescDiag(e.target.value)} />
        </FormField>
        <LookupSelect
          categoria="especialidade"
          label="Especialidade"
          value={edEspecialidade}
          onChange={setEdEspecialidade}
        />
        <FormField label="Procedimento solicitado" required>
          <input type="text" className="tfd-input" value={edProcedimento} onChange={(e) => setEdProcedimento(e.target.value)} />
        </FormField>
        <FormField label="Justificativa TFD" required>
          <textarea className="tfd-input" rows={3} placeholder="Por que o tratamento não pode ser realizado no MA?" value={edJustificativa} onChange={(e) => setEdJustificativa(e.target.value)} />
        </FormField>
      </Drawer>

      {/* ── Parecer Médico (full form) ── */}
      <Drawer
        open={editingSection === 'parecer'}
        onClose={() => setEditingSection(null)}
        title={`Parecer — ${sol?.numero_processo ?? ''}`}
        subtitle={pac?.nome_completo ?? ''}
        width="580px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={() => setEditingSection(null)}>
              Cancelar
            </button>
            <button
              className="tfd-btn tfd-btn-primary"
              onClick={async () => {
                if (!edParecerDecisao) { toast.error('Decisão obrigatória', 'Selecione Deferido ou Indeferido.'); return; }
                if (!edParecerObs.trim()) { toast.warning('Campo obrigatório', 'Justifique a decisão do parecer.'); return; }
                setSaving(true);
                try {
                  const result = await criarParecer({
                    solicitacao_id: id,
                    medico_auditor_id: currentUser?.id,
                    decisao: edParecerDecisao as any,
                    observacoes_medicas: edParecerObs.trim(),
                    autoriza_acompanhante: edAutorizaAcompanhante,
                  });
                  if (result.error) { toast.error('Erro ao registrar parecer', (result.error as any).message); setSaving(false); return; }
                  const labels: Record<string, string> = { DEFERIDO: 'aprovada e encaminhada à Regulação', INDEFERIDO: 'indeferida', EXIGENCIA: 'devolvida com exigências' };
                  toast.success('Parecer registrado!', `Solicitação ${labels[edParecerDecisao]}.`);
                  setSaving(false);
                  setEditingSection(null);
                  reloadSolicitacao();
                } catch (err: unknown) {
                  const e = err as { message?: string };
                  toast.error('Erro inesperado', e.message ?? 'Tente novamente');
                  setSaving(false);
                }
              }}
              disabled={saving}
            >
              {saving ? 'Registrando...' : 'Registrar Parecer'}
            </button>
          </>
        }
      >
        {/* ── Dados do Paciente ── */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          <User size={14} className="inline mr-1.5" style={{ color: 'var(--tfd-primary-500)' }} />
          Dados do Paciente
        </h3>
        <div className="space-y-1.5 mb-4">
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--tfd-text-secondary)' }}>Nome</span>
            <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{pac?.nome_completo ?? '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--tfd-text-secondary)' }}>CPF</span>
            <span style={{ color: 'var(--tfd-text-primary)', fontFamily: 'var(--tfd-font-mono)' }}>{formatCPF(pac?.cpf ?? '')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--tfd-text-secondary)' }}>CNS</span>
            <span style={{ color: 'var(--tfd-text-primary)', fontFamily: 'var(--tfd-font-mono)' }}>{formatCNS(pac?.cns ?? '') || '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--tfd-text-secondary)' }}>Município</span>
            <span style={{ color: 'var(--tfd-text-primary)' }}>{municipioPaciente ?? '—'}</span>
          </div>
        </div>

        <hr className="tfd-divider" />

        {/* ── Diagnóstico ── */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          <Stethoscope size={14} className="inline mr-1.5" style={{ color: 'var(--tfd-primary-500)' }} />
          Diagnóstico
        </h3>
        <div className="space-y-1.5 mb-4">
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--tfd-text-secondary)' }}>CID-10</span>
            <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
              {sol?.cid10_principal ?? '—'}
              {sol?.cid10_secundario ? ` / ${sol.cid10_secundario}` : ''}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: 'var(--tfd-text-secondary)' }}>Procedimento</span>
            <span style={{ color: 'var(--tfd-text-primary)' }}>{sol?.tipo_procedimento ?? '—'}</span>
          </div>
          {sol?.descricao_diagnostico && (
            <div className="mt-2">
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--tfd-text-secondary)' }}>Descrição</p>
              <p className="text-sm leading-relaxed p-2.5 rounded-lg" style={{ backgroundColor: 'var(--tfd-surface-100)', color: 'var(--tfd-text-primary)' }}>
                {sol.descricao_diagnostico}
              </p>
            </div>
          )}
          {sol?.justificativa_tfd && (
            <div className="mt-2">
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--tfd-text-secondary)' }}>Justificativa TFD</p>
              <p className="text-sm leading-relaxed p-2.5 rounded-lg" style={{ backgroundColor: 'var(--tfd-surface-100)', color: 'var(--tfd-text-primary)' }}>
                {sol.justificativa_tfd}
              </p>
            </div>
          )}
        </div>

        <hr className="tfd-divider" />

        {/* ── Documentos ── */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          <FileText size={14} className="inline mr-1.5" style={{ color: 'var(--tfd-primary-500)' }} />
          Documentos ({(sol?.documentos ?? []).length})
        </h3>
        {(sol?.documentos ?? []).length === 0 ? (
          <p className="text-sm py-3 text-center" style={{ color: 'var(--tfd-text-muted)' }}>
            Nenhum documento anexado.
          </p>
        ) : (
          <div className="space-y-1.5 mb-4">
            {(sol?.documentos ?? []).map((doc: any) => (
              <a
                key={doc.id}
                href={doc.url_arquivo}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 p-2 rounded-lg transition-colors duration-150"
                style={{ textDecoration: 'none', color: 'var(--tfd-text-primary)' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--tfd-surface-100)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
              >
                <div className="flex items-center justify-center w-7 h-7 rounded shrink-0"
                  style={{ backgroundColor: 'var(--tfd-surface-100)', color: 'var(--tfd-text-secondary)' }}>
                  <FileText size={12} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.nome_arquivo}</p>
                  <p className="text-[11px]" style={{ color: 'var(--tfd-text-muted)' }}>
                    {docTypeLabels[doc.tipo as TipoDocumento] ?? doc.tipo}
                  </p>
                </div>
                <ExternalLink size={13} style={{ color: 'var(--tfd-text-muted)' }} />
              </a>
            ))}
          </div>
        )}

        <hr className="tfd-divider" />

        {/* ── Decisão do Parecer ── */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          <CheckCircle2 size={14} className="inline mr-1.5" style={{ color: 'var(--tfd-primary-500)' }} />
          Decisão do Parecer
        </h3>

        <FormField label="Decisão" required>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all duration-150"
              style={{
                border: edParecerDecisao === 'DEFERIDO' ? '2px solid #10B981' : '1px solid #E8ECF4',
                backgroundColor: edParecerDecisao === 'DEFERIDO' ? '#ECFDF5' : 'white',
                color: edParecerDecisao === 'DEFERIDO' ? '#059669' : '#6B7280',
              }}
              onClick={() => setEdParecerDecisao('DEFERIDO')}
            >
              <CheckCircle2 size={16} />
              Aprovar
            </button>
            <button
              type="button"
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all duration-150"
              style={{
                border: edParecerDecisao === 'INDEFERIDO' ? '2px solid #EF4444' : '1px solid #E8ECF4',
                backgroundColor: edParecerDecisao === 'INDEFERIDO' ? '#FEF2F2' : 'white',
                color: edParecerDecisao === 'INDEFERIDO' ? '#DC2626' : '#6B7280',
              }}
              onClick={() => setEdParecerDecisao('INDEFERIDO')}
            >
              <XCircle size={16} />
              Reprovar
            </button>
          </div>
        </FormField>

        {sol?.necessidade_acompanhante && edParecerDecisao === 'DEFERIDO' && (
          <div className="mb-4 flex items-center gap-2">
            <input
              type="checkbox"
              id="edAutorizaAcomp"
              checked={edAutorizaAcompanhante}
              onChange={(e) => setEdAutorizaAcompanhante(e.target.checked)}
              style={{ accentColor: 'var(--tfd-primary-500)' }}
            />
            <label htmlFor="edAutorizaAcomp" className="tfd-label" style={{ marginBottom: 0 }}>
              Autorizar acompanhante
            </label>
          </div>
        )}

        <FormField
          label={edParecerDecisao === 'DEFERIDO' ? 'Justificativa da aprovação' : edParecerDecisao === 'INDEFERIDO' ? 'Motivo da reprovação' : 'Observações do parecer'}
          required
        >
          <textarea
            className="tfd-input"
            rows={4}
            placeholder={
              edParecerDecisao === 'DEFERIDO'
                ? 'Descreva por que a solicitação foi aprovada...'
                : edParecerDecisao === 'INDEFERIDO'
                  ? 'Descreva o motivo da reprovação...'
                  : 'Selecione a decisão acima para prosseguir...'
            }
            value={edParecerObs}
            onChange={(e) => setEdParecerObs(e.target.value)}
          />
        </FormField>
      </Drawer>

      {/* ── Regulação (full decision panel) ── */}
      <Drawer
        open={editingSection === 'regulacao'}
        onClose={() => setEditingSection(null)}
        title={`Regulação — ${sol?.numero_processo ?? ''}`}
        subtitle={pac?.nome_completo ?? ''}
        width="520px"
        footer={
          <button className="tfd-btn tfd-btn-secondary" onClick={() => setEditingSection(null)}>Fechar</button>
        }
      >
        {/* Decision Card */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Decisão</h3>

        {regPendingRoute ? (
          /* ===== Rota selecionada — formulário de cobrança/proposta ===== */
          <div className="space-y-3">
            <div className="tfd-message tfd-message--info">
              <span className="tfd-message-icon mt-0.5 shrink-0">
                <Send size={14} />
              </span>
              <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
                <strong>{{ CNRAC: 'Encaminhar para CNRAC', SETI: 'Encaminhar para SETI', RESPOSTA_EXTERNA: 'Consultar SAAS/Dutra', SERVICO_SOCIAL: 'Encaminhar ao Serviço Social' }[regPendingRoute]}</strong> — preencha os dados do encaminhamento/proposta antes de confirmar.
              </p>
            </div>

            <FormField label="Destinatário" required>
              <input
                type="text"
                className="tfd-input tfd-input--sm"
                placeholder="Ex: CNRAC, SETI, Hospital Dutra..."
                value={regCobDestinatario}
                onChange={(e) => setRegCobDestinatario(e.target.value)}
              />
            </FormField>

            <LookupSelect
              categoria="canal_comunicacao"
              label="Canal de envio"
              value={regCobCanal}
              onChange={(v) => { setRegCobCanal(v); setRegCobContatoCanal(''); }}
              required
            />

            {regCobCanal && (
              <FormField label={regCobCanal === 'EMAIL' ? 'E-mail de contato' : regCobCanal === 'SISTEMA' ? 'Identificação no sistema' : 'Número de contato'} required>
                {regCobCanal === 'EMAIL' ? (
                  <input
                    type="email"
                    className="tfd-input tfd-input--sm"
                    placeholder="contato@orgao.gov.br"
                    value={regCobContatoCanal}
                    onChange={(e) => setRegCobContatoCanal(e.target.value)}
                  />
                ) : regCobCanal === 'SISTEMA' ? (
                  <input
                    type="text"
                    className="tfd-input tfd-input--sm"
                    placeholder="Ex: Protocolo CNRAC nº 12345"
                    value={regCobContatoCanal}
                    onChange={(e) => setRegCobContatoCanal(e.target.value)}
                  />
                ) : (
                  <input
                    type="tel"
                    className="tfd-input tfd-input--sm"
                    placeholder="(00) 00000-0000"
                    value={regCobContatoCanal}
                    onChange={(e) => {
                      let v = e.target.value.replace(/\D/g, '').slice(0, 11);
                      if (v.length > 6) v = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
                      else if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
                      else if (v.length > 0) v = `(${v}`;
                      setRegCobContatoCanal(v);
                    }}
                  />
                )}
              </FormField>
            )}

            <FormField label="Data de envio" required>
              <input
                type="date"
                className="tfd-input tfd-input--sm"
                value={regCobDataEnvio}
                onChange={(e) => setRegCobDataEnvio(e.target.value)}
              />
            </FormField>

            <FormField label="Conteúdo da proposta / Resumo">
              <textarea
                className="tfd-input tfd-input--sm"
                rows={3}
                placeholder="Descreva a proposta enviada, dados do paciente encaminhados, etc."
                value={regCobConteudo}
                onChange={(e) => setRegCobConteudo(e.target.value)}
              />
            </FormField>

            <div className="flex gap-2 pt-1">
              <button
                className="tfd-btn tfd-btn-secondary tfd-btn--sm flex-1"
                onClick={() => setRegPendingRoute(null)}
              >
                Voltar
              </button>
              <button
                className="tfd-btn tfd-btn-primary tfd-btn--sm flex-1"
                disabled={regDeciding || !regCobDestinatario || !regCobCanal || !regCobContatoCanal}
                onClick={async () => {
                  setRegDeciding(true);
                  try {
                    const rotaResult = await criarRotaRegulacao({
                      solicitacao_id: id,
                      tipo_rota: regPendingRoute as any,
                      justificativa: regCobConteudo || null,
                    } as any);
                    if (rotaResult.error) {
                      toast.error('Erro na regulação', (rotaResult.error as any).message);
                      setRegDeciding(false);
                      return;
                    }
                    // Create cobranca linked to the rota
                    await criarCobrancaExterna({
                      rota_regulacao_id: (rotaResult.data as any).id,
                      solicitacao_id: id,
                      destinatario: regCobDestinatario,
                      canal: regCobCanal,
                      contato_canal: regCobContatoCanal,
                      data_envio: regCobDataEnvio,
                      conteudo_envio: regCobConteudo || null,
                    } as any);
                    toast.success('Encaminhamento registrado!', `Solicitação encaminhada para ${regCobDestinatario}.`);
                    setRegDeciding(false);
                    setEditingSection(null);
                    reloadSolicitacao();
                  } catch (err: unknown) {
                    const e = err as { message?: string };
                    toast.error('Erro inesperado', e.message ?? 'Tente novamente');
                    setRegDeciding(false);
                  }
                }}
              >
                <Send size={14} />
                {regDeciding ? 'Enviando...' : 'Confirmar Envio'}
              </button>
            </div>
          </div>
        ) : (
          /* ===== Botões de roteamento ===== */
          <div className="space-y-2">
            <button
              className="tfd-btn tfd-btn-primary tfd-btn--sm w-full"
              disabled={regDeciding}
              onClick={async () => {
                setRegDeciding(true);
                try {
                  const result = await criarRotaRegulacao({
                    solicitacao_id: id,
                    tipo_rota: 'APROVADO_DIRETO' as any,
                    justificativa: null,
                  } as any);
                  if (result.error) {
                    toast.error('Erro na regulação', (result.error as any).message);
                    setRegDeciding(false);
                    return;
                  }
                  toast.success('Aprovado!', 'Solicitação aprovada diretamente.');
                  setRegDeciding(false);
                  setEditingSection(null);
                  reloadSolicitacao();
                } catch (err: unknown) {
                  const e = err as { message?: string };
                  toast.error('Erro inesperado', e.message ?? 'Tente novamente');
                  setRegDeciding(false);
                }
              }}
            >
              <CheckCircle2 size={14} />
              {regDeciding ? 'Processando...' : 'Aprovar Diretamente'}
            </button>
            <button
              className="tfd-btn tfd-btn-outline tfd-btn--sm w-full"
              style={{ borderColor: '#1D4ED8', color: '#1D4ED8' }}
              onClick={() => { setRegPendingRoute('CNRAC'); setRegCobDestinatario('CNRAC'); }}
            >
              <Building2 size={14} />
              Encaminhar CNRAC
            </button>
            <button
              className="tfd-btn tfd-btn-outline tfd-btn--sm w-full"
              style={{ borderColor: '#7C3AED', color: '#7C3AED' }}
              onClick={() => { setRegPendingRoute('SETI'); setRegCobDestinatario('SETI'); }}
            >
              <Heart size={14} />
              Encaminhar SETI
            </button>
            <button
              className="tfd-btn tfd-btn-outline tfd-btn--sm w-full"
              style={{ borderColor: '#C2410C', color: '#C2410C' }}
              onClick={() => { setRegPendingRoute('RESPOSTA_EXTERNA'); setRegCobDestinatario('SAAS/Hospital Dutra'); }}
            >
              <ExternalLink size={14} />
              Consultar SAAS/Dutra
            </button>
            <button
              className="tfd-btn tfd-btn-outline tfd-btn--sm w-full"
              style={{ borderColor: '#92400E', color: '#92400E' }}
              onClick={() => { setRegPendingRoute('SERVICO_SOCIAL'); setRegCobDestinatario('Serviço Social'); }}
            >
              <Users size={14} />
              Encaminhar Serviço Social
            </button>
          </div>
        )}
      </Drawer>

      {/* ── Agendamento (full form) ── */}
      <Drawer
        open={editingSection === 'agendamento'}
        onClose={() => setEditingSection(null)}
        title={agEditingId ? 'Editar Agendamento' : 'Novo Agendamento'}
        subtitle={`${pac?.nome_completo ?? '—'} — ${sol?.numero_processo ?? ''}`}
        width="480px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={() => setEditingSection(null)}>Cancelar</button>
            <button
              className="tfd-btn tfd-btn-primary"
              disabled={saving}
              onClick={async () => {
                if (!agNomeUnidade) { toast.error('Campo obrigatório', 'Informe o nome da unidade.'); return; }
                if (!agDataAgendamento) { toast.error('Campo obrigatório', 'Informe a data do agendamento.'); return; }
                setSaving(true);
                const payload = {
                  solicitacao_id: id,
                  unidade_executante: agNomeUnidade,
                  cnes: agCnes || undefined,
                  cidade_destino: agCidade,
                  uf_destino: agUf,
                  contato_unidade: (agTipoContato && agContatoUnidade) ? `${agTipoContato}: ${agContatoUnidade}` : agContatoUnidade || undefined,
                  tipo_atendimento: (agTipoAtendimento as any) || undefined,
                  data_hora_agendamento: agDataAgendamento ? new Date(agDataAgendamento).toISOString() : new Date().toISOString(),
                  origem_agendamento: (agOrigemAgendamento as any) || undefined,
                  numero_cnrac: agNumCnrac || undefined,
                  status: agStatusAgendamento as any,
                };
                try {
                  const result = agEditingId
                    ? await atualizarAgendamento(agEditingId, payload)
                    : await criarAgendamento(payload);
                  if (result.error) {
                    toast.error(agEditingId ? 'Erro ao atualizar' : 'Erro ao registrar', (result.error as any).message);
                    setSaving(false);
                    return;
                  }
                  toast.success(agEditingId ? 'Agendamento atualizado!' : 'Agendamento registrado!');
                  setSaving(false);
                  setEditingSection(null);
                  reloadSolicitacao();
                } catch (err: unknown) {
                  const e = err as { message?: string };
                  toast.error('Erro inesperado', e.message ?? 'Tente novamente');
                  setSaving(false);
                }
              }}
            >
              {saving ? 'Salvando...' : agEditingId ? 'Salvar Alterações' : 'Registrar Agendamento'}
            </button>
          </>
        }
      >
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Unidade de Destino</h3>
        <FormField label="Nome da unidade" required>
          <input
            type="text"
            className="tfd-input"
            placeholder="Ex: Hospital Sírio-Libanês"
            value={agNomeUnidade}
            onChange={(e) => setAgNomeUnidade(e.target.value)}
          />
        </FormField>
        <FormField label="CNES">
          <input
            type="text"
            className="tfd-input"
            placeholder="0000000"
            maxLength={7}
            value={agCnes}
            onChange={(e) => setAgCnes(e.target.value.replace(/\D/g, '').slice(0, 7))}
            style={{ fontFamily: 'var(--tfd-font-mono)' }}
          />
        </FormField>
        <UfCidadeSelect
          uf={agUf}
          cidade={agCidade}
          onUfChange={setAgUf}
          onCidadeChange={setAgCidade}
          required
        />
        <FormField label="Tipo de contato">
          <select
            className="tfd-input"
            value={agTipoContato}
            onChange={(e) => { setAgTipoContato(e.target.value); setAgContatoUnidade(''); }}
          >
            <option value="">Selecione...</option>
            <option value="TELEFONE">Telefone</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="SMS">SMS</option>
            <option value="EMAIL">E-mail</option>
          </select>
        </FormField>
        {agTipoContato && (
          <FormField label={agTipoContato === 'EMAIL' ? 'E-mail' : 'Número'}>
            {agTipoContato === 'EMAIL' ? (
              <input
                type="email"
                className="tfd-input"
                placeholder="contato@hospital.com.br"
                value={agContatoUnidade}
                onChange={(e) => setAgContatoUnidade(e.target.value)}
              />
            ) : (
              <input
                type="tel"
                className="tfd-input"
                placeholder="(00) 00000-0000"
                value={agContatoUnidade}
                onChange={(e) => {
                  let v = e.target.value.replace(/\D/g, '').slice(0, 11);
                  if (v.length > 6) v = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
                  else if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
                  else if (v.length > 0) v = `(${v}`;
                  setAgContatoUnidade(v);
                }}
              />
            )}
          </FormField>
        )}

        <hr className="tfd-divider" />

        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Agendamento</h3>
        <LookupSelect
          categoria="tipo_procedimento"
          label="Tipo de atendimento"
          value={agTipoAtendimento}
          onChange={setAgTipoAtendimento}
          required
        />
        <FormField label="Data do agendamento" required>
          <input
            type="date"
            className="tfd-input"
            value={agDataAgendamento}
            onChange={(e) => setAgDataAgendamento(e.target.value)}
          />
        </FormField>
        <LookupSelect
          categoria="origem_agendamento"
          label="Origem do agendamento"
          value={agOrigemAgendamento}
          onChange={setAgOrigemAgendamento}
        />
        {agOrigemAgendamento === 'CNRAC' && (
          <FormField label="Nº CNRAC">
            <input
              type="text"
              className="tfd-input"
              placeholder="Número CNRAC"
              value={agNumCnrac}
              onChange={(e) => setAgNumCnrac(e.target.value)}
              style={{ fontFamily: 'var(--tfd-font-mono)' }}
            />
          </FormField>
        )}

        <hr className="tfd-divider" />

        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Status</h3>
        <FormField label="Status do agendamento">
          <select
            className="tfd-input"
            value={agStatusAgendamento}
            onChange={(e) => setAgStatusAgendamento(e.target.value)}
          >
            <option value="AGUARDANDO_CONFIRMACAO">Aguardando Confirmação</option>
            <option value="CONFIRMADO">Confirmado</option>
          </select>
        </FormField>

        <hr className="tfd-divider" />

        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Comprovante</h3>
        <FormField label="Upload de comprovante">
          <div className="relative">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="tfd-input pt-1.5"
              onChange={(e) => setAgComprovante(e.target.files?.[0] ?? null)}
            />
          </div>
        </FormField>
        <div className="tfd-message tfd-message--info">
          <span className="tfd-message-icon mt-0.5 shrink-0">
            <Info size={16} />
          </span>
          <p className="text-sm flex-1" style={{ color: 'var(--tfd-text-secondary)' }}>
            Tipos aceitos: PDF, JPG, PNG. O comprovante é obrigatório para avançar para emissão de passagem.
          </p>
        </div>
      </Drawer>

      {/* ── Viagens (tabbed ida/volta form) ── */}
      <Drawer
        open={editingSection === 'viagens'}
        onClose={() => setEditingSection(null)}
        title={viagEditingId ? 'Editar Passagens' : 'Emitir Passagens — Ida + Volta'}
        subtitle={`${pac?.nome_completo ?? '—'} — ${sol?.numero_processo ?? ''}`}
        width="580px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={() => setEditingSection(null)}>Cancelar</button>
            <button
              className="tfd-btn tfd-btn-primary"
              disabled={submitting}
              onClick={async () => {
                if (!idaOrigem || !idaDestino || !idaDataEmbarque) {
                  toast.warning('Dados incompletos', 'Preencha origem, destino e data da IDA.');
                  setViagDrawerTab('ida');
                  return;
                }
                if (!voltaOrigem || !voltaDestino || !voltaDataEmbarque) {
                  toast.warning('Dados incompletos', 'Preencha origem, destino e data da VOLTA.');
                  setViagDrawerTab('volta');
                  return;
                }
                setSubmitting(true);
                try {
                  if (viagEditingId) {
                    // Edit existing
                    const viagens = sol?.viagens ?? [];
                    const ida = viagens.find((v: any) => v.tipo === 'IDA');
                    const volta = viagens.find((v: any) => v.tipo === 'RETORNO');
                    if (ida) {
                      await atualizarViagem(ida.id, {
                        solicitacao_id: id,
                        tipo: 'IDA' as any,
                        modal: (idaModalTransporte as any) || 'AEREO',
                        origem_cidade: idaOrigem, origem_uf: idaOrigemUf,
                        destino_cidade: idaDestino, destino_uf: idaDestinoUf,
                        com_pernoite: false,
                        data_embarque_prevista: idaDataEmbarque,
                        medif_necessario: idaMedif,
                        valor: idaValor ? parseCurrency(idaValor) : undefined,
                        companhia: (companhiasList.find((c) => c.id === idaCompanhia)?.nome ?? idaCompanhia) || undefined,
                        numero_bilhete: idaLocalizador || undefined,
                        observacoes: idaObservacoes || undefined,
                      } as any);
                    }
                    if (volta) {
                      await atualizarViagem(volta.id, {
                        solicitacao_id: id,
                        tipo: 'RETORNO' as any,
                        modal: (voltaModalTransporte as any) || 'AEREO',
                        origem_cidade: voltaOrigem, origem_uf: voltaOrigemUf,
                        destino_cidade: voltaDestino, destino_uf: voltaDestinoUf,
                        com_pernoite: false,
                        data_embarque_prevista: voltaDataEmbarque,
                        medif_necessario: voltaMedif,
                        valor: voltaValor ? parseCurrency(voltaValor) : undefined,
                        companhia: (companhiasList.find((c) => c.id === voltaCompanhia)?.nome ?? voltaCompanhia) || undefined,
                        numero_bilhete: voltaLocalizador || undefined,
                        observacoes: voltaObservacoes || undefined,
                      } as any);
                    }
                    toast.success('Passagens atualizadas!');
                  } else {
                    // Create ida
                    const idaResult = await criarViagem({
                      solicitacao_id: id,
                      tipo: 'IDA' as any,
                      modal: (idaModalTransporte as any) || 'AEREO',
                      origem_cidade: idaOrigem, origem_uf: idaOrigemUf,
                      destino_cidade: idaDestino, destino_uf: idaDestinoUf,
                      com_pernoite: false,
                      data_embarque_prevista: idaDataEmbarque,
                      medif_necessario: idaMedif,
                      valor: idaValor ? parseCurrency(idaValor) : undefined,
                      companhia: (companhiasList.find((c) => c.id === idaCompanhia)?.nome ?? idaCompanhia) || undefined,
                      numero_bilhete: idaLocalizador || undefined,
                      observacoes: idaObservacoes || undefined,
                    } as any);
                    if (idaResult.error) {
                      toast.error('Erro ao emitir ida', (idaResult.error as any).message);
                      setSubmitting(false);
                      return;
                    }
                    // Create volta
                    const voltaResult = await criarViagem({
                      solicitacao_id: id,
                      tipo: 'RETORNO' as any,
                      modal: (voltaModalTransporte as any) || 'AEREO',
                      origem_cidade: voltaOrigem, origem_uf: voltaOrigemUf,
                      destino_cidade: voltaDestino, destino_uf: voltaDestinoUf,
                      com_pernoite: false,
                      data_embarque_prevista: voltaDataEmbarque,
                      medif_necessario: voltaMedif,
                      valor: voltaValor ? parseCurrency(voltaValor) : undefined,
                      companhia: (companhiasList.find((c) => c.id === voltaCompanhia)?.nome ?? voltaCompanhia) || undefined,
                      numero_bilhete: voltaLocalizador || undefined,
                      observacoes: voltaObservacoes || undefined,
                    } as any);
                    if (voltaResult.error) {
                      toast.error('Erro ao emitir volta', (voltaResult.error as any).message);
                      setSubmitting(false);
                      return;
                    }
                    toast.success('Passagens emitidas!', 'Ida e volta registradas.');
                  }
                  setSubmitting(false);
                  setEditingSection(null);
                  reloadSolicitacao();
                } catch (err: unknown) {
                  const e = err as { message?: string };
                  toast.error('Erro inesperado', e.message ?? 'Tente novamente');
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? <><Loader2 size={14} className="animate-spin" /> Emitindo...</> : viagEditingId ? 'Salvar Alterações' : <><Plane size={14} /> Emitir Ida + Volta</>}
            </button>
          </>
        }
      >
        {/* Tabs: Ida / Volta */}
        <div className="flex items-center gap-1 mb-4" style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}>
          {([
            { key: 'ida' as DrawerTab, label: 'Ida', icon: <Plane size={14} /> },
            { key: 'volta' as DrawerTab, label: 'Volta', icon: <Plane size={14} style={{ transform: 'rotate(180deg)' }} /> },
          ]).map((tab) => (
            <button
              key={tab.key}
              type="button"
              className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors"
              style={{
                color: viagDrawerTab === tab.key ? 'var(--tfd-primary-600)' : 'var(--tfd-text-muted)',
                borderBottom: viagDrawerTab === tab.key ? '2px solid var(--tfd-primary-500)' : '2px solid transparent',
                marginBottom: '-1px',
              }}
              onClick={() => setViagDrawerTab(tab.key)}
            >
              {tab.icon}
              {tab.label}
              {tab.key === 'ida' && idaOrigem && idaDestino && idaDataEmbarque && (
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--tfd-status-success)' }} />
              )}
              {tab.key === 'volta' && voltaOrigem && voltaDestino && voltaDataEmbarque && (
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--tfd-status-success)' }} />
              )}
            </button>
          ))}
        </div>

        {/* Tab: Ida */}
        {viagDrawerTab === 'ida' && (
          <>
            <h4 className="text-xs font-semibold mb-1" style={{ color: 'var(--tfd-text-muted)' }}>Origem</h4>
            <UfCidadeSelect ufLabel="UF Origem" cidadeLabel="Cidade Origem" uf={idaOrigemUf} cidade={idaOrigem} onUfChange={setIdaOrigemUf} onCidadeChange={setIdaOrigem} required />
            <h4 className="text-xs font-semibold mb-1 mt-2" style={{ color: 'var(--tfd-text-muted)' }}>Destino</h4>
            <UfCidadeSelect ufLabel="UF Destino" cidadeLabel="Cidade Destino" uf={idaDestinoUf} cidade={idaDestino} onUfChange={setIdaDestinoUf} onCidadeChange={setIdaDestino} required />
            <FormField label="Data de embarque" required>
              <input type="date" className="tfd-input" value={idaDataEmbarque} onChange={(e) => setIdaDataEmbarque(e.target.value)} />
            </FormField>
            <LookupSelect
              categoria="modal_transporte"
              label="Modal de transporte"
              value={idaModalTransporte}
              onChange={setIdaModalTransporte}
            />
            <FormField label="Companhia">
              <select className="tfd-input" value={idaCompanhia} onChange={(e) => setIdaCompanhia(e.target.value)} disabled={loadingCompanhias}>
                <option value="">{loadingCompanhias ? 'Carregando...' : 'Selecione...'}</option>
                {companhiasList.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </FormField>
            <FormField label="Localizador / Bilhete">
              <input type="text" className="tfd-input" placeholder="Código do bilhete" value={idaLocalizador} onChange={(e) => setIdaLocalizador(e.target.value)} />
            </FormField>
            <FormField label="Valor da passagem">
              <input type="text" className="tfd-input" placeholder="R$ 0,00" value={idaValor} onChange={(e) => setIdaValor(maskCurrency(e.target.value))} />
            </FormField>
            <div className="mb-4 flex items-center gap-2">
              <input type="checkbox" id="idaMedif" checked={idaMedif} onChange={(e) => setIdaMedif(e.target.checked)} style={{ accentColor: 'var(--tfd-primary-500)' }} />
              <label htmlFor="idaMedif" className="tfd-label" style={{ marginBottom: 0 }}>MEDIF necessário</label>
            </div>
            <FormField label="Observações">
              <textarea className="tfd-input" rows={2} value={idaObservacoes} onChange={(e) => setIdaObservacoes(e.target.value)} />
            </FormField>
          </>
        )}

        {/* Tab: Volta */}
        {viagDrawerTab === 'volta' && (
          <>
            <h4 className="text-xs font-semibold mb-1" style={{ color: 'var(--tfd-text-muted)' }}>Origem</h4>
            <UfCidadeSelect ufLabel="UF Origem" cidadeLabel="Cidade Origem" uf={voltaOrigemUf} cidade={voltaOrigem} onUfChange={setVoltaOrigemUf} onCidadeChange={setVoltaOrigem} required />
            <h4 className="text-xs font-semibold mb-1 mt-2" style={{ color: 'var(--tfd-text-muted)' }}>Destino</h4>
            <UfCidadeSelect ufLabel="UF Destino" cidadeLabel="Cidade Destino" uf={voltaDestinoUf} cidade={voltaDestino} onUfChange={setVoltaDestinoUf} onCidadeChange={setVoltaDestino} required />
            <FormField label="Data de embarque" required>
              <input type="date" className="tfd-input" value={voltaDataEmbarque} onChange={(e) => setVoltaDataEmbarque(e.target.value)} />
            </FormField>
            <LookupSelect
              categoria="modal_transporte"
              label="Modal de transporte"
              value={voltaModalTransporte}
              onChange={setVoltaModalTransporte}
            />
            <FormField label="Companhia">
              <select className="tfd-input" value={voltaCompanhia} onChange={(e) => setVoltaCompanhia(e.target.value)} disabled={loadingCompanhias}>
                <option value="">{loadingCompanhias ? 'Carregando...' : 'Selecione...'}</option>
                {companhiasList.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </FormField>
            <FormField label="Localizador / Bilhete">
              <input type="text" className="tfd-input" placeholder="Código do bilhete" value={voltaLocalizador} onChange={(e) => setVoltaLocalizador(e.target.value)} />
            </FormField>
            <FormField label="Valor da passagem">
              <input type="text" className="tfd-input" placeholder="R$ 0,00" value={voltaValor} onChange={(e) => setVoltaValor(maskCurrency(e.target.value))} />
            </FormField>
            <div className="mb-4 flex items-center gap-2">
              <input type="checkbox" id="voltaMedif" checked={voltaMedif} onChange={(e) => setVoltaMedif(e.target.checked)} style={{ accentColor: 'var(--tfd-primary-500)' }} />
              <label htmlFor="voltaMedif" className="tfd-label" style={{ marginBottom: 0 }}>MEDIF necessário</label>
            </div>
            <FormField label="Observações">
              <textarea className="tfd-input" rows={2} value={voltaObservacoes} onChange={(e) => setVoltaObservacoes(e.target.value)} />
            </FormField>
          </>
        )}
      </Drawer>

      {/* ── Ajuda de Custo (full form) ── */}
      <Drawer
        open={editingSection === 'ajuda-custo'}
        onClose={() => setEditingSection(null)}
        title={acEditingId ? 'Editar Ajuda de Custo' : 'Nova Ajuda de Custo'}
        subtitle={`${pac?.nome_completo ?? '—'} — ${sol?.numero_processo ?? ''}`}
        width="520px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={() => setEditingSection(null)}>Cancelar</button>
            <button
              className="tfd-btn tfd-btn-primary"
              disabled={saving}
              onClick={async () => {
                if (!acDataInicio) { toast.error('Data obrigatória', 'Informe a data de início do período.'); return; }
                if (acDataFimError) { toast.error('Datas inválidas', acDataFimError); return; }
                setSaving(true);
                const payload: any = {
                  solicitacao_id: id,
                  tipo: acTipoBeneficiario || 'PACIENTE',
                  data_inicio: acDataInicio,
                  data_fim: acDataFim || null,
                  valor_diaria: acValorDiariaNum,
                  valor_total: acValorTotalCalc,
                  observacoes: acObservacoes || null,
                  status: 'EM_ANALISE',
                };
                try {
                  const result = acEditingId
                    ? await atualizarAjudaCusto(acEditingId, payload)
                    : await criarAjudaCusto(payload);
                  if (result.error) {
                    toast.error(acEditingId ? 'Erro ao atualizar' : 'Erro ao cadastrar', (result.error as any).message);
                    setSaving(false);
                    return;
                  }
                  toast.success(acEditingId ? 'Ajuda de custo atualizada!' : 'Ajuda de custo cadastrada!');
                  setSaving(false);
                  setEditingSection(null);
                  reloadSolicitacao();
                } catch (err: unknown) {
                  const e = err as { message?: string };
                  toast.error('Erro inesperado', e.message ?? 'Tente novamente');
                  setSaving(false);
                }
              }}
            >
              {saving ? 'Salvando...' : acEditingId ? 'Salvar Alterações' : 'Cadastrar Ajuda de Custo'}
            </button>
          </>
        }
      >
        <FormField label="Tipo de beneficiário" required>
          <select
            className="tfd-input"
            value={acTipoBeneficiario}
            onChange={(e) => setAcTipoBeneficiario(e.target.value)}
          >
            <option value="PACIENTE">Paciente</option>
            <option value="ACOMPANHANTE">Acompanhante</option>
          </select>
        </FormField>

        <hr className="tfd-divider" />

        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Período</h3>
        <FormField label="Data de início" required>
          <input
            type="date"
            className="tfd-input"
            value={acDataInicio}
            onChange={(e) => setAcDataInicio(e.target.value)}
          />
        </FormField>
        <FormField label="Data de fim" error={acDataFimError}>
          <input
            type="date"
            className="tfd-input"
            min={acDataInicio || undefined}
            value={acDataFim}
            onChange={(e) => setAcDataFim(e.target.value)}
          />
        </FormField>
        <FormField label="Dias elegíveis">
          <input
            type="number"
            className="tfd-input"
            min="0"
            placeholder={acDiasCalc > 0 ? `Calculado: ${acDiasCalc}` : 'Calculado automaticamente'}
            value={acDiasElegiveis}
            onChange={(e) => setAcDiasElegiveis(e.target.value)}
          />
          <p className="text-xs mt-1" style={{ color: 'var(--tfd-text-muted)' }}>
            Deixe em branco para calcular automaticamente pelas datas.
          </p>
        </FormField>

        <hr className="tfd-divider" />

        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Valores</h3>
        <FormField label="Valor da diária">
          <input
            type="text"
            className="tfd-input"
            placeholder={`R$ ${valorDiariaCompleta.toFixed(2).replace('.', ',')}`}
            value={acValorDiaria}
            onChange={(e) => setAcValorDiaria(maskCurrency(e.target.value))}
          />
          <p className="text-xs mt-1" style={{ color: 'var(--tfd-text-muted)' }}>
            Valor padrão do sistema: {formatCurrency(valorDiariaCompleta)}
          </p>
        </FormField>

        {/* Calculated total display */}
        <div
          className="flex items-center justify-between px-4 py-3 rounded-lg mb-4"
          style={{ backgroundColor: 'var(--tfd-primary-50)' }}
        >
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-primary-600)' }}>Valor total calculado</p>
            <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
              {acDiasCalc > 1
                ? `(${acDiasCalc} - 1) × ${formatCurrency(acValorDiariaNum)} + ${formatCurrency(valorDiariaRetorno)} (dia de retorno)`
                : acDiasCalc === 1
                  ? `${formatCurrency(valorDiariaRetorno)} (dia único, sem pernoite)`
                  : '—'}
            </p>
          </div>
          <p className="text-xl font-bold" style={{ color: 'var(--tfd-primary-700)' }}>
            {formatCurrency(acValorTotalCalc)}
          </p>
        </div>

        <hr className="tfd-divider" />

        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Observações</h3>
        <FormField label="Observações">
          <textarea
            className="tfd-input"
            rows={3}
            placeholder="Observações opcionais..."
            value={acObservacoes}
            onChange={(e) => setAcObservacoes(e.target.value)}
          />
        </FormField>
      </Drawer>

      {/* ── Permanência (full form) ── */}
      <Drawer
        open={editingSection === 'permanencia'}
        onClose={() => setEditingSection(null)}
        title={permEditingId ? 'Editar Permanência' : 'Registrar Permanência'}
        subtitle={`${pac?.nome_completo ?? '—'} — ${sol?.numero_processo ?? ''}`}
        width="480px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={() => setEditingSection(null)}>Cancelar</button>
            <button
              className="tfd-btn tfd-btn-primary"
              disabled={submitting}
              onClick={async () => {
                if (!permDataComunicacao) { toast.warning('Campo obrigatório', 'Informe a data da comunicação.'); return; }
                if (!permMotivo) { toast.warning('Campo obrigatório', 'Selecione o motivo da permanência.'); return; }
                if (!permNovaDataRetorno) { toast.warning('Campo obrigatório', 'Informe a nova data de retorno prevista.'); return; }
                setSubmitting(true);
                try {
                  const payload: any = {
                    solicitacao_id: id,
                    data_comunicacao: permDataComunicacao,
                    comunicado_por: permComunicadoPor || null,
                    motivo: permMotivo,
                    motivo_descricao: permMotivo === 'OUTROS' ? permMotivoDescricao || null : null,
                    nova_data_retorno_prevista: permNovaDataRetorno,
                  };
                  const result = permEditingId
                    ? await atualizarPermanencia(permEditingId, payload)
                    : await criarPermanencia(payload);
                  if (result.error) {
                    const err = result.error as { message?: string };
                    toast.error(permEditingId ? 'Erro ao atualizar' : 'Erro ao registrar', err.message ?? 'Tente novamente.');
                    setSubmitting(false);
                    return;
                  }
                  // If prorrogação requested and this is a new permanência, create it
                  if (permSolicitarProrrogacao && !permEditingId && result.data) {
                    const permId = (result.data as any).id;
                    const diasAdd = parseInt(permDiasAdicionais, 10);
                    if (permId && diasAdd > 0) {
                      const novaDataProrrogacao = new Date(permNovaDataRetorno + 'T00:00:00');
                      novaDataProrrogacao.setDate(novaDataProrrogacao.getDate() + diasAdd);
                      await criarProrrogacao({
                        permanencia_id: permId,
                        justificativa_medica: permJustificativaMedica,
                        documento_justificativa_id: null as any,
                        dias_adicionais_solicitados: diasAdd,
                        nova_data_retorno: novaDataProrrogacao.toISOString().split('T')[0],
                        impacto_diarias_valor: permCustoAdicional ? permCustoAdicional.valorTotal : null,
                      });
                    }
                  }
                  toast.success(
                    permEditingId ? 'Permanência atualizada!' : 'Permanência registrada!',
                    permEditingId ? 'As alterações foram salvas.' : 'O registro de permanência foi salvo.',
                  );
                  setSubmitting(false);
                  setEditingSection(null);
                  reloadSolicitacao();
                } catch (err: unknown) {
                  const e = err as { message?: string };
                  toast.error('Erro inesperado', e.message ?? 'Tente novamente.');
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? (
                <><Loader2 size={16} className="animate-spin" /> {permEditingId ? 'Salvando...' : 'Registrando...'}</>
              ) : (
                permEditingId ? 'Salvar Alterações' : 'Registrar'
              )}
            </button>
          </>
        }
      >
        <hr className="tfd-divider" />

        {/* ---- Comunicação de Permanência ---- */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          Comunicação de Permanência
        </h3>

        <FormField label="Data da comunicação" required>
          <input
            type="date"
            className="tfd-input"
            value={permDataComunicacao}
            onChange={(e) => setPermDataComunicacao(e.target.value)}
          />
        </FormField>

        <FormField label="Comunicado por" required>
          <select
            className="tfd-input"
            value={permComunicadoPor}
            onChange={(e) => setPermComunicadoPor(e.target.value)}
          >
            <option value="">Selecione...</option>
            <option value="PACIENTE">Paciente</option>
            <option value="RESPONSAVEL">Responsável</option>
            <option value="UNIDADE_DESTINO">Unidade de Destino</option>
            <option value="REGIONAL">Regional</option>
          </select>
        </FormField>

        <LookupSelect
          categoria="motivo_permanencia"
          label="Motivo"
          value={permMotivo}
          onChange={setPermMotivo}
          required
        />

        {permMotivo === 'OUTROS' && (
          <FormField label="Descrição do motivo" required>
            <textarea
              className="tfd-input"
              rows={3}
              placeholder="Descreva o motivo da permanência..."
              value={permMotivoDescricao}
              onChange={(e) => setPermMotivoDescricao(e.target.value)}
            />
          </FormField>
        )}

        <FormField label="Nova data de retorno prevista" required>
          <input
            type="date"
            className="tfd-input"
            value={permNovaDataRetorno}
            onChange={(e) => setPermNovaDataRetorno(e.target.value)}
          />
        </FormField>

        {/* ---- Cost impact calculation ---- */}
        {permCustoAdicional && (
          <div
            className="flex flex-col gap-1 px-3 py-3 rounded-lg mb-3"
            style={{ background: 'var(--tfd-warning-50, #FFFBEB)', border: '1px solid var(--tfd-warning-200, #FDE68A)' }}
          >
            <p className="text-xs font-semibold" style={{ color: 'var(--tfd-warning-700, #92400E)' }}>
              Impacto na Ajuda de Custo
            </p>
            <div className="flex items-center justify-between text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
              <span>Dias extras além do previsto:</span>
              <span className="font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                {permCustoAdicional.diasExtras} dia{permCustoAdicional.diasExtras !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
              <span>Valor da diária:</span>
              <span className="font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                R$ {permCustoAdicional.valorDiaria.toFixed(2).replace('.', ',')}
              </span>
            </div>
            <hr style={{ borderColor: 'var(--tfd-warning-200, #FDE68A)', margin: '4px 0' }} />
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold" style={{ color: 'var(--tfd-warning-700, #92400E)' }}>
                Custo adicional estimado:
              </span>
              <span className="font-bold text-base" style={{ color: 'var(--tfd-warning-700, #92400E)' }}>
                R$ {permCustoAdicional.valorTotal.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
        )}

        <hr className="tfd-divider" />

        {/* ---- Prorrogação ---- */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          Prorrogação
        </h3>

        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={permSolicitarProrrogacao}
            onChange={(e) => setPermSolicitarProrrogacao(e.target.checked)}
          />
          <span className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>
            Solicitar prorrogação?
          </span>
        </label>

        {permSolicitarProrrogacao && (
          <>
            <FormField label="Dias adicionais" required>
              <input
                type="number"
                className="tfd-input"
                min={1}
                placeholder="Ex: 5"
                value={permDiasAdicionais}
                onChange={(e) => setPermDiasAdicionais(e.target.value)}
              />
            </FormField>

            <FormField label="Justificativa médica" required>
              <textarea
                className="tfd-input"
                rows={3}
                placeholder="Justificativa médica para a prorrogação..."
                value={permJustificativaMedica}
                onChange={(e) => setPermJustificativaMedica(e.target.value)}
              />
            </FormField>

            <div className="tfd-message tfd-message--info">
              <span className="tfd-message-icon mt-0.5 shrink-0">
                <Info size={14} />
              </span>
              <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
                A prorrogação será encaminhada para a Regulação para aprovação. Processos de prorrogação não passam por parecer médico.
              </p>
            </div>
          </>
        )}
      </Drawer>
    </>
  );
}
