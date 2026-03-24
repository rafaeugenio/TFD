'use client';

import { use, useMemo } from 'react';
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
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import StatusTag from '@/shared/components/status-tag/StatusTag';
import TimelineTFD, { type TimelineEvent } from '@/shared/components/timeline-tfd/TimelineTFD';
import { MOCK_SOLICITACOES } from '@/core/mocks/solicitacoes.mock';
import { formatCPF, formatCNS, formatCurrency, formatDate, formatDateTime } from '@/shared/pipes/formatters';
import type { SolicitacaoTFD, StatusSolicitacao, TipoDocumento } from '@/core/models';
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

function getActiveStepIndex(sol: SolicitacaoTFD): number {
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
  LAUDO_MEDICO: 'Laudo Médico',
  EXAME: 'Exame',
  DOCUMENTO_PESSOAL: 'Doc. Pessoal',
  COMPROVANTE_RESIDENCIA: 'Comp. Residência',
  CARTAO_SUS: 'Cartão SUS',
  ENCAMINHAMENTO: 'Encaminhamento',
  OUTROS: 'Outros',
};

const rotaLabels: Record<TipoRota, string> = {
  CNRAC: 'CNRAC',
  SETI: 'SETI',
  SAAS_DUTRA: 'SAAS / Hospital Dutra',
  SERVICO_SOCIAL: 'Serviço Social',
  APROVADO_DIRETO: 'Aprovação Direta',
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
  NO_SHOW: { bg: '#FEE2E2', text: '#B91C1C', label: 'NO-SHOW' } as never,
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
  PENDENTE: { label: 'Pendente', bg: '#FEF3C7', color: '#92400E' },
  APROVADO: { label: 'Aprovada', bg: '#DBEAFE', color: '#1D4ED8' },
  PAGO: { label: 'Paga', bg: '#DCFCE7', color: '#15803D' },
  CANCELADO: { label: 'Cancelada', bg: 'var(--tfd-surface-100)', color: 'var(--tfd-surface-500)' },
};

/* -------------------------------------------------- */
/*  Section Component                                  */
/* -------------------------------------------------- */

function Section({
  title,
  icon,
  children,
  badge,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  badge?: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="tfd-card">
      <div className="flex items-center gap-2 mb-4">
        <span style={{ color: 'var(--tfd-primary-500)' }}>{icon}</span>
        <h2 className="text-base font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
          {title}
        </h2>
        {badge}
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
/*  Build timeline from process data                   */
/* -------------------------------------------------- */

function buildTimeline(sol: SolicitacaoTFD): TimelineEvent[] {
  const events: TimelineEvent[] = [];

  events.push({
    id: 'ev-criacao',
    date: formatDate(sol.dataCriacao),
    title: 'Solicitação criada',
    description: `Processo ${sol.numero} aberto`,
    status: 'info',
    user: sol.criadoPor,
  });

  if (sol.parecer) {
    const p = sol.parecer;
    const statusMap: Record<string, TimelineEvent['status']> = {
      DEFERIDO: 'success',
      INDEFERIDO: 'danger',
      EXIGENCIA: 'warning',
    };
    events.push({
      id: `ev-parecer-${p.id}`,
      date: formatDate(p.dataParecer),
      title: `Parecer médico: ${parecerLabels[p.status].label}`,
      description: p.observacoes,
      status: statusMap[p.status] ?? 'neutral',
      user: p.medicoNome,
    });
  }

  if (sol.regulacao) {
    const r = sol.regulacao;
    events.push({
      id: `ev-regulacao-${r.id}`,
      date: formatDate(r.dataEncaminhamento),
      title: `Encaminhado para regulação — ${rotaLabels[r.tipoRota]}`,
      description: r.observacoes ?? undefined,
      status: 'info',
      user: r.responsavel,
    });
    if (r.dataResposta) {
      events.push({
        id: `ev-regulacao-resp-${r.id}`,
        date: formatDate(r.dataResposta),
        title: 'Resposta da regulação recebida',
        description: r.observacoes ?? undefined,
        status: 'success',
      });
    }
    for (const cob of r.cobrancasExternas) {
      if (cob.respondido && cob.dataResposta) {
        events.push({
          id: `ev-cob-${cob.id}`,
          date: formatDate(cob.dataResposta),
          title: `Cobrança externa respondida — ${cob.destinatario}`,
          description: cob.observacoes ?? undefined,
          status: 'success',
        });
      }
    }
  }

  if (sol.agendamento) {
    const a = sol.agendamento;
    events.push({
      id: `ev-agd-${a.id}`,
      date: formatDate(a.dataAgendamento),
      title: `Agendamento confirmado — ${a.unidadeDestino}`,
      description: a.observacoes ?? undefined,
      status: a.confirmado ? 'success' : 'warning',
    });
  }

  for (const v of sol.viagens) {
    if (v.situacao === 'EMITIDA' || v.situacao === 'UTILIZADA') {
      events.push({
        id: `ev-viag-emitida-${v.id}`,
        date: formatDate(v.dataEmbarquePrevista),
        title: `Passagem ${v.tipo.toLowerCase()} emitida — ${v.origem} → ${v.destino}`,
        description: v.localizador ? `Localizador: ${v.localizador}` : undefined,
        status: 'info',
      });
    }
    if (v.situacao === 'UTILIZADA' && v.dataEmbarqueReal) {
      events.push({
        id: `ev-viag-embarque-${v.id}`,
        date: formatDate(v.dataEmbarqueReal),
        title: `Embarque confirmado — ${v.tipo.toLowerCase()}`,
        status: 'success',
      });
    }
    if (v.situacao === 'NO_SHOW') {
      events.push({
        id: `ev-viag-noshow-${v.id}`,
        date: formatDate(v.dataEmbarquePrevista),
        title: `NO-SHOW — paciente não compareceu`,
        description: v.observacoes ?? undefined,
        status: 'danger',
      });
    }
  }

  if (sol.ajudaDeCusto) {
    const ac = sol.ajudaDeCusto;
    events.push({
      id: `ev-ac-${ac.id}`,
      date: formatDate(ac.dataInicio),
      title: `Ajuda de custo ${statusAjudaLabels[ac.status]?.label?.toLowerCase() ?? ac.status} — ${formatCurrency(ac.valorTotal)}`,
      description: ac.observacoes ?? undefined,
      status: ac.status === 'PAGO' ? 'success' : ac.status === 'CANCELADO' ? 'danger' : 'info',
    });
  }

  if (sol.permanencia) {
    const perm = sol.permanencia;
    events.push({
      id: `ev-perm-${perm.id}`,
      date: formatDate(perm.dataInicio),
      title: 'Início da permanência',
      status: 'info',
    });
    for (const pror of perm.prorrogacoes) {
      events.push({
        id: `ev-pror-${pror.id}`,
        date: formatDate(pror.dataInicio),
        title: 'Prorrogação aprovada',
        description: pror.justificativa,
        status: 'warning',
        user: pror.aprovadoPor,
      });
    }
    if (perm.motivoAlta && perm.dataFimReal) {
      events.push({
        id: `ev-alta-${perm.id}`,
        date: formatDate(perm.dataFimReal),
        title: `Encerramento — ${motivoAltaLabels[perm.motivoAlta]}`,
        description: perm.observacoes ?? undefined,
        status: perm.motivoAlta === 'ALTA_MEDICA' ? 'success' : 'danger',
      });
    }
  }

  if (sol.status === 'CONCLUIDO') {
    events.push({
      id: 'ev-concluido',
      date: formatDate(sol.dataAtualizacao),
      title: 'Processo concluído',
      status: 'success',
    });
  }

  if (sol.status === 'CANCELADO') {
    events.push({
      id: 'ev-cancelado',
      date: formatDate(sol.dataAtualizacao),
      title: 'Processo cancelado',
      description: sol.observacoes ?? undefined,
      status: 'danger',
    });
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
  const sol = MOCK_SOLICITACOES.find((s) => s.id === id);

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
  const timeline = buildTimeline(sol);
  const pac = sol.paciente;
  const isFinal = ['CONCLUIDO', 'INDEFERIDO', 'CANCELADO'].includes(sol.status);

  return (
    <>
      {/* ====== Header ====== */}
      <PageHeader
        title={sol.numero}
        subtitle={`${pac.nome} — ${pac.municipioOrigem}/${pac.ufOrigem}`}
        breadcrumbs={[
          { label: 'Solicitações', href: '/solicitacoes' },
          { label: sol.numero },
        ]}
        actions={
          <StatusTag status={sol.status} />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow label="Nome completo" value={pac.nome} />
              <InfoRow label="CPF" value={formatCPF(pac.cpf)} mono />
              <InfoRow label="CNS" value={formatCNS(pac.cns)} mono />
              <InfoRow label="Data Nascimento" value={formatDate(pac.dataNascimento)} />
              <InfoRow label="Sexo" value={pac.sexo === 'M' ? 'Masculino' : 'Feminino'} />
              <InfoRow label="Telefone" value={pac.telefone} />
              {pac.email && <InfoRow label="E-mail" value={pac.email} />}
              <InfoRow label="Município" value={`${pac.municipioOrigem} / ${pac.ufOrigem}`} />
              {pac.prontuario && <InfoRow label="Prontuário" value={pac.prontuario} mono />}
              <InfoRow
                label="Endereço"
                value={`${pac.endereco.logradouro}, ${pac.endereco.numero}${pac.endereco.complemento ? ` — ${pac.endereco.complemento}` : ''}, ${pac.endereco.bairro}, ${pac.endereco.cidade}/${pac.endereco.uf}`}
              />
            </div>

            {/* Acompanhante */}
            {sol.acompanhante && (
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
                  <InfoRow label="Nome" value={sol.acompanhante.nome} />
                  <InfoRow label="CPF" value={formatCPF(sol.acompanhante.cpf)} mono />
                  <InfoRow label="Parentesco" value={sol.acompanhante.parentesco} />
                  <InfoRow label="Telefone" value={sol.acompanhante.telefone} />
                  {sol.acompanhante.justificativa && (
                    <div className="sm:col-span-2">
                      <InfoRow label="Justificativa" value={sol.acompanhante.justificativa} />
                    </div>
                  )}
                </div>
              </div>
            )}
          </Section>

          {/* ── Diagnostico Clinico ── */}
          <Section title="Diagnóstico Clínico" icon={<Stethoscope size={18} />}>
            <div className="space-y-3">
              <InfoRow
                label="CID-10"
                value={
                  <span>
                    <code
                      className="px-1.5 py-0.5 rounded text-xs font-semibold"
                      style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-700)', fontFamily: 'var(--tfd-font-mono)' }}
                    >
                      {sol.diagnostico.cid}
                    </code>
                    <span className="ml-2">{sol.diagnostico.descricao}</span>
                  </span>
                }
              />
              <InfoRow label="Especialidade" value={sol.diagnostico.especialidade} />
              <InfoRow label="Procedimento" value={sol.diagnostico.procedimentoSolicitado} />
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--tfd-text-secondary)' }}>
                  Justificativa clínica
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--tfd-text-primary)' }}>
                  {sol.diagnostico.justificativa}
                </p>
              </div>
            </div>
          </Section>

          {/* ── Parecer Medico ── */}
          <Section
            title="Parecer Médico"
            icon={<ShieldCheck size={18} />}
            empty={!sol.parecer}
            badge={
              sol.parecer ? (
                <span
                  className="tfd-tag tfd-tag--rounded tfd-tag--dot"
                  style={{
                    backgroundColor: parecerLabels[sol.parecer.status].bg,
                    color: parecerLabels[sol.parecer.status].color,
                  }}
                >
                  {parecerLabels[sol.parecer.status].label}
                </span>
              ) : undefined
            }
          >
            {sol.parecer && (
              <div className="space-y-3">
                <InfoRow label="Médico auditor" value={sol.parecer.medicoNome} />
                <InfoRow label="Data do parecer" value={formatDate(sol.parecer.dataParecer)} />
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--tfd-text-secondary)' }}>
                    Observações
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--tfd-text-primary)' }}>
                    {sol.parecer.observacoes}
                  </p>
                </div>
              </div>
            )}
          </Section>

          {/* ── Regulacao ── */}
          <Section
            title="Regulação"
            icon={<ClipboardCheck size={18} />}
            empty={!sol.regulacao}
            badge={
              sol.regulacao ? (
                <span
                  className="tfd-tag tfd-tag--rounded"
                  style={{ backgroundColor: '#CFFAFE', color: '#0E7490' }}
                >
                  {rotaLabels[sol.regulacao.tipoRota]}
                </span>
              ) : undefined
            }
          >
            {sol.regulacao && (
              <div className="space-y-3">
                <InfoRow label="Tipo de rota" value={rotaLabels[sol.regulacao.tipoRota]} />
                <InfoRow label="Responsável" value={sol.regulacao.responsavel ?? '—'} />
                <InfoRow label="Data encaminhamento" value={formatDate(sol.regulacao.dataEncaminhamento)} />
                {sol.regulacao.dataResposta && (
                  <InfoRow label="Data resposta" value={formatDate(sol.regulacao.dataResposta)} />
                )}
                {sol.regulacao.observacoes && (
                  <InfoRow label="Observações" value={sol.regulacao.observacoes} />
                )}

                {/* Cobranças externas */}
                {sol.regulacao.cobrancasExternas.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium mb-2" style={{ color: 'var(--tfd-text-secondary)' }}>
                      Cobranças Externas
                    </p>
                    <div className="space-y-2">
                      {sol.regulacao.cobrancasExternas.map((cob) => (
                        <div
                          key={cob.id}
                          className="flex items-center gap-3 p-2.5 rounded-lg"
                          style={{ backgroundColor: 'var(--tfd-surface-50)' }}
                        >
                          {cob.respondido ? (
                            <CheckCircle2 size={16} style={{ color: 'var(--tfd-status-success)' }} />
                          ) : (
                            <Clock size={16} style={{ color: 'var(--tfd-status-warning)' }} />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                              {cob.destinatario}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                              Enviado: {formatDate(cob.dataEnvio)}
                              {cob.dataResposta && ` — Resposta: ${formatDate(cob.dataResposta)}`}
                            </p>
                          </div>
                          <span
                            className="tfd-tag tfd-tag--rounded tfd-tag--dot"
                            style={{
                              backgroundColor: cob.respondido ? '#DCFCE7' : '#FEF3C7',
                              color: cob.respondido ? '#15803D' : '#92400E',
                            }}
                          >
                            {cob.respondido ? 'Respondida' : 'Pendente'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* ── Agendamento ── */}
          <Section
            title="Agendamento no Destino"
            icon={<Calendar size={18} />}
            empty={!sol.agendamento}
            badge={
              sol.agendamento?.confirmado ? (
                <span className="tfd-tag tfd-tag--rounded tfd-tag--dot tfd-tag--success">
                  Confirmado
                </span>
              ) : undefined
            }
          >
            {sol.agendamento && (
              <div className="space-y-3">
                <InfoRow label="Unidade destino" value={sol.agendamento.unidadeDestino} />
                {sol.agendamento.medicoDestino && (
                  <InfoRow label="Médico destino" value={sol.agendamento.medicoDestino} />
                )}
                <InfoRow
                  label="Data / Hora"
                  value={`${formatDate(sol.agendamento.dataAgendamento)}${sol.agendamento.horaAgendamento ? ` as ${sol.agendamento.horaAgendamento}` : ''}`}
                />
                {sol.agendamento.observacoes && (
                  <InfoRow label="Observações" value={sol.agendamento.observacoes} />
                )}
              </div>
            )}
          </Section>

          {/* ── Viagens ── */}
          <Section
            title="Viagens e Passagens"
            icon={<Plane size={18} />}
            empty={sol.viagens.length === 0}
            badge={
              sol.viagens.length > 0 ? (
                <span
                  className="tfd-badge tfd-badge--secondary"
                >
                  {sol.viagens.length}
                </span>
              ) : undefined
            }
          >
            {sol.viagens.length > 0 && (
              <div className="space-y-3">
                {sol.viagens.map((v) => {
                  const sit = situacaoViagemLabels[v.situacao] as unknown as { bg: string; text: string; label: string };
                  return (
                    <div
                      key={v.id}
                      className="flex items-center gap-4 p-3 rounded-lg"
                      style={{ backgroundColor: 'var(--tfd-surface-50)' }}
                    >
                      <div
                        className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                        style={{
                          backgroundColor: v.tipo === 'IDA' ? '#DBEAFE' : '#F5F3FF',
                          color: v.tipo === 'IDA' ? '#1D4ED8' : '#7C3AED',
                        }}
                      >
                        <Plane size={16} className={v.tipo === 'VOLTA' ? 'rotate-180' : ''} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-sm">
                          <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                            {v.origem}
                          </span>
                          <ArrowRight size={12} style={{ color: 'var(--tfd-text-muted)' }} />
                          <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                            {v.destino}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                          <span>{formatDate(v.dataEmbarquePrevista)}</span>
                          {v.companhiaTransporte && <span>{v.companhiaTransporte}</span>}
                          {v.localizador && (
                            <code style={{ fontFamily: 'var(--tfd-font-mono)', color: 'var(--tfd-text-secondary)' }}>
                              {v.localizador}
                            </code>
                          )}
                          {v.valorPassagem != null && v.valorPassagem > 0 && (
                            <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                              {formatCurrency(v.valorPassagem)}
                            </span>
                          )}
                        </div>
                      </div>
                      <span
                        className="tfd-tag tfd-tag--rounded tfd-tag--dot shrink-0"
                        style={{ backgroundColor: sit.bg, color: sit.text }}
                      >
                        {sit.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>

          {/* ── Ajuda de Custo ── */}
          <Section
            title="Ajuda de Custo"
            icon={<Wallet size={18} />}
            empty={!sol.ajudaDeCusto}
            badge={
              sol.ajudaDeCusto ? (
                <span
                  className="tfd-tag tfd-tag--rounded tfd-tag--dot"
                  style={{
                    backgroundColor: statusAjudaLabels[sol.ajudaDeCusto.status]?.bg,
                    color: statusAjudaLabels[sol.ajudaDeCusto.status]?.color,
                  }}
                >
                  {statusAjudaLabels[sol.ajudaDeCusto.status]?.label}
                </span>
              ) : undefined
            }
          >
            {sol.ajudaDeCusto && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg text-center" style={{ backgroundColor: 'var(--tfd-surface-50)' }}>
                    <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Dias</p>
                    <p className="text-lg font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                      {sol.ajudaDeCusto.diasCompletos}
                      {sol.ajudaDeCusto.diaRetorno && <span className="text-xs font-normal ml-0.5" style={{ color: 'var(--tfd-text-muted)' }}>+1r</span>}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ backgroundColor: 'var(--tfd-surface-50)' }}>
                    <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Valor/dia</p>
                    <p className="text-lg font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                      {formatCurrency(sol.ajudaDeCusto.valorDiariaCompleta)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ backgroundColor: 'var(--tfd-surface-50)' }}>
                    <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Dia retorno</p>
                    <p className="text-lg font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                      {formatCurrency(sol.ajudaDeCusto.valorDiariaRetorno)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ backgroundColor: 'var(--tfd-primary-50)' }}>
                    <p className="text-xs" style={{ color: 'var(--tfd-primary-600)' }}>Total</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--tfd-primary-700)' }}>
                      {formatCurrency(sol.ajudaDeCusto.valorTotal)}
                    </p>
                  </div>
                </div>
                <InfoRow label="Período" value={`${formatDate(sol.ajudaDeCusto.dataInicio)} — ${formatDate(sol.ajudaDeCusto.dataFim)}`} />
                {sol.ajudaDeCusto.observacoes && (
                  <InfoRow label="Observações" value={sol.ajudaDeCusto.observacoes} />
                )}
              </div>
            )}
          </Section>

          {/* ── Permanencia ── */}
          <Section
            title="Permanência e Prorrogações"
            icon={<CalendarClock size={18} />}
            empty={!sol.permanencia}
            badge={
              sol.permanencia && sol.permanencia.prorrogacoes.length > 0 ? (
                <span className="tfd-tag tfd-tag--rounded" style={{ backgroundColor: '#FFEDD5', color: '#C2410C' }}>
                  <RefreshCw size={10} />
                  {sol.permanencia.prorrogacoes.length} prorrog.
                </span>
              ) : undefined
            }
          >
            {sol.permanencia && (
              <div className="space-y-3">
                <InfoRow label="Data início" value={formatDate(sol.permanencia.dataInicio)} />
                <InfoRow label="Previsão fim" value={formatDate(sol.permanencia.dataFimPrevista)} />
                {sol.permanencia.dataFimReal && (
                  <InfoRow label="Data fim real" value={formatDate(sol.permanencia.dataFimReal)} />
                )}
                {sol.permanencia.motivoAlta && (
                  <InfoRow
                    label="Motivo encerramento"
                    value={motivoAltaLabels[sol.permanencia.motivoAlta]}
                  />
                )}
                {sol.permanencia.observacoes && (
                  <InfoRow label="Observações" value={sol.permanencia.observacoes} />
                )}

                {sol.permanencia.prorrogacoes.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium mb-2" style={{ color: 'var(--tfd-text-secondary)' }}>
                      Prorrogações
                    </p>
                    <div className="space-y-2">
                      {sol.permanencia.prorrogacoes.map((pror, idx) => (
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
                              {formatDate(pror.dataInicio)} — {formatDate(pror.dataFim)}
                            </p>
                            <p className="text-sm mt-0.5" style={{ color: 'var(--tfd-text-secondary)' }}>
                              {pror.justificativa}
                            </p>
                            {pror.aprovadoPor && (
                              <p className="text-xs mt-1" style={{ color: 'var(--tfd-text-muted)' }}>
                                Aprovado por {pror.aprovadoPor}
                                {pror.dataAprovacao && ` em ${formatDate(pror.dataAprovacao)}`}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Section>

          {/* ── Documentos ── */}
          <Section
            title="Documentos"
            icon={<FileText size={18} />}
            badge={
              <span className="tfd-badge tfd-badge--secondary">
                {sol.documentos.length}
              </span>
            }
          >
            <div className="space-y-2">
              {sol.documentos.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[var(--tfd-surface-hover)]"
                  style={{ transition: 'background-color 0.15s' }}
                >
                  <div
                    className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                    style={{ backgroundColor: 'var(--tfd-surface-100)', color: 'var(--tfd-text-secondary)' }}
                  >
                    <FileText size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--tfd-text-primary)' }}>
                      {doc.nome}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                      {docTypeLabels[doc.tipo]} — {formatDate(doc.dataUpload)}
                    </p>
                  </div>
                  <button
                    className="tfd-btn tfd-btn--text tfd-btn-primary tfd-btn--sm tfd-btn--icon-only shrink-0"
                    title="Baixar documento"
                  >
                    <Download size={14} />
                  </button>
                </div>
              ))}
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
                  {formatDate(sol.dataCriacao)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>Atualizado</span>
                <span className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                  {formatDate(sol.dataAtualizacao)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>CID</span>
                <code
                  className="text-xs px-1.5 py-0.5 rounded font-semibold"
                  style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-700)', fontFamily: 'var(--tfd-font-mono)' }}
                >
                  {sol.diagnostico.cid}
                </code>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>Especialidade</span>
                <span className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>
                  {sol.diagnostico.especialidade}
                </span>
              </div>
              {sol.viagens.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>Passagens</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                    {sol.viagens.length}
                  </span>
                </div>
              )}
              {sol.ajudaDeCusto && (
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>Diarias</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--tfd-primary-700)' }}>
                    {formatCurrency(sol.ajudaDeCusto.valorTotal)}
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
    </>
  );
}
