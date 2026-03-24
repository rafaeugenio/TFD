'use client';

import {
  BarChart3,
  FileText,
  DollarSign,
  Plane,
  TrendingUp,
  Calendar,
  Download,
  FileSpreadsheet,
  Shield,
  Building2,
  Activity,
  Clock,
  AlertTriangle,
  Users,
  Stethoscope,
  Briefcase,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';

/* -------------------------------------------------- */
/*  Report card data                                   */
/* -------------------------------------------------- */

interface ReportCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  category: string;
}

const REPORTS_OPERACIONAIS: ReportCard[] = [
  {
    title: 'Solicitações por Status',
    description: 'Distribuição de solicitações por status atual. Filtre por período, município e especialidade.',
    icon: <FileText size={20} />,
    iconBg: 'var(--tfd-primary-50)',
    iconColor: 'var(--tfd-primary-500)',
    category: 'operacional',
  },
  {
    title: 'SLA por Etapa',
    description: 'Tempo médio de permanência em cada etapa do fluxo TFD, com detecção de gargalos.',
    icon: <Clock size={20} />,
    iconBg: '#FEF3C7',
    iconColor: '#F59E0B',
    category: 'operacional',
  },
  {
    title: 'Taxa de NO-SHOW',
    description: 'Percentual de pacientes que não compareceram ao embarque. Indicador crítico para o Ministério.',
    icon: <AlertTriangle size={20} />,
    iconBg: '#FEE2E2',
    iconColor: '#EF4444',
    category: 'operacional',
  },
  {
    title: 'Deferimentos vs. Indeferimentos',
    description: 'Taxa de aprovação de pareceres médicos por período, CID e especialidade.',
    icon: <Stethoscope size={20} />,
    iconBg: '#F5F3FF',
    iconColor: '#7C3AED',
    category: 'operacional',
  },
  {
    title: 'Cobranças Externas (CNRAC/SETI)',
    description: 'Solicitações encaminhadas para regulação externa com SLA de resposta e taxa de retorno.',
    icon: <Building2 size={20} />,
    iconBg: '#CFFAFE',
    iconColor: '#0E7490',
    category: 'operacional',
  },
  {
    title: 'Prorrogações por Período',
    description: 'Número de prorrogações aprovadas e negadas, com duração média e motivos.',
    icon: <Calendar size={20} />,
    iconBg: '#FFEDD5',
    iconColor: '#EA580C',
    category: 'operacional',
  },
];

const REPORTS_FINANCEIROS: ReportCard[] = [
  {
    title: 'Diárias por Período',
    description: 'Valor total de diárias calculadas, aprovadas, pagas e glosadas. Comparativo mensal.',
    icon: <DollarSign size={20} />,
    iconBg: '#DCFCE7',
    iconColor: '#16A34A',
    category: 'financeiro',
  },
  {
    title: 'Passagens por Modal',
    description: 'Quantidade e valor de passagens emitidas por modal de transporte (aéreo, rodoviário, fluvial).',
    icon: <Plane size={20} />,
    iconBg: '#DBEAFE',
    iconColor: '#3B82F6',
    category: 'financeiro',
  },
  {
    title: 'Custo por Paciente',
    description: 'Custo total por paciente (passagens + diárias), ranking dos processos mais onerosos.',
    icon: <Users size={20} />,
    iconBg: '#F5F3FF',
    iconColor: '#7C3AED',
    category: 'financeiro',
  },
  {
    title: 'Pendências Financeiras',
    description: 'Diárias aprovadas não pagas, passagens emitidas sem pagamento confirmado.',
    icon: <Briefcase size={20} />,
    iconBg: '#FEF3C7',
    iconColor: '#F59E0B',
    category: 'financeiro',
  },
];

const REPORTS_MINISTERIO: ReportCard[] = [
  {
    title: 'Relatório Mensal — Ministério da Saúde',
    description: 'Consolidado com: pacientes por CID, passagens por modal, embarques, diárias pagas, prorrogações e encerramentos.',
    icon: <TrendingUp size={20} />,
    iconBg: 'var(--tfd-primary-50)',
    iconColor: 'var(--tfd-primary-500)',
    category: 'ministerio',
  },
  {
    title: 'Encerramentos por Motivo',
    description: 'Número de processos encerrados por motivo (alta, óbito, desistência, abandono, transferência).',
    icon: <Activity size={20} />,
    iconBg: '#DCFCE7',
    iconColor: '#16A34A',
    category: 'ministerio',
  },
];

const REPORTS_AUDITORIA: ReportCard[] = [
  {
    title: 'Trilha de Auditoria',
    description: 'Log imutável de todas as ações no sistema, com usuário, data, IP e descrição da ação. Retenção mínima de 5 anos.',
    icon: <Shield size={20} />,
    iconBg: 'var(--tfd-surface-100)',
    iconColor: 'var(--tfd-surface-600)',
    category: 'auditoria',
  },
];

/* -------------------------------------------------- */
/*  Report Card Component                              */
/* -------------------------------------------------- */

function ReportCardComponent({ report }: { report: ReportCard }) {
  return (
    <div className="tfd-card flex flex-col h-full">
      <div className="flex items-start gap-3 mb-3">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
          style={{ backgroundColor: report.iconBg, color: report.iconColor }}
        >
          {report.icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
            {report.title}
          </h3>
        </div>
      </div>

      <p className="text-sm flex-1 mb-4" style={{ color: 'var(--tfd-text-secondary)' }}>
        {report.description}
      </p>

      <div className="flex items-center gap-2">
        <button className="tfd-btn tfd-btn-primary tfd-btn--sm tfd-btn--outlined flex-1">
          <BarChart3 size={14} />
          Visualizar
        </button>
        <button
          className="tfd-btn tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only"
          title="Exportar PDF"
        >
          <Download size={14} />
        </button>
        <button
          className="tfd-btn tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only"
          title="Exportar Excel"
        >
          <FileSpreadsheet size={14} />
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------- */
/*  Section Header                                     */
/* -------------------------------------------------- */

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <h2 className="text-lg font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
        {title}
      </h2>
      <span
        className="text-xs px-2 py-0.5 rounded-full font-semibold"
        style={{
          backgroundColor: 'var(--tfd-surface-100)',
          color: 'var(--tfd-text-muted)',
        }}
      >
        {count}
      </span>
    </div>
  );
}

/* -------------------------------------------------- */
/*  Quick Stats                                        */
/* -------------------------------------------------- */

const quickStats = [
  { label: 'Processos este mes', value: '47', trend: '+12%', trendUp: true },
  { label: 'Tempo médio (dias)', value: '18.3', trend: '-2.1d', trendUp: true },
  { label: 'Taxa NO-SHOW', value: '7.1%', trend: '+1.2%', trendUp: false },
  { label: 'Valor total (mes)', value: 'R$ 89.4k', trend: '+8%', trendUp: true },
];

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function RelatoriosPage() {
  return (
    <>
      <PageHeader
        title="Relatórios"
        subtitle="Relatórios operacionais, financeiros e de auditoria"
      />

      {/* ========== Quick Stats ========== */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {quickStats.map((stat) => (
          <div key={stat.label} className="tfd-card">
            <p className="text-xs mb-1" style={{ color: 'var(--tfd-text-secondary)' }}>
              {stat.label}
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                {stat.value}
              </span>
              <span
                className="text-xs font-medium"
                style={{
                  color: stat.trendUp ? 'var(--tfd-status-success)' : 'var(--tfd-status-danger)',
                }}
              >
                {stat.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ========== Operacionais ========== */}
      <section className="mb-8">
        <SectionHeader title="Operacionais" count={REPORTS_OPERACIONAIS.length} />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {REPORTS_OPERACIONAIS.map((r) => (
            <ReportCardComponent key={r.title} report={r} />
          ))}
        </div>
      </section>

      {/* ========== Financeiros ========== */}
      <section className="mb-8">
        <SectionHeader title="Financeiros" count={REPORTS_FINANCEIROS.length} />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {REPORTS_FINANCEIROS.map((r) => (
            <ReportCardComponent key={r.title} report={r} />
          ))}
        </div>
      </section>

      {/* ========== Ministerio da Saude ========== */}
      <section className="mb-8">
        <SectionHeader title="Ministério da Saúde" count={REPORTS_MINISTERIO.length} />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {REPORTS_MINISTERIO.map((r) => (
            <ReportCardComponent key={r.title} report={r} />
          ))}
        </div>
      </section>

      {/* ========== Auditoria ========== */}
      <section className="mb-8">
        <SectionHeader title="Auditoria" count={REPORTS_AUDITORIA.length} />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {REPORTS_AUDITORIA.map((r) => (
            <ReportCardComponent key={r.title} report={r} />
          ))}
        </div>
      </section>
    </>
  );
}
