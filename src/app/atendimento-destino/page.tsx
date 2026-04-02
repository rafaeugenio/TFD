'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import {
  Search,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  Info,
  CalendarClock,
  FileCheck,
  Trash2,
  SendHorizonal,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import DevolverModal from '@/shared/components/devolver-modal/DevolverModal';
import { useDevolucoesPendentes } from '@/shared/hooks/useDevolucoesPendentes';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import { useToast } from '@/shared/components/toast/Toast';
import { listarAgendamentos, criarAgendamento, atualizarAgendamento, excluirAgendamento, listarSolicitacoesAguardandoAgendamento, buscarRotaParaAgendamento } from '@/services/agendamentos.service';
import { useSupabaseData } from '@/shared/hooks/useSupabaseData';
import type { StatusAgendamento, TipoAtendimento, OrigemAgendamento } from '@/lib/supabase/database.types';
import { formatDate } from '@/shared/pipes/formatters';
import { useLookup } from '@/shared/hooks/useLookup';
import UfCidadeSelect from '@/shared/components/uf-cidade-select/UfCidadeSelect';

/* -------------------------------------------------- */
/*  Tab config                                         */
/* -------------------------------------------------- */

type TabKey = 'TODOS' | 'DISPONIVEL' | StatusAgendamento;

const TABS: { key: TabKey; label: string }[] = [
  { key: 'TODOS', label: 'Todos' },
  { key: 'DISPONIVEL', label: 'Disponíveis' },
  { key: 'AGUARDANDO_CONFIRMACAO', label: 'Pendentes' },
  { key: 'CONFIRMADO', label: 'Confirmados' },
];

/* -------------------------------------------------- */
/*  Status styling                                     */
/* -------------------------------------------------- */

interface StatusStyle {
  bg: string;
  text: string;
  label: string;
}

const statusStyleMap: Record<StatusAgendamento, StatusStyle> = {
  AGUARDANDO_CONFIRMACAO: { bg: '#FEF3C7', text: '#92400E', label: 'Pendente' },
  CONFIRMADO: { bg: '#DCFCE7', text: '#15803D', label: 'Confirmado' },
};

/* -------------------------------------------------- */
/*  TipoAtendimento styling                            */
/* -------------------------------------------------- */

interface TipoStyle {
  bg: string;
  text: string;
  label: string;
}

const tipoStyleMap: Record<TipoAtendimento, TipoStyle> = {
  CONSULTA: { bg: '#DBEAFE', text: '#1D4ED8', label: 'Consulta' },
  CIRURGIA: { bg: '#F5F3FF', text: '#7C3AED', label: 'Cirurgia' },
  EXAME: { bg: '#CCFBF1', text: '#0F766E', label: 'Exame' },
  TRATAMENTO_CONTINUO: { bg: '#FFF7ED', text: '#C2410C', label: 'Trat. Contínuo' },
  QUIMIOTERAPIA: { bg: '#FEF3C7', text: '#92400E', label: 'Quimioterapia' },
  RADIOTERAPIA: { bg: '#FCE7F3', text: '#BE185D', label: 'Radioterapia' },
  HEMODIALISE: { bg: '#E0E7FF', text: '#4338CA', label: 'Hemodiálise' },
  REABILITACAO: { bg: '#DCFCE7', text: '#15803D', label: 'Reabilitação' },
  OUTROS: { bg: 'var(--tfd-surface-100)', text: 'var(--tfd-text-secondary)', label: 'Outros' },
};

/* -------------------------------------------------- */
/*  OrigemAgendamento styling                          */
/* -------------------------------------------------- */

interface OrigemStyle {
  bg: string;
  text: string;
  label: string;
}

const origemStyleMap: Record<OrigemAgendamento, OrigemStyle> = {
  CNRAC: { bg: '#F5F3FF', text: '#7C3AED', label: 'CNRAC' },
  CENTRAL_TRANSPLANTES: { bg: '#FFF7ED', text: '#C2410C', label: 'Central Transplantes' },
  CONTATO_DIRETO: { bg: 'var(--tfd-surface-100)', text: 'var(--tfd-surface-500)', label: 'Contato Direto' },
  EMAIL: { bg: '#DBEAFE', text: '#1D4ED8', label: 'E-mail' },
  OUTRO: { bg: 'var(--tfd-surface-100)', text: 'var(--tfd-surface-500)', label: 'Outro' },
};

/* -------------------------------------------------- */
/*  Helpers                                            */
/* -------------------------------------------------- */

function isAlertaSla(ag: any): boolean {
  if (ag.status === 'CONFIRMADO') return false;
  if (!ag.data_hora_agendamento) return false;
  const agDate = new Date(ag.data_hora_agendamento);
  const now = new Date();
  const diffDays = (agDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays >= 0 && diffDays <= 5;
}

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function AtendimentoDestinoPage() {
  const toast = useToast();
  const { options: tipoOptions, loading: tipoLoading } = useLookup('tipo_procedimento');
  const { options: origemOptions, loading: origemLoading } = useLookup('origem_agendamento');

  const [activeTab, setActiveTab] = useState<TabKey>('TODOS');
  const [search, setSearch] = useState('');
  const [devolverItem, setDevolverItem] = useState<any>(null);

  /* ---- Devoluções pendentes ---- */
  const { mapa: devolucoesEnviadas, labelDestino, refresh: refreshDevolucoes } = useDevolucoesPendentes('AGENDAMENTO');

  /* ---- Drawer state ---- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [solicitacaoId, setSolicitacaoId] = useState('');
  const [pacienteNome, setPacienteNome] = useState('');
  const [numProcesso, setNumProcesso] = useState('');
  const [nomeUnidade, setNomeUnidade] = useState('');
  const [cnes, setCnes] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [tipoContato, setTipoContato] = useState('');
  const [contatoUnidade, setContatoUnidade] = useState('');
  const [tipoAtendimento, setTipoAtendimento] = useState('');
  const [dataAgendamento, setDataAgendamento] = useState('');
  const [origemAgendamento, setOrigemAgendamento] = useState('');
  const [numCnrac, setNumCnrac] = useState('');
  const [comprovante, setComprovante] = useState<File | null>(null);


  /* ---- Edit / Delete state ---- */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusAgendamento, setStatusAgendamento] = useState<string>('AGUARDANDO_CONFIRMACAO');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  const resetDrawerForm = () => {
    setSolicitacaoId('');
    setNumProcesso('');
    setPacienteNome('');
    setNomeUnidade('');
    setCnes('');
    setCidade('');
    setUf('');
    setTipoContato('');
    setContatoUnidade('');
    setTipoAtendimento('');
    setDataAgendamento('');
    setOrigemAgendamento('');
    setNumCnrac('');
    setComprovante(null);
    setEditingId(null);
    setStatusAgendamento('AGUARDANDO_CONFIRMACAO');
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    resetDrawerForm();
  };

  /** Maps routing tipo_rota to origem_agendamento */
  const ROTA_TO_ORIGEM: Record<string, string> = {
    CNRAC: 'CNRAC',
    SETI: 'CENTRAL_TRANSPLANTES',
    RESPOSTA_EXTERNA: 'CONTATO_DIRETO',
    SERVICO_SOCIAL: 'OUTRO',
    APROVADO_DIRETO: 'CONTATO_DIRETO',
  };

  /** Opens drawer for a "disponível" solicitação (no agendamento yet) */
  async function handleOpenNew(sol: any) {
    resetDrawerForm();
    setSolicitacaoId(sol.id);
    setNumProcesso(sol.numero_processo ?? '');
    setPacienteNome(sol.pacientes?.nome_completo ?? '');
    setDrawerOpen(true);

    // Pre-fill from routing decision
    const { data: rota } = await buscarRotaParaAgendamento(sol.id);
    if (rota) {
      const origem = ROTA_TO_ORIGEM[rota.tipo_rota] ?? '';
      setOrigemAgendamento(origem);
    }
  }

  function handleOpenEdit(ag: any) {
    setEditingId(ag.id);
    setSolicitacaoId(ag.solicitacao_id);
    setNumProcesso(ag.solicitacoes?.numero_processo ?? '');
    setPacienteNome(ag.solicitacoes?.pacientes?.nome_completo ?? '');
    setNomeUnidade(ag.unidade_executante ?? '');
    setCnes(ag.cnes ?? '');
    setCidade(ag.cidade_destino ?? '');
    setUf(ag.uf_destino ?? '');
    // Parse stored contact: "TIPO: valor" format
    const storedContact = ag.contato_unidade ?? '';
    const contactMatch = storedContact.match(/^(TELEFONE|WHATSAPP|SMS|EMAIL):\s*(.*)$/);
    if (contactMatch) {
      setTipoContato(contactMatch[1]);
      setContatoUnidade(contactMatch[2]);
    } else {
      setTipoContato('');
      setContatoUnidade(storedContact);
    }
    setTipoAtendimento(ag.tipo_atendimento ?? '');
    setDataAgendamento(ag.data_hora_agendamento ? ag.data_hora_agendamento.split('T')[0] : '');
    setOrigemAgendamento(ag.origem_agendamento ?? '');
    setNumCnrac(ag.numero_cnrac ?? '');
    setStatusAgendamento(ag.status ?? 'AGUARDANDO_CONFIRMACAO');
    setDrawerOpen(true);
  }

  function handleOpenDelete(ag: any) {
    setDeleteConfirmId(ag.id);
    setDeleteConfirmName(ag.solicitacoes?.pacientes?.nome_completo ?? ag.unidade_executante ?? 'este agendamento');
  }

  async function handleConfirmDelete() {
    if (!deleteConfirmId) return;
    const { error } = await excluirAgendamento(deleteConfirmId);
    if (error) {
      toast.error('Erro ao excluir', (error as any).message);
    } else {
      toast.success('Agendamento excluído', 'O registro foi removido com sucesso.');
      refreshAll();
    }
    setDeleteConfirmId(null);
    setDeleteConfirmName('');
  }

  /* ---- Data fetch: agendamentos ---- */
  const { data: agendamentos, loading, count: totalCount, refresh } = useSupabaseData(
    () => listarAgendamentos({
      status: (activeTab === 'TODOS' || activeTab === 'DISPONIVEL') ? undefined : activeTab,
      search,
    }),
    [activeTab, search],
  );

  /* ---- Data fetch: solicitações aguardando agendamento (sem agendamento ainda) ---- */
  const [solDisp, setSolDisp] = useState<any[]>([]);
  const [solDispLoading, setSolDispLoading] = useState(false);

  async function refreshDisp() {
    setSolDispLoading(true);
    const { data } = await listarSolicitacoesAguardandoAgendamento();
    setSolDisp(data ?? []);
    setSolDispLoading(false);
  }

  useEffect(() => { refreshDisp(); }, []);

  /** Unified rows: disponíveis + agendamentos */
  const allRows = useMemo(() => {
    const dispRows = solDisp.map((sol: any) => ({
      _type: 'DISPONIVEL' as const,
      id: sol.id,
      solicitacao_id: sol.id,
      numero_processo: sol.numero_processo,
      paciente_nome: sol.pacientes?.nome_completo ?? '—',
      created_at: sol.created_at,
      raw: sol,
    }));
    const agRows = agendamentos.map((ag: any) => ({
      _type: 'AGENDADO' as const,
      id: ag.id,
      solicitacao_id: ag.solicitacao_id,
      numero_processo: ag.solicitacoes?.numero_processo ?? '—',
      paciente_nome: ag.solicitacoes?.pacientes?.nome_completo ?? '—',
      created_at: ag.created_at,
      raw: ag,
    }));

    if (activeTab === 'DISPONIVEL') return dispRows;
    if (activeTab === 'TODOS') return [...dispRows, ...agRows];
    return agRows; // filtered by status already in the query
  }, [solDisp, agendamentos, activeTab]);

  function refreshAll() {
    refresh();
    refreshDisp();
  }

  async function handleSubmitAgendamento() {
    if (!solicitacaoId) {
      toast.error('Solicitação não encontrada', 'Busque e selecione uma solicitação válida.');
      return;
    }

    const payload = {
      solicitacao_id: solicitacaoId,
      unidade_executante: nomeUnidade,
      cnes: cnes || undefined,
      cidade_destino: cidade,
      uf_destino: uf,
      contato_unidade: (tipoContato && contatoUnidade) ? `${tipoContato}: ${contatoUnidade}` : contatoUnidade || undefined,
      tipo_atendimento: (tipoAtendimento as TipoAtendimento) || undefined,
      data_hora_agendamento: dataAgendamento ? new Date(dataAgendamento).toISOString() : new Date().toISOString(),
      origem_agendamento: (origemAgendamento as OrigemAgendamento) || undefined,
      numero_cnrac: numCnrac || undefined,
      status: statusAgendamento as StatusAgendamento,
    };

    try {
      const result = editingId
        ? await atualizarAgendamento(editingId, payload)
        : await criarAgendamento(payload);

      if (result.error) {
        toast.error(
          editingId ? 'Erro ao atualizar' : 'Erro ao registrar agendamento',
          (result.error as any).message,
        );
        return;
      }
      toast.success(
        editingId ? 'Agendamento atualizado!' : 'Agendamento registrado!',
        editingId ? 'As alterações foram salvas.' : 'O agendamento foi salvo com sucesso.',
      );
      handleCloseDrawer();
      refreshAll();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error('Erro inesperado', e.message ?? 'Tente novamente');
    }
  }

  /* ---- Summary counters ---- */
  const summary = useMemo(() => {
    return {
      disponiveis: solDisp.length,
      aguardando: agendamentos.filter((ag: any) => ag.status === 'AGUARDANDO_CONFIRMACAO').length,
      confirmados: agendamentos.filter((ag: any) => ag.status === 'CONFIRMADO').length,
      alertaSla: agendamentos.filter((ag: any) => isAlertaSla(ag)).length,
    };
  }, [agendamentos, solDisp]);

  return (
    <>
      <PageHeader
        title="Atendimento no Destino"
        subtitle="Agendamentos em unidades de saúde de referência"
      />

      {/* ========== Info Banner ========== */}
      <div className="tfd-message tfd-message--warn mb-6">
        <span className="tfd-message-icon mt-0.5 shrink-0">
          <Info size={16} />
        </span>
        <div className="flex-1">
          <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
            Passagens só podem ser emitidas após confirmação do agendamento com comprovante anexado.
          </p>
        </div>
      </div>

      {/* ========== Summary Cards ========== */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#DBEAFE', color: '#3B82F6' }}
          >
            <CalendarClock size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Disponíveis p/ agendamento</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{summary.disponiveis}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#FEF3C7', color: '#F59E0B' }}
          >
            <Clock size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Aguardando Confirmação</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{summary.aguardando}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#DCFCE7', color: '#16A34A' }}
          >
            <FileCheck size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Confirmados</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{summary.confirmados}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#FEE2E2', color: '#EF4444' }}
          >
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Alerta SLA</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-status-danger)' }}>{summary.alertaSla}</p>
          </div>
        </div>
      </div>

      {/* ========== Tabs + Search ========== */}
      <div className="tfd-toolbar mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-1 flex-wrap">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = tab.key === 'TODOS'
              ? agendamentos.length
              : agendamentos.filter((ag: any) => ag.status === tab.key).length;
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
            placeholder="Buscar paciente, processo, hospital..."
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
                <th>Nº Processo</th>
                <th>Paciente</th>
                <th>Destino</th>
                <th className="hidden md:table-cell">Tipo</th>
                <th className="hidden lg:table-cell">Origem</th>
                <th className="hidden md:table-cell">Data Agendamento</th>
                <th>Comprovante</th>
                <th>Status</th>
                <th className="w-[100px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(loading || solDispLoading) ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                      Carregando...
                    </p>
                  </td>
                </tr>
              ) : allRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <XCircle size={32} style={{ color: 'var(--tfd-text-muted)' }} />
                      <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                        Nenhum agendamento encontrado
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                allRows.map((row) => {
                  const ag = row._type === 'AGENDADO' ? row.raw : null;
                  const statusStyle = ag ? statusStyleMap[ag.status as StatusAgendamento] : null;
                  const tipoStyle = ag?.tipo_atendimento ? tipoStyleMap[ag.tipo_atendimento as TipoAtendimento] : null;
                  const origemStyle = ag?.origem_agendamento ? origemStyleMap[ag.origem_agendamento as OrigemAgendamento] : null;
                  const alertaSla = ag ? isAlertaSla(ag) : false;
                  const temComprovante = ag?.comprovante_doc_id != null;
                  const aguardandoRetorno = labelDestino(row.solicitacao_id);

                  return (
                    <tr
                      key={`${row._type}-${row.id}`}
                      className={aguardandoRetorno ? '' : 'cursor-pointer'}
                      style={{ opacity: aguardandoRetorno ? 0.5 : undefined, pointerEvents: aguardandoRetorno ? 'none' : undefined }}
                      onClick={aguardandoRetorno ? undefined : () => row._type === 'DISPONIVEL' ? handleOpenNew(row.raw) : handleOpenEdit(row.raw)}
                    >
                      {/* Nº Processo */}
                      <td>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            {alertaSla && (
                              <span title="Alerta SLA — data próxima sem confirmação">
                                <AlertTriangle size={14} style={{ color: 'var(--tfd-status-danger)' }} />
                              </span>
                            )}
                            <Link
                              href={`/solicitacoes/${row.solicitacao_id}`}
                              className="font-medium text-sm hover:underline"
                              style={{ color: 'var(--tfd-primary-500)' }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {row.numero_processo}
                            </Link>
                          </div>
                          {aguardandoRetorno && (
                            <span className="tfd-tag tfd-tag--rounded" style={{ backgroundColor: '#FEF3C7', color: '#92400E', fontSize: '0.625rem' }}>
                              Ag. retorno — {aguardandoRetorno}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Paciente */}
                      <td className="max-w-[160px] truncate font-medium">
                        {row.paciente_nome}
                      </td>

                      {/* Destino */}
                      <td>
                        {ag ? (
                          <div className="flex flex-col">
                            <span className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{ag.unidade_executante}</span>
                            <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>{ag.cidade_destino}/{ag.uf_destino}</span>
                          </div>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Tipo */}
                      <td className="hidden md:table-cell">
                        {tipoStyle ? (
                          <span className="tfd-tag tfd-tag--rounded" style={{ backgroundColor: tipoStyle.bg, color: tipoStyle.text }}>{tipoStyle.label}</span>
                        ) : (
                          <span style={{ color: 'var(--tfd-text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Origem */}
                      <td className="hidden lg:table-cell">
                        {origemStyle ? (
                          <span className="tfd-tag tfd-tag--rounded" style={{ backgroundColor: origemStyle.bg, color: origemStyle.text }}>{origemStyle.label}</span>
                        ) : (
                          <span style={{ color: 'var(--tfd-text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Data Agendamento */}
                      <td className="hidden md:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>
                        {ag ? formatDate(ag.data_hora_agendamento) : '—'}
                      </td>

                      {/* Comprovante */}
                      <td className="text-center">
                        {row._type === 'DISPONIVEL' ? (
                          <span style={{ color: 'var(--tfd-text-muted)' }}>—</span>
                        ) : temComprovante ? (
                          <span title="Comprovante anexado"><CheckCircle2 size={18} style={{ color: 'var(--tfd-status-success)' }} /></span>
                        ) : (
                          <span title="Aguardando comprovante"><Clock size={18} style={{ color: 'var(--tfd-status-warning)' }} /></span>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        {row._type === 'DISPONIVEL' ? (
                          <span className="tfd-tag tfd-tag--rounded tfd-tag--dot" style={{ backgroundColor: '#DBEAFE', color: '#1D4ED8' }}>Disponível</span>
                        ) : statusStyle ? (
                          <span className="tfd-tag tfd-tag--rounded tfd-tag--dot" style={{ backgroundColor: statusStyle.bg, color: statusStyle.text }}>{statusStyle.label}</span>
                        ) : (
                          <span className="tfd-tag tfd-tag--rounded" style={{ backgroundColor: 'var(--tfd-surface-100)', color: 'var(--tfd-text-muted)' }}>{ag?.status}</span>
                        )}
                      </td>

                      {/* Ações */}
                      <td>
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/solicitacoes/${row.solicitacao_id}`}
                            className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                            title="Ver processo"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Eye size={15} />
                          </Link>
                          {ag && (
                            <>
                              <button
                                type="button"
                                className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                                title="Devolver"
                                onClick={(e) => { e.stopPropagation(); setDevolverItem(ag); }}
                              >
                                <SendHorizonal size={15} />
                              </button>
                              <button
                                type="button"
                                className="tfd-btn tfd-btn-danger tfd-btn--icon-only"
                                title="Excluir agendamento"
                                onClick={(e) => { e.stopPropagation(); handleOpenDelete(ag); }}
                              >
                                <Trash2 size={15} />
                              </button>
                            </>
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
                  <span>Excluir agendamento</span>
                </div>
              </div>
              <div className="tfd-dialog-content">
                <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
                  Tem certeza que deseja excluir o agendamento de <strong>{deleteConfirmName}</strong>? Esta ação não pode ser desfeita.
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

      {/* ========== Drawer Agendamento (Criar / Editar) ========== */}
      <Drawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        title={editingId ? 'Editar Agendamento' : 'Novo Agendamento'}
        subtitle={editingId ? `Editando ${numProcesso}` : 'Registrar agendamento em unidade de destino'}
        width="480px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={handleCloseDrawer}>
              Cancelar
            </button>
            <button className="tfd-btn tfd-btn-primary" onClick={handleSubmitAgendamento}>
              {editingId ? 'Salvar Alterações' : 'Registrar Agendamento'}
            </button>
          </>
        }
      >
        {/* Section: Processo (read-only — comes from the clicked row) */}
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg mb-3" style={{ backgroundColor: 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{pacienteNome || '—'}</p>
            <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Processo: <strong style={{ color: 'var(--tfd-primary-500)' }}>{numProcesso}</strong></p>
          </div>
        </div>

        <hr className="tfd-divider" />

        {/* Section: Unidade de Destino */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Unidade de Destino</h3>
        <FormField label="Nome da unidade" required>
          <input
            type="text"
            className="tfd-input"
            placeholder="Ex: Hospital Sírio-Libanês"
            value={nomeUnidade}
            onChange={(e) => setNomeUnidade(e.target.value)}
          />
        </FormField>
        <FormField label="CNES">
          <input
            type="text"
            className="tfd-input"
            placeholder="0000000"
            maxLength={7}
            value={cnes}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 7);
              setCnes(v);
            }}
            style={{ fontFamily: 'var(--tfd-font-mono)' }}
          />
        </FormField>
        <UfCidadeSelect
          uf={uf}
          cidade={cidade}
          onUfChange={setUf}
          onCidadeChange={setCidade}
          required
        />
        <FormField label="Tipo de contato">
          <select
            className="tfd-input"
            value={tipoContato}
            onChange={(e) => { setTipoContato(e.target.value); setContatoUnidade(''); }}
          >
            <option value="">Selecione...</option>
            <option value="TELEFONE">Telefone</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="SMS">SMS</option>
            <option value="EMAIL">E-mail</option>
          </select>
        </FormField>
        {tipoContato && (
          <FormField label={tipoContato === 'EMAIL' ? 'E-mail' : 'Número'}>
            {tipoContato === 'EMAIL' ? (
              <input
                type="email"
                className="tfd-input"
                placeholder="contato@hospital.com.br"
                value={contatoUnidade}
                onChange={(e) => setContatoUnidade(e.target.value)}
              />
            ) : (
              <input
                type="tel"
                className="tfd-input"
                placeholder="(00) 00000-0000"
                value={contatoUnidade}
                onChange={(e) => {
                  let v = e.target.value.replace(/\D/g, '').slice(0, 11);
                  if (v.length > 6) v = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
                  else if (v.length > 2) v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
                  else if (v.length > 0) v = `(${v}`;
                  setContatoUnidade(v);
                }}
              />
            )}
          </FormField>
        )}

        <hr className="tfd-divider" />

        {/* Section: Agendamento */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Agendamento</h3>
        <FormField label="Tipo de atendimento" required>
          <select
            className="tfd-input"
            value={tipoAtendimento}
            onChange={(e) => setTipoAtendimento(e.target.value)}
            disabled={tipoLoading}
          >
            <option value="">{tipoLoading ? 'Carregando...' : 'Selecione...'}</option>
            {tipoOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Data do agendamento" required>
          <input
            type="date"
            className="tfd-input"
            value={dataAgendamento}
            onChange={(e) => setDataAgendamento(e.target.value)}
          />
        </FormField>
        <FormField label="Origem do agendamento">
          {origemAgendamento ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}>
              <span className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                {origemStyleMap[origemAgendamento as OrigemAgendamento]?.label ?? origemAgendamento}
              </span>
              <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>(definido na regulação)</span>
            </div>
          ) : (
            <select
              className="tfd-input"
              value={origemAgendamento}
              onChange={(e) => setOrigemAgendamento(e.target.value)}
              disabled={origemLoading}
            >
              <option value="">{origemLoading ? 'Carregando...' : 'Selecione...'}</option>
              {origemOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          )}
        </FormField>
        {origemAgendamento === 'CNRAC' && (
          <FormField label="Nº CNRAC">
            <input
              type="text"
              className="tfd-input"
              placeholder="Número CNRAC"
              value={numCnrac}
              onChange={(e) => setNumCnrac(e.target.value)}
              style={{ fontFamily: 'var(--tfd-font-mono)' }}
            />
          </FormField>
        )}

        <hr className="tfd-divider" />

        {/* Section: Status */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Status</h3>
        <FormField label="Status do agendamento">
          <select
            className="tfd-input"
            value={statusAgendamento}
            onChange={(e) => setStatusAgendamento(e.target.value)}
          >
            <option value="AGUARDANDO_CONFIRMACAO">Aguardando Confirmação</option>
            <option value="CONFIRMADO">Confirmado</option>
          </select>
        </FormField>

        <hr className="tfd-divider" />

        {/* Section: Comprovante */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Comprovante</h3>
        <FormField label="Upload de comprovante">
          <div className="relative">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="tfd-input pt-1.5"
              onChange={(e) => setComprovante(e.target.files?.[0] ?? null)}
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

      <DevolverModal
        open={!!devolverItem}
        onClose={() => setDevolverItem(null)}
        setorAtual="AGENDAMENTO"
        solicitacaoId={devolverItem?.solicitacao_id ?? ''}
        statusAtual={(devolverItem?.solicitacoes as any)?.status ?? 'AGUARDANDO_AGENDAMENTO'}
        label={`${(devolverItem?.solicitacoes as any)?.numero_processo ?? ''} — ${(devolverItem?.solicitacoes as any)?.pacientes?.nome_completo ?? 'Paciente'}`}
        onSuccess={() => { refresh(); refreshDevolucoes(); toast.success('Solicitação devolvida', 'A solicitação foi encaminhada ao setor selecionado.'); }}
      />
    </>
  );
}
