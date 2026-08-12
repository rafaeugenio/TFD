'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarClock,
  Clock,
  FileText,
  ListOrdered,
  Plane,
  Stethoscope,
  User,
  Wallet,
} from 'lucide-react';
import { listarLogs, ENTIDADE_LABEL, type LogAuditoria } from '@/services/logs.service';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import PageHeader from '@/shared/components/page-header/PageHeader';
import { FluxoV2Provider, useFluxoV2State } from '@/app/fluxo-v2/_state/FluxoV2Provider';
import {
  contarPorStatus,
  contarEncerradasNoMes,
  taxaAprovacao,
  urgenciaGeral,
  envelhecimentoPorEtapa,
} from '@/app/fluxo-v2/_utils/stats';
import { STATUS_LABEL, type StatusGlobalV2 } from '@/core/mocks/fluxo-v2-v3-seed';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermissions } from '@/shared/auth/PermissionsProvider';

/* ── Paleta dos charts ───────────────────────────────── */

const COLORS = {
  blue: '#146BFA',
  indigo: '#6366F1',
  amber: '#F59E0B',
  orange: '#F97316',
  cyan: '#0891B2',
  green: '#10B981',
  rose: '#EC4899',
  slate: '#94A3B8',
  red: '#EF4444',
  border: '#E2E8F0',
  text: '#0F172A',
  muted: '#64748B',
};

/* ── Mapa município → regional de saúde (MA) ─────────── */
/**
 * Cobertura das regionais mais comuns no seed atual. Casos não mapeados caem em
 * "Regional indefinida" para evitar barras vazias no chart.
 */
const REGIONAL_POR_MUNICIPIO: Record<string, string> = {
  'sao luis':              'Regional de São Luís',
  'imperatriz':            'Regional de Imperatriz',
  'caxias':                'Regional de Caxias',
  'pinheiro':              'Regional de Pinheiro',
  'presidente dutra':      'Regional de Presidente Dutra',
  'bacabal':               'Regional de Bacabal',
  'acailandia':            'Regional de Açailândia',
  'balsas':                'Regional de Balsas',
  'barra do corda':        'Regional de Barra do Corda',
  'chapadinha':            'Regional de Chapadinha',
  'codo':                  'Regional de Codó',
  'coroata':               'Regional de Coroatá',
  'itapecuru-mirim':       'Regional de Itapecuru-Mirim',
  'pedreiras':             'Regional de Pedreiras',
  'rosario':               'Regional de Rosário',
  'santa ines':            'Regional de Santa Inês',
  'sao joao dos patos':    'Regional de São João dos Patos',
  'timon':                 'Regional de Timon',
  'viana':                 'Regional de Viana',
  'ze doca':               'Regional de Zé Doca',
};

function derivarRegional(municipio: string | undefined): string {
  if (!municipio) return 'Regional indefinida';
  // Strip UF suffix ("São Luís - MA" → "São Luís") + normalize acentos.
  const cidade = municipio.split(' - ')[0].trim();
  const key = cidade
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  return REGIONAL_POR_MUNICIPIO[key] ?? 'Regional indefinida';
}

/** Ordem real do fluxo, do início ao fim do processo. */
const ORDEM_ETAPAS: StatusGlobalV2[] = [
  'em_dados_basicos',
  'em_regulacao',
  'em_passagens',
  'em_ajuda_custo',
  'em_acompanhamento',
  'em_aprovacao',
  'em_encerramento',
];

const COR_ETAPA: Record<StatusGlobalV2, string> = {
  em_dados_basicos:  COLORS.blue,
  em_regulacao:      COLORS.indigo,
  em_passagens:      COLORS.amber,
  em_ajuda_custo:    COLORS.orange,
  em_acompanhamento: COLORS.cyan,
  em_aprovacao:      COLORS.rose,
  em_encerramento:   COLORS.green,
};

/* ── Componente principal ────────────────────────────── */

function PainelContent() {
  const { solicitacoes, isLoading } = useFluxoV2State();
  const { user, isLoading: isLoadingPerfil } = usePermissions();

  /* ── KPIs gerais: total ativas, encerradas no mês, taxa de aprovação ── */
  const kpis = useMemo(() => {
    const porStatus = contarPorStatus(solicitacoes);
    const ativas =
      porStatus.em_dados_basicos +
      porStatus.em_regulacao +
      porStatus.em_passagens +
      porStatus.em_ajuda_custo +
      porStatus.em_acompanhamento +
      porStatus.em_aprovacao;
    return {
      ativas,
      encerradasMes: contarEncerradasNoMes(solicitacoes),
      aprovacao: taxaAprovacao(solicitacoes),
    };
  }, [solicitacoes]);

  /* ── Fila por etapa do processo — ordem real do fluxo ── */
  const filaPorEtapa = useMemo(() => {
    const porStatus = contarPorStatus(solicitacoes);
    return ORDEM_ETAPAS.map((etapa) => ({
      name: STATUS_LABEL[etapa],
      value: porStatus[etapa],
      fill: COR_ETAPA[etapa],
    }));
  }, [solicitacoes]);

  /* ── Urgência pelo próximo agendamento — todas as solicitações ativas ── */
  const urgencia = useMemo(() => {
    const u = urgenciaGeral(solicitacoes);
    return {
      raw: u,
      data: [
        { name: 'Atrasadas',      value: u.atrasados,   fill: COLORS.red },
        { name: 'Até 3 dias',     value: u.ate3Dias,    fill: COLORS.amber },
        { name: '4 a 7 dias',     value: u.de4a7Dias,   fill: COLORS.blue },
        { name: 'Mais de 7 dias', value: u.maisDe7Dias, fill: COLORS.cyan },
        { name: 'Sem data',       value: u.semData,     fill: COLORS.slate },
      ].filter((d) => d.value > 0),
    };
  }, [solicitacoes]);

  /* ── Tempo parado na etapa atual — envelhecimento, qualquer setor ── */
  const envelhecimento = useMemo(() => {
    const e = envelhecimentoPorEtapa(solicitacoes);
    return {
      raw: e,
      data: [
        { name: 'Até 3 dias',    value: e.ate3Dias,     fill: COLORS.green },
        { name: '4 a 7 dias',    value: e.de4a7Dias,    fill: COLORS.blue },
        { name: '8 a 15 dias',   value: e.de8a15Dias,   fill: COLORS.amber },
        { name: 'Mais de 15',    value: e.maisDe15Dias, fill: COLORS.red },
      ].filter((d) => d.value > 0),
    };
  }, [solicitacoes]);

  /* ── Histórico mensal (últimos 6 meses) ── */
  const historico = useMemo(() => {
    const hoje = new Date();
    const meses: { mes: string; novas: number; encerradas: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const ref = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const ano = ref.getFullYear();
      const mes = ref.getMonth();
      const label = ref.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      const novas = solicitacoes.filter((s) => {
        const d = new Date(s.dataCriacao);
        return d.getFullYear() === ano && d.getMonth() === mes;
      }).length;
      const encerradas = solicitacoes.filter((s) => {
        if (!s.encerramento) return false;
        const d = new Date(s.encerramento.data);
        return d.getFullYear() === ano && d.getMonth() === mes;
      }).length;
      meses.push({ mes: `${label}/${String(ano).slice(2)}`, novas, encerradas });
    }
    return meses;
  }, [solicitacoes]);

  /* ── Top zonas regionais ── */
  const topRegioes = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of solicitacoes) {
      const r = s.paciente.zonaRegional || '—';
      counts.set(r, (counts.get(r) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [solicitacoes]);

  /* ── Top regionais de saúde ──
   * O adapter do Supabase ainda não preenche `paciente.regional` (depende de um
   * enricher via municipio_residencia_id que não está rodando). Como fallback,
   * derivamos a regional a partir do município: no Maranhão a maior parte das
   * regionais leva o nome do município-sede.
   */
  const topRegionais = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of solicitacoes) {
      const r = s.paciente.regional?.trim() || derivarRegional(s.paciente.municipio);
      counts.set(r, (counts.get(r) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [solicitacoes]);

  /* ── Top municípios de origem ── */
  const topMunicipios = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of solicitacoes) {
      const m = s.paciente.municipio || '—';
      counts.set(m, (counts.get(m) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [solicitacoes]);

  if (isLoading || isLoadingPerfil) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-72 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ─── KPIs gerais ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <KpiTile label="Solicitações ativas" value={kpis.ativas} tone="blue" />
        <KpiTile label="Encerradas no mês" value={kpis.encerradasMes} tone="green" />
        <KpiTile
          label="Taxa de aprovação"
          value={`${kpis.aprovacao}%`}
          tone="amber"
          progress={kpis.aprovacao}
        />
      </section>

      {/* ─── Meu trabalho + Atividades da equipe ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {user && <MeuTrabalho usuarioId={user.id} />}
        <AtividadesRecentes />
      </div>

      {/* ─── Fila por etapa do processo — funil transversal ─── */}
      <section
        className="p-5"
        style={{
          background: 'white',
          border: `1px solid ${COLORS.border}`,
          borderRadius: 12,
          boxShadow: '0 1px 0 rgba(15,23,42,0.02)',
        }}
      >
        <div className="flex items-center gap-2 mb-1">
          <ListOrdered size={16} style={{ color: COLORS.blue }} />
          <h2 className="text-[14px] font-semibold" style={{ color: COLORS.text }}>
            Fila por etapa do processo
          </h2>
        </div>
        <p className="text-[12px] mb-4" style={{ color: COLORS.muted }}>
          Quantas solicitações estão em cada etapa agora, na ordem real do fluxo
        </p>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <BarChart
              data={filaPorEtapa}
              layout="vertical"
              margin={{ top: 4, right: 32, left: 0, bottom: 0 }}
            >
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 12, fill: COLORS.text }}
                axisLine={false}
                tickLine={false}
                width={110}
              />
              <Tooltip
                contentStyle={{
                  background: 'white',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
                cursor={{ fill: '#F8FAFC' }}
              />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={22}>
                {filaPorEtapa.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  style={{ fontSize: 12, fill: COLORS.muted, fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ─── Urgência x Envelhecimento — réguas transversais ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <ChartCard
          titulo="Urgência pelo próximo agendamento"
          subtitulo="Solicitações ativas, por proximidade do retorno ou agendamento"
          icone={<AlertTriangle size={16} />}
        >
          {urgencia.data.length > 0 ? (
            <SetorBarChart data={urgencia.data} labelWidth={92} />
          ) : (
            <EmptyChart>Nenhuma solicitação ativa com data de referência</EmptyChart>
          )}
        </ChartCard>

        <ChartCard
          titulo="Tempo parado na etapa atual"
          subtitulo="Solicitações ativas, por dias sem sair do setor"
          icone={<Clock size={16} />}
        >
          {envelhecimento.data.length > 0 ? (
            <SetorBarChart data={envelhecimento.data} labelWidth={92} />
          ) : (
            <EmptyChart>Nenhuma solicitação ativa no momento</EmptyChart>
          )}
        </ChartCard>
      </div>

      {/* ─── Histórico mensal (6 meses) — full width ─── */}
      <section
        className="p-5"
        style={{
          background: 'white',
          border: `1px solid ${COLORS.border}`,
          borderRadius: 12,
          boxShadow: '0 1px 0 rgba(15,23,42,0.02)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-[14px] font-semibold" style={{ color: COLORS.text }}>
              Tendência últimos 6 meses
            </h2>
            <p className="text-[12px] mt-0.5" style={{ color: COLORS.muted }}>
              Comparativo entre novas solicitações e encerramentos
            </p>
          </div>
          <div className="flex items-center gap-3 text-[11.5px]" style={{ color: COLORS.muted }}>
            <LegendDot color={COLORS.blue} label="Novas" />
            <LegendDot color={COLORS.green} label="Encerradas" />
          </div>
        </div>
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <BarChart data={historico} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
              <CartesianGrid stroke="#F1F5F9" vertical={false} />
              <XAxis
                dataKey="mes"
                tick={{ fontSize: 11, fill: COLORS.muted }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: COLORS.muted }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'white',
                  border: `1px solid ${COLORS.border}`,
                  borderRadius: 8,
                  fontSize: 12,
                }}
                cursor={{ fill: '#F8FAFC' }}
              />
              <Bar dataKey="novas" name="Novas" fill={COLORS.blue} radius={[6, 6, 0, 0]} maxBarSize={36} />
              <Bar dataKey="encerradas" name="Encerradas" fill={COLORS.green} radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* ─── Top Regiões / Top Regionais / Top Municípios ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard titulo="Top regiões" subtitulo="Zona regional do paciente">
          <TopBarChart data={topRegioes} color={COLORS.indigo} width={90} />
        </ChartCard>

        <ChartCard titulo="Top regionais" subtitulo="Regional de saúde">
          <TopBarChart data={topRegionais} color={COLORS.amber} width={150} />
        </ChartCard>

        <ChartCard titulo="Top municípios" subtitulo="Origem dos pacientes">
          <TopBarChart data={topMunicipios} color={COLORS.blue} width={110} />
        </ChartCard>
      </div>
    </div>
  );
}

/* ── Helpers de UI ───────────────────────────────────── */

function KpiTile({
  label,
  value,
  tone,
  progress,
}: {
  label: string;
  value: string | number;
  tone: 'blue' | 'green' | 'amber';
  progress?: number;
}) {
  const accent =
    tone === 'green' ? COLORS.green : tone === 'amber' ? COLORS.amber : COLORS.blue;
  return (
    <div
      className="p-5 flex-1 flex flex-col"
      style={{
        background: 'white',
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        boxShadow: '0 1px 0 rgba(15,23,42,0.02)',
      }}
    >
      <div
        className="text-[11.5px] font-semibold uppercase"
        style={{ color: COLORS.muted, letterSpacing: '0.06em' }}
      >
        {label}
      </div>
      <div
        className="font-mono mt-2"
        style={{
          color: COLORS.text,
          fontSize: 32,
          fontWeight: 700,
          letterSpacing: '-0.02em',
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      {progress !== undefined && (
        <div className="mt-4">
          <div
            style={{
              height: 6,
              borderRadius: 3,
              background: '#F1F5F9',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                background: accent,
                transform: `scaleX(${Math.min(100, Math.max(0, progress)) / 100})`,
                transformOrigin: 'left',
                transition: 'transform 240ms ease',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ChartCard({
  titulo,
  subtitulo,
  icone,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  icone?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className="p-5 flex flex-col gap-3"
      style={{
        background: 'white',
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        boxShadow: '0 1px 0 rgba(15,23,42,0.02)',
      }}
    >
      <div className="flex items-center gap-2">
        {icone && <span style={{ color: COLORS.blue }}>{icone}</span>}
        <div>
          <h2 className="text-[14px] font-semibold" style={{ color: COLORS.text }}>
            {titulo}
          </h2>
          {subtitulo && (
            <p className="text-[12px] mt-0.5" style={{ color: COLORS.muted }}>
              {subtitulo}
            </p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

function TopBarChart({
  data,
  color,
  width,
}: {
  data: { name: string; value: number }[];
  color: string;
  width: number;
}) {
  if (data.length === 0) {
    return <EmptyChart>Sem dados</EmptyChart>;
  }
  return (
    <div style={{ width: '100%', height: 240 }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 24, left: 0, bottom: 0 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: COLORS.text }}
            axisLine={false}
            tickLine={false}
            width={width}
          />
          <Tooltip
            contentStyle={{
              background: 'white',
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              fontSize: 12,
            }}
            cursor={{ fill: '#F8FAFC' }}
          />
          <Bar dataKey="value" fill={color} radius={[0, 6, 6, 0]} barSize={14}>
            <LabelList
              dataKey="value"
              position="right"
              style={{ fontSize: 11, fill: COLORS.muted, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function EmptyChart({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-center text-[12px]"
      style={{ color: COLORS.muted, height: 130 }}
    >
      {children}
    </div>
  );
}

/** Barra horizontal compacta usada pelos gráficos transversais (Urgência,
 *  Envelhecimento). Mostra estado vazio quando não há dado em vez de
 *  renderizar um gráfico em branco. */
function SetorBarChart({
  data,
  labelWidth = 75,
}: {
  data: { name: string; value: number; fill: string }[];
  labelWidth?: number;
}) {
  return (
    <div style={{ width: '100%', height: 160 }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: COLORS.text }}
            axisLine={false}
            tickLine={false}
            width={labelWidth}
          />
          <Tooltip
            contentStyle={{
              background: 'white',
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
              fontSize: 12,
            }}
            cursor={{ fill: '#F8FAFC' }}
          />
          <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18}>
            {data.map((entry, idx) => (
              <Cell key={idx} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: color,
          display: 'inline-block',
        }}
      />
      {label}
    </span>
  );
}

/* ── Page wrapper ─────────────────────────────────────── */

export default function DashboardPage() {
  return (
    <FluxoV2Provider>
      <PageHeader title="Painel" subtitle="Visão geral do TFD" />
      <PainelContent />
    </FluxoV2Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*  Feed de logs de operações do fluxo — base compartilhada por Meu trabalho  */
/*  e Atividades da equipe                                                    */
/* -------------------------------------------------------------------------- */

const ENTIDADES_RELEVANTES = new Set([
  'solicitacoes',
  'pareceres',
  'agendamentos',
  'tentativas_agendamento',
  'rotas_regulacao',
  'viagens',
  'ajudas_custo',
  'adicionais',
  'documentos',
  'devolucoes',
  'encerramentos',
]);

const ENTIDADE_META: Record<string, { icon: React.ComponentType<{ size?: number }>; color: string }> = {
  solicitacoes:           { icon: FileText,     color: '#146BFA' },
  pareceres:              { icon: Stethoscope,  color: '#7C3AED' },
  agendamentos:           { icon: CalendarClock, color: '#0891B2' },
  tentativas_agendamento: { icon: CalendarClock, color: '#0891B2' },
  rotas_regulacao:        { icon: Stethoscope,  color: '#7C3AED' },
  viagens:                { icon: Plane,        color: '#0EA5E9' },
  ajudas_custo:           { icon: Wallet,       color: '#F59E0B' },
  adicionais:             { icon: Wallet,       color: '#F59E0B' },
  documentos:             { icon: FileText,     color: '#64748B' },
  devolucoes:             { icon: FileText,     color: '#DC2626' },
  encerramentos:          { icon: FileText,     color: '#16A34A' },
};

function acaoVerbo(acao: string): string {
  if (acao === 'INSERT') return 'criou';
  if (acao === 'UPDATE') return 'atualizou';
  if (acao === 'DELETE') return 'excluiu';
  return acao.toLowerCase();
}

function entidadeFuncional(entidade: string): string {
  return (ENTIDADE_LABEL[entidade] ?? entidade).toLowerCase();
}

function tempoRelativo(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'agora';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const dias = Math.floor(h / 24);
  if (dias < 7) return `${dias}d`;
  return d.toLocaleDateString('pt-BR');
}

function ListaDeLogs({ logs }: { logs: LogAuditoria[] }) {
  return (
    <ul className="flex flex-col">
      {logs.map((l, idx) => {
        const meta = ENTIDADE_META[l.entidade_alterada] ?? { icon: FileText, color: '#64748B' };
        const Icon = meta.icon;
        const conteudo = (
          <div
            className="flex items-center gap-3 py-2.5"
            style={{ borderTop: idx === 0 ? 'none' : `1px solid ${COLORS.border}` }}
          >
            <span
              className="inline-flex items-center justify-center shrink-0"
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                background: `${meta.color}15`,
                color: meta.color,
              }}
            >
              <Icon size={13} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] leading-snug truncate" style={{ color: COLORS.text }}>
                {l.nome_usuario && (
                  <>
                    <span style={{ fontWeight: 500 }}>{l.nome_usuario}</span>{' '}
                  </>
                )}
                <span style={{ color: COLORS.muted }}>{acaoVerbo(l.acao)}</span>{' '}
                <span>{entidadeFuncional(l.entidade_alterada)}</span>
              </p>
            </div>
            <span
              className="text-[11px] shrink-0 font-mono"
              style={{ color: COLORS.muted }}
              title={new Date(l.created_at).toLocaleString('pt-BR')}
            >
              {tempoRelativo(l.created_at)}
            </span>
          </div>
        );
        return (
          <li key={l.id}>
            {l.solicitacao_id ? (
              <Link
                href={`/fluxo-v2/solicitacoes/${l.solicitacao_id}?from=dashboard`}
                className="block hover:bg-[#F8FAFC] rounded-md px-2 -mx-2 transition-colors"
              >
                {conteudo}
              </Link>
            ) : (
              <div className="px-2 -mx-2">{conteudo}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/*  Meu trabalho — atividade do usuário logado                                */
/* -------------------------------------------------------------------------- */

function inicioDoDia(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function MeuTrabalho({ usuarioId }: { usuarioId: string }) {
  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const inicioMes = new Date();
      inicioMes.setDate(1);
      inicioMes.setHours(0, 0, 0, 0);
      const { data, error } = await listarLogs({
        usuarioId,
        dataInicio: inicioMes.toISOString(),
        limit: 300,
      });
      if (cancel) return;
      if (error) {
        setErro(true);
        setLoading(false);
        return;
      }
      const filtrados = (data ?? []).filter((l) => ENTIDADES_RELEVANTES.has(l.entidade_alterada));
      setLogs(filtrados);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [usuarioId]);

  const { hoje, ultimos7, noMes, recentes } = useMemo(() => {
    const hojeInicio = inicioDoDia(new Date());
    const seteDiasAtras = new Date(hojeInicio);
    seteDiasAtras.setDate(seteDiasAtras.getDate() - 6);
    let hoje = 0;
    let ultimos7 = 0;
    for (const l of logs) {
      const dInicio = inicioDoDia(new Date(l.created_at));
      if (dInicio.getTime() === hojeInicio.getTime()) hoje += 1;
      if (dInicio.getTime() >= seteDiasAtras.getTime()) ultimos7 += 1;
    }
    return { hoje, ultimos7, noMes: logs.length, recentes: logs.slice(0, 6) };
  }, [logs]);

  return (
    <section
      className="p-5 flex flex-col"
      style={{
        background: 'white',
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        boxShadow: '0 1px 0 rgba(15,23,42,0.02)',
      }}
    >
      <div className="flex items-center gap-2 mb-1 shrink-0">
        <User size={16} style={{ color: COLORS.blue }} />
        <h2 className="text-[14px] font-semibold" style={{ color: COLORS.text }}>
          Meu trabalho
        </h2>
      </div>
      <p className="text-[12px] mb-4 shrink-0" style={{ color: COLORS.muted }}>
        O que você fez no sistema
      </p>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : erro ? (
        <p className="text-[12px] py-4 text-center" style={{ color: COLORS.muted }}>
          Não foi possível carregar suas atividades. Fale com o administrador do sistema
          sobre a permissão de leitura do seu próprio histórico.
        </p>
      ) : (
        <>
          <div
            className="grid grid-cols-3 gap-2 shrink-0"
            style={{ borderBottom: `1px solid ${COLORS.border}`, paddingBottom: 12, marginBottom: 4 }}
          >
            <MiniContador label="Hoje" value={hoje} />
            <MiniContador label="7 dias" value={ultimos7} />
            <MiniContador label="No mês" value={noMes} />
          </div>
          {recentes.length === 0 ? (
            <p className="text-[12px] py-4 text-center" style={{ color: COLORS.muted }}>
              Nenhuma atividade sua registrada neste mês.
            </p>
          ) : (
            <ListaDeLogs logs={recentes} />
          )}
        </>
      )}
    </section>
  );
}

function MiniContador({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center">
      <div
        className="font-mono"
        style={{
          color: COLORS.text,
          fontSize: 20,
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      <div
        className="text-[10.5px] uppercase font-semibold"
        style={{ color: COLORS.muted, letterSpacing: '0.05em' }}
      >
        {label}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  AtividadesRecentes — feed compacto de logs de operações do fluxo          */
/* -------------------------------------------------------------------------- */

function AtividadesRecentes() {
  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      // Apenas criações (INSERT). Updates raramente carregam usuario_id e
      // poluem o feed com mudanças de status.
      const { data } = await listarLogs({ limit: 50, acao: 'INSERT' });
      if (cancel) return;
      const filtrados = (data ?? []).filter((l) => ENTIDADES_RELEVANTES.has(l.entidade_alterada));
      setLogs(filtrados.slice(0, 6));
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, []);

  return (
    <section
      className="p-5 flex flex-col"
      style={{
        background: 'white',
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        boxShadow: '0 1px 0 rgba(15,23,42,0.02)',
      }}
    >
      <div className="flex items-center justify-between mb-1 shrink-0">
        <div>
          <h2 className="text-[14px] font-semibold" style={{ color: COLORS.text }}>
            Atividades recentes
          </h2>
        </div>
        <Link
          href="/sistema/logs"
          className="inline-flex items-center gap-1 text-[12px] hover:underline"
          style={{ color: COLORS.blue }}
        >
          Ver todos <ArrowUpRight size={12} />
        </Link>
      </div>
      <p className="text-[12px] mb-4 shrink-0" style={{ color: COLORS.muted }}>
        Últimas ações da equipe no fluxo
      </p>

      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <p className="text-[12px] py-4 text-center" style={{ color: COLORS.muted }}>
          Nenhuma atividade recente nas operações do fluxo.
        </p>
      ) : (
        <ListaDeLogs logs={logs} />
      )}
    </section>
  );
}
