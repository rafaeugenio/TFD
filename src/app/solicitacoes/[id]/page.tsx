'use client';

import { use, useState, useEffect } from 'react';
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
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import StatusTag from '@/shared/components/status-tag/StatusTag';
import TimelineTFD, { type TimelineEvent } from '@/shared/components/timeline-tfd/TimelineTFD';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import { useToast } from '@/shared/components/toast/Toast';
import { buscarSolicitacao, atualizarSolicitacao, atualizarStatus } from '@/services/solicitacoes.service';
import { atualizarPaciente } from '@/services/pacientes.service';
import { uploadDocumento, excluirDocumento } from '@/services/documentos.service';
import { useLookup, useMunicipios } from '@/shared/hooks/useLookup';
import { useCompanhias } from '@/shared/hooks/useLookup';
import { useCurrentUser } from '@/shared/hooks/useCurrentUser';
import { formatCPF, formatCNS, formatCurrency, formatDate, formatDateTime, maskCPF, maskCNS, maskPhone } from '@/shared/pipes/formatters';
import type { StatusSolicitacao, TipoDocumento } from '@/core/models';
import type { TipoDocumento as TipoDocumentoDB, DecisaoParecer } from '@/lib/supabase/database.types';
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
  EM_ANALISE: { label: 'Em Análise', bg: '#FEF3C7', color: '#92400E' },
  APROVADA: { label: 'Aprovada', bg: '#DBEAFE', color: '#1D4ED8' },
  EM_PAGAMENTO: { label: 'Em Pagamento', bg: '#E0E7FF', color: '#4338CA' },
  CONCLUIDA: { label: 'Paga', bg: '#DCFCE7', color: '#15803D' },
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

function buildTimeline(sol: any): TimelineEvent[] {
  const events: TimelineEvent[] = [];

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

  const ajudaCusto = sol.ajudas_custo?.[0];
  if (ajudaCusto) {
    events.push({
      id: `ev-ac-${ajudaCusto.id}`,
      date: formatDate(ajudaCusto.data_inicio),
      title: `Ajuda de custo ${statusAjudaLabels[ajudaCusto.status]?.label?.toLowerCase() ?? ajudaCusto.status} — ${formatCurrency(ajudaCusto.valor_total)}`,
      description: ajudaCusto.observacoes ?? undefined,
      status: ajudaCusto.status === 'CONCLUIDA' ? 'success' : ajudaCusto.status === 'GLOSADA' ? 'danger' : 'info',
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

  const toast = useToast();
  const [sol, setSol] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { options: companhiasList } = useCompanhias();
  const { user: currentUser } = useCurrentUser();
  const [editingSection, setEditingSection] = useState<string | null>(null);

  /* ---- Lookups for edit forms ---- */
  const { options: municipios, loading: loadingMun } = useMunicipios();
  const { options: especialidades, loading: loadingEsp } = useLookup('especialidade');

  /* ---- Edit form states ---- */
  // Paciente
  const [edNome, setEdNome] = useState('');
  const [edCpf, setEdCpf] = useState('');
  const [edCns, setEdCns] = useState('');
  const [edDataNascimento, setEdDataNascimento] = useState('');
  const [edSexo, setEdSexo] = useState('');
  const [edTelefone, setEdTelefone] = useState('');
  const [edEmail, setEdEmail] = useState('');
  const [edMunicipio, setEdMunicipio] = useState('');

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

  const [saving, setSaving] = useState(false);

  /* ---- Reload data helper ---- */
  function reloadSolicitacao() {
    buscarSolicitacao(id).then(({ data, error }) => {
      if (!error && data) setSol(data);
    });
  }

  /* ---- Open edit helpers — populate form from current data ---- */
  function openEditPaciente() {
    const pac = sol?.pacientes;
    setEdNome(pac?.nome_completo ?? '');
    setEdCpf(maskCPF(pac?.cpf ?? ''));
    setEdCns(maskCNS(pac?.cns ?? ''));
    setEdDataNascimento(pac?.data_nascimento ?? '');
    setEdSexo(pac?.sexo ?? '');
    setEdTelefone(maskPhone(pac?.telefone_celular ?? ''));
    setEdEmail(pac?.email ?? '');
    setEdMunicipio(pac?.municipio_residencia_id ?? '');
    setEditingSection('paciente');
  }

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
    setEditingSection('parecer');
  }

  /* ---- Save handlers ---- */
  async function savePaciente() {
    const pac = sol?.pacientes;
    if (!pac?.id) return;
    setSaving(true);
    const munLabel = municipios.find((m) => m.value === edMunicipio)?.label ?? '';
    const { error } = await atualizarPaciente(pac.id, {
      nome_completo: edNome,
      cpf: edCpf.replace(/\D/g, ''),
      cns: edCns.replace(/\D/g, ''),
      data_nascimento: edDataNascimento,
      sexo: edSexo || 'OUTRO',
      telefone_celular: edTelefone.replace(/\D/g, ''),
      email: edEmail,
      municipio: munLabel,
      municipio_residencia_id: edMunicipio || undefined,
    } as any);
    setSaving(false);
    if (error) { toast.error('Erro ao salvar', (error as any).message); return; }
    toast.success('Dados do paciente atualizados!');
    setEditingSection(null);
    reloadSolicitacao();
  }

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
  const timeline = buildTimeline(sol);
  const pac = sol.pacientes;
  const acomp = sol.acompanhantes?.[0];
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
  const ajudaCusto = sol.ajudas_custo?.[0];
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
          { label: 'Solicitações', href: '/solicitacoes' },
          { label: sol.numero_processo },
        ]}
        actions={
          <div className="flex items-center gap-2">
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
          <Section title="Dados do Paciente" icon={<User size={18} />} onEdit={openEditPaciente}>
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
            <div className="space-y-3">
              <InfoRow
                label="CID-10"
                value={
                  <span>
                    <code
                      className="px-1.5 py-0.5 rounded text-xs font-semibold"
                      style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-700)', fontFamily: 'var(--tfd-font-mono)' }}
                    >
                      {sol.cid10_principal ?? '—'}
                    </code>
                    <span className="ml-2">{sol.descricao_diagnostico ?? ''}</span>
                  </span>
                }
              />
              <InfoRow label="Procedimento" value={sol.tipo_procedimento ?? '—'} />
              <div>
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--tfd-text-secondary)' }}>
                  Justificativa clínica
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
                <InfoRow label="Médico auditor" value={parecer.usuarios?.nome_completo ?? '—'} />
                <InfoRow label="Data do parecer" value={formatDateTime(parecer.created_at)} />
                <div>
                  <p className="text-sm font-medium mb-1" style={{ color: 'var(--tfd-text-secondary)' }}>
                    Observações
                  </p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--tfd-text-primary)' }}>
                    {parecer.observacoes_medicas ?? '—'}
                  </p>
                </div>
                <DocumentList docs={getDocsForSection(sol.documentos ?? [], 'parecer')} docTypeLabels={docTypeLabels} />
              </div>
            )}
          </Section>

          {/* ── Regulacao ── */}
          <Section
            title="Regulação"
            icon={<ClipboardCheck size={18} />}
            empty={!(sol.rotas_regulacao?.length)}
            onEdit={() => setEditingSection('regulacao')}
            badge={
              sol.rotas_regulacao?.[0] ? (
                <span className="tfd-tag tfd-tag--rounded tfd-tag--dot" style={{
                  backgroundColor: sol.rotas_regulacao[0].tipo_rota === 'APROVADO_DIRETO' ? '#DCFCE7' : '#DBEAFE',
                  color: sol.rotas_regulacao[0].tipo_rota === 'APROVADO_DIRETO' ? '#15803D' : '#1D4ED8',
                }}>
                  {rotaLabels[sol.rotas_regulacao[0].tipo_rota as string] ?? sol.rotas_regulacao[0].tipo_rota}
                </span>
              ) : undefined
            }
          >
            {(sol.rotas_regulacao ?? []).map((rota: any, idx: number) => (
              <div key={rota.id} className={idx > 0 ? 'mt-4 pt-4' : ''} style={idx > 0 ? { borderTop: '1px solid var(--tfd-surface-border)' } : undefined}>
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
                  {rota.justificativa && (
                    <div className="col-span-2">
                      <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Justificativa</p>
                      <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>{rota.justificativa}</p>
                    </div>
                  )}
                  {rota.lembrete && (
                    <div className="col-span-2">
                      <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Observações de retorno</p>
                      <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>{rota.lembrete}</p>
                    </div>
                  )}
                </div>

                {/* Cobranças externas vinculadas à rota */}
                {rota.cobrancas_externas?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium mb-2" style={{ color: 'var(--tfd-text-muted)' }}>Encaminhamento externo</p>
                    {rota.cobrancas_externas.map((cob: any) => (
                      <div
                        key={cob.id}
                        className="p-3 rounded-lg text-sm space-y-2"
                        style={{ backgroundColor: 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{cob.destinatario}</span>
                            <span
                              className="tfd-tag tfd-tag--rounded"
                              style={{
                                backgroundColor: cob.status_cobranca === 'RESPONDIDA' ? '#DCFCE7' : '#FEF3C7',
                                color: cob.status_cobranca === 'RESPONDIDA' ? '#15803D' : '#92400E',
                                fontSize: '0.625rem',
                              }}
                            >
                              {cob.status_cobranca === 'RESPONDIDA' ? 'Respondida' : 'Aguardando'}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          <div>
                            <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Canal de envio</p>
                            <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>{cob.canal}</p>
                          </div>
                          <div>
                            <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Data de envio</p>
                            <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>{formatDate(cob.data_envio)}</p>
                          </div>
                        </div>
                        {cob.contato_canal && (
                          <div>
                            <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Contato utilizado</p>
                            <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)', fontFamily: 'var(--tfd-font-mono)' }}>{cob.contato_canal}</p>
                          </div>
                        )}
                        {cob.conteudo_envio && (
                          <div>
                            <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Conteúdo da proposta / Resumo</p>
                            <p className="text-sm mt-0.5" style={{ color: 'var(--tfd-text-secondary)' }}>{cob.conteudo_envio}</p>
                          </div>
                        )}
                        {cob.conteudo_resposta && (
                          <div>
                            <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Resposta recebida</p>
                            <p className="text-sm mt-0.5" style={{ color: 'var(--tfd-text-secondary)' }}>{cob.conteudo_resposta}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <DocumentList docs={getDocsForSection(sol.documentos ?? [], 'regulacao')} docTypeLabels={docTypeLabels} />
          </Section>

          {/* ── Agendamento ── */}
          <Section
            title="Agendamento no Destino"
            icon={<Calendar size={18} />}
            empty={!agendamento}
            onEdit={() => setEditingSection('agendamento')}
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
          </Section>

          {/* ── Viagens ── */}
          <Section
            title="Viagens e Passagens"
            icon={<Plane size={18} />}
            empty={(sol.viagens ?? []).length === 0}
            onEdit={() => setEditingSection('viagens')}
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
            {(sol.viagens ?? []).length > 0 && (
              <div className="space-y-3">
                {(sol.viagens ?? []).map((v: any) => {
                  const sit = situacaoViagemLabels[v.situacao as SituacaoViagem] as unknown as { bg: string; text: string; label: string };
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
                        <Plane size={16} className={v.tipo === 'RETORNO' ? 'rotate-180' : ''} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-sm">
                          <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                            {v.origem_cidade ?? '—'}
                          </span>
                          <ArrowRight size={12} style={{ color: 'var(--tfd-text-muted)' }} />
                          <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                            {v.destino_cidade ?? '—'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                          <span>{formatDate(v.data_embarque_prevista)}</span>
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
            )}
          </Section>

          {/* ── Ajuda de Custo ── */}
          <Section
            title="Ajuda de Custo"
            icon={<Wallet size={18} />}
            empty={!ajudaCusto}
            onEdit={() => setEditingSection('ajuda-custo')}
            badge={
              ajudaCusto ? (
                <span
                  className="tfd-tag tfd-tag--rounded tfd-tag--dot"
                  style={{
                    backgroundColor: statusAjudaLabels[ajudaCusto.status]?.bg,
                    color: statusAjudaLabels[ajudaCusto.status]?.color,
                  }}
                >
                  {statusAjudaLabels[ajudaCusto.status]?.label}
                </span>
              ) : undefined
            }
          >
            {ajudaCusto && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg text-center" style={{ backgroundColor: 'var(--tfd-surface-50)' }}>
                    <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Dias elegíveis</p>
                    <p className="text-lg font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                      {ajudaCusto.dias_elegiveis ?? '—'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ backgroundColor: 'var(--tfd-surface-50)' }}>
                    <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Valor/dia</p>
                    <p className="text-lg font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                      {formatCurrency(ajudaCusto.valor_diaria ?? 0)}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ backgroundColor: 'var(--tfd-surface-50)' }}>
                    <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Tipo</p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                      {ajudaCusto.tipo === 'PACIENTE' ? 'Paciente' : 'Acompanhante'}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg text-center" style={{ backgroundColor: 'var(--tfd-primary-50)' }}>
                    <p className="text-xs" style={{ color: 'var(--tfd-primary-600)' }}>Total</p>
                    <p className="text-lg font-bold" style={{ color: 'var(--tfd-primary-700)' }}>
                      {formatCurrency(ajudaCusto.valor_total ?? 0)}
                    </p>
                  </div>
                </div>
                <InfoRow label="Período" value={`${formatDate(ajudaCusto.data_inicio)} — ${formatDate(ajudaCusto.data_fim)}`} />
                {ajudaCusto.observacoes && (
                  <InfoRow label="Observações" value={ajudaCusto.observacoes} />
                )}
                <DocumentList docs={getDocsForSection(sol.documentos ?? [], 'ajudaCusto')} docTypeLabels={docTypeLabels} />
              </div>
            )}
          </Section>

          {/* ── Permanencia ── */}
          <Section
            title="Permanência e Prorrogações"
            icon={<CalendarClock size={18} />}
            empty={!perm}
            onEdit={() => setEditingSection('permanencia')}
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
              {(sol.viagens ?? []).length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>Passagens</span>
                  <span className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                    {(sol.viagens ?? []).length}
                  </span>
                </div>
              )}
              {ajudaCusto && (
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>Diarias</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--tfd-primary-700)' }}>
                    {formatCurrency(ajudaCusto.valor_total ?? 0)}
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

      {/* ── Paciente ── */}
      <Drawer
        open={editingSection === 'paciente'}
        onClose={() => setEditingSection(null)}
        title="Editar Dados do Paciente"
        subtitle={pac?.nome_completo ?? ''}
        width="520px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={() => setEditingSection(null)}>Cancelar</button>
            <button className="tfd-btn tfd-btn-primary" onClick={savePaciente} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </>
        }
      >
        <FormField label="Nome completo" required>
          <input type="text" className="tfd-input" value={edNome} onChange={(e) => setEdNome(e.target.value)} />
        </FormField>
        <FormField label="CPF" required>
          <input type="text" className="tfd-input" placeholder="000.000.000-00" value={edCpf} onChange={(e) => setEdCpf(maskCPF(e.target.value))} />
        </FormField>
        <FormField label="Cartão SUS (CNS)">
          <input type="text" className="tfd-input" placeholder="000 0000 0000 0000" value={edCns} onChange={(e) => setEdCns(maskCNS(e.target.value))} />
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Data de Nascimento" required>
            <input type="date" className="tfd-input" value={edDataNascimento} onChange={(e) => setEdDataNascimento(e.target.value)} />
          </FormField>
          <FormField label="Sexo" required>
            <select className="tfd-input" value={edSexo} onChange={(e) => setEdSexo(e.target.value)}>
              <option value="">Selecione...</option>
              <option value="MASCULINO">Masculino</option>
              <option value="FEMININO">Feminino</option>
              <option value="OUTRO">Outro</option>
            </select>
          </FormField>
        </div>
        <FormField label="Telefone celular">
          <input type="tel" className="tfd-input" placeholder="(99) 99999-0000" value={edTelefone} onChange={(e) => setEdTelefone(maskPhone(e.target.value))} />
        </FormField>
        <FormField label="E-mail">
          <input type="email" className="tfd-input" value={edEmail} onChange={(e) => setEdEmail(e.target.value)} />
        </FormField>
        <FormField label="Município">
          <select className="tfd-input" value={edMunicipio} onChange={(e) => setEdMunicipio(e.target.value)} disabled={loadingMun}>
            <option value="">{loadingMun ? 'Carregando...' : 'Selecione...'}</option>
            {municipios.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </FormField>
      </Drawer>

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
        <FormField label="Especialidade">
          <select className="tfd-input" value={edEspecialidade} onChange={(e) => setEdEspecialidade(e.target.value)} disabled={loadingEsp}>
            <option value="">{loadingEsp ? 'Carregando...' : 'Selecione...'}</option>
            {especialidades.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Procedimento solicitado" required>
          <input type="text" className="tfd-input" value={edProcedimento} onChange={(e) => setEdProcedimento(e.target.value)} />
        </FormField>
        <FormField label="Justificativa TFD" required>
          <textarea className="tfd-input" rows={3} placeholder="Por que o tratamento não pode ser realizado no MA?" value={edJustificativa} onChange={(e) => setEdJustificativa(e.target.value)} />
        </FormField>
      </Drawer>

      {/* ── Parecer Médico ── */}
      <Drawer
        open={editingSection === 'parecer'}
        onClose={() => setEditingSection(null)}
        title="Parecer Médico"
        subtitle="Registre a decisão do auditor sobre esta solicitação"
        width="520px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={() => setEditingSection(null)}>Cancelar</button>
            <button className="tfd-btn tfd-btn-primary" disabled={saving} onClick={async () => {
              if (!edParecerDecisao) { toast.error('Decisão obrigatória', 'Selecione Deferido, Indeferido ou Exigência.'); return; }
              setSaving(true);
              const supabase = (await import('@/lib/supabase/client')).createClient();
              const existing = sol?.pareceres?.[0];
              const parecerData = { decisao: edParecerDecisao as DecisaoParecer, observacoes_medicas: edParecerObs || null, medico_auditor_id: currentUser?.id ?? null };
              const result = existing
                ? await supabase.from('pareceres').update({ ...parecerData } as any).eq('id', existing.id).select().single()
                : await supabase.from('pareceres').insert({ ...parecerData, solicitacao_id: id } as any).select().single();
              if (result.error) { setSaving(false); toast.error('Erro ao salvar', (result.error as any).message); return; }

              // Auto-transition: parecer controls the flow
              // DEFERIDO → goes to regulation automatically
              // INDEFERIDO → back to solicitações team (EXIGENCIA status for review/closure)
              // EXIGENCIA → back to solicitações team for adjustments
              let novoStatus: string | null = null;
              let statusMsg = '';
              if (edParecerDecisao === 'DEFERIDO') {
                novoStatus = 'AGUARDANDO_REGULACAO';
                statusMsg = 'Processo encaminhado para regulação.';
              } else if (edParecerDecisao === 'INDEFERIDO') {
                novoStatus = 'INDEFERIDO';
                statusMsg = 'Processo indeferido — retornado ao setor de solicitações.';
              } else if (edParecerDecisao === 'EXIGENCIA') {
                novoStatus = 'EXIGENCIA';
                statusMsg = 'Exigência registrada — processo retornado para ajustes.';
              }

              if (novoStatus) {
                await atualizarStatus(id, novoStatus as any);
              }

              setSaving(false);
              toast.success('Parecer salvo!', statusMsg);
              setEditingSection(null);
              reloadSolicitacao();
            }}>
              {saving ? 'Salvando...' : 'Salvar Parecer'}
            </button>
          </>
        }
      >
        <FormField label="Decisão" required>
          <select className="tfd-input" value={edParecerDecisao} onChange={(e) => setEdParecerDecisao(e.target.value)}>
            <option value="">Selecione...</option>
            <option value="DEFERIDO">Deferido</option>
            <option value="INDEFERIDO">Indeferido</option>
            <option value="EXIGENCIA">Exigência</option>
          </select>
        </FormField>
        <FormField label="Observações médicas">
          <textarea className="tfd-input" rows={4} placeholder="Justificativa do parecer..." value={edParecerObs} onChange={(e) => setEdParecerObs(e.target.value)} />
        </FormField>
      </Drawer>

      {/* ── Seções sem edição direta (redirecionam para telas dedicadas) ── */}
      <Drawer
        open={editingSection === 'regulacao'}
        onClose={() => setEditingSection(null)}
        title="Regulação"
        width="460px"
        footer={<button className="tfd-btn tfd-btn-secondary" onClick={() => setEditingSection(null)}>Fechar</button>}
      >
        <div className="tfd-message tfd-message--info">
          <span className="tfd-message-icon mt-0.5 shrink-0"><Info size={16} /></span>
          <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>A regulação é gerenciada na tela dedicada de Regulação. Use o menu lateral para acessá-la.</p>
        </div>
      </Drawer>

      <Drawer
        open={editingSection === 'agendamento'}
        onClose={() => setEditingSection(null)}
        title="Agendamento"
        width="460px"
        footer={<button className="tfd-btn tfd-btn-secondary" onClick={() => setEditingSection(null)}>Fechar</button>}
      >
        <div className="tfd-message tfd-message--info">
          <span className="tfd-message-icon mt-0.5 shrink-0"><Info size={16} /></span>
          <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>Os agendamentos são gerenciados na tela de Atendimento no Destino. Use o menu lateral para acessá-la.</p>
        </div>
      </Drawer>

      <Drawer
        open={editingSection === 'viagens'}
        onClose={() => setEditingSection(null)}
        title="Viagens e Passagens"
        width="460px"
        footer={<button className="tfd-btn tfd-btn-secondary" onClick={() => setEditingSection(null)}>Fechar</button>}
      >
        <div className="tfd-message tfd-message--info">
          <span className="tfd-message-icon mt-0.5 shrink-0"><Info size={16} /></span>
          <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>As passagens são gerenciadas na tela de Viagens e Passagens. Use o menu lateral para acessá-la.</p>
        </div>
      </Drawer>

      <Drawer
        open={editingSection === 'ajuda-custo'}
        onClose={() => setEditingSection(null)}
        title="Ajuda de Custo"
        width="460px"
        footer={<button className="tfd-btn tfd-btn-secondary" onClick={() => setEditingSection(null)}>Fechar</button>}
      >
        <div className="tfd-message tfd-message--info">
          <span className="tfd-message-icon mt-0.5 shrink-0"><Info size={16} /></span>
          <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>A ajuda de custo é gerenciada na tela dedicada. Use o menu lateral para acessá-la.</p>
        </div>
      </Drawer>

      <Drawer
        open={editingSection === 'permanencia'}
        onClose={() => setEditingSection(null)}
        title="Permanência"
        width="460px"
        footer={<button className="tfd-btn tfd-btn-secondary" onClick={() => setEditingSection(null)}>Fechar</button>}
      >
        <div className="tfd-message tfd-message--info">
          <span className="tfd-message-icon mt-0.5 shrink-0"><Info size={16} /></span>
          <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>A permanência é gerenciada na tela dedicada. Use o menu lateral para acessá-la.</p>
        </div>
      </Drawer>
    </>
  );
}
