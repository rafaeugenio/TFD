'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  CalendarClock,
  ClipboardList,
  FileText,
  Plane,
  Stethoscope,
  User,
  Wallet,
} from 'lucide-react';
import { listarLogs, ENTIDADE_LABEL, type LogAuditoria } from '@/services/logs.service';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import PageHeader from '@/shared/components/page-header/PageHeader';
import { CORES_GRAFICO, TopBarChart } from '@/shared/components/charts/Graficos';
import { FluxoV2Provider, useFluxoV2State } from '@/app/fluxo-v2/_state/FluxoV2Provider';
import { contarPorStatus } from '@/app/fluxo-v2/_utils/stats';
import { Skeleton } from '@/components/ui/skeleton';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { usePermissions } from '@/shared/auth/PermissionsProvider';

/* ── Paleta dos charts (compartilhada em shared/components/charts) ── */
const COLORS = CORES_GRAFICO;

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
  // Strip UF suffix ("São Luís - MA" → "São Luís") + normaliza acentos.
  const cidade = municipio.split(' - ')[0].trim();
  const key = cidade
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  return REGIONAL_POR_MUNICIPIO[key] ?? 'Regional indefinida';
}

/* ── Componente principal ────────────────────────────── */

function PainelContent() {
  const { solicitacoes, isLoading } = useFluxoV2State();
  const { user, isLoading: isLoadingPerfil } = usePermissions();

  /* ── Distribuição por setor (donut) ── */
  const distribuicao = useMemo(() => {
    const porStatus = contarPorStatus(solicitacoes);
    const ativas =
      porStatus.em_dados_basicos +
      porStatus.em_regulacao +
      porStatus.em_passagens +
      porStatus.em_ajuda_custo +
      porStatus.em_acompanhamento;
    return {
      ativas,
      data: [
        { name: 'Dados básicos',   value: porStatus.em_dados_basicos,  fill: COLORS.blue },
        { name: 'Regulação',       value: porStatus.em_regulacao,      fill: COLORS.indigo },
        { name: 'Passagens',       value: porStatus.em_passagens,      fill: COLORS.amber },
        { name: 'Ajuda de custo',  value: porStatus.em_ajuda_custo,    fill: COLORS.orange },
        { name: 'Acompanhamento',  value: porStatus.em_acompanhamento, fill: COLORS.cyan },
      ],
    };
  }, [solicitacoes]);

  /* ── Novas solicitações nos últimos 14 dias ── */
  const tendenciaNovas = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const days: { dia: string; novas: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(hoje);
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().slice(0, 10);
      const count = solicitacoes.filter((s) => s.dataCriacao.slice(0, 10) === dStr).length;
      days.push({
        dia: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        novas: count,
      });
    }
    const total14d = days.reduce((acc, d) => acc + d.novas, 0);
    return { data: days, total14d };
  }, [solicitacoes]);

  /* ── Solicitação stats secundárias ── */
  const solicitacaoStats = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const novasHoje = solicitacoes.filter((s) => {
      const d = new Date(s.dataCriacao);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === hoje.getTime();
    }).length;
    const emAnalise = solicitacoes.filter(
      (s) => s.status === 'em_dados_basicos' && s.pareceres.length === 0,
    ).length;
    return { novasHoje, emAnalise };
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
        <Skeleton className="h-40 w-full" />
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
      {/* ─── Meus KPIs — produção pessoal do usuário logado ─── */}
      {user && <MeusKpis usuarioId={user.id} />}

      {/* ─── Hero: Donut + Atividades recentes ─── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        <div
          className="p-5 flex flex-col"
          style={{
            background: 'white',
            border: `1px solid ${COLORS.border}`,
            borderRadius: 12,
            boxShadow: '0 1px 0 rgba(15,23,42,0.02)',
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-[14px] font-semibold" style={{ color: COLORS.text }}>
                Distribuição por setor
              </h2>
              <p className="text-[12px] mt-0.5" style={{ color: COLORS.muted }}>
                Solicitações ativas agora
              </p>
            </div>
            <div className="text-right">
              <div
                className="font-mono"
                style={{
                  color: COLORS.text,
                  fontSize: 28,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {distribuicao.ativas}
              </div>
              <div
                className="text-[11px] uppercase font-semibold mt-1"
                style={{ color: COLORS.muted, letterSpacing: '0.06em' }}
              >
                Total ativas
              </div>
            </div>
          </div>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={distribuicao.data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {distribuicao.data.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'white',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, color: COLORS.text }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <AtividadesRecentes />
      </section>

      {/* ─── Setores: Solicitação ─── */}
      <div className="grid grid-cols-1 gap-4">
        <SetorCard
          titulo="Solicitação"
          icone={<ClipboardList size={16} />}
          href="/fluxo-v2/solicitacoes"
        >
          <p className="text-[11.5px]" style={{ color: COLORS.muted }}>
            Novas solicitações — últimos 14 dias
          </p>
          <div style={{ width: '100%', height: 120 }}>
            <ResponsiveContainer>
              <AreaChart data={tendenciaNovas.data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="grad-novas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor={COLORS.blue} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={COLORS.blue} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="dia"
                  tick={{ fontSize: 10, fill: COLORS.muted }}
                  axisLine={false}
                  tickLine={false}
                  interval={2}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: 'white',
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v) => [v as number, 'Novas']}
                />
                <Area
                  type="monotone"
                  dataKey="novas"
                  stroke={COLORS.blue}
                  strokeWidth={2}
                  fill="url(#grad-novas)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <InlineStats
            stats={[
              { label: 'Hoje',        value: solicitacaoStats.novasHoje },
              { label: '14 dias',     value: tendenciaNovas.total14d },
              { label: 'Em análise',  value: solicitacaoStats.emAnalise },
            ]}
          />
        </SetorCard>
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

function ChartCard({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo?: string;
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
      {children}
    </section>
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

function SetorCard({
  titulo,
  icone,
  href,
  children,
}: {
  titulo: string;
  icone: React.ReactNode;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="p-4 flex flex-col gap-3"
      style={{
        background: 'white',
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        boxShadow: '0 1px 0 rgba(15,23,42,0.02)',
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: '#F8FAFC',
              border: `1px solid ${COLORS.border}`,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: COLORS.blue,
            }}
          >
            {icone}
          </span>
          <h2 className="text-[14px] font-semibold" style={{ color: COLORS.text }}>
            {titulo}
          </h2>
        </div>
        <Link
          href={href}
          className="text-[11.5px] inline-flex items-center gap-1 hover:underline"
          style={{ color: COLORS.blue }}
        >
          Ver setor
          <ArrowUpRight size={11} />
        </Link>
      </div>
      {children}
    </section>
  );
}

type InlineStatTone = 'blue' | 'green' | 'amber' | 'red' | 'indigo';

function InlineStats({
  stats,
}: {
  stats: { label: string; value: string | number; tone?: InlineStatTone; icon?: React.ReactNode }[];
}) {
  return (
    <div
      className="grid grid-cols-3 gap-2"
      style={{ borderTop: `1px solid ${COLORS.border}`, paddingTop: 12, marginTop: 4 }}
    >
      {stats.map((s, idx) => {
        const accent =
          s.tone === 'green'  ? COLORS.green :
          s.tone === 'amber'  ? COLORS.amber :
          s.tone === 'red'    ? COLORS.red   :
          s.tone === 'blue'   ? COLORS.blue  :
          s.tone === 'indigo' ? COLORS.indigo :
          COLORS.text;
        return (
          <div key={idx} className="flex items-baseline gap-2">
            <div
              className="flex items-center gap-1.5 text-[11px] font-semibold uppercase"
              style={{ color: COLORS.muted, letterSpacing: '0.04em' }}
            >
              {s.icon}
              {s.label}
            </div>
            <div
              className="font-mono"
              style={{
                color: accent,
                fontSize: 14,
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {s.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Page wrapper ─────────────────────────────────────── */

export default function DashboardPage() {
  return (
    <FluxoV2Provider>
      <PageHeader title="Painel" subtitle="Visão por setor do TFD" />
      <PainelContent />
    </FluxoV2Provider>
  );
}

/* -------------------------------------------------------------------------- */
/*  Feed de logs de operações do fluxo — base compartilhada por Meus KPIs     */
/*  e Atividades recentes                                                     */
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

/** Rótulo em português no plural, usado pela lista de produção pessoal
 *  (ex: "3 pareceres", "1 passagem"). Diverge do singular de ENTIDADE_LABEL
 *  só onde a forma do plural não é regular (parecer → pareceres já é regular,
 *  mas "viagem" vira "passagem" na linguagem do usuário). */
const ENTIDADE_LABEL_PLURAL: Record<string, string> = {
  solicitacoes:           'solicitações',
  pareceres:              'pareceres médicos',
  agendamentos:           'agendamentos',
  tentativas_agendamento: 'tentativas de agendamento',
  rotas_regulacao:        'rotas de regulação',
  viagens:                'passagens',
  ajudas_custo:           'ajudas de custo',
  adicionais:             'adicionais financeiros',
  documentos:             'anexos',
  devolucoes:             'devoluções',
  encerramentos:          'encerramentos',
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
/*  Meus KPIs — produção pessoal do usuário logado, filtrável por mês/ano     */
/* -------------------------------------------------------------------------- */

const MESES_LABEL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function anosDisponiveis(): number[] {
  const anoAtual = new Date().getFullYear();
  return [anoAtual, anoAtual - 1, anoAtual - 2];
}

function MeusKpis({ usuarioId }: { usuarioId: string }) {
  const hoje = new Date();
  const [mes, setMes] = useState(hoje.getMonth());
  const [ano, setAno] = useState(hoje.getFullYear());
  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setErro(false);
    (async () => {
      const inicio = new Date(ano, mes, 1, 0, 0, 0, 0);
      const fim = new Date(ano, mes + 1, 1, 0, 0, 0, 0);
      const { data, error } = await listarLogs({
        usuarioId,
        acao: 'INSERT',
        dataInicio: inicio.toISOString(),
        dataFim: fim.toISOString(),
        limit: 1000,
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
  }, [usuarioId, mes, ano]);

  const producao = useMemo(() => {
    const contagem = new Map<string, number>();
    for (const l of logs) {
      contagem.set(l.entidade_alterada, (contagem.get(l.entidade_alterada) ?? 0) + 1);
    }
    return Array.from(contagem.entries())
      .filter(([, valor]) => valor > 0)
      .map(([entidade, valor]) => ({
        entidade,
        label: ENTIDADE_LABEL_PLURAL[entidade] ?? entidade,
        valor,
      }))
      .sort((a, b) => b.valor - a.valor);
  }, [logs]);

  return (
    <section
      className="p-5 flex flex-col gap-4"
      style={{
        background: 'white',
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        boxShadow: '0 1px 0 rgba(15,23,42,0.02)',
      }}
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <User size={16} style={{ color: COLORS.blue }} />
          <div>
            <h2 className="text-[14px] font-semibold" style={{ color: COLORS.text }}>
              Meus indicadores
            </h2>
            <p className="text-[12px] mt-0.5" style={{ color: COLORS.muted }}>
              O que você registrou no sistema no período
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NativeSelect
            size="sm"
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            aria-label="Mês"
          >
            {MESES_LABEL.map((label, idx) => (
              <NativeSelectOption key={idx} value={idx}>{label}</NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            size="sm"
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            aria-label="Ano"
          >
            {anosDisponiveis().map((a) => (
              <NativeSelectOption key={a} value={a}>{a}</NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : erro ? (
        <p className="text-[12px] py-4 text-center" style={{ color: COLORS.muted }}>
          Não foi possível carregar seus indicadores. Fale com o administrador do sistema
          sobre a permissão de leitura do seu próprio histórico.
        </p>
      ) : producao.length === 0 ? (
        <p className="text-[12px] py-4 text-center" style={{ color: COLORS.muted }}>
          Nenhum registro seu no período selecionado.
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {producao.map((p) => (
            <div
              key={p.entidade}
              className="p-3 flex flex-col"
              style={{
                background: '#F8FAFC',
                border: `1px solid ${COLORS.border}`,
                borderRadius: 10,
              }}
            >
              <div
                className="font-mono"
                style={{
                  color: COLORS.text,
                  fontSize: 24,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {p.valor}
              </div>
              <div
                className="text-[11px] font-medium mt-1 capitalize"
                style={{ color: COLORS.muted }}
              >
                {p.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
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
