'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Search,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Upload,
  X,
  FileSignature,
  ScrollText,
  ExternalLink,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import StatusTag from '@/shared/components/status-tag/StatusTag';
import SortableHeader from '@/shared/components/table/SortableHeader';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import { useToast } from '@/shared/components/toast/Toast';
import { listarSolicitacoes, criarSolicitacao, atualizarSolicitacao, excluirSolicitacao, contarPorStatus } from '@/services/solicitacoes.service';
import { listarPacientes } from '@/services/pacientes.service';
import { listarPorPaciente } from '@/services/acompanhantes.service';
import { vincularAcompanhantes } from '@/services/solicitacao-acompanhantes.service';
import { criarTermo } from '@/services/termo-compromisso.service';
import { uploadDocumento } from '@/services/documentos.service';
import type { TipoDocumento, ModalidadeAceite } from '@/lib/supabase/database.types';
import { CLAUSULAS_TERMO } from '@/core/models/termo-compromisso.model';
import { useSupabaseData } from '@/shared/hooks/useSupabaseData';
import { useTableControls } from '@/shared/hooks/useTableControls';
import type { StatusSolicitacao } from '@/core/models';
import { formatCPF, maskCNS, maskPhone } from '@/shared/pipes/formatters';
import { useMunicipios } from '@/shared/hooks/useLookup';

/* ── AGENTE-4: Análise de refactoring ──
   Esta página NÃO tem campos de texto livre para CID ou médico no formulário:
   - Paciente: selecionado via select (dados puxados do cadastro via pacientes.service) ✓
   - Município: selecionado via select (useMunicipios) ✓
   - Especialidade/transporte: NÃO existem aqui — são preenchidos em /diagnostico-clinico ✓
   - CID: exibido read-only na tabela (sol.cid10_principal) — não é input ✓
   Conclusão: NENHUMA refatoração de campos necessária nesta página.
   Os selects já usam lookups corretamente. */

/* -------------------------------------------------- */
/*  Status label mapping (used by SortableHeader)      */
/* -------------------------------------------------- */

const STATUS_LABELS: Record<string, string> = {
  PENDENTE_DIAGNOSTICO: 'Pend. Diagnóstico',
  NOVO: 'Novo',
  EM_ANALISE: 'Em Análise',
  EXIGENCIA: 'Exigência',
  AGUARDANDO_REGULACAO: 'Ag. Regulação',
  AGUARDANDO_AGENDAMENTO: 'Ag. Agendamento',
  AGUARDANDO_EMISSAO: 'Ag. Emissão',
  EMITIDA: 'Emitida',
  EM_VIAGEM: 'Em Viagem',
  EM_PERMANENCIA: 'Em Permanência',
  CONCLUIDO: 'Concluído',
  INDEFERIDO: 'Indeferido',
  CANCELADO: 'Cancelado',
};

/* -------------------------------------------------- */
/*  Helpers                                            */
/* -------------------------------------------------- */

function formatDate(iso: string): string {
  if (!iso) return '—';
  const datePart = iso.includes('T') ? iso.split('T')[0] : iso;
  const [year, month, day] = datePart.split('-');
  return `${day}/${month}/${year}`;
}

const VINCULO_LABELS: Record<string, string> = {
  CONJUGE: 'Cônjuge',
  FILHO: 'Filho(a)',
  PAI_MAE: 'Pai/Mãe',
  RESPONSAVEL_LEGAL: 'Responsável Legal',
  OUTRO: 'Outro',
};

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function SolicitacoesPage() {
  const toast = useToast();

  /* ---- Drawer state ---- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  /* ---- Delete confirmation state ---- */
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  /* ---- Form state: Paciente select ---- */
  const [selectedPacienteId, setSelectedPacienteId] = useState('');
  const [pacienteSearch, setPacienteSearch] = useState('');
  const [pacienteOptions, setPacienteOptions] = useState<Record<string, unknown>[]>([]);
  const [selectedPaciente, setSelectedPaciente] = useState<Record<string, unknown> | null>(null);
  const [loadingPacientes, setLoadingPacientes] = useState(false);
  const [municipio, setMunicipio] = useState('');

  /* ---- Form state: Acompanhante multi-select ---- */
  const [necessitaAcompanhante, setNecessitaAcompanhante] = useState(false);
  const [acompanhanteOptions, setAcompanhanteOptions] = useState<Record<string, unknown>[]>([]);
  const [selectedAcompanhanteIds, setSelectedAcompanhanteIds] = useState<string[]>([]);

  /* ---- Form state: Termo de Compromisso ---- */
  const [termoModalidade, setTermoModalidade] = useState<ModalidadeAceite | ''>('');
  const [termoConfirmacao, setTermoConfirmacao] = useState(false);
  const [termoUploadFile, setTermoUploadFile] = useState<File | null>(null);
  const [termoClausulasAberto, setTermoClausulasAberto] = useState(false);

  /* ---- Form state: URL SEI ---- */
  const [urlSei, setUrlSei] = useState('');

  /* ---- Form state: Agendamento antecipado (A1) ---- */
  const [dataAgendamento, setDataAgendamento] = useState('');
  const [unidadeDestinoNome, setUnidadeDestinoNome] = useState('');

  /* ---- Lookup hooks ---- */
  const { options: municipios, loading: loadingMun } = useMunicipios();

  /* ---- Data fetching via Supabase (all records for client-side filtering) ---- */
  const { data: allSolicitacoes, loading, refresh } = useSupabaseData(
    () => listarSolicitacoes({ pageSize: 2000 }),
    [],
  );

  /* ---- Table controls (client-side search, filter, sort, pagination) ---- */
  const table = useTableControls({
    data: allSolicitacoes as unknown as Record<string, unknown>[],
    searchFields: ['numero_processo', 'cid10_principal'],
    dateField: 'created_at',
  });

  const solicitacoes = table.paginated as unknown as Record<string, unknown>[];
  const filtered = table.filtered as unknown as Record<string, unknown>[];

  /* Status filter options for SortableHeader */
  const statusFilterOptions = table.getFilterOptions('status').map((v) => ({
    value: v,
    label: STATUS_LABELS[v] ?? v,
  }));

  /* ---- Summary counters ---- */
  const [counts, setCounts] = useState({ total: 0, emAndamento: 0, exigencias: 0, concluidos: 0 });

  const refreshCounts = useCallback(() => {
    contarPorStatus().then(({ data }) => {
      if (data) {
        const emAndamento = ['EM_ANALISE', 'AGUARDANDO_REGULACAO', 'AGUARDANDO_AGENDAMENTO', 'AGUARDANDO_EMISSAO', 'EMITIDA', 'EM_VIAGEM', 'EM_PERMANENCIA']
          .reduce((sum, s) => sum + (data[s] || 0), 0);
        const total = Object.values(data).reduce((sum, v) => sum + v, 0);
        setCounts({
          total,
          emAndamento,
          exigencias: data['EXIGENCIA'] || 0,
          concluidos: data['CONCLUIDO'] || 0,
        });
      }
    });
  }, []);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  /* ---- Load all patients for select ---- */
  useEffect(() => {
    setLoadingPacientes(true);
    listarPacientes({ pageSize: 500 }).then(({ data }) => {
      setPacienteOptions((data ?? []) as Record<string, unknown>[]);
      setLoadingPacientes(false);
    });
  }, []);

  /* ---- Load companions when patient is selected ---- */
  useEffect(() => {
    if (!selectedPacienteId) {
      setAcompanhanteOptions([]);
      setSelectedAcompanhanteIds([]);
      return;
    }
    listarPorPaciente(selectedPacienteId).then(({ data }) => {
      setAcompanhanteOptions((data ?? []) as Record<string, unknown>[]);
    });
  }, [selectedPacienteId]);

  function validarCpfModulo11(value: string): boolean {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(digits)) return false;
    for (let t = 9; t <= 10; t++) {
      let sum = 0;
      for (let i = 0; i < t; i++) sum += Number(digits[i]) * (t + 1 - i);
      const rest = (sum * 10) % 11;
      if ((rest === 10 ? 0 : rest) !== Number(digits[t])) return false;
    }
    return true;
  }

  function resetForm() {
    setSelectedPacienteId('');
    setPacienteSearch('');
    setSelectedPaciente(null);
    setMunicipio('');
    setNecessitaAcompanhante(false);
    setAcompanhanteOptions([]);
    setSelectedAcompanhanteIds([]);
    setTermoModalidade('');
    setTermoConfirmacao(false);
    setTermoUploadFile(null);
    setTermoClausulasAberto(false);
    setUrlSei('');
    setDataAgendamento('');
    setUnidadeDestinoNome('');
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
    setEditingId(null);
    resetForm();
  }

  function handleOpenEdit(sol: Record<string, unknown>) {
    const pac = sol.pacientes as Record<string, unknown> | undefined;
    setEditingId(sol.id as string);

    if (pac) {
      setSelectedPacienteId(pac.id as string);
      setSelectedPaciente(pac);
      setPacienteSearch((pac.nome_completo as string) ?? '');
    }

    setMunicipio((sol.municipio_origem_id as string) ?? '');
    setNecessitaAcompanhante((sol.necessidade_acompanhante as boolean) ?? false);
    setUrlSei((sol.url_sei as string) ?? '');

    // TODO: load selected companions from solicitacao_acompanhantes

    setDrawerOpen(true);
  }

  function handleOpenDelete(sol: Record<string, unknown>) {
    const pac = sol.pacientes as Record<string, unknown> | undefined;
    const label = `${(pac?.nome_completo as string) ?? 'Paciente'} — ${(sol.numero_processo as string) ?? ''}`;
    setDeleteConfirmId(sol.id as string);
    setDeleteConfirmName(label);
  }

  async function handleConfirmDelete() {
    if (!deleteConfirmId) return;
    try {
      const result = await excluirSolicitacao(deleteConfirmId);
      if (result.error) {
        toast.error('Erro ao excluir', (result.error as { message?: string }).message ?? 'Erro desconhecido');
        return;
      }
      toast.success('Solicitação excluída', 'O registro foi removido do sistema.');
      setDeleteConfirmId(null);
      setDeleteConfirmName('');
      refresh();
      refreshCounts();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error('Erro inesperado', e.message ?? 'Tente novamente');
    }
  }

  async function handleSubmitSolicitacao() {
    try {
      /* ── Validação do Termo (obrigatório para nova solicitação) ── */
      if (!editingId) {
        if (!termoModalidade) {
          toast.error('Termo de Compromisso', 'Selecione a modalidade de aceite do Termo.');
          return;
        }
        if (termoModalidade === 'ACEITE_PRESENCIAL' && !termoConfirmacao) {
          toast.error('Termo de Compromisso', 'Confirme que o paciente leu e concordou com os termos.');
          return;
        }
        if (termoModalidade === 'UPLOAD_ASSINADO' && !termoUploadFile) {
          toast.error('Termo de Compromisso', 'Anexe o documento do termo assinado.');
          return;
        }
      }

      // Validate patient selection
      if (!selectedPacienteId) {
        toast.error('Campo obrigatório', 'Selecione um paciente.');
        return;
      }
      const pacienteId = selectedPacienteId;
      const munSelecionado = municipios.find((m) => m.value === municipio);

      // A1: if scheduling was pre-filled, skip the agendamento step
      const agendamentoPreenchido = !editingId && dataAgendamento && unidadeDestinoNome.trim();
      const statusInicial = agendamentoPreenchido ? 'AGUARDANDO_EMISSAO' : 'PENDENTE_DIAGNOSTICO';

      const payload: Record<string, unknown> = {
        paciente_id: pacienteId,
        modalidade: 'INTERESTADUAL',
        necessidade_acompanhante: necessitaAcompanhante,
        status: statusInicial,
        url_sei: urlSei.trim() || null,
        data_agendamento: dataAgendamento || null,
        unidade_destino_nome: unidadeDestinoNome.trim() || null,
      };

      if (municipio) payload.municipio_origem_id = municipio;

      const result = editingId
        ? await atualizarSolicitacao(editingId, payload as any)
        : await criarSolicitacao(payload as any);

      if (result.error) {
        toast.error(
          editingId ? 'Erro ao atualizar solicitação' : 'Erro ao criar solicitação',
          (result.error as { message?: string }).message ?? 'Erro desconhecido',
        );
        return;
      }

      const solId = editingId ?? (result.data as { id: string })?.id;
      const numProcesso = (result.data as { numero_processo?: string })?.numero_processo ?? '';

      /* ── Criar Termo de Compromisso (apenas para nova solicitação) ── */
      if (!editingId && solId && termoModalidade) {
        // Upload do arquivo do termo assinado, se houver
        let arquivoUrl: string | undefined;
        let arquivoNome: string | undefined;
        if (termoModalidade === 'UPLOAD_ASSINADO' && termoUploadFile) {
          const uploadResult = await uploadDocumento(solId, termoUploadFile, 'OUTROS' as TipoDocumento);
          if (!uploadResult.error && uploadResult.data) {
            arquivoUrl = (uploadResult.data as { url?: string }).url ?? '';
            arquivoNome = termoUploadFile.name;
          }
        }

        const termoPayload: Parameters<typeof criarTermo>[0] = {
          solicitacao_id: solId,
          numero_processo: numProcesso,
          paciente_nome: (selectedPaciente?.nome_completo as string) ?? '',
          paciente_cpf: ((selectedPaciente?.cpf as string) ?? '').replace(/\D/g, ''),
          paciente_rg: '' as string,
          paciente_cns: ((selectedPaciente?.cns as string) ?? '').replace(/\D/g, '') || null,
          paciente_municipio: munSelecionado?.label ?? null,
          status: 'REGISTRADO' as const,
          modalidade_aceite: termoModalidade as ModalidadeAceite,
          confirmacao_leitura: termoModalidade === 'ACEITE_PRESENCIAL' ? termoConfirmacao : false,
          responsavel_nome: null,
          responsavel_cpf: null,
          responsavel_parentesco: null,
          arquivo_url: arquivoUrl ?? null,
          arquivo_nome: arquivoNome ?? null,
          data_registro: new Date().toISOString().split('T')[0],
        };

        const termoResult = await criarTermo(termoPayload);
        if (termoResult.error) {
          toast.warning(
            'Solicitação criada, mas houve erro no Termo',
            (termoResult.error as { message?: string }).message ?? 'O Termo poderá ser registrado depois.',
          );
        }
      }

      // Link companions
      if (solId && selectedAcompanhanteIds.length > 0) {
        await vincularAcompanhantes(solId, selectedAcompanhanteIds, selectedAcompanhanteIds[0]);
      }

      toast.success(
        editingId ? 'Solicitação atualizada!' : 'Solicitação criada!',
        editingId
          ? 'Os dados foram atualizados com sucesso.'
          : `Solicitação criada com Termo de Compromisso registrado.`,
      );
      handleCloseDrawer();
      refresh();
      refreshCounts();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error('Erro inesperado', e.message ?? 'Tente novamente');
    }
  }

  return (
    <>
      <PageHeader
        title="Solicitações"
        subtitle="Gerenciamento de solicitações TFD"
        actions={
          <button className="tfd-btn tfd-btn-primary" onClick={() => { setEditingId(null); resetForm(); setDrawerOpen(true); }}>
            <Plus size={16} />
            Nova Solicitação
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
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{counts.total}</p>
            <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--tfd-text-muted)' }}>Todas as solicitações TFD cadastradas</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#FFFBEB', color: '#F59E0B' }}
          >
            <Clock size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Em Andamento</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{counts.emAndamento}</p>
            <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--tfd-text-muted)' }}>Processos em etapa ativa do fluxo</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: 'var(--tfd-status-warning-bg)', color: 'var(--tfd-status-warning)' }}
          >
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Exigências</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-status-warning)' }}>{counts.exigencias}</p>
            <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--tfd-text-muted)' }}>Aguardando complemento de documentação</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: 'var(--tfd-status-success-bg)', color: 'var(--tfd-status-success)' }}
          >
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Concluídos</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-status-success)' }}>{counts.concluidos}</p>
            <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--tfd-text-muted)' }}>Encerrados: alta, transferência, desistência, abandono ou óbito</p>
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
            placeholder="Buscar por número, CID..."
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
                  label="Número"
                  sortDirection={table.getSortDirection('numero_processo')}
                  onSort={() => table.toggleSort('numero_processo')}
                />
                <SortableHeader
                  label="Paciente"
                  sortDirection={table.getSortDirection('pacientes')}
                  onSort={() => table.toggleSort('pacientes')}
                />
                <SortableHeader
                  label="CPF"
                  className="hidden md:table-cell"
                />
                <SortableHeader
                  label="Município"
                  className="hidden lg:table-cell"
                />
                <SortableHeader
                  label="CID"
                  className="hidden lg:table-cell"
                  sortDirection={table.getSortDirection('cid10_principal')}
                  onSort={() => table.toggleSort('cid10_principal')}
                />
                <SortableHeader
                  label="Status"
                  sortDirection={table.getSortDirection('status')}
                  onSort={() => table.toggleSort('status')}
                  filterOptions={statusFilterOptions}
                  activeFilters={table.getActiveFilters('status')}
                  onFilterChange={(v) => table.setColumnFilter('status', v)}
                />
                <SortableHeader
                  label="SEI"
                  className="hidden lg:table-cell"
                />
                <SortableHeader
                  label="Data"
                  className="hidden md:table-cell"
                  sortDirection={table.getSortDirection('created_at')}
                  onSort={() => table.toggleSort('created_at')}
                />
                <th className="w-[120px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                      Carregando...
                    </p>
                  </td>
                </tr>
              ) : solicitacoes.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <XCircle size={32} style={{ color: 'var(--tfd-text-muted)' }} />
                      <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                        Nenhuma solicitação encontrada
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                solicitacoes.map((sol: Record<string, unknown>) => (
                  <tr key={sol.id as string} className="cursor-pointer" onClick={() => handleOpenEdit(sol)}>
                    <td>
                      <Link
                        href={`/solicitacoes/${sol.id}`}
                        className="font-medium hover:underline"
                        style={{ color: 'var(--tfd-primary-500)' }}
                      >
                        {sol.numero_processo as string}
                      </Link>
                    </td>
                    <td className="max-w-[180px] truncate font-medium">
                      {(sol.pacientes as Record<string, unknown>)?.nome_completo as string}
                    </td>
                    <td className="hidden md:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>
                      {formatCPF(((sol.pacientes as Record<string, unknown>)?.cpf as string) ?? '')}
                    </td>
                    <td className="hidden lg:table-cell" style={{ color: 'var(--tfd-text-secondary)' }}>
                      {((sol.pacientes as any)?.municipio_pac?.nome)
                        || ((sol.pacientes as Record<string, unknown>)?.municipio as string)
                        || ((sol as any).municipios?.nome)
                        || '—'}
                    </td>
                    <td className="hidden lg:table-cell" style={{ color: 'var(--tfd-text-secondary)' }}>
                      {sol.cid10_principal as string}
                    </td>
                    <td>
                      <StatusTag status={sol.status as StatusSolicitacao} />
                    </td>
                    <td className="hidden lg:table-cell">
                      {(sol.url_sei as string) ? (
                        <a
                          href={sol.url_sei as string}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-sm hover:underline"
                          style={{ color: 'var(--tfd-primary-500)' }}
                          onClick={(e) => e.stopPropagation()}
                          title="Abrir no SEI"
                        >
                          <ExternalLink size={13} />
                          SEI
                        </a>
                      ) : (
                        <span style={{ color: 'var(--tfd-text-muted)' }}>—</span>
                      )}
                    </td>
                    <td className="hidden md:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>
                      {formatDate(sol.created_at as string)}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/solicitacoes/${sol.id}`}
                          className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                          title="Ver detalhes"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Eye size={15} />
                        </Link>
                        <button
                          className="tfd-btn tfd-btn-danger tfd-btn--icon-only"
                          title="Excluir"
                          onClick={(e) => { e.stopPropagation(); handleOpenDelete(sol); }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
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

      {/* ========== Delete Confirmation Modal ========== */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div
            className="tfd-card p-6 max-w-md w-full mx-4"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
                style={{ backgroundColor: 'var(--tfd-status-error-bg)', color: 'var(--tfd-status-error)' }}
              >
                <Trash2 size={20} />
              </div>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                Confirmar exclusão
              </h3>
            </div>
            <p className="text-sm mb-6" style={{ color: 'var(--tfd-text-secondary)' }}>
              Tem certeza que deseja excluir a solicitação de{' '}
              <strong style={{ color: 'var(--tfd-text-primary)' }}>{deleteConfirmName}</strong>?
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                className="tfd-btn tfd-btn-secondary"
                onClick={() => { setDeleteConfirmId(null); setDeleteConfirmName(''); }}
              >
                Cancelar
              </button>
              <button className="tfd-btn tfd-btn-danger" onClick={handleConfirmDelete}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== Solicitação Drawer ========== */}
      <Drawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        title={editingId ? 'Editar Solicitação' : 'Nova Solicitação'}
        subtitle={editingId ? 'Atualize os dados da solicitação TFD' : 'Preencha os dados para criar uma nova solicitação TFD'}
        width="520px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={handleCloseDrawer}>
              Cancelar
            </button>
            <button className="tfd-btn tfd-btn-primary" onClick={handleSubmitSolicitacao}>
              {editingId ? 'Salvar Alterações' : 'Criar Solicitação'}
            </button>
          </>
        }
      >
        {/* ═══════ Section: Paciente ═══════ */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          Paciente
        </h3>

        <FormField label="Selecionar paciente" required>
          <select
            className="tfd-input"
            value={selectedPacienteId}
            onChange={(e) => {
              const pacId = e.target.value;
              setSelectedPacienteId(pacId);
              if (pacId) {
                const pac = pacienteOptions.find((p) => (p.id as string) === pacId);
                if (pac) {
                  setSelectedPaciente(pac);
                  setMunicipio((pac.municipio_residencia_id as string) ?? '');
                }
              } else {
                setSelectedPaciente(null);
                setAcompanhanteOptions([]);
                setSelectedAcompanhanteIds([]);
              }
            }}
            disabled={loadingPacientes}
          >
            <option value="">{loadingPacientes ? 'Carregando pacientes...' : 'Selecione o paciente...'}</option>
            {pacienteOptions.map((pac) => (
              <option key={pac.id as string} value={pac.id as string}>
                {pac.nome_completo as string} — CPF: {formatCPF((pac.cpf as string) ?? '')}
              </option>
            ))}
          </select>
        </FormField>

        {/* Resumo do paciente selecionado */}
        {selectedPaciente && (
          <div className="tfd-card p-3 mb-4" style={{ backgroundColor: 'var(--tfd-primary-50)' }}>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span style={{ color: 'var(--tfd-text-muted)' }}>Nome:</span>{' '}
                <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                  {selectedPaciente.nome_completo as string}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--tfd-text-muted)' }}>CPF:</span>{' '}
                <span style={{ color: 'var(--tfd-text-primary)' }}>
                  {formatCPF((selectedPaciente.cpf as string) ?? '')}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--tfd-text-muted)' }}>CNS:</span>{' '}
                <span style={{ color: 'var(--tfd-text-primary)' }}>
                  {maskCNS((selectedPaciente.cns as string) ?? '')}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--tfd-text-muted)' }}>Telefone:</span>{' '}
                <span style={{ color: 'var(--tfd-text-primary)' }}>
                  {maskPhone((selectedPaciente.telefone_celular as string) ?? '')}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--tfd-text-muted)' }}>Município:</span>{' '}
                <span style={{ color: 'var(--tfd-text-primary)' }}>
                  {(selectedPaciente.municipio as string) || '—'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ Section: Acompanhantes ═══════ */}
        {selectedPacienteId && (
          <>
            <div className="my-4" style={{ borderTop: '1px solid var(--tfd-surface-border)' }} />
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
              Acompanhantes
            </h3>

            {acompanhanteOptions.length > 0 ? (
              <FormField label="Selecionar acompanhante(s)">
                <div className="space-y-2">
                  {acompanhanteOptions.map((acomp) => {
                    const acompId = acomp.id as string;
                    const isSelected = selectedAcompanhanteIds.includes(acompId);
                    return (
                      <label
                        key={acompId}
                        className="flex items-center gap-3 p-2 rounded-md cursor-pointer border transition-all"
                        style={{
                          borderColor: isSelected ? 'var(--tfd-primary-500)' : 'var(--tfd-surface-border)',
                          backgroundColor: isSelected ? 'var(--tfd-primary-50)' : 'transparent',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedAcompanhanteIds((prev) =>
                              isSelected ? prev.filter((id) => id !== acompId) : [...prev, acompId]
                            );
                            if (!necessitaAcompanhante) setNecessitaAcompanhante(true);
                          }}
                          style={{ accentColor: 'var(--tfd-primary-500)' }}
                        />
                        <div className="text-sm">
                          <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                            {acomp.nome_completo as string}
                          </span>
                          <span className="ml-2" style={{ color: 'var(--tfd-text-muted)' }}>
                            {formatCPF((acomp.cpf as string) ?? '')} — {VINCULO_LABELS[(acomp.vinculo as string)] || (acomp.vinculo as string)}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </FormField>
            ) : (
              <p className="text-sm mb-4" style={{ color: 'var(--tfd-text-muted)' }}>
                Este paciente não possui acompanhantes cadastrados.{' '}
                <a href="/pacientes" className="underline" style={{ color: 'var(--tfd-primary-500)' }}>
                  Cadastre na tela de Pacientes
                </a>
              </p>
            )}
          </>
        )}

        {/* ═══════ Section: Vínculo SEI ═══════ */}
        <hr className="tfd-divider" />
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          <ExternalLink size={14} className="inline mr-1.5" style={{ color: 'var(--tfd-primary-500)' }} />
          Vínculo SEI
        </h3>
        <FormField label="URL da solicitação no SEI">
          <input
            type="url"
            className="tfd-input"
            placeholder="https://sei.ma.gov.br/..."
            value={urlSei}
            onChange={(e) => setUrlSei(e.target.value)}
          />
        </FormField>
        <p className="text-xs mb-4" style={{ color: 'var(--tfd-text-muted)' }}>
          Opcional — cole o link da solicitação no sistema SEI para manter o vínculo entre os dois sistemas.
        </p>

        {/* ═══════ Section: Agendamento antecipado (A1) — apenas nova solicitação ═══════ */}
        {!editingId && (
          <>
            <hr className="tfd-divider" />
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={16} style={{ color: 'var(--tfd-primary-500)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                Agendamento (se já vier definido)
              </h3>
            </div>
            <p className="text-xs mb-3" style={{ color: 'var(--tfd-text-muted)' }}>
              Quando o paciente já chega com data e unidade confirmadas, preencha abaixo.
              O processo pulará automaticamente a etapa de agendamento.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Data do agendamento" hint="opcional">
                <input
                  type="date"
                  className="tfd-input"
                  value={dataAgendamento}
                  onChange={(e) => setDataAgendamento(e.target.value)}
                />
              </FormField>
              <FormField label="Unidade de destino" hint="opcional">
                <input
                  type="text"
                  className="tfd-input"
                  placeholder="Ex: HC-SP, INCA, UNIFESO..."
                  value={unidadeDestinoNome}
                  onChange={(e) => setUnidadeDestinoNome(e.target.value)}
                />
              </FormField>
            </div>
            {dataAgendamento && unidadeDestinoNome.trim() && (
              <div
                className="flex items-start gap-2 px-3 py-2 rounded-lg mb-3"
                style={{ backgroundColor: '#DBEAFE', border: '1px solid #93C5FD' }}
              >
                <span className="text-xs font-medium" style={{ color: '#1D4ED8' }}>
                  Agendamento definido — a etapa de agendamento será pulada automaticamente.
                </span>
              </div>
            )}
          </>
        )}

        {/* ═══════ Section: Termo de Compromisso (apenas nova solicitação) ═══════ */}
        {!editingId && (
          <>
            <hr className="tfd-divider" />

            <div className="flex items-center gap-2 mb-3">
              <FileSignature size={18} style={{ color: 'var(--tfd-primary-500)' }} />
              <h3 className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                Termo de Compromisso
              </h3>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'var(--tfd-status-error-bg)', color: 'var(--tfd-status-error)' }}
              >
                Obrigatório
              </span>
            </div>

            <p className="text-xs mb-3" style={{ color: 'var(--tfd-text-muted)' }}>
              O paciente deve aceitar os termos do programa TFD antes de prosseguir.
            </p>

            {/* Cláusulas colapsáveis */}
            <div
              className="rounded-lg mb-4 overflow-hidden"
              style={{ border: '1px solid var(--tfd-surface-border)' }}
            >
              <button
                type="button"
                className="w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-[var(--tfd-surface-50)]"
                onClick={() => setTermoClausulasAberto((v) => !v)}
              >
                <div className="flex items-center gap-2">
                  <ScrollText size={14} style={{ color: 'var(--tfd-primary-500)' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                    17 Cláusulas do Termo de Compromisso
                  </span>
                </div>
                <ChevronRight
                  size={14}
                  style={{
                    color: 'var(--tfd-text-muted)',
                    transform: termoClausulasAberto ? 'rotate(90deg)' : undefined,
                    transition: 'transform 150ms ease',
                  }}
                />
              </button>

              {termoClausulasAberto && (
                <div
                  className="px-3 pb-3 max-h-[240px] overflow-y-auto"
                  style={{ borderTop: '1px solid var(--tfd-surface-border)' }}
                >
                  <ol className="list-decimal list-outside pl-4 space-y-2 pt-3">
                    {CLAUSULAS_TERMO.map((clausula, idx) => (
                      <li
                        key={idx}
                        className="text-xs leading-relaxed"
                        style={{ color: 'var(--tfd-text-secondary)' }}
                      >
                        {clausula}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>

            {/* Modalidade de Aceite */}
            <FormField label="Modalidade de aceite" required>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="termoModalidade"
                    value="ACEITE_PRESENCIAL"
                    checked={termoModalidade === 'ACEITE_PRESENCIAL'}
                    onChange={() => setTermoModalidade('ACEITE_PRESENCIAL')}
                    style={{ accentColor: 'var(--tfd-primary-500)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>
                    Aceite Presencial
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="termoModalidade"
                    value="UPLOAD_ASSINADO"
                    checked={termoModalidade === 'UPLOAD_ASSINADO'}
                    onChange={() => setTermoModalidade('UPLOAD_ASSINADO')}
                    style={{ accentColor: 'var(--tfd-primary-500)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>
                    Upload de Termo Assinado
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-not-allowed opacity-50">
                  <input
                    type="radio"
                    name="termoModalidade"
                    disabled
                    style={{ accentColor: 'var(--tfd-primary-500)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                    Assinatura Digital <span className="text-[10px]">(em breve)</span>
                  </span>
                </label>
              </div>
            </FormField>

            {/* Aceite Presencial: checkbox de confirmação */}
            {termoModalidade === 'ACEITE_PRESENCIAL' && (
              <div
                className="flex items-start gap-2 p-3 rounded-lg mb-4"
                style={{ backgroundColor: 'var(--tfd-primary-50)', border: '1px solid var(--tfd-primary-100)' }}
              >
                <input
                  type="checkbox"
                  id="termoConfirmacao"
                  checked={termoConfirmacao}
                  onChange={(e) => setTermoConfirmacao(e.target.checked)}
                  className="mt-0.5"
                  style={{ accentColor: 'var(--tfd-primary-500)' }}
                />
                <label htmlFor="termoConfirmacao" className="text-xs leading-relaxed cursor-pointer" style={{ color: 'var(--tfd-primary-700)' }}>
                  Confirmo que o paciente/responsável leu e concordou com todos os termos acima.
                </label>
              </div>
            )}

            {/* Upload de Termo Assinado */}
            {termoModalidade === 'UPLOAD_ASSINADO' && (
              <div className="mb-4">
                {!termoUploadFile ? (
                  <label
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors hover:border-[var(--tfd-primary-300)] hover:bg-[var(--tfd-primary-50)]"
                    style={{ borderColor: 'var(--tfd-surface-border)' }}
                  >
                    <Upload size={18} style={{ color: 'var(--tfd-primary-500)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--tfd-primary-600)' }}>
                      Anexar termo assinado
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 10 * 1024 * 1024) {
                            toast.error('Arquivo muito grande', 'O tamanho máximo é 10 MB.');
                            return;
                          }
                          setTermoUploadFile(file);
                        }
                        e.target.value = '';
                      }}
                    />
                  </label>
                ) : (
                  <div
                    className="flex items-center gap-3 p-2.5 rounded-lg"
                    style={{ backgroundColor: 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}
                  >
                    <div
                      className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                      style={{ backgroundColor: 'var(--tfd-status-success-bg)', color: 'var(--tfd-status-success)' }}
                    >
                      <FileSignature size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--tfd-text-primary)' }}>
                        {termoUploadFile.name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                        {(termoUploadFile.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      className="tfd-btn tfd-btn-ghost tfd-btn--icon-only shrink-0"
                      title="Remover arquivo"
                      onClick={() => setTermoUploadFile(null)}
                    >
                      <X size={14} style={{ color: 'var(--tfd-status-danger)' }} />
                    </button>
                  </div>
                )}
                <p className="text-xs mt-1" style={{ color: 'var(--tfd-text-muted)' }}>
                  PDF, JPG ou PNG — até 10 MB
                </p>
              </div>
            )}

          </>
        )}
      </Drawer>
    </>
  );
}
