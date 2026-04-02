'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Wallet,
  Search,
  Clock,
  CheckCircle2,
  DollarSign,
  XCircle,
  Eye,
  Info,
  Calculator,
  Ban,
  Loader2,
  Plus,
  Trash2,
  SendHorizonal,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import DevolverModal from '@/shared/components/devolver-modal/DevolverModal';
import { useDevolucoesPendentes } from '@/shared/hooks/useDevolucoesPendentes';
import { useParametroNumero, useParametroBooleano } from '@/shared/hooks/useParametros';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import { useToast } from '@/shared/components/toast/Toast';
import { listarAjudasCusto, criarAjudaCusto, atualizarAjudaCusto, excluirAjudaCusto, listarSolicitacoesParaAjudaCusto } from '@/services/ajuda-custo.service';
import { buscarViagensPorSolicitacao } from '@/services/viagens.service';
import { useSupabaseData } from '@/shared/hooks/useSupabaseData';
import { formatCurrency, maskCurrency, parseCurrency } from '@/shared/pipes/formatters';

/* -------------------------------------------------- */
/*  Tab config                                         */
/* -------------------------------------------------- */

const TABS: { key: string; label: string }[] = [
  { key: 'TODOS', label: 'Todas' },
  { key: 'DISPONIVEL', label: 'Disponíveis' },
  { key: 'EM_ANALISE', label: 'Em Análise' },
  { key: 'APROVADA', label: 'Aprovadas' },
  { key: 'CONCLUIDA', label: 'Pagas' },
  { key: 'GLOSADA', label: 'Glosadas' },
];

/* -------------------------------------------------- */
/*  Status styling                                     */
/* -------------------------------------------------- */

interface AcStyle {
  bg: string;
  text: string;
  label: string;
}

const statusStyleMap: Record<string, AcStyle> = {
  DISPONIVEL: { bg: '#F0FDF4', text: '#166534', label: 'Disponível' },
  EM_ANALISE: { bg: '#FEF3C7', text: '#92400E', label: 'Em Análise' },
  APROVADA: { bg: '#DBEAFE', text: '#1D4ED8', label: 'Aprovada' },
  EM_PAGAMENTO: { bg: '#E0E7FF', text: '#4338CA', label: 'Em Pagamento' },
  CONCLUIDA: { bg: '#DCFCE7', text: '#15803D', label: 'Paga' },
  GLOSADA: { bg: 'var(--tfd-surface-100)', text: 'var(--tfd-surface-500)', label: 'Glosada' },
};

/* -------------------------------------------------- */
/*  Mapped item type                                   */
/* -------------------------------------------------- */

interface AjudaCustoItem {
  id: string;
  solicitacaoId: string;
  numero: string;
  paciente: string;
  tipo: string;
  status: string;
  dataInicio: string;
  dataFim: string;
  diasElegiveis: number;
  valorDiaria: number;
  valorTotal: number;
  observacoes: string;
  solicitacaoStatus: string;
}

/* -------------------------------------------------- */
/*  Helpers                                            */
/* -------------------------------------------------- */

function formatDate(iso: string): string {
  if (!iso) return '—';
  const datePart = iso.includes('T') ? iso.split('T')[0] : iso;
  const [year, month, day] = datePart.split('-');
  if (!year || !month || !day) return '—';
  return `${day}/${month}/${year}`;
}

function formatPeriodo(inicio: string, fim: string): string {
  return `${formatDate(inicio)} — ${formatDate(fim)}`;
}

function calcularDias(inicio: string, fim: string): number {
  if (!inicio || !fim) return 0;
  const d1 = new Date(inicio);
  const d2 = new Date(fim);
  const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function AjudaCustoPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<string>('TODOS');
  const [search, setSearch] = useState('');

  // Parâmetros dinâmicos do sistema
  const { valor: valorDiariaCompleta } = useParametroNumero('diaria_valor_completa');
  const { valor: valorDiariaRetorno } = useParametroNumero('diaria_valor_retorno');
  const { valor: pacienteInternado } = useParametroBooleano('diaria_paciente_internado');
  const { valor: acompanhanteSempre } = useParametroBooleano('diaria_acompanhante_sempre');

  /* ---- Disponíveis (solicitações EM_PAGAMENTO sem ajuda de custo) ---- */
  const [disponiveis, setDisponiveis] = useState<any[]>([]);
  const [loadingDisponiveis, setLoadingDisponiveis] = useState(false);

  async function carregarDisponiveis() {
    setLoadingDisponiveis(true);
    const { data } = await listarSolicitacoesParaAjudaCusto();
    setDisponiveis(data ?? []);
    setLoadingDisponiveis(false);
  }

  useEffect(() => {
    carregarDisponiveis();
  }, []);

  /* ---- Drawer state ---- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [solicitacaoId, setSolicitacaoId] = useState('');
  const [numProcesso, setNumProcesso] = useState('');
  const [tipoBeneficiario, setTipoBeneficiario] = useState<string>('PACIENTE');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [diasElegiveis, setDiasElegiveis] = useState('');
  const [valorDiaria, setValorDiaria] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [drawerPacienteNome, setDrawerPacienteNome] = useState('');

  /* ---- Detail drawer state ---- */
  const [selectedAC, setSelectedAC] = useState<AjudaCustoItem | null>(null);

  /* ---- Delete confirm state ---- */
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  /* ---- Devolver modal state ---- */
  const [devolverItem, setDevolverItem] = useState<AjudaCustoItem | null>(null);

  /* ---- Devoluções pendentes ---- */
  const { mapa: devolucoesEnviadas, labelDestino, refresh: refreshDevolucoes } = useDevolucoesPendentes('AJUDA_CUSTO');

  /* ---- Date validation ---- */
  const dataFimError = useMemo(() => {
    if (dataInicio && dataFim && dataFim < dataInicio) {
      return 'Data de fim não pode ser anterior à data de início.';
    }
    return '';
  }, [dataInicio, dataFim]);

  /* ---- Calculated values ---- */
  const diasCalc = useMemo(() => {
    if (diasElegiveis) return parseInt(diasElegiveis, 10) || 0;
    if (dataFimError) return 0;
    return calcularDias(dataInicio, dataFim);
  }, [diasElegiveis, dataInicio, dataFim, dataFimError]);

  const valorDiariaNum = useMemo(() => {
    if (valorDiaria) return parseCurrency(valorDiaria);
    return valorDiariaCompleta;
  }, [valorDiaria, valorDiariaCompleta]);

  const valorTotalCalc = useMemo(() => {
    return diasCalc * valorDiariaNum;
  }, [diasCalc, valorDiariaNum]);

  function resetDrawerForm() {
    setSolicitacaoId('');
    setNumProcesso('');
    setTipoBeneficiario('PACIENTE');
    setDataInicio('');
    setDataFim('');
    setDiasElegiveis('');
    setValorDiaria('');
    setObservacoes('');
    setEditingId(null);
    setDrawerPacienteNome('');
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
    resetDrawerForm();
  }

  function handleOpenNew(sol: any) {
    resetDrawerForm();
    setSolicitacaoId(sol.id);
    setNumProcesso(sol.numero_processo ?? '');
    setDrawerPacienteNome((sol.pacientes as any)?.nome_completo ?? 'Paciente');
    // Pre-fill with system default formatted as currency
    const defaultVal = Math.round(valorDiariaCompleta * 100);
    setValorDiaria(defaultVal > 0 ? maskCurrency(String(defaultVal)) : '');
    // Pre-fill dates from viagens
    buscarViagensPorSolicitacao(sol.id).then(({ data: viagens }) => {
      if (viagens && viagens.length > 0) {
        const ida = viagens.find((v: any) => v.tipo === 'IDA');
        const volta = viagens.find((v: any) => v.tipo === 'RETORNO');
        if (ida?.data_embarque_prevista) {
          const dataIda = ida.data_embarque_prevista.includes('T')
            ? ida.data_embarque_prevista.split('T')[0]
            : ida.data_embarque_prevista;
          setDataInicio(dataIda);
        }
        if (volta?.data_embarque_prevista) {
          const dataVolta = volta.data_embarque_prevista.includes('T')
            ? volta.data_embarque_prevista.split('T')[0]
            : volta.data_embarque_prevista;
          setDataFim(dataVolta);
        }
      }
    });
    setDrawerOpen(true);
  }

  function refreshAll() {
    refresh();
    carregarDisponiveis();
  }

  function handleOpenEdit(ac: AjudaCustoItem) {
    setEditingId(ac.id);
    setSolicitacaoId(ac.solicitacaoId);
    setNumProcesso(ac.numero);
    setDrawerPacienteNome(ac.paciente);
    setTipoBeneficiario(ac.tipo);
    setDataInicio(ac.dataInicio ? (ac.dataInicio.includes('T') ? ac.dataInicio.split('T')[0] : ac.dataInicio) : '');
    setDataFim(ac.dataFim ? (ac.dataFim.includes('T') ? ac.dataFim.split('T')[0] : ac.dataFim) : '');
    setDiasElegiveis(ac.diasElegiveis > 0 ? String(ac.diasElegiveis) : '');
    const valCents = Math.round(ac.valorDiaria * 100);
    setValorDiaria(valCents > 0 ? maskCurrency(String(valCents)) : '');
    setObservacoes(ac.observacoes ?? '');
    setDrawerOpen(true);
  }

  function handleOpenDelete(ac: AjudaCustoItem) {
    setDeleteConfirmId(ac.id);
    setDeleteConfirmName(ac.paciente);
  }

  async function handleConfirmDelete() {
    if (!deleteConfirmId) return;
    const { error } = await excluirAjudaCusto(deleteConfirmId);
    if (error) {
      toast.error('Erro ao excluir', (error as any).message);
    } else {
      toast.success('Ajuda de custo excluída', 'O registro foi removido com sucesso.');
      refreshAll();
    }
    setDeleteConfirmId(null);
    setDeleteConfirmName('');
  }

  async function handleSubmit() {
    if (!solicitacaoId) {
      toast.error('Paciente não selecionado', 'Selecione um paciente para vincular à ajuda de custo.');
      return;
    }
    if (!dataInicio) {
      toast.error('Data obrigatória', 'Informe a data de início do período.');
      return;
    }
    if (dataFimError) {
      toast.error('Datas inválidas', dataFimError);
      return;
    }

    const payload: any = {
      solicitacao_id: solicitacaoId,
      tipo: tipoBeneficiario || 'PACIENTE',
      data_inicio: dataInicio,
      data_fim: dataFim || null,
      valor_diaria: valorDiariaNum,
      valor_total: valorTotalCalc,
      observacoes: observacoes || null,
      status: 'EM_ANALISE',
    };

    try {
      const result = editingId
        ? await atualizarAjudaCusto(editingId, payload)
        : await criarAjudaCusto(payload);

      if (result.error) {
        toast.error(
          editingId ? 'Erro ao atualizar' : 'Erro ao cadastrar',
          (result.error as any).message,
        );
        return;
      }
      toast.success(
        editingId ? 'Ajuda de custo atualizada!' : 'Ajuda de custo cadastrada!',
        editingId ? 'As alterações foram salvas.' : 'A ajuda de custo foi registrada com sucesso.',
      );
      handleCloseDrawer();
      refreshAll();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error('Erro inesperado', e.message ?? 'Tente novamente');
    }
  }

  /* ---- Fetch real data ---- */
  const { data: ajudasRaw, loading, refresh } = useSupabaseData(
    useCallback(
      () => listarAjudasCusto({ status: activeTab === 'TODOS' ? undefined : activeTab, search }),
      [activeTab, search],
    ),
    [activeTab, search],
  );

  /* ---- Map Supabase data to display format ---- */
  const items: AjudaCustoItem[] = useMemo(() => {
    return ajudasRaw.map((ac: any) => ({
      id: ac.id,
      solicitacaoId: ac.solicitacao_id,
      numero: ac.solicitacoes?.numero_processo ?? '—',
      paciente: ac.solicitacoes?.pacientes?.nome_completo ?? '—',
      tipo: ac.tipo ?? 'PACIENTE',
      status: ac.status,
      dataInicio: ac.data_inicio ?? '',
      dataFim: ac.data_fim ?? '',
      diasElegiveis: ac.dias_elegiveis ?? 0,
      valorDiaria: ac.valor_diaria ?? 0,
      valorTotal: ac.valor_total ?? 0,
      observacoes: ac.observacoes ?? '',
      solicitacaoStatus: ac.solicitacoes?.status ?? 'EM_PAGAMENTO',
    }));
  }, [ajudasRaw]);

  /* ---- Map disponíveis to unified format ---- */
  const disponiveisItems: AjudaCustoItem[] = useMemo(() => {
    return disponiveis.map((sol: any) => ({
      id: `disp-${sol.id}`,
      solicitacaoId: sol.id,
      numero: sol.numero_processo ?? '—',
      paciente: (sol.pacientes as any)?.nome_completo ?? '—',
      tipo: '',
      status: 'DISPONIVEL',
      dataInicio: '',
      dataFim: '',
      diasElegiveis: 0,
      valorDiaria: 0,
      valorTotal: 0,
      observacoes: '',
      solicitacaoStatus: sol.status ?? 'EM_PAGAMENTO',
    }));
  }, [disponiveis]);

  /* ---- All rows = disponíveis first, then existing ---- */
  const allRows: AjudaCustoItem[] = useMemo(() => {
    return [...disponiveisItems, ...items];
  }, [disponiveisItems, items]);

  /* ---- Filtered data ---- */
  const filtered = useMemo(() => {
    return allRows.filter((ac) => {
      const matchesTab = activeTab === 'TODOS' || ac.status === activeTab;
      const matchesSearch =
        search === '' ||
        ac.paciente.toLowerCase().includes(search.toLowerCase()) ||
        ac.numero.toLowerCase().includes(search.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [allRows, activeTab, search]);

  /* ---- Summary counters ---- */
  const summary = useMemo(() => {
    const pendentes = items.filter((ac) => ac.status === 'EM_ANALISE');
    const aprovadas = items.filter((ac) => ac.status === 'APROVADA');
    const pagas = items.filter((ac) => ac.status === 'CONCLUIDA');
    return {
      pendentesCount: pendentes.length,
      pendentesTotal: pendentes.reduce((s, ac) => s + ac.valorTotal, 0),
      aprovadasTotal: aprovadas.reduce((s, ac) => s + ac.valorTotal, 0),
      pagasTotal: pagas.reduce((s, ac) => s + ac.valorTotal, 0),
      geral: items.reduce((s, ac) => s + ac.valorTotal, 0),
    };
  }, [items]);

  return (
    <>
      <PageHeader
        title="Ajuda de Custo"
        subtitle="Cálculo e controle de diárias TFD"
      />

      {/* ========== Info Banner — Formula ========== */}
      <div className="tfd-message tfd-message--info mb-6">
        <span className="tfd-message-icon mt-0.5 shrink-0">
          <Calculator size={16} />
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
            Fórmula de cálculo das diárias
          </p>
          <p className="text-sm mt-0.5" style={{ color: 'var(--tfd-text-secondary)' }}>
            Dias completos × <strong>R$ {valorDiariaCompleta.toFixed(2).replace('.', ',')}</strong> + dia de retorno × <strong>R$ {valorDiariaRetorno.toFixed(2).replace('.', ',')}</strong>.
            {!pacienteInternado && ' Paciente internado não recebe diária.'}{acompanhanteSempre && ' Acompanhante sempre elegível.'}
          </p>
        </div>
      </div>

      {/* ========== Summary Cards ========== */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#FEF3C7', color: '#F59E0B' }}
          >
            <Clock size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Pendentes</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{summary.pendentesCount}</p>
            <p className="text-xs" style={{ color: 'var(--tfd-status-warning)' }}>{formatCurrency(summary.pendentesTotal)}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#DBEAFE', color: '#3B82F6' }}
          >
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Aprovadas</p>
            <p className="text-lg font-semibold" style={{ color: 'var(--tfd-primary-700)' }}>{formatCurrency(summary.aprovadasTotal)}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#DCFCE7', color: '#16A34A' }}
          >
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Total Pago</p>
            <p className="text-lg font-semibold" style={{ color: 'var(--tfd-status-success)' }}>{formatCurrency(summary.pagasTotal)}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}
          >
            <Wallet size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Total Geral</p>
            <p className="text-lg font-semibold" style={{ color: 'var(--tfd-primary-700)' }}>{formatCurrency(summary.geral)}</p>
          </div>
        </div>
      </div>

      {/* ========== Tabs + Search ========== */}
      <div className="tfd-toolbar mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-1 flex-wrap">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = tab.key === 'TODOS'
              ? allRows.length
              : allRows.filter((ac) => ac.status === tab.key).length;
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
            placeholder="Buscar paciente ou número..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ========== Table ========== */}
      <div className="tfd-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tfd-table">
            <thead>
              <tr>
                <th>Solicitação</th>
                <th>Paciente</th>
                <th className="hidden md:table-cell">Tipo</th>
                <th className="hidden lg:table-cell">Período</th>
                <th>Dias</th>
                <th className="hidden md:table-cell">Valor/Dia</th>
                <th>Total</th>
                <th>Status</th>
                <th className="w-[100px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(loading || loadingDisponiveis) ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={32} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
                      <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                        Carregando ajudas de custo...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Ban size={32} style={{ color: 'var(--tfd-text-muted)' }} />
                      <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                        Nenhuma ajuda de custo encontrada
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((ac) => {
                  const isDisponivel = ac.status === 'DISPONIVEL';
                  const style = statusStyleMap[ac.status] ?? { bg: 'var(--tfd-surface-100)', text: 'var(--tfd-surface-500)', label: ac.status };
                  const aguardandoRetorno = !isDisponivel ? labelDestino(ac.solicitacaoId) : '';
                  const originalSol = isDisponivel ? disponiveis.find((s: any) => s.id === ac.solicitacaoId) : null;
                  return (
                    <tr
                      key={ac.id}
                      className={aguardandoRetorno ? '' : 'cursor-pointer'}
                      style={{ opacity: aguardandoRetorno ? 0.5 : undefined, pointerEvents: aguardandoRetorno ? 'none' : undefined }}
                      onClick={aguardandoRetorno ? undefined : isDisponivel ? () => handleOpenNew(originalSol) : () => handleOpenEdit(ac)}
                    >
                      <td>
                        <div className="flex flex-col gap-0.5">
                          <Link
                            href={`/solicitacoes/${ac.solicitacaoId}`}
                            className="font-medium text-sm hover:underline"
                            style={{ color: 'var(--tfd-primary-500)' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {ac.numero}
                          </Link>
                          {aguardandoRetorno && (
                            <span
                              className="tfd-tag tfd-tag--rounded"
                              style={{ backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '0.625rem' }}
                            >
                              Ag. retorno — {aguardandoRetorno}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="max-w-[160px] truncate font-medium">
                        {ac.paciente}
                      </td>
                      <td className="hidden md:table-cell">
                        {isDisponivel ? (
                          <span style={{ color: 'var(--tfd-text-muted)' }}>—</span>
                        ) : (
                          <span
                            className="tfd-tag tfd-tag--rounded"
                            style={{
                              backgroundColor: ac.tipo === 'PACIENTE' ? '#DBEAFE' : '#F5F3FF',
                              color: ac.tipo === 'PACIENTE' ? '#1D4ED8' : '#7C3AED',
                            }}
                          >
                            {ac.tipo === 'PACIENTE' ? 'Paciente' : 'Acompanhante'}
                          </span>
                        )}
                      </td>
                      <td className="hidden lg:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>
                        {isDisponivel ? <span style={{ color: 'var(--tfd-text-muted)' }}>—</span> : formatPeriodo(ac.dataInicio, ac.dataFim)}
                      </td>
                      <td className="text-center">
                        {isDisponivel ? <span style={{ color: 'var(--tfd-text-muted)' }}>—</span> : <span className="font-medium">{ac.diasElegiveis}</span>}
                      </td>
                      <td className="hidden md:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>
                        {isDisponivel ? <span style={{ color: 'var(--tfd-text-muted)' }}>—</span> : formatCurrency(ac.valorDiaria)}
                      </td>
                      <td className="whitespace-nowrap font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                        {isDisponivel ? <span style={{ color: 'var(--tfd-text-muted)' }}>—</span> : formatCurrency(ac.valorTotal)}
                      </td>
                      <td>
                        <span
                          className="tfd-tag tfd-tag--rounded tfd-tag--dot"
                          style={{ backgroundColor: style.bg, color: style.text }}
                        >
                          {style.label}
                        </span>
                      </td>
                      <td>
                          <div className="flex items-center gap-1">
                            <Link
                              href={`/solicitacoes/${ac.solicitacaoId}`}
                              className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                              title="Ver processo"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Eye size={15} />
                            </Link>
                            <button
                              type="button"
                              className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                              title="Devolver ao setor anterior"
                              onClick={(e) => { e.stopPropagation(); setDevolverItem(ac); }}
                            >
                              <SendHorizonal size={15} />
                            </button>
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
                  <span>Excluir ajuda de custo</span>
                </div>
              </div>
              <div className="tfd-dialog-content">
                <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
                  Tem certeza que deseja excluir a ajuda de custo de <strong>{deleteConfirmName}</strong>? Esta ação não pode ser desfeita.
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

      {/* ========== Drawer Cadastro / Edição ========== */}
      <Drawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        title={editingId ? 'Editar Ajuda de Custo' : 'Nova Ajuda de Custo'}
        subtitle={editingId ? `Editando ${numProcesso}` : 'Cadastrar ajuda de custo para um paciente'}
        width="520px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={handleCloseDrawer}>
              Cancelar
            </button>
            <button className="tfd-btn tfd-btn-primary" onClick={handleSubmit}>
              {editingId ? 'Salvar Alterações' : 'Cadastrar Ajuda de Custo'}
            </button>
          </>
        }
      >
        {/* Section: Paciente — read-only info card */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Paciente</h3>
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg mb-3" style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
              {drawerPacienteNome || '—'}
            </p>
            <p className="text-xs" style={{ color: '#1E40AF' }}>
              Processo: {numProcesso || '—'}
            </p>
          </div>
          <Link
            href={`/solicitacoes/${solicitacaoId}`}
            className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
            title="Ver processo"
          >
            <Eye size={15} />
          </Link>
        </div>

        <FormField label="Tipo de beneficiário" required>
          <select
            className="tfd-input"
            value={tipoBeneficiario}
            onChange={(e) => setTipoBeneficiario(e.target.value)}
          >
            <option value="PACIENTE">Paciente</option>
            <option value="ACOMPANHANTE">Acompanhante</option>
          </select>
        </FormField>

        <hr className="tfd-divider" />

        {/* Section: Período */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Período</h3>
        <FormField label="Data de início" required>
          <input
            type="date"
            className="tfd-input"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
          />
        </FormField>
        <FormField label="Data de fim" error={dataFimError}>
          <input
            type="date"
            className="tfd-input"
            min={dataInicio || undefined}
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
          />
        </FormField>
        <FormField label="Dias elegíveis">
          <input
            type="number"
            className="tfd-input"
            min="0"
            placeholder={diasCalc > 0 ? `Calculado: ${diasCalc}` : 'Calculado automaticamente'}
            value={diasElegiveis}
            onChange={(e) => setDiasElegiveis(e.target.value)}
          />
          <p className="text-xs mt-1" style={{ color: 'var(--tfd-text-muted)' }}>
            Deixe em branco para calcular automaticamente pelas datas.
          </p>
        </FormField>

        <hr className="tfd-divider" />

        {/* Section: Valores */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Valores</h3>
        <FormField label="Valor da diária">
          <input
            type="text"
            className="tfd-input"
            placeholder={`R$ ${valorDiariaCompleta.toFixed(2).replace('.', ',')}`}
            value={valorDiaria}
            onChange={(e) => setValorDiaria(maskCurrency(e.target.value))}
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
              {diasCalc} dias × {formatCurrency(valorDiariaNum)}
            </p>
          </div>
          <p className="text-xl font-bold" style={{ color: 'var(--tfd-primary-700)' }}>
            {formatCurrency(valorTotalCalc)}
          </p>
        </div>

        <hr className="tfd-divider" />

        {/* Section: Observações */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Observações</h3>
        <FormField label="Observações">
          <textarea
            className="tfd-input"
            rows={3}
            placeholder="Observações opcionais..."
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />
        </FormField>
      </Drawer>

      {/* ========== Drawer Detalhes ========== */}
      <Drawer
        open={!!selectedAC}
        onClose={() => setSelectedAC(null)}
        title={selectedAC ? `Ajuda de Custo — ${selectedAC.numero}` : ''}
        width="460px"
        footer={
          <button
            className="tfd-btn tfd-btn-secondary"
            onClick={() => setSelectedAC(null)}
          >
            Fechar
          </button>
        }
      >
        {selectedAC && (
          <>
            {/* ---- Dados ---- */}
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
              Dados
            </h3>

            <div className="space-y-3 mb-4">
              <div>
                <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Paciente</span>
                <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                  {selectedAC.paciente}
                </p>
              </div>
              <div>
                <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Tipo</span>
                <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                  {selectedAC.tipo === 'PACIENTE' ? 'Paciente' : 'Acompanhante'}
                </p>
              </div>
              <div>
                <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Período</span>
                <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                  {formatDate(selectedAC.dataInicio)} — {formatDate(selectedAC.dataFim)}
                </p>
              </div>
              <div className="flex gap-6">
                <div>
                  <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Dias elegíveis</span>
                  <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                    {selectedAC.diasElegiveis}
                  </p>
                </div>
                <div>
                  <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Valor/dia</span>
                  <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                    {formatCurrency(selectedAC.valorDiaria)}
                  </p>
                </div>
              </div>
              <div>
                <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Valor total</span>
                <p className="text-lg font-bold" style={{ color: 'var(--tfd-text-primary)' }}>
                  {formatCurrency(selectedAC.valorTotal)}
                </p>
              </div>
              {selectedAC.observacoes && (
                <div>
                  <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Observações</span>
                  <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
                    {selectedAC.observacoes}
                  </p>
                </div>
              )}
            </div>

            <hr className="tfd-divider" />

            {/* ---- Comprovantes ---- */}
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
              Comprovantes
            </h3>

            <div className="tfd-message tfd-message--info mb-4">
              <span className="tfd-message-icon mt-0.5 shrink-0">
                <Info size={14} />
              </span>
              <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
                Comprovantes necessários: agendamento/consulta, declaração de comparecimento, relatório de internação (quando aplicável).
              </p>
            </div>

            <FormField label="Upload de comprovante">
              <input type="file" className="tfd-input" />
            </FormField>

            <hr className="tfd-divider" />

            {/* ---- Decisão ---- */}
            {selectedAC.status === 'EM_ANALISE' ? (
              <>
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
                  Decisão
                </h3>

                <FormField label="Observações">
                  <textarea
                    className="tfd-input"
                    rows={3}
                    placeholder="Observações opcionais..."
                  />
                </FormField>

                <div className="flex gap-2">
                  <button
                    className="tfd-btn flex-1"
                    style={{ backgroundColor: 'var(--tfd-status-success)', color: 'white' }}
                    onClick={() => {
                      toast.success('Diária aprovada!', 'A ajuda de custo foi aprovada e encaminhada para pagamento.');
                      setSelectedAC(null);
                      refreshAll();
                    }}
                  >
                    Aprovar
                  </button>
                  <button
                    className="tfd-btn tfd-btn-danger tfd-btn--outlined flex-1"
                    onClick={() => {
                      toast.warning('Diária glosada', 'A ajuda de custo foi glosada. Verifique os motivos.');
                      setSelectedAC(null);
                      refreshAll();
                    }}
                  >
                    Glosar
                  </button>
                </div>
              </>
            ) : (
              <div>
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
                  Status
                </h3>
                <span
                  className="tfd-tag tfd-tag--rounded tfd-tag--dot"
                  style={{
                    backgroundColor: (statusStyleMap[selectedAC.status] ?? statusStyleMap.EM_ANALISE).bg,
                    color: (statusStyleMap[selectedAC.status] ?? statusStyleMap.EM_ANALISE).text,
                  }}
                >
                  {(statusStyleMap[selectedAC.status] ?? { label: selectedAC.status }).label}
                </span>
              </div>
            )}
          </>
        )}
      </Drawer>

      {/* ========== Modal Devolver ========== */}
      <DevolverModal
        open={!!devolverItem}
        onClose={() => setDevolverItem(null)}
        setorAtual="AJUDA_CUSTO"
        solicitacaoId={devolverItem?.solicitacaoId ?? ''}
        statusAtual={devolverItem?.solicitacaoStatus as any ?? 'EM_PAGAMENTO'}
        label={`${devolverItem?.numero ?? ''} — ${devolverItem?.paciente ?? 'Paciente'}`}
        onSuccess={() => { refreshAll(); refreshDevolucoes(); toast.success('Solicitação devolvida', 'A solicitação foi encaminhada ao setor selecionado.'); }}
      />
    </>
  );
}
