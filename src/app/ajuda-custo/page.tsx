'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Wallet,
  Search,
  Clock,
  CheckCircle2,
  DollarSign,
  XCircle,
  Eye,
  Info,
  Calculator,
  Ban,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import { useParametroNumero, useParametroBooleano } from '@/shared/hooks/useParametros';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import {
  MOCK_AJUDA_CUSTO,
  AC_PACIENTE_MAP,
  AC_NUMERO_MAP,
  AC_DESTINO_MAP,
} from '@/core/mocks/ajuda-custo.mock';
import type { StatusAjudaCusto } from '@/core/models';
import { formatCurrency } from '@/shared/pipes/formatters';

/* -------------------------------------------------- */
/*  Tab config                                         */
/* -------------------------------------------------- */

type TabKey = 'TODOS' | StatusAjudaCusto;

const TABS: { key: TabKey; label: string }[] = [
  { key: 'TODOS', label: 'Todas' },
  { key: 'PENDENTE', label: 'Pendentes' },
  { key: 'APROVADO', label: 'Aprovadas' },
  { key: 'PAGO', label: 'Pagas' },
  { key: 'CANCELADO', label: 'Canceladas' },
];

/* -------------------------------------------------- */
/*  Status styling                                     */
/* -------------------------------------------------- */

interface AcStyle {
  bg: string;
  text: string;
  label: string;
}

const statusStyleMap: Record<StatusAjudaCusto, AcStyle> = {
  PENDENTE: { bg: '#FEF3C7', text: '#92400E', label: 'Pendente' },
  APROVADO: { bg: '#DBEAFE', text: '#1D4ED8', label: 'Aprovada' },
  PAGO: { bg: '#DCFCE7', text: '#15803D', label: 'Paga' },
  CANCELADO: { bg: 'var(--tfd-surface-100)', text: 'var(--tfd-surface-500)', label: 'Cancelada' },
};

/* -------------------------------------------------- */
/*  Helpers                                            */
/* -------------------------------------------------- */

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

function formatPeriodo(inicio: string, fim: string): string {
  return `${formatDate(inicio)} — ${formatDate(fim)}`;
}

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function AjudaCustoPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('TODOS');
  const [search, setSearch] = useState('');
  const [selectedAC, setSelectedAC] = useState<typeof MOCK_AJUDA_CUSTO[0] | null>(null);

  // Parâmetros dinâmicos do sistema
  const { valor: valorDiariaCompleta } = useParametroNumero('diaria_valor_completa');
  const { valor: valorDiariaRetorno } = useParametroNumero('diaria_valor_retorno');
  const { valor: pacienteInternado } = useParametroBooleano('diaria_paciente_internado');
  const { valor: acompanhanteSempre } = useParametroBooleano('diaria_acompanhante_sempre');

  /* ---- Filtered data ---- */
  const filtered = useMemo(() => {
    return MOCK_AJUDA_CUSTO.filter((ac) => {
      const matchesTab = activeTab === 'TODOS' || ac.status === activeTab;
      const pacNome = AC_PACIENTE_MAP[ac.solicitacaoId] ?? '';
      const numero = AC_NUMERO_MAP[ac.solicitacaoId] ?? '';
      const matchesSearch =
        search === '' ||
        pacNome.toLowerCase().includes(search.toLowerCase()) ||
        numero.toLowerCase().includes(search.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [activeTab, search]);

  /* ---- Summary counters ---- */
  const summary = useMemo(() => {
    const all = MOCK_AJUDA_CUSTO;
    const pendentes = all.filter((ac) => ac.status === 'PENDENTE');
    const aprovadas = all.filter((ac) => ac.status === 'APROVADO');
    const pagas = all.filter((ac) => ac.status === 'PAGO');
    return {
      pendentesCount: pendentes.length,
      pendentesTotal: pendentes.reduce((s, ac) => s + ac.valorTotal, 0),
      aprovadasTotal: aprovadas.reduce((s, ac) => s + ac.valorTotal, 0),
      pagasTotal: pagas.reduce((s, ac) => s + ac.valorTotal, 0),
      geral: all.reduce((s, ac) => s + ac.valorTotal, 0),
    };
  }, []);

  return (
    <>
      <PageHeader
        title="Ajuda de Custo"
        subtitle="Cálculo e controle de diárias TFD"
      />

      {/* ========== Info Banner — Formula ========== */}
      <div className="tfd-message tfd-message--info mb-6">
        <span className="tfd-message-icon mt-0.5 shrink-0">
          <Calculator size={16} />
        </span>
        <div className="flex-1">
          <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
            Fórmula de cálculo das diárias
          </p>
          <p className="text-sm mt-0.5" style={{ color: 'var(--tfd-text-secondary)' }}>
            Dias completos × <strong>R$ {valorDiariaCompleta.toFixed(2).replace('.', ',')}</strong> + dia de retorno × <strong>R$ {valorDiariaRetorno.toFixed(2).replace('.', ',')}</strong>.
            {!pacienteInternado && ' Paciente internado não recebe diária.'}{acompanhanteSempre && ' Acompanhante sempre elegível.'}
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
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Pendentes</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{summary.pendentesCount}</p>
            <p className="text-xs" style={{ color: 'var(--tfd-status-warning)' }}>{formatCurrency(summary.pendentesTotal)}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#DBEAFE', color: '#3B82F6' }}
          >
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Aprovadas</p>
            <p className="text-lg font-semibold" style={{ color: 'var(--tfd-primary-700)' }}>{formatCurrency(summary.aprovadasTotal)}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#DCFCE7', color: '#16A34A' }}
          >
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Total Pago</p>
            <p className="text-lg font-semibold" style={{ color: 'var(--tfd-status-success)' }}>{formatCurrency(summary.pagasTotal)}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}
          >
            <Wallet size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Total Geral</p>
            <p className="text-lg font-semibold" style={{ color: 'var(--tfd-primary-700)' }}>{formatCurrency(summary.geral)}</p>
          </div>
        </div>
      </div>

      {/* ========== Tabs + Search ========== */}
      <div className="tfd-toolbar mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-1 flex-wrap">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const count = tab.key === 'TODOS'
              ? MOCK_AJUDA_CUSTO.length
              : MOCK_AJUDA_CUSTO.filter((ac) => ac.status === tab.key).length;
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
            placeholder="Buscar paciente ou número..."
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
                <th className="hidden md:table-cell">Destino</th>
                <th className="hidden lg:table-cell">Período</th>
                <th>Dias</th>
                <th className="hidden md:table-cell">Valor/Dia</th>
                <th>Total</th>
                <th>Status</th>
                <th className="w-[60px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Ban size={32} style={{ color: 'var(--tfd-text-muted)' }} />
                      <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                        Nenhuma ajuda de custo encontrada
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((ac) => {
                  const { bg, text, label } = statusStyleMap[ac.status];
                  return (
                    <tr key={ac.id}>
                      <td>
                        <Link
                          href={`/solicitacoes/${ac.solicitacaoId}`}
                          className="font-medium text-sm hover:underline"
                          style={{ color: 'var(--tfd-primary-500)' }}
                        >
                          {AC_NUMERO_MAP[ac.solicitacaoId] ?? '—'}
                        </Link>
                      </td>
                      <td className="max-w-[160px] truncate font-medium">
                        {AC_PACIENTE_MAP[ac.solicitacaoId] ?? '—'}
                      </td>
                      <td className="hidden md:table-cell" style={{ color: 'var(--tfd-text-secondary)' }}>
                        {AC_DESTINO_MAP[ac.solicitacaoId] ?? '—'}
                      </td>
                      <td className="hidden lg:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>
                        {formatPeriodo(ac.dataInicio, ac.dataFim)}
                      </td>
                      <td className="text-center">
                        <span className="font-medium">{ac.diasCompletos}</span>
                        {ac.diaRetorno && (
                          <span className="text-xs ml-0.5" style={{ color: 'var(--tfd-text-muted)' }}>+1r</span>
                        )}
                      </td>
                      <td className="hidden md:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>
                        {formatCurrency(ac.valorDiariaCompleta)}
                      </td>
                      <td className="whitespace-nowrap font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                        {formatCurrency(ac.valorTotal)}
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
                        <button
                          className="tfd-btn tfd-btn--text tfd-btn-primary tfd-btn--sm tfd-btn--icon-only"
                          title="Ver detalhes"
                          onClick={() => setSelectedAC(ac)}
                        >
                          <Eye size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========== Ajuda de Custo Detail Drawer ========== */}
      <Drawer
        open={!!selectedAC}
        onClose={() => setSelectedAC(null)}
        title={selectedAC ? `Ajuda de Custo — ${AC_NUMERO_MAP[selectedAC.solicitacaoId] ?? '—'}` : ''}
        width="460px"
        footer={
          <button
            className="tfd-btn tfd-btn-secondary"
            onClick={() => setSelectedAC(null)}
          >
            Fechar
          </button>
        }
      >
        {selectedAC && (
          <>
            {/* ---- Dados ---- */}
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
              Dados
            </h3>

            <div className="space-y-3 mb-4">
              <div>
                <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Paciente</span>
                <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                  {AC_PACIENTE_MAP[selectedAC.solicitacaoId] ?? '—'}
                </p>
              </div>
              <div>
                <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Destino</span>
                <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                  {AC_DESTINO_MAP[selectedAC.solicitacaoId] ?? '—'}
                </p>
              </div>
              <div>
                <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Período</span>
                <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                  {formatDate(selectedAC.dataInicio)} — {formatDate(selectedAC.dataFim)}
                </p>
              </div>
              <div className="flex gap-6">
                <div>
                  <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Dias completos</span>
                  <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                    {selectedAC.diasCompletos}
                  </p>
                </div>
                <div>
                  <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Dia de retorno</span>
                  <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                    {selectedAC.diaRetorno ? 'Sim' : 'Não'}
                  </p>
                </div>
              </div>
              <div>
                <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Valor diária completa</span>
                <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                  {formatCurrency(selectedAC.valorDiariaCompleta)}
                </p>
              </div>
              <div>
                <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Valor total</span>
                <p className="text-lg font-bold" style={{ color: 'var(--tfd-text-primary)' }}>
                  {formatCurrency(selectedAC.valorTotal)}
                </p>
              </div>
            </div>

            <hr className="tfd-divider" />

            {/* ---- Comprovantes ---- */}
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
              Comprovantes
            </h3>

            <div className="tfd-message tfd-message--info mb-4">
              <span className="tfd-message-icon mt-0.5 shrink-0">
                <Info size={14} />
              </span>
              <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
                Comprovantes necessários: agendamento/consulta, declaração de comparecimento, relatório de internação (quando aplicável).
              </p>
            </div>

            <FormField label="Upload de comprovante">
              <input type="file" className="tfd-input" />
            </FormField>

            <hr className="tfd-divider" />

            {/* ---- Decisão ---- */}
            {selectedAC.status === 'PENDENTE' ? (
              <>
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
                  Decisão
                </h3>

                <FormField label="Observações">
                  <textarea
                    className="tfd-input"
                    rows={3}
                    placeholder="Observações opcionais..."
                  />
                </FormField>

                <div className="flex gap-2">
                  <button
                    className="tfd-btn flex-1"
                    style={{ backgroundColor: 'var(--tfd-status-success)', color: 'white' }}
                    onClick={() => {
                      alert('Diária aprovada!');
                      setSelectedAC(null);
                    }}
                  >
                    Aprovar
                  </button>
                  <button
                    className="tfd-btn tfd-btn-danger tfd-btn--outlined flex-1"
                    onClick={() => {
                      alert('Diária glosada!');
                      setSelectedAC(null);
                    }}
                  >
                    Glosar
                  </button>
                </div>
              </>
            ) : (
              <div>
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
                  Status
                </h3>
                <span
                  className="tfd-tag tfd-tag--rounded tfd-tag--dot"
                  style={{
                    backgroundColor: statusStyleMap[selectedAC.status].bg,
                    color: statusStyleMap[selectedAC.status].text,
                  }}
                >
                  {statusStyleMap[selectedAC.status].label}
                </span>
              </div>
            )}
          </>
        )}
      </Drawer>
    </>
  );
}
