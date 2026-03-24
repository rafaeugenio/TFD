'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ClipboardCheck,
  Search,
  Clock,
  Building2,
  Heart,
  Users,
  CalendarPlus,
  AlertTriangle,
  XCircle,
  Eye,
  ChevronDown,
  ChevronUp,
  Send,
  CheckCircle2,
  FileText,
  ExternalLink,
  Stethoscope,
  X,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import {
  MOCK_REGULACAO,
  type CategoriaRegulacao,
  type RegulacaoItem,
} from '@/core/mocks/regulacao.mock';
import { formatDate, formatCPF } from '@/shared/pipes/formatters';
import { useLookup } from '@/shared/hooks/useLookup';

/* -------------------------------------------------- */
/*  Tab config                                         */
/* -------------------------------------------------- */

type TabKey = 'TODAS' | CategoriaRegulacao;

const TABS: { key: TabKey; label: string }[] = [
  { key: 'TODAS', label: 'Todas' },
  { key: 'PRONTOS', label: 'Prontos p/ análise' },
  { key: 'CNRAC', label: 'Aguard. CNRAC' },
  { key: 'SETI', label: 'Aguard. SETI' },
  { key: 'EXTERNO', label: 'Resposta externa' },
  { key: 'SERVICO_SOCIAL', label: 'Serviço Social' },
  { key: 'PRORROGACAO', label: 'Prorrogações' },
];

/* -------------------------------------------------- */
/*  Category styling                                   */
/* -------------------------------------------------- */

interface CategoriaStyle {
  bg: string;
  text: string;
  label: string;
}

const categoriaMap: Record<CategoriaRegulacao, CategoriaStyle> = {
  PRONTOS: { bg: '#DCFCE7', text: '#15803D', label: 'Pronto' },
  CNRAC: { bg: '#DBEAFE', text: '#1D4ED8', label: 'CNRAC' },
  SETI: { bg: '#F5F3FF', text: '#7C3AED', label: 'SETI' },
  EXTERNO: { bg: '#FFEDD5', text: '#C2410C', label: 'Externo' },
  SERVICO_SOCIAL: { bg: '#FEF3C7', text: '#92400E', label: 'Serv. Social' },
  PRORROGACAO: { bg: '#FCE7F3', text: '#BE185D', label: 'Prorrogação' },
};

/* -------------------------------------------------- */
/*  Priority styling                                   */
/* -------------------------------------------------- */

const prioridadeMap: Record<string, { bg: string; text: string; label: string }> = {
  NORMAL: { bg: 'var(--tfd-surface-100)', text: 'var(--tfd-text-secondary)', label: 'Normal' },
  URGENTE: { bg: '#FFEDD5', text: '#C2410C', label: 'Urgente' },
  EMERGENCIAL: { bg: '#FEE2E2', text: '#B91C1C', label: 'Emergencial' },
};

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function RegulacaoPage() {
  const { options: canalOptions, loading: canalLoading } = useLookup('canal_comunicacao');

  const [activeTab, setActiveTab] = useState<TabKey>('TODAS');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cobrancaDrawerOpen, setCobrancaDrawerOpen] = useState(false);

  /* ---- Filtered data ---- */
  const filtered = useMemo(() => {
    return MOCK_REGULACAO.filter((item) => {
      const matchesTab = activeTab === 'TODAS' || item.categoria === activeTab;
      const matchesSearch =
        search === '' ||
        item.pacienteNome.toLowerCase().includes(search.toLowerCase()) ||
        item.numeroProcesso.toLowerCase().includes(search.toLowerCase()) ||
        item.cidCodigo.toLowerCase().includes(search.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [activeTab, search]);

  /* ---- Summary counters ---- */
  const counts = useMemo(() => {
    const all = MOCK_REGULACAO;
    return {
      prontos: all.filter((i) => i.categoria === 'PRONTOS').length,
      cnrac: all.filter((i) => i.categoria === 'CNRAC').length,
      seti: all.filter((i) => i.categoria === 'SETI').length,
      prorrogacoes: all.filter((i) => i.categoria === 'PRORROGACAO').length,
    };
  }, []);

  /* ---- Selected item ---- */
  const selectedItem = useMemo(() => {
    if (!selectedId) return null;
    return MOCK_REGULACAO.find((i) => i.id === selectedId) ?? null;
  }, [selectedId]);

  return (
    <>
      <PageHeader
        title="Regulação"
        subtitle="Fila de regulação, parecer médico e roteamento de processos"
      />

      {/* ========== Summary Cards ========== */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#DCFCE7', color: '#16A34A' }}
          >
            <ClipboardCheck size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Prontos p/ análise</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{counts.prontos}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#DBEAFE', color: '#3B82F6' }}
          >
            <Building2 size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Aguard. CNRAC</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{counts.cnrac}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#F5F3FF', color: '#7C3AED' }}
          >
            <Heart size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Aguard. SETI</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{counts.seti}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#FCE7F3', color: '#DB2777' }}
          >
            <CalendarPlus size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Prorrogações</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{counts.prorrogacoes}</p>
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
              ? MOCK_REGULACAO.length
              : MOCK_REGULACAO.filter((i) => i.categoria === tab.key).length;
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
            placeholder="Buscar paciente, processo, CID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* ========== Main content: Table + Detail Panel ========== */}
      <div className="flex gap-4 items-start">
        {/* ---- Table ---- */}
        <div className={`tfd-card p-0 overflow-hidden transition-all ${selectedItem ? 'flex-1 min-w-0' : 'w-full'}`}>
          <div className="overflow-x-auto">
            <table className="tfd-table">
              <thead>
                <tr>
                  <th>N.o Processo</th>
                  <th>Paciente</th>
                  <th className="hidden md:table-cell">CID-10</th>
                  <th>Categoria</th>
                  <th>Dias na fila</th>
                  <th className="hidden lg:table-cell">Última ação</th>
                  <th className="w-[50px]">Pend.</th>
                  <th className="w-[60px]">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2">
                        <XCircle size={32} style={{ color: 'var(--tfd-text-muted)' }} />
                        <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                          Nenhum processo encontrado
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => {
                    const cat = categoriaMap[item.categoria];
                    const prio = prioridadeMap[item.prioridade];
                    const isSelected = selectedId === item.id;

                    return (
                      <tr
                        key={item.id}
                        className="cursor-pointer"
                        style={{
                          backgroundColor: isSelected ? 'var(--tfd-primary-50)' : undefined,
                        }}
                        onClick={() => setSelectedId(isSelected ? null : item.id)}
                      >
                        <td>
                          <div className="flex flex-col gap-0.5">
                            <Link
                              href={`/solicitacoes/${item.solicitacaoId}`}
                              className="font-medium text-sm hover:underline"
                              style={{ color: 'var(--tfd-primary-500)' }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {item.numeroProcesso}
                            </Link>
                            {item.prioridade !== 'NORMAL' && (
                              <span
                                className="tfd-tag tfd-tag--rounded"
                                style={{ backgroundColor: prio.bg, color: prio.text, fontSize: '0.625rem' }}
                              >
                                {prio.label}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="max-w-[160px] truncate font-medium">
                          {item.pacienteNome}
                        </td>
                        <td className="hidden md:table-cell">
                          <span
                            className="text-xs px-1.5 py-0.5 rounded"
                            style={{
                              backgroundColor: 'var(--tfd-surface-100)',
                              color: 'var(--tfd-text-primary)',
                              fontFamily: 'var(--tfd-font-mono)',
                            }}
                          >
                            {item.cidCodigo}
                          </span>
                        </td>
                        <td>
                          <span
                            className="tfd-tag tfd-tag--rounded tfd-tag--dot"
                            style={{ backgroundColor: cat.bg, color: cat.text }}
                          >
                            {cat.label}
                          </span>
                        </td>
                        <td>
                          <span
                            className="font-semibold text-sm"
                            style={{
                              color: item.diasNaFila > 10
                                ? 'var(--tfd-status-danger)'
                                : item.diasNaFila > 5
                                  ? 'var(--tfd-status-warning)'
                                  : 'var(--tfd-text-primary)',
                            }}
                          >
                            {item.diasNaFila}d
                          </span>
                        </td>
                        <td className="hidden lg:table-cell">
                          <div className="flex flex-col">
                            <span className="text-sm truncate max-w-[200px]" style={{ color: 'var(--tfd-text-secondary)' }}>
                              {item.ultimaAcao}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                              {formatDate(item.ultimaAcaoData)}
                            </span>
                          </div>
                        </td>
                        <td className="text-center">
                          {item.temPendencias ? (
                            <div className="flex items-center justify-center" title={`${item.cobrancasPendentes} cobrança(s) sem resposta`}>
                              <AlertTriangle size={16} style={{ color: 'var(--tfd-status-warning)' }} />
                            </div>
                          ) : (
                            <span style={{ color: 'var(--tfd-text-muted)' }}>—</span>
                          )}
                        </td>
                        <td>
                          <Link
                            href={`/solicitacoes/${item.solicitacaoId}`}
                            className="tfd-btn tfd-btn--text tfd-btn-primary tfd-btn--sm tfd-btn--icon-only"
                            title="Ver processo completo"
                            onClick={(e) => e.stopPropagation()}
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

        {/* ---- Detail Panel ---- */}
        {selectedItem && (
          <DetailPanel
            item={selectedItem}
            onClose={() => setSelectedId(null)}
            onOpenCobranca={() => setCobrancaDrawerOpen(true)}
          />
        )}
      </div>

      {/* ========== Cobrança Externa Drawer ========== */}
      <Drawer
        open={cobrancaDrawerOpen}
        onClose={() => setCobrancaDrawerOpen(false)}
        title="Nova Cobrança Externa"
        width="420px"
        footer={
          <>
            <button
              className="tfd-btn tfd-btn-secondary"
              onClick={() => setCobrancaDrawerOpen(false)}
            >
              Cancelar
            </button>
            <button
              className="tfd-btn tfd-btn-primary"
              onClick={() => {
                alert('Cobrança registrada com sucesso!');
                setCobrancaDrawerOpen(false);
              }}
            >
              Registrar Cobrança
            </button>
          </>
        }
      >
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          Cobrança Externa
        </h3>

        <FormField label="Destinatário" required>
          <input
            type="text"
            className="tfd-input"
            placeholder="Ex: CNRAC, SETI, Hospital Dutra..."
          />
        </FormField>

        <FormField label="Canal de envio" required>
          <select className="tfd-input" disabled={canalLoading}>
            <option value="">{canalLoading ? 'Carregando...' : 'Selecione...'}</option>
            {canalOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Data de envio" required>
          <input
            type="date"
            className="tfd-input"
            defaultValue={new Date().toISOString().split('T')[0]}
          />
        </FormField>

        <FormField label="Conteúdo/Resumo" required>
          <textarea
            className="tfd-input"
            rows={4}
            placeholder="Resumo da cobrança enviada..."
          />
        </FormField>
      </Drawer>
    </>
  );
}

/* ================================================== */
/*  Detail Panel                                       */
/* ================================================== */

function DetailPanel({
  item,
  onClose,
  onOpenCobranca,
}: {
  item: RegulacaoItem;
  onClose: () => void;
  onOpenCobranca: () => void;
}) {
  const cat = categoriaMap[item.categoria];
  const prio = prioridadeMap[item.prioridade];

  return (
    <div
      className="w-[420px] shrink-0 space-y-4 sticky top-4"
      style={{ maxHeight: 'calc(100vh - 120px)', overflowY: 'auto' }}
    >
      {/* ---- Patient Summary ---- */}
      <div className="tfd-card">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="text-base font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
            Resumo do Paciente
          </h3>
          <button
            className="tfd-btn tfd-btn--text tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only"
            title="Fechar painel"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
              {item.pacienteNome}
            </p>
            <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
              CPF: {formatCPF(item.pacienteCpf)}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="tfd-tag tfd-tag--rounded tfd-tag--dot"
              style={{ backgroundColor: cat.bg, color: cat.text }}
            >
              {cat.label}
            </span>
            {item.prioridade !== 'NORMAL' && (
              <span
                className="tfd-tag tfd-tag--rounded"
                style={{ backgroundColor: prio.bg, color: prio.text }}
              >
                {prio.label}
              </span>
            )}
          </div>

          <div
            className="flex items-center gap-4 pt-2 mt-2 text-sm"
            style={{ borderTop: '1px solid var(--tfd-surface-border)' }}
          >
            <div>
              <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>CID-10</span>
              <p className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{item.cidCodigo}</p>
            </div>
            <div className="flex-1">
              <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Descrição</span>
              <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>{item.cidDescricao}</p>
            </div>
          </div>

          <div
            className="flex items-center gap-4 pt-2 mt-1 text-sm"
            style={{ borderTop: '1px solid var(--tfd-surface-border)' }}
          >
            <div>
              <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Dias na fila</span>
              <p
                className="font-semibold"
                style={{
                  color: item.diasNaFila > 10
                    ? 'var(--tfd-status-danger)'
                    : item.diasNaFila > 5
                      ? 'var(--tfd-status-warning)'
                      : 'var(--tfd-text-primary)',
                }}
              >
                {item.diasNaFila} dias
              </p>
            </div>
            <div>
              <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Processo</span>
              <Link
                href={`/solicitacoes/${item.solicitacaoId}`}
                className="flex items-center gap-1 text-sm font-medium hover:underline"
                style={{ color: 'var(--tfd-primary-500)' }}
              >
                {item.numeroProcesso}
                <ExternalLink size={12} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Medical Opinion (read-only) ---- */}
      {item.parecerMedico && (
        <div className="tfd-card">
          <div className="flex items-center gap-2 mb-3">
            <Stethoscope size={16} style={{ color: 'var(--tfd-primary-500)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
              Parecer Médico
            </h3>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span
                className="tfd-tag tfd-tag--rounded tfd-tag--dot"
                style={{
                  backgroundColor: item.parecerMedico.status === 'DEFERIDO' ? '#DCFCE7' : '#FEE2E2',
                  color: item.parecerMedico.status === 'DEFERIDO' ? '#15803D' : '#B91C1C',
                }}
              >
                {item.parecerMedico.status === 'DEFERIDO' ? 'Deferido' : 'Indeferido'}
              </span>
              <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                {formatDate(item.parecerMedico.data)}
              </span>
            </div>

            <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
              <strong style={{ color: 'var(--tfd-text-primary)' }}>{item.parecerMedico.medico}</strong>
            </p>

            <div
              className="p-3 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--tfd-surface-50)',
                color: 'var(--tfd-text-secondary)',
              }}
            >
              {item.parecerMedico.observacoes}
            </div>
          </div>
        </div>
      )}

      {/* ---- RPB Section (for prorrogações only) ---- */}
      {item.categoria === 'PRORROGACAO' && (
        <div className="tfd-card">
          <div className="flex items-center gap-2 mb-3">
            <FileText size={16} style={{ color: '#BE185D' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
              Relatório de Permanência e Benefícios (RPB)
            </h3>
          </div>

          <div className="tfd-message tfd-message--info">
            <span className="tfd-message-icon mt-0.5 shrink-0">
              <FileText size={14} />
            </span>
            <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
              Prorrogações não exigem novo parecer médico. Aprovação baseada no RPB e justificativa anexada.
            </p>
          </div>

          {item.observacoes && (
            <div
              className="mt-3 p-3 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--tfd-surface-50)',
                color: 'var(--tfd-text-secondary)',
              }}
            >
              <span className="text-xs font-medium" style={{ color: 'var(--tfd-text-muted)' }}>Justificativa:</span>
              <p className="mt-1">{item.observacoes}</p>
            </div>
          )}
        </div>
      )}

      {/* ---- External Charges (CNRAC/SETI/EXTERNO) ---- */}
      {(item.categoria === 'CNRAC' || item.categoria === 'SETI' || item.categoria === 'EXTERNO') && (
        <div className="tfd-card">
          <div className="flex items-center gap-2 mb-3">
            <Send size={16} style={{ color: '#C2410C' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
              Cobranças Externas
            </h3>
          </div>

          {item.cobrancasPendentes > 0 ? (
            <div className="tfd-message tfd-message--warn mb-3">
              <span className="tfd-message-icon mt-0.5 shrink-0">
                <AlertTriangle size={14} />
              </span>
              <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
                {item.cobrancasPendentes} cobrança(s) enviada(s) sem resposta
              </p>
            </div>
          ) : (
            <p className="text-sm mb-3" style={{ color: 'var(--tfd-text-muted)' }}>
              Nenhuma cobrança pendente
            </p>
          )}

          {item.observacoes && (
            <div
              className="p-3 rounded-lg text-sm"
              style={{
                backgroundColor: 'var(--tfd-surface-50)',
                color: 'var(--tfd-text-secondary)',
              }}
            >
              {item.observacoes}
            </div>
          )}

          <button
            className="tfd-btn tfd-btn--outlined tfd-btn--sm mt-3 w-full"
            onClick={onOpenCobranca}
          >
            <Send size={14} />
            Enviar Nova Cobrança
          </button>
        </div>
      )}

      {/* ---- Decision Card ---- */}
      <div className="tfd-card">
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
          Decisão
        </h3>

        <div className="space-y-2">
          {item.categoria === 'PRORROGACAO' ? (
            /* Prorrogação actions */
            <>
              <button className="tfd-btn tfd-btn-primary tfd-btn--sm w-full">
                <CheckCircle2 size={14} />
                Aprovar Prorrogação
              </button>
              <button className="tfd-btn tfd-btn--outlined tfd-btn--sm w-full" style={{ borderColor: 'var(--tfd-status-danger)', color: 'var(--tfd-status-danger)' }}>
                <XCircle size={14} />
                Indeferir Prorrogação
              </button>
            </>
          ) : (
            /* Regular routing actions */
            <>
              <button className="tfd-btn tfd-btn-primary tfd-btn--sm w-full">
                <CheckCircle2 size={14} />
                Aprovar Diretamente
              </button>
              <button
                className="tfd-btn tfd-btn--outlined tfd-btn--sm w-full"
                style={{ borderColor: '#1D4ED8', color: '#1D4ED8' }}
              >
                <Building2 size={14} />
                Encaminhar CNRAC
              </button>
              <button
                className="tfd-btn tfd-btn--outlined tfd-btn--sm w-full"
                style={{ borderColor: '#7C3AED', color: '#7C3AED' }}
              >
                <Heart size={14} />
                Encaminhar SETI
              </button>
              <button
                className="tfd-btn tfd-btn--outlined tfd-btn--sm w-full"
                style={{ borderColor: '#C2410C', color: '#C2410C' }}
              >
                <ExternalLink size={14} />
                Consultar SAAS/Dutra
              </button>
              <button
                className="tfd-btn tfd-btn--outlined tfd-btn--sm w-full"
                style={{ borderColor: '#92400E', color: '#92400E' }}
              >
                <Users size={14} />
                Encaminhar Serviço Social
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
