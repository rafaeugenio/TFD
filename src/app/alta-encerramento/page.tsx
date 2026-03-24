'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  ArrowRightLeft,
  UserX,
  UserMinus,
  Skull,
  Archive,
  Plane,
  Wallet,
  FileText,
  Puzzle,
  Calendar,
  Stethoscope,
  Plus,
  Info,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import {
  MOCK_ENCERRAMENTOS,
  type MotivoEncerramento,
  type StatusEncerramento,
  type EncerramentoItem,
} from '@/core/mocks/encerramento.mock';
import { useLookup } from '@/shared/hooks/useLookup';

/* -------------------------------------------------- */
/*  Tab config                                         */
/* -------------------------------------------------- */

type TabKey = 'TODOS' | 'PENDENTE' | 'ALTA_MEDICA' | 'CONCLUIDO';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'TODOS', label: 'Todos' },
  { key: 'PENDENTE', label: 'Pendentes' },
  { key: 'ALTA_MEDICA', label: 'Alta Médica' },
  { key: 'CONCLUIDO', label: 'Encerrados' },
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
  const [year, month, day] = iso.split('-');
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
  const { options: motivoEncOptions, loading: motivoEncLoading } = useLookup('motivo_encerramento');

  const [activeTab, setActiveTab] = useState<TabKey>('TODOS');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* ---- Drawer state ---- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [numSolicitacao, setNumSolicitacao] = useState('');
  const [motivo, setMotivo] = useState('');
  const [dataAlta, setDataAlta] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [relatorioAlta, setRelatorioAlta] = useState<File | null>(null);
  const [certidaoObito, setCertidaoObito] = useState<File | null>(null);
  const [localObito, setLocalObito] = useState('');

  const resetDrawerForm = () => {
    setNumSolicitacao('');
    setMotivo('');
    setDataAlta('');
    setObservacoes('');
    setRelatorioAlta(null);
    setCertidaoObito(null);
    setLocalObito('');
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    resetDrawerForm();
  };

  const handleSubmitEncerramento = () => {
    alert('Encerramento registrado com sucesso!');
    handleCloseDrawer();
  };

  /* ---- Filtered data ---- */
  const filtered = useMemo(() => {
    return MOCK_ENCERRAMENTOS.filter((e) => {
      let matchesTab = false;
      switch (activeTab) {
        case 'TODOS':
          matchesTab = true;
          break;
        case 'PENDENTE':
          matchesTab = e.status === 'PENDENTE';
          break;
        case 'ALTA_MEDICA':
          matchesTab = e.motivo === 'ALTA_MEDICA';
          break;
        case 'CONCLUIDO':
          matchesTab = e.status === 'CONCLUIDO';
          break;
      }
      const matchesSearch =
        search === '' ||
        e.pacienteNome.toLowerCase().includes(search.toLowerCase()) ||
        e.numeroProcesso.toLowerCase().includes(search.toLowerCase()) ||
        e.cidCodigo.toLowerCase().includes(search.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [activeTab, search]);

  /* ---- Summary counters ---- */
  const counts = useMemo(() => {
    const all = MOCK_ENCERRAMENTOS;
    return {
      altaMedica: all.filter((e) => e.motivo === 'ALTA_MEDICA').length,
      transferencia: all.filter((e) => e.motivo === 'TRANSFERENCIA').length,
      desistencia: all.filter((e) => e.motivo === 'DESISTENCIA').length,
      abandono: all.filter((e) => e.motivo === 'ABANDONO').length,
      obito: all.filter((e) => e.motivo === 'OBITO').length,
    };
  }, []);

  /* ---- Tab counts ---- */
  const tabCounts = useMemo(() => {
    const all = MOCK_ENCERRAMENTOS;
    return {
      TODOS: all.length,
      PENDENTE: all.filter((e) => e.status === 'PENDENTE').length,
      ALTA_MEDICA: all.filter((e) => e.motivo === 'ALTA_MEDICA').length,
      CONCLUIDO: all.filter((e) => e.status === 'CONCLUIDO').length,
    };
  }, []);

  return (
    <>
      <PageHeader
        title="Alta e Encerramento"
        subtitle="Gestão de altas, encerramentos e conciliação de processos TFD"
        actions={
          <button className="tfd-btn tfd-btn-primary" onClick={() => setDrawerOpen(true)}>
            <Plus size={16} />
            Registrar Alta
          </button>
        }
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
          </div>
        </div>
      </div>

      {/* ========== Tabs + Search ========== */}
      <div className="tfd-toolbar mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-1 flex-wrap">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = tabCounts[tab.key];
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
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--tfd-text-muted)' }}
          />
          <input
            type="text"
            className="tfd-input tfd-input--sm pl-9"
            placeholder="Buscar paciente, processo ou CID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ========== Card List ========== */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="tfd-card">
            <div className="flex flex-col items-center gap-2 py-12">
              <Archive size={32} style={{ color: 'var(--tfd-text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                Nenhum encerramento encontrado
              </p>
            </div>
          </div>
        ) : (
          filtered.map((enc) => {
            const motivo = motivoStyleMap[enc.motivo];
            const status = statusStyleMap[enc.status];
            const isExpanded = expandedId === enc.id;
            const retornoNA = enc.motivo === 'OBITO' || enc.motivo === 'TRANSFERENCIA';
            const c = enc.conciliacao;
            const archivable = canArchive(enc);

            return (
              <div key={enc.id} className="tfd-card">
                {/* ---- Header row ---- */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Link
                        href={`/solicitacoes/${enc.solicitacaoId}`}
                        className="font-medium text-sm hover:underline"
                        style={{ color: 'var(--tfd-primary-500)' }}
                      >
                        {enc.numeroProcesso}
                      </Link>
                      <span
                        className="tfd-tag tfd-tag--rounded tfd-tag--dot"
                        style={{ backgroundColor: motivo.bg, color: motivo.text }}
                      >
                        {motivo.label}
                      </span>
                      <span
                        className="tfd-tag tfd-tag--rounded tfd-tag--dot"
                        style={{ backgroundColor: status.bg, color: status.text }}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p className="font-semibold text-base" style={{ color: 'var(--tfd-text-primary)' }}>
                      {enc.pacienteNome}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/solicitacoes/${enc.solicitacaoId}`}
                      className="tfd-btn tfd-btn--text tfd-btn-primary tfd-btn--sm tfd-btn--icon-only"
                      title="Ver processo completo"
                    >
                      <Eye size={16} />
                    </Link>
                    <button
                      className="tfd-btn tfd-btn--text tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only"
                      title={isExpanded ? 'Recolher' : 'Expandir'}
                      onClick={() => setExpandedId(isExpanded ? null : enc.id)}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* ---- Info row ---- */}
                <div className="flex items-center gap-4 mt-3 flex-wrap text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
                  <div className="flex items-center gap-1.5">
                    <Stethoscope size={14} />
                    <span>{enc.cidCodigo} — {enc.cidDescricao}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    <span>{formatDate(enc.dataAlta)}</span>
                  </div>
                </div>

                {/* ---- Quick status indicators ---- */}
                <div className="flex items-center gap-4 mt-3 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>
                    <Plane size={12} />
                    <span>Retorno:</span>
                    {enc.passagemRetorno === 'EMITIDA' && (
                      <CheckCircle2 size={14} style={{ color: '#16A34A' }} />
                    )}
                    {enc.passagemRetorno === 'PENDENTE' && (
                      <AlertTriangle size={14} style={{ color: '#F59E0B' }} />
                    )}
                    {enc.passagemRetorno === 'NAO_APLICAVEL' && (
                      <span style={{ color: 'var(--tfd-text-muted)' }}>N/A</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>
                    <Wallet size={12} />
                    <span>Diárias:</span>
                    {enc.diarias === 'CONCILIADA' ? (
                      <CheckCircle2 size={14} style={{ color: '#16A34A' }} />
                    ) : (
                      <AlertTriangle size={14} style={{ color: '#F59E0B' }} />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>
                    <FileText size={12} />
                    <span>Docs:</span>
                    {enc.documentosAlta === 'ANEXADO' ? (
                      <CheckCircle2 size={14} style={{ color: '#16A34A' }} />
                    ) : (
                      <AlertTriangle size={14} style={{ color: '#F59E0B' }} />
                    )}
                  </div>
                </div>

                {/* ---- Observations ---- */}
                {enc.observacoes && !isExpanded && (
                  <p className="mt-2 text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                    {enc.observacoes}
                  </p>
                )}

                {/* ---- Expanded: Conciliação ---- */}
                {isExpanded && (
                  <div
                    className="mt-4 pt-4"
                    style={{ borderTop: '1px solid var(--tfd-surface-border)' }}
                  >
                    {/* Óbito warning */}
                    {enc.motivo === 'OBITO' && (
                      <div className="tfd-message tfd-message--danger mb-4">
                        <span className="tfd-message-icon mt-0.5 shrink-0">
                          <Skull size={16} />
                        </span>
                        <div className="flex-1">
                          <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                            Fluxo especial ativado
                          </p>
                          <p className="text-sm mt-0.5" style={{ color: 'var(--tfd-text-secondary)' }}>
                            Diárias do paciente encerradas, passagem de retorno cancelada, retorno do acompanhante verificado, município notificado.
                          </p>
                        </div>
                      </div>
                    )}

                    <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
                      Checklist de Conciliação
                    </h4>

                    <div className="space-y-2.5">
                      {/* Passagem de ida */}
                      <div
                        className="flex items-center gap-3 p-3 rounded-lg"
                        style={{ backgroundColor: 'var(--tfd-surface-50)' }}
                      >
                        <Plane size={16} style={{ color: 'var(--tfd-text-muted)' }} />
                        <span className="text-sm flex-1" style={{ color: 'var(--tfd-text-primary)' }}>
                          Passagem de ida
                        </span>
                        {c.passagemIda && c.embarqueConfirmado ? (
                          <span className="flex items-center gap-1.5 text-sm" style={{ color: '#16A34A' }}>
                            <CheckCircle2 size={14} />
                            Emitida + embarque confirmado
                          </span>
                        ) : c.passagemIda ? (
                          <span className="flex items-center gap-1.5 text-sm" style={{ color: '#F59E0B' }}>
                            <AlertTriangle size={14} />
                            Emitida — embarque pendente
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-sm" style={{ color: '#B91C1C' }}>
                            <XCircle size={14} />
                            Não emitida
                          </span>
                        )}
                      </div>

                      {/* Passagem de retorno */}
                      <div
                        className="flex items-center gap-3 p-3 rounded-lg"
                        style={{ backgroundColor: 'var(--tfd-surface-50)' }}
                      >
                        <Plane size={16} style={{ color: 'var(--tfd-text-muted)' }} />
                        <span className="text-sm flex-1" style={{ color: 'var(--tfd-text-primary)' }}>
                          Passagem de retorno
                        </span>
                        {retornoNA ? (
                          <span className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                            N/A
                          </span>
                        ) : c.passagemRetornoEmitida ? (
                          <span className="flex items-center gap-1.5 text-sm" style={{ color: '#16A34A' }}>
                            <CheckCircle2 size={14} />
                            Emitida
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-sm" style={{ color: '#F59E0B' }}>
                            <AlertTriangle size={14} />
                            Pendente
                          </span>
                        )}
                      </div>

                      {/* Diárias */}
                      <div
                        className="flex items-center gap-3 p-3 rounded-lg"
                        style={{ backgroundColor: 'var(--tfd-surface-50)' }}
                      >
                        <Wallet size={16} style={{ color: 'var(--tfd-text-muted)' }} />
                        <span className="text-sm flex-1" style={{ color: 'var(--tfd-text-primary)' }}>
                          Diárias
                        </span>
                        {c.diariasPagas && c.diariasPendentes === 0 ? (
                          <span className="flex items-center gap-1.5 text-sm" style={{ color: '#16A34A' }}>
                            <CheckCircle2 size={14} />
                            Todas pagas
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-sm" style={{ color: '#F59E0B' }}>
                            <AlertTriangle size={14} />
                            {c.diariasPendentes} pendente{c.diariasPendentes !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {/* Complementos de permanência */}
                      <div
                        className="flex items-center gap-3 p-3 rounded-lg"
                        style={{ backgroundColor: 'var(--tfd-surface-50)' }}
                      >
                        <Puzzle size={16} style={{ color: 'var(--tfd-text-muted)' }} />
                        <span className="text-sm flex-1" style={{ color: 'var(--tfd-text-primary)' }}>
                          Complementos de permanência
                        </span>
                        {c.complementosConciliados && c.complementosPendentes === 0 ? (
                          <span className="flex items-center gap-1.5 text-sm" style={{ color: '#16A34A' }}>
                            <CheckCircle2 size={14} />
                            Conciliados
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-sm" style={{ color: '#F59E0B' }}>
                            <AlertTriangle size={14} />
                            {c.complementosPendentes} pendente{c.complementosPendentes !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>

                      {/* Documentos de alta */}
                      <div
                        className="flex items-center gap-3 p-3 rounded-lg"
                        style={{ backgroundColor: 'var(--tfd-surface-50)' }}
                      >
                        <FileText size={16} style={{ color: 'var(--tfd-text-muted)' }} />
                        <span className="text-sm flex-1" style={{ color: 'var(--tfd-text-primary)' }}>
                          Documentos de alta
                        </span>
                        {c.documentosAnexados ? (
                          <span className="flex items-center gap-1.5 text-sm" style={{ color: '#16A34A' }}>
                            <CheckCircle2 size={14} />
                            Anexados
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-sm" style={{ color: '#F59E0B' }}>
                            <AlertTriangle size={14} />
                            Pendente
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Observations */}
                    {enc.observacoes && (
                      <p className="mt-3 text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                        {enc.observacoes}
                      </p>
                    )}

                    {/* Confirmar e Arquivar button */}
                    <div className="mt-4 flex justify-end">
                      <button
                        className="tfd-btn tfd-btn-primary tfd-btn--sm"
                        disabled={!archivable}
                        style={{
                          opacity: archivable ? 1 : 0.5,
                          cursor: archivable ? 'pointer' : 'not-allowed',
                        }}
                      >
                        <Archive size={16} />
                        Confirmar e Arquivar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ========== Registrar Alta Drawer ========== */}
      <Drawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        title="Registrar Alta"
        subtitle="Registrar alta ou encerramento de processo TFD"
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
              Confirmar Encerramento
            </button>
          </>
        }
      >
        {/* Section: Processo */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Processo</h3>
        <FormField label="Nº da Solicitação" required>
          <input
            type="text"
            className="tfd-input"
            placeholder="TFD-2026-..."
            value={numSolicitacao}
            onChange={(e) => setNumSolicitacao(e.target.value)}
          />
        </FormField>

        <hr className="tfd-divider" />

        {/* Section: Encerramento */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Encerramento</h3>
        <FormField label="Motivo do encerramento" required>
          <select
            className="tfd-input"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            disabled={motivoEncLoading}
          >
            <option value="">{motivoEncLoading ? 'Carregando...' : 'Selecione...'}</option>
            {motivoEncOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FormField>
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

        {/* Section: Documentos (conditional — Alta Médica) */}
        {motivo === 'ALTA_MEDICA' && (
          <>
            <hr className="tfd-divider" />
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Documentos</h3>
            <FormField label="Relatório de alta" required>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="tfd-input pt-1.5"
                onChange={(e) => setRelatorioAlta(e.target.files?.[0] ?? null)}
              />
            </FormField>
            <div className="tfd-message tfd-message--info">
              <span className="tfd-message-icon mt-0.5 shrink-0">
                <Info size={16} />
              </span>
              <p className="text-sm flex-1" style={{ color: 'var(--tfd-text-secondary)' }}>
                O relatório de alta da unidade de destino é obrigatório para emissão da passagem de retorno.
              </p>
            </div>
          </>
        )}

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
            <FormField label="Certidão de óbito" required>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="tfd-input pt-1.5"
                onChange={(e) => setCertidaoObito(e.target.files?.[0] ?? null)}
              />
            </FormField>
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
      </Drawer>
    </>
  );
}
