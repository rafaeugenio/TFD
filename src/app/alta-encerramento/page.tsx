'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  ClipboardCheck,
  ArrowRightLeft,
  UserX,
  UserMinus,
  Skull,
  Archive,
  FileText,
  Info,
  Loader2,
  SendHorizonal,
  Trash2,
  Filter,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import { useToast } from '@/shared/components/toast/Toast';
import { listarEncerramentos, criarEncerramento, atualizarEncerramento, excluirEncerramento, listarSolicitacoesParaEncerramento } from '@/services/encerramentos.service';
import { useSupabaseData } from '@/shared/hooks/useSupabaseData';
import LookupSelect from '@/shared/components/lookup-select/LookupSelect';
import DevolverModal from '@/shared/components/devolver-modal/DevolverModal';
import { useDevolucoesPendentes } from '@/shared/hooks/useDevolucoesPendentes';
import { useDevolucoeRecebidas } from '@/shared/hooks/useDevolucoeRecebidas';

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

type TabKey = 'TODOS' | 'DISPONIVEIS' | 'ENCERRADOS';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'TODOS', label: 'Todos' },
  { key: 'DISPONIVEIS', label: 'Disponíveis' },
  { key: 'ENCERRADOS', label: 'Encerrados' },
];

const MOTIVO_OPTIONS: { value: MotivoEncerramento | 'TODOS'; label: string }[] = [
  { value: 'TODOS', label: 'Todos os motivos' },
  { value: 'ALTA_MEDICA', label: 'Alta Médica' },
  { value: 'TRANSFERENCIA', label: 'Transferência' },
  { value: 'DESISTENCIA', label: 'Desistência' },
  { value: 'ABANDONO', label: 'Abandono' },
  { value: 'OBITO', label: 'Óbito' },
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
  const [activeTab, setActiveTab] = useState<TabKey>('TODOS');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('TODOS');
  const [filterMotivo, setFilterMotivo] = useState<MotivoEncerramento | 'TODOS'>('TODOS');

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
  const { mapa: devolucoesRecebidas, labelOrigem } = useDevolucoeRecebidas('ENCERRAMENTO');

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

  /* ---- Unified rows: disponíveis + encerramentos ---- */
  type UnifiedRow = { _type: 'DISPONIVEL'; raw: any } | { _type: 'ENCERRAMENTO'; data: EncerramentoItem };

  const allRows = useMemo<UnifiedRow[]>(() => {
    const dispRows: UnifiedRow[] = disponiveis.map((sol: any) => ({ _type: 'DISPONIVEL' as const, raw: sol }));
    const encRows: UnifiedRow[] = items.map((e) => ({ _type: 'ENCERRAMENTO' as const, data: e }));

    if (activeTab === 'DISPONIVEIS') return dispRows;
    if (activeTab === 'TODOS') return [...dispRows, ...encRows];
    // ENCERRADOS: show all encerramentos, optionally filtered by motivo
    if (filterMotivo === 'TODOS') return encRows;
    return encRows.filter((r) => r._type === 'ENCERRAMENTO' && r.data.motivo === filterMotivo);
  }, [disponiveis, items, activeTab, filterMotivo]);

  /* ---- Filter by search + status ---- */
  const filtered = useMemo(() => {
    return allRows.filter((row) => {
      const nome = row._type === 'DISPONIVEL' ? (row.raw.pacientes?.nome_completo ?? '') : row.data.pacienteNome;
      const processo = row._type === 'DISPONIVEL' ? (row.raw.numero_processo ?? '') : row.data.numeroProcesso;
      const status = row._type === 'DISPONIVEL' ? (row.raw.status ?? '') : row.data.solicitacaoStatus;

      const matchesSearch = search === '' ||
        nome.toLowerCase().includes(search.toLowerCase()) ||
        processo.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = filterStatus === 'TODOS' || status === filterStatus;

      return matchesSearch && matchesStatus;
    });
  }, [allRows, search, filterStatus]);

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
      TODOS: disponiveis.length + items.length,
      DISPONIVEIS: disponiveis.length,
      ENCERRADOS: items.length,
    };
  }, [items, disponiveis]);

  /* ---- Unique status values for filter ---- */
  const statusOptions = useMemo(() => {
    const statuses = new Set<string>();
    for (const sol of disponiveis) {
      if (sol.status) statuses.add(sol.status);
    }
    for (const enc of items) {
      if (enc.solicitacaoStatus) statuses.add(enc.solicitacaoStatus);
    }
    const statusLabels: Record<string, string> = {
      EM_PERMANENCIA: 'Em Permanência',
      EM_VIAGEM: 'Em Viagem',
      EMITIDA: 'Emitida',
      AGUARDANDO_EMISSAO: 'Aguardando Emissão',
      CONCLUIDO: 'Concluído',
      CANCELADO: 'Cancelado',
    };
    return Array.from(statuses).map((s) => ({ value: s, label: statusLabels[s] ?? s.replace(/_/g, ' ') }));
  }, [disponiveis, items]);

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
            <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--tfd-text-muted)' }}>Tratamento concluído com sucesso</p>
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
            <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--tfd-text-muted)' }}>Tratamento continuado na rede local do MA</p>
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
            <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--tfd-text-muted)' }}>Paciente optou por não continuar</p>
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
            <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--tfd-text-muted)' }}>Interrompeu sem comunicação</p>
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
            <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--tfd-text-muted)' }}>Falecimento durante o tratamento</p>
          </div>
        </div>
      </div>

      {/* ========== Tabs ========== */}
      <div className="flex items-center gap-1 flex-wrap mb-4">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = tabCounts[tab.key];
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setFilterMotivo('TODOS'); }}
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

      {/* ========== Search + Status Filter ========== */}
      <div className="tfd-toolbar mb-4 flex-wrap gap-3">
        <div className="relative flex-1 max-w-xs min-w-[200px]">
          <Search
            size={16}
            className="tfd-input-leading-icon"
            style={{ color: 'var(--tfd-text-muted)' }}
          />
          <input
            type="text"
            className="tfd-input tfd-input--sm tfd-input--with-leading-icon"
            placeholder="Buscar paciente ou processo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {statusOptions.length > 0 && (
          <div className="flex items-center gap-2">
            <Filter size={16} style={{ color: 'var(--tfd-text-muted)' }} />
            <select
              className="tfd-input tfd-input--sm"
              style={{ minWidth: '200px', maxWidth: '240px' }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="TODOS">Todos os status</option>
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}

        {activeTab === 'ENCERRADOS' && (
          <div className="flex items-center gap-2">
            <Filter size={16} style={{ color: 'var(--tfd-text-muted)' }} />
            <select
              className="tfd-input tfd-input--sm"
              style={{ minWidth: '200px', maxWidth: '240px' }}
              value={filterMotivo}
              onChange={(e) => setFilterMotivo(e.target.value as MotivoEncerramento | 'TODOS')}
            >
              {MOTIVO_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ========== Table ========== */}
      <div className="tfd-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tfd-table">
            <thead>
              <tr>
                <th>Nº Processo</th>
                <th>Paciente</th>
                <th>Status Solicitação</th>
                <th className="hidden md:table-cell">Motivo</th>
                <th className="hidden md:table-cell">Data Alta</th>
                <th className="hidden lg:table-cell">Docs</th>
                <th className="w-[100px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(loading || disponiveisLoading) ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={32} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
                      <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Carregando...</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Archive size={32} style={{ color: 'var(--tfd-text-muted)' }} />
                      <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                        Nenhum registro encontrado
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  if (row._type === 'DISPONIVEL') {
                    const sol = row.raw;
                    const solStatus = (sol.status ?? '').replace(/_/g, ' ');
                    return (
                      <tr
                        key={`disp-${sol.id}`}
                        className="cursor-pointer"
                        onClick={() => handleOpenNew(sol)}
                      >
                        <td>
                          <Link
                            href={`/solicitacoes/${sol.id}?from=alta-encerramento`}
                            className="font-medium text-sm hover:underline"
                            style={{ color: 'var(--tfd-primary-500)' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {sol.numero_processo}
                          </Link>
                        </td>
                        <td className="max-w-[180px] truncate font-medium">
                          {sol.pacientes?.nome_completo ?? '—'}
                        </td>
                        <td>
                          <span
                            className="tfd-tag tfd-tag--rounded"
                            style={{ backgroundColor: 'var(--tfd-surface-100)', color: 'var(--tfd-text-secondary)', fontSize: '0.625rem' }}
                          >
                            {solStatus || 'Ativo'}
                          </span>
                        </td>
                        <td className="hidden md:table-cell">
                          <span className="tfd-tag tfd-tag--rounded tfd-tag--dot" style={{ backgroundColor: '#DBEAFE', color: '#1D4ED8' }}>
                            Disponível
                          </span>
                        </td>
                        <td className="hidden md:table-cell" style={{ color: 'var(--tfd-text-muted)' }}>—</td>
                        <td className="hidden lg:table-cell" style={{ color: 'var(--tfd-text-muted)' }}>—</td>
                        <td>
                          <div className="flex items-center gap-1">
                            <Link
                              href={`/solicitacoes/${sol.id}?from=alta-encerramento`}
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
                  }

                  const enc = row.data;
                  const motivoStyle = motivoStyleMap[enc.motivo];
                  const statusStyle = statusStyleMap[enc.status];
                  const aguardandoRetorno = labelDestino(enc.solicitacaoId);
                  const devolucaoInfo = devolucoesEnviadas.get(enc.solicitacaoId);
                  const retornoRecebido = labelOrigem(enc.solicitacaoId);
                  const retornoInfo = devolucoesRecebidas.get(enc.solicitacaoId);

                  return (
                    <tr
                      key={enc.id}
                      className={aguardandoRetorno ? '' : 'cursor-pointer'}
                      style={{
                        opacity: aguardandoRetorno ? 0.55 : undefined,
                        backgroundColor: aguardandoRetorno ? '#F8F9FA' : retornoRecebido ? '#FFFBEB' : undefined,
                        borderLeft: retornoRecebido ? '4px solid #F59E0B' : undefined,
                        pointerEvents: aguardandoRetorno ? 'none' : undefined,
                      }}
                      onClick={aguardandoRetorno ? undefined : () => handleOpenEdit(enc)}
                    >
                      <td>
                        <div className="flex flex-col gap-0.5">
                          <Link
                            href={`/solicitacoes/${enc.solicitacaoId}?from=alta-encerramento`}
                            className="font-medium text-sm hover:underline"
                            style={{ color: aguardandoRetorno ? 'var(--tfd-text-muted)' : 'var(--tfd-primary-500)' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {enc.numeroProcesso}
                          </Link>
                          {aguardandoRetorno && devolucaoInfo && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
                              >
                                Enviado p/ {aguardandoRetorno}
                              </span>
                              {devolucaoInfo.urgencia === 'URGENTE' && (
                                <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{ backgroundColor: '#FEE2E2', color: '#B91C1C' }}>
                                  URGENTE
                                </span>
                              )}
                            </div>
                          )}
                          {retornoRecebido && retornoInfo && !aguardandoRetorno && (
                            <div className="flex items-center gap-1.5 mt-1" title={`Retorno recebido de ${retornoRecebido} em ${new Date(retornoInfo.created_at).toLocaleDateString('pt-BR')} — ${retornoInfo.motivo}`}>
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}>
                                ↩ Retorno de {retornoRecebido}
                              </span>
                              {retornoInfo.urgencia === 'URGENTE' && (
                                <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{ backgroundColor: '#FEE2E2', color: '#B91C1C' }}>URGENTE</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="max-w-[180px] truncate font-medium">
                        {enc.pacienteNome}
                      </td>
                      <td>
                        <span
                          className="tfd-tag tfd-tag--rounded tfd-tag--dot"
                          style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}
                        >
                          {statusStyle.label}
                        </span>
                      </td>
                      <td className="hidden md:table-cell">
                        <span
                          className="tfd-tag tfd-tag--rounded tfd-tag--dot"
                          style={{ backgroundColor: motivoStyle.bg, color: motivoStyle.text }}
                        >
                          {motivoStyle.label}
                        </span>
                      </td>
                      <td className="hidden md:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>
                        {formatDate(enc.dataAlta)}
                      </td>
                      <td className="hidden lg:table-cell">
                        {enc.documentosAlta === 'ANEXADO' ? (
                          <CheckCircle2 size={16} style={{ color: '#16A34A' }} />
                        ) : (
                          <AlertTriangle size={16} style={{ color: '#F59E0B' }} />
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-1" style={{ pointerEvents: 'auto' }}>
                          <Link
                            href={`/solicitacoes/${enc.solicitacaoId}?from=alta-encerramento`}
                            className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                            title="Ver processo"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Eye size={15} />
                          </Link>
                          {!aguardandoRetorno && (
                            <button
                              type="button"
                              className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                              title="Devolver"
                              onClick={(e) => { e.stopPropagation(); setDevolverItem(enc); }}
                            >
                              <SendHorizonal size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
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
        <LookupSelect
          categoria="motivo_encerramento"
          label="Motivo do encerramento"
          value={motivo}
          onChange={setMotivo}
          required
        />
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

        {/* Section: Documento (sempre visível, opcional) */}
        <hr className="tfd-divider" />
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          <FileText size={14} className="inline mr-1.5" style={{ color: 'var(--tfd-primary-500)' }} />
          Documento
        </h3>
        <FormField label="Anexar documento">
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="tfd-input pt-1.5"
            onChange={(e) => setRelatorioAlta(e.target.files?.[0] ?? null)}
          />
        </FormField>
        <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
          Opcional — anexe relatório de alta, certidão de óbito ou outro documento relevante ao encerramento.
        </p>
      </Drawer>

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
