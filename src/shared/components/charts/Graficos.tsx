'use client';

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

/**
 * Templates de gráfico do Painel, compartilhados com outras telas (ex.: IA).
 * Mesma paleta, tooltip e proporções do dashboard.
 */

export const CORES_GRAFICO = {
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

/** Ordem de cores das fatias do donut (mesma família do Painel). */
export const SEQUENCIA_CORES = [CORES_GRAFICO.blue, CORES_GRAFICO.indigo, CORES_GRAFICO.amber, CORES_GRAFICO.cyan, CORES_GRAFICO.green, CORES_GRAFICO.orange];

export const TOOLTIP_ESTILO = {
  background: 'white',
  border: `1px solid ${CORES_GRAFICO.border}`,
  borderRadius: 8,
  fontSize: 12,
};

export interface PontoGrafico {
  name: string;
  value: number;
}

type Formatador = (v: number) => string;

export function EmptyChart({ children, altura = 220 }: { children: React.ReactNode; altura?: number }) {
  return (
    <div className="flex items-center justify-center text-[12px]" style={{ color: CORES_GRAFICO.muted, height: altura }}>
      {children}
    </div>
  );
}

/** Ranking em barras horizontais (Top regiões, regionais, municípios do Painel). */
export function TopBarChart({
  data, color = CORES_GRAFICO.blue, width, formatar, altura = 240,
}: { data: PontoGrafico[]; color?: string; width: number; formatar?: Formatador; altura?: number }) {
  if (data.length === 0) return <EmptyChart>Sem dados</EmptyChart>;
  return (
    <div style={{ width: '100%', height: altura }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: formatar ? 96 : 24, left: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: CORES_GRAFICO.text }} axisLine={false} tickLine={false} width={width} />
          <Tooltip contentStyle={TOOLTIP_ESTILO} cursor={{ fill: '#F8FAFC' }} formatter={formatar ? (v) => [formatar(Number(v)), ''] : undefined} />
          <Bar dataKey="value" fill={color} radius={[0, 6, 6, 0]} barSize={14}>
            <LabelList
              dataKey="value"
              position="right"
              formatter={formatar ? (v: unknown) => formatar(Number(v)) : undefined}
              style={{ fontSize: 11, fill: CORES_GRAFICO.muted, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Distribuição em donut (Distribuição por setor do Painel). */
export function DonutChart({ data, formatar, altura = 220 }: { data: PontoGrafico[]; formatar?: Formatador; altura?: number }) {
  if (data.length === 0) return <EmptyChart altura={altura}>Sem dados</EmptyChart>;
  return (
    <div style={{ width: '100%', height: altura }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={82} paddingAngle={2} strokeWidth={0}>
            {data.map((_, i) => <Cell key={i} fill={SEQUENCIA_CORES[i % SEQUENCIA_CORES.length]} />)}
          </Pie>
          <Tooltip contentStyle={TOOLTIP_ESTILO} formatter={formatar ? (v) => formatar(Number(v)) : undefined} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Evolução no tempo em área (Novas solicitações do Painel). */
export function TendenciaChart({
  data, nome, formatar, altura = 180, id = 'tendencia',
}: { data: PontoGrafico[]; nome: string; formatar?: Formatador; altura?: number; id?: string }) {
  if (data.length === 0) return <EmptyChart altura={altura}>Sem dados</EmptyChart>;
  return (
    <div style={{ width: '100%', height: altura }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CORES_GRAFICO.blue} stopOpacity={0.35} />
              <stop offset="100%" stopColor={CORES_GRAFICO.blue} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: CORES_GRAFICO.muted }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip contentStyle={TOOLTIP_ESTILO} formatter={(v) => [formatar ? formatar(Number(v)) : (v as number), nome]} />
          <Area type="monotone" dataKey="value" stroke={CORES_GRAFICO.blue} strokeWidth={2} fill={`url(#grad-${id})`} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Colunas por período (Tendência últimos 6 meses do Painel), com o valor em cima de cada coluna. */
export function ColunasChart({
  data, nome, formatar, altura = 220, color = CORES_GRAFICO.blue,
}: { data: PontoGrafico[]; nome: string; formatar?: Formatador; altura?: number; color?: string }) {
  if (data.length === 0) return <EmptyChart altura={altura}>Sem dados</EmptyChart>;
  return (
    <div style={{ width: '100%', height: altura }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 22, right: 12, left: 12, bottom: 0 }}>
          <CartesianGrid stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: CORES_GRAFICO.muted }} axisLine={false} tickLine={false} interval={0} />
          <YAxis hide />
          <Tooltip contentStyle={TOOLTIP_ESTILO} cursor={{ fill: '#F8FAFC' }} formatter={(v) => [formatar ? formatar(Number(v)) : (v as number), nome]} />
          <Bar dataKey="value" name={nome} fill={color} radius={[6, 6, 0, 0]} maxBarSize={48}>
            <LabelList
              dataKey="value"
              position="top"
              formatter={formatar ? (v: unknown) => formatar(Number(v)) : undefined}
              style={{ fontSize: 11, fill: CORES_GRAFICO.muted, fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Legenda em bolinha usada nos cards do Painel. */
export function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: color }} />
      {label}
    </span>
  );
}
