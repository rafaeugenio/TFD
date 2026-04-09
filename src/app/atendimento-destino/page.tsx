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
  ExternalLink,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import DevolverModal from '@/shared/components/devolver-modal/DevolverModal';
import { useDevolucoesPendentes } from '@/shared/hooks/useDevolucoesPendentes';
import { slaBadge } from '@/shared/utils/sla';
import { useDevolucoeRecebidas } from '@/shared/hooks/useDevolucoeRecebidas';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import { useToast } from '@/shared/components/toast/Toast';
import { listarAgendamentos, criarAgendamento, atualizarAgendamento, excluirAgendamento, listarSolicitacoesAguardandoAgendamento, buscarRotaParaAgendamento } from '@/services/agendamentos.service';
import { uploadDocumento } from '@/services/documentos.service';
import { useSupabaseData } from '@/shared/hooks/useSupabaseData';
import type { StatusAgendamento, TipoAtendimento, OrigemAgendamento } from '@/lib/supabase/database.types';
import { formatDate } from '@/shared/pipes/formatters';
import { useUnidadesDestino } from '@/shared/hooks/useLookup';
import LookupSelect from '@/shared/components/lookup-select/LookupSelect';
import SortableHeader from '@/shared/components/table/SortableHeader';
import { useTableControls } from '@/shared/hooks/useTableControls';

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

const ROTA_LABELS: Record<string, string> = {
  APROVADO_DIRETO: 'Aprovado Diretamente',
  CNRAC: 'Encaminhado CNRAC',
  SETI: 'Encaminhado SETI',
  RESPOSTA_EXTERNA: 'Consulta SAAS/Dutra',
  SERVICO_SOCIAL: 'Encaminhado Serviço Social',
  REPROVADO_PRORROGACAO: 'Reprovado/Prorrogação',
  APROVADO_PRORROGACAO: 'Aprovado Prorrogação',
};

const CANAL_LABELS: Record<string, string> = {
  EMAIL: 'E-mail',
  SISTEMA: 'Sistema',
  TELEFONE: 'Telefone',
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
  const { options: unidadesOptions } = useUnidadesDestino();

  const [devolverItem, setDevolverItem] = useState<any>(null);

  /* ---- Devoluções pendentes ---- */
  const { mapa: devolucoesEnviadas, labelDestino, refresh: refreshDevolucoes } = useDevolucoesPendentes('AGENDAMENTO');
  const { mapa: devolucoesRecebidas, labelOrigem } = useDevolucoeRecebidas('AGENDAMENTO');

  /* ---- Drawer state ---- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [solicitacaoId, setSolicitacaoId] = useState('');
  const [pacienteNome, setPacienteNome] = useState('');
  const [numProcesso, setNumProcesso] = useState('');
  const [selectedUnidadeId, setSelectedUnidadeId] = useState('');
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
  const [comprovanteExistente, setComprovanteExistente] = useState<{ url: string; nome: string } | null>(null);
  const [rotaInfo, setRotaInfo] = useState<{ tipo_rota: string; justificativa?: string | null } | null>(null);
  const [cobrancaInfo, setCobrancaInfo] = useState<{ canal: string; contato_canal?: string | null; conteudo_envio?: string | null; destinatario?: string | null } | null>(null);


  /* ---- Edit / Delete state ---- */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  const resetDrawerForm = () => {
    setSolicitacaoId('');
    setNumProcesso('');
    setPacienteNome('');
    setSelectedUnidadeId('');
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
    setComprovanteExistente(null);
    setRotaInfo(null);
    setCobrancaInfo(null);
    setEditingId(null);
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
      setRotaInfo({ tipo_rota: rota.tipo_rota, justificativa: rota.justificativa });
      const cobrancas = (rota as any).cobrancas_externas;
      if (Array.isArray(cobrancas) && cobrancas.length > 0) {
        setCobrancaInfo(cobrancas[0]);
        if (cobrancas[0].canal && cobrancas[0].contato_canal) {
          setTipoContato(cobrancas[0].canal);
          setContatoUnidade(cobrancas[0].contato_canal);
        }
      }
    }
  }

  async function handleOpenEdit(ag: any) {
    setEditingId(ag.id);
    setSolicitacaoId(ag.solicitacao_id);
    setNumProcesso(ag.solicitacoes?.numero_processo ?? '');
    setPacienteNome(ag.solicitacoes?.pacientes?.nome_completo ?? '');
    setSelectedUnidadeId(ag.unidade_destino_id ?? '');
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
    if (ag.documentos) {
      setComprovanteExistente({ url: ag.documentos.url_arquivo, nome: ag.documentos.nome_arquivo });
    } else {
      setComprovanteExistente(null);
    }
    setDrawerOpen(true);

    // Fetch rota for display
    const { data: rota } = await buscarRotaParaAgendamento(ag.solicitacao_id);
    if (rota) {
      setRotaInfo({ tipo_rota: rota.tipo_rota, justificativa: rota.justificativa });
      const cobrancas = (rota as any).cobrancas_externas;
      if (Array.isArray(cobrancas) && cobrancas.length > 0) {
        setCobrancaInfo(cobrancas[0]);
      }
    }
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

  /* ---- Data fetch: agendamentos (sem filtro — cards sempre refletem totais reais) ---- */
  const { data: agendamentos, loading, count: totalCount, refresh } = useSupabaseData(
    () => listarAgendamentos({ pageSize: 500 }),
    [],
  );

  /* ---- Data fetch: solicitações aguardando agendamento (sem agendamento ainda) ---- */
  const [solDisp, setSolDisp] = useState<any[]>([]);
  const [solDispLoading, setSolDispLoading] = useState(false);

  const devolvedIds = useMemo(() => Array.from(devolucoesEnviadas.keys()), [devolucoesEnviadas]);

  async function refreshDisp() {
    setSolDispLoading(true);
    const { data } = await listarSolicitacoesAguardandoAgendamento({ includeIds: devolvedIds });
    setSolDisp(data ?? []);
    setSolDispLoading(false);
  }

  useEffect(() => { refreshDisp(); }, [devolvedIds]);

  /** Unified rows: disponíveis + agendamentos (sem filtro de aba) */
  const allRowsRaw = useMemo(() => {
    const dispRows = solDisp.map((sol: any) => ({
      _type: 'DISPONIVEL' as const,
      id: sol.id,
      solicitacao_id: sol.id,
      numero_processo: sol.numero_processo ?? '',
      paciente_nome: sol.pacientes?.nome_completo ?? '—',
      unidade_executante: '',
      cidade_destino: '',
      tipo_atendimento: '',
      origem_agendamento: '',
      status_display: 'Disponível',
      comprovante_display: '—',
      created_at: sol.created_at,
      data_hora_agendamento: '',
      raw: sol,
    }));
    const agRows = agendamentos.map((ag: any) => ({
      _type: 'AGENDADO' as const,
      id: ag.id,
      solicitacao_id: ag.solicitacao_id,
      numero_processo: ag.solicitacoes?.numero_processo ?? '—',
      paciente_nome: ag.solicitacoes?.pacientes?.nome_completo ?? '—',
      unidade_executante: ag.unidade_executante ?? '',
      cidade_destino: ag.cidade_destino ?? '',
      tipo_atendimento: ag.tipo_atendimento ?? '',
      origem_agendamento: ag.origem_agendamento ?? '',
      status_display: ag.status === 'CONFIRMADO' ? 'Confirmado' : 'Pendente',
      comprovante_display: ag.documentos ? 'Sim' : 'Não',
      created_at: ag.created_at,
      data_hora_agendamento: ag.data_hora_agendamento ?? '',
      raw: ag,
    }));

    return [...dispRows, ...agRows];
  }, [solDisp, agendamentos]);

  /* ---- Table controls (search, sort, column filters, pagination) ---- */
  const table = useTableControls({
    data: allRowsRaw as unknown as Record<string, unknown>[],
    searchFields: ['paciente_nome', 'numero_processo', 'unidade_executante', 'cidade_destino'] as (keyof Record<string, unknown>)[],
    dateField: 'created_at' as keyof Record<string, unknown>,
  });

  type UnifiedRow = (typeof allRowsRaw)[number];
  const items = table.paginated as unknown as UnifiedRow[];

  /* Column filter options */
  const statusFilterOptions = table.getFilterOptions('status_display');
  const tipoFilterOptions = table.getFilterOptions('tipo_atendimento');
  const comprovanteFilterOptions = table.getFilterOptions('comprovante_display');

  function refreshAll() {
    refresh();
    refreshDisp();
  }

  async function handleSubmitAgendamento() {
    if (!solicitacaoId) {
      toast.error('Solicitação não encontrada', 'Busque e selecione uma solicitação válida.');
      return;
    }

    try {
      // Upload comprovante if a new file was provided
      let comprovanteDocId: string | undefined = undefined;
      if (comprovante) {
        const uploadResult = await uploadDocumento(
          solicitacaoId,
          comprovante,
          'COMPROVANTE_AGENDAMENTO',
        );
        if (uploadResult.error) {
          toast.error('Erro no upload', (uploadResult.error as any).message ?? 'Falha ao enviar comprovante.');
          return;
        }
        comprovanteDocId = uploadResult.data?.id;
      }

      // Status automático: com comprovante (novo ou existente) = CONFIRMADO
      const temComprovante = !!comprovanteDocId || !!comprovanteExistente;
      const statusFinal: StatusAgendamento = temComprovante ? 'CONFIRMADO' : 'AGUARDANDO_CONFIRMACAO';

      const payload = {
        solicitacao_id: solicitacaoId,
        unidade_destino_id: selectedUnidadeId || undefined,
        unidade_executante: nomeUnidade,
        cnes: cnes || undefined,
        cidade_destino: cidade,
        uf_destino: uf,
        contato_unidade: (tipoContato && contatoUnidade) ? `${tipoContato}: ${contatoUnidade}` : contatoUnidade || undefined,
        tipo_atendimento: (tipoAtendimento as TipoAtendimento) || undefined,
        data_hora_agendamento: dataAgendamento ? new Date(dataAgendamento).toISOString() : new Date().toISOString(),
        origem_agendamento: (origemAgendamento as OrigemAgendamento) || undefined,
        numero_cnrac: numCnrac || undefined,
        status: statusFinal,
        ...(comprovanteDocId && { comprovante_doc_id: comprovanteDocId }),
      };

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

  /* ---- Unidade selecionada (para card de informações) ---- */
  const selectedUnidade = useMemo(
    () => unidadesOptions.find((u) => u.value === selectedUnidadeId) ?? null,
    [selectedUnidadeId, unidadesOptions],
  );

  /* ---- Summary counters ---- */
  const summary = useMemo(() => {
    return {
      disponiveis: solDisp.length,
      confirmados: agendamentos.length,
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
      <div className="grid grid-cols-2 xl:grid-cols-2 gap-4 mb-6">
        <div className="tfd-card flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: '#DBEAFE', color: '#3B82F6' }}>
            <CalendarClock size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Disponíveis p/ agendamento</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{summary.disponiveis}</p>
            <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--tfd-text-muted)' }}>Processos aprovados aguardando registro do agendamento</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: '#DCFCE7', color: '#16A34A' }}>
            <FileCheck size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Confirmados</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{summary.confirmados}</p>
            <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--tfd-text-muted)' }}>Agendamentos completos — prontos para emissão de passagem</p>
          </div>
        </div>
      </div>

      {/* ========== Toolbar: Search + Date Range ========== */}
      <div className="tfd-toolbar mb-4">
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="tfd-input-leading-icon"
            style={{ color: 'var(--tfd-text-muted)' }}
          />
          <input
            type="text"
            className="tfd-input tfd-input--sm tfd-input--with-leading-icon"
            placeholder="Buscar por paciente, nº do processo ou hospital..."
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

      {/* ========== Table ========== */}
      <div className="tfd-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tfd-table">
            <thead>
              <tr>
                <SortableHeader label="Nº Processo" sortDirection={table.getSortDirection('numero_processo')} onSort={() => table.toggleSort('numero_processo')} />
                <SortableHeader label="Paciente" sortDirection={table.getSortDirection('paciente_nome')} onSort={() => table.toggleSort('paciente_nome')} />
                <SortableHeader label="Destino" sortDirection={table.getSortDirection('unidade_executante')} onSort={() => table.toggleSort('unidade_executante')} />
                <SortableHeader label="Tipo" className="hidden md:table-cell" sortDirection={table.getSortDirection('tipo_atendimento')} onSort={() => table.toggleSort('tipo_atendimento')} filterOptions={tipoFilterOptions} activeFilters={table.getActiveFilters('tipo_atendimento')} onFilterChange={(v) => table.setColumnFilter('tipo_atendimento', v)} />
                <SortableHeader label="Origem" className="hidden lg:table-cell" sortDirection={table.getSortDirection('origem_agendamento')} onSort={() => table.toggleSort('origem_agendamento')} />
                <SortableHeader label="Data Agendamento" className="hidden md:table-cell" sortDirection={table.getSortDirection('data_hora_agendamento')} onSort={() => table.toggleSort('data_hora_agendamento')} />
                <SortableHeader label="Comprovante" filterOptions={comprovanteFilterOptions} activeFilters={table.getActiveFilters('comprovante_display')} onFilterChange={(v) => table.setColumnFilter('comprovante_display', v)} />
                <SortableHeader label="Status" filterOptions={statusFilterOptions} activeFilters={table.getActiveFilters('status_display')} onFilterChange={(v) => table.setColumnFilter('status_display', v)} />
                <th>Tempo</th>
                <th className="w-[100px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {(loading || solDispLoading) ? (
                <tr>
                  <td colSpan={10} className="text-center py-12">
                    <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                      Carregando...
                    </p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <XCircle size={32} style={{ color: 'var(--tfd-text-muted)' }} />
                      <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                        Nenhum agendamento encontrado
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const ag = row._type === 'AGENDADO' ? row.raw : null;
                  const statusStyle = ag ? statusStyleMap[ag.status as StatusAgendamento] : null;
                  const tipoStyle = ag?.tipo_atendimento ? tipoStyleMap[ag.tipo_atendimento as TipoAtendimento] : null;
                  const origemStyle = ag?.origem_agendamento ? origemStyleMap[ag.origem_agendamento as OrigemAgendamento] : null;
                  const alertaSla = ag ? isAlertaSla(ag) : false;
                  const aguardandoRetorno = labelDestino(row.solicitacao_id);
                  const devolucaoInfo = devolucoesEnviadas.get(row.solicitacao_id);
                  const retornoRecebido = labelOrigem(row.solicitacao_id);
                  const retornoInfo = devolucoesRecebidas.get(row.solicitacao_id);

                  return (
                    <tr
                      key={`${row._type}-${row.id}`}
                      className={aguardandoRetorno ? '' : 'cursor-pointer'}
                      style={{ opacity: aguardandoRetorno ? 0.55 : undefined, backgroundColor: aguardandoRetorno ? '#F8F9FA' : retornoRecebido ? '#FFFBEB' : undefined, borderLeft: retornoRecebido ? '4px solid #F59E0B' : undefined, pointerEvents: aguardandoRetorno ? 'none' : undefined }}
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
                              href={`/solicitacoes/${row.solicitacao_id}?from=atendimento-destino`}
                              className="font-medium text-sm hover:underline"
                              style={{ color: aguardandoRetorno ? 'var(--tfd-text-muted)' : 'var(--tfd-primary-500)', pointerEvents: 'auto' }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {row.numero_processo}
                            </Link>
                          </div>
                          {aguardandoRetorno && devolucaoInfo && (
                            <div
                              className="flex items-center gap-1.5 mt-1"
                              title={`Devolvido em ${new Date(devolucaoInfo.created_at).toLocaleDateString('pt-BR')} — ${devolucaoInfo.urgencia === 'URGENTE' ? 'URGENTE' : 'Normal'}`}
                            >
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                                style={{ backgroundColor: '#FEF3C7', color: '#92400E' }}
                              >
                                Enviado p/ {aguardandoRetorno}
                              </span>
                              {devolucaoInfo.urgencia === 'URGENTE' && (
                                <span
                                  className="text-[9px] font-bold px-1 py-0.5 rounded"
                                  style={{ backgroundColor: '#FEE2E2', color: '#B91C1C' }}
                                >
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
                        ) : ag?.documentos ? (
                          <a
                            href={ag.documentos.url_arquivo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
                            style={{ color: 'var(--tfd-primary-500)', pointerEvents: 'auto' }}
                            title={ag.documentos.nome_arquivo}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <CheckCircle2 size={15} style={{ color: 'var(--tfd-status-success)' }} />
                            Ver
                            <ExternalLink size={12} />
                          </a>
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

                      {/* Tempo */}
                      <td>
                        {(() => { const b = slaBadge(row.created_at as string); return (
                          <span className="tfd-tag tfd-tag--rounded text-xs font-semibold" style={b.style}>{b.label}</span>
                        ); })()}
                      </td>

                      {/* Ações */}
                      <td>
                        <div className="flex items-center gap-1">
                          <Link
                            href={`/solicitacoes/${row.solicitacao_id}?from=atendimento-destino`}
                            className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                            title="Ver processo"
                            style={{ pointerEvents: 'auto' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Eye size={15} />
                          </Link>
                          {ag && !aguardandoRetorno && (
                            <>
                              <button
                                type="button"
                                className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                                title="Devolver"
                                onClick={(e) => { e.stopPropagation(); setDevolverItem(ag); }}
                              >
                                <SendHorizonal size={15} />
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

        {/* Pagination */}
        {table.totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid var(--tfd-surface-border)' }}
          >
            <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
              Página {table.page} de {table.totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                className="tfd-btn tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only"
                disabled={table.page <= 1}
                onClick={() => table.setPage(table.page - 1)}
              >
                <ChevronLeft size={16} />
              </button>
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

        {/* Card: Regulação (decision + contact from regulation sector) */}
        {rotaInfo && (
          <>
            <div className="rounded-lg px-3 py-3 mb-3" style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
              <p className="text-xs font-semibold mb-2" style={{ color: '#1D4ED8' }}>Decisão da Regulação</p>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: '#3B82F6', minWidth: 80 }}>Encaminhamento</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                    {ROTA_LABELS[rotaInfo.tipo_rota] ?? rotaInfo.tipo_rota}
                  </span>
                </div>
                {cobrancaInfo && (
                  <>
                    {cobrancaInfo.destinatario && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: '#3B82F6', minWidth: 80 }}>Destinatário</span>
                        <span className="text-xs font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{cobrancaInfo.destinatario}</span>
                      </div>
                    )}
                    {cobrancaInfo.canal && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: '#3B82F6', minWidth: 80 }}>Tipo de contato</span>
                        <span className="text-xs font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                          {CANAL_LABELS[cobrancaInfo.canal] ?? cobrancaInfo.canal}
                        </span>
                      </div>
                    )}
                    {cobrancaInfo.contato_canal && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: '#3B82F6', minWidth: 80 }}>Contato</span>
                        <span className="text-xs font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{cobrancaInfo.contato_canal}</span>
                      </div>
                    )}
                    {cobrancaInfo.conteudo_envio && (
                      <div className="flex flex-col gap-0.5 mt-1">
                        <span className="text-xs" style={{ color: '#3B82F6' }}>Observação</span>
                        <span className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>{cobrancaInfo.conteudo_envio}</span>
                      </div>
                    )}
                  </>
                )}
                {rotaInfo.justificativa && (
                  <div className="flex flex-col gap-0.5 mt-1">
                    <span className="text-xs" style={{ color: '#3B82F6' }}>Justificativa</span>
                    <span className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>{rotaInfo.justificativa}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <hr className="tfd-divider" />

        {/* Section: Unidade de Destino */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Unidade de Destino</h3>
        <FormField label="Unidade de Saúde" required>
          <select
            className="tfd-input"
            value={selectedUnidadeId}
            onChange={(e) => {
              const uid = e.target.value;
              setSelectedUnidadeId(uid);
              const found = unidadesOptions.find((u) => u.value === uid);
              if (found) {
                setNomeUnidade(found.nome);
                setCnes(found.cnes ?? '');
                setCidade(found.cidade ?? '');
                setUf(found.uf ?? '');
              } else {
                setNomeUnidade(''); setCnes(''); setCidade(''); setUf('');
              }
            }}
          >
            <option value="">Selecione uma unidade...</option>
            {unidadesOptions.map((u) => (
              <option key={u.value} value={u.value}>{u.label}</option>
            ))}
          </select>
        </FormField>

        {/* Unit info card (replaces separate CNES / UF / Cidade fields) */}
        {selectedUnidade ? (
          <div className="rounded-lg px-3 py-3 mb-3" style={{ backgroundColor: 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--tfd-text-muted)', minWidth: 56 }}>CNES</span>
                <span className="text-xs font-medium" style={{ color: 'var(--tfd-text-primary)', fontFamily: 'var(--tfd-font-mono)' }}>{selectedUnidade.cnes ?? '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: 'var(--tfd-text-muted)', minWidth: 56 }}>Cidade/UF</span>
                <span className="text-xs font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{selectedUnidade.cidade}/{selectedUnidade.uf}</span>
              </div>
              {selectedUnidade.tipo && (
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--tfd-text-muted)', minWidth: 56 }}>Tipo</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{selectedUnidade.tipo}</span>
                </div>
              )}
              {selectedUnidade.endereco && (
                <div className="flex items-center gap-2">
                  <span className="text-xs" style={{ color: 'var(--tfd-text-muted)', minWidth: 56 }}>Endereço</span>
                  <span className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>{selectedUnidade.endereco}</span>
                </div>
              )}
              {(selectedUnidade.contato_nome || selectedUnidade.contato_telefone || selectedUnidade.contato_email) && (
                <div className="flex items-start gap-2">
                  <span className="text-xs" style={{ color: 'var(--tfd-text-muted)', minWidth: 56 }}>Contato</span>
                  <div className="flex flex-col gap-0.5">
                    {selectedUnidade.contato_nome && <span className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>{selectedUnidade.contato_nome}</span>}
                    {selectedUnidade.contato_telefone && <span className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>{selectedUnidade.contato_telefone}</span>}
                    {selectedUnidade.contato_email && <span className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>{selectedUnidade.contato_email}</span>}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs mb-3" style={{ color: 'var(--tfd-text-muted)' }}>Selecione uma unidade para ver os dados cadastrados.</p>
        )}

        <hr className="tfd-divider" />

        {/* Section: Agendamento */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Agendamento</h3>
        <LookupSelect
          categoria="tipo_procedimento"
          label="Tipo de atendimento"
          value={tipoAtendimento}
          onChange={setTipoAtendimento}
          required
        />
        <FormField label="Data do agendamento" required>
          <input
            type="date"
            className="tfd-input"
            value={dataAgendamento}
            onChange={(e) => setDataAgendamento(e.target.value)}
          />
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

        {/* Section: Comprovante */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Comprovante</h3>

        <div className="tfd-message tfd-message--warn mb-4">
          <span className="tfd-message-icon mt-0.5 shrink-0">
            <Info size={16} />
          </span>
          <p className="text-sm flex-1" style={{ color: 'var(--tfd-text-secondary)' }}>
            O agendamento permanecerá com status <strong>Aguardando Confirmação</strong> até que um comprovante seja anexado. Ao anexar o comprovante, o status será alterado automaticamente para <strong>Confirmado</strong>.
          </p>
        </div>

        {comprovanteExistente && !comprovante ? (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg" style={{ backgroundColor: 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}>
            <CheckCircle2 size={16} style={{ color: 'var(--tfd-status-success)' }} />
            <a
              href={comprovanteExistente.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium truncate hover:underline flex-1 min-w-0"
              style={{ color: 'var(--tfd-primary-500)' }}
            >
              {comprovanteExistente.nome}
            </a>
            <button
              type="button"
              className="text-xs shrink-0"
              style={{ color: 'var(--tfd-text-muted)' }}
              onClick={() => setComprovanteExistente(null)}
            >
              Substituir
            </button>
          </div>
        ) : (
          <FormField label="Upload de comprovante">
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="tfd-input pt-1.5"
              onChange={(e) => setComprovante(e.target.files?.[0] ?? null)}
            />
          </FormField>
        )}

        <p className="text-xs mt-2" style={{ color: 'var(--tfd-text-muted)' }}>
          Tipos aceitos: PDF, JPG, PNG (máx. 50 MB)
        </p>
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
