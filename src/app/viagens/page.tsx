'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Plane,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  ArrowRight,
  Ticket,
  Eye,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import {
  MOCK_VIAGENS,
  VIAGEM_PACIENTE_MAP,
  VIAGEM_NUMERO_MAP,
} from '@/core/mocks/viagens.mock';
import type { SituacaoViagem } from '@/core/models';
import { formatCurrency } from '@/shared/pipes/formatters';
import { useLookup, useCompanhias } from '@/shared/hooks/useLookup';

/* -------------------------------------------------- */
/*  Tab config                                         */
/* -------------------------------------------------- */

type TabKey = 'TODAS' | 'AGUARDANDO_EMISSAO' | 'EMITIDA' | 'UTILIZADA' | 'NO_SHOW' | 'REMARCADA' | 'CANCELADA';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'TODAS', label: 'Todas' },
  { key: 'AGUARDANDO_EMISSAO', label: 'Pendentes' },
  { key: 'EMITIDA', label: 'Emitidas' },
  { key: 'UTILIZADA', label: 'Utilizadas' },
  { key: 'NO_SHOW', label: 'NO-SHOW' },
  { key: 'REMARCADA', label: 'Remarcadas' },
  { key: 'CANCELADA', label: 'Canceladas' },
];

/* -------------------------------------------------- */
/*  Status styling                                     */
/* -------------------------------------------------- */

interface SituacaoStyle {
  bg: string;
  text: string;
  label: string;
}

const situacaoMap: Record<SituacaoViagem, SituacaoStyle> = {
  AGUARDANDO_EMISSAO: { bg: '#FEF3C7', text: '#92400E', label: 'Pendente' },
  EMITIDA: { bg: '#DBEAFE', text: '#1D4ED8', label: 'Emitida' },
  REMARCADA: { bg: '#E0E7FF', text: '#4338CA', label: 'Remarcada' },
  CANCELADA: { bg: 'var(--tfd-surface-100)', text: 'var(--tfd-surface-500)', label: 'Cancelada' },
  NO_SHOW: { bg: '#FEE2E2', text: '#B91C1C', label: 'NO-SHOW' },
  UTILIZADA: { bg: '#DCFCE7', text: '#15803D', label: 'Utilizada' },
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

export default function ViagensPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('TODAS');
  const [search, setSearch] = useState('');

  /* ---- Drawer state ---- */
  const [drawerOpen, setDrawerOpen] = useState(false);

  /* ---- Form state ---- */
  const [numSolicitacao, setNumSolicitacao] = useState('');
  const [tipoPassagem, setTipoPassagem] = useState('');
  const [origem, setOrigem] = useState('');
  const [destino, setDestino] = useState('');
  const [dataEmbarque, setDataEmbarque] = useState('');
  const [modalTransporte, setModalTransporte] = useState('');
  const [companhia, setCompanhia] = useState('');
  const [localizador, setLocalizador] = useState('');
  const [valorPassagem, setValorPassagem] = useState('');
  const [medifNecessario, setMedifNecessario] = useState(false);
  const [observacoes, setObservacoes] = useState('');

  /* ---- Lookup hooks ---- */
  const { options: modais, loading: loadingModais } = useLookup('modal_transporte');
  const { options: companhias, loading: loadingComp } = useCompanhias();

  function resetFormViagem() {
    setNumSolicitacao('');
    setTipoPassagem('');
    setOrigem('');
    setDestino('');
    setDataEmbarque('');
    setModalTransporte('');
    setCompanhia('');
    setLocalizador('');
    setValorPassagem('');
    setMedifNecessario(false);
    setObservacoes('');
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
    resetFormViagem();
  }

  function handleSubmitPassagem() {
    alert('Passagem emitida com sucesso!');
    handleCloseDrawer();
  }

  /* ---- Filtered data ---- */
  const filtered = useMemo(() => {
    return MOCK_VIAGENS.filter((v) => {
      const matchesTab = activeTab === 'TODAS' || v.situacao === activeTab;
      const pacNome = VIAGEM_PACIENTE_MAP[v.solicitacaoId] ?? '';
      const numero = VIAGEM_NUMERO_MAP[v.solicitacaoId] ?? '';
      const matchesSearch =
        search === '' ||
        pacNome.toLowerCase().includes(search.toLowerCase()) ||
        numero.toLowerCase().includes(search.toLowerCase()) ||
        (v.localizador ?? '').toLowerCase().includes(search.toLowerCase()) ||
        v.origem.toLowerCase().includes(search.toLowerCase()) ||
        v.destino.toLowerCase().includes(search.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [activeTab, search]);

  /* ---- Summary counters ---- */
  const counts = useMemo(() => {
    const all = MOCK_VIAGENS;
    return {
      pendentes: all.filter((v) => v.situacao === 'AGUARDANDO_EMISSAO').length,
      emitidas: all.filter((v) => v.situacao === 'EMITIDA').length,
      confirmadas: all.filter((v) => v.situacao === 'UTILIZADA').length,
      noshow: all.filter((v) => v.situacao === 'NO_SHOW').length,
      valorTotal: all
        .filter((v) => v.valorPassagem != null)
        .reduce((sum, v) => sum + (v.valorPassagem ?? 0), 0),
    };
  }, []);

  return (
    <>
      <PageHeader
        title="Viagens e Passagens"
        subtitle="Emissão, controle de embarque e rastreio de passagens"
        actions={
          <button className="tfd-btn tfd-btn-primary" onClick={() => setDrawerOpen(true)}>
            <Ticket size={16} />
            Emitir Passagem
          </button>
        }
      />

      {/* ========== Summary Cards ========== */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#FEF3C7', color: '#F59E0B' }}
          >
            <Clock size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Pend. Emissão</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{counts.pendentes}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#DBEAFE', color: '#3B82F6' }}
          >
            <Plane size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Emitidas</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{counts.emitidas}</p>
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
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Confirmadas</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{counts.confirmadas}</p>
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
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>NO-SHOW</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-status-danger)' }}>{counts.noshow}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3 col-span-2 xl:col-span-1">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}
          >
            <Ticket size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Valor Total</p>
            <p className="text-lg font-semibold" style={{ color: 'var(--tfd-primary-700)' }}>
              {formatCurrency(counts.valorTotal)}
            </p>
          </div>
        </div>
      </div>

      {/* ========== Tabs + Search ========== */}
      <div className="tfd-toolbar mb-4 flex-wrap gap-3">
        {/* Tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = tab.key === 'TODAS'
              ? MOCK_VIAGENS.length
              : MOCK_VIAGENS.filter((v) => v.situacao === tab.key).length;
            return (
              <button
                key={tab.key}
                onClick={() => { setActiveTab(tab.key); }}
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

        {/* Search */}
        <div className="relative flex-1 max-w-xs min-w-[200px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--tfd-text-muted)' }}
          />
          <input
            type="text"
            className="tfd-input tfd-input--sm pl-9"
            placeholder="Buscar paciente, localizador..."
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
                <th>Solicitação</th>
                <th>Paciente</th>
                <th>Tipo</th>
                <th>Rota</th>
                <th className="hidden md:table-cell">Data Prevista</th>
                <th className="hidden lg:table-cell">Companhia</th>
                <th className="hidden lg:table-cell">Localizador</th>
                <th className="hidden md:table-cell">Valor</th>
                <th>Situação</th>
                <th className="w-[60px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <XCircle size={32} style={{ color: 'var(--tfd-text-muted)' }} />
                      <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                        Nenhuma viagem encontrada
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((viagem) => {
                  const { bg, text, label } = situacaoMap[viagem.situacao];
                  return (
                    <tr key={viagem.id}>
                      <td>
                        <Link
                          href={`/solicitacoes/${viagem.solicitacaoId}`}
                          className="font-medium text-sm hover:underline"
                          style={{ color: 'var(--tfd-primary-500)' }}
                        >
                          {VIAGEM_NUMERO_MAP[viagem.solicitacaoId] ?? '—'}
                        </Link>
                      </td>
                      <td className="max-w-[160px] truncate font-medium">
                        {VIAGEM_PACIENTE_MAP[viagem.solicitacaoId] ?? '—'}
                      </td>
                      <td>
                        <span
                          className="tfd-tag tfd-tag--rounded"
                          style={{
                            backgroundColor: viagem.tipo === 'IDA' ? '#DBEAFE' : '#F5F3FF',
                            color: viagem.tipo === 'IDA' ? '#1D4ED8' : '#7C3AED',
                          }}
                        >
                          {viagem.tipo === 'IDA' ? 'Ida' : 'Volta'}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 text-sm whitespace-nowrap">
                          <span style={{ color: 'var(--tfd-text-secondary)' }}>
                            {viagem.origem.split(' - ')[0]}
                          </span>
                          <ArrowRight size={12} style={{ color: 'var(--tfd-text-muted)' }} />
                          <span style={{ color: 'var(--tfd-text-primary)' }} className="font-medium">
                            {viagem.destino.split(' - ')[0]}
                          </span>
                        </div>
                      </td>
                      <td className="hidden md:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>
                        {formatDate(viagem.dataEmbarquePrevista)}
                      </td>
                      <td className="hidden lg:table-cell" style={{ color: 'var(--tfd-text-secondary)' }}>
                        {viagem.companhiaTransporte ?? '—'}
                      </td>
                      <td className="hidden lg:table-cell">
                        {viagem.localizador ? (
                          <code
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: 'var(--tfd-surface-100)',
                              color: 'var(--tfd-text-primary)',
                              fontFamily: 'var(--tfd-font-mono)',
                            }}
                          >
                            {viagem.localizador}
                          </code>
                        ) : (
                          <span style={{ color: 'var(--tfd-text-muted)' }}>—</span>
                        )}
                      </td>
                      <td className="hidden md:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>
                        {viagem.valorPassagem != null
                          ? formatCurrency(viagem.valorPassagem)
                          : '—'}
                      </td>
                      <td>
                        <span
                          className="tfd-tag tfd-tag--rounded tfd-tag--dot"
                          style={{ backgroundColor: bg, color: text }}
                        >
                          {label}
                        </span>
                      </td>
                      <td>
                        <Link
                          href={`/solicitacoes/${viagem.solicitacaoId}`}
                          className="tfd-btn tfd-btn--text tfd-btn-primary tfd-btn--sm tfd-btn--icon-only"
                          title="Ver processo completo"
                        >
                          <Eye size={16} />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========== Emitir Passagem Drawer ========== */}
      <Drawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        title="Emitir Passagem"
        subtitle="Preencha os dados para emissão de passagem"
        width="520px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={handleCloseDrawer}>
              Cancelar
            </button>
            <button className="tfd-btn tfd-btn-primary" onClick={handleSubmitPassagem}>
              Emitir Passagem
            </button>
          </>
        }
      >
        {/* Section: Processo */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          Processo
        </h3>

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

        {/* Section: Dados da Passagem */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          Dados da Passagem
        </h3>

        <FormField label="Tipo" required>
          <select
            className="tfd-input"
            value={tipoPassagem}
            onChange={(e) => setTipoPassagem(e.target.value)}
          >
            <option value="">Selecione...</option>
            <option value="Ida">Ida</option>
            <option value="Retorno">Retorno</option>
          </select>
        </FormField>

        <FormField label="Origem" required>
          <input
            type="text"
            className="tfd-input"
            placeholder="São Luís - MA"
            value={origem}
            onChange={(e) => setOrigem(e.target.value)}
          />
        </FormField>

        <FormField label="Destino" required>
          <input
            type="text"
            className="tfd-input"
            placeholder="São Paulo - SP"
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
          />
        </FormField>

        <FormField label="Data de embarque" required>
          <input
            type="date"
            className="tfd-input"
            value={dataEmbarque}
            onChange={(e) => setDataEmbarque(e.target.value)}
          />
        </FormField>

        <FormField label="Modal de transporte" required>
          <select
            className="tfd-input"
            value={modalTransporte}
            onChange={(e) => setModalTransporte(e.target.value)}
            disabled={loadingModais}
          >
            <option value="">{loadingModais ? 'Carregando...' : 'Selecione...'}</option>
            {modais.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </FormField>

        <hr className="tfd-divider" />

        {/* Section: Detalhes da Emissão */}
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          Detalhes da Emissão
        </h3>

        <FormField label="Companhia">
          <select
            className="tfd-input"
            value={companhia}
            onChange={(e) => setCompanhia(e.target.value)}
            disabled={loadingComp}
          >
            <option value="">{loadingComp ? 'Carregando...' : 'Selecione...'}</option>
            {companhias.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Localizador">
          <input
            type="text"
            className="tfd-input"
            placeholder="Código do bilhete"
            value={localizador}
            onChange={(e) => setLocalizador(e.target.value)}
          />
        </FormField>

        <FormField label="Valor da passagem">
          <input
            type="text"
            className="tfd-input"
            placeholder="R$ 0,00"
            value={valorPassagem}
            onChange={(e) => setValorPassagem(e.target.value)}
          />
        </FormField>

        <div className="mb-4 flex items-center gap-2">
          <input
            type="checkbox"
            id="medifNecessario"
            checked={medifNecessario}
            onChange={(e) => setMedifNecessario(e.target.checked)}
            style={{ accentColor: 'var(--tfd-primary-500)' }}
          />
          <label htmlFor="medifNecessario" className="tfd-label" style={{ marginBottom: 0 }}>
            MEDIF necessário
          </label>
        </div>

        <FormField label="Observações">
          <textarea
            className="tfd-input"
            rows={3}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />
        </FormField>
      </Drawer>
    </>
  );
}
