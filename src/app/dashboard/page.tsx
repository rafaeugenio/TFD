'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Plane,
  Stethoscope,
  Wallet,
} from 'lucide-react';
import { listarLogs, type LogAuditoria } from '@/services/logs.service';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
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
  contarAguardandoParecer,
  contarAguardandoAgendamento,
  contarPorCarimbo,
  contarPareceres,
  contarViagensAguardandoEmissao,
  contarAdicionaisPendentes,
  contarAjudasPendentes,
  totalEmitidoNoMes,
  totalDiariasNoMes,
  formatBRL,
} from '@/app/fluxo-v2/_utils/stats';
import { Skeleton } from '@/components/ui/skeleton';
import type { SolicitacaoMock } from '@/core/mocks/fluxo-v2-v3-seed';
import { usePermissions } from '@/shared/auth/PermissionsProvider';
import type { PerfilUsuario } from '@/lib/supabase/database.types';

/* ── PBI 13235: visibilidade de gráficos por perfil ──────────────────────
 * O Dashboard passa a ser visível a todos os perfis; cada gráfico/card é
 * exibido conforme o papel do usuário logado. Mapa simples papel → widgets
 * visíveis. Admin master e perfis de gestão ampla (Coordenação Estadual,
 * Controle Interno) veem tudo; perfis operacionais veem só o que cabe à
 * sua frente de trabalho.
 */
type WidgetKey =
  | 'distribuicao'
  | 'kpis'
  | 'atividades'
  | 'solicitacao'
  | 'regulacao'
  | 'financeiro'
  | 'tendencia'
  | 'topRegioes'
  | 'topRegionais'
  | 'topMunicipios';

const TODOS_WIDGETS: WidgetKey[] = [
  'distribuicao', 'kpis', 'atividades', 'solicitacao', 'regulacao',
  'financeiro', 'tendencia', 'topRegioes', 'topRegionais', 'topMunicipios',
];

const WIDGETS_POR_PERFIL: Record<PerfilUsuario, WidgetKey[]> = {
  ADMINISTRADOR: TODOS_WIDGETS,
  COORDENACAO_ESTADUAL: TODOS_WIDGETS,
  CONTROLE_INTERNO: TODOS_WIDGETS,
  SETOR_REGULACAO: ['distribuicao', 'regulacao', 'tendencia'],
  MEDICO_AUDITOR: ['distribuicao', 'regulacao', 'tendencia'],
  SETOR_PASSAGENS: ['distribuicao', 'financeiro', 'kpis', 'tendencia'],
  FINANCEIRO: ['distribuicao', 'financeiro', 'kpis', 'tendencia'],
  ATENDENTE_MUNICIPAL: ['distribuicao', 'solicitacao', 'kpis', 'atividades'],
  ATENDENTE_REGIONAL: ['distribuicao', 'solicitacao', 'kpis', 'atividades', 'topRegioes', 'topRegionais', 'topMunicipios'],
  ASSISTENTE_SOCIAL: ['distribuicao', 'solicitacao', 'kpis', 'atividades'],
};

/** Perfil desconhecido ou usuário ainda carregando: mostra tudo (fail-open, protótipo). */
function widgetsDoPerfil(perfil: string | undefined, isAdmin: boolean): Set<WidgetKey> {
  if (isAdmin) return new Set(TODOS_WIDGETS);
  const lista = WIDGETS_POR_PERFIL[perfil as PerfilUsuario];
  return new Set(lista ?? TODOS_WIDGETS);
}

/** Classes Tailwind literais (o JIT não interpreta strings interpoladas). */
function gridColsClass(n: number): string {
  if (n <= 1) return 'grid-cols-1';
  if (n === 2) return 'grid-cols-1 lg:grid-cols-2';
  return 'grid-cols-1 lg:grid-cols-3';
}

/* ── Paleta dos charts ───────────────────────────────── */

const COLORS = {
  blue: '#146BFA',
  indigo: '#6366F1',
  amber: '#F59E0B',
  orange: '#F97316',
  cyan: '#0891B2',
  green: '#10B981',
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

/* ── Alertas ─────────────────────────────────────────── */

function diasNoSetor(s: SolicitacaoMock): number {
  const ultimoEvento =
    s.observacoes.length > 0
      ? s.observacoes[s.observacoes.length - 1].data
      : s.dataCriacao;
  const ms = Date.now() - new Date(ultimoEvento).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function setorLabel(status: SolicitacaoMock['status']): string {
  switch (status) {
    case 'em_dados_basicos':  return 'Dados básicos';
    case 'em_regulacao':      return 'Regulação';
    case 'em_passagens':      return 'Passagens';
    case 'em_ajuda_custo':    return 'Ajuda de custo';
    case 'em_acompanhamento': return 'Acompanhamento';
    case 'em_encerramento':   return 'Encerramento';
  }
}

/* ── Componente principal ────────────────────────────── */

function PainelContent() {
  const { solicitacoes, isLoading } = useFluxoV2State();
  const { user, isLoading: isLoadingPerfil } = usePermissions();
  const visible = useMemo(
    () => widgetsDoPerfil(user?.perfil, user?.is_admin === true),
    [user?.perfil, user?.is_admin],
  );

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
      encerradasMes: contarEncerradasNoMes(solicitacoes),
      aprovacao: taxaAprovacao(solicitacoes),
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
    const emExigencia = solicitacoes.filter((s) => {
      if (s.status !== 'em_dados_basicos') return false;
      return (s.devolucoes ?? []).some((d) => !d.resolvida);
    }).length;
    return { novasHoje, emAnalise, emExigencia };
  }, [solicitacoes]);

  /* ── Regulação ── */
  const regulacao = useMemo(() => {
    const carimbo = contarPorCarimbo(solicitacoes);
    return {
      aguardandoParecer: contarAguardandoParecer(solicitacoes),
      aguardandoAgendamento: contarAguardandoAgendamento(solicitacoes),
      pareceresMes: contarPareceres(solicitacoes, undefined, true),
      deferidosMes: contarPareceres(solicitacoes, 'deferido', true),
      indeferidosMes: contarPareceres(solicitacoes, 'indeferido', true),
      carimboData: [
        { name: 'Aprov. direto', value: carimbo.APROVADO_DIRETO, fill: COLORS.green },
        { name: 'CNRAC',         value: carimbo.CNRAC,           fill: COLORS.blue },
        { name: 'CET',           value: carimbo.CET,             fill: COLORS.indigo },
        { name: 'Outros',        value: carimbo.OUTROS,          fill: COLORS.slate },
      ].filter((d) => d.value > 0),
    };
  }, [solicitacoes]);

  /* ── Financeiro ── */
  const financeiro = useMemo(() => {
    const passagens = contarViagensAguardandoEmissao(solicitacoes);
    const adicionais = contarAdicionaisPendentes(solicitacoes);
    const ajudas = contarAjudasPendentes(solicitacoes);
    return {
      passagens,
      adicionais,
      ajudas,
      emitidoMes: totalEmitidoNoMes(solicitacoes),
      diariasMes: totalDiariasNoMes(solicitacoes),
      pendenciasData: [
        { name: 'Passagens', value: passagens, fill: COLORS.blue },
        { name: 'Adicionais', value: adicionais, fill: COLORS.amber },
        { name: 'Ajudas', value: ajudas, fill: COLORS.indigo },
      ],
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

  if (visible.size === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center gap-2 py-20 text-center"
        style={{
          background: 'white',
          border: `1px solid ${COLORS.border}`,
          borderRadius: 12,
        }}
      >
        <LayoutDashboard size={28} style={{ color: COLORS.muted }} />
        <p className="text-[13.5px] font-medium" style={{ color: COLORS.text }}>
          Nenhum indicador disponível para o seu perfil.
        </p>
        <p className="text-[12px]" style={{ color: COLORS.muted }}>
          Fale com o administrador do sistema caso precise de acesso a este painel.
        </p>
      </div>
    );
  }

  const heroWidgets = (['distribuicao', 'kpis', 'atividades'] as const).filter((w) => visible.has(w));
  const setorWidgets = (['solicitacao', 'regulacao', 'financeiro'] as const).filter((w) => visible.has(w));
  const topWidgets = (['topRegioes', 'topRegionais', 'topMunicipios'] as const).filter((w) => visible.has(w));

  return (
    <div className="flex flex-col gap-6">
      {/* ─── Hero: Donut + KPIs + Atividades, colunas conforme perfil ─── */}
      {heroWidgets.length > 0 && (
      <section className={`grid ${gridColsClass(heroWidgets.length)} gap-4 items-stretch`}>
        {/* Coluna 1 — Donut */}
        {visible.has('distribuicao') && (
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
        )}

        {/* Coluna 2 — KPIs empilhados (mesma altura do donut) */}
        {visible.has('kpis') && (
        <div className="flex flex-col gap-4">
          <KpiTile
            label="Encerradas no mês"
            value={distribuicao.encerradasMes}
            tone="green"
          />
          <KpiTile
            label="Taxa de aprovação"
            value={`${distribuicao.aprovacao}%`}
            tone="blue"
            progress={distribuicao.aprovacao}
          />
        </div>
        )}

        {/* Coluna 3 — Atividades recentes (limitada à altura da linha) */}
        {visible.has('atividades') && <AtividadesRecentes />}
      </section>
      )}

      {/* ─── Setores (Solicitação/Regulação/Financeiro) conforme perfil ─── */}
      {setorWidgets.length > 0 && (
      <div className={`grid ${gridColsClass(setorWidgets.length)} gap-4`}>
        {/* Solicitação — Tendência */}
        {visible.has('solicitacao') && (
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
              { label: 'Exigência',   value: solicitacaoStats.emExigencia, tone: solicitacaoStats.emExigencia > 0 ? 'amber' : undefined },
            ]}
          />
        </SetorCard>
        )}

        {/* Regulação — Donut Carimbo */}
        {visible.has('regulacao') && (
        <SetorCard
          titulo="Regulação"
          icone={<Stethoscope size={16} />}
          href="/fluxo-v2/regulacao"
        >
          <p className="text-[11.5px]" style={{ color: COLORS.muted }}>
            Distribuição por carimbo
          </p>
          {regulacao.carimboData.length > 0 ? (
            <div style={{ width: '100%', height: 130 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={regulacao.carimboData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={36}
                    outerRadius={56}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {regulacao.carimboData.map((entry, idx) => (
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
                    verticalAlign="middle"
                    align="right"
                    layout="vertical"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, color: COLORS.text }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div
              className="flex items-center justify-center text-[12px]"
              style={{ color: COLORS.muted, height: 130 }}
            >
              Sem solicitações em regulação
            </div>
          )}
          <InlineStats
            stats={[
              {
                label: 'Ag. parecer',
                value: regulacao.aguardandoParecer,
                icon: <ClipboardCheck size={11} />,
                tone: regulacao.aguardandoParecer > 0 ? 'blue' : undefined,
              },
              {
                label: 'Ag. agenda',
                value: regulacao.aguardandoAgendamento,
                icon: <CalendarClock size={11} />,
                tone: regulacao.aguardandoAgendamento > 0 ? 'indigo' : undefined,
              },
              {
                label: 'Deferidos',
                value: regulacao.deferidosMes,
                tone: 'green',
              },
              {
                label: 'Indef.',
                value: regulacao.indeferidosMes,
                tone: regulacao.indeferidosMes > 0 ? 'red' : undefined,
              },
            ]}
          />
        </SetorCard>
        )}

        {/* Financeiro — Barras pendências */}
        {visible.has('financeiro') && (
        <SetorCard
          titulo="Financeiro"
          icone={<Wallet size={16} />}
          href="/fluxo-v2/financeiro"
        >
          <p className="text-[11.5px]" style={{ color: COLORS.muted }}>
            Pendências por tipo
          </p>
          <div style={{ width: '100%', height: 130 }}>
            <ResponsiveContainer>
              <BarChart
                data={financeiro.pendenciasData}
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
                  width={75}
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
                  {financeiro.pendenciasData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div
            className="px-3 py-2.5 flex items-center justify-between"
            style={{
              background: '#F8FAFC',
              border: `1px solid ${COLORS.border}`,
              borderRadius: 8,
            }}
          >
            <div>
              <div
                className="text-[10.5px] font-semibold uppercase"
                style={{ color: COLORS.muted, letterSpacing: '0.06em' }}
              >
                Movimentação do mês
              </div>
              <div
                className="font-mono mt-0.5"
                style={{ color: COLORS.text, fontSize: 16, fontWeight: 600 }}
              >
                {formatBRL(financeiro.emitidoMes + financeiro.diariasMes)}
              </div>
            </div>
            <div className="text-right text-[11px]" style={{ color: COLORS.muted }}>
              <div>Passagens: {formatBRL(financeiro.emitidoMes)}</div>
              <div>Diárias: {formatBRL(financeiro.diariasMes)}</div>
            </div>
          </div>
        </SetorCard>
        )}
      </div>
      )}

      {/* ─── Histórico mensal (6 meses) — full width ─── */}
      {visible.has('tendencia') && (
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
      )}

      {/* ─── Top Regiões / Top Regionais / Top Municípios — conforme perfil ─── */}
      {topWidgets.length > 0 && (
      <div className={`grid ${gridColsClass(topWidgets.length)} gap-4`}>
        {visible.has('topRegioes') && (
        <ChartCard titulo="Top regiões" subtitulo="Zona regional do paciente">
          <TopBarChart data={topRegioes} color={COLORS.indigo} width={90} />
        </ChartCard>
        )}

        {visible.has('topRegionais') && (
        <ChartCard titulo="Top regionais" subtitulo="Regional de saúde">
          <TopBarChart data={topRegionais} color={COLORS.amber} width={150} />
        </ChartCard>
        )}

        {visible.has('topMunicipios') && (
        <ChartCard titulo="Top municípios" subtitulo="Origem dos pacientes">
          <TopBarChart data={topMunicipios} color={COLORS.blue} width={110} />
        </ChartCard>
        )}
      </div>
      )}
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
                width: `${Math.min(100, Math.max(0, progress))}%`,
                height: '100%',
                background: accent,
                transition: 'width 240ms ease',
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
      style={{ color: COLORS.muted, height: 220 }}
    >
      {children}
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
      className="grid grid-cols-2 gap-2"
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
/*  AtividadesRecentes — feed compacto de logs de operações do fluxo          */
/* -------------------------------------------------------------------------- */

const ENTIDADES_RELEVANTES = new Set([
  'solicitacoes',
  'pareceres',
  'agendamentos',
  'tentativas_agendamento',
  'rotas_regulacao',
  'viagens',
  'ajudas_custo',
]);

const ENTIDADE_META: Record<string, { label: string; icon: React.ComponentType<{ size?: number }>; color: string }> = {
  solicitacoes:           { label: 'solicitação',  icon: ClipboardList, color: '#146BFA' },
  pareceres:              { label: 'parecer médico', icon: Stethoscope, color: '#7C3AED' },
  agendamentos:           { label: 'agendamento',  icon: CalendarClock, color: '#0891B2' },
  tentativas_agendamento: { label: 'tentativa de agendamento', icon: CalendarClock, color: '#0891B2' },
  rotas_regulacao:        { label: 'rota de regulação', icon: Stethoscope, color: '#7C3AED' },
  viagens:                { label: 'passagem',     icon: Plane, color: '#0EA5E9' },
  ajudas_custo:           { label: 'ajuda de custo', icon: Wallet, color: '#F59E0B' },
};

function acaoVerbo(acao: string): string {
  if (acao === 'INSERT') return 'criou';
  if (acao === 'UPDATE') return 'atualizou';
  if (acao === 'DELETE') return 'excluiu';
  return acao.toLowerCase();
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
      setLogs(filtrados.slice(0, 5));
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
        // Mesma altura visual do donut (header ~50 + chart 220 + paddings)
        minHeight: 0,
      }}
    >
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div>
          <h2 className="text-[14px] font-semibold" style={{ color: COLORS.text }}>
            Atividades recentes
          </h2>
          <p className="text-[12px] mt-0.5" style={{ color: COLORS.muted }}>
            Últimas ações da equipe no fluxo
          </p>
        </div>
        <Link
          href="/sistema/logs"
          className="inline-flex items-center gap-1 text-[12px] hover:underline"
          style={{ color: COLORS.blue }}
        >
          Ver todos <ArrowUpRight size={12} />
        </Link>
      </div>

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
        <ul className="flex flex-col">
          {logs.map((l, idx) => {
            const meta = ENTIDADE_META[l.entidade_alterada] ?? { label: l.entidade_alterada, icon: FileText, color: '#64748B' };
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
                    <span style={{ fontWeight: 500 }}>{l.nome_usuario ?? 'Sistema'}</span>{' '}
                    <span style={{ color: COLORS.muted }}>{acaoVerbo(l.acao)}</span>{' '}
                    <span>{meta.label}</span>
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
      )}
    </section>
  );
}
