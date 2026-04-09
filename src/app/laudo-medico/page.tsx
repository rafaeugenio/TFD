'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FileHeart,
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCircle2,
  Circle,
  ArrowLeft,
  Save,
  FileDown,
  AlertTriangle,
  ClipboardList,
  FileEdit,
  Loader2,
  Calendar,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import StatusTag from '@/shared/components/status-tag/StatusTag';
import FormField from '@/shared/components/drawer/FormField';
import { useToast } from '@/shared/components/toast/Toast';
import { listarSolicitacoes, contarPorStatus } from '@/services/solicitacoes.service';
import { useSupabaseData } from '@/shared/hooks/useSupabaseData';
import { formatCPF, maskCPF, maskPhone } from '@/shared/pipes/formatters';
import SortableHeader from '@/shared/components/table/SortableHeader';
import { useTableControls } from '@/shared/hooks/useTableControls';

/* ── TODO AGENTE-4: Descomentar quando Agentes 1 e 2 concluírem ──
import UnidadeSaudeSelect from '@/shared/components/unidade-saude-select/UnidadeSaudeSelect';
import MedicoSelect from '@/shared/components/medico-select/MedicoSelect';
── UnidadeSaudeSelect substitui o input de texto de "Unidade de Saúde Solicitante SUS".
── MedicoSelect pode preencher automaticamente CPF e telefone do médico. ── */

import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

import type {
  SecoesClinicas,
  StatusLaudo,
  RiscoCirurgicoASA,
  TransporteRecomendado,
  ExameComplementarLaudo,
  CaraterAtendimento,
} from '@/core/models/laudo-medico.model';
import { SECOES_CLINICAS_INITIAL } from '@/core/models/laudo-medico.model';

/* ================================================== */
/*  Helpers                                           */
/* ================================================== */

function formatDate(iso: string): string {
  if (!iso) return '\u2014';
  const datePart = iso.includes('T') ? iso.split('T')[0] : iso;
  const [year, month, day] = datePart.split('-');
  return `${day}/${month}/${year}`;
}

function timeSince(iso: string): string {
  if (!iso) return '\u2014';
  const diff = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'Agora';
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

/* ── Status Laudo tag ────────────────────────────── */

const STATUS_LAUDO_STYLES: Record<StatusLaudo, { bg: string; text: string; label: string }> = {
  VAZIO: { bg: 'var(--tfd-surface-100)', text: 'var(--tfd-surface-600)', label: 'Sem laudo' },
  RASCUNHO: { bg: '#FEF3C7', text: '#92400E', label: 'Rascunho' },
  CONCLUIDO: { bg: '#DCFCE7', text: '#15803D', label: 'Conclu\u00eddo' },
};

function StatusLaudoTag({ status }: { status: StatusLaudo }) {
  const s = STATUS_LAUDO_STYLES[status];
  return (
    <span
      className="tfd-tag tfd-tag--rounded"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  );
}

/* ── Section indicator (green check vs gray circle) ── */

function SectionIndicator({ filled }: { filled: boolean }) {
  if (filled) {
    return <CheckCircle2 size={16} style={{ color: 'var(--tfd-status-success)', flexShrink: 0 }} />;
  }
  return <Circle size={16} style={{ color: 'var(--tfd-text-muted)', flexShrink: 0 }} />;
}

/* ── ASA labels ──────────────────────────────────── */

const ASA_OPTIONS: { value: RiscoCirurgicoASA; label: string }[] = [
  { value: 'ASA_1', label: 'ASA 1 \u2014 Paciente saud\u00e1vel' },
  { value: 'ASA_2', label: 'ASA 2 \u2014 Doen\u00e7a sist\u00eamica leve' },
  { value: 'ASA_3', label: 'ASA 3 \u2014 Doen\u00e7a sist\u00eamica grave' },
  { value: 'ASA_4', label: 'ASA 4 \u2014 Doen\u00e7a grave com amea\u00e7a \u00e0 vida' },
  { value: 'ASA_5', label: 'ASA 5 \u2014 Paciente moribundo' },
];

/* ── Exame names ─────────────────────────────────── */

type ExameKey = 'hemograma' | 'coagulograma' | 'creatinina' | 'glicemiaJejum' | 'eletrocardiograma';

const EXAMES: { key: ExameKey; label: string }[] = [
  { key: 'hemograma', label: 'Hemograma Completo' },
  { key: 'coagulograma', label: 'Coagulograma Completo' },
  { key: 'creatinina', label: 'Creatinina' },
  { key: 'glicemiaJejum', label: 'Glicemia de Jejum' },
  { key: 'eletrocardiograma', label: 'Eletrocardiograma' },
];

/* ── Section check helpers ───────────────────────── */

function isSectionFilled(sectionIndex: number, form: SecoesClinicas, carater: CaraterAtendimento): boolean {
  switch (sectionIndex) {
    case 1: return form.historicoDoenca.trim().length >= 30;
    case 2: return form.exameFisico.trim().length >= 20;
    case 3: return form.diagnosticoProvavel.trim().length >= 20;
    case 4:
      return (
        form.sinaisSintomasGerais.trim().length >= 20 &&
        form.condicoesHemodinamicas.trim().length >= 10 &&
        form.necessidadeMensuracaoPA !== null &&
        form.padraoRespiratorio.trim().length >= 10 &&
        form.funcaoRenalHepatica.trim().length >= 10 &&
        form.estadoNeurologicoSumario.trim().length >= 10 &&
        form.estadoNutricional.trim().length >= 10
      );
    case 5:
      if (carater === 'HOSPITALAR') {
        return form.condicoesInternacao.trim().length >= 20 && form.riscoCirurgicoASA !== '';
      }
      return true; // não obrigatório se ambulatorial
    case 6: return form.resultadosProvasDiagnosticas.trim().length >= 20;
    case 7: return form.tratamentosRealizados.trim().length >= 30;
    case 8: return form.procedimentoUrgente !== null;
    case 9:
      return (
        form.historiaPregressa.trim().length >= 20 &&
        form.alergiaMedicamentos !== null &&
        form.alergiaContrastesAnestesicos !== null
      );
    case 10: {
      const exames: ExameKey[] = ['hemograma', 'coagulograma', 'creatinina', 'glicemiaJejum', 'eletrocardiograma'];
      return exames.some((k) => form[k].realizado && form[k].resultado.trim().length > 0);
    }
    case 11: return form.justificativaImpossibilidadeLocal.trim().length >= 30;
    case 12: return form.necessidadeAcompanhanteLaudo !== null;
    case 13: return form.transporteRecomendado !== '';
    default: return false;
  }
}

/* ================================================== */
/*  Component                                         */
/* ================================================== */

export default function LaudoMedicoPage() {
  const toast = useToast();

  /* ---- View state: 'list' or 'form' ---- */
  const [view, setView] = useState<'list' | 'form'>('list');

  /* ---- Selected solicitação ---- */
  const [selectedSol, setSelectedSol] = useState<Record<string, unknown> | null>(null);

  /* ---- KPI counts ---- */
  const [kpis, setKpis] = useState({ pendentes: 0, rascunhos: 0, concluidos: 0 });

  /* ---- Form state ---- */
  const [form, setForm] = useState<SecoesClinicas>({ ...SECOES_CLINICAS_INITIAL });
  const [laudoStatus, setLaudoStatus] = useState<StatusLaudo>('VAZIO');
  const [laudoId, setLaudoId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /* ---- Cabeçalho fields (editable) ---- */
  /* TODO AGENTE-4: Quando UnidadeSaudeSelect estiver pronto, trocar por:
     const [selectedUnidade, setSelectedUnidade] = useState<{ id: string; nome: string; codigo_cnes?: string; cidade?: string; uf?: string } | null>(null);
     E derivar unidadeSaude do nome da unidade selecionada. */
  const [unidadeSaude, setUnidadeSaude] = useState('');
  /* TODO AGENTE-4: Quando MedicoSelect estiver pronto, trocar por:
     const [selectedMedicoLaudo, setSelectedMedicoLaudo] = useState<{ id: string; nome_completo: string; crm: string; crm_uf: string; cpf?: string } | null>(null);
     E derivar medicoCPF automaticamente do medico selecionado. */
  const [medicoCPF, setMedicoCPF] = useState('');
  const [medicoTelefone, setMedicoTelefone] = useState('');

  /* ---- Accordion open sections ---- */
  const [openSections, setOpenSections] = useState<number[]>([]);

  /* ---- Validation errors ---- */
  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ---- Data: PENDENTE_DIAGNOSTICO ---- */
  const { data: solicitacoes, loading, refresh } = useSupabaseData(
    () => listarSolicitacoes({ status: 'PENDENTE_DIAGNOSTICO' }),
    [],
  );

  /* ---- Table controls (search, sort, filter, pagination) ---- */
  const table = useTableControls({
    data: solicitacoes as Record<string, unknown>[],
    searchFields: ['numero_processo', 'cid10_principal'] as (keyof Record<string, unknown>)[],
    dateField: 'created_at' as keyof Record<string, unknown>,
    pageSize: 20,
  });

  const items = table.paginated as unknown as Record<string, unknown>[];
  const filtered = table.filtered as unknown as Record<string, unknown>[];

  /* ---- Status Laudo filter options ---- */
  const statusLaudoFilterOptions = [
    { value: 'VAZIO', label: 'Sem laudo' },
    { value: 'RASCUNHO', label: 'Rascunho' },
    { value: 'CONCLUIDO', label: 'Concluído' },
  ];

  /* ---- KPI refresh ---- */
  const refreshKpis = useCallback(() => {
    contarPorStatus().then(({ data }) => {
      if (data) {
        setKpis({
          pendentes: data['PENDENTE_DIAGNOSTICO'] || 0,
          rascunhos: 0, // Will be counted from laudos_medicos table in production
          concluidos: 0,
        });
      }
    });
  }, []);

  useEffect(() => {
    refreshKpis();
  }, [refreshKpis]);

  // TODO: Auto-save draft every 60 seconds
  // useEffect(() => {
  //   if (view !== 'form' || laudoStatus === 'CONCLUIDO') return;
  //   const interval = setInterval(() => handleSaveRascunho(true), 60000);
  //   return () => clearInterval(interval);
  // }, [view, laudoStatus, form]);

  /* ---- Form helpers ---- */

  function updateForm<K extends keyof SecoesClinicas>(key: K, value: SecoesClinicas[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    // Clear error when user types
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }

  function updateExame(key: ExameKey, field: keyof ExameComplementarLaudo, value: string | boolean) {
    setForm((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
  }

  function resetForm() {
    setForm({ ...SECOES_CLINICAS_INITIAL });
    setLaudoStatus('VAZIO');
    setLaudoId(null);
    setUnidadeSaude('');
    setMedicoCPF('');
    setMedicoTelefone('');
    setOpenSections([]);
    setErrors({});
  }

  /* ---- Open form for a solicitação ---- */

  function handleOpenLaudo(sol: Record<string, unknown>) {
    setSelectedSol(sol);
    resetForm();

    // Pre-populate editable header fields
    setUnidadeSaude('');
    setMedicoCPF('');
    setMedicoTelefone('');

    // Pre-populate from existing laudo data if available (rascunho)
    // In production, this would fetch from laudos_medicos table
    // For now, start with empty form

    setView('form');
  }

  function handleBackToList() {
    setView('list');
    setSelectedSol(null);
    resetForm();
  }

  /* ---- Validate all fields ---- */

  function validateForm(): Record<string, string> {
    const errs: Record<string, string> = {};
    const pac = selectedSol?.pacientes as Record<string, unknown> | undefined;
    const carater = (selectedSol?.carater_atendimento as CaraterAtendimento) || 'AMBULATORIAL';

    // Header
    if (!unidadeSaude || unidadeSaude.trim().length < 5) {
      errs.unidadeSaude = 'Informe a unidade de sa\u00fade (m\u00ednimo 5 caracteres)';
    }
    if (!medicoCPF || medicoCPF.replace(/\D/g, '').length !== 11) {
      errs.medicoCPF = 'Informe um CPF v\u00e1lido (11 d\u00edgitos)';
    }

    // Seção 1
    if (!form.historicoDoenca || form.historicoDoenca.trim().length < 30) {
      errs.historicoDoenca = 'Obrigat\u00f3rio (m\u00ednimo 30 caracteres)';
    }
    // Seção 2
    if (!form.exameFisico || form.exameFisico.trim().length < 20) {
      errs.exameFisico = 'Obrigat\u00f3rio (m\u00ednimo 20 caracteres)';
    }
    // Seção 3
    if (!form.diagnosticoProvavel || form.diagnosticoProvavel.trim().length < 20) {
      errs.diagnosticoProvavel = 'Obrigat\u00f3rio (m\u00ednimo 20 caracteres)';
    }
    // Seção 4
    if (!form.sinaisSintomasGerais || form.sinaisSintomasGerais.trim().length < 20) {
      errs.sinaisSintomasGerais = 'Obrigat\u00f3rio (m\u00ednimo 20 caracteres)';
    }
    if (!form.condicoesHemodinamicas || form.condicoesHemodinamicas.trim().length < 10) {
      errs.condicoesHemodinamicas = 'Obrigat\u00f3rio (m\u00ednimo 10 caracteres)';
    }
    if (form.necessidadeMensuracaoPA === null) {
      errs.necessidadeMensuracaoPA = 'Sele\u00e7\u00e3o obrigat\u00f3ria';
    }
    if (!form.padraoRespiratorio || form.padraoRespiratorio.trim().length < 10) {
      errs.padraoRespiratorio = 'Obrigat\u00f3rio (m\u00ednimo 10 caracteres)';
    }
    if (!form.funcaoRenalHepatica || form.funcaoRenalHepatica.trim().length < 10) {
      errs.funcaoRenalHepatica = 'Obrigat\u00f3rio (m\u00ednimo 10 caracteres)';
    }
    if (!form.estadoNeurologicoSumario || form.estadoNeurologicoSumario.trim().length < 10) {
      errs.estadoNeurologicoSumario = 'Obrigat\u00f3rio (m\u00ednimo 10 caracteres)';
    }
    if (!form.estadoNutricional || form.estadoNutricional.trim().length < 10) {
      errs.estadoNutricional = 'Obrigat\u00f3rio (m\u00ednimo 10 caracteres)';
    }
    // Seção 5 (condicional)
    if (carater === 'HOSPITALAR') {
      if (!form.condicoesInternacao || form.condicoesInternacao.trim().length < 20) {
        errs.condicoesInternacao = 'Obrigat\u00f3rio para interna\u00e7\u00e3o (m\u00ednimo 20 caracteres)';
      }
      if (!form.riscoCirurgicoASA) {
        errs.riscoCirurgicoASA = 'Selecione o risco cir\u00fargico';
      }
    }
    // Seção 6
    if (!form.resultadosProvasDiagnosticas || form.resultadosProvasDiagnosticas.trim().length < 20) {
      errs.resultadosProvasDiagnosticas = 'Obrigat\u00f3rio (m\u00ednimo 20 caracteres)';
    }
    // Seção 7
    if (!form.tratamentosRealizados || form.tratamentosRealizados.trim().length < 30) {
      errs.tratamentosRealizados = 'Obrigat\u00f3rio (m\u00ednimo 30 caracteres)';
    }
    // Seção 8
    if (form.procedimentoUrgente === null) {
      errs.procedimentoUrgente = 'Sele\u00e7\u00e3o obrigat\u00f3ria';
    }
    if (form.procedimentoUrgente === true && (!form.caracterizacaoUrgencia || form.caracterizacaoUrgencia.trim().length < 20)) {
      errs.caracterizacaoUrgencia = 'Obrigat\u00f3rio quando urgente (m\u00ednimo 20 caracteres)';
    }
    // Seção 9
    if (!form.historiaPregressa || form.historiaPregressa.trim().length < 20) {
      errs.historiaPregressa = 'Obrigat\u00f3rio (m\u00ednimo 20 caracteres)';
    }
    if (form.alergiaMedicamentos === null) {
      errs.alergiaMedicamentos = 'Sele\u00e7\u00e3o obrigat\u00f3ria';
    }
    if (form.alergiaMedicamentos === true && (!form.descricaoAlergiaMedicamentos || form.descricaoAlergiaMedicamentos.trim().length < 10)) {
      errs.descricaoAlergiaMedicamentos = 'Descreva as alergias (m\u00ednimo 10 caracteres)';
    }
    if (form.alergiaContrastesAnestesicos === null) {
      errs.alergiaContrastesAnestesicos = 'Sele\u00e7\u00e3o obrigat\u00f3ria';
    }
    if (form.alergiaContrastesAnestesicos === true && (!form.descricaoAlergiaContrastes || form.descricaoAlergiaContrastes.trim().length < 10)) {
      errs.descricaoAlergiaContrastes = 'Descreva as alergias (m\u00ednimo 10 caracteres)';
    }
    // Seção 10
    const exameKeys: ExameKey[] = ['hemograma', 'coagulograma', 'creatinina', 'glicemiaJejum', 'eletrocardiograma'];
    const algumExame = exameKeys.some((k) => form[k].realizado && form[k].resultado.trim().length > 0);
    if (!algumExame) {
      errs.exames = 'Ao menos 1 exame deve estar marcado como realizado com resultado preenchido';
    }
    // Validate each checked exam has a result
    exameKeys.forEach((k) => {
      if (form[k].realizado && !form[k].resultado.trim()) {
        errs[`${k}_resultado`] = 'Informe o resultado do exame';
      }
    });
    // Seção 11
    if (!form.justificativaImpossibilidadeLocal || form.justificativaImpossibilidadeLocal.trim().length < 30) {
      errs.justificativaImpossibilidadeLocal = 'Obrigat\u00f3rio (m\u00ednimo 30 caracteres)';
    }
    // Seção 12
    if (form.necessidadeAcompanhanteLaudo === null) {
      errs.necessidadeAcompanhanteLaudo = 'Sele\u00e7\u00e3o obrigat\u00f3ria';
    }
    if (form.necessidadeAcompanhanteLaudo === true && (!form.justificativaAcompanhante || form.justificativaAcompanhante.trim().length < 20)) {
      errs.justificativaAcompanhante = 'Justifique a necessidade (m\u00ednimo 20 caracteres)';
    }
    // Seção 13
    if (!form.transporteRecomendado) {
      errs.transporteRecomendado = 'Sele\u00e7\u00e3o obrigat\u00f3ria';
    }
    if (form.transporteRecomendado === 'AEREO' && (!form.justificativaTransporte || form.justificativaTransporte.trim().length < 20)) {
      errs.justificativaTransporte = 'Justifique o transporte a\u00e9reo (m\u00ednimo 20 caracteres)';
    }

    return errs;
  }

  /* ---- Map field → section index ---- */

  function fieldToSection(field: string): number {
    const map: Record<string, number> = {
      historicoDoenca: 1,
      exameFisico: 2,
      diagnosticoProvavel: 3,
      sinaisSintomasGerais: 4, condicoesHemodinamicas: 4, necessidadeMensuracaoPA: 4,
      padraoRespiratorio: 4, funcaoRenalHepatica: 4, estadoNeurologicoSumario: 4, estadoNutricional: 4,
      condicoesInternacao: 5, riscoCirurgicoASA: 5, relatorioRiscoCirurgico: 5,
      resultadosProvasDiagnosticas: 6,
      tratamentosRealizados: 7,
      procedimentoUrgente: 8, caracterizacaoUrgencia: 8,
      historiaPregressa: 9, alergiaMedicamentos: 9, descricaoAlergiaMedicamentos: 9,
      alergiaContrastesAnestesicos: 9, descricaoAlergiaContrastes: 9,
      exames: 10, hemograma_resultado: 10, coagulograma_resultado: 10,
      creatinina_resultado: 10, glicemiaJejum_resultado: 10, eletrocardiograma_resultado: 10,
      justificativaImpossibilidadeLocal: 11,
      necessidadeAcompanhanteLaudo: 12, justificativaAcompanhante: 12,
      transporteRecomendado: 13, justificativaTransporte: 13,
    };
    return map[field] ?? 0;
  }

  /* ---- Save Draft ---- */

  async function handleSaveRascunho(silent = false) {
    if (!selectedSol) return;
    setSaving(true);
    try {
      // In production, this would call criarLaudo or atualizarLaudo
      // For now, simulate success
      await new Promise((res) => setTimeout(res, 500));
      setLaudoStatus('RASCUNHO');
      if (!silent) {
        toast.success('Rascunho salvo', 'Os dados foram salvos. Voc\u00ea pode continuar depois.');
      }
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error('Erro ao salvar', e.message ?? 'Tente novamente');
    }
    setSaving(false);
  }

  /* ---- Conclude ---- */

  async function handleConcluirLaudo() {
    if (!selectedSol) return;

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);

      // Expand sections with errors
      const errorSections = new Set<number>();
      Object.keys(validationErrors).forEach((field) => {
        const section = fieldToSection(field);
        if (section > 0) errorSections.add(section);
      });
      setOpenSections(Array.from(errorSections));

      toast.warning('Campos obrigat\u00f3rios', 'Preencha todos os campos obrigat\u00f3rios para concluir o laudo.');
      return;
    }

    // Confirmation
    if (!window.confirm('Confirmar conclus\u00e3o do laudo m\u00e9dico digital?\n\nAp\u00f3s conclus\u00e3o, o laudo ser\u00e1 vinculado ao processo e n\u00e3o poder\u00e1 ser editado.')) {
      return;
    }

    setSaving(true);
    try {
      // In production: atualizarLaudo with status CONCLUIDO + gerar DocumentoSolicitacao
      await new Promise((res) => setTimeout(res, 800));
      setLaudoStatus('CONCLUIDO');
      toast.success('Laudo conclu\u00eddo!', 'O laudo m\u00e9dico digital foi vinculado ao processo.');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error('Erro ao concluir', e.message ?? 'Tente novamente');
    }
    setSaving(false);
  }

  /* ---- Generate PDF ---- */

  function handleGerarPDF() {
    // In production, this would call a backend endpoint to generate the PDF
    toast.info('PDF em gera\u00e7\u00e3o', 'O download iniciar\u00e1 automaticamente em alguns segundos.');
  }

  /* ---- Derived data ---- */
  const pac = selectedSol ? (selectedSol.pacientes as Record<string, unknown> | undefined) : null;
  const carater: CaraterAtendimento = (selectedSol?.carater_atendimento as CaraterAtendimento) || 'AMBULATORIAL';
  const isReadOnly = laudoStatus === 'CONCLUIDO';

  /* ================================================== */
  /*  FORM VIEW                                         */
  /* ================================================== */

  if (view === 'form' && selectedSol) {
    return (
      <>
        {/* ── Header bar ─────────────────────────── */}
        <div className="flex items-center gap-3 mb-6">
          <button
            className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
            onClick={handleBackToList}
            title="Voltar para lista"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate" style={{ color: 'var(--tfd-text-primary)' }}>
              Laudo M\u00e9dico \u2014 {selectedSol.numero_processo as string} \u2014 {(pac?.nome_completo as string) ?? ''}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusTag status={selectedSol.status as any} />
              <StatusLaudoTag status={laudoStatus} />
            </div>
          </div>
        </div>

        {/* ── Patient data card (read-only, collapsible) ── */}
        {pac && (
          <details className="tfd-card mb-6" open>
            <summary
              className="flex items-center justify-between cursor-pointer select-none px-4 py-3"
              style={{ listStyle: 'none' }}
            >
              <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--tfd-text-muted)' }}>
                Dados do Paciente e Solicita\u00e7\u00e3o
              </h3>
              <ChevronRight size={14} style={{ color: 'var(--tfd-text-muted)' }} className="transition-transform duration-150 [details[open]_&]:rotate-90" />
            </summary>
            <div
              className="px-4 pb-4"
              style={{ borderTop: '1px solid var(--tfd-surface-border)' }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 pt-3 text-sm">
                <div>
                  <span className="tfd-label mb-0">Paciente</span>
                  <p className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{pac.nome_completo as string}</p>
                </div>
                <div>
                  <span className="tfd-label mb-0">CPF</span>
                  <p style={{ color: 'var(--tfd-text-secondary)' }}>{formatCPF((pac.cpf as string) ?? '')}</p>
                </div>
                <div>
                  <span className="tfd-label mb-0">Idade</span>
                  <p style={{ color: 'var(--tfd-text-secondary)' }}>
                    {pac.data_nascimento
                      ? `${Math.floor((Date.now() - new Date(pac.data_nascimento as string).getTime()) / (1000 * 60 * 60 * 24 * 365.25))} anos`
                      : '\u2014'}
                  </p>
                </div>
                <div>
                  <span className="tfd-label mb-0">N\u00ba Processo</span>
                  <p style={{ color: 'var(--tfd-text-secondary)' }}>{selectedSol.numero_processo as string}</p>
                </div>
                <div>
                  <span className="tfd-label mb-0">CID-10</span>
                  <p style={{ color: 'var(--tfd-text-secondary)' }}>{(selectedSol.cid10_principal as string) || '\u2014'}</p>
                </div>
                <div>
                  <span className="tfd-label mb-0">Procedimento</span>
                  <p style={{ color: 'var(--tfd-text-secondary)' }}>{(selectedSol.tipo_procedimento as string) || '\u2014'}</p>
                </div>
                <div>
                  <span className="tfd-label mb-0">Especialidade</span>
                  <p style={{ color: 'var(--tfd-text-secondary)' }}>{(selectedSol.especialidade as string) || '\u2014'}</p>
                </div>
                <div>
                  <span className="tfd-label mb-0">M\u00e9dico Solicitante</span>
                  <p style={{ color: 'var(--tfd-text-secondary)' }}>{(selectedSol.medico_solicitante_nome as string) || '\u2014'}</p>
                </div>
                <div>
                  <span className="tfd-label mb-0">Car\u00e1ter</span>
                  <p style={{ color: 'var(--tfd-text-secondary)' }}>
                    {carater === 'HOSPITALAR' ? 'Hospitalar' : 'Ambulatorial'}
                  </p>
                </div>
              </div>

              {/* Editable header fields */}
              {/* TODO AGENTE-4: Substituir campo "Unidade de Saúde" por:
                  <UnidadeSaudeSelect
                    value={selectedUnidade}
                    onChange={(unidade) => { setSelectedUnidade(unidade); setUnidadeSaude(unidade?.nome ?? ''); }}
                    label="Unidade de Saúde Solicitante SUS"
                    required
                  />
                  Busca por nome ou código CNES. Exibe: "{nome} — {cidade}/{uf} (CNES: {codigo_cnes})". */}
              {/* TODO AGENTE-4: Substituir campo "CPF do Médico" por MedicoSelect:
                  <MedicoSelect
                    value={selectedMedicoLaudo}
                    onChange={(medico) => { setSelectedMedicoLaudo(medico); setMedicoCPF(medico?.cpf ?? ''); }}
                    label="Médico Solicitante"
                    required
                  />
                  Ao selecionar médico, preenche CPF automaticamente. */}
              <div
                className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 mt-4"
                style={{ borderTop: '1px solid var(--tfd-surface-border)' }}
              >
                <FormField label="Unidade de Saúde Solicitante SUS" required error={errors.unidadeSaude}>
                  <input
                    type="text"
                    className="tfd-input"
                    placeholder="Nome da unidade de saúde SUS"
                    value={unidadeSaude}
                    onChange={(e) => { setUnidadeSaude(e.target.value); if (errors.unidadeSaude) setErrors((p) => { const n = { ...p }; delete n.unidadeSaude; return n; }); }}
                    disabled={isReadOnly}
                  />
                </FormField>
                <FormField label="CPF do Médico Solicitante" required error={errors.medicoCPF}>
                  <input
                    type="text"
                    className="tfd-input"
                    placeholder="000.000.000-00"
                    value={medicoCPF}
                    onChange={(e) => { setMedicoCPF(maskCPF(e.target.value)); if (errors.medicoCPF) setErrors((p) => { const n = { ...p }; delete n.medicoCPF; return n; }); }}
                    disabled={isReadOnly}
                  />
                </FormField>
                <FormField label="Telefone do Médico">
                  <input
                    type="text"
                    className="tfd-input"
                    placeholder="(00) 00000-0000"
                    value={medicoTelefone}
                    onChange={(e) => setMedicoTelefone(maskPhone(e.target.value))}
                    disabled={isReadOnly}
                  />
                </FormField>
              </div>
            </div>
          </details>
        )}

        {/* ── Clinical sections accordion ─────────── */}
        <div className="tfd-card p-0 overflow-hidden mb-6">
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
              Se\u00e7\u00f5es Cl\u00ednicas do Laudo
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--tfd-text-muted)' }}>
              Preencha todas as se\u00e7\u00f5es obrigat\u00f3rias. Clique em cada se\u00e7\u00e3o para expandir.
            </p>
          </div>

          <Accordion
            value={openSections}
            onValueChange={(val: number[]) => setOpenSections(val)}
          >
            {/* ── Seção 1: Histórico da Doença ── */}
            <AccordionItem value={1} className="px-4" style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}>
              <AccordionTrigger className="gap-2">
                <SectionIndicator filled={isSectionFilled(1, form, carater)} />
                <span>1. Hist\u00f3rico da Doen\u00e7a</span>
                <span className="text-xs font-normal ml-1" style={{ color: 'var(--tfd-status-danger)' }}>*</span>
              </AccordionTrigger>
              <AccordionContent>
                <FormField label="Hist\u00f3rico da doen\u00e7a" required error={errors.historicoDoenca}>
                  <textarea
                    className="tfd-input"
                    rows={4}
                    placeholder="Descreva o hist\u00f3rico da doen\u00e7a do paciente, incluindo data de in\u00edcio dos sintomas, evolu\u00e7\u00e3o cl\u00ednica e tratamentos pr\u00e9vios."
                    value={form.historicoDoenca}
                    onChange={(e) => updateForm('historicoDoenca', e.target.value)}
                    disabled={isReadOnly}
                  />
                </FormField>
              </AccordionContent>
            </AccordionItem>

            {/* ── Seção 2: Exame Físico ── */}
            <AccordionItem value={2} className="px-4" style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}>
              <AccordionTrigger className="gap-2">
                <SectionIndicator filled={isSectionFilled(2, form, carater)} />
                <span>2. Exame F\u00edsico</span>
                <span className="text-xs font-normal ml-1" style={{ color: 'var(--tfd-status-danger)' }}>*</span>
              </AccordionTrigger>
              <AccordionContent>
                <FormField label="Exame f\u00edsico" required error={errors.exameFisico}>
                  <textarea
                    className="tfd-input"
                    rows={4}
                    placeholder="Descreva os achados do exame f\u00edsico relevantes para o diagn\u00f3stico e tratamento solicitado."
                    value={form.exameFisico}
                    onChange={(e) => updateForm('exameFisico', e.target.value)}
                    disabled={isReadOnly}
                  />
                </FormField>
              </AccordionContent>
            </AccordionItem>

            {/* ── Seção 3: Diagnóstico Provável ── */}
            <AccordionItem value={3} className="px-4" style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}>
              <AccordionTrigger className="gap-2">
                <SectionIndicator filled={isSectionFilled(3, form, carater)} />
                <span>3. Diagn\u00f3stico Prov\u00e1vel</span>
                <span className="text-xs font-normal ml-1" style={{ color: 'var(--tfd-status-danger)' }}>*</span>
              </AccordionTrigger>
              <AccordionContent>
                <FormField label="Diagn\u00f3stico prov\u00e1vel" required error={errors.diagnosticoProvavel}>
                  <textarea
                    className="tfd-input"
                    rows={3}
                    placeholder="Informe o diagn\u00f3stico prov\u00e1vel ou confirmado, com base nos achados cl\u00ednicos e exames realizados."
                    value={form.diagnosticoProvavel}
                    onChange={(e) => updateForm('diagnosticoProvavel', e.target.value)}
                    disabled={isReadOnly}
                  />
                </FormField>
              </AccordionContent>
            </AccordionItem>

            {/* ── Seção 4: Sinais e Sintomas Clínicos ── */}
            <AccordionItem value={4} className="px-4" style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}>
              <AccordionTrigger className="gap-2">
                <SectionIndicator filled={isSectionFilled(4, form, carater)} />
                <span>4. Principais Sinais e Sintomas Cl\u00ednicos</span>
                <span className="text-xs font-normal ml-1" style={{ color: 'var(--tfd-status-danger)' }}>*</span>
              </AccordionTrigger>
              <AccordionContent>
                <FormField label="Sinais e sintomas gerais" required error={errors.sinaisSintomasGerais}>
                  <textarea
                    className="tfd-input"
                    rows={3}
                    placeholder="Descreva os principais sinais e sintomas cl\u00ednicos apresentados pelo paciente."
                    value={form.sinaisSintomasGerais}
                    onChange={(e) => updateForm('sinaisSintomasGerais', e.target.value)}
                    disabled={isReadOnly}
                  />
                </FormField>

                <div
                  className="p-3 rounded-lg mb-4"
                  style={{ backgroundColor: 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}
                >
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--tfd-text-muted)' }}>
                    Detalhamento cl\u00ednico
                  </p>

                  <FormField label="Condi\u00e7\u00f5es hemodin\u00e2micas" required error={errors.condicoesHemodinamicas}>
                    <textarea
                      className="tfd-input"
                      rows={2}
                      placeholder="Press\u00e3o arterial, frequ\u00eancia card\u00edaca, perfus\u00e3o perif\u00e9rica..."
                      value={form.condicoesHemodinamicas}
                      onChange={(e) => updateForm('condicoesHemodinamicas', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </FormField>

                  <FormField label="Necessidade de mensura\u00e7\u00e3o cont\u00ednua da PA" required error={errors.necessidadeMensuracaoPA}>
                    <div className="flex items-center gap-4 mt-1">
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: 'var(--tfd-text-primary)' }}>
                        <input
                          type="radio"
                          name="mensuracaoPA"
                          checked={form.necessidadeMensuracaoPA === true}
                          onChange={() => updateForm('necessidadeMensuracaoPA', true)}
                          disabled={isReadOnly}
                        />
                        Sim
                      </label>
                      <label className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: 'var(--tfd-text-primary)' }}>
                        <input
                          type="radio"
                          name="mensuracaoPA"
                          checked={form.necessidadeMensuracaoPA === false}
                          onChange={() => updateForm('necessidadeMensuracaoPA', false)}
                          disabled={isReadOnly}
                        />
                        N\u00e3o
                      </label>
                    </div>
                  </FormField>

                  <FormField label="Padr\u00e3o respirat\u00f3rio" required error={errors.padraoRespiratorio}>
                    <textarea
                      className="tfd-input"
                      rows={2}
                      placeholder="Frequ\u00eancia, ritmo, uso de musculatura acess\u00f3ria, satura\u00e7\u00e3o O2..."
                      value={form.padraoRespiratorio}
                      onChange={(e) => updateForm('padraoRespiratorio', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </FormField>

                  <FormField label="Fun\u00e7\u00e3o renal e hep\u00e1tica" required error={errors.funcaoRenalHepatica}>
                    <textarea
                      className="tfd-input"
                      rows={2}
                      placeholder="Creatinina, ureia, TGO, TGP, bilirrubinas..."
                      value={form.funcaoRenalHepatica}
                      onChange={(e) => updateForm('funcaoRenalHepatica', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </FormField>

                  <FormField label="Estado neurol\u00f3gico sum\u00e1rio" required error={errors.estadoNeurologicoSumario}>
                    <textarea
                      className="tfd-input"
                      rows={2}
                      placeholder="N\u00edvel de consci\u00eancia, Glasgow, pupilas, for\u00e7a motora..."
                      value={form.estadoNeurologicoSumario}
                      onChange={(e) => updateForm('estadoNeurologicoSumario', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </FormField>

                  <FormField label="Estado nutricional" required error={errors.estadoNutricional}>
                    <textarea
                      className="tfd-input"
                      rows={2}
                      placeholder="IMC, albumina, sinais de desnutri\u00e7\u00e3o..."
                      value={form.estadoNutricional}
                      onChange={(e) => updateForm('estadoNutricional', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </FormField>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* ── Seção 5: Condições Internação + Risco ── */}
            <AccordionItem value={5} className="px-4" style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}>
              <AccordionTrigger className="gap-2">
                <SectionIndicator filled={isSectionFilled(5, form, carater)} />
                <span>5. Condi\u00e7\u00f5es para Interna\u00e7\u00e3o + Risco Cir\u00fargico</span>
                {carater === 'HOSPITALAR' && (
                  <span className="text-xs font-normal ml-1" style={{ color: 'var(--tfd-status-danger)' }}>*</span>
                )}
              </AccordionTrigger>
              <AccordionContent>
                {carater !== 'HOSPITALAR' && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4" style={{ backgroundColor: '#EFF6FF' }}>
                    <AlertTriangle size={14} style={{ color: '#1E40AF' }} />
                    <span className="text-xs" style={{ color: '#1E40AF' }}>
                      Se\u00e7\u00e3o condicional: obrigat\u00f3ria apenas para car\u00e1ter de atendimento Hospitalar.
                    </span>
                  </div>
                )}

                <FormField label="Condi\u00e7\u00f5es que justificam a interna\u00e7\u00e3o" required={carater === 'HOSPITALAR'} error={errors.condicoesInternacao}>
                  <textarea
                    className="tfd-input"
                    rows={3}
                    placeholder="Descreva as condi\u00e7\u00f5es cl\u00ednicas que justificam a necessidade de interna\u00e7\u00e3o hospitalar."
                    value={form.condicoesInternacao}
                    onChange={(e) => updateForm('condicoesInternacao', e.target.value)}
                    disabled={isReadOnly}
                  />
                </FormField>

                <FormField label="Risco cir\u00fargico ASA" required={carater === 'HOSPITALAR'} error={errors.riscoCirurgicoASA}>
                  <select
                    className="tfd-input"
                    value={form.riscoCirurgicoASA}
                    onChange={(e) => updateForm('riscoCirurgicoASA', e.target.value as RiscoCirurgicoASA | '')}
                    disabled={isReadOnly}
                  >
                    <option value="">Selecione...</option>
                    {ASA_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Relat\u00f3rio de risco cir\u00fargico">
                  <textarea
                    className="tfd-input"
                    rows={2}
                    placeholder="Detalhe o relat\u00f3rio de risco cir\u00fargico, se aplic\u00e1vel (comorbidades, estado f\u00edsico, riscos anest\u00e9sicos)."
                    value={form.relatorioRiscoCirurgico}
                    onChange={(e) => updateForm('relatorioRiscoCirurgico', e.target.value)}
                    disabled={isReadOnly}
                  />
                </FormField>
              </AccordionContent>
            </AccordionItem>

            {/* ── Seção 6: Resultados Provas Diagnósticas ── */}
            <AccordionItem value={6} className="px-4" style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}>
              <AccordionTrigger className="gap-2">
                <SectionIndicator filled={isSectionFilled(6, form, carater)} />
                <span>6. Principais Resultados de Provas Diagn\u00f3sticas</span>
                <span className="text-xs font-normal ml-1" style={{ color: 'var(--tfd-status-danger)' }}>*</span>
              </AccordionTrigger>
              <AccordionContent>
                <FormField label="Resultados de provas diagn\u00f3sticas" required error={errors.resultadosProvasDiagnosticas}>
                  <textarea
                    className="tfd-input"
                    rows={4}
                    placeholder="Descreva os principais resultados de provas diagn\u00f3sticas j\u00e1 realizadas (bi\u00f3psia, imagem, laboratorial, etc.)."
                    value={form.resultadosProvasDiagnosticas}
                    onChange={(e) => updateForm('resultadosProvasDiagnosticas', e.target.value)}
                    disabled={isReadOnly}
                  />
                </FormField>
              </AccordionContent>
            </AccordionItem>

            {/* ── Seção 7: Tratamentos Realizados ── */}
            <AccordionItem value={7} className="px-4" style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}>
              <AccordionTrigger className="gap-2">
                <SectionIndicator filled={isSectionFilled(7, form, carater)} />
                <span>7. Tratamentos Realizados</span>
                <span className="text-xs font-normal ml-1" style={{ color: 'var(--tfd-status-danger)' }}>*</span>
              </AccordionTrigger>
              <AccordionContent>
                <FormField label="Tratamentos realizados" required error={errors.tratamentosRealizados}>
                  <textarea
                    className="tfd-input"
                    rows={4}
                    placeholder="Descreva os tratamentos j\u00e1 realizados no estado do Maranh\u00e3o, incluindo medicamentos, procedimentos e resultados obtidos."
                    value={form.tratamentosRealizados}
                    onChange={(e) => updateForm('tratamentosRealizados', e.target.value)}
                    disabled={isReadOnly}
                  />
                </FormField>
              </AccordionContent>
            </AccordionItem>

            {/* ── Seção 8: Urgência ── */}
            <AccordionItem value={8} className="px-4" style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}>
              <AccordionTrigger className="gap-2">
                <SectionIndicator filled={isSectionFilled(8, form, carater)} />
                <span>8. Caracteriza\u00e7\u00e3o de Eventual Urg\u00eancia</span>
                <span className="text-xs font-normal ml-1" style={{ color: 'var(--tfd-status-danger)' }}>*</span>
              </AccordionTrigger>
              <AccordionContent>
                <FormField label="Existe urg\u00eancia na realiza\u00e7\u00e3o deste procedimento?" required error={errors.procedimentoUrgente}>
                  <div className="flex items-center gap-4 mt-1">
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: 'var(--tfd-text-primary)' }}>
                      <input
                        type="radio"
                        name="procedimentoUrgente"
                        checked={form.procedimentoUrgente === true}
                        onChange={() => updateForm('procedimentoUrgente', true)}
                        disabled={isReadOnly}
                      />
                      Sim
                    </label>
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: 'var(--tfd-text-primary)' }}>
                      <input
                        type="radio"
                        name="procedimentoUrgente"
                        checked={form.procedimentoUrgente === false}
                        onChange={() => updateForm('procedimentoUrgente', false)}
                        disabled={isReadOnly}
                      />
                      N\u00e3o
                    </label>
                  </div>
                </FormField>

                {form.procedimentoUrgente === true && (
                  <FormField label="Caracteriza\u00e7\u00e3o da urg\u00eancia" required error={errors.caracterizacaoUrgencia}>
                    <textarea
                      className="tfd-input"
                      rows={3}
                      placeholder="Descreva a urg\u00eancia na realiza\u00e7\u00e3o do procedimento (janela cir\u00fargica, risco de agravamento, etc.)."
                      value={form.caracterizacaoUrgencia}
                      onChange={(e) => updateForm('caracterizacaoUrgencia', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </FormField>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* ── Seção 9: História Pregressa ── */}
            <AccordionItem value={9} className="px-4" style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}>
              <AccordionTrigger className="gap-2">
                <SectionIndicator filled={isSectionFilled(9, form, carater)} />
                <span>9. Hist\u00f3ria Pregressa e Atual Significativa</span>
                <span className="text-xs font-normal ml-1" style={{ color: 'var(--tfd-status-danger)' }}>*</span>
              </AccordionTrigger>
              <AccordionContent>
                <FormField label="Hist\u00f3ria pregressa" required error={errors.historiaPregressa}>
                  <textarea
                    className="tfd-input"
                    rows={3}
                    placeholder="Descreva a hist\u00f3ria pregressa e atual significativa do paciente."
                    value={form.historiaPregressa}
                    onChange={(e) => updateForm('historiaPregressa', e.target.value)}
                    disabled={isReadOnly}
                  />
                </FormField>

                <FormField label="Alergia a medicamentos?" required error={errors.alergiaMedicamentos}>
                  <div className="flex items-center gap-4 mt-1">
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: 'var(--tfd-text-primary)' }}>
                      <input
                        type="radio"
                        name="alergiaMedicamentos"
                        checked={form.alergiaMedicamentos === true}
                        onChange={() => updateForm('alergiaMedicamentos', true)}
                        disabled={isReadOnly}
                      />
                      Sim
                    </label>
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: 'var(--tfd-text-primary)' }}>
                      <input
                        type="radio"
                        name="alergiaMedicamentos"
                        checked={form.alergiaMedicamentos === false}
                        onChange={() => updateForm('alergiaMedicamentos', false)}
                        disabled={isReadOnly}
                      />
                      N\u00e3o
                    </label>
                  </div>
                </FormField>

                {form.alergiaMedicamentos === true && (
                  <FormField label="Quais medicamentos?" required error={errors.descricaoAlergiaMedicamentos}>
                    <textarea
                      className="tfd-input"
                      rows={2}
                      placeholder="Informe os medicamentos aos quais o paciente \u00e9 al\u00e9rgico."
                      value={form.descricaoAlergiaMedicamentos}
                      onChange={(e) => updateForm('descricaoAlergiaMedicamentos', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </FormField>
                )}

                <FormField label="Alergia a contrastes, anest\u00e9sicos ou antiss\u00e9pticos?" required error={errors.alergiaContrastesAnestesicos}>
                  <div className="flex items-center gap-4 mt-1">
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: 'var(--tfd-text-primary)' }}>
                      <input
                        type="radio"
                        name="alergiaContrastes"
                        checked={form.alergiaContrastesAnestesicos === true}
                        onChange={() => updateForm('alergiaContrastesAnestesicos', true)}
                        disabled={isReadOnly}
                      />
                      Sim
                    </label>
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: 'var(--tfd-text-primary)' }}>
                      <input
                        type="radio"
                        name="alergiaContrastes"
                        checked={form.alergiaContrastesAnestesicos === false}
                        onChange={() => updateForm('alergiaContrastesAnestesicos', false)}
                        disabled={isReadOnly}
                      />
                      N\u00e3o
                    </label>
                  </div>
                </FormField>

                {form.alergiaContrastesAnestesicos === true && (
                  <FormField label="Quais contrastes/anest\u00e9sicos?" required error={errors.descricaoAlergiaContrastes}>
                    <textarea
                      className="tfd-input"
                      rows={2}
                      placeholder="Informe os contrastes, anest\u00e9sicos ou antiss\u00e9pticos aos quais o paciente \u00e9 al\u00e9rgico."
                      value={form.descricaoAlergiaContrastes}
                      onChange={(e) => updateForm('descricaoAlergiaContrastes', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </FormField>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* ── Seção 10: Exames Complementares ── */}
            <AccordionItem value={10} className="px-4" style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}>
              <AccordionTrigger className="gap-2">
                <SectionIndicator filled={isSectionFilled(10, form, carater)} />
                <span>10. Exames Complementares M\u00ednimos</span>
                <span className="text-xs font-normal ml-1" style={{ color: 'var(--tfd-status-danger)' }}>*</span>
              </AccordionTrigger>
              <AccordionContent>
                {errors.exames && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4" style={{ backgroundColor: '#FEF2F2' }}>
                    <AlertTriangle size={14} style={{ color: '#B91C1C' }} />
                    <span className="text-xs" style={{ color: '#B91C1C' }}>{errors.exames}</span>
                  </div>
                )}

                <div className="space-y-4">
                  {EXAMES.map(({ key, label }) => (
                    <div
                      key={key}
                      className="p-3 rounded-lg"
                      style={{
                        backgroundColor: form[key].realizado ? 'var(--tfd-surface-50)' : 'transparent',
                        border: `1px solid ${form[key].realizado ? 'var(--tfd-surface-border)' : 'transparent'}`,
                      }}
                    >
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form[key].realizado}
                          onChange={(e) => updateExame(key, 'realizado', e.target.checked)}
                          disabled={isReadOnly}
                          className="accent-[var(--tfd-primary-500)]"
                        />
                        <span className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                          {label}
                        </span>
                      </label>

                      {form[key].realizado && (
                        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3 mt-3 pl-6">
                          <FormField label="Resultado" required error={errors[`${key}_resultado`]}>
                            <textarea
                              className="tfd-input"
                              rows={2}
                              placeholder={`Informe os resultados do ${label.toLowerCase()}.`}
                              value={form[key].resultado}
                              onChange={(e) => updateExame(key, 'resultado', e.target.value)}
                              disabled={isReadOnly}
                            />
                          </FormField>
                          <FormField label="Data do exame">
                            <input
                              type="date"
                              className="tfd-input"
                              value={form[key].dataExame}
                              onChange={(e) => updateExame(key, 'dataExame', e.target.value)}
                              disabled={isReadOnly}
                            />
                          </FormField>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <FormField label="Outros exames complementares">
                    <textarea
                      className="tfd-input"
                      rows={3}
                      placeholder="Informe outros exames complementares realizados e seus resultados."
                      value={form.outrosExames}
                      onChange={(e) => updateForm('outrosExames', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </FormField>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* ── Seção 11: Justificativa TFD ── */}
            <AccordionItem value={11} className="px-4" style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}>
              <AccordionTrigger className="gap-2">
                <SectionIndicator filled={isSectionFilled(11, form, carater)} />
                <span>11. Justificativa para Impossibilidade de Tratamento Local</span>
                <span className="text-xs font-normal ml-1" style={{ color: 'var(--tfd-status-danger)' }}>*</span>
              </AccordionTrigger>
              <AccordionContent>
                <FormField label="Justificativa" required error={errors.justificativaImpossibilidadeLocal}>
                  <textarea
                    className="tfd-input"
                    rows={4}
                    placeholder="Justifique detalhadamente as raz\u00f5es que impossibilitam a realiza\u00e7\u00e3o do tratamento/exames na localidade de origem do paciente."
                    value={form.justificativaImpossibilidadeLocal}
                    onChange={(e) => updateForm('justificativaImpossibilidadeLocal', e.target.value)}
                    disabled={isReadOnly}
                  />
                </FormField>
              </AccordionContent>
            </AccordionItem>

            {/* ── Seção 12: Necessidade de Acompanhante ── */}
            <AccordionItem value={12} className="px-4" style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}>
              <AccordionTrigger className="gap-2">
                <SectionIndicator filled={isSectionFilled(12, form, carater)} />
                <span>12. Necessidade de Acompanhante</span>
                <span className="text-xs font-normal ml-1" style={{ color: 'var(--tfd-status-danger)' }}>*</span>
              </AccordionTrigger>
              <AccordionContent>
                <FormField label="O paciente necessita de acompanhante?" required error={errors.necessidadeAcompanhanteLaudo}>
                  <div className="flex items-center gap-4 mt-1">
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: 'var(--tfd-text-primary)' }}>
                      <input
                        type="radio"
                        name="necessidadeAcompanhante"
                        checked={form.necessidadeAcompanhanteLaudo === true}
                        onChange={() => updateForm('necessidadeAcompanhanteLaudo', true)}
                        disabled={isReadOnly}
                      />
                      Sim
                    </label>
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: 'var(--tfd-text-primary)' }}>
                      <input
                        type="radio"
                        name="necessidadeAcompanhante"
                        checked={form.necessidadeAcompanhanteLaudo === false}
                        onChange={() => updateForm('necessidadeAcompanhanteLaudo', false)}
                        disabled={isReadOnly}
                      />
                      N\u00e3o
                    </label>
                  </div>
                </FormField>

                {form.necessidadeAcompanhanteLaudo === true && (
                  <FormField label="Justificativa cl\u00ednica para acompanhante" required error={errors.justificativaAcompanhante}>
                    <textarea
                      className="tfd-input"
                      rows={3}
                      placeholder="Justifique a necessidade cl\u00ednica de acompanhante durante o tratamento fora do domic\u00edlio."
                      value={form.justificativaAcompanhante}
                      onChange={(e) => updateForm('justificativaAcompanhante', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </FormField>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* ── Seção 13: Transporte Recomendável ── */}
            <AccordionItem value={13} className="px-4" style={{ borderBottom: 'none' }}>
              <AccordionTrigger className="gap-2">
                <SectionIndicator filled={isSectionFilled(13, form, carater)} />
                <span>13. Transporte Recomend\u00e1vel</span>
                <span className="text-xs font-normal ml-1" style={{ color: 'var(--tfd-status-danger)' }}>*</span>
              </AccordionTrigger>
              <AccordionContent>
                <FormField label="Tipo de transporte recomendado" required error={errors.transporteRecomendado}>
                  <div className="flex items-center gap-4 mt-1">
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: 'var(--tfd-text-primary)' }}>
                      <input
                        type="radio"
                        name="transporteRecomendado"
                        checked={form.transporteRecomendado === 'RODOVIARIO'}
                        onChange={() => updateForm('transporteRecomendado', 'RODOVIARIO' as TransporteRecomendado)}
                        disabled={isReadOnly}
                      />
                      Rodovi\u00e1rio
                    </label>
                    <label className="flex items-center gap-1.5 text-sm cursor-pointer" style={{ color: 'var(--tfd-text-primary)' }}>
                      <input
                        type="radio"
                        name="transporteRecomendado"
                        checked={form.transporteRecomendado === 'AEREO'}
                        onChange={() => updateForm('transporteRecomendado', 'AEREO' as TransporteRecomendado)}
                        disabled={isReadOnly}
                      />
                      A\u00e9reo
                    </label>
                  </div>
                </FormField>

                {form.transporteRecomendado === 'AEREO' && (
                  <FormField label="Justificativa para transporte a\u00e9reo" required error={errors.justificativaTransporte}>
                    <textarea
                      className="tfd-input"
                      rows={3}
                      placeholder="Justifique a necessidade de transporte a\u00e9reo (condi\u00e7\u00e3o cl\u00ednica, urg\u00eancia, impossibilidade de deslocamento terrestre, etc.)."
                      value={form.justificativaTransporte}
                      onChange={(e) => updateForm('justificativaTransporte', e.target.value)}
                      disabled={isReadOnly}
                    />
                  </FormField>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {/* ── Sticky footer bar ──────────────────── */}
        <div
          className="sticky bottom-0 z-10 flex items-center justify-between gap-3 px-5 py-3 -mx-6 -mb-6 mt-2"
          style={{
            backgroundColor: 'var(--tfd-surface-card)',
            borderTop: '1px solid var(--tfd-surface-border)',
            boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
          }}
        >
          <button
            className="tfd-btn tfd-btn-ghost text-sm"
            onClick={handleBackToList}
          >
            <ArrowLeft size={16} />
            Voltar
          </button>

          <div className="flex items-center gap-2">
            {!isReadOnly && (
              <>
                <button
                  className="tfd-btn tfd-btn-secondary text-sm"
                  onClick={() => handleSaveRascunho(false)}
                  disabled={saving}
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Salvar Rascunho
                </button>
                <button
                  className="tfd-btn tfd-btn-primary text-sm"
                  onClick={handleConcluirLaudo}
                  disabled={saving}
                >
                  <Check size={16} />
                  Concluir Laudo
                </button>
              </>
            )}
            <button
              className="tfd-btn tfd-btn-secondary text-sm"
              onClick={handleGerarPDF}
            >
              <FileDown size={16} />
              Gerar PDF
            </button>
          </div>
        </div>
      </>
    );
  }

  /* ================================================== */
  /*  LIST VIEW                                         */
  /* ================================================== */

  return (
    <>
      <PageHeader
        title="Laudo M\u00e9dico Digital"
        subtitle="Preenchimento digital do laudo m\u00e9dico cl\u00ednico"
      />

      {/* ========== KPIs ========== */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#FFF7ED', color: '#C2410C' }}
          >
            <ClipboardList size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Pendentes</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{kpis.pendentes}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
          >
            <FileEdit size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Rascunhos</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{kpis.rascunhos}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}
          >
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Conclu\u00eddos</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{kpis.concluidos}</p>
          </div>
        </div>
      </div>

      {/* ========== Toolbar ========== */}
      <div className="tfd-toolbar mb-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={16}
              className="tfd-input-leading-icon"
              style={{ color: 'var(--tfd-text-muted)' }}
            />
            <input
              type="text"
              className="tfd-input tfd-input--sm tfd-input--with-leading-icon"
              placeholder="Buscar por processo ou CID-10..."
              value={table.search}
              onChange={(e) => table.setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <Calendar size={14} style={{ color: 'var(--tfd-text-muted)', flexShrink: 0 }} />
            <input type="date" className="tfd-input tfd-input--sm" style={{ width: 'auto' }}
              value={table.dateStart} onChange={(e) => table.setDateStart(e.target.value)} title="Data início" />
            <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>até</span>
            <input type="date" className="tfd-input tfd-input--sm" style={{ width: 'auto' }}
              value={table.dateEnd} onChange={(e) => table.setDateEnd(e.target.value)} title="Data fim" />
          </div>
        </div>

        <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
          {filtered.length} processo{filtered.length !== 1 && 's'} pendente{filtered.length !== 1 && 's'}
        </p>
      </div>

      {/* ========== Table ========== */}
      <div className="tfd-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tfd-table">
            <thead>
              <tr>
                <SortableHeader
                  label="Processo"
                  sortDirection={table.getSortDirection('numero_processo')}
                  onSort={() => table.toggleSort('numero_processo')}
                />
                <SortableHeader
                  label="Paciente"
                  sortDirection={table.getSortDirection('pacientes')}
                  onSort={() => table.toggleSort('pacientes')}
                />
                <SortableHeader
                  label="CID-10"
                  className="hidden md:table-cell"
                  sortDirection={table.getSortDirection('cid10_principal')}
                  onSort={() => table.toggleSort('cid10_principal')}
                />
                <SortableHeader
                  label="Status Laudo"
                  className="hidden lg:table-cell"
                  sortDirection={table.getSortDirection('status_laudo')}
                  onSort={() => table.toggleSort('status_laudo')}
                  filterOptions={statusLaudoFilterOptions}
                  activeFilters={table.getActiveFilters('status_laudo')}
                  onFilterChange={(v) => table.setColumnFilter('status_laudo', v)}
                />
                <SortableHeader
                  label="Data"
                  className="hidden md:table-cell"
                  sortDirection={table.getSortDirection('created_at')}
                  onSort={() => table.toggleSort('created_at')}
                />
                <th className="w-[100px]">Ação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Carregando...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Check size={32} style={{ color: 'var(--tfd-status-success)' }} />
                      <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                        Nenhum processo pendente de laudo
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((sol) => {
                  const pacRow = sol.pacientes as Record<string, unknown> | undefined;
                  const laudoStatusRow: StatusLaudo = 'VAZIO';
                  return (
                    <tr
                      key={sol.id as string}
                      className="cursor-pointer"
                      onClick={() => handleOpenLaudo(sol)}
                    >
                      <td>
                        <Link
                          href={`/solicitacoes/${sol.id}?from=laudo-medico`}
                          className="font-medium hover:underline"
                          style={{ color: 'var(--tfd-primary-500)' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {sol.numero_processo as string}
                        </Link>
                      </td>
                      <td className="max-w-[200px] truncate font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                        {pacRow?.nome_completo as string}
                      </td>
                      <td className="hidden md:table-cell" style={{ color: 'var(--tfd-text-secondary)' }}>
                        {(sol.cid10_principal as string) || '\u2014'}
                      </td>
                      <td className="hidden lg:table-cell">
                        <StatusLaudoTag status={laudoStatusRow} />
                      </td>
                      <td className="hidden md:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>
                        {formatDate(sol.created_at as string)}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            className="tfd-btn tfd-btn-primary tfd-btn--sm"
                            title="Preencher laudo"
                            onClick={(e) => { e.stopPropagation(); handleOpenLaudo(sol); }}
                          >
                            <FileHeart size={14} />
                            <span className="hidden sm:inline">Laudo</span>
                          </button>
                          <Link
                            href={`/solicitacoes/${sol.id}?from=laudo-medico`}
                            className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                            title="Ver processo"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Eye size={15} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {table.totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid var(--tfd-surface-border)' }}
          >
            <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
              {(table.page - 1) * 20 + 1}&ndash;{Math.min(table.page * 20, filtered.length)} de {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                className="tfd-btn tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only"
                disabled={table.page <= 1}
                onClick={() => table.setPage(table.page - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm px-2" style={{ color: 'var(--tfd-text-secondary)' }}>
                {table.page} / {table.totalPages}
              </span>
              <button
                className="tfd-btn tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only"
                disabled={table.page >= table.totalPages}
                onClick={() => table.setPage(table.page + 1)}
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
