'use client';

import { useState, useMemo } from 'react';
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
  Plus,
  Upload,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import { MOCK_AGENDAMENTOS } from '@/core/mocks/agendamento.mock';
import type { StatusAgendamento, TipoAtendimento, OrigemAgendamento } from '@/core/models';
import { formatDate } from '@/shared/pipes/formatters';
import { useLookup } from '@/shared/hooks/useLookup';

/* -------------------------------------------------- */
/*  Brazilian states for UF select                     */
/* -------------------------------------------------- */

const UF_OPTIONS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA',
  'MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN',
  'RS','RO','RR','SC','SP','SE','TO',
];

/* -------------------------------------------------- */
/*  Tab config                                         */
/* -------------------------------------------------- */

type TabKey = 'TODOS' | StatusAgendamento;

const TABS: { key: TabKey; label: string }[] = [
  { key: 'TODOS', label: 'Todos' },
  { key: 'AGUARDANDO', label: 'Pendentes' },
  { key: 'AGENDADO', label: 'Agendados' },
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
  AGUARDANDO: { bg: '#FEF3C7', text: '#92400E', label: 'Pendente' },
  AGENDADO: { bg: '#DBEAFE', text: '#1D4ED8', label: 'Agendado' },
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
  SETI: { bg: '#CCFBF1', text: '#0F766E', label: 'SETI' },
  CONTATO_DIRETO: { bg: 'var(--tfd-surface-100)', text: 'var(--tfd-surface-500)', label: 'Contato Direto' },
  EMAIL: { bg: '#DBEAFE', text: '#1D4ED8', label: 'E-mail' },
};

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function AtendimentoDestinoPage() {
  const { options: tipoOptions, loading: tipoLoading } = useLookup('tipo_procedimento');
  const { options: origemOptions, loading: origemLoading } = useLookup('origem_agendamento');

  const [activeTab, setActiveTab] = useState<TabKey>('TODOS');
  const [search, setSearch] = useState('');

  /* ---- Drawer state ---- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [numSolicitacao, setNumSolicitacao] = useState('');
  const [nomeUnidade, setNomeUnidade] = useState('');
  const [cnes, setCnes] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [contatoUnidade, setContatoUnidade] = useState('');
  const [tipoAtendimento, setTipoAtendimento] = useState('');
  const [dataAgendamento, setDataAgendamento] = useState('');
  const [origemAgendamento, setOrigemAgendamento] = useState('');
  const [numCnrac, setNumCnrac] = useState('');
  const [comprovante, setComprovante] = useState<File | null>(null);

  const resetDrawerForm = () => {
    setNumSolicitacao('');
    setNomeUnidade('');
    setCnes('');
    setCidade('');
    setUf('');
    setContatoUnidade('');
    setTipoAtendimento('');
    setDataAgendamento('');
    setOrigemAgendamento('');
    setNumCnrac('');
    setComprovante(null);
  };

  const handleCloseDrawer = () => {
    setDrawerOpen(false);
    resetDrawerForm();
  };

  const handleSubmitAgendamento = () => {
    alert('Agendamento registrado com sucesso!');
    handleCloseDrawer();
  };

  /* ---- Filtered data ---- */
  const filtered = useMemo(() => {
    return MOCK_AGENDAMENTOS.filter((ag) => {
      const matchesTab = activeTab === 'TODOS' || ag.status === activeTab;
      const matchesSearch =
        search === '' ||
        ag.pacienteNome.toLowerCase().includes(search.toLowerCase()) ||
        ag.numeroProcesso.toLowerCase().includes(search.toLowerCase()) ||
        ag.unidadeDestino.toLowerCase().includes(search.toLowerCase()) ||
        ag.cidadeDestino.toLowerCase().includes(search.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [activeTab, search]);

  /* ---- Summary counters ---- */
  const summary = useMemo(() => {
    const all = MOCK_AGENDAMENTOS;
    return {
      aguardando: all.filter((ag) => ag.status === 'AGUARDANDO').length,
      agendados: all.filter((ag) => ag.status === 'AGENDADO').length,
      confirmados: all.filter((ag) => ag.status === 'CONFIRMADO').length,
      alertaSla: all.filter((ag) => ag.alertaSla).length,
    };
  }, []);

  return (
    <>
      <PageHeader
        title="Atendimento no Destino"
        subtitle="Agendamentos em unidades de saúde de referência"
        actions={
          <button className="tfd-btn tfd-btn-primary" onClick={() => setDrawerOpen(true)}>
            <Plus size={16} />
            Novo Agendamento
          </button>
        }
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
            style={{ backgroundColor: '#FEF3C7', color: '#F59E0B' }}
          >
            <Clock size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Aguardando Agendamento</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{summary.aguardando}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#DBEAFE', color: '#3B82F6' }}
          >
            <CalendarClock size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Agendados</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{summary.agendados}</p>
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
              ? MOCK_AGENDAMENTOS.length
              : MOCK_AGENDAMENTOS.filter((ag) => ag.status === tab.key).length;
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
                <th className="w-[60px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
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
                filtered.map((ag) => {
                  const { bg: statusBg, text: statusText, label: statusLabel } = statusStyleMap[ag.status];
                  const { bg: tipoBg, text: tipoText, label: tipoLabel } = tipoStyleMap[ag.tipoAtendimento];
                  const { bg: origemBg, text: origemText, label: origemLabel } = origemStyleMap[ag.origemAgendamento];

                  return (
                    <tr key={ag.id}>
                      {/* Nº Processo */}
                      <td>
                        <div className="flex items-center gap-1.5">
                          {ag.alertaSla && (
                            <span title="Alerta SLA — data próxima sem passagem emitida">
                              <AlertTriangle
                                size={14}
                                style={{ color: 'var(--tfd-status-danger)' }}
                              />
                            </span>
                          )}
                          <Link
                            href={`/solicitacoes/${ag.solicitacaoId}`}
                            className="font-medium text-sm hover:underline"
                            style={{ color: 'var(--tfd-primary-500)' }}
                          >
                            {ag.numeroProcesso}
                          </Link>
                        </div>
                      </td>

                      {/* Paciente */}
                      <td className="max-w-[160px] truncate font-medium">
                        {ag.pacienteNome}
                      </td>

                      {/* Destino */}
                      <td>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                            {ag.unidadeDestino}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                            {ag.cidadeDestino}/{ag.ufDestino}
                          </span>
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="hidden md:table-cell">
                        <span
                          className="tfd-tag tfd-tag--rounded"
                          style={{ backgroundColor: tipoBg, color: tipoText }}
                        >
                          {tipoLabel}
                        </span>
                      </td>

                      {/* Origem */}
                      <td className="hidden lg:table-cell">
                        <span
                          className="tfd-tag tfd-tag--rounded"
                          style={{ backgroundColor: origemBg, color: origemText }}
                        >
                          {origemLabel}
                        </span>
                      </td>

                      {/* Data Agendamento */}
                      <td className="hidden md:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>
                        {formatDate(ag.dataAgendamento)}
                      </td>

                      {/* Comprovante */}
                      <td className="text-center">
                        {ag.temComprovante ? (
                          <span title="Comprovante anexado">
                            <CheckCircle2
                              size={18}
                              style={{ color: 'var(--tfd-status-success)' }}
                            />
                          </span>
                        ) : (
                          <span title="Aguardando comprovante">
                            <Clock
                              size={18}
                              style={{ color: 'var(--tfd-status-warning)' }}
                            />
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          className="tfd-tag tfd-tag--rounded tfd-tag--dot"
                          style={{ backgroundColor: statusBg, color: statusText }}
                        >
                          {statusLabel}
                        </span>
                      </td>

                      {/* Ações */}
                      <td>
                        <Link
                          href={`/solicitacoes/${ag.solicitacaoId}`}
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

      {/* ========== Novo Agendamento Drawer ========== */}
      <Drawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        title="Novo Agendamento"
        subtitle="Registrar agendamento em unidade de destino"
        width="480px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={handleCloseDrawer}>
              Cancelar
            </button>
            <button className="tfd-btn tfd-btn-primary" onClick={handleSubmitAgendamento}>
              Registrar Agendamento
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
            placeholder="Código CNES"
            value={cnes}
            onChange={(e) => setCnes(e.target.value)}
          />
        </FormField>
        <FormField label="Cidade" required>
          <input
            type="text"
            className="tfd-input"
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
          />
        </FormField>
        <FormField label="UF" required>
          <select
            className="tfd-input"
            value={uf}
            onChange={(e) => setUf(e.target.value)}
          >
            <option value="">Selecione...</option>
            {UF_OPTIONS.map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </FormField>
        <FormField label="Contato na unidade">
          <input
            type="text"
            className="tfd-input"
            placeholder="Nome e telefone"
            value={contatoUnidade}
            onChange={(e) => setContatoUnidade(e.target.value)}
          />
        </FormField>

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
        <FormField label="Origem do agendamento" required>
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
        </FormField>
        {origemAgendamento === 'CNRAC' && (
          <FormField label="Nº CNRAC">
            <input
              type="text"
              className="tfd-input"
              value={numCnrac}
              onChange={(e) => setNumCnrac(e.target.value)}
            />
          </FormField>
        )}

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
    </>
  );
}
