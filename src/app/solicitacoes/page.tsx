'use client';

import { useState, useMemo } from 'react';
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
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import StatusTag from '@/shared/components/status-tag/StatusTag';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import { MOCK_SOLICITACOES } from '@/core/mocks/solicitacoes.mock';
import type { StatusSolicitacao } from '@/core/models';
import { formatCPF } from '@/shared/pipes/formatters';
import { useLookup, useMunicipios } from '@/shared/hooks/useLookup';

/* -------------------------------------------------- */
/*  Filter options                                     */
/* -------------------------------------------------- */

const STATUS_OPTIONS: { value: StatusSolicitacao | 'TODOS'; label: string }[] = [
  { value: 'TODOS', label: 'Todos os status' },
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
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

const ITEMS_PER_PAGE = 8;

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function SolicitacoesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusSolicitacao | 'TODOS'>('TODOS');
  const [currentPage, setCurrentPage] = useState(1);

  /* ---- Drawer state ---- */
  const [drawerOpen, setDrawerOpen] = useState(false);

  /* ---- Form state ---- */
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [cid, setCid] = useState('');
  const [descricaoDiagnostico, setDescricaoDiagnostico] = useState('');
  const [especialidade, setEspecialidade] = useState('');
  const [procedimento, setProcedimento] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [necessitaAcompanhante, setNecessitaAcompanhante] = useState(false);
  const [nomeAcompanhante, setNomeAcompanhante] = useState('');
  const [cpfAcompanhante, setCpfAcompanhante] = useState('');
  const [vinculo, setVinculo] = useState('');

  /* ---- Lookup hooks ---- */
  const { options: municipios, loading: loadingMun } = useMunicipios();
  const { options: especialidades, loading: loadingEsp } = useLookup('especialidade');
  const { options: vinculos, loading: loadingVinc } = useLookup('vinculo_acompanhante');

  function resetForm() {
    setNome('');
    setCpf('');
    setMunicipio('');
    setCid('');
    setDescricaoDiagnostico('');
    setEspecialidade('');
    setProcedimento('');
    setJustificativa('');
    setNecessitaAcompanhante(false);
    setNomeAcompanhante('');
    setCpfAcompanhante('');
    setVinculo('');
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
    resetForm();
  }

  function handleSubmitSolicitacao() {
    alert('Solicitação criada com sucesso!');
    handleCloseDrawer();
  }

  /* ---- Filtered data ---- */
  const filtered = useMemo(() => {
    return MOCK_SOLICITACOES.filter((sol) => {
      const matchesSearch =
        search === '' ||
        sol.numero.toLowerCase().includes(search.toLowerCase()) ||
        sol.paciente.nome.toLowerCase().includes(search.toLowerCase()) ||
        sol.paciente.cpf.includes(search) ||
        sol.paciente.municipioOrigem.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === 'TODOS' || sol.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  /* ---- Summary counters ---- */
  const counts = useMemo(() => {
    const all = MOCK_SOLICITACOES;
    return {
      total: all.length,
      emAndamento: all.filter((s) =>
        ['EM_ANALISE', 'AGUARDANDO_REGULACAO', 'AGUARDANDO_AGENDAMENTO', 'AGUARDANDO_EMISSAO', 'EMITIDA', 'EM_VIAGEM', 'EM_PERMANENCIA'].includes(s.status),
      ).length,
      exigencias: all.filter((s) => s.status === 'EXIGENCIA').length,
      concluidos: all.filter((s) => s.status === 'CONCLUIDO').length,
    };
  }, []);

  return (
    <>
      <PageHeader
        title="Solicitações"
        subtitle="Gerenciamento de solicitações TFD"
        actions={
          <button className="tfd-btn tfd-btn-primary" onClick={() => setDrawerOpen(true)}>
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
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--tfd-text-muted)' }}
            />
            <input
              type="text"
              className="tfd-input tfd-input--sm pl-9"
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
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--tfd-text-muted)' }}
            />
            <select
              className="tfd-input tfd-input--sm pl-8 pr-8 min-w-[180px] appearance-none cursor-pointer"
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
          {filtered.length} resultado{filtered.length !== 1 && 's'}
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
                <th className="w-[60px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
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
                paginated.map((sol) => (
                  <tr key={sol.id}>
                    <td>
                      <Link
                        href={`/solicitacoes/${sol.id}`}
                        className="font-medium hover:underline"
                        style={{ color: 'var(--tfd-primary-500)' }}
                      >
                        {sol.numero}
                      </Link>
                    </td>
                    <td className="max-w-[180px] truncate font-medium">
                      {sol.paciente.nome}
                    </td>
                    <td className="hidden md:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>
                      {formatCPF(sol.paciente.cpf)}
                    </td>
                    <td className="hidden lg:table-cell" style={{ color: 'var(--tfd-text-secondary)' }}>
                      {sol.paciente.municipioOrigem}
                    </td>
                    <td className="hidden lg:table-cell" style={{ color: 'var(--tfd-text-secondary)' }}>
                      {sol.diagnostico.cid}
                    </td>
                    <td>
                      <StatusTag status={sol.status} />
                    </td>
                    <td className="hidden md:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>
                      {formatDate(sol.dataCriacao)}
                    </td>
                    <td>
                      <Link
                        href={`/solicitacoes/${sol.id}`}
                        className="tfd-btn tfd-btn--text tfd-btn-primary tfd-btn--sm tfd-btn--icon-only"
                        title="Ver detalhes"
                      >
                        <Eye size={16} />
                      </Link>
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

      {/* ========== Nova Solicitação Drawer ========== */}
      <Drawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        title="Nova Solicitação"
        subtitle="Preencha os dados para criar uma nova solicitação TFD"
        width="520px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={handleCloseDrawer}>
              Cancelar
            </button>
            <button className="tfd-btn tfd-btn-primary" onClick={handleSubmitSolicitacao}>
              Criar Solicitação
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
            onChange={(e) => setCpf(e.target.value)}
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
              <option key={m.value} value={m.label}>{m.label}</option>
            ))}
          </select>
        </FormField>

        <hr className="tfd-divider" />

        {/* Section: Diagnóstico */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          Diagnóstico
        </h3>

        <FormField label="CID-10" required>
          <input
            type="text"
            className="tfd-input"
            placeholder="ex: G40.0"
            value={cid}
            onChange={(e) => setCid(e.target.value)}
          />
        </FormField>

        <FormField label="Descrição do diagnóstico" required>
          <textarea
            className="tfd-input"
            rows={3}
            value={descricaoDiagnostico}
            onChange={(e) => setDescricaoDiagnostico(e.target.value)}
          />
        </FormField>

        <FormField label="Especialidade">
          <select
            className="tfd-input"
            value={especialidade}
            onChange={(e) => setEspecialidade(e.target.value)}
            disabled={loadingEsp}
          >
            <option value="">{loadingEsp ? 'Carregando...' : 'Selecione...'}</option>
            {especialidades.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Procedimento solicitado" required>
          <input
            type="text"
            className="tfd-input"
            value={procedimento}
            onChange={(e) => setProcedimento(e.target.value)}
          />
        </FormField>

        <FormField label="Justificativa TFD" required>
          <textarea
            className="tfd-input"
            rows={3}
            placeholder="Por que o tratamento não pode ser realizado no MA?"
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
          />
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
                onChange={(e) => setCpfAcompanhante(e.target.value)}
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
      </Drawer>
    </>
  );
}
