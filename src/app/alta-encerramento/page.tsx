'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  ArrowRightLeft,
  UserX,
  UserMinus,
  Skull,
  Archive,
  Plane,
  Wallet,
  FileText,
  Puzzle,
  Calendar,
  Stethoscope,
  Plus,
  Info,
  Loader2,
  SendHorizonal,
  Trash2,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import { useToast } from '@/shared/components/toast/Toast';
import { listarEncerramentos, criarEncerramento, atualizarEncerramento, excluirEncerramento, listarSolicitacoesParaEncerramento } from '@/services/encerramentos.service';
import { useSupabaseData } from '@/shared/hooks/useSupabaseData';
import { useLookup } from '@/shared/hooks/useLookup';
import DevolverModal from '@/shared/components/devolver-modal/DevolverModal';
import { useDevolucoesPendentes } from '@/shared/hooks/useDevolucoesPendentes';

/* -------------------------------------------------- */
/*  Local types (previously from mock)                 */
/* -------------------------------------------------- */

type MotivoEncerramento = 'ALTA_MEDICA' | 'TRANSFERENCIA' | 'DESISTENCIA' | 'ABANDONO' | 'OBITO';
type StatusEncerramento = 'PENDENTE' | 'CONCLUIDO';

interface ConciliacaoDetail {
  passagemIda: boolean;
  embarqueConfirmado: boolean;
  passagemRetornoEmitida: boolean;
  diariasPagas: boolean;
  diariasPendentes: number;
  complementosConciliados: boolean;
  complementosPendentes: number;
  documentosAnexados: boolean;
}

interface EncerramentoItem {
  id: string;
  solicitacaoId: string;
  numeroProcesso: string;
  pacienteNome: string;
  cidCodigo: string;
  cidDescricao: string;
  motivo: MotivoEncerramento;
  dataAlta: string;
  status: StatusEncerramento;
  solicitacaoStatus: string;
  passagemRetorno: 'EMITIDA' | 'PENDENTE' | 'NAO_APLICAVEL';
  diarias: 'CONCILIADA' | 'PENDENTE';
  documentosAlta: 'ANEXADO' | 'PENDENTE';
  complementosPendentes: number;
  observacoes?: string | null;
  conciliacao: ConciliacaoDetail;
}

/* -------------------------------------------------- */
/*  Tab config                                         */
/* -------------------------------------------------- */

type TabKey = 'DISPONIVEIS' | 'ALTA_MEDICA' | 'TRANSFERENCIA' | 'DESISTENCIA' | 'ABANDONO' | 'OBITO';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'DISPONIVEIS', label: 'Disponíveis' },
  { key: 'ALTA_MEDICA', label: 'Alta Médica' },
  { key: 'TRANSFERENCIA', label: 'Transferência' },
  { key: 'DESISTENCIA', label: 'Desistência' },
  { key: 'ABANDONO', label: 'Abandono' },
  { key: 'OBITO', label: 'Óbito' },
];

/* -------------------------------------------------- */
/*  Motivo styling                                     */
/* -------------------------------------------------- */

const motivoStyleMap: Record<MotivoEncerramento, { bg: string; text: string; label: string }> = {
  ALTA_MEDICA: { bg: '#DCFCE7', text: '#15803D', label: 'Alta Médica' },
  TRANSFERENCIA: { bg: '#DBEAFE', text: '#1D4ED8', label: 'Transferência' },
  DESISTENCIA: { bg: '#FEF3C7', text: '#92400E', label: 'Desistência' },
  ABANDONO: { bg: '#FFEDD5', text: '#C2410C', label: 'Abandono' },
  OBITO: { bg: '#FEE2E2', text: '#B91C1C', label: 'Óbito' },
};

/* -------------------------------------------------- */
/*  Status styling                                     */
/* -------------------------------------------------- */

const statusStyleMap: Record<StatusEncerramento, { bg: string; text: string; label: string }> = {
  PENDENTE: { bg: '#FEF3C7', text: '#92400E', label: 'Pendente' },
  CONCLUIDO: { bg: '#DCFCE7', text: '#15803D', label: 'Concluído' },
};

/* -------------------------------------------------- */
/*  Helpers                                            */
/* -------------------------------------------------- */

function formatDate(iso: string): string {
  if (!iso) return '—';
  // Handle ISO datetime (with T) or plain date (YYYY-MM-DD)
  const datePart = iso.includes('T') ? iso.split('T')[0] : iso;
  const [year, month, day] = datePart.split('-');
  if (!year || !month || !day) return iso;
  return `${day}/${month}/${year}`;
}

/**
 * For OBITO and TRANSFERENCIA, passagem de retorno is N/A,
 * so we skip that check when determining if archiving is allowed.
 */
function canArchive(enc: EncerramentoItem): boolean {
  const c = enc.conciliacao;
  const retornoNA = enc.motivo === 'OBITO' || enc.motivo === 'TRANSFERENCIA';

  return (
    c.passagemIda &&
    c.embarqueConfirmado &&
    (retornoNA || c.passagemRetornoEmitida) &&
    c.diariasPagas &&
    c.diariasPendentes === 0 &&
    c.complementosConciliados &&
    c.complementosPendentes === 0 &&
    c.documentosAnexados
  );
}

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function AltaEncerramentoPage() {
  const toast = useToast();
  const { options: motivoEncOptions, loading: motivoEncLoading } = useLookup('motivo_encerramento');

  const [activeTab, setActiveTab] = useState<TabKey>('DISPONIVEIS');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* ---- Disponíveis: solicitações EM_PERMANENCIA sem encerramento ---- */
  const [disponiveis, setDisponiveis] = useState<any[]>([]);
  const [disponiveisLoading, setDisponiveisLoading] = useState(false);

  async function refreshDisp() {
    setDisponiveisLoading(true);
    const { data } = await listarSolicitacoesParaEncerramento();
    setDisponiveis(data ?? []);
    setDisponiveisLoading(false);
  }

  useEffect(() => { refreshDisp(); }, []);

  /** Opens drawer for a new encerramento from a "disponível" card */
  function handleOpenNew(sol: any) {
    resetDrawerForm();
    setSolicitacaoId(sol.id);
    setNumProcesso(sol.numero_processo ?? '');
    setPacienteNome(sol.pacientes?.nome_completo ?? '');
    setDrawerOpen(true);
  }

  /* ---- Drawer state ---- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [solicitacaoId, setSolicitacaoId] = useState('');
  const [numProcesso, setNumProcesso] = useState('');
  const [pacienteNome, setPacienteNome] = useState('');
  const [motivo, setMotivo] = useState('');
  const [dataAlta, setDataAlta] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [relatorioAlta, setRelatorioAlta] = useState<File | null>(null);
  const [certidaoObito, setCertidaoObito] = useState<File | null>(null);
  const [localObito, setLocalObito] = useState('');

  /* ---- Delete confirm state ---- */
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  /* ---- Devolver state ---- */
  const [devolverItem, setDevolverItem] = useState<any>(null);

  /* ---- Devoluções pendentes ---- */
  const { mapa: devolucoesEnviadas, labelDestino, refresh: refreshDevolucoes } = useDevolucoesPendentes('ENCERRAMENTO');

  const resetDrawerForm = () => {
    setSolicitacaoId('');
    setNumProcesso('');
    setPacienteNome('');
    setMotivo('');
    setDataAlta('');
    setObservacoes('');
    setRelatorioAlta(null);
    setCertidaoObito(null);
    setLocalObito('');
    setEditingId(null);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    resetDrawerForm();
  };

  /* ---- Fetch real data from Supabase ---- */
  const fetchEncerramentos = useCallback(
    () => listarEncerramentos({ search }),
    [search],
  );

  const { data: encerramentosRaw, loading, refresh } = useSupabaseData(
    fetchEncerramentos,
    [search],
  );

  function refreshAll() {
    refresh();
    refreshDisp();
  }

  /* ---- Map Supabase rows to display format ---- */
  const items = useMemo<EncerramentoItem[]>(() => {
    return encerramentosRaw.map((enc: any) => ({
      id: enc.id,
      solicitacaoId: enc.solicitacao_id,
      numeroProcesso: enc.solicitacoes?.numero_processo ?? '—',
      pacienteNome: enc.solicitacoes?.pacientes?.nome_completo ?? '—',
      motivo: (enc.motivo ?? 'ALTA_MEDICA') as MotivoEncerramento,
      status: (enc.relatorio_alta_doc_id ? 'CONCLUIDO' : 'PENDENTE') as StatusEncerramento,
      solicitacaoStatus: enc.solicitacoes?.status ?? 'CONCLUIDO',
      dataAlta: enc.data_encerramento ?? enc.created_at?.split('T')[0] ?? '',
      cidCodigo: '—',
      cidDescricao: '',
      observacoes: enc.observacoes ?? null,
      passagemRetorno: 'PENDENTE' as const,
      diarias: 'PENDENTE' as const,
      documentosAlta: enc.relatorio_alta_doc_id ? 'ANEXADO' as const : 'PENDENTE' as const,
      complementosPendentes: 0,
      conciliacao: {
        passagemIda: false,
        embarqueConfirmado: false,
        passagemRetornoEmitida: false,
        diariasPagas: false,
        diariasPendentes: 0,
        complementosConciliados: false,
        complementosPendentes: 0,
        documentosAnexados: !!enc.relatorio_alta_doc_id,
      },
    }));
  }, [encerramentosRaw]);

  /* ---- Filter by tab (client-side) ---- */
  const filtered = useMemo(() => {
    // DISPONIVEIS tab shows the disponíveis cards, not the encerramentos list
    if (activeTab === 'DISPONIVEIS') return [];
    // Other tabs filter encerramentos by motivo
    return items.filter((e) => {
      const matchesTab = e.motivo === activeTab;
      const matchesSearch =
        search === '' ||
        e.pacienteNome.toLowerCase().includes(search.toLowerCase()) ||
        e.numeroProcesso.toLowerCase().includes(search.toLowerCase()) ||
        (e.cidCodigo ?? '').toLowerCase().includes(search.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [items, activeTab, search]);

  /* ---- Filter disponíveis by search ---- */
  const filteredDisp = useMemo(() => {
    if (activeTab !== 'DISPONIVEIS') return [];
    if (!search) return disponiveis;
    const s = search.toLowerCase();
    return disponiveis.filter((sol: any) =>
      (sol.numero_processo ?? '').toLowerCase().includes(s) ||
      (sol.pacientes?.nome_completo ?? '').toLowerCase().includes(s)
    );
  }, [disponiveis, activeTab, search]);

  /* ---- Summary counters ---- */
  const counts = useMemo(() => {
    return {
      altaMedica: items.filter((e) => e.motivo === 'ALTA_MEDICA').length,
      transferencia: items.filter((e) => e.motivo === 'TRANSFERENCIA').length,
      desistencia: items.filter((e) => e.motivo === 'DESISTENCIA').length,
      abandono: items.filter((e) => e.motivo === 'ABANDONO').length,
      obito: items.filter((e) => e.motivo === 'OBITO').length,
    };
  }, [items]);

  /* ---- Tab counts ---- */
  const tabCounts = useMemo<Record<TabKey, number>>(() => {
    return {
      DISPONIVEIS: disponiveis.length,
      ALTA_MEDICA: items.filter((e) => e.motivo === 'ALTA_MEDICA').length,
      TRANSFERENCIA: items.filter((e) => e.motivo === 'TRANSFERENCIA').length,
      DESISTENCIA: items.filter((e) => e.motivo === 'DESISTENCIA').length,
      ABANDONO: items.filter((e) => e.motivo === 'ABANDONO').length,
      OBITO: items.filter((e) => e.motivo === 'OBITO').length,
    };
  }, [items, disponiveis]);

  /* ---- Edit / Delete handlers ---- */
  function handleOpenEdit(enc: EncerramentoItem) {
    setEditingId(enc.id);
    setSolicitacaoId(enc.solicitacaoId);
    setNumProcesso(enc.numeroProcesso);
    setPacienteNome(enc.pacienteNome);
    setMotivo(enc.motivo);
    setDataAlta(enc.dataAlta);
    setObservacoes(enc.observacoes ?? '');
    setRelatorioAlta(null);
    setCertidaoObito(null);
    setLocalObito('');
    setDrawerOpen(true);
  }

  function handleOpenDelete(enc: EncerramentoItem) {
    setDeleteConfirmId(enc.id);
    setDeleteConfirmName(enc.pacienteNome);
  }

  async function handleConfirmDelete() {
    if (!deleteConfirmId) return;
    const { error } = await excluirEncerramento(deleteConfirmId);
    if (error) {
      toast.error('Erro ao excluir', (error as any).message);
    } else {
      toast.success('Encerramento excluído', 'O registro foi removido.');
      refreshAll();
    }
    setDeleteConfirmId(null);
    setDeleteConfirmName('');
  }

  /* ---- Form submission ---- */
  async function handleSubmitEncerramento() {
    if (!solicitacaoId) {
      toast.warning('Campo obrigatório', 'Selecione o paciente.');
      return;
    }
    const payload = {
      solicitacao_id: solicitacaoId,
      motivo: (motivo as any) || 'ALTA_MEDICA',
      data_encerramento: dataAlta,
      observacoes: observacoes || null,
    } as any;

    try {
      const result = editingId
        ? await atualizarEncerramento(editingId, payload)
        : await criarEncerramento(payload);
      if (result.error) {
        toast.error(
          editingId ? 'Erro ao atualizar' : 'Erro ao registrar',
          (result.error as any).message,
        );
        return;
      }
      toast.success(
        editingId ? 'Encerramento atualizado!' : 'Encerramento registrado!',
        editingId ? 'As alterações foram salvas.' : 'O processo foi encerrado.',
      );
      handleCloseDrawer();
      refreshAll();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error('Erro inesperado', e.message ?? 'Tente novamente');
    }
  }

  return (
    <>
      <PageHeader
        title="Alta e Encerramento"
        subtitle="Gestão de altas, encerramentos e conciliação de processos TFD"
      />

      {/* ========== Summary Cards ========== */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#DCFCE7', color: '#16A34A' }}
          >
            <ClipboardCheck size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Alta Médica</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{counts.altaMedica}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#DBEAFE', color: '#3B82F6' }}
          >
            <ArrowRightLeft size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Transferência</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{counts.transferencia}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#FEF3C7', color: '#F59E0B' }}
          >
            <UserX size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Desistência</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{counts.desistencia}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#FFEDD5', color: '#EA580C' }}
          >
            <UserMinus size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Abandono</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{counts.abandono}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3 col-span-2 xl:col-span-1">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#FEE2E2', color: '#EF4444' }}
          >
            <Skull size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Óbito</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-status-danger)' }}>{counts.obito}</p>
          </div>
        </div>
      </div>

      {/* ========== Tabs + Search ========== */}
      <div className="tfd-toolbar mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-1 flex-wrap">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = tabCounts[tab.key];
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
            placeholder="Buscar paciente, processo ou CID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ========== Content by tab ========== */}
      <div className="space-y-3">
        {(loading || disponiveisLoading) ? (
          <div className="tfd-card">
            <div className="flex flex-col items-center gap-2 py-12">
              <Loader2 size={32} className="animate-spin" style={{ color: 'var(--tfd-text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                Carregando...
              </p>
            </div>
          </div>
        ) : activeTab === 'DISPONIVEIS' ? (
          /* ===== Tab: Disponíveis — cards de processos ativos ===== */
          filteredDisp.length === 0 ? (
            <div className="tfd-card">
              <div className="flex flex-col items-center gap-2 py-12">
                <Archive size={32} style={{ color: 'var(--tfd-text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                  Nenhum processo disponível para encerramento
                </p>
              </div>
            </div>
          ) : (
            filteredDisp.map((sol: any) => (
              <div
                key={sol.id}
                className="tfd-card cursor-pointer"
                style={{ borderLeft: '3px solid var(--tfd-primary-500)' }}
                onClick={() => handleOpenNew(sol)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <Link
                        href={`/solicitacoes/${sol.id}`}
                        className="font-medium text-sm hover:underline"
                        style={{ color: 'var(--tfd-primary-500)' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {sol.numero_processo}
                      </Link>
                      <span
                        className="tfd-tag tfd-tag--rounded"
                        style={{ backgroundColor: 'var(--tfd-surface-100)', color: 'var(--tfd-text-secondary)', fontSize: '0.625rem' }}
                      >
                        {sol.status?.replace(/_/g, ' ') ?? 'Ativo'}
                      </span>
                    </div>
                    <p className="font-semibold text-base" style={{ color: 'var(--tfd-text-primary)' }}>
                      {sol.pacientes?.nome_completo ?? '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/solicitacoes/${sol.id}`}
                      className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                      title="Ver processo"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Eye size={15} />
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )
        ) : filtered.length === 0 ? (
          <div className="tfd-card">
            <div className="flex flex-col items-center gap-2 py-12">
              <Archive size={32} style={{ color: 'var(--tfd-text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                Nenhum encerramento encontrado
              </p>
            </div>
          </div>
        ) : (
          filtered.map((enc) => {
            const motivo = motivoStyleMap[enc.motivo];
            const status = statusStyleMap[enc.status];
            const isExpanded = expandedId === enc.id;
            const retornoNA = enc.motivo === 'OBITO' || enc.motivo === 'TRANSFERENCIA';
            const c = enc.conciliacao;
            const archivable = canArchive(enc);
            const aguardandoRetorno = labelDestino(enc.solicitacaoId);

            return (
              <div key={enc.id} className={`tfd-card ${aguardandoRetorno ? '' : 'cursor-pointer'}`} style={{ opacity: aguardandoRetorno ? 0.5 : undefined, pointerEvents: aguardandoRetorno ? 'none' : undefined }} onClick={aguardandoRetorno ? undefined : () => handleOpenEdit(enc)}>
                {/* ---- Header row ---- */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Link
                        href={`/solicitacoes/${enc.solicitacaoId}`}
                        className="font-medium text-sm hover:underline"
                        style={{ color: 'var(--tfd-primary-500)' }}
                      >
                        {enc.numeroProcesso}
                      </Link>
                      <span
                        className="tfd-tag tfd-tag--rounded tfd-tag--dot"
                        style={{ backgroundColor: motivo.bg, color: motivo.text }}
                      >
                        {motivo.label}
                      </span>
                      <span
                        className="tfd-tag tfd-tag--rounded tfd-tag--dot"
                        style={{ backgroundColor: status.bg, color: status.text }}
                      >
                        {status.label}
                      </span>
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
                      {enc.pacienteNome}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/solicitacoes/${enc.solicitacaoId}`}
                      className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                      title="Ver processo completo"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Eye size={16} />
                    </Link>
                    <button
                      type="button"
                      className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                      title="Devolver"
                      onClick={(e) => { e.stopPropagation(); setDevolverItem(enc); }}
                    >
                      <SendHorizonal size={15} />
                    </button>
                    <button
                      type="button"
                      className="tfd-btn tfd-btn-danger tfd-btn--icon-only"
                      title="Excluir encerramento"
                      onClick={(e) => { e.stopPropagation(); handleOpenDelete(enc); }}
                    >
                      <Trash2 size={15} />
                    </button>
                    <button
                      className="tfd-btn tfd-btn--text tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only"
                      title={isExpanded ? 'Recolher' : 'Expandir'}
                      onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : enc.id); }}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* ---- Info row ---- */}
                <div className="flex items-center gap-4 mt-3 flex-wrap text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
                  <div className="flex items-center gap-1.5">
                    <Stethoscope size={14} />
                    <span>{enc.cidCodigo} — {enc.cidDescricao}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    <span>{formatDate(enc.dataAlta)}</span>
                  </div>
                </div>

                {/* ---- Quick status indicators ---- */}
                <div className="flex items-center gap-4 mt-3 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>
                    <Plane size={12} />
                    <span>Retorno:</span>
                    {enc.passagemRetorno === 'EMITIDA' && (
                      <CheckCircle2 size={14} style={{ color: '#16A34A' }} />
                    )}
                    {enc.passagemRetorno === 'PENDENTE' && (
                      <AlertTriangle size={14} style={{ color: '#F59E0B' }} />
                    )}
                    {enc.passagemRetorno === 'NAO_APLICAVEL' && (
                      <span style={{ color: 'var(--tfd-text-muted)' }}>N/A</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>
                    <Wallet size={12} />
                    <span>Diárias:</span>
                    {enc.diarias === 'CONCILIADA' ? (
                      <CheckCircle2 size={14} style={{ color: '#16A34A' }} />
                    ) : (
                      <AlertTriangle size={14} style={{ color: '#F59E0B' }} />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>
                    <FileText size={12} />
                    <span>Docs:</span>
                    {enc.documentosAlta === 'ANEXADO' ? (
                      <CheckCircle2 size={14} style={{ color: '#16A34A' }} />
                    ) : (
                      <AlertTriangle size={14} style={{ color: '#F59E0B' }} />
                    )}
                  </div>
                </div>

                {/* ---- Observations ---- */}
                {enc.observacoes && !isExpanded && (
                  <p className="mt-2 text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                    {enc.observacoes}
                  </p>
                )}

                {/* ---- Expanded: Conciliação ---- */}
                {isExpanded && (
                  <div
                    className="mt-4 pt-4"
                    style={{ borderTop: '1px solid var(--tfd-surface-border)' }}
                  >
                    {/* Óbito warning */}
                    {enc.motivo === 'OBITO' && (
                      <div className="tfd-message tfd-message--danger mb-4">
                        <span className="tfd-message-icon mt-0.5 shrink-0">
                          <Skull size={16} />
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                            Fluxo especial ativado
                          </p>
                          <p className="text-sm mt-0.5" style={{ color: 'var(--tfd-text-secondary)' }}>
                            Diárias do paciente encerradas, passagem de retorno cancelada, retorno do acompanhante verificado, município notificado.
                          </p>
                        </div>
                      </div>
                    )}

                    <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
                      Checklist de Conciliação
                    </h4>

                    <div className="space-y-2.5">
                      {/* Passagem de ida */}
                      <div
                        className="flex items-center gap-3 p-3 rounded-lg"
                        style={{ backgroundColor: 'var(--tfd-surface-50)' }}
                      >
                        <Plane size={16} style={{ color: 'var(--tfd-text-muted)' }} />
                        <span className="text-sm flex-1" style={{ color: 'var(--tfd-text-primary)' }}>
                          Passagem de ida
                        </span>
                        {c.passagemIda && c.embarqueConfirmado ? (
                          <span className="flex items-center gap-1.5 text-sm" style={{ color: '#16A34A' }}>
                            <CheckCircle2 size={14} />
                            Emitida + embarque confirmado
                          </span>
                        ) : c.passagemIda ? (
                          <span className="flex items-center gap-1.5 text-sm" style={{ color: '#F59E0B' }}>
                            <AlertTriangle size={14} />
                            Emitida — embarque pendente
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-sm" style={{ color: '#B91C1C' }}>
                            <XCircle size={14} />
                            Não emitida
                          </span>
                        )}
                      </div>

                      {/* Passagem de retorno */}
                      <div
                        className="flex items-center gap-3 p-3 rounded-lg"
                        style={{ backgroundColor: 'var(--tfd-surface-50)' }}
                      >
                        <Plane size={16} style={{ color: 'var(--tfd-text-muted)' }} />
                        <span className="text-sm flex-1" style={{ color: 'var(--tfd-text-primary)' }}>
                          Passagem de retorno
                        </span>
                        {retornoNA ? (
                          <span className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                            N/A
                          </span>
                        ) : c.passagemRetornoEmitida ? (
                          <span className="flex items-center gap-1.5 text-sm" style={{ color: '#16A34A' }}>
                            <CheckCircle2 size={14} />
                            Emitida
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-sm" style={{ color: '#F59E0B' }}>
                            <AlertTriangle size={14} />
                            Pendente
                          </span>
                        )}
                      </div>

                      {/* Diárias */}
                      <div
                        className="flex items-center gap-3 p-3 rounded-lg"
                        style={{ backgroundColor: 'var(--tfd-surface-50)' }}
                      >
                        <Wallet size={16} style={{ color: 'var(--tfd-text-muted)' }} />
                        <span className="text-sm flex-1" style={{ color: 'var(--tfd-text-primary)' }}>
                          Diárias
                        </span>
                        {c.diariasPagas && c.diariasPendentes === 0 ? (
                          <span className="flex items-center gap-1.5 text-sm" style={{ color: '#16A34A' }}>
                            <CheckCircle2 size={14} />
                            Todas pagas
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-sm" style={{ color: '#F59E0B' }}>
                            <AlertTriangle size={14} />
                            {c.diariasPendentes} pendente{c.diariasPendentes !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {/* Complementos de permanência */}
                      <div
                        className="flex items-center gap-3 p-3 rounded-lg"
                        style={{ backgroundColor: 'var(--tfd-surface-50)' }}
                      >
                        <Puzzle size={16} style={{ color: 'var(--tfd-text-muted)' }} />
                        <span className="text-sm flex-1" style={{ color: 'var(--tfd-text-primary)' }}>
                          Complementos de permanência
                        </span>
                        {c.complementosConciliados && c.complementosPendentes === 0 ? (
                          <span className="flex items-center gap-1.5 text-sm" style={{ color: '#16A34A' }}>
                            <CheckCircle2 size={14} />
                            Conciliados
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-sm" style={{ color: '#F59E0B' }}>
                            <AlertTriangle size={14} />
                            {c.complementosPendentes} pendente{c.complementosPendentes !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {/* Documentos de alta */}
                      <div
                        className="flex items-center gap-3 p-3 rounded-lg"
                        style={{ backgroundColor: 'var(--tfd-surface-50)' }}
                      >
                        <FileText size={16} style={{ color: 'var(--tfd-text-muted)' }} />
                        <span className="text-sm flex-1" style={{ color: 'var(--tfd-text-primary)' }}>
                          Documentos de alta
                        </span>
                        {c.documentosAnexados ? (
                          <span className="flex items-center gap-1.5 text-sm" style={{ color: '#16A34A' }}>
                            <CheckCircle2 size={14} />
                            Anexados
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-sm" style={{ color: '#F59E0B' }}>
                            <AlertTriangle size={14} />
                            Pendente
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Observations */}
                    {enc.observacoes && (
                      <p className="mt-3 text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                        {enc.observacoes}
                      </p>
                    )}

                    {/* Confirmar e Arquivar button */}
                    <div className="mt-4 flex justify-end">
                      <button
                        className="tfd-btn tfd-btn-primary tfd-btn--sm"
                        disabled={!archivable}
                        style={{
                          opacity: archivable ? 1 : 0.5,
                          cursor: archivable ? 'pointer' : 'not-allowed',
                        }}
                      >
                        <Archive size={16} />
                        Confirmar e Arquivar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ========== Registrar Alta Drawer ========== */}
      <Drawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        title={editingId ? 'Editar Encerramento' : 'Registrar Alta'}
        subtitle={editingId ? `Editando ${numProcesso}` : 'Registrar alta ou encerramento de processo TFD'}
        width="480px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={handleCloseDrawer}>
              Cancelar
            </button>
            <button
              className={`tfd-btn ${motivo === 'OBITO' ? 'tfd-btn-danger' : 'tfd-btn-primary'}`}
              onClick={handleSubmitEncerramento}
            >
              {editingId ? 'Salvar Alterações' : 'Confirmar Encerramento'}
            </button>
          </>
        }
      >
        {/* Section: Paciente (read-only info card) */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Paciente</h3>
        <div className="rounded-lg p-3 mb-3" style={{ background: 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}>
          <p className="font-semibold text-sm" style={{ color: 'var(--tfd-text-primary)' }}>{pacienteNome || '—'}</p>
          {numProcesso && (
            <p className="text-xs mt-1" style={{ color: 'var(--tfd-text-muted)' }}>Processo: <span className="font-semibold" style={{ color: 'var(--tfd-primary-600)' }}>{numProcesso}</span></p>
          )}
        </div>

        <hr className="tfd-divider" />

        {/* Section: Encerramento */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Encerramento</h3>
        <FormField label="Motivo do encerramento" required>
          <select
            className="tfd-input"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            disabled={motivoEncLoading}
          >
            <option value="">{motivoEncLoading ? 'Carregando...' : 'Selecione...'}</option>
            {motivoEncOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Data da alta/encerramento" required>
          <input
            type="date"
            className="tfd-input"
            value={dataAlta}
            onChange={(e) => setDataAlta(e.target.value)}
          />
        </FormField>
        <FormField label="Observações">
          <textarea
            className="tfd-input"
            rows={3}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />
        </FormField>

        {/* Section: Documentos (conditional — Alta Médica) */}
        {motivo === 'ALTA_MEDICA' && (
          <>
            <hr className="tfd-divider" />
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Documentos</h3>
            <FormField label="Relatório de alta" required>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="tfd-input pt-1.5"
                onChange={(e) => setRelatorioAlta(e.target.files?.[0] ?? null)}
              />
            </FormField>
            <div className="tfd-message tfd-message--info">
              <span className="tfd-message-icon mt-0.5 shrink-0">
                <Info size={16} />
              </span>
              <p className="text-sm flex-1" style={{ color: 'var(--tfd-text-secondary)' }}>
                O relatório de alta da unidade de destino é obrigatório para emissão da passagem de retorno.
              </p>
            </div>
          </>
        )}

        {/* Section: Óbito (conditional) */}
        {motivo === 'OBITO' && (
          <>
            <hr className="tfd-divider" />
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Óbito</h3>
            <div className="tfd-message tfd-message--danger mb-4">
              <span className="tfd-message-icon mt-0.5 shrink-0">
                <Skull size={16} />
              </span>
              <p className="text-sm flex-1" style={{ color: 'var(--tfd-text-secondary)' }}>
                Fluxo especial será ativado: diárias do paciente encerradas na data, passagem de retorno cancelada, retorno do acompanhante verificado, município de origem notificado.
              </p>
            </div>
            <FormField label="Certidão de óbito" required>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="tfd-input pt-1.5"
                onChange={(e) => setCertidaoObito(e.target.files?.[0] ?? null)}
              />
            </FormField>
            <FormField label="Local do óbito" required>
              <input
                type="text"
                className="tfd-input"
                value={localObito}
                onChange={(e) => setLocalObito(e.target.value)}
              />
            </FormField>
          </>
        )}
      </Drawer>

      {/* ========== Modal de Confirmação de Exclusão ========== */}
      {deleteConfirmId && (
        <>
          <div className="tfd-overlay-backdrop" onClick={() => setDeleteConfirmId(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="tfd-dialog" style={{ maxWidth: '400px' }}>
              <div className="tfd-dialog-header">
                <div className="flex items-center gap-2">
                  <Trash2 size={18} style={{ color: '#EF4444' }} />
                  <span className="font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                    Excluir Encerramento
                  </span>
                </div>
              </div>
              <div className="tfd-dialog-content">
                <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
                  Tem certeza que deseja excluir o encerramento de <strong>{deleteConfirmName}</strong>? Esta ação não pode ser desfeita.
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

      {/* ========== Modal de Devolução ========== */}
      <DevolverModal
        open={!!devolverItem}
        onClose={() => setDevolverItem(null)}
        setorAtual="ENCERRAMENTO"
        solicitacaoId={devolverItem?.solicitacaoId ?? ''}
        statusAtual={devolverItem?.solicitacaoStatus ?? 'CONCLUIDO'}
        label={`${devolverItem?.numeroProcesso ?? ''} — ${devolverItem?.pacienteNome ?? 'Paciente'}`}
        onSuccess={() => { refreshAll(); refreshDevolucoes(); toast.success('Solicitação devolvida', 'A solicitação foi encaminhada ao setor selecionado.'); }}
      />
    </>
  );
}
