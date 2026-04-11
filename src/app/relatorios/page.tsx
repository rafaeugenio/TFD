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
  Users,
  Stethoscope,
  MapPin,
  Map,
  Landmark,
  Route,
  Receipt,
  ClipboardCheck,
  DatabaseZap,
  GitCompareArrows,
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
    description: 'Distribuição por status atual (novo, em análise, aprovado, indeferido, etc.). Filtro por período, regional e município.',
    icon: <FileText size={20} />,
    iconBg: 'var(--tfd-primary-50)',
    iconColor: 'var(--tfd-primary-500)',
    category: 'operacional',
  },
  {
    title: 'Solicitações por Regional de Saúde',
    description: 'Total de solicitações por regional, com detalhamento por município. Mostra aprovadas, indeferidas e encerradas.',
    icon: <Map size={20} />,
    iconBg: '#DBEAFE',
    iconColor: '#2563EB',
    category: 'operacional',
  },
  {
    title: 'Solicitações por Unidade de Saúde',
    description: 'Volume por unidade de destino: solicitações, aprovadas, indeferidas, encerramentos (alta, óbito, transferência, desistência, abandono).',
    icon: <Building2 size={20} />,
    iconBg: '#CFFAFE',
    iconColor: '#0E7490',
    category: 'operacional',
  },
  {
    title: 'Solicitações por Município de Origem',
    description: 'Demanda por município do paciente, ranking e distribuição por regional.',
    icon: <MapPin size={20} />,
    iconBg: '#F5F3FF',
    iconColor: '#7C3AED',
    category: 'operacional',
  },
  {
    title: 'Deferimentos vs. Indeferimentos',
    description: 'Taxa de aprovação de pareceres por período, CID e especialidade.',
    icon: <Stethoscope size={20} />,
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
    category: 'operacional',
  },
  {
    title: 'Encerramentos por Motivo',
    description: 'Processos encerrados por motivo (alta médica, transferência, desistência, abandono, óbito) com comparativo por período.',
    icon: <Activity size={20} />,
    iconBg: '#DCFCE7',
    iconColor: '#16A34A',
    category: 'operacional',
  },
  {
    title: 'Prorrogações por Período',
    description: 'Prorrogações aprovadas e negadas, duração média e motivos.',
    icon: <Calendar size={20} />,
    iconBg: '#FFEDD5',
    iconColor: '#EA580C',
    category: 'operacional',
  },
];

const REPORTS_FINANCEIROS: ReportCard[] = [
  {
    title: 'Diárias por Período',
    description: 'Valor total de ajuda de custo calculada e paga por mês. Comparativo mensal com códigos SIGTAP (com/sem pernoite, paciente/acompanhante).',
    icon: <DollarSign size={20} />,
    iconBg: '#DCFCE7',
    iconColor: '#16A34A',
    category: 'financeiro',
  },
  {
    title: 'Passagens por Modal',
    description: 'Quantidade e valor por modal (aéreo, terrestre, fluvial) com detalhamento por rota e códigos SIGTAP.',
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
    title: 'Deslocamento por Rota',
    description: 'Rotas mais utilizadas com quantidade de procedimentos SIGTAP e valores calculados por tipo de transporte.',
    icon: <Route size={20} />,
    iconBg: '#FEF3C7',
    iconColor: '#D97706',
    category: 'financeiro',
  },
  {
    title: 'Faturamento BPA — Consolidado Mensal',
    description: 'Consolidado mensal para lançamento no BPA: ajuda de custo + deslocamento + adicionais aprovados, códigos SIGTAP, classificação P/A e valores de conferência.',
    icon: <Receipt size={20} />,
    iconBg: '#FFEDD5',
    iconColor: '#EA580C',
    category: 'financeiro',
  },
];

const REPORTS_GESTAO: ReportCard[] = [
  {
    title: 'Pacientes por Diagnóstico (CID-10)',
    description: 'Diagnósticos mais frequentes no TFD com distribuição por regional e período. Ranking por grupo CID.',
    icon: <Landmark size={20} />,
    iconBg: 'var(--tfd-primary-50)',
    iconColor: 'var(--tfd-primary-500)',
    category: 'gestao',
  },
  {
    title: 'Qualidade de Dados Cadastrais',
    description: 'Indicadores de completude: pacientes sem CNS válido, sem CEP, unidades sem CNES, diagnósticos sem CID. Previne glosas no BPA.',
    icon: <DatabaseZap size={20} />,
    iconBg: '#FEE2E2',
    iconColor: '#DC2626',
    category: 'gestao',
  },
  {
    title: 'Produtividade por Período',
    description: 'Volume de solicitações processadas por mês, comparativo mensal e acumulado anual.',
    icon: <GitCompareArrows size={20} />,
    iconBg: '#DCFCE7',
    iconColor: '#16A34A',
    category: 'gestao',
  },
];

const REPORTS_AUDITORIA: ReportCard[] = [
  {
    title: 'Trilha de Auditoria',
    description: 'Log de todas as ações no sistema, com usuário, data e descrição da ação. Retenção mínima de 5 anos.',
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
  { label: 'Solicitações no mês', value: '47', trend: '+12%', trendUp: true },
  { label: 'Encerramentos no mês', value: '13', trend: '+3', trendUp: true },
  { label: 'Diárias pagas (R$)', value: 'R$ 42.6k', trend: '+8%', trendUp: true },
  { label: 'Passagens emitidas', value: '31', trend: '+5', trendUp: true },
];

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function RelatoriosPage() {
  return (
    <>
      <PageHeader
        title="Relatórios"
        subtitle="Relatórios operacionais, financeiros, de gestão e auditoria"
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

      {/* ========== Gestão e Qualidade ========== */}
      <section className="mb-8">
        <SectionHeader title="Gestão e Qualidade" count={REPORTS_GESTAO.length} />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {REPORTS_GESTAO.map((r) => (
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
