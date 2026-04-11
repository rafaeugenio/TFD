'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Wallet,
  Search,
  Clock,
  CheckCircle2,
  DollarSign,
  Eye,
  Calculator,
  Ban,
  Loader2,
  Plus,
  Trash2,
  SendHorizonal,
  Pencil,
  AlertTriangle,
  CircleDollarSign,
  Plane,
  Calendar,
  ArrowRight,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import DevolverModal from '@/shared/components/devolver-modal/DevolverModal';
import { useDevolucoesPendentes } from '@/shared/hooks/useDevolucoesPendentes';
import { slaBadge } from '@/shared/utils/sla';
import { useDevolucoeRecebidas } from '@/shared/hooks/useDevolucoeRecebidas';
import { useParametroNumero, useParametroBooleano } from '@/shared/hooks/useParametros';
import { calcularTotalDiarias } from '@/shared/utils/diarias';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import { useToast } from '@/shared/components/toast/Toast';
import {
  listarAjudasCusto,
  criarAjudaCusto,
  editarEReverterAjudaCusto,
  excluirAjudaCusto,
  aprovarAjudaCusto,
  glosarAjudaCusto,
  pagarAjudaCusto,
  listarSolicitacoesParaAjudaCusto,
  listarPeriodosPorSolicitacao,
} from '@/services/ajuda-custo.service';
import { buscarViagensPorSolicitacao } from '@/services/viagens.service';
import { buscarAgendamentoPorSolicitacao } from '@/services/agendamentos.service';
import { useSupabaseData } from '@/shared/hooks/useSupabaseData';
import { formatCurrency, maskCurrency, parseCurrency, formatDate } from '@/shared/pipes/formatters';

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
  CONCLUIDA: { bg: '#DCFCE7', text: '#15803D', label: 'Paga' },
  PAGO_PARCIALMENTE: { bg: '#FFF7ED', text: '#C2410C', label: 'Pago Parcial' },
  GLOSADA: { bg: 'var(--tfd-surface-100)', text: 'var(--tfd-surface-500)', label: 'Glosada' },
};

/* -------------------------------------------------- */
/*  Helpers                                            */
/* -------------------------------------------------- */

function calcularDias(inicio: string, fim: string): number {
  if (!inicio || !fim) return 0;
  const d1 = new Date(inicio);
  const d2 = new Date(fim);
  const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

function formatPeriodo(inicio: string, fim: string): string {
  return `${formatDate(inicio)} — ${formatDate(fim)}`;
}

function statusDominante(periodos: any[]): string {
  if (periodos.length === 0) return 'DISPONIVEL';
  if (periodos.some((p: any) => p.status === 'EM_ANALISE')) return 'EM_ANALISE';
  if (periodos.some((p: any) => p.status === 'APROVADA')) return 'APROVADA';
  if (periodos.some((p: any) => p.status === 'PAGO_PARCIALMENTE')) return 'PAGO_PARCIALMENTE';
  if (periodos.every((p: any) => p.status === 'GLOSADA')) return 'GLOSADA';
  if (periodos.every((p: any) => p.status === 'CONCLUIDA')) return 'CONCLUIDA';
  return periodos[0].status;
}

/* -------------------------------------------------- */
/*  Grouped row type                                   */
/* -------------------------------------------------- */

interface SolicitacaoGrupo {
  solicitacaoId: string;
  numeroProcesso: string;
  pacienteNome: string;
  periodos: any[];
  totalPeriodos: number;
  totalDias: number;
  valorTotal: number;
  statusDominante: string;
  solicitacaoStatus: string;
}

/* -------------------------------------------------- */
/*  Inline action types                                */
/* -------------------------------------------------- */

type InlineAction =
  | { type: 'aprovar'; periodoId: string }
  | { type: 'glosar'; periodoId: string }
  | { type: 'pagar'; periodoId: string }
  | { type: 'excluir'; periodoId: string }
  | null;

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function AjudaCustoPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS');

  const { valor: valorDiariaCompleta } = useParametroNumero('diaria_valor_completa');
  const { valor: valorDiariaRetorno } = useParametroNumero('diaria_valor_retorno');
  const { valor: pacienteInternado } = useParametroBooleano('diaria_paciente_internado');
  const { valor: acompanhanteSempre } = useParametroBooleano('diaria_acompanhante_sempre');

  /* ---- Devoluções ---- */
  const { mapa: devolucoesEnviadas, labelDestino, refresh: refreshDevolucoes } = useDevolucoesPendentes('AJUDA_CUSTO');
  const { mapa: devolucoesRecebidas, labelOrigem } = useDevolucoeRecebidas('AJUDA_CUSTO');
  const devolvedIds = useMemo(() => Array.from(devolucoesEnviadas.keys()), [devolucoesEnviadas]);

  /* ---- Disponíveis ---- */
  const [disponiveis, setDisponiveis] = useState<any[]>([]);
  const [loadingDisponiveis, setLoadingDisponiveis] = useState(false);

  async function carregarDisponiveis() {
    setLoadingDisponiveis(true);
    const { data } = await listarSolicitacoesParaAjudaCusto({ includeIds: devolvedIds });
    setDisponiveis(data ?? []);
    setLoadingDisponiveis(false);
  }

  useEffect(() => { carregarDisponiveis(); }, [devolvedIds]);

  /* ---- Drawer state ---- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSolicitacaoId, setDrawerSolicitacaoId] = useState('');
  const [drawerNumProcesso, setDrawerNumProcesso] = useState('');
  const [drawerPacienteNome, setDrawerPacienteNome] = useState('');
  const [drawerPeriodos, setDrawerPeriodos] = useState<any[]>([]);
  const [drawerLoadingPeriodos, setDrawerLoadingPeriodos] = useState(false);
  const [drawerViagens, setDrawerViagens] = useState<any[]>([]);
  const [drawerAgendamento, setDrawerAgendamento] = useState<any>(null);

  /* ---- Add/Edit period form ---- */
  const [addingPeriodo, setAddingPeriodo] = useState(false);
  const [editingPeriodoId, setEditingPeriodoId] = useState<string | null>(null);
  const [tipoBeneficiario, setTipoBeneficiario] = useState<string>('PACIENTE');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [valorDiaria, setValorDiaria] = useState('');
  const [observacoes, setObservacoes] = useState('');

  /* ---- Inline action state ---- */
  const [inlineAction, setInlineAction] = useState<InlineAction>(null);
  const [glosarMotivo, setGlosarMotivo] = useState('');
  const [valorPagoInput, setValorPagoInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  /* ---- Devolver modal ---- */
  const [devolverGrupo, setDevolverGrupo] = useState<SolicitacaoGrupo | null>(null);

  /* ---- Date validation ---- */
  const dataFimError = useMemo(() => {
    if (dataInicio && dataFim && dataFim < dataInicio) return 'Data de fim não pode ser anterior à data de início.';
    return '';
  }, [dataInicio, dataFim]);

  const diasCalc = useMemo(() => {
    if (dataFimError) return 0;
    return calcularDias(dataInicio, dataFim);
  }, [dataInicio, dataFim, dataFimError]);

  const valorDiariaNum = useMemo(() => {
    if (valorDiaria) return parseCurrency(valorDiaria);
    return valorDiariaCompleta;
  }, [valorDiaria, valorDiariaCompleta]);

  // Portaria SAS/MS 55/1999: (dias - 1) × diária completa + diária de retorno.
  // O último dia é sempre sem pernoite. A operadora pode sobrescrever o valor
  // da diária completa; o valor do dia de retorno vem sempre do parâmetro.
  const valorTotalCalc = useMemo(
    () =>
      calcularTotalDiarias({
        dias: diasCalc,
        valorDiariaCompleta: valorDiariaNum,
        valorDiariaRetorno,
      }).valorTotal,
    [diasCalc, valorDiariaNum, valorDiariaRetorno],
  );

  function resetPeriodoForm() {
    setAddingPeriodo(false);
    setEditingPeriodoId(null);
    setTipoBeneficiario('PACIENTE');
    setDataInicio('');
    setDataFim('');
    setValorDiaria('');
    setObservacoes('');
  }

  function resetInlineAction() {
    setInlineAction(null);
    setGlosarMotivo('');
    setValorPagoInput('');
    setActionLoading(false);
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
    setDrawerSolicitacaoId('');
    setDrawerNumProcesso('');
    setDrawerPacienteNome('');
    setDrawerPeriodos([]);
    setDrawerViagens([]);
    setDrawerAgendamento(null);
    resetPeriodoForm();
    resetInlineAction();
  }

  async function carregarPeriodosDrawer(solicitacaoId: string) {
    setDrawerLoadingPeriodos(true);
    const { data } = await listarPeriodosPorSolicitacao(solicitacaoId);
    setDrawerPeriodos(data ?? []);
    setDrawerLoadingPeriodos(false);
  }

  async function handleOpenDrawer(solicitacaoId: string, numProcesso: string, pacienteNome: string) {
    setDrawerSolicitacaoId(solicitacaoId);
    setDrawerNumProcesso(numProcesso);
    setDrawerPacienteNome(pacienteNome);
    resetPeriodoForm();
    resetInlineAction();
    setDrawerOpen(true);
    await carregarPeriodosDrawer(solicitacaoId);
    buscarViagensPorSolicitacao(solicitacaoId).then(({ data }) => setDrawerViagens(data ?? []));
    buscarAgendamentoPorSolicitacao(solicitacaoId).then(({ data }) => setDrawerAgendamento(data ?? null));
  }

  function handleStartAdd() {
    resetPeriodoForm();
    resetInlineAction();
    const defaultVal = Math.round(valorDiariaCompleta * 100);
    setValorDiaria(defaultVal > 0 ? maskCurrency(String(defaultVal)) : '');
    setAddingPeriodo(true);

    buscarViagensPorSolicitacao(drawerSolicitacaoId).then(({ data: viagens }) => {
      if (viagens && viagens.length > 0) {
        const ida = viagens.find((v: any) => v.tipo === 'IDA');
        const volta = viagens.find((v: any) => v.tipo === 'RETORNO');
        if (ida?.data_embarque_prevista) {
          const d = ida.data_embarque_prevista.includes('T') ? ida.data_embarque_prevista.split('T')[0] : ida.data_embarque_prevista;
          setDataInicio(d);
        }
        if (volta?.data_embarque_prevista) {
          const d = volta.data_embarque_prevista.includes('T') ? volta.data_embarque_prevista.split('T')[0] : volta.data_embarque_prevista;
          setDataFim(d);
        }
      }
    });
  }

  function handleStartEdit(periodo: any) {
    resetInlineAction();
    setEditingPeriodoId(periodo.id);
    setTipoBeneficiario(periodo.tipo ?? 'PACIENTE');
    setDataInicio(periodo.data_inicio ? (periodo.data_inicio.includes('T') ? periodo.data_inicio.split('T')[0] : periodo.data_inicio) : '');
    setDataFim(periodo.data_fim ? (periodo.data_fim.includes('T') ? periodo.data_fim.split('T')[0] : periodo.data_fim) : '');
    const valCents = Math.round((periodo.valor_diaria ?? 0) * 100);
    setValorDiaria(valCents > 0 ? maskCurrency(String(valCents)) : '');
    setObservacoes(periodo.observacoes ?? '');
    setAddingPeriodo(true);
  }

  async function handleSavePeriodo() {
    if (!drawerSolicitacaoId) return;
    if (!dataInicio) { toast.error('Data obrigatória', 'Informe a data de início do período.'); return; }
    if (dataFimError) { toast.error('Datas inválidas', dataFimError); return; }

    const payload: any = {
      solicitacao_id: drawerSolicitacaoId,
      tipo: tipoBeneficiario || 'PACIENTE',
      data_inicio: dataInicio,
      data_fim: dataFim || null,
      valor_diaria: valorDiariaNum,
      valor_total: valorTotalCalc,
      observacoes: observacoes || null,
      status: 'EM_ANALISE',
    };

    try {
      const isEditing = !!editingPeriodoId;
      // If editing an approved period, use editarEReverterAjudaCusto to revert to EM_ANALISE
      const result = isEditing
        ? await editarEReverterAjudaCusto(editingPeriodoId!, payload)
        : await criarAjudaCusto(payload);

      if (result.error) {
        toast.error(isEditing ? 'Erro ao atualizar' : 'Erro ao cadastrar', (result.error as any).message);
        return;
      }
      toast.success(
        isEditing ? 'Período atualizado!' : 'Período adicionado!',
        isEditing ? 'O período voltou para análise.' : 'O período foi registrado com sucesso.',
      );
      resetPeriodoForm();
      await carregarPeriodosDrawer(drawerSolicitacaoId);
      refreshAll();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error('Erro inesperado', e.message ?? 'Tente novamente');
    }
  }

  /* ---- Inline actions ---- */

  async function handleConfirmAprovar(periodoId: string) {
    setActionLoading(true);
    const { error } = await aprovarAjudaCusto(periodoId);
    if (error) {
      toast.error('Erro ao aprovar', (error as any).message);
    } else {
      toast.success('Período aprovado!', 'A ajuda de custo foi aprovada.');
    }
    resetInlineAction();
    await carregarPeriodosDrawer(drawerSolicitacaoId);
    refreshAll();
  }

  async function handleConfirmGlosar(periodoId: string) {
    if (!glosarMotivo.trim()) { toast.error('Motivo obrigatório', 'Informe o motivo da glosa.'); return; }
    setActionLoading(true);
    const { error } = await glosarAjudaCusto(periodoId, glosarMotivo);
    if (error) {
      toast.error('Erro ao glosar', (error as any).message);
    } else {
      toast.success('Período glosado', 'A ajuda de custo foi glosada.');
    }
    resetInlineAction();
    await carregarPeriodosDrawer(drawerSolicitacaoId);
    refreshAll();
  }

  async function handleConfirmPagar(periodoId: string) {
    const valor = parseCurrency(valorPagoInput);
    if (valor <= 0) { toast.error('Valor inválido', 'Informe o valor pago.'); return; }
    setActionLoading(true);
    const { error } = await pagarAjudaCusto(periodoId, valor);
    if (error) {
      toast.error('Erro ao registrar pagamento', (error as any).message);
    } else {
      toast.success('Pagamento registrado!', 'O pagamento foi registrado com sucesso.');
    }
    resetInlineAction();
    await carregarPeriodosDrawer(drawerSolicitacaoId);
    refreshAll();
  }

  async function handleConfirmExcluir(periodoId: string) {
    setActionLoading(true);
    const { error } = await excluirAjudaCusto(periodoId);
    if (error) {
      toast.error('Erro ao excluir', (error as any).message);
    } else {
      toast.success('Período excluído', 'O registro foi removido.');
    }
    resetInlineAction();
    await carregarPeriodosDrawer(drawerSolicitacaoId);
    refreshAll();
  }

  function refreshAll() {
    refresh();
    carregarDisponiveis();
  }

  /* ---- Fetch data ---- */
  const { data: ajudasRaw, loading, refresh } = useSupabaseData(
    useCallback(() => listarAjudasCusto(), []),
    [],
  );

  /* ---- Group by solicitação ---- */
  const grupos: SolicitacaoGrupo[] = useMemo(() => {
    const map = new Map<string, SolicitacaoGrupo>();

    for (const ac of ajudasRaw) {
      const a = ac as any;
      const solId = a.solicitacao_id;
      if (!map.has(solId)) {
        map.set(solId, {
          solicitacaoId: solId,
          numeroProcesso: a.solicitacoes?.numero_processo ?? '—',
          pacienteNome: a.solicitacoes?.pacientes?.nome_completo ?? '—',
          periodos: [],
          totalPeriodos: 0,
          totalDias: 0,
          valorTotal: 0,
          statusDominante: '',
          solicitacaoStatus: a.solicitacoes?.status ?? '',
        });
      }
      const g = map.get(solId)!;
      g.periodos.push(a);
      g.totalPeriodos++;
      g.totalDias += a.dias_elegiveis ?? calcularDias(a.data_inicio, a.data_fim ?? '');
      g.valorTotal += a.valor_total ?? 0;
    }

    for (const g of map.values()) {
      g.statusDominante = statusDominante(g.periodos);
    }

    for (const sol of disponiveis) {
      if (!map.has(sol.id)) {
        map.set(sol.id, {
          solicitacaoId: sol.id,
          numeroProcesso: sol.numero_processo ?? '—',
          pacienteNome: (sol.pacientes as any)?.nome_completo ?? '—',
          periodos: [],
          totalPeriodos: 0,
          totalDias: 0,
          valorTotal: 0,
          statusDominante: 'DISPONIVEL',
          solicitacaoStatus: sol.status ?? 'EM_PAGAMENTO',
        });
      }
    }

    return Array.from(map.values());
  }, [ajudasRaw, disponiveis]);

  const filtered = useMemo(() => {
    return grupos.filter((g) => {
      const matchesStatus = filtroStatus === 'TODOS' || g.statusDominante === filtroStatus;
      const matchesSearch =
        search === '' ||
        g.pacienteNome.toLowerCase().includes(search.toLowerCase()) ||
        g.numeroProcesso.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [grupos, filtroStatus, search]);

  const summary = useMemo(() => {
    const allPeriodos = ajudasRaw as any[];
    const pendentes = allPeriodos.filter((ac) => ac.status === 'EM_ANALISE');
    const aprovadas = allPeriodos.filter((ac) => ac.status === 'APROVADA');
    const pagas = allPeriodos.filter((ac) => ac.status === 'CONCLUIDA' || ac.status === 'PAGO_PARCIALMENTE');
    return {
      pendentesCount: pendentes.length,
      pendentesTotal: pendentes.reduce((s: number, ac: any) => s + (ac.valor_total ?? 0), 0),
      aprovadasTotal: aprovadas.reduce((s: number, ac: any) => s + (ac.valor_total ?? 0), 0),
      pagasTotal: pagas.reduce((s: number, ac: any) => s + (ac.valor_pago ?? ac.valor_total ?? 0), 0),
      geral: allPeriodos.reduce((s: number, ac: any) => s + (ac.valor_total ?? 0), 0),
    };
  }, [ajudasRaw]);

  const drawerTotals = useMemo(() => {
    const dias = drawerPeriodos.reduce((s: number, p: any) => s + (p.dias_elegiveis ?? calcularDias(p.data_inicio, p.data_fim ?? '')), 0);
    const valor = drawerPeriodos.reduce((s: number, p: any) => s + (p.valor_total ?? 0), 0);
    const pago = drawerPeriodos.reduce((s: number, p: any) => s + (p.valor_pago ?? 0), 0);
    return { dias, valor, pago };
  }, [drawerPeriodos]);

  return (
    <>
      <PageHeader
        title="Ajuda de Custo"
        subtitle="Cálculo e controle de diárias TFD"
      />

      {/* ========== Info Banner ========== */}
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
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: '#FEF3C7', color: '#F59E0B' }}>
            <Clock size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Pendentes</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{summary.pendentesCount}</p>
            <p className="text-xs" style={{ color: 'var(--tfd-status-warning)' }}>{formatCurrency(summary.pendentesTotal)}</p>
            <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--tfd-text-muted)' }}>Diárias aguardando aprovação do financeiro</p>
          </div>
        </div>
        <div className="tfd-card flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: '#DBEAFE', color: '#3B82F6' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Aprovadas</p>
            <p className="text-lg font-semibold" style={{ color: 'var(--tfd-primary-700)' }}>{formatCurrency(summary.aprovadasTotal)}</p>
            <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--tfd-text-muted)' }}>Aprovadas em processo de pagamento</p>
          </div>
        </div>
        <div className="tfd-card flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: '#DCFCE7', color: '#16A34A' }}>
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Total Pago</p>
            <p className="text-lg font-semibold" style={{ color: 'var(--tfd-status-success)' }}>{formatCurrency(summary.pagasTotal)}</p>
            <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--tfd-text-muted)' }}>Valores efetivamente transferidos</p>
          </div>
        </div>
        <div className="tfd-card flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}>
            <Wallet size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Total Geral</p>
            <p className="text-lg font-semibold" style={{ color: 'var(--tfd-primary-700)' }}>{formatCurrency(summary.geral)}</p>
            <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--tfd-text-muted)' }}>Soma consolidada de todas as diárias</p>
          </div>
        </div>
      </div>

      {/* ========== Search + Status Filter ========== */}
      <div className="tfd-toolbar mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="tfd-input-leading-icon" style={{ color: 'var(--tfd-text-muted)' }} />
            <input
              type="text"
              className="tfd-input tfd-input--sm tfd-input--with-leading-icon"
              placeholder="Buscar por paciente ou nº do processo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="tfd-input tfd-input--sm"
            style={{ maxWidth: 200 }}
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
          >
            <option value="TODOS">Status: Todos</option>
            <option value="DISPONIVEL">Disponível</option>
            <option value="EM_ANALISE">Em Análise</option>
            <option value="APROVADA">Aprovada</option>
            <option value="CONCLUIDA">Paga</option>
            <option value="PAGO_PARCIALMENTE">Pago Parcial</option>
            <option value="GLOSADA">Glosada</option>
          </select>
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
                <th className="text-center">Períodos</th>
                <th className="text-center">Dias</th>
                <th>Valor Total</th>
                <th>Status</th>
                <th>Tempo</th>
                <th className="w-[100px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(loading || loadingDisponiveis) ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={32} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
                      <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Carregando...</p>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Ban size={32} style={{ color: 'var(--tfd-text-muted)' }} />
                      <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Nenhuma ajuda de custo encontrada</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((g) => {
                  const isDisponivel = g.statusDominante === 'DISPONIVEL';
                  const style = statusStyleMap[g.statusDominante] ?? { bg: 'var(--tfd-surface-100)', text: 'var(--tfd-surface-500)', label: g.statusDominante };
                  const aguardandoRetorno = labelDestino(g.solicitacaoId);
                  const devolucaoInfo = devolucoesEnviadas.get(g.solicitacaoId);
                  const retornoRecebido = labelOrigem(g.solicitacaoId);
                  const retornoInfo = devolucoesRecebidas.get(g.solicitacaoId);

                  return (
                    <tr
                      key={g.solicitacaoId}
                      className={aguardandoRetorno ? '' : 'cursor-pointer'}
                      style={{ opacity: aguardandoRetorno ? 0.55 : undefined, backgroundColor: aguardandoRetorno ? '#F8F9FA' : retornoRecebido ? '#FFFBEB' : undefined, borderLeft: retornoRecebido ? '4px solid #F59E0B' : undefined, pointerEvents: aguardandoRetorno ? 'none' : undefined }}
                      onClick={aguardandoRetorno ? undefined : () => handleOpenDrawer(g.solicitacaoId, g.numeroProcesso, g.pacienteNome)}
                    >
                      <td>
                        <div className="flex flex-col gap-0.5">
                          <Link href={`/solicitacoes/${g.solicitacaoId}?from=ajuda-custo`} className="font-medium text-sm hover:underline" style={{ color: aguardandoRetorno ? 'var(--tfd-text-muted)' : 'var(--tfd-primary-500)' }} onClick={(e) => e.stopPropagation()}>
                            {g.numeroProcesso}
                          </Link>
                          {aguardandoRetorno && devolucaoInfo && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: '#F0F2F5', color: '#6B7280' }}>
                                Enviado p/ {aguardandoRetorno}
                              </span>
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
                      <td className="max-w-[160px] truncate font-medium">{g.pacienteNome}</td>
                      <td className="text-center">
                        {isDisponivel ? <span style={{ color: 'var(--tfd-text-muted)' }}>—</span> : (
                          <span className="inline-flex items-center justify-center min-w-[24px] h-[22px] px-1.5 rounded-full text-xs font-semibold" style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-700)' }}>
                            {g.totalPeriodos}
                          </span>
                        )}
                      </td>
                      <td className="text-center">
                        {isDisponivel ? <span style={{ color: 'var(--tfd-text-muted)' }}>—</span> : <span className="font-medium">{g.totalDias}</span>}
                      </td>
                      <td className="whitespace-nowrap font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                        {isDisponivel ? <span style={{ color: 'var(--tfd-text-muted)' }}>—</span> : formatCurrency(g.valorTotal)}
                      </td>
                      <td>
                        <span className="tfd-tag tfd-tag--rounded tfd-tag--dot" style={{ backgroundColor: style.bg, color: style.text }}>{style.label}</span>
                      </td>
                      <td>
                        {(() => { const b = slaBadge((g.periodos[0] as any)?.solicitacoes?.created_at ?? (g.periodos[0] as any)?.created_at); return (
                          <span className="tfd-tag tfd-tag--rounded text-xs font-semibold" style={b.style}>{b.label}</span>
                        ); })()}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Link href={`/solicitacoes/${g.solicitacaoId}?from=ajuda-custo`} className="tfd-btn tfd-btn-ghost tfd-btn--icon-only" title="Ver processo" style={{ pointerEvents: 'auto' }} onClick={(e) => e.stopPropagation()}>
                            <Eye size={15} />
                          </Link>
                          {!isDisponivel && !aguardandoRetorno && (
                            <button type="button" className="tfd-btn tfd-btn-ghost tfd-btn--icon-only" title="Devolver" onClick={(e) => { e.stopPropagation(); setDevolverGrupo(g); }}>
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

      {/* ========== Drawer ========== */}
      <Drawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        title="Ajuda de Custo"
        subtitle={drawerNumProcesso}
        width="560px"
        footer={
          <button className="tfd-btn tfd-btn-secondary" onClick={handleCloseDrawer}>Fechar</button>
        }
      >
        {/* Paciente info */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg mb-4" style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{drawerPacienteNome || '—'}</p>
            <p className="text-xs" style={{ color: '#1E40AF' }}>Processo: {drawerNumProcesso || '—'}</p>
          </div>
          <Link href={`/solicitacoes/${drawerSolicitacaoId}?from=ajuda-custo`} className="tfd-btn tfd-btn-ghost tfd-btn--icon-only" title="Ver processo">
            <Eye size={15} />
          </Link>
        </div>

        {/* Agendamento info */}
        {drawerAgendamento && (
          <div className="rounded-lg mb-3 px-4 py-3" style={{ border: '1px solid var(--tfd-surface-border)', backgroundColor: 'var(--tfd-surface-50)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={14} style={{ color: 'var(--tfd-primary-500)' }} />
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--tfd-text-muted)' }}>Agendamento</p>
              <span
                className="tfd-tag tfd-tag--rounded ml-auto"
                style={{
                  fontSize: '0.6rem',
                  backgroundColor: drawerAgendamento.tipo_atendimento === 'CIRURGIA' ? '#F5F3FF' : '#DBEAFE',
                  color: drawerAgendamento.tipo_atendimento === 'CIRURGIA' ? '#7C3AED' : '#1D4ED8',
                }}
              >
                {drawerAgendamento.tipo_atendimento?.replace(/_/g, ' ') ?? '—'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
              <div>
                <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Unidade</p>
                <p style={{ color: 'var(--tfd-text-primary)' }}>{drawerAgendamento.unidade_executante ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Data</p>
                <p style={{ color: 'var(--tfd-text-primary)' }}>{formatDate(drawerAgendamento.data_hora_agendamento)}</p>
              </div>
              {drawerAgendamento.cidade_destino && (
                <div>
                  <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Destino</p>
                  <p style={{ color: 'var(--tfd-text-primary)' }}>{drawerAgendamento.cidade_destino}{drawerAgendamento.uf_destino ? `/${drawerAgendamento.uf_destino}` : ''}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Passagens emitidas */}
        {drawerViagens.length > 0 && (
          <div className="rounded-lg mb-3 px-4 py-3" style={{ border: '1px solid var(--tfd-surface-border)', backgroundColor: 'var(--tfd-surface-50)' }}>
            <div className="flex items-center gap-2 mb-2">
              <Plane size={14} style={{ color: 'var(--tfd-primary-500)' }} />
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--tfd-text-muted)' }}>Passagens</p>
            </div>
            <div className="space-y-2">
              {[...drawerViagens]
                .sort((a: any, b: any) => (a.tipo === 'IDA' ? -1 : 1))
                .map((v: any) => (
                  <div key={v.id} className="flex items-center gap-3 text-sm">
                    <span
                      className="tfd-tag tfd-tag--rounded shrink-0"
                      style={{
                        fontSize: '0.6rem',
                        backgroundColor: v.tipo === 'IDA' ? '#DBEAFE' : '#F5F3FF',
                        color: v.tipo === 'IDA' ? '#1D4ED8' : '#7C3AED',
                      }}
                    >
                      {v.tipo === 'IDA' ? 'Ida' : 'Volta'}
                    </span>
                    <span style={{ color: 'var(--tfd-text-primary)' }}>
                      {v.origem_cidade ?? '—'}
                    </span>
                    <ArrowRight size={12} style={{ color: 'var(--tfd-text-muted)', flexShrink: 0 }} />
                    <span style={{ color: 'var(--tfd-text-primary)' }}>
                      {v.destino_cidade ?? '—'}
                    </span>
                    <span className="ml-auto shrink-0 font-medium" style={{ color: 'var(--tfd-text-secondary)' }}>
                      {formatDate(v.data_embarque_prevista)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Summary totals */}
        {drawerPeriodos.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 rounded-lg mb-4" style={{ backgroundColor: 'var(--tfd-primary-50)' }}>
            <div>
              <p className="text-xs font-medium" style={{ color: 'var(--tfd-primary-600)' }}>
                Resumo — {drawerPeriodos.length} {drawerPeriodos.length === 1 ? 'período' : 'períodos'}
              </p>
              <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                {drawerTotals.dias} dias · Pago: {formatCurrency(drawerTotals.pago)} / {formatCurrency(drawerTotals.valor)}
              </p>
            </div>
            <p className="text-xl font-bold" style={{ color: 'var(--tfd-primary-700)' }}>{formatCurrency(drawerTotals.valor)}</p>
          </div>
        )}

        <hr className="tfd-divider" />

        {/* Periods header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>Períodos</h3>
          {!addingPeriodo && (
            <button type="button" className="tfd-btn tfd-btn-primary tfd-btn--sm" onClick={handleStartAdd}>
              <Plus size={14} /> Adicionar Período
            </button>
          )}
        </div>

        {/* Periods list */}
        {drawerLoadingPeriodos ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
          </div>
        ) : drawerPeriodos.length === 0 && !addingPeriodo ? (
          <div className="text-center py-8">
            <Ban size={28} style={{ color: 'var(--tfd-text-muted)' }} className="mx-auto mb-2" />
            <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Nenhum período cadastrado</p>
            <button type="button" className="tfd-btn tfd-btn-primary tfd-btn--sm mt-3" onClick={handleStartAdd}>
              <Plus size={14} /> Adicionar Primeiro Período
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3 mb-4">
            {drawerPeriodos.map((p: any, idx: number) => {
              const pStyle = statusStyleMap[p.status] ?? statusStyleMap.EM_ANALISE;
              const dias = p.dias_elegiveis ?? calcularDias(p.data_inicio, p.data_fim ?? '');
              const isActionTarget = inlineAction?.periodoId === p.id;
              const saldoPendente = (p.status === 'PAGO_PARCIALMENTE' && p.valor_pago != null) ? (p.valor_total ?? 0) - p.valor_pago : null;

              return (
                <div
                  key={p.id}
                  className="rounded-lg px-4 py-3"
                  style={{ border: `1px solid ${isActionTarget ? 'var(--tfd-primary-300)' : 'var(--tfd-surface-border)'}`, backgroundColor: isActionTarget ? 'var(--tfd-primary-50)' : 'var(--tfd-surface-50)' }}
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold" style={{ color: 'var(--tfd-text-muted)' }}>#{idx + 1}</span>
                      <span className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                        {formatPeriodo(p.data_inicio, p.data_fim ?? p.data_inicio)}
                      </span>
                    </div>
                    <span className="tfd-tag tfd-tag--rounded tfd-tag--dot shrink-0" style={{ backgroundColor: pStyle.bg, color: pStyle.text, fontSize: '0.65rem' }}>
                      {pStyle.label}
                    </span>
                  </div>

                  {/* Info line */}
                  <div className="flex items-center gap-4 text-xs mb-1" style={{ color: 'var(--tfd-text-secondary)' }}>
                    <span>{p.tipo === 'PACIENTE' ? 'Paciente' : 'Acompanhante'}</span>
                    <span>{dias} dias</span>
                    <span>{formatCurrency(p.valor_diaria ?? 0)}/dia</span>
                    <span className="font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{formatCurrency(p.valor_total ?? 0)}</span>
                  </div>

                  {/* Payment info */}
                  {(p.status === 'CONCLUIDA' || p.status === 'PAGO_PARCIALMENTE') && p.valor_pago != null && (
                    <div className="flex items-center gap-3 text-xs mt-1 px-2 py-1.5 rounded" style={{ backgroundColor: p.status === 'CONCLUIDA' ? '#F0FDF4' : '#FFF7ED' }}>
                      <span style={{ color: 'var(--tfd-text-secondary)' }}>Valor pago:</span>
                      <span className="font-semibold" style={{ color: p.status === 'CONCLUIDA' ? '#15803D' : '#C2410C' }}>
                        {formatCurrency(p.valor_pago)}
                      </span>
                      {saldoPendente != null && saldoPendente !== 0 && (
                        <>
                          <span style={{ color: 'var(--tfd-text-muted)' }}>·</span>
                          <span style={{ color: '#C2410C' }}>
                            Saldo: {formatCurrency(saldoPendente)}
                          </span>
                        </>
                      )}
                    </div>
                  )}

                  {p.observacoes && (
                    <p className="text-xs mt-1" style={{ color: 'var(--tfd-text-muted)' }}>{p.observacoes}</p>
                  )}

                  {/* Action buttons */}
                  {!isActionTarget && !addingPeriodo && (
                    <div className="flex items-center gap-1.5 pt-2 mt-2" style={{ borderTop: '1px solid var(--tfd-surface-border)' }}>
                      {p.status === 'EM_ANALISE' && (
                        <>
                          <button type="button" className="tfd-btn tfd-btn--sm" style={{ backgroundColor: 'var(--tfd-status-success)', color: 'white', fontSize: '0.7rem', padding: '3px 8px' }} onClick={() => setInlineAction({ type: 'aprovar', periodoId: p.id })}>
                            <CheckCircle2 size={12} /> Aprovar
                          </button>
                          <button type="button" className="tfd-btn tfd-btn--sm" style={{ backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '0.7rem', padding: '3px 8px' }} onClick={() => setInlineAction({ type: 'glosar', periodoId: p.id })}>
                            Glosar
                          </button>
                          <button type="button" className="tfd-btn tfd-btn-ghost tfd-btn--icon-only tfd-btn--sm" title="Editar" onClick={() => handleStartEdit(p)}>
                            <Pencil size={13} />
                          </button>
                        </>
                      )}
                      {p.status === 'APROVADA' && (
                        <>
                          <button type="button" className="tfd-btn tfd-btn--sm" style={{ backgroundColor: '#16A34A', color: 'white', fontSize: '0.7rem', padding: '3px 8px' }} onClick={() => { setInlineAction({ type: 'pagar', periodoId: p.id }); setValorPagoInput(maskCurrency(String(Math.round((p.valor_total ?? 0) * 100)))); }}>
                            <CircleDollarSign size={12} /> Pago
                          </button>
                          <button type="button" className="tfd-btn tfd-btn-ghost tfd-btn--icon-only tfd-btn--sm" title="Editar (volta para análise)" onClick={() => handleStartEdit(p)}>
                            <Pencil size={13} />
                          </button>
                        </>
                      )}
                      {(p.status === 'CONCLUIDA' || p.status === 'PAGO_PARCIALMENTE' || p.status === 'GLOSADA') && (
                        <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                          {p.status === 'GLOSADA' && 'Glosado'}
                          {p.status === 'CONCLUIDA' && p.pago_em && `Pago em ${formatDate(p.pago_em)}`}
                          {p.status === 'PAGO_PARCIALMENTE' && p.pago_em && `Pago parcial em ${formatDate(p.pago_em)}`}
                        </span>
                      )}
                    </div>
                  )}

                  {/* ---- INLINE: Aprovar confirmation ---- */}
                  {isActionTarget && inlineAction?.type === 'aprovar' && (
                    <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--tfd-primary-200)' }}>
                      <p className="text-xs font-medium mb-2" style={{ color: 'var(--tfd-text-primary)' }}>
                        Confirma a aprovação deste período de {formatCurrency(p.valor_total ?? 0)}?
                      </p>
                      <div className="flex gap-2">
                        <button className="tfd-btn tfd-btn-secondary tfd-btn--sm flex-1" disabled={actionLoading} onClick={resetInlineAction}>Cancelar</button>
                        <button className="tfd-btn tfd-btn--sm flex-1" style={{ backgroundColor: 'var(--tfd-status-success)', color: 'white' }} disabled={actionLoading} onClick={() => handleConfirmAprovar(p.id)}>
                          {actionLoading ? 'Aprovando...' : 'Confirmar Aprovação'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ---- INLINE: Glosar form ---- */}
                  {isActionTarget && inlineAction?.type === 'glosar' && (
                    <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--tfd-primary-200)' }}>
                      <p className="text-xs font-medium mb-2" style={{ color: 'var(--tfd-text-primary)' }}>
                        Motivo da glosa
                      </p>
                      <textarea
                        className="tfd-input mb-2"
                        rows={2}
                        placeholder="Informe o motivo da glosa..."
                        value={glosarMotivo}
                        onChange={(e) => setGlosarMotivo(e.target.value)}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button className="tfd-btn tfd-btn-secondary tfd-btn--sm flex-1" disabled={actionLoading} onClick={resetInlineAction}>Cancelar</button>
                        <button className="tfd-btn tfd-btn--sm flex-1" style={{ backgroundColor: '#F59E0B', color: 'white' }} disabled={actionLoading || !glosarMotivo.trim()} onClick={() => handleConfirmGlosar(p.id)}>
                          {actionLoading ? 'Glosando...' : 'Confirmar Glosa'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ---- INLINE: Pagar form ---- */}
                  {isActionTarget && inlineAction?.type === 'pagar' && (
                    <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--tfd-primary-200)' }}>
                      <p className="text-xs font-medium mb-2" style={{ color: 'var(--tfd-text-primary)' }}>
                        Registrar pagamento
                      </p>
                      <div className="mb-2">
                        <label className="tfd-label">Valor pago</label>
                        <input
                          type="text"
                          className="tfd-input"
                          placeholder="R$ 0,00"
                          value={valorPagoInput}
                          onChange={(e) => setValorPagoInput(maskCurrency(e.target.value))}
                          autoFocus
                        />
                        <p className="text-xs mt-1" style={{ color: 'var(--tfd-text-muted)' }}>
                          Valor aprovado: {formatCurrency(p.valor_total ?? 0)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button className="tfd-btn tfd-btn-secondary tfd-btn--sm flex-1" disabled={actionLoading} onClick={resetInlineAction}>Cancelar</button>
                        <button className="tfd-btn tfd-btn--sm flex-1" style={{ backgroundColor: '#16A34A', color: 'white' }} disabled={actionLoading || !valorPagoInput} onClick={() => handleConfirmPagar(p.id)}>
                          {actionLoading ? 'Registrando...' : 'Confirmar Pagamento'}
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

        {/* ---- Add/Edit period form ---- */}
        {addingPeriodo && (
          <>
            <hr className="tfd-divider" />
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
              {editingPeriodoId ? 'Editar Período' : 'Novo Período'}
            </h3>
            {editingPeriodoId && (
              <div className="tfd-message tfd-message--warn mb-3">
                <span className="tfd-message-icon mt-0.5 shrink-0"><AlertTriangle size={14} /></span>
                <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>
                  Ao salvar, o período voltará para <strong>Em Análise</strong> e precisará ser reaprovado.
                </p>
              </div>
            )}

            <FormField label="Tipo de beneficiário" required>
              <select className="tfd-input" value={tipoBeneficiario} onChange={(e) => setTipoBeneficiario(e.target.value)}>
                <option value="PACIENTE">Paciente</option>
                <option value="ACOMPANHANTE">Acompanhante</option>
              </select>
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Data de início" required>
                <input type="date" className="tfd-input" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
              </FormField>
              <FormField label="Data de fim" error={dataFimError}>
                <input type="date" className="tfd-input" min={dataInicio || undefined} value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
              </FormField>
            </div>

            <FormField label="Valor da diária">
              <input type="text" className="tfd-input" placeholder={`R$ ${valorDiariaCompleta.toFixed(2).replace('.', ',')}`} value={valorDiaria} onChange={(e) => setValorDiaria(maskCurrency(e.target.value))} />
            </FormField>

            <div className="flex items-center justify-between px-4 py-3 rounded-lg mb-4" style={{ backgroundColor: 'var(--tfd-primary-50)' }}>
              <div>
                <p className="text-xs" style={{ color: 'var(--tfd-primary-600)' }}>Total do período</p>
                <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                  {diasCalc > 1
                    ? `(${diasCalc} - 1) × ${formatCurrency(valorDiariaNum)} + ${formatCurrency(valorDiariaRetorno)} (dia de retorno)`
                    : diasCalc === 1
                      ? `${formatCurrency(valorDiariaRetorno)} (dia único, sem pernoite)`
                      : '—'}
                </p>
              </div>
              <p className="text-xl font-bold" style={{ color: 'var(--tfd-primary-700)' }}>{formatCurrency(valorTotalCalc)}</p>
            </div>

            <FormField label="Observações">
              <textarea className="tfd-input" rows={2} placeholder="Ex: paciente internado de 05/04 a 07/04..." value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
            </FormField>

            <div className="flex gap-2">
              <button className="tfd-btn tfd-btn-secondary flex-1" onClick={resetPeriodoForm}>Cancelar</button>
              <button className="tfd-btn tfd-btn-primary flex-1" onClick={handleSavePeriodo}>
                {editingPeriodoId ? 'Salvar Alterações' : 'Salvar Período'}
              </button>
            </div>
          </>
        )}
      </Drawer>

      {/* ========== Modal Devolver ========== */}
      <DevolverModal
        open={!!devolverGrupo}
        onClose={() => setDevolverGrupo(null)}
        setorAtual="AJUDA_CUSTO"
        solicitacaoId={devolverGrupo?.solicitacaoId ?? ''}
        statusAtual={devolverGrupo?.solicitacaoStatus as any ?? 'EM_PAGAMENTO'}
        label={`${devolverGrupo?.numeroProcesso ?? ''} — ${devolverGrupo?.pacienteNome ?? 'Paciente'}`}
        onSuccess={() => { refreshAll(); refreshDevolucoes(); toast.success('Solicitação devolvida', 'A solicitação foi encaminhada ao setor selecionado.'); }}
      />
    </>
  );
}
