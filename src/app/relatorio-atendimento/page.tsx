'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  FileText,
  Search,
  Plus,
  Eye,
  Loader2,
  Ban,
  CheckCircle2,
  RotateCcw,
  Save,
  Trash2,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import { useToast } from '@/shared/components/toast/Toast';
import { useSupabaseData } from '@/shared/hooks/useSupabaseData';
import SortableHeader from '@/shared/components/table/SortableHeader';
import { useTableControls } from '@/shared/hooks/useTableControls';
import {
  listarRelatoriosAtendimento,
  criarRelatorioAtendimento,
  atualizarRelatorioAtendimento,
  excluirRelatorioAtendimento,
} from '@/services/relatorio-atendimento.service';

import {
  MOCK_RELATORIOS_ATENDIMENTO,
  RA_NUMERO_MAP,
} from '@/core/mocks/relatorio-atendimento.mock';
import type { RelatorioAtendimento } from '@/core/models/relatorio-atendimento.model';

/* ── TODO AGENTE-4: Descomentar quando Agentes 1 e 2 concluírem ──
import MedicoSelect from '@/shared/components/medico-select/MedicoSelect';
── MedicoSelect substitui os inputs de texto livre medicoNome e medicoCRM.
── Ao selecionar médico, preenche automaticamente nome e CRM. ── */

/* -------------------------------------------------- */
/*  Constants                                          */
/* -------------------------------------------------- */

const STATUS_FILTER_OPTIONS = [
  { value: 'CONCLUIDO', label: 'Concluído' },
  { value: 'RASCUNHO', label: 'Rascunho' },
];

/* -------------------------------------------------- */
/*  Status styling                                     */
/* -------------------------------------------------- */

interface RaStyle {
  bg: string;
  text: string;
  label: string;
}

const statusStyleMap: Record<string, RaStyle> = {
  RASCUNHO: { bg: '#FEF3C7', text: '#92400E', label: 'Rascunho' },
  CONCLUIDO: { bg: '#DCFCE7', text: '#15803D', label: 'Concluído' },
};

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

/* -------------------------------------------------- */
/*  Mapped display item                                */
/* -------------------------------------------------- */

interface RelatorioItem {
  id: string;
  solicitacaoId: string;
  numero: string;
  paciente: string;
  hospital: string;
  periodo: string;
  retorno: boolean | null;
  retornoPrevisto: string;
  sequencial: number;
  status: string;
  dataRegistro: string;
  raw: RelatorioAtendimento;
}

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function RelatorioAtendimentoPage() {
  const toast = useToast();

  /* ---- Drawer state ---- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit' | 'view'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);

  /* ---- Form state ---- */
  const [pacienteNome, setPacienteNome] = useState('');
  const [pacienteCNS, setPacienteCNS] = useState('');
  const [hospitalAtendimento, setHospitalAtendimento] = useState('');
  const [diagnostico, setDiagnostico] = useState('');
  const [periodoAtendimentoInicio, setPeriodoAtendimentoInicio] = useState('');
  const [periodoAtendimentoFim, setPeriodoAtendimentoFim] = useState('');
  const [periodoInternacaoInicio, setPeriodoInternacaoInicio] = useState('');
  const [periodoInternacaoFim, setPeriodoInternacaoFim] = useState('');
  const [estadoDoencaAtual, setEstadoDoencaAtual] = useState('');
  const [definicaoTratamento, setDefinicaoTratamento] = useState('');
  const [necessidadeRetorno, setNecessidadeRetorno] = useState<string>('');
  const [procedimentosRetorno, setProcedimentosRetorno] = useState('');
  const [retornoPrevistoPara, setRetornoPrevistoPara] = useState('');
  const [necessidadeAcompanhante, setNecessidadeAcompanhante] = useState('');
  const [tempoEstimadoFora, setTempoEstimadoFora] = useState('');
  /* TODO AGENTE-4: Quando MedicoSelect estiver pronto, trocar por:
     const [selectedMedicoRA, setSelectedMedicoRA] = useState<{ id: string; nome_completo: string; crm: string; crm_uf: string } | null>(null);
     E derivar medicoNome e medicoCRM do objeto selecionado. */
  const [medicoNome, setMedicoNome] = useState('');
  const [medicoCRM, setMedicoCRM] = useState('');

  /* ---- Delete confirm ---- */
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  /* ---- Supabase data with mock fallback ---- */
  const { data: dbData, loading, refresh } = useSupabaseData(
    useCallback(
      () => listarRelatoriosAtendimento({}),
      [],
    ),
    [],
  );

  /* ---- Map to display items (Supabase or mock) ---- */
  const items: RelatorioItem[] = useMemo(() => {
    const source = dbData.length > 0 ? dbData : MOCK_RELATORIOS_ATENDIMENTO;
    return (source as any[]).map((r) => {
      // Supabase row
      if (r.solicitacao_id !== undefined) {
        return {
          id: r.id,
          solicitacaoId: r.solicitacao_id,
          numero: r.solicitacoes?.numero_processo ?? '—',
          paciente: r.solicitacoes?.pacientes?.nome_completo ?? r.paciente_nome ?? '—',
          hospital: r.hospital_atendimento ?? '—',
          periodo: formatPeriodo(r.periodo_atendimento_inicio, r.periodo_atendimento_fim),
          retorno: r.necessidade_retorno,
          retornoPrevisto: r.retorno_previsto_para ? formatDate(r.retorno_previsto_para) : '—',
          sequencial: r.sequencial ?? 1,
          status: r.status,
          dataRegistro: r.created_at ?? r.data_registro ?? '',
          raw: r as any,
        };
      }
      // Mock data
      const ra = r as RelatorioAtendimento;
      return {
        id: ra.id,
        solicitacaoId: ra.solicitacaoId,
        numero: RA_NUMERO_MAP[ra.solicitacaoId] ?? '—',
        paciente: ra.pacienteNome,
        hospital: ra.hospitalAtendimento,
        periodo: formatPeriodo(ra.periodoAtendimentoInicio, ra.periodoAtendimentoFim),
        retorno: ra.necessidadeRetorno,
        retornoPrevisto: ra.retornoPrevistoPara ? formatDate(ra.retornoPrevistoPara) : '—',
        sequencial: ra.sequencial,
        status: ra.status,
        dataRegistro: ra.dataRegistro,
        raw: ra,
      };
    });
  }, [dbData]);

  /* ---- Table controls (client-side search, filter, sort, pagination) ---- */
  const table = useTableControls({
    data: items as unknown as Record<string, unknown>[],
    searchFields: ['paciente', 'numero', 'hospital'],
    dateField: 'dataRegistro',
  });

  const paginatedItems = table.paginated as unknown as RelatorioItem[];
  const filtered = table.filtered as unknown as RelatorioItem[];

  /* ---- Summary ---- */
  const summary = useMemo(() => ({
    total: items.length,
    concluidos: items.filter((r) => r.status === 'CONCLUIDO').length,
    rascunhos: items.filter((r) => r.status === 'RASCUNHO').length,
    comRetorno: items.filter((r) => r.retorno === true).length,
  }), [items]);

  /* ---- Form helpers ---- */
  function resetForm() {
    setPacienteNome('');
    setPacienteCNS('');
    setHospitalAtendimento('');
    setDiagnostico('');
    setPeriodoAtendimentoInicio('');
    setPeriodoAtendimentoFim('');
    setPeriodoInternacaoInicio('');
    setPeriodoInternacaoFim('');
    setEstadoDoencaAtual('');
    setDefinicaoTratamento('');
    setNecessidadeRetorno('');
    setProcedimentosRetorno('');
    setRetornoPrevistoPara('');
    setNecessidadeAcompanhante('');
    setTempoEstimadoFora('');
    setMedicoNome('');
    setMedicoCRM('');
    setEditingId(null);
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
    resetForm();
  }

  function handleOpenCreate() {
    resetForm();
    setDrawerMode('create');
    setDrawerOpen(true);
  }

  function handleOpenView(item: RelatorioItem) {
    populateForm(item.raw);
    setDrawerMode('view');
    setDrawerOpen(true);
  }

  function handleOpenEdit(item: RelatorioItem) {
    populateForm(item.raw);
    setEditingId(item.id);
    setDrawerMode('edit');
    setDrawerOpen(true);
  }

  function populateForm(r: RelatorioAtendimento | any) {
    // Handle both mock and Supabase shapes
    setPacienteNome(r.pacienteNome ?? r.paciente_nome ?? '');
    setPacienteCNS(r.pacienteCNS ?? r.paciente_cns ?? '');
    setHospitalAtendimento(r.hospitalAtendimento ?? r.hospital_atendimento ?? '');
    setDiagnostico(r.diagnostico ?? '');
    setPeriodoAtendimentoInicio(r.periodoAtendimentoInicio ?? r.periodo_atendimento_inicio ?? '');
    setPeriodoAtendimentoFim(r.periodoAtendimentoFim ?? r.periodo_atendimento_fim ?? '');
    setPeriodoInternacaoInicio(r.periodoInternacaoInicio ?? r.periodo_internacao_inicio ?? '');
    setPeriodoInternacaoFim(r.periodoInternacaoFim ?? r.periodo_internacao_fim ?? '');
    setEstadoDoencaAtual(r.estadoDoencaAtual ?? r.estado_doenca_atual ?? '');
    setDefinicaoTratamento(r.definicaoTratamento ?? r.definicao_tratamento ?? '');
    const retorno = r.necessidadeRetorno ?? r.necessidade_retorno;
    setNecessidadeRetorno(retorno === true ? 'SIM' : retorno === false ? 'NAO' : '');
    setProcedimentosRetorno(r.procedimentosRetorno ?? r.procedimentos_retorno ?? '');
    setRetornoPrevistoPara(r.retornoPrevistoPara ?? r.retorno_previsto_para ?? '');
    setNecessidadeAcompanhante(r.necessidadeAcompanhante ?? r.necessidade_acompanhante ?? '');
    setTempoEstimadoFora(r.tempoEstimadoForaDomicilio ?? r.tempo_estimado_fora_domicilio ?? '');
    setMedicoNome(r.medicoNome ?? r.medico_nome ?? '');
    setMedicoCRM(r.medicoCRM ?? r.medico_crm ?? '');
  }

  /* ---- Validation ---- */
  function validate(): boolean {
    if (!hospitalAtendimento.trim()) {
      toast.error('Campo obrigatório', 'Informe o hospital de atendimento.');
      return false;
    }
    if (!diagnostico.trim()) {
      toast.error('Campo obrigatório', 'Informe o diagnóstico.');
      return false;
    }
    if (!periodoAtendimentoInicio || !periodoAtendimentoFim) {
      toast.error('Campo obrigatório', 'Informe o período de atendimento completo.');
      return false;
    }
    if (periodoAtendimentoFim < periodoAtendimentoInicio) {
      toast.error('Data inválida', 'A data fim do atendimento deve ser posterior à data início.');
      return false;
    }
    if (periodoInternacaoInicio && periodoInternacaoFim && periodoInternacaoFim < periodoInternacaoInicio) {
      toast.error('Data inválida', 'A data fim da internação deve ser posterior à data início.');
      return false;
    }
    if (estadoDoencaAtual.trim().length < 20) {
      toast.error('Campo insuficiente', 'O estado da doença atual deve ter no mínimo 20 caracteres.');
      return false;
    }
    if (definicaoTratamento.trim().length < 20) {
      toast.error('Campo insuficiente', 'A definição do tratamento deve ter no mínimo 20 caracteres.');
      return false;
    }
    if (!necessidadeRetorno) {
      toast.error('Campo obrigatório', 'Informe se há necessidade de retorno.');
      return false;
    }
    if (necessidadeRetorno === 'SIM') {
      if (procedimentosRetorno.trim().length < 20) {
        toast.error('Campo insuficiente', 'Descreva os procedimentos a realizar (mínimo 20 caracteres).');
        return false;
      }
      if (!retornoPrevistoPara) {
        toast.error('Campo obrigatório', 'Informe a data prevista de retorno.');
        return false;
      }
    }
    if (necessidadeAcompanhante.trim().length < 10) {
      toast.error('Campo insuficiente', 'Informe sobre a necessidade de acompanhante (mínimo 10 caracteres).');
      return false;
    }
    if (tempoEstimadoFora.trim().length < 10) {
      toast.error('Campo insuficiente', 'Informe o tempo estimado fora do domicílio (mínimo 10 caracteres).');
      return false;
    }
    if (!medicoNome.trim()) {
      toast.error('Campo obrigatório', 'Informe o nome do médico assistente.');
      return false;
    }
    if (!medicoCRM.trim()) {
      toast.error('Campo obrigatório', 'Informe o CRM do médico.');
      return false;
    }
    return true;
  }

  /* ---- Submit ---- */
  async function handleSubmit(asConcluido: boolean) {
    if (!validate()) return;

    const payload: Record<string, unknown> = {
      hospital_atendimento: hospitalAtendimento.trim(),
      diagnostico: diagnostico.trim(),
      periodo_atendimento_inicio: periodoAtendimentoInicio,
      periodo_atendimento_fim: periodoAtendimentoFim,
      periodo_internacao_inicio: periodoInternacaoInicio || null,
      periodo_internacao_fim: periodoInternacaoFim || null,
      estado_doenca_atual: estadoDoencaAtual.trim(),
      definicao_tratamento: definicaoTratamento.trim(),
      necessidade_retorno: necessidadeRetorno === 'SIM',
      procedimentos_retorno: necessidadeRetorno === 'SIM' ? procedimentosRetorno.trim() : null,
      retorno_previsto_para: necessidadeRetorno === 'SIM' ? retornoPrevistoPara : null,
      necessidade_acompanhante: necessidadeAcompanhante.trim(),
      tempo_estimado_fora_domicilio: tempoEstimadoFora.trim(),
      medico_nome: medicoNome.trim(),
      medico_crm: medicoCRM.trim(),
      status: asConcluido ? 'CONCLUIDO' : 'RASCUNHO',
    };

    try {
      const result = editingId
        ? await atualizarRelatorioAtendimento(editingId, payload)
        : await criarRelatorioAtendimento(payload);

      if (result.error) {
        toast.error(
          editingId ? 'Erro ao atualizar' : 'Erro ao cadastrar',
          (result.error as any).message,
        );
        return;
      }

      toast.success(
        asConcluido
          ? 'Relatório concluído e documento gerado!'
          : editingId
            ? 'Relatório atualizado!'
            : 'Relatório salvo como rascunho!',
        asConcluido
          ? 'Relatório de Atendimento registrado e documento gerado com sucesso.'
          : 'O relatório foi salvo com sucesso.',
      );
      handleCloseDrawer();
      refresh();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error('Erro inesperado', e.message ?? 'Tente novamente.');
    }
  }

  /* ---- Delete ---- */
  async function handleConfirmDelete() {
    if (!deleteConfirmId) return;
    const { error } = await excluirRelatorioAtendimento(deleteConfirmId);
    if (error) {
      toast.error('Erro ao excluir', (error as any).message);
    } else {
      toast.success('Relatório excluído', 'O rascunho foi removido com sucesso.');
      refresh();
    }
    setDeleteConfirmId(null);
  }

  const isViewMode = drawerMode === 'view';

  /* ---- Render ---- */
  return (
    <>
      <PageHeader
        title="Relatório de Atendimento"
        subtitle="Relatórios do hospital de destino sobre o tratamento do paciente"
        actions={
          <button className="tfd-btn tfd-btn-primary" onClick={handleOpenCreate}>
            <Plus size={16} />
            Novo Relatório
          </button>
        }
      />

      {/* ========== Summary Cards ========== */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}
          >
            <FileText size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Total</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{summary.total}</p>
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
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Concluídos</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-status-success)' }}>{summary.concluidos}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#FEF3C7', color: '#F59E0B' }}
          >
            <FileText size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Rascunhos</p>
            <p className="text-xl font-semibold" style={{ color: '#92400E' }}>{summary.rascunhos}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#DBEAFE', color: '#3B82F6' }}
          >
            <RotateCcw size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Com Retorno</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-primary-700)' }}>{summary.comRetorno}</p>
          </div>
        </div>
      </div>

      {/* ========== Toolbar ========== */}
      <div className="tfd-toolbar mb-4 flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search
            size={16}
            className="tfd-input-leading-icon"
            style={{ color: 'var(--tfd-text-muted)' }}
          />
          <input
            type="text"
            className="tfd-input tfd-input--sm tfd-input--with-leading-icon"
            placeholder="Buscar paciente, hospital ou nº processo..."
            value={table.search}
            onChange={(e) => table.setSearch(e.target.value)}
          />
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <Calendar size={14} style={{ color: 'var(--tfd-text-muted)', flexShrink: 0 }} />
          <input
            type="date"
            className="tfd-input tfd-input--sm"
            style={{ width: 'auto' }}
            value={table.dateStart}
            onChange={(e) => table.setDateStart(e.target.value)}
            title="Data início"
          />
          <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>até</span>
          <input
            type="date"
            className="tfd-input tfd-input--sm"
            style={{ width: 'auto' }}
            value={table.dateEnd}
            onChange={(e) => table.setDateEnd(e.target.value)}
            title="Data fim"
          />
        </div>

        <p className="text-sm ml-auto" style={{ color: 'var(--tfd-text-muted)' }}>
          {filtered.length} resultado{filtered.length !== 1 && 's'}
        </p>
      </div>

      {/* ========== Table ========== */}
      <div className="tfd-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tfd-table">
            <thead>
              <tr>
                <SortableHeader
                  label="Nº Processo"
                  sortDirection={table.getSortDirection('numero')}
                  onSort={() => table.toggleSort('numero')}
                />
                <SortableHeader
                  label="Paciente"
                  sortDirection={table.getSortDirection('paciente')}
                  onSort={() => table.toggleSort('paciente')}
                />
                <SortableHeader
                  label="Hospital"
                  className="hidden md:table-cell"
                  sortDirection={table.getSortDirection('hospital')}
                  onSort={() => table.toggleSort('hospital')}
                />
                <SortableHeader
                  label="Período"
                  className="hidden lg:table-cell"
                />
                <SortableHeader label="Retorno" />
                <SortableHeader label="Seq." className="hidden md:table-cell" />
                <SortableHeader
                  label="Status"
                  filterOptions={STATUS_FILTER_OPTIONS}
                  activeFilters={table.getActiveFilters('status')}
                  onFilterChange={(values) => table.setColumnFilter('status', values)}
                />
                <th className="w-[100px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={32} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
                      <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                        Carregando relatórios...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Ban size={32} style={{ color: 'var(--tfd-text-muted)' }} />
                      <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                        Nenhum relatório encontrado
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((r) => {
                  const style = statusStyleMap[r.status] ?? { bg: 'var(--tfd-surface-100)', text: 'var(--tfd-surface-500)', label: r.status };
                  return (
                    <tr key={r.id} className="cursor-pointer" onClick={() => handleOpenView(r)}>
                      <td>
                        <span className="font-medium text-sm" style={{ color: 'var(--tfd-primary-500)' }}>
                          {r.numero}
                        </span>
                      </td>
                      <td className="max-w-[160px] truncate font-medium">
                        {r.paciente}
                      </td>
                      <td className="hidden md:table-cell max-w-[180px] truncate" style={{ color: 'var(--tfd-text-secondary)' }}>
                        {r.hospital}
                      </td>
                      <td className="hidden lg:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>
                        {r.periodo}
                      </td>
                      <td>
                        {r.retorno === true ? (
                          <span
                            className="tfd-tag tfd-tag--rounded"
                            style={{ backgroundColor: '#DBEAFE', color: '#1D4ED8' }}
                          >
                            Sim
                          </span>
                        ) : r.retorno === false ? (
                          <span
                            className="tfd-tag tfd-tag--rounded"
                            style={{ backgroundColor: 'var(--tfd-surface-100)', color: 'var(--tfd-text-secondary)' }}
                          >
                            Não
                          </span>
                        ) : (
                          <span style={{ color: 'var(--tfd-text-muted)' }}>—</span>
                        )}
                      </td>
                      <td className="hidden md:table-cell text-center">
                        <span className="font-medium">{r.sequencial}</span>
                      </td>
                      <td>
                        <span
                          className="tfd-tag tfd-tag--rounded"
                          style={{ backgroundColor: style.bg, color: style.text }}
                        >
                          {style.label}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="tfd-btn tfd-btn-ghost tfd-btn--sm tfd-btn--icon-only"
                            title="Visualizar"
                            onClick={() => handleOpenView(r)}
                          >
                            <Eye size={15} />
                          </button>
                          {r.status === 'RASCUNHO' && (
                            <>
                              <button
                                className="tfd-btn tfd-btn-ghost tfd-btn--sm tfd-btn--icon-only"
                                title="Editar"
                                onClick={() => handleOpenEdit(r)}
                              >
                                <FileText size={15} />
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
                onClick={() => table.setPage(Math.max(1, table.page - 1))}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="tfd-btn tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only"
                disabled={table.page >= table.totalPages}
                onClick={() => table.setPage(Math.min(table.totalPages, table.page + 1))}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>


      {/* ========== Drawer (Create / Edit / View) ========== */}
      <Drawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        title={
          drawerMode === 'create'
            ? 'Novo Relatório de Atendimento'
            : drawerMode === 'edit'
              ? 'Editar Relatório'
              : 'Relatório de Atendimento'
        }
        subtitle={
          drawerMode === 'view' ? 'Visualização somente leitura' : 'Preencha os dados do relatório médico'
        }
        width="600px"
        footer={
          isViewMode ? (
            <button className="tfd-btn tfd-btn-secondary" onClick={handleCloseDrawer}>
              Fechar
            </button>
          ) : (
            <>
              <button className="tfd-btn tfd-btn-secondary" onClick={handleCloseDrawer}>
                Cancelar
              </button>
              <button className="tfd-btn tfd-btn-secondary" onClick={() => handleSubmit(false)}>
                <Save size={15} />
                Salvar Rascunho
              </button>
              <button className="tfd-btn tfd-btn-primary" onClick={() => handleSubmit(true)}>
                <CheckCircle2 size={15} />
                Concluir
              </button>
            </>
          )
        }
      >
        {/* Paciente (auto-preenchido) */}
        <div
          className="rounded-lg p-4 mb-5"
          style={{ backgroundColor: 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}
        >
          <p className="text-xs font-medium mb-1" style={{ color: 'var(--tfd-text-muted)' }}>Paciente</p>
          <p className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
            {pacienteNome || 'Será preenchido automaticamente'}
          </p>
          {pacienteCNS && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--tfd-text-secondary)' }}>CNS: {pacienteCNS}</p>
          )}
        </div>

        <div className="tfd-divider mb-5" />

        {/* Hospital */}
        <FormField label="Hospital de Atendimento" required>
          <input
            type="text"
            className="tfd-input"
            placeholder="Nome do hospital de destino"
            value={hospitalAtendimento}
            onChange={(e) => setHospitalAtendimento(e.target.value)}
            disabled={isViewMode}
            maxLength={200}
          />
        </FormField>

        {/* Diagnóstico */}
        <FormField label="Diagnóstico" required>
          <input
            type="text"
            className="tfd-input"
            placeholder="CID + descrição do diagnóstico"
            value={diagnostico}
            onChange={(e) => setDiagnostico(e.target.value)}
            disabled={isViewMode}
            maxLength={500}
          />
        </FormField>

        {/* Período de Atendimento */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Atendimento — Início" required>
            <input
              type="date"
              className="tfd-input"
              value={periodoAtendimentoInicio}
              onChange={(e) => setPeriodoAtendimentoInicio(e.target.value)}
              disabled={isViewMode}
            />
          </FormField>
          <FormField label="Atendimento — Fim" required>
            <input
              type="date"
              className="tfd-input"
              value={periodoAtendimentoFim}
              onChange={(e) => setPeriodoAtendimentoFim(e.target.value)}
              disabled={isViewMode}
            />
          </FormField>
        </div>

        {/* Período de Internação (opcional) */}
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Internação — Início">
            <input
              type="date"
              className="tfd-input"
              value={periodoInternacaoInicio}
              onChange={(e) => setPeriodoInternacaoInicio(e.target.value)}
              disabled={isViewMode}
            />
          </FormField>
          <FormField label="Internação — Fim">
            <input
              type="date"
              className="tfd-input"
              value={periodoInternacaoFim}
              onChange={(e) => setPeriodoInternacaoFim(e.target.value)}
              disabled={isViewMode}
            />
          </FormField>
        </div>

        <div className="tfd-divider mb-5" />

        {/* Estado da doença */}
        <FormField label="Estado da doença atual" required>
          <textarea
            className="tfd-input"
            rows={3}
            placeholder="Descreva o estado atual da doença (mínimo 20 caracteres)"
            value={estadoDoencaAtual}
            onChange={(e) => setEstadoDoencaAtual(e.target.value)}
            disabled={isViewMode}
            maxLength={2000}
          />
          {!isViewMode && (
            <p className="text-xs mt-1" style={{ color: estadoDoencaAtual.length < 20 ? 'var(--tfd-status-warning)' : 'var(--tfd-text-muted)' }}>
              {estadoDoencaAtual.length}/2000 caracteres
            </p>
          )}
        </FormField>

        {/* Tratamento realizado */}
        <FormField label="Definição do tratamento realizado" required>
          <textarea
            className="tfd-input"
            rows={3}
            placeholder="Descreva o tratamento realizado (mínimo 20 caracteres)"
            value={definicaoTratamento}
            onChange={(e) => setDefinicaoTratamento(e.target.value)}
            disabled={isViewMode}
            maxLength={2000}
          />
          {!isViewMode && (
            <p className="text-xs mt-1" style={{ color: definicaoTratamento.length < 20 ? 'var(--tfd-status-warning)' : 'var(--tfd-text-muted)' }}>
              {definicaoTratamento.length}/2000 caracteres
            </p>
          )}
        </FormField>

        <div className="tfd-divider mb-5" />

        {/* Necessidade de retorno */}
        <FormField label="Há necessidade de retorno?" required>
          <div className="flex items-center gap-4 mt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="retorno"
                value="SIM"
                checked={necessidadeRetorno === 'SIM'}
                onChange={() => setNecessidadeRetorno('SIM')}
                disabled={isViewMode}
                style={{ accentColor: 'var(--tfd-primary-500)' }}
              />
              <span className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>Sim</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="retorno"
                value="NAO"
                checked={necessidadeRetorno === 'NAO'}
                onChange={() => setNecessidadeRetorno('NAO')}
                disabled={isViewMode}
                style={{ accentColor: 'var(--tfd-primary-500)' }}
              />
              <span className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>Não</span>
            </label>
          </div>
        </FormField>

        {/* Campos condicionais: retorno = SIM */}
        {necessidadeRetorno === 'SIM' && (
          <div
            className="rounded-lg p-4 mb-4"
            style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}
          >
            <FormField label="Procedimentos a realizar / justificativa do retorno" required>
              <textarea
                className="tfd-input"
                rows={3}
                placeholder="Descreva os procedimentos e justificativa (mínimo 20 caracteres)"
                value={procedimentosRetorno}
                onChange={(e) => setProcedimentosRetorno(e.target.value)}
                disabled={isViewMode}
                maxLength={2000}
              />
            </FormField>
            <FormField label="Retorno previsto para" required>
              <input
                type="date"
                className="tfd-input"
                value={retornoPrevistoPara}
                onChange={(e) => setRetornoPrevistoPara(e.target.value)}
                disabled={isViewMode}
              />
            </FormField>
          </div>
        )}

        <div className="tfd-divider mb-5" />

        {/* Acompanhante */}
        <FormField label="Necessidade de acompanhante (justificar)" required>
          <textarea
            className="tfd-input"
            rows={2}
            placeholder="Informe se há necessidade e justifique (mínimo 10 caracteres)"
            value={necessidadeAcompanhante}
            onChange={(e) => setNecessidadeAcompanhante(e.target.value)}
            disabled={isViewMode}
            maxLength={2000}
          />
        </FormField>

        {/* Tempo fora domicílio */}
        <FormField label="Tempo estimado fora do domicílio (justificar)" required>
          <textarea
            className="tfd-input"
            rows={2}
            placeholder="Informe o tempo estimado e justifique (mínimo 10 caracteres)"
            value={tempoEstimadoFora}
            onChange={(e) => setTempoEstimadoFora(e.target.value)}
            disabled={isViewMode}
            maxLength={2000}
          />
        </FormField>

        <div className="tfd-divider mb-5" />

        {/* Médico */}
        {/* TODO AGENTE-4: Substituir os 2 campos abaixo (nome + CRM) por:
            <MedicoSelect
              value={selectedMedicoRA}
              onChange={(medico) => {
                setSelectedMedicoRA(medico);
                setMedicoNome(medico?.nome_completo ?? '');
                setMedicoCRM(medico ? `CRM/${medico.crm_uf} ${medico.crm}` : '');
              }}
              label="Médico Assistente"
              required
            />
            Ao selecionar, preenche nome e CRM automaticamente. */}
        <p className="text-xs font-semibold mb-3" style={{ color: 'var(--tfd-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Médico Assistente
        </p>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Nome do médico" required>
            <input
              type="text"
              className="tfd-input"
              placeholder="Nome completo"
              value={medicoNome}
              onChange={(e) => setMedicoNome(e.target.value)}
              disabled={isViewMode}
              maxLength={150}
            />
          </FormField>
          <FormField label="CRM" required>
            <input
              type="text"
              className="tfd-input"
              placeholder="CRM/UF 000000"
              value={medicoCRM}
              onChange={(e) => setMedicoCRM(e.target.value)}
              disabled={isViewMode}
            />
          </FormField>
        </div>
      </Drawer>
    </>
  );
}
