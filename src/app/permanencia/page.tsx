'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  CalendarClock,
  Search,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Eye,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  User,
  Plus,
  Info,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import { MOCK_PERMANENCIAS, type StatusPermanencia } from '@/core/mocks/permanencia.mock';
import { useLookup } from '@/shared/hooks/useLookup';

/* -------------------------------------------------- */
/*  Tab config                                         */
/* -------------------------------------------------- */

type TabKey = 'TODAS' | StatusPermanencia;

const TABS: { key: TabKey; label: string }[] = [
  { key: 'TODAS', label: 'Todas' },
  { key: 'ATIVA', label: 'Ativas' },
  { key: 'PRORROGADA', label: 'Prorrogadas' },
  { key: 'ALTA_PENDENTE', label: 'Alta Pendente' },
  { key: 'CONCLUIDA', label: 'Concluídas' },
];

/* -------------------------------------------------- */
/*  Status styling                                     */
/* -------------------------------------------------- */

const statusStyleMap: Record<StatusPermanencia, { bg: string; text: string; label: string }> = {
  ATIVA: { bg: '#DBEAFE', text: '#1D4ED8', label: 'Ativa' },
  PRORROGADA: { bg: '#FFEDD5', text: '#C2410C', label: 'Prorrogada' },
  ALTA_PENDENTE: { bg: '#FEF3C7', text: '#92400E', label: 'Alta Pendente' },
  CONCLUIDA: { bg: '#DCFCE7', text: '#15803D', label: 'Concluída' },
};

/* -------------------------------------------------- */
/*  Helper                                             */
/* -------------------------------------------------- */

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function PermanenciaPage() {
  const { options: motivoPermOptions, loading: motivoPermLoading } = useLookup('motivo_permanencia');

  const [activeTab, setActiveTab] = useState<TabKey>('TODAS');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [solicitarProrrogacao, setSolicitarProrrogacao] = useState(false);

  /* ---- Filtered data ---- */
  const filtered = useMemo(() => {
    return MOCK_PERMANENCIAS.filter((p) => {
      const matchesTab = activeTab === 'TODAS' || p.statusDisplay === activeTab;
      const matchesSearch =
        search === '' ||
        p.pacienteNome.toLowerCase().includes(search.toLowerCase()) ||
        p.numeroSolicitacao.toLowerCase().includes(search.toLowerCase()) ||
        p.destino.toLowerCase().includes(search.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [activeTab, search]);

  /* ---- Summary counters ---- */
  const counts = useMemo(() => {
    const all = MOCK_PERMANENCIAS;
    return {
      ativas: all.filter((p) => p.statusDisplay === 'ATIVA').length,
      prorrogadas: all.filter((p) => p.statusDisplay === 'PRORROGADA').length,
      altaPendente: all.filter((p) => p.statusDisplay === 'ALTA_PENDENTE').length,
      concluidas: all.filter((p) => p.statusDisplay === 'CONCLUIDA').length,
    };
  }, []);

  return (
    <>
      <PageHeader
        title="Permanência e Prorrogações"
        subtitle="Controle de permanência, prorrogações e alta de pacientes"
        actions={
          <button className="tfd-btn tfd-btn-primary" onClick={() => setDrawerOpen(true)}>
            <Plus size={16} />
            Registrar Permanência
          </button>
        }
      />

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
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Ativas</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{counts.ativas}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#FFEDD5', color: '#EA580C' }}
          >
            <RefreshCw size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Prorrogadas</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{counts.prorrogadas}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#FEF3C7', color: '#F59E0B' }}
          >
            <AlertTriangle size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Alta Pendente</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-status-warning)' }}>{counts.altaPendente}</p>
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
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Concluídas</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-status-success)' }}>{counts.concluidas}</p>
          </div>
        </div>
      </div>

      {/* ========== Tabs + Search ========== */}
      <div className="tfd-toolbar mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-1 flex-wrap">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = tab.key === 'TODAS'
              ? MOCK_PERMANENCIAS.length
              : MOCK_PERMANENCIAS.filter((p) => p.statusDisplay === tab.key).length;
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
            placeholder="Buscar paciente ou destino..."
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
              <CalendarClock size={32} style={{ color: 'var(--tfd-text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                Nenhuma permanência encontrada
              </p>
            </div>
          </div>
        ) : (
          filtered.map((perm) => {
            const { bg, text, label } = statusStyleMap[perm.statusDisplay];
            const isExpanded = expandedId === perm.id;

            return (
              <div key={perm.id} className="tfd-card">
                {/* ---- Header row ---- */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Link
                        href={`/solicitacoes/${perm.solicitacaoId}`}
                        className="font-medium text-sm hover:underline"
                        style={{ color: 'var(--tfd-primary-500)' }}
                      >
                        {perm.numeroSolicitacao}
                      </Link>
                      <span
                        className="tfd-tag tfd-tag--rounded tfd-tag--dot"
                        style={{ backgroundColor: bg, color: text }}
                      >
                        {label}
                      </span>
                      {perm.totalProrrogacoes > 0 && (
                        <span
                          className="tfd-tag tfd-tag--rounded"
                          style={{ backgroundColor: '#FFEDD5', color: '#C2410C' }}
                        >
                          <RefreshCw size={10} />
                          {perm.totalProrrogacoes} prorrog.
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-base" style={{ color: 'var(--tfd-text-primary)' }}>
                      {perm.pacienteNome}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/solicitacoes/${perm.solicitacaoId}`}
                      className="tfd-btn tfd-btn--text tfd-btn-primary tfd-btn--sm tfd-btn--icon-only"
                      title="Ver processo completo"
                    >
                      <Eye size={16} />
                    </Link>
                    <button
                      className="tfd-btn tfd-btn--text tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only"
                      title={isExpanded ? 'Recolher' : 'Expandir'}
                      onClick={() => setExpandedId(isExpanded ? null : perm.id)}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* ---- Info row ---- */}
                <div className="flex items-center gap-4 mt-3 flex-wrap text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
                  <div className="flex items-center gap-1.5">
                    <MapPin size={14} />
                    <span className="truncate max-w-[240px]">{perm.destino}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={14} />
                    <span>
                      {formatDate(perm.dataInicio)} — {formatDate(perm.dataFimPrevista)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock size={14} />
                    <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                      {perm.totalDias} dias
                    </span>
                  </div>
                </div>

                {/* ---- Observations ---- */}
                {perm.observacoes && (
                  <p className="mt-2 text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                    {perm.observacoes}
                  </p>
                )}

                {/* ---- Expanded: Prorrogacoes ---- */}
                {isExpanded && perm.prorrogacoes.length > 0 && (
                  <div
                    className="mt-4 pt-4"
                    style={{ borderTop: '1px solid var(--tfd-surface-border)' }}
                  >
                    <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
                      Histórico de Prorrogações
                    </h4>
                    <div className="space-y-3">
                      {perm.prorrogacoes.map((pror, idx) => (
                        <div
                          key={pror.id}
                          className="flex items-start gap-3 p-3 rounded-lg"
                          style={{ backgroundColor: 'var(--tfd-surface-50)' }}
                        >
                          <div
                            className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 text-xs font-bold"
                            style={{
                              backgroundColor: '#FFEDD5',
                              color: '#C2410C',
                            }}
                          >
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                                {formatDate(pror.dataInicio)} — {formatDate(pror.dataFim)}
                              </span>
                              {pror.aprovadoPor && (
                                <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--tfd-status-success)' }}>
                                  <CheckCircle2 size={12} />
                                  Aprovada
                                </span>
                              )}
                            </div>
                            <p className="text-sm mt-0.5" style={{ color: 'var(--tfd-text-secondary)' }}>
                              {pror.justificativa}
                            </p>
                            {pror.aprovadoPor && (
                              <p className="flex items-center gap-1 text-xs mt-1" style={{ color: 'var(--tfd-text-muted)' }}>
                                <User size={11} />
                                Aprovado por {pror.aprovadoPor} em {formatDate(pror.dataAprovacao!)}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {isExpanded && perm.prorrogacoes.length === 0 && (
                  <div
                    className="mt-4 pt-4 text-center py-6"
                    style={{ borderTop: '1px solid var(--tfd-surface-border)' }}
                  >
                    <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                      Nenhuma prorrogação registrada
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ========== Registrar Permanência Drawer ========== */}
      <Drawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setMotivo('');
          setSolicitarProrrogacao(false);
        }}
        title="Registrar Permanência"
        width="480px"
        footer={
          <>
            <button
              className="tfd-btn tfd-btn-secondary"
              onClick={() => {
                setDrawerOpen(false);
                setMotivo('');
                setSolicitarProrrogacao(false);
              }}
            >
              Cancelar
            </button>
            <button
              className="tfd-btn tfd-btn-primary"
              onClick={() => {
                alert('Permanência registrada com sucesso!');
                setDrawerOpen(false);
                setMotivo('');
                setSolicitarProrrogacao(false);
              }}
            >
              Registrar
            </button>
          </>
        }
      >
        {/* ---- Processo ---- */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          Processo
        </h3>

        <FormField label="Nº da Solicitação" required>
          <input
            type="text"
            className="tfd-input"
            placeholder="TFD-2026-..."
          />
        </FormField>

        <hr className="tfd-divider" />

        {/* ---- Comunicação de Permanência ---- */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          Comunicação de Permanência
        </h3>

        <FormField label="Data da comunicação" required>
          <input
            type="date"
            className="tfd-input"
            defaultValue={new Date().toISOString().split('T')[0]}
          />
        </FormField>

        <FormField label="Comunicado por" required>
          <select className="tfd-input">
            <option value="">Selecione...</option>
            <option value="PACIENTE">Paciente</option>
            <option value="RESPONSAVEL">Responsável</option>
            <option value="UNIDADE_DESTINO">Unidade de Destino</option>
            <option value="REGIONAL">Regional</option>
          </select>
        </FormField>

        <FormField label="Motivo" required>
          <select
            className="tfd-input"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            disabled={motivoPermLoading}
          >
            <option value="">{motivoPermLoading ? 'Carregando...' : 'Selecione...'}</option>
            {motivoPermOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FormField>

        {motivo === 'OUTROS' && (
          <FormField label="Descrição do motivo" required>
            <textarea
              className="tfd-input"
              rows={3}
              placeholder="Descreva o motivo da permanência..."
            />
          </FormField>
        )}

        <FormField label="Nova data de retorno prevista" required>
          <input type="date" className="tfd-input" />
        </FormField>

        <hr className="tfd-divider" />

        {/* ---- Prorrogação ---- */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          Prorrogação
        </h3>

        <label className="flex items-center gap-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={solicitarProrrogacao}
            onChange={(e) => setSolicitarProrrogacao(e.target.checked)}
          />
          <span className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>
            Solicitar prorrogação?
          </span>
        </label>

        {solicitarProrrogacao && (
          <>
            <FormField label="Dias adicionais" required>
              <input
                type="number"
                className="tfd-input"
                min={1}
                placeholder="Ex: 5"
              />
            </FormField>

            <FormField label="Justificativa médica" required>
              <textarea
                className="tfd-input"
                rows={3}
                placeholder="Justificativa médica para a prorrogação..."
              />
            </FormField>

            <FormField label="Documento justificativa" required>
              <input type="file" className="tfd-input" />
            </FormField>

            <div className="tfd-message tfd-message--info">
              <span className="tfd-message-icon mt-0.5 shrink-0">
                <Info size={14} />
              </span>
              <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
                A prorrogação será encaminhada para a Regulação para aprovação. Processos de prorrogação não passam por parecer médico.
              </p>
            </div>
          </>
        )}
      </Drawer>
    </>
  );
}
