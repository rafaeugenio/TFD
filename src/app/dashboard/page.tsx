'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  FileText,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  Plane,
  DollarSign,
  Map,
  CalendarRange,
  Loader2,
  TrendingUp,
  GitCompareArrows,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import StatusTag from '@/shared/components/status-tag/StatusTag';
import { listarSolicitacoes, contarPorStatus } from '@/services/solicitacoes.service';
import { listarViagens } from '@/services/viagens.service';
import { listarEncerramentos } from '@/services/encerramentos.service';
import { listarAjudasCusto } from '@/services/ajuda-custo.service';
import { formatDate, formatCurrency } from '@/shared/pipes/formatters';
import type { StatusSolicitacao } from '@/core/models';

/* ── Period filter presets ──────────────────────────── */

type PresetKey = '7d' | '30d' | '6m' | '1y' | 'all';

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: '7d', label: '7 dias' },
  { key: '30d', label: '30 dias' },
  { key: '6m', label: 'Semestre' },
  { key: '1y', label: 'Ano' },
  { key: 'all', label: 'Todo período' },
];

function getPresetRange(key: PresetKey): { from: string; to: string } {
  const to = new Date();
  const toStr = to.toISOString().split('T')[0];

  if (key === 'all') return { from: '', to: '' };

  const from = new Date();
  if (key === '7d') from.setDate(from.getDate() - 7);
  else if (key === '30d') from.setDate(from.getDate() - 30);
  else if (key === '6m') from.setMonth(from.getMonth() - 6);
  else if (key === '1y') from.setFullYear(from.getFullYear() - 1);

  return { from: from.toISOString().split('T')[0], to: toStr };
}

/* ── Status styling ──────────────────────────────────── */

const statusLabels: Record<string, { label: string; color: string }> = {
  NOVO: { label: 'Novo', color: '#475569' },
  EM_ANALISE: { label: 'Em Análise', color: '#2563EB' },
  EXIGENCIA: { label: 'Exigência', color: '#F59E0B' },
  AGUARDANDO_REGULACAO: { label: 'Ag. Regulação', color: '#7C3AED' },
  AGUARDANDO_AGENDAMENTO: { label: 'Ag. Agendamento', color: '#0891B2' },
  AGUARDANDO_EMISSAO: { label: 'Ag. Emissão', color: '#4F46E5' },
  EMITIDA: { label: 'Emitida', color: '#0D9488' },
  EM_VIAGEM: { label: 'Em Viagem', color: '#0284C7' },
  EM_PERMANENCIA: { label: 'Em Permanência', color: '#EA580C' },
  CONCLUIDO: { label: 'Concluído', color: '#10B981' },
  INDEFERIDO: { label: 'Indeferido', color: '#EF4444' },
  CANCELADO: { label: 'Cancelado', color: '#64748B' },
};

/* ── Motivo encerramento styling ─────────────────── */

const motivoStyleMap: Record<string, { bg: string; color: string; label: string }> = {
  ALTA_MEDICA: { bg: '#DCFCE7', color: '#15803D', label: 'Alta Médica' },
  TRANSFERENCIA: { bg: '#DBEAFE', color: '#1D4ED8', label: 'Transferência' },
  DESISTENCIA: { bg: '#FEF3C7', color: '#92400E', label: 'Desistência' },
  ABANDONO: { bg: '#FFEDD5', color: '#C2410C', label: 'Abandono' },
  OBITO: { bg: '#FEE2E2', color: '#B91C1C', label: 'Óbito' },
};

/* ── Component ───────────────────────────────────── */

export default function DashboardPage() {
  /* ── Period filter state ── */
  const [activePreset, setActivePreset] = useState<PresetKey>('30d');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const range = getPresetRange('30d');
    setDateFrom(range.from);
    setDateTo(range.to);
  }, []);

  function handlePreset(key: PresetKey) {
    setActivePreset(key);
    const range = getPresetRange(key);
    setDateFrom(range.from);
    setDateTo(range.to);
  }

  function handleDateChange(field: 'from' | 'to', value: string) {
    setActivePreset('all');
    if (field === 'from') setDateFrom(value);
    else setDateTo(value);
  }

  /* ── Data state ── */
  const [recentSolicitacoes, setRecentSolicitacoes] = useState<any[]>([]);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [viagensData, setViagensData] = useState<any[]>([]);
  const [encerramentosData, setEncerramentosData] = useState<any[]>([]);
  const [ajudasData, setAjudasData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);

    const [recentRes, countsRes, viagensRes, encRes, ajudasRes] = await Promise.all([
      listarSolicitacoes({ page: 1, pageSize: 6 }),
      contarPorStatus(),
      listarViagens({ pageSize: 500 }),
      listarEncerramentos({ pageSize: 500 }),
      listarAjudasCusto({ pageSize: 500 }),
    ]);

    if (recentRes.data) setRecentSolicitacoes(recentRes.data);
    if (countsRes.data) setStatusCounts(countsRes.data);
    if (viagensRes.data) setViagensData(viagensRes.data);
    if (encRes.data) setEncerramentosData(encRes.data);
    if (ajudasRes.data) setAjudasData(ajudasRes.data);

    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Computed: filter by period ── */
  function inPeriod(dateStr: string | null | undefined): boolean {
    if (!dateStr) return true;
    if (!dateFrom && !dateTo) return true;
    const d = dateStr.split('T')[0];
    if (dateFrom && d < dateFrom) return false;
    if (dateTo && d > dateTo) return false;
    return true;
  }

  const filteredViagens = useMemo(
    () => viagensData.filter((v: any) => inPeriod(v.created_at)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [viagensData, dateFrom, dateTo],
  );

  const filteredEncerramentos = useMemo(
    () => encerramentosData.filter((e: any) => inPeriod(e.created_at)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [encerramentosData, dateFrom, dateTo],
  );

  const filteredAjudas = useMemo(
    () => ajudasData.filter((a: any) => inPeriod(a.created_at)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ajudasData, dateFrom, dateTo],
  );

  /* ── Computed: KPIs ── */
  const totalSolicitacoes = Object.values(statusCounts).reduce((s, v) => s + v, 0);

  const emAndamento = [
    'EM_ANALISE', 'AGUARDANDO_REGULACAO', 'AGUARDANDO_AGENDAMENTO',
    'AGUARDANDO_EMISSAO', 'EMITIDA', 'EM_VIAGEM', 'EM_PERMANENCIA',
  ].reduce((s, k) => s + (statusCounts[k] || 0), 0);

  const concluidos = (statusCounts['CONCLUIDO'] || 0);
  const indeferidos = (statusCounts['INDEFERIDO'] || 0);
  const deferidos = totalSolicitacoes - indeferidos - (statusCounts['CANCELADO'] || 0);
  const taxaAprovacao = totalSolicitacoes > 0
    ? Math.round((deferidos / (deferidos + indeferidos)) * 100)
    : 0;

  const passagensEmitidas = filteredViagens.length;
  const valorPassagens = filteredViagens
    .filter((v: any) => v.valor != null)
    .reduce((s: number, v: any) => s + (v.valor ?? 0), 0);

  const totalDiarias = filteredAjudas
    .filter((a: any) => a.valor_total != null)
    .reduce((s: number, a: any) => s + (a.valor_total ?? 0), 0);

  const totalEncerramentos = filteredEncerramentos.length;

  /* ── Computed: Status bars ── */
  const statusBars = useMemo(() => {
    return Object.entries(statusLabels).map(([status, meta]) => ({
      status,
      label: meta.label,
      count: statusCounts[status] || 0,
      color: meta.color,
    }));
  }, [statusCounts]);
  const maxStatusCount = Math.max(...statusBars.map((s) => s.count), 1);

  /* ── Computed: Encerramentos por motivo ── */
  const encerramentoPorMotivo = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredEncerramentos.forEach((e: any) => {
      const m = e.motivo || 'ALTA_MEDICA';
      counts[m] = (counts[m] || 0) + 1;
    });
    return Object.entries(motivoStyleMap).map(([key, style]) => ({
      motivo: key,
      ...style,
      count: counts[key] || 0,
    }));
  }, [filteredEncerramentos]);
  const maxEncCount = Math.max(...encerramentoPorMotivo.map((e) => e.count), 1);

  /* ── Computed: Viagens por situação ── */
  const viagensPorSituacao = useMemo(() => {
    const emitidas = filteredViagens.filter((v: any) => v.situacao === 'EMITIDA').length;
    const confirmadas = filteredViagens.filter((v: any) => v.situacao === 'UTILIZADA').length;
    const remarcadas = filteredViagens.filter((v: any) => v.situacao === 'REMARCADA').length;
    const canceladas = filteredViagens.filter((v: any) => v.situacao === 'CANCELADA').length;
    return { emitidas, confirmadas, remarcadas, canceladas };
  }, [filteredViagens]);

  /* ── Computed: Top regionais (from solicitações recentes — simplified) ── */
  const topRegionais = useMemo(() => {
    const counts: Record<string, number> = {};
    recentSolicitacoes.forEach((sol: any) => {
      const mun = sol.pacientes?.municipio_pac?.nome || sol.municipios?.nome || '';
      if (mun) counts[mun] = (counts[mun] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }, [recentSolicitacoes]);

  /* ── Render ── */
  return (
    <>
      <PageHeader title="Painel" subtitle="Visão geral do TFD — SES Maranhão" />

      {/* ═══════════════════════════════════════════════
          FILTRO DE PERÍODO
          ═══════════════════════════════════════════════ */}
      <div className="tfd-card mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <CalendarRange size={16} style={{ color: 'var(--tfd-text-muted)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--tfd-text-secondary)' }}>
            Período:
          </span>

          <div className="flex items-center gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => handlePreset(p.key)}
                className="tfd-btn tfd-btn--sm"
                style={{
                  backgroundColor: activePreset === p.key ? 'var(--tfd-primary-50)' : 'transparent',
                  color: activePreset === p.key ? 'var(--tfd-primary-700)' : 'var(--tfd-text-secondary)',
                  borderColor: activePreset === p.key ? 'var(--tfd-primary-200)' : 'transparent',
                  fontWeight: activePreset === p.key ? 600 : 400,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="h-4 w-px mx-1" style={{ background: 'var(--tfd-surface-border)' }} />

          <div className="flex items-center gap-2">
            <label className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>De</label>
            <input
              type="date"
              className="tfd-input tfd-input--sm"
              style={{ width: '140px' }}
              value={dateFrom}
              onChange={(e) => handleDateChange('from', e.target.value)}
            />
            <label className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>até</label>
            <input
              type="date"
              className="tfd-input tfd-input--sm"
              style={{ width: '140px' }}
              value={dateTo}
              onChange={(e) => handleDateChange('to', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          KPI CARDS — 6 indicadores
          ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8 tfd-stagger">
        {/* 1. Total Solicitações */}
        <div className="tfd-kpi">
          <div>
            <p className="tfd-kpi-label">Total Solicitações</p>
            <p className="tfd-kpi-value tfd-number">{loading ? '—' : totalSolicitacoes}</p>
            <p className="tfd-kpi-change tfd-kpi-change--up mt-2">
              <ArrowUpRight size={11} />
              no período
            </p>
          </div>
          <div className="tfd-kpi-icon tfd-kpi-icon--blue">
            <FileText size={22} />
          </div>
        </div>

        {/* 2. Em Andamento */}
        <div className="tfd-kpi">
          <div>
            <p className="tfd-kpi-label">Em Andamento</p>
            <p className="tfd-kpi-value tfd-number">{loading ? '—' : emAndamento}</p>
            <p className="tfd-kpi-sub">processos ativos</p>
          </div>
          <div className="tfd-kpi-icon tfd-kpi-icon--amber">
            <Clock size={22} />
          </div>
        </div>

        {/* 3. Concluídos / Encerrados */}
        <div className="tfd-kpi">
          <div>
            <p className="tfd-kpi-label">Concluídos</p>
            <p className="tfd-kpi-value tfd-number">{loading ? '—' : concluidos + totalEncerramentos}</p>
            <p className="tfd-kpi-sub">{totalEncerramentos} encerramento{totalEncerramentos !== 1 ? 's' : ''}</p>
          </div>
          <div className="tfd-kpi-icon tfd-kpi-icon--green">
            <CheckCircle2 size={22} />
          </div>
        </div>

        {/* 4. Taxa de Aprovação */}
        <div className="tfd-kpi">
          <div>
            <p className="tfd-kpi-label">Taxa de Aprovação</p>
            <p className="tfd-kpi-value tfd-number">{loading ? '—' : `${taxaAprovacao}%`}</p>
            <p className="tfd-kpi-sub">{indeferidos} indeferido{indeferidos !== 1 ? 's' : ''}</p>
          </div>
          <div className="tfd-kpi-icon tfd-kpi-icon--violet">
            <GitCompareArrows size={22} />
          </div>
        </div>

        {/* 5. Passagens Emitidas */}
        <div className="tfd-kpi">
          <div>
            <p className="tfd-kpi-label">Passagens Emitidas</p>
            <p className="tfd-kpi-value tfd-number">{loading ? '—' : passagensEmitidas}</p>
            <p className="tfd-kpi-sub">{loading ? '' : formatCurrency(valorPassagens)}</p>
          </div>
          <div className="tfd-kpi-icon tfd-kpi-icon--blue">
            <Plane size={22} />
          </div>
        </div>

        {/* 6. Diárias (R$) */}
        <div className="tfd-kpi">
          <div>
            <p className="tfd-kpi-label">Diárias (Ajuda de Custo)</p>
            <p className="tfd-kpi-value tfd-number" style={{ fontSize: '1.5rem' }}>
              {loading ? '—' : formatCurrency(totalDiarias)}
            </p>
            <p className="tfd-kpi-sub">{filteredAjudas.length} registro{filteredAjudas.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="tfd-kpi-icon tfd-kpi-icon--green">
            <DollarSign size={22} />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          LINHA 2: Solicitações Recentes + Por Status
          ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6 tfd-stagger">
        {/* Solicitações Recentes */}
        <div className="tfd-card lg:col-span-3">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-semibold" style={{ color: 'var(--tfd-text-primary)', letterSpacing: '-0.02em' }}>
              Solicitações Recentes
            </h2>
            <Link
              href="/solicitacoes"
              className="text-[12px] font-medium hover:opacity-80 transition-opacity duration-150"
              style={{ color: 'var(--tfd-primary-500)' }}
            >
              Ver todas →
            </Link>
          </div>

          <div className="overflow-x-auto -mx-6">
            <table className="tfd-table" style={{ paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>
              <thead>
                <tr>
                  <th style={{ paddingLeft: '1.5rem' }}>Nº</th>
                  <th>Paciente</th>
                  <th>Status</th>
                  <th className="hidden md:table-cell">Data</th>
                  <th className="hidden lg:table-cell" style={{ paddingRight: '1.5rem' }}>Município</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10">
                      <Loader2 size={24} className="animate-spin mx-auto" style={{ color: 'var(--tfd-primary-500)' }} />
                    </td>
                  </tr>
                ) : recentSolicitacoes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10" style={{ color: 'var(--tfd-text-muted)' }}>
                      Nenhuma solicitação encontrada.
                    </td>
                  </tr>
                ) : (
                  recentSolicitacoes.map((sol) => (
                    <tr key={sol.id}>
                      <td style={{ paddingLeft: '1.5rem' }}>
                        <Link
                          href={`/solicitacoes/${sol.id}?from=dashboard`}
                          className="font-medium hover:opacity-80 transition-opacity duration-150"
                          style={{ color: 'var(--tfd-primary-500)' }}
                        >
                          {sol.numero_processo}
                        </Link>
                      </td>
                      <td className="max-w-[160px] truncate">
                        {sol.pacientes?.nome_completo ?? '—'}
                      </td>
                      <td>
                        <StatusTag status={sol.status as StatusSolicitacao} />
                      </td>
                      <td className="hidden md:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-muted)' }}>
                        {sol.created_at ? formatDate(sol.created_at) : '—'}
                      </td>
                      <td className="hidden lg:table-cell" style={{ color: 'var(--tfd-text-muted)', paddingRight: '1.5rem' }}>
                        {sol.pacientes?.municipio_pac?.nome || sol.municipios?.nome || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Distribuição por Status */}
        <div className="tfd-card lg:col-span-2">
          <h2 className="text-[15px] font-semibold mb-5" style={{ color: 'var(--tfd-text-primary)', letterSpacing: '-0.02em' }}>
            Distribuição por Status
          </h2>

          <div className="space-y-3">
            {statusBars.map((item) => (
              <div key={item.status} className="flex items-center gap-2.5">
                <span
                  className="w-[6px] h-[6px] rounded-full shrink-0"
                  style={{ background: item.color }}
                />
                <span className="text-[11px] w-24 shrink-0 truncate" style={{ color: 'var(--tfd-text-muted)' }}>
                  {item.label}
                </span>
                <div className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ background: 'var(--tfd-surface-100)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(item.count / maxStatusCount) * 100}%`,
                      background: item.color,
                      transition: 'width 800ms var(--tfd-ease)',
                    }}
                  />
                </div>
                <span className="text-[11px] font-semibold w-5 text-right" style={{ color: 'var(--tfd-text-primary)' }}>
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          LINHA 3: Municípios de Origem + Encerramentos
          ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6 tfd-stagger">
        {/* Municípios de Origem (Top 5) */}
        <div className="tfd-card lg:col-span-3">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-semibold" style={{ color: 'var(--tfd-text-primary)', letterSpacing: '-0.02em' }}>
              <Map size={16} className="inline mr-1.5 -mt-0.5" style={{ color: 'var(--tfd-primary-500)' }} />
              Municípios de Origem
            </h2>
            <Link
              href="/relatorios"
              className="text-[12px] font-medium hover:opacity-80 transition-opacity duration-150"
              style={{ color: 'var(--tfd-primary-500)' }}
            >
              Relatório completo →
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
            </div>
          ) : topRegionais.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: 'var(--tfd-text-muted)' }}>
              Sem dados de município no período.
            </p>
          ) : (
            <div className="space-y-3">
              {topRegionais.map((item, idx) => {
                const maxRegCount = topRegionais[0]?.count || 1;
                const pct = (item.count / maxRegCount) * 100;
                return (
                  <div key={item.name} className="flex items-center gap-3">
                    <span
                      className="text-[11px] font-bold w-5 h-5 rounded flex items-center justify-center shrink-0"
                      style={{
                        background: idx === 0 ? 'var(--tfd-primary-50)' : 'var(--tfd-surface-100)',
                        color: idx === 0 ? 'var(--tfd-primary-600)' : 'var(--tfd-text-muted)',
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-[13px] w-36 shrink-0 truncate" style={{ color: 'var(--tfd-text-secondary)' }}>
                      {item.name}
                    </span>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--tfd-surface-100)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${pct}%`,
                          background: idx === 0 ? 'var(--tfd-primary-500)' : 'var(--tfd-primary-300)',
                          transition: 'width 800ms var(--tfd-ease)',
                        }}
                      />
                    </div>
                    <span className="text-[13px] font-semibold w-8 text-right" style={{ color: 'var(--tfd-text-primary)' }}>
                      {item.count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Encerramentos por Motivo */}
        <div className="tfd-card lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-semibold" style={{ color: 'var(--tfd-text-primary)', letterSpacing: '-0.02em' }}>
              Encerramentos
            </h2>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: 'var(--tfd-surface-100)', color: 'var(--tfd-text-muted)' }}
            >
              {totalEncerramentos}
            </span>
          </div>

          <div className="space-y-2.5">
            {encerramentoPorMotivo.map((item) => (
              <div key={item.motivo} className="flex items-center gap-2.5">
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 w-24 text-center truncate"
                  style={{ background: item.bg, color: item.color }}
                >
                  {item.label}
                </span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--tfd-surface-100)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${maxEncCount > 0 ? (item.count / maxEncCount) * 100 : 0}%`,
                      background: item.color,
                      opacity: 0.7,
                      transition: 'width 800ms var(--tfd-ease)',
                    }}
                  />
                </div>
                <span className="text-[13px] font-semibold w-5 text-right" style={{ color: 'var(--tfd-text-primary)' }}>
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          LINHA 4: Viagens + Resumo Financeiro
          ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 tfd-stagger">
        {/* Viagens */}
        <div className="tfd-card lg:col-span-3">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-semibold" style={{ color: 'var(--tfd-text-primary)', letterSpacing: '-0.02em' }}>
              <Plane size={16} className="inline mr-1.5 -mt-0.5" style={{ color: 'var(--tfd-primary-500)' }} />
              Viagens no Período
            </h2>
            <Link
              href="/viagens"
              className="text-[12px] font-medium hover:opacity-80 transition-opacity duration-150"
              style={{ color: 'var(--tfd-primary-500)' }}
            >
              Ver viagens →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Emitidas', value: viagensPorSituacao.emitidas, color: '#2563EB', bg: '#EFF6FF' },
              { label: 'Confirmadas', value: viagensPorSituacao.confirmadas, color: '#16A34A', bg: '#F0FDF4' },
              { label: 'Remarcadas', value: viagensPorSituacao.remarcadas, color: '#D97706', bg: '#FFFBEB' },
              { label: 'Canceladas', value: viagensPorSituacao.canceladas, color: '#DC2626', bg: '#FEF2F2' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg p-3 text-center"
                style={{ background: stat.bg }}
              >
                <p className="text-2xl font-bold tfd-number" style={{ color: stat.color, letterSpacing: '-0.02em' }}>
                  {loading ? '—' : stat.value}
                </p>
                <p className="text-[11px] font-medium mt-0.5" style={{ color: stat.color, opacity: 0.8 }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: '#EFF6FF' }}>
            <span className="text-[13px] font-medium" style={{ color: '#1E40AF' }}>Valor total em passagens</span>
            <span className="text-[17px] font-bold tfd-number" style={{ color: '#1E40AF', letterSpacing: '-0.03em' }}>
              {loading ? '—' : formatCurrency(valorPassagens)}
            </span>
          </div>
        </div>

        {/* Resumo Financeiro */}
        <div className="tfd-card lg:col-span-2">
          <h2 className="text-[15px] font-semibold mb-5" style={{ color: 'var(--tfd-text-primary)', letterSpacing: '-0.02em' }}>
            <DollarSign size={16} className="inline mr-1.5 -mt-0.5" style={{ color: '#16A34A' }} />
            Resumo Financeiro
          </h2>

          <div className="space-y-0">
            {[
              { label: 'Passagens emitidas', value: formatCurrency(valorPassagens), icon: <Plane size={15} />, color: '#2563EB' },
              { label: 'Ajudas de custo', value: formatCurrency(totalDiarias), icon: <DollarSign size={15} />, color: '#16A34A' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between py-3"
                style={{ borderBottom: '1px solid var(--tfd-surface-100)' }}
              >
                <div className="flex items-center gap-2.5">
                  <span style={{ color: item.color }}>{item.icon}</span>
                  <span className="text-[13px]" style={{ color: 'var(--tfd-text-secondary)' }}>{item.label}</span>
                </div>
                <span className="text-[13px] font-semibold tfd-number" style={{ color: 'var(--tfd-text-primary)' }}>
                  {loading ? '—' : item.value}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 p-4 rounded-xl" style={{ background: '#F0FDF4' }}>
            <p className="text-[11px] font-medium mb-1" style={{ color: '#15803D', opacity: 0.8 }}>Custo total no período</p>
            <p className="text-2xl font-bold tfd-number" style={{ color: '#15803D', letterSpacing: '-0.03em' }}>
              {loading ? '—' : formatCurrency(valorPassagens + totalDiarias)}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp size={12} style={{ color: '#16A34A' }} />
              <span className="text-[11px] font-medium" style={{ color: '#16A34A' }}>
                Passagens + Ajudas de Custo
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
