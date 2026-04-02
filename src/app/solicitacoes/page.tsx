'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FileText,
  Plus,
  Search,
  Filter,
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
  Loader2,
  Paperclip,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import StatusTag from '@/shared/components/status-tag/StatusTag';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import { useToast } from '@/shared/components/toast/Toast';
import { listarSolicitacoes, criarSolicitacao, atualizarSolicitacao, excluirSolicitacao, contarPorStatus } from '@/services/solicitacoes.service';
import { criarPaciente, atualizarPaciente, buscarPorCpf } from '@/services/pacientes.service';
import { uploadDocumento } from '@/services/documentos.service';
import type { TipoDocumento } from '@/lib/supabase/database.types';
import { useSupabaseData } from '@/shared/hooks/useSupabaseData';
import type { StatusSolicitacao } from '@/core/models';
import { formatCPF, maskCPF, maskCNS, maskPhone } from '@/shared/pipes/formatters';
import { useLookup, useMunicipios } from '@/shared/hooks/useLookup';

/* -------------------------------------------------- */
/*  Filter options                                     */
/* -------------------------------------------------- */

const STATUS_OPTIONS: { value: StatusSolicitacao | 'TODOS'; label: string }[] = [
  { value: 'TODOS', label: 'Todos os status' },
  { value: 'PENDENTE_DIAGNOSTICO', label: 'Pend. Diagnóstico' },
  { value: 'NOVO', label: 'Novo' },
  { value: 'EM_ANALISE', label: 'Em Análise' },
  { value: 'EXIGENCIA', label: 'Exigência' },
  { value: 'AGUARDANDO_REGULACAO', label: 'Ag. Regulação' },
  { value: 'AGUARDANDO_AGENDAMENTO', label: 'Ag. Agendamento' },
  { value: 'AGUARDANDO_EMISSAO', label: 'Ag. Emissão' },
  { value: 'EMITIDA', label: 'Emitida' },
  { value: 'EM_VIAGEM', label: 'Em Viagem' },
  { value: 'EM_PERMANENCIA', label: 'Em Permanência' },
  { value: 'CONCLUIDO', label: 'Concluído' },
  { value: 'INDEFERIDO', label: 'Indeferido' },
  { value: 'CANCELADO', label: 'Cancelado' },
];

/* -------------------------------------------------- */
/*  Helpers                                            */
/* -------------------------------------------------- */

function formatDate(iso: string): string {
  if (!iso) return '—';
  const datePart = iso.includes('T') ? iso.split('T')[0] : iso;
  const [year, month, day] = datePart.split('-');
  return `${day}/${month}/${year}`;
}

const ITEMS_PER_PAGE = 8;

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function SolicitacoesPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusSolicitacao | 'TODOS'>('TODOS');
  const [currentPage, setCurrentPage] = useState(1);

  /* ---- Drawer state ---- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  /* ---- Delete confirmation state ---- */
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  /* ---- Form state: Paciente ---- */
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [cns, setCns] = useState('');
  const [dataNascimento, setDataNascimento] = useState('');
  const [sexo, setSexo] = useState('');
  const [telefoneCelular, setTelefoneCelular] = useState('');
  const [email, setEmail] = useState('');
  const [municipio, setMunicipio] = useState('');

  /* ---- Form state: Acompanhante ---- */
  const [necessitaAcompanhante, setNecessitaAcompanhante] = useState(false);
  const [nomeAcompanhante, setNomeAcompanhante] = useState('');
  const [cpfAcompanhante, setCpfAcompanhante] = useState('');
  const [vinculo, setVinculo] = useState('');

  /* ---- Form state: Documentos (pending uploads) ---- */
  interface PendingFile {
    file: File;
    tipo: TipoDocumento;
  }
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploading, setUploading] = useState(false);

  /* ---- Lookup hooks ---- */
  const { options: municipios, loading: loadingMun } = useMunicipios();
  const { options: vinculos, loading: loadingVinc } = useLookup('vinculo_acompanhante');

  /* ---- Data fetching via Supabase ---- */
  const { data: solicitacoes, loading, count: totalCount, refresh } = useSupabaseData(
    () => listarSolicitacoes({ status: statusFilter === 'TODOS' ? undefined : statusFilter, search, page: currentPage, pageSize: ITEMS_PER_PAGE }),
    [statusFilter, search, currentPage],
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

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

  function resetForm() {
    setNome('');
    setCpf('');
    setCns('');
    setDataNascimento('');
    setSexo('');
    setTelefoneCelular('');
    setEmail('');
    setMunicipio('');
    setNecessitaAcompanhante(false);
    setNomeAcompanhante('');
    setCpfAcompanhante('');
    setVinculo('');
    setPendingFiles([]);
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
    setEditingId(null);
    resetForm();
  }

  function handleOpenEdit(sol: Record<string, unknown>) {
    const pac = sol.pacientes as Record<string, unknown> | undefined;
    setEditingId(sol.id as string);
    setNome((pac?.nome_completo as string) ?? '');
    setCpf(maskCPF((pac?.cpf as string) ?? ''));
    setCns(maskCNS((pac?.cns as string) ?? ''));
    setDataNascimento((pac?.data_nascimento as string) ?? '');
    setSexo((pac?.sexo as string) ?? '');
    setTelefoneCelular(maskPhone((pac?.telefone_celular as string) ?? ''));
    setEmail((pac?.email as string) ?? '');
    setMunicipio((sol.municipio_origem_id as string) ?? '');
    setNecessitaAcompanhante((sol.necessidade_acompanhante as boolean) ?? false);
    const acomp = Array.isArray(sol.acompanhantes) ? (sol.acompanhantes as Record<string, unknown>[])[0] : undefined;
    setNomeAcompanhante((acomp?.nome_completo as string) ?? '');
    setCpfAcompanhante(maskCPF((acomp?.cpf as string) ?? ''));
    setVinculo((acomp?.vinculo as string) ?? '');
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
      // First, find or create patient — and always sync data
      let pacienteId: string;
      const cleanCpf = cpf.replace(/\D/g, '');
      const cleanCns = cns.replace(/\D/g, '');
      const cleanPhone = telefoneCelular.replace(/\D/g, '');
      const munSelecionado = municipios.find((m) => m.value === municipio);

      const pacData: Record<string, unknown> = {
        nome_completo: nome,
        cpf: cleanCpf,
        cns: cleanCns || '',
        sexo: sexo || 'OUTRO',
        data_nascimento: dataNascimento || '2000-01-01',
        telefone_celular: cleanPhone || '',
        email: email || '',
        municipio: munSelecionado?.label ?? '',
        uf: 'MA',
      };
      if (municipio) pacData.municipio_residencia_id = municipio;

      const existing = await buscarPorCpf(cleanCpf);
      if (existing.data) {
        pacienteId = (existing.data as { id: string }).id;
        // Update existing patient with the latest form data
        await atualizarPaciente(pacienteId, pacData as any);
      } else {
        const newPac = await criarPaciente({ ...pacData, logradouro: '', numero: '', bairro: '', cep: '' } as any);
        if (newPac.error || !newPac.data) {
          toast.error('Erro ao criar paciente', (newPac.error as { message?: string })?.message ?? 'Erro desconhecido');
          return;
        }
        pacienteId = (newPac.data as { id: string }).id;
      }

      const payload: Record<string, unknown> = {
        paciente_id: pacienteId,
        modalidade: 'INTERESTADUAL',
        necessidade_acompanhante: necessitaAcompanhante,
        status: 'PENDENTE_DIAGNOSTICO',
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

      // Upload pending documents after solicitação is created/updated
      const solId = editingId ?? (result.data as { id: string })?.id;
      if (solId && pendingFiles.length > 0) {
        setUploading(true);
        let uploadErrors = 0;
        let lastErrorMsg = '';
        for (const pf of pendingFiles) {
          try {
            const uploadResult = await uploadDocumento(solId, pf.file, pf.tipo);
            if (uploadResult.error) {
              uploadErrors++;
              lastErrorMsg = (uploadResult.error as any)?.message ?? '';
            }
          } catch {
            uploadErrors++;
          }
        }
        setUploading(false);
        if (uploadErrors > 0) {
          toast.warning(
            'Upload parcial',
            `${uploadErrors} de ${pendingFiles.length} documento(s) falharam.${lastErrorMsg ? ` Erro: ${lastErrorMsg}` : ''}`,
          );
        }
      }

      toast.success(
        editingId ? 'Solicitação atualizada!' : 'Solicitação criada!',
        editingId
          ? 'Os dados foram atualizados com sucesso.'
          : `Solicitação registrada${pendingFiles.length > 0 ? ` com ${pendingFiles.length} documento(s)` : ''}.`,
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
          </div>
        </div>
      </div>

      {/* ========== Toolbar ========== */}
      <div className="tfd-toolbar mb-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search
              size={16}
              className="tfd-input-leading-icon"
              style={{ color: 'var(--tfd-text-muted)' }}
            />
            <input
              type="text"
              className="tfd-input tfd-input--sm tfd-input--with-leading-icon"
              placeholder="Buscar por número, paciente, CPF ou município..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <Filter
              size={14}
              className="tfd-input-leading-icon"
              style={{ color: 'var(--tfd-text-muted)' }}
            />
            <select
              className="tfd-input tfd-input--sm tfd-input--with-leading-icon pr-8 min-w-[180px] appearance-none cursor-pointer"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusSolicitacao | 'TODOS');
                setCurrentPage(1);
              }}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
          {totalCount} resultado{totalCount !== 1 && 's'}
        </p>
      </div>

      {/* ========== Table ========== */}
      <div className="tfd-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tfd-table">
            <thead>
              <tr>
                <th>Número</th>
                <th>Paciente</th>
                <th className="hidden md:table-cell">CPF</th>
                <th className="hidden lg:table-cell">Município</th>
                <th className="hidden lg:table-cell">CID</th>
                <th>Status</th>
                <th className="hidden md:table-cell">Data</th>
                <th className="w-[120px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                      Carregando...
                    </p>
                  </td>
                </tr>
              ) : solicitacoes.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
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
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid var(--tfd-surface-border)' }}
          >
            <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
              Página {currentPage} de {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                className="tfd-btn tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="tfd-btn tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
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
        {/* Section: Dados do Paciente */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          Dados do Paciente
        </h3>

        <FormField label="Nome completo" required>
          <input
            type="text"
            className="tfd-input"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </FormField>

        <FormField label="CPF" required>
          <input
            type="text"
            className="tfd-input"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={(e) => setCpf(maskCPF(e.target.value))}
          />
        </FormField>

        <FormField label="Cartão SUS (CNS)">
          <input
            type="text"
            className="tfd-input"
            placeholder="000 0000 0000 0000"
            value={cns}
            onChange={(e) => setCns(maskCNS(e.target.value))}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Data de Nascimento" required>
            <input
              type="date"
              className="tfd-input"
              value={dataNascimento}
              onChange={(e) => setDataNascimento(e.target.value)}
            />
          </FormField>

          <FormField label="Sexo" required>
            <select
              className="tfd-input"
              value={sexo}
              onChange={(e) => setSexo(e.target.value)}
            >
              <option value="">Selecione...</option>
              <option value="MASCULINO">Masculino</option>
              <option value="FEMININO">Feminino</option>
              <option value="OUTRO">Outro</option>
            </select>
          </FormField>
        </div>

        <FormField label="Telefone celular">
          <input
            type="tel"
            className="tfd-input"
            placeholder="(99) 99999-0000"
            value={telefoneCelular}
            onChange={(e) => setTelefoneCelular(maskPhone(e.target.value))}
          />
        </FormField>

        <FormField label="E-mail">
          <input
            type="email"
            className="tfd-input"
            placeholder="paciente@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </FormField>

        <FormField label="Município de Origem">
          <select
            className="tfd-input"
            value={municipio}
            onChange={(e) => setMunicipio(e.target.value)}
            disabled={loadingMun}
          >
            <option value="">{loadingMun ? 'Carregando...' : 'Selecione...'}</option>
            {municipios.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </FormField>

        <hr className="tfd-divider" />

        {/* Section: Acompanhante */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          Acompanhante
        </h3>

        <div className="mb-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="necessitaAcompanhante"
            checked={necessitaAcompanhante}
            onChange={(e) => setNecessitaAcompanhante(e.target.checked)}
            style={{ accentColor: 'var(--tfd-primary-500)' }}
          />
          <label htmlFor="necessitaAcompanhante" className="tfd-label" style={{ marginBottom: 0 }}>
            Necessita acompanhante
          </label>
        </div>

        {necessitaAcompanhante && (
          <>
            <FormField label="Nome do acompanhante">
              <input
                type="text"
                className="tfd-input"
                value={nomeAcompanhante}
                onChange={(e) => setNomeAcompanhante(e.target.value)}
              />
            </FormField>

            <FormField label="CPF do acompanhante">
              <input
                type="text"
                className="tfd-input"
                placeholder="000.000.000-00"
                value={cpfAcompanhante}
                onChange={(e) => setCpfAcompanhante(maskCPF(e.target.value))}
              />
            </FormField>

            <FormField label="Vínculo">
              <select
                className="tfd-input"
                value={vinculo}
                onChange={(e) => setVinculo(e.target.value)}
                disabled={loadingVinc}
              >
                <option value="">{loadingVinc ? 'Carregando...' : 'Selecione...'}</option>
                {vinculos.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </FormField>
          </>
        )}

        <hr className="tfd-divider" />

        {/* Section: Documentos do Paciente */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          Documentos do Paciente
        </h3>

        <p className="text-xs mb-3" style={{ color: 'var(--tfd-text-muted)' }}>
          Anexe os documentos pessoais do paciente (RG, CPF, comprovante de residência, Cartão SUS).
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
                  tipo: 'OUTROS' as TipoDocumento,
                }));
                setPendingFiles((prev) => [...prev, ...newFiles]);
                e.target.value = '';
              }}
            />
          </label>
          <p className="text-xs mt-1" style={{ color: 'var(--tfd-text-muted)' }}>
            PDF, PNG, JPG, WEBP, DOC — até 50 MB por arquivo
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
                  className="tfd-input text-xs py-1 px-2 w-auto min-w-[130px]"
                  value={pf.tipo}
                  onChange={(e) => {
                    setPendingFiles((prev) =>
                      prev.map((f, i) => (i === idx ? { ...f, tipo: e.target.value as TipoDocumento } : f)),
                    );
                  }}
                >
                  <option value="RG">RG</option>
                  <option value="CPF">CPF</option>
                  <option value="CNS">Cartão SUS</option>
                  <option value="COMPROVANTE_RESIDENCIA">Comp. Residência</option>
                  <option value="DOCUMENTO_ACOMPANHANTE">Doc. Acompanhante</option>
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
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#EFF6FF]">
              <Paperclip size={12} style={{ color: '#1E40AF' }} />
              <span className="text-xs font-medium" style={{ color: '#1E40AF' }}>
                {pendingFiles.length} arquivo(s) selecionado(s) — serão enviados ao salvar
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
    </>
  );
}
