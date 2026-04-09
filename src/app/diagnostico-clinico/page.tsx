'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Microscope,
  Search,
  Calendar,
  Eye,
  ChevronLeft,
  ChevronRight,
  XCircle,
  Upload,
  X,
  Loader2,
  Paperclip,
  Check,
  AlertTriangle,
  ArrowLeft,
  SendHorizonal,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import StatusTag from '@/shared/components/status-tag/StatusTag';
import SortableHeader from '@/shared/components/table/SortableHeader';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import { useToast } from '@/shared/components/toast/Toast';
import { listarSolicitacoes, atualizarSolicitacao, contarPorStatus } from '@/services/solicitacoes.service';
import { uploadDocumento } from '@/services/documentos.service';
import type { TipoDocumento } from '@/lib/supabase/database.types';
import { useSupabaseData } from '@/shared/hooks/useSupabaseData';
import { useTableControls } from '@/shared/hooks/useTableControls';
import { formatCPF } from '@/shared/pipes/formatters';
import LookupSelect from '@/shared/components/lookup-select/LookupSelect';
import { createClient } from '@/lib/supabase/client';
import DevolverModal from '@/shared/components/devolver-modal/DevolverModal';
import { useDevolucoesPendentes } from '@/shared/hooks/useDevolucoesPendentes';
import { slaBadge } from '@/shared/utils/sla';
import { useDevolucoeRecebidas } from '@/shared/hooks/useDevolucoeRecebidas';
import type { StatusSolicitacao } from '@/core/models';

/* -------------------------------------------------- */
/*  Helpers                                            */
/* -------------------------------------------------- */

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


/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function DiagnosticoClinicoPage() {
  const toast = useToast();

  /* ---- Drawer state ---- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedSol, setSelectedSol] = useState<Record<string, unknown> | null>(null);

  /* ---- Reference data (loaded on mount) ---- */
  const [medicos, setMedicos] = useState<Array<{ id: string; nome_completo: string; crm: string; crm_uf: string }>>([]);
  const [cidOptions, setCidOptions] = useState<Array<{ id: string; codigo: string; descricao: string }>>([]);

  /* ---- Form state: Dados do Laudo ---- */
  const [origemLaudo, setOrigemLaudo] = useState('');
  const [dataLaudo, setDataLaudo] = useState('');
  const [caracterAtendimento, setCaracterAtendimento] = useState('');

  /* ---- Form state: Médico Solicitante ---- */
  const [medicoId, setMedicoId] = useState('');

  /* ---- Form state: Diagnóstico ---- */
  const [cid, setCid] = useState('');
  const [cidSecundario, setCidSecundario] = useState('');
  const [descricaoDiagnostico, setDescricaoDiagnostico] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [procedimento, setProcedimento] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [tipoTransporte, setTipoTransporte] = useState('');
  const [tratamentosAnteriores, setTratamentosAnteriores] = useState('');

  /* ---- Form state: Documentos (pending uploads) ---- */
  interface PendingFile {
    file: File;
    tipo: TipoDocumento;
  }
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);

  function urgencyColor(iso: string): string | undefined {
    if (!iso) return undefined;
    const hours = (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60);
    if (hours > 48) return '#EF4444';
    if (hours > 24) return '#F59E0B';
    return undefined;
  }

  /* ---- Devolver state ---- */
  const [devolverSol, setDevolverSol] = useState<Record<string, unknown> | null>(null);

  /* ---- Devoluções pendentes ---- */
  const { mapa: devolucoesEnviadas, labelDestino, refresh: refreshDevolucoes } = useDevolucoesPendentes('DIAGNOSTICO_CLINICO');
  const { mapa: devolucoesRecebidas, labelOrigem } = useDevolucoeRecebidas('DIAGNOSTICO_CLINICO');

  /* ---- IDs of devolved items ---- */
  const devolvedIds = useMemo(() => Array.from(devolucoesEnviadas.keys()), [devolucoesEnviadas]);

  /* ---- Data: only PENDENTE_DIAGNOSTICO + devolved items ---- */
  const { data: allSolicitacoes, loading, refresh } = useSupabaseData(
    () => listarSolicitacoes({ status: 'PENDENTE_DIAGNOSTICO', pageSize: 2000, includeIds: devolvedIds }),
    [devolvedIds],
  );

  /* ---- Table controls (client-side search, filter, sort, pagination) ---- */
  const table = useTableControls({
    data: allSolicitacoes as unknown as Record<string, unknown>[],
    searchFields: ['numero_processo'],
    dateField: 'created_at',
  });

  const items = table.paginated as unknown as Record<string, unknown>[];
  const filtered = table.filtered as unknown as Record<string, unknown>[];

  /* ---- Pending count + preenchidos hoje ---- */
  const [pendingCount, setPendingCount] = useState(0);
  const [preenchidosHoje, setPreenchidosHoje] = useState(0);
  const refreshCount = useCallback(() => {
    contarPorStatus().then(({ data }) => {
      if (data) {
        setPendingCount(data['PENDENTE_DIAGNOSTICO'] || 0);
        // Preenchidos hoje = processos que saíram de PENDENTE_DIAGNOSTICO hoje (NOVO ou superior)
        setPreenchidosHoje(data['_PREENCHIDOS_HOJE'] || 0);
      }
    });
  }, []);
  useEffect(() => { refreshCount(); }, [refreshCount]);

  /* ---- Load reference data ---- */
  useEffect(() => {
    const sb = createClient();
    sb.from('medicos').select('id, nome_completo, crm, crm_uf').eq('ativo', true).order('nome_completo')
      .then(({ data }) => { if (data) setMedicos(data as typeof medicos); });
    sb.from('tabelas_auxiliares').select('id, codigo, descricao').eq('categoria', 'cid10').eq('ativo', true).order('codigo')
      .then(({ data }) => { if (data) setCidOptions(data as typeof cidOptions); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- Drawer helpers ---- */

  function resetForm() {
    setOrigemLaudo('');
    setDataLaudo('');
    setMedicoId('');
    setCaracterAtendimento('');
    setCid('');
    setCidSecundario('');
    setDescricaoDiagnostico('');
    setEspecialidade('');
    setProcedimento('');
    setJustificativa('');
    setTipoTransporte('');
    setTratamentosAnteriores('');
    setPendingFiles([]);
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
    setSelectedSol(null);
    resetForm();
  }

  function handleOpenDiagnostico(sol: Record<string, unknown>) {
    setSelectedSol(sol);
    setOrigemLaudo((sol.origem_laudo as string) ?? '');
    setDataLaudo((sol.data_laudo as string) ?? '');
    setCaracterAtendimento((sol.carater_atendimento as string) ?? '');
    // Tenta casar médico pelo CRM salvo
    const savedCrm = sol.medico_solicitante_crm as string;
    if (savedCrm && medicos.length > 0) {
      const found = medicos.find(m => m.crm === savedCrm);
      setMedicoId(found?.id ?? '');
    } else {
      setMedicoId('');
    }
    setCid((sol.cid10_principal as string) ?? '');
    setCidSecundario((sol.cid10_secundario as string) ?? '');
    setDescricaoDiagnostico((sol.descricao_diagnostico as string) ?? '');
    setEspecialidade((sol.especialidade as string) ?? '');
    setProcedimento((sol.tipo_procedimento as string) ?? '');
    setJustificativa((sol.justificativa_tfd as string) ?? '');
    setTipoTransporte((sol.tipo_transporte_sugerido as string) ?? '');
    setPendingFiles([]);
    setDrawerOpen(true);
  }

  async function handleSaveRascunho() {
    if (!selectedSol) return;
    try {
      const selectedMedico = medicos.find(m => m.id === medicoId);
      const payload: Record<string, unknown> = {
        origem_laudo: origemLaudo || null,
        data_laudo: dataLaudo || null,
        medico_solicitante_nome: selectedMedico?.nome_completo || null,
        medico_solicitante_crm: selectedMedico?.crm || null,
        medico_solicitante_uf: selectedMedico?.crm_uf || null,
        carater_atendimento: caracterAtendimento || null,
        cid10_principal: cid || null,
        cid10_secundario: cidSecundario || null,
        descricao_diagnostico: descricaoDiagnostico || null,
        especialidade: especialidade || null,
        tipo_procedimento: procedimento || null,
        justificativa_tfd: justificativa || null,
        tipo_transporte_sugerido: tipoTransporte || null,
      };
      await atualizarSolicitacao(selectedSol.id as string, payload as any);
      toast.success('Rascunho salvo', 'Os dados foram salvos. Você pode continuar depois.');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error('Erro ao salvar', e.message ?? 'Tente novamente');
    }
  }

  async function handleConcluirDiagnostico() {
    if (!selectedSol) return;

    // Validações — Dados do Laudo (Onda 1)
    if (!origemLaudo) { toast.warning('Campo obrigatório', 'Selecione a origem do laudo.'); return; }
    if (origemLaudo === 'MUNICIPAL') { toast.error('Laudo inválido', 'O TFD interestadual exige laudo de origem estadual. Laudos municipais não são aceitos.'); return; }
    if (!dataLaudo) { toast.warning('Campo obrigatório', 'Informe a data do laudo médico.'); return; }
    // Validar validade do laudo (12 meses)
    const laudoDate = new Date(dataLaudo);
    const validadeDate = new Date(laudoDate);
    validadeDate.setFullYear(validadeDate.getFullYear() + 1);
    if (validadeDate < new Date()) {
      toast.error('Laudo vencido', `O laudo expirou em ${formatDate(validadeDate.toISOString())}. Solicite renovação ao paciente.`);
      return;
    }
    const diasParaVencer = Math.floor((validadeDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (diasParaVencer <= 30) {
      toast.warning('Laudo próximo do vencimento', `O laudo vence em ${diasParaVencer} dia(s). Considere solicitar renovação.`);
    }
    if (!medicoId) { toast.warning('Campo obrigatório', 'Selecione o médico solicitante.'); return; }
    if (!caracterAtendimento) { toast.warning('Campo obrigatório', 'Selecione o caráter do atendimento.'); return; }

    // Validações — Diagnóstico Clínico
    if (!cid) { toast.warning('Campo obrigatório', 'Preencha o CID-10 principal.'); return; }
    if (!especialidade) { toast.warning('Campo obrigatório', 'Selecione a especialidade.'); return; }
    if (!tipoTransporte) { toast.warning('Campo obrigatório', 'Selecione o tipo de transporte.'); return; }

    // Check for laudo
    const hasLaudo = pendingFiles.some((pf) => pf.tipo === 'LAUDO_MEDICO');
    if (!hasLaudo) { toast.warning('Documento obrigatório', 'Anexe ao menos um Laudo Médico.'); return; }

    try {
      const selectedMedico = medicos.find(m => m.id === medicoId);
      const payload: Record<string, unknown> = {
        origem_laudo: origemLaudo,
        data_laudo: dataLaudo,
        data_validade_laudo: validadeDate.toISOString().split('T')[0],
        medico_solicitante_nome: selectedMedico?.nome_completo || null,
        medico_solicitante_crm: selectedMedico?.crm || null,
        medico_solicitante_uf: selectedMedico?.crm_uf || null,
        carater_atendimento: caracterAtendimento,
        cid10_principal: cid,
        cid10_secundario: cidSecundario || null,
        descricao_diagnostico: descricaoDiagnostico,
        especialidade,
        tipo_procedimento: procedimento,
        justificativa_tfd: justificativa,
        tipo_transporte_sugerido: tipoTransporte,
        status: 'EM_ANALISE',
      };

      const result = await atualizarSolicitacao(selectedSol.id as string, payload as any);
      if (result.error) {
        toast.error('Erro ao concluir', (result.error as { message?: string }).message ?? 'Erro desconhecido');
        return;
      }

      // Upload documents
      if (pendingFiles.length > 0) {
        setUploading(true);
        let uploadErrors = 0;
        for (const pf of pendingFiles) {
          try {
            const uploadResult = await uploadDocumento(selectedSol.id as string, pf.file, pf.tipo);
            if (uploadResult.error) uploadErrors++;
          } catch { uploadErrors++; }
        }
        setUploading(false);
        if (uploadErrors > 0) {
          toast.warning('Upload parcial', `${uploadErrors} documento(s) falharam no upload.`);
        }
      }

      toast.success('Diagnóstico concluído!', 'O processo foi enviado para o Parecer Médico.');
      handleCloseDrawer();
      refresh();
      refreshCount();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error('Erro inesperado', e.message ?? 'Tente novamente');
    }
  }

  const pac = selectedSol ? (selectedSol.pacientes as Record<string, unknown> | undefined) : null;

  return (
    <>
      <PageHeader
        title="Diagn&oacute;stico Cl&iacute;nico"
        subtitle="Processos aguardando preenchimento do diagn&oacute;stico"
      />

      {/* ========== Summary Cards ========== */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#FFF7ED', color: '#C2410C' }}
          >
            <Microscope size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Pendentes</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{pendingCount}</p>
            <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--tfd-text-muted)' }}>Aguardando preenchimento do diagnóstico clínico</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#DCFCE7', color: '#16A34A' }}
          >
            <Check size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Preenchidos Hoje</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{preenchidosHoje}</p>
            <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--tfd-text-muted)' }}>Diagnósticos completados no dia</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#FEF3C7', color: '#F59E0B' }}
          >
            <ArrowLeft size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Devoluções Pendentes</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-status-warning)' }}>{devolucoesEnviadas.size}</p>
            <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--tfd-text-muted)' }}>Processos devolvidos aguardando correção</p>
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
            placeholder="Buscar por n&uacute;mero do processo..."
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
                  sortDirection={table.getSortDirection('cpf')}
                  onSort={() => table.toggleSort('cpf')}
                />
                <SortableHeader
                  label="Município"
                  className="hidden lg:table-cell"
                  sortDirection={table.getSortDirection('municipio')}
                  onSort={() => table.toggleSort('municipio')}
                />
                <SortableHeader
                  label="Tempo pendente"
                  sortDirection={table.getSortDirection('created_at')}
                  onSort={() => table.toggleSort('created_at')}
                />
                <SortableHeader
                  label="Data abertura"
                  className="hidden md:table-cell"
                  sortDirection={table.getSortDirection('created_at_date')}
                  onSort={() => table.toggleSort('created_at')}
                />
                <th className="w-[100px]">Ação</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Carregando...</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Check size={32} style={{ color: 'var(--tfd-status-success)' }} />
                      <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                        Nenhum processo pendente de diagn&oacute;stico
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((sol: Record<string, unknown>) => {
                  const pacRow = sol.pacientes as Record<string, unknown> | undefined;
                  const urg = urgencyColor(sol.created_at as string);
                  const aguardandoRetorno = labelDestino(sol.id as string);
                  const devolucaoInfo = devolucoesEnviadas.get(sol.id as string);
                  const retornoRecebido = labelOrigem(sol.id as string);
                  const retornoInfo = devolucoesRecebidas.get(sol.id as string);
                  return (
                    <tr key={sol.id as string} className={aguardandoRetorno ? '' : 'cursor-pointer'} style={{ opacity: aguardandoRetorno ? 0.55 : undefined, backgroundColor: aguardandoRetorno ? '#F8F9FA' : retornoRecebido ? '#FFFBEB' : undefined, pointerEvents: aguardandoRetorno ? 'none' : undefined, borderLeft: retornoRecebido ? '4px solid #F59E0B' : undefined }} onClick={aguardandoRetorno ? undefined : () => handleOpenDiagnostico(sol)}>
                      <td>
                        <Link
                          href={`/solicitacoes/${sol.id}?from=diagnostico-clinico`}
                          className="font-medium hover:underline"
                          style={{ color: aguardandoRetorno ? 'var(--tfd-text-muted)' : 'var(--tfd-primary-500)' }}
                        >
                          {sol.numero_processo as string}
                        </Link>
                      </td>
                      <td className="max-w-[180px] truncate font-medium">
                        <div className="flex flex-col gap-0.5">
                          <span>{pacRow?.nome_completo as string}</span>
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
                      <td className="hidden md:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>
                        {formatCPF((pacRow?.cpf as string) ?? '')}
                      </td>
                      <td className="hidden lg:table-cell" style={{ color: 'var(--tfd-text-secondary)' }}>
                        {((pacRow as any)?.municipio_pac?.nome)
                          || (pacRow?.municipio as string)
                          || ((sol as any).municipios?.nome)
                          || '\u2014'}
                      </td>
                      <td>
                        {(() => { const b = slaBadge(sol.created_at as string); return (
                          <span className="tfd-tag tfd-tag--rounded text-xs font-semibold" style={b.style}>{b.label}</span>
                        ); })()}
                      </td>
                      <td className="hidden md:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>
                        {formatDate(sol.created_at as string)}
                      </td>
                      <td>
                        <div className="flex items-center gap-1" style={{ pointerEvents: 'auto' }}>
                          <Link
                            href={`/solicitacoes/${sol.id}?from=diagnostico-clinico`}
                            className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                            title="Ver processo"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Eye size={15} />
                          </Link>
                          {!aguardandoRetorno && (
                            <button
                              className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                              title="Devolver"
                              onClick={(e) => { e.stopPropagation(); setDevolverSol(sol); }}
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

      {/* ========== Diagnóstico Drawer ========== */}
      <Drawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        title="Preencher Diagn&oacute;stico"
        subtitle={selectedSol ? `${(selectedSol.numero_processo as string)} \u2014 ${(pac?.nome_completo as string) ?? ''}` : ''}
        width="560px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={handleSaveRascunho}>
              Salvar Rascunho
            </button>
            <button className="tfd-btn tfd-btn-primary" onClick={handleConcluirDiagnostico}>
              <Check size={16} />
              Concluir Diagn&oacute;stico
            </button>
          </>
        }
      >
        {/* Contexto: dados do paciente (read-only) */}
        {pac && (
          <div
            className="p-3 rounded-lg mb-4"
            style={{ backgroundColor: 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--tfd-text-muted)' }}>
                Dados do Paciente
              </h4>
              <StatusTag status="PENDENTE_DIAGNOSTICO" />
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <div>
                <span style={{ color: 'var(--tfd-text-muted)' }}>Nome: </span>
                <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{pac.nome_completo as string}</span>
              </div>
              <div>
                <span style={{ color: 'var(--tfd-text-muted)' }}>CPF: </span>
                <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{formatCPF((pac.cpf as string) ?? '')}</span>
              </div>
              <div>
                <span style={{ color: 'var(--tfd-text-muted)' }}>CNS: </span>
                <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{(pac.cns as string) || '\u2014'}</span>
              </div>
              <div>
                <span style={{ color: 'var(--tfd-text-muted)' }}>Munic&iacute;pio: </span>
                <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                  {((pac as any)?.municipio_pac?.nome) || (pac.municipio as string) || '\u2014'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Section: Dados do Laudo (Onda 1: B7-B12) */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          Dados do Laudo
        </h3>

        <LookupSelect
          categoria="origem_laudo"
          label="Origem do laudo"
          value={origemLaudo}
          onChange={setOrigemLaudo}
          required
          valueField="codigo"
          orderBy="ordem"
        />
        {origemLaudo === 'MUNICIPAL' && (
          <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
            <XCircle size={14} style={{ color: '#DC2626' }} />
            <span className="text-xs font-medium" style={{ color: '#991B1B' }}>
              O TFD interestadual exige laudo de origem estadual
            </span>
          </div>
        )}

        <FormField label="Data do laudo" required>
          <input
            type="date"
            className="tfd-input"
            value={dataLaudo}
            onChange={(e) => setDataLaudo(e.target.value)}
          />
          {dataLaudo && (() => {
            const d = new Date(dataLaudo);
            const v = new Date(d);
            v.setFullYear(v.getFullYear() + 1);
            const dias = Math.floor((v.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            if (dias < 0) return (
              <div className="flex items-center gap-2 mt-1 px-3 py-1.5 rounded-lg" style={{ backgroundColor: '#FEE2E2' }}>
                <AlertTriangle size={12} style={{ color: '#DC2626' }} />
                <span className="text-xs" style={{ color: '#991B1B' }}>Laudo vencido — validade: {formatDate(v.toISOString())}</span>
              </div>
            );
            if (dias <= 30) return (
              <div className="flex items-center gap-2 mt-1 px-3 py-1.5 rounded-lg" style={{ backgroundColor: '#FEF3C7' }}>
                <AlertTriangle size={12} style={{ color: '#92400E' }} />
                <span className="text-xs" style={{ color: '#92400E' }}>Laudo vence em {dias} dia(s) — validade: {formatDate(v.toISOString())}</span>
              </div>
            );
            return (
              <p className="text-xs mt-1" style={{ color: 'var(--tfd-text-muted)' }}>
                Validade: {formatDate(v.toISOString())} ({dias} dias restantes)
              </p>
            );
          })()}
        </FormField>

        <FormField label="Médico solicitante" required>
          <select
            className="tfd-input"
            value={medicoId}
            onChange={(e) => setMedicoId(e.target.value)}
          >
            <option value="">{medicos.length === 0 ? 'Carregando...' : 'Selecione o médico...'}</option>
            {medicos.map(m => (
              <option key={m.id} value={m.id}>
                {m.nome_completo} — CRM {m.crm}/{m.crm_uf}
              </option>
            ))}
          </select>
        </FormField>

        <LookupSelect
          categoria="carater_atendimento"
          label="Caráter do atendimento"
          value={caracterAtendimento}
          onChange={setCaracterAtendimento}
          required
          valueField="codigo"
          orderBy="ordem"
        />

        <hr className="tfd-divider" />

        {/* Section: Diagnóstico Clínico */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          Diagn&oacute;stico Cl&iacute;nico
        </h3>

        <FormField label="CID-10 principal" required>
          <select
            className="tfd-input"
            value={cid}
            onChange={(e) => {
              const val = e.target.value;
              setCid(val);
              const found = cidOptions.find(c => c.codigo === val);
              setProcedimento(found?.descricao ?? '');
            }}
          >
            <option value="">{cidOptions.length === 0 ? 'Carregando...' : 'Selecione o CID-10...'}</option>
            {cidOptions.map(c => (
              <option key={c.id} value={c.codigo}>
                {c.codigo} — {c.descricao}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="CID-10 secundário">
          <select
            className="tfd-input"
            value={cidSecundario}
            onChange={(e) => setCidSecundario(e.target.value)}
          >
            <option value="">{cidOptions.length === 0 ? 'Carregando...' : 'Nenhum (opcional)'}</option>
            {cidOptions.map(c => (
              <option key={c.id} value={c.codigo}>
                {c.codigo} — {c.descricao}
              </option>
            ))}
          </select>
        </FormField>

        <LookupSelect
          categoria="especialidade"
          label="Especialidade"
          value={especialidade}
          onChange={setEspecialidade}
          required
        />

        <FormField label="Descri&ccedil;&atilde;o do diagn&oacute;stico">
          <textarea
            className="tfd-input"
            rows={3}
            placeholder="Descreva o diagn&oacute;stico cl&iacute;nico do paciente"
            value={descricaoDiagnostico}
            onChange={(e) => setDescricaoDiagnostico(e.target.value)}
          />
        </FormField>

        <FormField label="Tratamentos realizados no estado">
          <textarea
            className="tfd-input"
            rows={2}
            placeholder="Hist&oacute;rico de tratamentos j&aacute; realizados no MA"
            value={tratamentosAnteriores}
            onChange={(e) => setTratamentosAnteriores(e.target.value)}
          />
        </FormField>

        <FormField label="Justificativa TFD">
          <textarea
            className="tfd-input"
            rows={3}
            placeholder="Por que o tratamento n&atilde;o pode ser realizado no Maranh&atilde;o?"
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
          />
        </FormField>

        <FormField label="Tipo de transporte sugerido" required>
          <select
            className="tfd-input"
            value={tipoTransporte}
            onChange={(e) => setTipoTransporte(e.target.value)}
          >
            <option value="">Selecione...</option>
            <option value="AEREO">A&eacute;reo</option>
            <option value="TERRESTRE">Terrestre</option>
            <option value="FLUVIAL">Fluvial</option>
          </select>
        </FormField>

        <hr className="tfd-divider" />

        {/* Section: Documentos Clínicos */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          Documentos Cl&iacute;nicos
        </h3>

        <p className="text-xs mb-3" style={{ color: 'var(--tfd-text-muted)' }}>
          Anexe o laudo m&eacute;dico (obrigat&oacute;rio), exames complementares e demais documentos cl&iacute;nicos.
        </p>

        {/* File picker */}
        <div className="mb-3">
          <label
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors hover:border-[var(--tfd-primary-300)] hover:bg-[var(--tfd-primary-50)]"
            style={{ borderColor: 'var(--tfd-surface-border)' }}
          >
            <Upload size={18} style={{ color: 'var(--tfd-primary-500)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--tfd-primary-600)' }}>
              Clique para selecionar arquivos
            </span>
            <input
              type="file"
              className="hidden"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                const newFiles: PendingFile[] = files.map((f) => ({
                  file: f,
                  tipo: 'LAUDO_MEDICO' as TipoDocumento,
                }));
                setPendingFiles((prev) => [...prev, ...newFiles]);
                e.target.value = '';
              }}
            />
          </label>
          <p className="text-xs mt-1" style={{ color: 'var(--tfd-text-muted)' }}>
            PDF, PNG, JPG, WEBP, DOC &mdash; at&eacute; 50 MB por arquivo
          </p>
        </div>

        {/* Pending files list */}
        {pendingFiles.length > 0 && (
          <div className="space-y-2 mb-3">
            {pendingFiles.map((pf, idx) => (
              <div
                key={`${pf.file.name}-${idx}`}
                className="flex items-center gap-3 p-2.5 rounded-lg"
                style={{ backgroundColor: 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}
              >
                <div
                  className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                  style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}
                >
                  <Paperclip size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--tfd-text-primary)' }}>
                    {pf.file.name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                    {(pf.file.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <select
                  className="tfd-input text-xs py-1 px-2 w-auto min-w-[150px]"
                  value={pf.tipo}
                  onChange={(e) => {
                    setPendingFiles((prev) =>
                      prev.map((f, i) => (i === idx ? { ...f, tipo: e.target.value as TipoDocumento } : f)),
                    );
                  }}
                >
                  <option value="LAUDO_MEDICO">Laudo M&eacute;dico</option>
                  <option value="EXAME_COMPLEMENTAR">Exame Complementar</option>
                  <option value="RELATORIO_TRATAMENTO_ANTERIOR">Relat. Tratamento Ant.</option>
                  <option value="DOCUMENTO_ENCAMINHAMENTO">Doc. Encaminhamento</option>
                  <option value="RELATORIO_MEDICO_ACOMPANHAMENTO">Relat. M&eacute;dico Acomp.</option>
                  <option value="OUTROS">Outros</option>
                </select>
                <button
                  type="button"
                  className="tfd-btn tfd-btn-ghost tfd-btn--icon-only shrink-0"
                  title="Remover arquivo"
                  onClick={() => setPendingFiles((prev) => prev.filter((_, i) => i !== idx))}
                >
                  <X size={14} style={{ color: 'var(--tfd-status-danger)' }} />
                </button>
              </div>
            ))}

            {/* Laudo indicator */}
            {!pendingFiles.some((pf) => pf.tipo === 'LAUDO_MEDICO') && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: '#FEF3C7' }}>
                <AlertTriangle size={12} style={{ color: '#92400E' }} />
                <span className="text-xs font-medium" style={{ color: '#92400E' }}>
                  Selecione ao menos um arquivo como &quot;Laudo M&eacute;dico&quot; (obrigat&oacute;rio)
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#EFF6FF]">
              <Paperclip size={12} style={{ color: '#1E40AF' }} />
              <span className="text-xs font-medium" style={{ color: '#1E40AF' }}>
                {pendingFiles.length} arquivo(s) selecionado(s) &mdash; ser&atilde;o enviados ao concluir
              </span>
            </div>
          </div>
        )}

        {uploading && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#FEF3C7] mb-3">
            <Loader2 size={14} className="animate-spin" style={{ color: '#92400E' }} />
            <span className="text-xs font-medium" style={{ color: '#92400E' }}>
              Enviando documentos...
            </span>
          </div>
        )}
      </Drawer>

      {/* ========== Devolver Modal ========== */}
      <DevolverModal
        open={!!devolverSol}
        onClose={() => setDevolverSol(null)}
        setorAtual="DIAGNOSTICO_CLINICO"
        solicitacaoId={(devolverSol?.id as string) ?? ''}
        statusAtual={(devolverSol?.status as StatusSolicitacao) ?? 'PENDENTE_DIAGNOSTICO'}
        label={`${(devolverSol?.numero_processo as string) ?? ''} — ${((devolverSol?.pacientes as Record<string, unknown>)?.nome_completo as string) ?? 'Paciente'}`}
        onSuccess={() => { refresh(); refreshCount(); refreshDevolucoes(); toast.success('Solicitação devolvida', 'A solicitação foi encaminhada ao setor selecionado.'); }}
      />
    </>
  );
}
