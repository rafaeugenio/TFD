'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Clock,
  ClipboardCheck,
  CheckCircle2,
  ArrowUpRight,
  AlertTriangle,
  CircleAlert,
  Info,
  Plane,
  TrendingUp,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import StatusTag from '@/shared/components/status-tag/StatusTag';
import { listarSolicitacoes, contarPorStatus } from '@/services/solicitacoes.service';
import { listarViagens } from '@/services/viagens.service';
import { formatDate, formatCurrency } from '@/shared/pipes/formatters';
import type { StatusSolicitacao } from '@/core/models';

/* ── Alerts ──────────────────────────────────────── */

interface Alert {
  level: 'warning' | 'danger' | 'info';
  message: string;
}

const alerts: Alert[] = [
  { level: 'warning', message: '3 solicitações com exigência pendente há mais de 5 dias' },
  { level: 'danger', message: '2 passagens emitidas sem confirmação de embarque' },
  { level: 'warning', message: '5 cobranças externas CNRAC sem resposta há 10+ dias' },
  { level: 'info', message: '8 processos aguardando parecer médico' },
];

const alertIcons: Record<Alert['level'], React.ReactNode> = {
  warning: <AlertTriangle size={15} />,
  danger: <CircleAlert size={15} />,
  info: <Info size={15} />,
};

const alertClasses: Record<Alert['level'], string> = {
  warning: 'tfd-message tfd-message--warn',
  danger: 'tfd-message tfd-message--danger',
  info: 'tfd-message tfd-message--info',
};

/* ── Status map ──────────────────────────────────── */

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

/* ── Component ───────────────────────────────────── */

export default function DashboardPage() {
  const [recentSolicitacoes, setRecentSolicitacoes] = useState<any[]>([]);
  const [statusCounts, setStatusCounts] = useState<
    { status: string; label: string; count: number; color: string }[]
  >([]);
  const [summaryCards, setSummaryCards] = useState({
    total: 0,
    emAndamento: 0,
    aguardandoRegulacao: 0,
    concluidos: 0,
  });
  const [viagensSummary, setViagensSummary] = useState({
    emitidas: 0,
    confirmadas: 0,
    noshow: 0,
    remarcadas: 0,
    valorTotal: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: recentData } = await listarSolicitacoes({ page: 1, pageSize: 6 });
      if (recentData) setRecentSolicitacoes(recentData);

      const { data: countsData } = await contarPorStatus();
      if (countsData) {
        const total = Object.values(countsData).reduce((s, v) => s + v, 0);
        const emAndamento = [
          'EM_ANALISE', 'AGUARDANDO_REGULACAO', 'AGUARDANDO_AGENDAMENTO',
          'AGUARDANDO_EMISSAO', 'EMITIDA', 'EM_VIAGEM', 'EM_PERMANENCIA',
        ].reduce((s, k) => s + (countsData[k] || 0), 0);

        setSummaryCards({
          total,
          emAndamento,
          aguardandoRegulacao: countsData['AGUARDANDO_REGULACAO'] || 0,
          concluidos: countsData['CONCLUIDO'] || 0,
        });

        setStatusCounts(
          Object.entries(statusLabels).map(([status, meta]) => ({
            status,
            label: meta.label,
            count: countsData[status] || 0,
            color: meta.color,
          })),
        );
      }

      const { data: viagensData } = await listarViagens({ pageSize: 100 });
      if (viagensData) {
        setViagensSummary({
          emitidas: viagensData.filter((v: any) => v.situacao === 'EMITIDA').length,
          confirmadas: viagensData.filter((v: any) => v.situacao === 'UTILIZADA').length,
          noshow: viagensData.filter((v: any) => v.situacao === 'NO_SHOW').length,
          remarcadas: viagensData.filter((v: any) => v.situacao === 'REMARCADA').length,
          valorTotal: viagensData
            .filter((v: any) => v.valor != null)
            .reduce((s: number, v: any) => s + (v.valor ?? 0), 0),
        });
      }

      setLoading(false);
    }
    load();
  }, []);

  const maxCount = Math.max(...statusCounts.map((s) => s.count), 1);

  return (
    <>
      <PageHeader title="Painel" subtitle="Visão geral do TFD — SES Maranhão" />

      {/* ═══ KPI Cards ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8 tfd-stagger">
        {[
          {
            label: 'Total Solicitações',
            value: summaryCards.total,
            icon: <FileText size={22} />,
            iconClass: 'tfd-kpi-icon--blue',
            change: '+12 este mês',
            changeDir: 'up' as const,
          },
          {
            label: 'Em Andamento',
            value: summaryCards.emAndamento,
            icon: <Clock size={22} />,
            iconClass: 'tfd-kpi-icon--amber',
            sub: 'processos ativos',
          },
          {
            label: 'Ag. Regulação',
            value: summaryCards.aguardandoRegulacao,
            icon: <ClipboardCheck size={22} />,
            iconClass: 'tfd-kpi-icon--violet',
            sub: '5 urgentes',
            subDanger: true,
          },
          {
            label: 'Concluídos',
            value: summaryCards.concluidos,
            icon: <CheckCircle2 size={22} />,
            iconClass: 'tfd-kpi-icon--green',
            change: '+8% vs mês anterior',
            changeDir: 'up' as const,
          },
        ].map((card) => (
          <div key={card.label} className="tfd-kpi">
            <div>
              <p className="tfd-kpi-label">{card.label}</p>
              <p className="tfd-kpi-value tfd-number">
                {loading ? '—' : card.value}
              </p>
              {card.change && (
                <p className={`tfd-kpi-change tfd-kpi-change--${card.changeDir} mt-2`}>
                  {card.changeDir === 'up' ? <ArrowUpRight size={11} /> : null}
                  {card.change}
                </p>
              )}
              {card.sub && (
                <p className={`tfd-kpi-sub ${card.subDanger ? '!text-[#EF4444]' : ''}`}>
                  {card.sub}
                </p>
              )}
            </div>
            <div className={`tfd-kpi-icon ${card.iconClass}`}>
              {card.icon}
            </div>
          </div>
        ))}
      </div>

      {/* ═══ Recent + Status ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-8 tfd-stagger">
        {/* Solicitações Recentes */}
        <div className="tfd-card lg:col-span-3">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[15px] font-semibold text-[#0F172A]" style={{ letterSpacing: '-0.02em' }}>
              Solicitações Recentes
            </h2>
            <Link
              href="/solicitacoes"
              className="text-[12px] font-medium text-[#2563EB] hover:text-[#1D4ED8] transition-colors duration-150"
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
                    <td colSpan={5} className="text-center py-10 text-[#94A3B8]" style={{ paddingLeft: '1.5rem' }}>
                      Carregando...
                    </td>
                  </tr>
                ) : recentSolicitacoes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-[#94A3B8]" style={{ paddingLeft: '1.5rem' }}>
                      Nenhuma solicitação encontrada.
                    </td>
                  </tr>
                ) : (
                  recentSolicitacoes.map((sol) => (
                    <tr key={sol.id}>
                      <td style={{ paddingLeft: '1.5rem' }}>
                        <Link
                          href={`/solicitacoes/${sol.id}`}
                          className="font-medium text-[#2563EB] hover:text-[#1D4ED8] transition-colors duration-150"
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
                      <td className="hidden md:table-cell whitespace-nowrap text-[#64748B]">
                        {sol.created_at ? formatDate(sol.created_at) : '—'}
                      </td>
                      <td className="hidden lg:table-cell text-[#64748B]" style={{ paddingRight: '1.5rem' }}>
                        {sol.pacientes?.municipio || (sol as any).municipios?.nome || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Por Status */}
        <div className="tfd-card lg:col-span-2">
          <h2 className="text-[15px] font-semibold text-[#0F172A] mb-5" style={{ letterSpacing: '-0.02em' }}>
            Por Status
          </h2>

          <div className="space-y-3">
            {statusCounts.map((item) => (
              <div key={item.status} className="flex items-center gap-2.5">
                <span
                  className="w-[6px] h-[6px] rounded-full shrink-0"
                  style={{ background: item.color }}
                />
                <span className="text-[11px] w-24 shrink-0 truncate text-[#64748B]">
                  {item.label}
                </span>
                <div className="flex-1 h-[3px] rounded-full bg-[#F1F5F9] overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(item.count / maxCount) * 100}%`,
                      background: item.color,
                      transition: 'width 800ms var(--tfd-ease)',
                    }}
                  />
                </div>
                <span className="text-[11px] font-semibold w-5 text-right text-[#0F172A]">
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ Alerts + Viagens ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 tfd-stagger">
        {/* Alertas */}
        <div className="tfd-card lg:col-span-3">
          <h2 className="text-[15px] font-semibold text-[#0F172A] mb-5" style={{ letterSpacing: '-0.02em' }}>
            Alertas e Pendências
          </h2>

          <div className="space-y-2.5">
            {alerts.map((alert, i) => (
              <div key={i} className={alertClasses[alert.level]}>
                <span className="tfd-message-icon mt-0.5">{alertIcons[alert.level]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[#0F172A]">{alert.message}</p>
                  <button className="text-[11px] font-medium mt-1 opacity-70 hover:opacity-100 transition-opacity duration-150">
                    Ver detalhes →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Viagens do Mês */}
        <div className="tfd-card lg:col-span-2">
          <h2 className="text-[15px] font-semibold text-[#0F172A] mb-5" style={{ letterSpacing: '-0.02em' }}>
            Viagens do Mês
          </h2>

          <div className="space-y-0">
            {[
              { label: 'Passagens emitidas', value: viagensSummary.emitidas, icon: <Plane size={15} />, color: '#2563EB' },
              { label: 'Embarques confirmados', value: viagensSummary.confirmadas, icon: <CheckCircle2 size={15} />, color: '#10B981' },
              { label: 'NO-SHOW', value: viagensSummary.noshow, icon: <CircleAlert size={15} />, color: '#EF4444' },
              { label: 'Remarcações', value: viagensSummary.remarcadas, icon: <Clock size={15} />, color: '#F59E0B' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex items-center justify-between py-3 border-b border-[#F1F5F9] last:border-b-0"
              >
                <div className="flex items-center gap-2.5">
                  <span style={{ color: stat.color }}>{stat.icon}</span>
                  <span className="text-[13px] text-[#64748B]">{stat.label}</span>
                </div>
                <span className="text-[13px] font-semibold text-[#0F172A] tfd-number">
                  {loading ? '—' : stat.value}
                </span>
              </div>
            ))}

            <div className="flex items-center justify-between mt-4 p-3 rounded-xl bg-[#EFF6FF]">
              <span className="text-[13px] font-medium text-[#1E40AF]">Valor total</span>
              <span className="text-[17px] font-bold text-[#1E40AF] tfd-number" style={{ letterSpacing: '-0.03em' }}>
                {loading ? '—' : formatCurrency(viagensSummary.valorTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
