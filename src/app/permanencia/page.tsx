'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  CalendarClock,
  Search,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Eye,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  User,
  Plus,
  Info,
  Loader2,
  Trash2,
  SendHorizonal,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import { useToast } from '@/shared/components/toast/Toast';
import { listarPermanencias, listarSolicitacoesEmPermanencia, criarPermanencia, atualizarPermanencia, excluirPermanencia, criarProrrogacao } from '@/services/permanencias.service';
import { buscarAjudaCustoPorSolicitacao } from '@/services/ajuda-custo.service';
import { useSupabaseData } from '@/shared/hooks/useSupabaseData';
import { useLookup } from '@/shared/hooks/useLookup';
import DevolverModal from '@/shared/components/devolver-modal/DevolverModal';
import { useDevolucoesPendentes } from '@/shared/hooks/useDevolucoesPendentes';

/* -------------------------------------------------- */
/*  Types                                              */
/* -------------------------------------------------- */

type StatusPermanencia = 'ATIVA' | 'PRORROGADA' | 'ALTA_PENDENTE' | 'CONCLUIDA';

/* -------------------------------------------------- */
/*  Tab config                                         */
/* -------------------------------------------------- */

type TabKey = 'TODAS' | 'DISPONIVEL' | StatusPermanencia;

const TABS: { key: TabKey; label: string }[] = [
  { key: 'TODAS', label: 'Todas' },
  { key: 'DISPONIVEL', label: 'Disponíveis' },
  { key: 'ATIVA', label: 'Ativas' },
  { key: 'PRORROGADA', label: 'Prorrogadas' },
  { key: 'ALTA_PENDENTE', label: 'Alta Pendente' },
  { key: 'CONCLUIDA', label: 'Concluídas' },
];

/* -------------------------------------------------- */
/*  Status styling                                     */
/* -------------------------------------------------- */

const statusStyleMap: Record<StatusPermanencia, { bg: string; text: string; label: string }> = {
  ATIVA: { bg: '#DBEAFE', text: '#1D4ED8', label: 'Ativa' },
  PRORROGADA: { bg: '#FFEDD5', text: '#C2410C', label: 'Prorrogada' },
  ALTA_PENDENTE: { bg: '#FEF3C7', text: '#92400E', label: 'Alta Pendente' },
  CONCLUIDA: { bg: '#DCFCE7', text: '#15803D', label: 'Concluída' },
};

/* -------------------------------------------------- */
/*  Helper                                             */
/* -------------------------------------------------- */

function formatDate(iso: string): string {
  if (!iso) return '—';
  const datePart = iso.includes('T') ? iso.split('T')[0] : iso;
  const [year, month, day] = datePart.split('-');
  return `${day}/${month}/${year}`;
}

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function PermanenciaPage() {
  const toast = useToast();
  const { options: motivoPermOptions, loading: motivoPermLoading } = useLookup('motivo_permanencia');

  const [activeTab, setActiveTab] = useState<TabKey>('TODAS');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [solicitarProrrogacao, setSolicitarProrrogacao] = useState(false);
  const [solicitacaoId, setSolicitacaoId] = useState('');
  const [numProcesso, setNumProcesso] = useState('');
  const [pacienteNome, setPacienteNome] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [devolverItem, setDevolverItem] = useState<any>(null);

  /* ---- Devoluções pendentes ---- */
  const { mapa: devolucoesEnviadas, labelDestino, refresh: refreshDevolucoes } = useDevolucoesPendentes('PERMANENCIA');

  // Form fields — Comunicação de Permanência
  const [dataComunicacao, setDataComunicacao] = useState(new Date().toISOString().split('T')[0]);
  const [comunicadoPor, setComunicadoPor] = useState('');
  const [motivoDescricao, setMotivoDescricao] = useState('');
  const [novaDataRetorno, setNovaDataRetorno] = useState('');

  // Prorrogação fields
  const [diasAdicionais, setDiasAdicionais] = useState('');
  const [justificativaMedica, setJustificativaMedica] = useState('');

  // Ajuda de custo info for cost calculation
  const [ajudaCustoInfo, setAjudaCustoInfo] = useState<{ valor_diaria: number; data_fim: string | null } | null>(null);

  /* ---- Disponíveis: solicitações EM_PERMANENCIA sem registro ---- */
  const [solDisp, setSolDisp] = useState<any[]>([]);
  const [solDispLoading, setSolDispLoading] = useState(false);

  async function refreshDisp() {
    setSolDispLoading(true);
    const { data } = await listarSolicitacoesEmPermanencia();
    setSolDisp(data ?? []);
    setSolDispLoading(false);
  }

  useEffect(() => { refreshDisp(); }, []);

  function resetDrawerForm() {
    setMotivo('');
    setSolicitacaoId('');
    setNumProcesso('');
    setPacienteNome('');
    setSolicitarProrrogacao(false);
    setEditingId(null);
    setDataComunicacao(new Date().toISOString().split('T')[0]);
    setComunicadoPor('');
    setMotivoDescricao('');
    setNovaDataRetorno('');
    setDiasAdicionais('');
    setJustificativaMedica('');
    setAjudaCustoInfo(null);
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
    resetDrawerForm();
  }

  /** Opens drawer for a new permanência from a "disponível" card */
  async function handleOpenNew(sol: any) {
    resetDrawerForm();
    setSolicitacaoId(sol.id);
    setNumProcesso(sol.numero_processo ?? '');
    setPacienteNome(sol.pacientes?.nome_completo ?? '');
    setDrawerOpen(true);

    // Fetch ajuda de custo info for cost calculation
    const { data } = await buscarAjudaCustoPorSolicitacao(sol.id);
    setAjudaCustoInfo(data ? { valor_diaria: data.valor_diaria, data_fim: data.data_fim } : null);
  }

  function handleOpenEdit(perm: any) {
    setEditingId(perm.id);
    setSolicitacaoId(perm.solicitacaoId);
    setNumProcesso(perm.numeroSolicitacao);
    setPacienteNome(perm.pacienteNome);
    setMotivo(perm.motivo ?? '');
    setSolicitarProrrogacao(false);
    setDrawerOpen(true);
  }

  function handleOpenDelete(perm: any) {
    setDeleteConfirmId(perm.id);
    setDeleteConfirmName(perm.pacienteNome);
  }

  async function handleConfirmDelete() {
    if (!deleteConfirmId) return;
    const { error } = await excluirPermanencia(deleteConfirmId);
    if (error) {
      toast.error('Erro ao excluir', (error as any).message);
    } else {
      toast.success('Permanência excluída', 'O registro foi removido com sucesso.');
      refreshAll();
    }
    setDeleteConfirmId(null);
    setDeleteConfirmName('');
  }

  /* ---- Fetch real data ---- */
  const { data: permanenciasRaw, loading, refresh } = useSupabaseData(
    useCallback(() => listarPermanencias({ search }), [search]),
    [search],
  );

  function refreshAll() {
    refresh();
    refreshDisp();
  }

  /* ---- Map Supabase rows to display shape ---- */
  const items = useMemo(() => {
    return permanenciasRaw.map((p: any) => {
      const prorrogacoes = (p.prorrogacoes ?? []) as any[];

      let statusDisplay: StatusPermanencia = 'ATIVA';
      if (prorrogacoes.length > 0) statusDisplay = 'PRORROGADA';
      if (p.data_alta) statusDisplay = 'CONCLUIDA';

      return {
        _type: 'PERMANENCIA' as const,
        id: p.id,
        solicitacaoId: p.solicitacao_id,
        numeroSolicitacao: p.solicitacoes?.numero_processo ?? '—',
        pacienteNome: p.solicitacoes?.pacientes?.nome_completo ?? '—',
        destino: p.cidade_destino ?? p.local_permanencia ?? '—',
        dataInicio: p.data_inicio ?? p.registrado_em?.split('T')[0] ?? '',
        dataFimPrevista: p.data_fim_prevista ?? p.data_retorno_prevista ?? '',
        totalDias: p.dias_total ?? 0,
        statusDisplay: statusDisplay as StatusPermanencia,
        solicitacaoStatus: p.solicitacoes?.status ?? 'EM_PERMANENCIA',
        totalProrrogacoes: prorrogacoes.length,
        observacoes: p.observacoes ?? null,
        motivo: p.motivo ?? null,
        prorrogacoes: prorrogacoes.map((pr: any) => ({
          id: pr.id,
          dataInicio: pr.data_inicio ?? '',
          dataFim: pr.data_fim ?? '',
          justificativa: pr.justificativa ?? '',
          aprovadoPor: pr.decisao_por ?? null,
          dataAprovacao: pr.decisao_em?.split('T')[0] ?? null,
        })),
        raw: p,
      };
    });
  }, [permanenciasRaw]);

  /* ---- Disponíveis mapped to card shape ---- */
  const dispItems = useMemo(() => {
    return solDisp.map((sol: any) => ({
      _type: 'DISPONIVEL' as const,
      id: sol.id,
      solicitacaoId: sol.id,
      numeroSolicitacao: sol.numero_processo ?? '—',
      pacienteNome: sol.pacientes?.nome_completo ?? '—',
      destino: '—',
      dataInicio: sol.created_at?.split('T')[0] ?? '',
      dataFimPrevista: '',
      totalDias: 0,
      statusDisplay: 'ATIVA' as StatusPermanencia,
      solicitacaoStatus: sol.status ?? 'EM_PERMANENCIA',
      totalProrrogacoes: 0,
      observacoes: null,
      motivo: null,
      prorrogacoes: [] as any[],
      raw: sol,
    }));
  }, [solDisp]);

  /* ---- Unified rows: disponíveis + permanências ---- */
  const allRows = useMemo(() => {
    if (activeTab === 'DISPONIVEL') return dispItems;
    if (activeTab === 'TODAS') return [...dispItems, ...items];
    return items.filter((p) => p.statusDisplay === activeTab);
  }, [dispItems, items, activeTab]);

  /* ---- Filter by search (client-side) ---- */
  const filtered = useMemo(() => {
    if (search === '') return allRows;
    const q = search.toLowerCase();
    return allRows.filter((p) =>
      p.pacienteNome.toLowerCase().includes(q) ||
      p.numeroSolicitacao.toLowerCase().includes(q) ||
      p.destino.toLowerCase().includes(q),
    );
  }, [allRows, search]);

  /* ---- Summary counters ---- */
  const counts = useMemo(() => {
    return {
      disponiveis: solDisp.length,
      ativas: items.filter((p) => p.statusDisplay === 'ATIVA').length,
      prorrogadas: items.filter((p) => p.statusDisplay === 'PRORROGADA').length,
      altaPendente: items.filter((p) => p.statusDisplay === 'ALTA_PENDENTE').length,
      concluidas: items.filter((p) => p.statusDisplay === 'CONCLUIDA').length,
    };
  }, [items]);

  /* ---- Cost calculation ---- */
  const custoAdicional = useMemo(() => {
    if (!ajudaCustoInfo || !novaDataRetorno || !ajudaCustoInfo.data_fim) return null;
    const dataFimOriginal = new Date(ajudaCustoInfo.data_fim + 'T00:00:00');
    const novaData = new Date(novaDataRetorno + 'T00:00:00');
    const diffMs = novaData.getTime() - dataFimOriginal.getTime();
    const diasExtras = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    if (diasExtras <= 0) return null;
    return {
      diasExtras,
      valorDiaria: ajudaCustoInfo.valor_diaria,
      valorTotal: diasExtras * ajudaCustoInfo.valor_diaria,
    };
  }, [ajudaCustoInfo, novaDataRetorno]);

  /* ---- Form submission ---- */
  async function handleSubmitPermanencia() {
    if (!solicitacaoId) {
      toast.warning('Campo obrigatório', 'Selecione o paciente.');
      return;
    }
    if (!dataComunicacao) {
      toast.warning('Campo obrigatório', 'Informe a data da comunicação.');
      return;
    }
    if (!motivo) {
      toast.warning('Campo obrigatório', 'Selecione o motivo da permanência.');
      return;
    }
    if (!novaDataRetorno) {
      toast.warning('Campo obrigatório', 'Informe a nova data de retorno prevista.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        solicitacao_id: solicitacaoId,
        data_comunicacao: dataComunicacao,
        comunicado_por: comunicadoPor || null,
        motivo,
        motivo_descricao: motivo === 'OUTROS' ? motivoDescricao || null : null,
        nova_data_retorno_prevista: novaDataRetorno,
      };

      const result = editingId
        ? await atualizarPermanencia(editingId, payload)
        : await criarPermanencia(payload);

      if (result.error) {
        const err = result.error as { message?: string };
        toast.error(editingId ? 'Erro ao atualizar' : 'Erro ao registrar', err.message ?? 'Tente novamente.');
        return;
      }

      // If prorrogação requested and this is a new permanência, create it
      if (solicitarProrrogacao && !editingId && result.data) {
        const permId = (result.data as any).id;
        const diasAdd = parseInt(diasAdicionais, 10);
        if (permId && diasAdd > 0) {
          const novaDataProrrogacao = new Date(novaDataRetorno + 'T00:00:00');
          novaDataProrrogacao.setDate(novaDataProrrogacao.getDate() + diasAdd);

          await criarProrrogacao({
            permanencia_id: permId,
            justificativa_medica: justificativaMedica,
            documento_justificativa_id: null as any,
            dias_adicionais_solicitados: diasAdd,
            nova_data_retorno: novaDataProrrogacao.toISOString().split('T')[0],
            impacto_diarias_valor: custoAdicional ? custoAdicional.valorTotal : null,
          });
        }
      }

      toast.success(
        editingId ? 'Permanência atualizada!' : 'Permanência registrada!',
        editingId ? 'As alterações foram salvas com sucesso.' : 'O registro de permanência foi salvo no sistema.',
      );
      setDrawerOpen(false);
      resetDrawerForm();
      refreshAll();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error('Erro inesperado', e.message ?? 'Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Permanência e Prorrogações"
        subtitle="Controle de permanência, prorrogações e alta de pacientes"
      />

      {/* ========== Summary Cards ========== */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#EDE9FE', color: '#7C3AED' }}
          >
            <Plus size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Disponíveis</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{counts.disponiveis}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#DBEAFE', color: '#3B82F6' }}
          >
            <CalendarClock size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Ativas</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{counts.ativas}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#FFEDD5', color: '#EA580C' }}
          >
            <RefreshCw size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Prorrogadas</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{counts.prorrogadas}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#FEF3C7', color: '#F59E0B' }}
          >
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Alta Pendente</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-status-warning)' }}>{counts.altaPendente}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#DCFCE7', color: '#16A34A' }}
          >
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Concluídas</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-status-success)' }}>{counts.concluidas}</p>
          </div>
        </div>
      </div>

      {/* ========== Tabs + Search ========== */}
      <div className="tfd-toolbar mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-1 flex-wrap">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = tab.key === 'TODAS'
              ? solDisp.length + items.length
              : tab.key === 'DISPONIVEL'
                ? solDisp.length
                : items.filter((p) => p.statusDisplay === tab.key).length;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="tfd-btn tfd-btn--sm"
                style={{
                  backgroundColor: isActive ? 'var(--tfd-primary-50)' : 'transparent',
                  color: isActive ? 'var(--tfd-primary-700)' : 'var(--tfd-text-secondary)',
                  borderColor: isActive ? 'var(--tfd-primary-200)' : 'transparent',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {tab.label}
                <span
                  className="text-xs ml-1 px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: isActive ? 'var(--tfd-primary-100)' : 'var(--tfd-surface-100)',
                    color: isActive ? 'var(--tfd-primary-700)' : 'var(--tfd-text-muted)',
                    fontSize: '0.6875rem',
                    fontWeight: 600,
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative flex-1 max-w-xs min-w-[200px]">
          <Search
            size={16}
            className="tfd-input-leading-icon"
            style={{ color: 'var(--tfd-text-muted)' }}
          />
          <input
            type="text"
            className="tfd-input tfd-input--sm tfd-input--with-leading-icon"
            placeholder="Buscar paciente ou destino..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ========== Card List ========== */}
      <div className="space-y-3">
        {(loading || solDispLoading) ? (
          <div className="tfd-card">
            <div className="flex flex-col items-center gap-2 py-12">
              <Loader2 size={32} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
              <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                Carregando permanências...
              </p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="tfd-card">
            <div className="flex flex-col items-center gap-2 py-12">
              <CalendarClock size={32} style={{ color: 'var(--tfd-text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                Nenhuma permanência encontrada
              </p>
            </div>
          </div>
        ) : (
          filtered.map((perm) => {
            const isDisponivel = perm._type === 'DISPONIVEL';

            /* ---- Disponível card ---- */
            if (isDisponivel) {
              return (
                <div
                  key={`disp-${perm.id}`}
                  className="tfd-card cursor-pointer"
                  style={{ borderLeft: '3px solid #7C3AED' }}
                  onClick={() => handleOpenNew(perm.raw)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Link
                          href={`/solicitacoes/${perm.solicitacaoId}`}
                          className="font-medium text-sm hover:underline"
                          style={{ color: 'var(--tfd-primary-500)' }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {perm.numeroSolicitacao}
                        </Link>
                        <span
                          className="tfd-tag tfd-tag--rounded"
                          style={{ backgroundColor: '#EDE9FE', color: '#7C3AED' }}
                        >
                          Aguardando registro
                        </span>
                      </div>
                      <p className="font-semibold text-base" style={{ color: 'var(--tfd-text-primary)' }}>
                        {perm.pacienteNome}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Link
                        href={`/solicitacoes/${perm.solicitacaoId}`}
                        className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                        title="Ver processo completo"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Eye size={15} />
                      </Link>
                      <span
                        className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                        title="Registrar permanência"
                      >
                        <Plus size={15} style={{ color: '#7C3AED' }} />
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 flex-wrap text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} />
                      <span>Solicitado em {formatDate(perm.dataInicio)}</span>
                    </div>
                  </div>
                </div>
              );
            }

            /* ---- Permanência card (existing) ---- */
            const { bg, text, label } = statusStyleMap[perm.statusDisplay as StatusPermanencia];
            const isExpanded = expandedId === perm.id;
            const aguardandoRetorno = labelDestino(perm.solicitacaoId);

            return (
              <div key={perm.id} className={`tfd-card ${aguardandoRetorno ? '' : 'cursor-pointer'}`} style={{ opacity: aguardandoRetorno ? 0.5 : undefined, pointerEvents: aguardandoRetorno ? 'none' : undefined }} onClick={aguardandoRetorno ? undefined : () => handleOpenEdit(perm)}>
                {/* ---- Header row ---- */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Link
                        href={`/solicitacoes/${perm.solicitacaoId}`}
                        className="font-medium text-sm hover:underline"
                        style={{ color: 'var(--tfd-primary-500)' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {perm.numeroSolicitacao}
                      </Link>
                      <span
                        className="tfd-tag tfd-tag--rounded tfd-tag--dot"
                        style={{ backgroundColor: bg, color: text }}
                      >
                        {label}
                      </span>
                      {perm.totalProrrogacoes > 0 && (
                        <span
                          className="tfd-tag tfd-tag--rounded"
                          style={{ backgroundColor: '#FFEDD5', color: '#C2410C' }}
                        >
                          <RefreshCw size={10} />
                          {perm.totalProrrogacoes} prorrog.
                        </span>
                      )}
                      {aguardandoRetorno && (
                        <span
                          className="tfd-tag tfd-tag--rounded"
                          style={{ backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '0.625rem' }}
                        >
                          Ag. retorno — {aguardandoRetorno}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-base" style={{ color: 'var(--tfd-text-primary)' }}>
                      {perm.pacienteNome}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Link
                      href={`/solicitacoes/${perm.solicitacaoId}`}
                      className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                      title="Ver processo completo"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Eye size={15} />
                    </Link>
                    <button
                      type="button"
                      className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                      title="Devolver"
                      onClick={(e) => { e.stopPropagation(); setDevolverItem(perm); }}
                    >
                      <SendHorizonal size={15} />
                    </button>
                    <button
                      type="button"
                      className="tfd-btn tfd-btn-danger tfd-btn--icon-only"
                      title="Excluir permanência"
                      onClick={(e) => { e.stopPropagation(); handleOpenDelete(perm); }}
                    >
                      <Trash2 size={15} />
                    </button>
                    <button
                      className="tfd-btn tfd-btn--text tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only"
                      title={isExpanded ? 'Recolher' : 'Expandir'}
                      onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : perm.id); }}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* ---- Info row ---- */}
                <div className="flex items-center gap-4 mt-3 flex-wrap text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
                  <div className="flex items-center gap-1.5">
                    <MapPin size={14} />
                    <span className="truncate max-w-[240px]">{perm.destino}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    <span>
                      {formatDate(perm.dataInicio)} — {formatDate(perm.dataFimPrevista)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} />
                    <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                      {perm.totalDias} dias
                    </span>
                  </div>
                </div>

                {/* ---- Observations ---- */}
                {perm.observacoes && (
                  <p className="mt-2 text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                    {perm.observacoes}
                  </p>
                )}

                {/* ---- Expanded: Prorrogacoes ---- */}
                {isExpanded && perm.prorrogacoes.length > 0 && (
                  <div
                    className="mt-4 pt-4"
                    style={{ borderTop: '1px solid var(--tfd-surface-border)' }}
                  >
                    <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
                      Histórico de Prorrogações
                    </h4>
                    <div className="space-y-3">
                      {perm.prorrogacoes.map((pror: any, idx: number) => (
                        <div
                          key={pror.id}
                          className="flex items-start gap-3 p-3 rounded-lg"
                          style={{ backgroundColor: 'var(--tfd-surface-50)' }}
                        >
                          <div
                            className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 text-xs font-bold"
                            style={{
                              backgroundColor: '#FFEDD5',
                              color: '#C2410C',
                            }}
                          >
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                                {formatDate(pror.dataInicio)} — {formatDate(pror.dataFim)}
                              </span>
                              {pror.aprovadoPor && (
                                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--tfd-status-success)' }}>
                                  <CheckCircle2 size={12} />
                                  Aprovada
                                </span>
                              )}
                            </div>
                            <p className="text-sm mt-0.5" style={{ color: 'var(--tfd-text-secondary)' }}>
                              {pror.justificativa}
                            </p>
                            {pror.aprovadoPor && (
                              <p className="flex items-center gap-1 text-xs mt-1" style={{ color: 'var(--tfd-text-muted)' }}>
                                <User size={11} />
                                Aprovado por {pror.aprovadoPor} em {formatDate(pror.dataAprovacao!)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isExpanded && perm.prorrogacoes.length === 0 && (
                  <div
                    className="mt-4 pt-4 text-center py-6"
                    style={{ borderTop: '1px solid var(--tfd-surface-border)' }}
                  >
                    <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                      Nenhuma prorrogação registrada
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ========== Modal de Confirmação de Exclusão ========== */}
      {deleteConfirmId && (
        <>
          <div className="tfd-overlay-backdrop" onClick={() => setDeleteConfirmId(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="tfd-dialog w-full max-w-sm">
              <div className="tfd-dialog-header">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#FEF2F2]">
                    <Trash2 size={16} className="text-[#EF4444]" />
                  </div>
                  <span>Excluir permanência</span>
                </div>
              </div>
              <div className="tfd-dialog-content">
                <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
                  Tem certeza que deseja excluir a permanência de <strong>{deleteConfirmName}</strong>? Esta ação não pode ser desfeita.
                </p>
              </div>
              <div className="tfd-dialog-footer">
                <button className="tfd-btn tfd-btn-secondary" onClick={() => setDeleteConfirmId(null)}>
                  Cancelar
                </button>
                <button className="tfd-btn" style={{ background: '#EF4444', color: 'white' }} onClick={handleConfirmDelete}>
                  <Trash2 size={14} />
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========== Registrar / Editar Permanência Drawer ========== */}
      <Drawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        title={editingId ? 'Editar Permanência' : 'Registrar Permanência'}
        width="480px"
        footer={
          <>
            <button
              className="tfd-btn tfd-btn-secondary"
              onClick={handleCloseDrawer}
            >
              Cancelar
            </button>
            <button
              className="tfd-btn tfd-btn-primary"
              disabled={submitting}
              onClick={handleSubmitPermanencia}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {editingId ? 'Salvando...' : 'Registrando...'}
                </>
              ) : (
                editingId ? 'Salvar Alterações' : 'Registrar'
              )}
            </button>
          </>
        }
      >
        {/* Section: Processo (read-only — comes from the clicked card) */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-3" style={{ backgroundColor: 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{pacienteNome || '—'}</p>
            <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Processo: <strong style={{ color: 'var(--tfd-primary-500)' }}>{numProcesso}</strong></p>
          </div>
        </div>

        <hr className="tfd-divider" />

        {/* ---- Comunicação de Permanência ---- */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          Comunicação de Permanência
        </h3>

        <FormField label="Data da comunicação" required>
          <input
            type="date"
            className="tfd-input"
            value={dataComunicacao}
            onChange={(e) => setDataComunicacao(e.target.value)}
          />
        </FormField>

        <FormField label="Comunicado por" required>
          <select
            className="tfd-input"
            value={comunicadoPor}
            onChange={(e) => setComunicadoPor(e.target.value)}
          >
            <option value="">Selecione...</option>
            <option value="PACIENTE">Paciente</option>
            <option value="RESPONSAVEL">Responsável</option>
            <option value="UNIDADE_DESTINO">Unidade de Destino</option>
            <option value="REGIONAL">Regional</option>
          </select>
        </FormField>

        <FormField label="Motivo" required>
          <select
            className="tfd-input"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            disabled={motivoPermLoading}
          >
            <option value="">{motivoPermLoading ? 'Carregando...' : 'Selecione...'}</option>
            {motivoPermOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FormField>

        {motivo === 'OUTROS' && (
          <FormField label="Descrição do motivo" required>
            <textarea
              className="tfd-input"
              rows={3}
              placeholder="Descreva o motivo da permanência..."
              value={motivoDescricao}
              onChange={(e) => setMotivoDescricao(e.target.value)}
            />
          </FormField>
        )}

        <FormField label="Nova data de retorno prevista" required>
          <input
            type="date"
            className="tfd-input"
            value={novaDataRetorno}
            onChange={(e) => setNovaDataRetorno(e.target.value)}
          />
        </FormField>

        {/* ---- Cost impact calculation ---- */}
        {custoAdicional && (
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
                {custoAdicional.diasExtras} dia{custoAdicional.diasExtras !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
              <span>Valor da diária:</span>
              <span className="font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                R$ {custoAdicional.valorDiaria.toFixed(2).replace('.', ',')}
              </span>
            </div>
            <hr style={{ borderColor: 'var(--tfd-warning-200, #FDE68A)', margin: '4px 0' }} />
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold" style={{ color: 'var(--tfd-warning-700, #92400E)' }}>
                Custo adicional estimado:
              </span>
              <span className="font-bold text-base" style={{ color: 'var(--tfd-warning-700, #92400E)' }}>
                R$ {custoAdicional.valorTotal.toFixed(2).replace('.', ',')}
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
            checked={solicitarProrrogacao}
            onChange={(e) => setSolicitarProrrogacao(e.target.checked)}
          />
          <span className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>
            Solicitar prorrogação?
          </span>
        </label>

        {solicitarProrrogacao && (
          <>
            <FormField label="Dias adicionais" required>
              <input
                type="number"
                className="tfd-input"
                min={1}
                placeholder="Ex: 5"
                value={diasAdicionais}
                onChange={(e) => setDiasAdicionais(e.target.value)}
              />
            </FormField>

            <FormField label="Justificativa médica" required>
              <textarea
                className="tfd-input"
                rows={3}
                placeholder="Justificativa médica para a prorrogação..."
                value={justificativaMedica}
                onChange={(e) => setJustificativaMedica(e.target.value)}
              />
            </FormField>

            <FormField label="Documento justificativa" required>
              <input type="file" className="tfd-input" />
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

      <DevolverModal
        open={!!devolverItem}
        onClose={() => setDevolverItem(null)}
        setorAtual="PERMANENCIA"
        solicitacaoId={devolverItem?.solicitacaoId ?? ''}
        statusAtual={devolverItem?.solicitacaoStatus ?? 'EM_PERMANENCIA'}
        label={`${devolverItem?.numeroSolicitacao ?? ''} — ${devolverItem?.pacienteNome ?? 'Paciente'}`}
        onSuccess={() => { refreshAll(); refreshDevolucoes(); toast.success('Solicitação devolvida', 'A solicitação foi encaminhada ao setor selecionado.'); }}
      />
    </>
  );
}
