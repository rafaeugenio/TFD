'use client';

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
import { MOCK_SOLICITACOES } from '@/core/mocks/solicitacoes.mock';
import type { StatusSolicitacao } from '@/core/models';

/* -------------------------------------------------- */
/*  Status bar chart data                              */
/* -------------------------------------------------- */

interface StatusCount {
  status: StatusSolicitacao;
  label: string;
  count: number;
  color: string;
}

const statusCounts: StatusCount[] = [
  { status: 'NOVO', label: 'Novo', count: 14, color: '#475569' },
  { status: 'EM_ANALISE', label: 'Em Análise', count: 18, color: '#3B82F6' },
  { status: 'EXIGENCIA', label: 'Exigência', count: 5, color: '#F59E0B' },
  { status: 'AGUARDANDO_REGULACAO', label: 'Ag. Regulação', count: 23, color: '#7C3AED' },
  { status: 'AGUARDANDO_AGENDAMENTO', label: 'Ag. Agendamento', count: 8, color: '#0891B2' },
  { status: 'AGUARDANDO_EMISSAO', label: 'Ag. Emissão', count: 12, color: '#4F46E5' },
  { status: 'EMITIDA', label: 'Emitida', count: 15, color: '#0D9488' },
  { status: 'EM_VIAGEM', label: 'Em Viagem', count: 9, color: '#0284C7' },
  { status: 'EM_PERMANENCIA', label: 'Em Permanência', count: 6, color: '#EA580C' },
  { status: 'CONCLUIDO', label: 'Concluído', count: 31, color: '#16A34A' },
  { status: 'INDEFERIDO', label: 'Indeferido', count: 4, color: '#EF4444' },
  { status: 'CANCELADO', label: 'Cancelado', count: 2, color: '#64748B' },
];

const maxCount = Math.max(...statusCounts.map((s) => s.count));

/* -------------------------------------------------- */
/*  Alerts data                                        */
/* -------------------------------------------------- */

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
  warning: <AlertTriangle size={16} />,
  danger: <CircleAlert size={16} />,
  info: <Info size={16} />,
};

const alertClasses: Record<Alert['level'], string> = {
  warning: 'tfd-message tfd-message--warn',
  danger: 'tfd-message tfd-message--danger',
  info: 'tfd-message tfd-message--info',
};

const alertIconColors: Record<Alert['level'], string> = {
  warning: 'var(--tfd-status-warning)',
  danger: 'var(--tfd-status-danger)',
  info: 'var(--tfd-status-info)',
};

/* -------------------------------------------------- */
/*  Helper: format date                                */
/* -------------------------------------------------- */

function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-');
  return `${day}/${month}/${year}`;
}

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function DashboardPage() {
  const recentSolicitacoes = MOCK_SOLICITACOES.slice(0, 6);

  return (
    <>
      <PageHeader
        title="Painel"
        subtitle="Visão geral do TFD — SES Maranhão"
      />

      {/* ========== ROW 1 — Summary Cards ========== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {/* Card 1: Total Solicitacoes */}
        <div className="tfd-card flex items-center gap-4">
          <div
            className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0"
            style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}
          >
            <FileText size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
              Total Solicitações
            </p>
            <p className="text-2xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
              247
            </p>
            <p className="text-xs flex items-center gap-1" style={{ color: 'var(--tfd-status-success)' }}>
              <ArrowUpRight size={12} />
              +12 este mes
            </p>
          </div>
        </div>

        {/* Card 2: Em Andamento */}
        <div className="tfd-card flex items-center gap-4">
          <div
            className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0"
            style={{ backgroundColor: '#FFFBEB', color: '#F59E0B' }}
          >
            <Clock size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
              Em Andamento
            </p>
            <p className="text-2xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
              68
            </p>
            <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
              processos ativos
            </p>
          </div>
        </div>

        {/* Card 3: Aguardando Regulacao */}
        <div className="tfd-card flex items-center gap-4">
          <div
            className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0"
            style={{ backgroundColor: '#F5F3FF', color: '#7C3AED' }}
          >
            <ClipboardCheck size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
              Aguardando Regulação
            </p>
            <p className="text-2xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
              23
            </p>
            <p className="text-xs" style={{ color: 'var(--tfd-status-danger)' }}>
              5 urgentes
            </p>
          </div>
        </div>

        {/* Card 4: Concluidos no Mes */}
        <div className="tfd-card flex items-center gap-4">
          <div
            className="flex items-center justify-center w-12 h-12 rounded-xl shrink-0"
            style={{ backgroundColor: 'var(--tfd-secondary-50)', color: 'var(--tfd-status-success)' }}
          >
            <CheckCircle2 size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
              Concluídos no Mês
            </p>
            <p className="text-2xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
              31
            </p>
            <p className="text-xs flex items-center gap-1" style={{ color: 'var(--tfd-status-success)' }}>
              <TrendingUp size={12} />
              +8% vs mes anterior
            </p>
          </div>
        </div>
      </div>

      {/* ========== ROW 2 — Recent Requests + Status Chart ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-6">
        {/* Left panel (3/5 = 60%) — Solicitacoes Recentes */}
        <div className="tfd-card lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
              Solicitações Recentes
            </h2>
            <Link
              href="/solicitacoes"
              className="text-sm font-medium hover:underline"
              style={{ color: 'var(--tfd-primary-500)' }}
            >
              Ver todas &rarr;
            </Link>
          </div>

          {/* Table — PrimeNG Aura DataTable tokens */}
          <div className="overflow-x-auto">
            <table className="tfd-table">
              <thead>
                <tr>
                  <th>Nº</th>
                  <th>Paciente</th>
                  <th>Status</th>
                  <th className="hidden md:table-cell">Data</th>
                  <th className="hidden lg:table-cell">Município</th>
                </tr>
              </thead>
              <tbody>
                {recentSolicitacoes.map((sol) => (
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
                    <td className="max-w-[160px] truncate">
                      {sol.paciente.nome}
                    </td>
                    <td>
                      <StatusTag status={sol.status} />
                    </td>
                    <td className="hidden md:table-cell whitespace-nowrap">
                      {formatDate(sol.dataCriacao)}
                    </td>
                    <td className="hidden lg:table-cell">
                      {sol.paciente.municipioOrigem}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right panel (2/5 = 40%) — Por Status */}
        <div className="tfd-card lg:col-span-2">
          <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--tfd-text-primary)' }}>
            Por Status
          </h2>

          <div className="space-y-2.5">
            {statusCounts.map((item) => (
              <div key={item.status} className="flex items-center gap-2.5">
                <span
                  className="inline-block w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span
                  className="text-xs w-28 shrink-0 truncate"
                  style={{ color: 'var(--tfd-text-secondary)' }}
                >
                  {item.label}
                </span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--tfd-surface-hover)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(item.count / maxCount) * 100}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
                <span
                  className="text-xs font-semibold w-6 text-right shrink-0"
                  style={{ color: 'var(--tfd-text-primary)' }}
                >
                  {item.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========== ROW 3 — Alerts + Viagens do Mes ========== */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left panel (3/5) — Alertas e Pendencias */}
        <div className="tfd-card lg:col-span-3">
          <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--tfd-text-primary)' }}>
            Alertas e Pendências
          </h2>

          <div className="space-y-3">
            {alerts.map((alert, index) => (
              <div key={index} className={alertClasses[alert.level]}>
                <span className="tfd-message-icon mt-0.5 shrink-0">
                  {alertIcons[alert.level]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>
                    {alert.message}
                  </p>
                  <button
                    className="text-xs font-medium mt-1 hover:underline"
                    style={{ color: alertIconColors[alert.level] }}
                  >
                    Ver detalhes &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel (2/5) — Viagens do Mes */}
        <div className="tfd-card lg:col-span-2">
          <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--tfd-text-primary)' }}>
            Viagens do Mês
          </h2>

          <div className="space-y-4">
            {/* Stat rows */}
            {[
              { label: 'Passagens emitidas', value: '42', icon: <Plane size={16} />, color: 'var(--tfd-primary-500)' },
              { label: 'Embarques confirmados', value: '35', icon: <CheckCircle2 size={16} />, color: 'var(--tfd-status-success)' },
              { label: 'NO-SHOW', value: '3', icon: <CircleAlert size={16} />, color: 'var(--tfd-status-danger)' },
              { label: 'Remarcações', value: '4', icon: <Clock size={16} />, color: 'var(--tfd-status-warning)' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex items-center justify-between py-2"
                style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}
              >
                <div className="flex items-center gap-2.5">
                  <span style={{ color: stat.color }}>{stat.icon}</span>
                  <span className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
                    {stat.label}
                  </span>
                </div>
                <span className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                  {stat.value}
                </span>
              </div>
            ))}

            {/* Total value — highlight */}
            <div
              className="flex items-center justify-between p-3 rounded-lg"
              style={{ backgroundColor: 'var(--tfd-primary-50)' }}
            >
              <span className="text-sm font-medium" style={{ color: 'var(--tfd-primary-700)' }}>
                Valor total passagens
              </span>
              <span className="text-lg font-bold" style={{ color: 'var(--tfd-primary-700)' }}>
                R$ 67.890,00
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
