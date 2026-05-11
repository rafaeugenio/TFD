'use client';

import { useMemo, useState } from 'react';
import SortTh, { compareValues, nextSort, type SortDir } from '@/shared/components/sort-th/SortTh';
import {
  Palette,
  Type,
  Ruler,
  Shapes,
  Sparkles,
  LayoutGrid,
  Component,
  Mouse,
  Bell,
  Image as ImageIcon,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  Filter,
  Download,
  X,
  Copy,
  Check,
  // Sidebar / navegação principal
  LayoutDashboard,
  Microscope,
  Stethoscope,
  ClipboardCheck,
  MapPin,
  Plane,
  Wallet,
  CalendarClock,
  LogOut,
  Contact,
  Building2,
  ShieldAlert,
  Shield,
  Users,
  BarChart3,
  Settings,
  ScrollText,
  FileText,
  ChevronsLeft,
  ChevronsRight,
  // Ações
  Upload,
  Send,
  SendHorizonal,
  Eye,
  RefreshCw,
  RefreshCcw,
  ExternalLink,
  Paperclip,
  // Navegação inline
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  // Feedback / status
  Loader2,
  Ban,
  Lock,
  Power,
  // Domínio (saúde / TFD)
  Activity,
  Heart,
  Calendar,
  Clock,
  Timer,
  CreditCard,
  DollarSign,
  Hash,
  Mail,
  Phone,
  User,
  UserCheck,
  UserPlus,
  UserRound,
  UserX,
  Award,
  ShieldCheck,
  Ticket,
  TrendingUp,
  Skull,
  GitCompareArrows,
  Map,
  List,
  CalendarRange,
  FileSignature,
  XOctagon,
} from 'lucide-react';
import PageHeader from '@/shared/components/page-header/PageHeader';
import Drawer from '@/shared/components/drawer/Drawer';

/* ──────────────────────────────────────────────────────
   TFD Design System — Página de referência para devs
   Documenta tokens, componentes e padrões do sistema.
   ────────────────────────────────────────────────────── */

type TabKey =
  | 'overview'
  | 'colors'
  | 'typography'
  | 'spacing'
  | 'radius-shadow'
  | 'motion'
  | 'layout'
  | 'icons'
  | 'buttons'
  | 'forms'
  | 'tags-badges'
  | 'feedback'
  | 'overlays'
  | 'data'
  | 'patterns';

interface Tab {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  group: 'Fundamentos' | 'Componentes' | 'Padrões';
}

const TABS: Tab[] = [
  { key: 'overview',      label: 'Visão Geral',     icon: Sparkles,   group: 'Fundamentos' },
  { key: 'colors',        label: 'Cores',           icon: Palette,    group: 'Fundamentos' },
  { key: 'typography',    label: 'Tipografia',      icon: Type,       group: 'Fundamentos' },
  { key: 'spacing',       label: 'Espaçamento',     icon: Ruler,      group: 'Fundamentos' },
  { key: 'radius-shadow', label: 'Radius & Shadow', icon: Shapes,     group: 'Fundamentos' },
  { key: 'motion',        label: 'Motion',          icon: Mouse,      group: 'Fundamentos' },
  { key: 'layout',        label: 'Layout',          icon: LayoutGrid, group: 'Fundamentos' },
  { key: 'icons',         label: 'Ícones',          icon: ImageIcon,  group: 'Fundamentos' },
  { key: 'buttons',       label: 'Botões',          icon: Component,  group: 'Componentes' },
  { key: 'forms',         label: 'Formulários',     icon: Component,  group: 'Componentes' },
  { key: 'tags-badges',   label: 'Tags & Badges',   icon: Component,  group: 'Componentes' },
  { key: 'feedback',      label: 'Mensagens',       icon: Bell,       group: 'Componentes' },
  { key: 'overlays',      label: 'Diálogos',        icon: Component,  group: 'Componentes' },
  { key: 'data',          label: 'Tabelas & KPIs',  icon: Component,  group: 'Componentes' },
  { key: 'patterns',      label: 'Padrões de Página', icon: LayoutGrid, group: 'Padrões' },
];

export default function DesignSystemPage() {
  const [tab, setTab] = useState<TabKey>('overview');

  const groups: Tab['group'][] = ['Fundamentos', 'Componentes', 'Padrões'];

  return (
    <>
      <PageHeader
        title="Design System"
        subtitle="Referência viva de tokens, componentes e padrões usados no TFD — base PrimeOne 4.0.0 / Inter / Blue Primary."
        breadcrumbs={[{ label: 'Sistema', href: '/sistema/configuracoes' }]}
      />

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar de tabs */}
        <aside className="col-span-12 lg:col-span-3 xl:col-span-2">
          <nav className="lg:sticky lg:top-6 space-y-5">
            {groups.map((group) => (
              <div key={group}>
                <h3
                  className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: 'var(--tfd-text-muted)' }}
                >
                  {group}
                </h3>
                <ul className="space-y-0.5">
                  {TABS.filter((t) => t.group === group).map((t) => {
                    const Icon = t.icon;
                    const active = t.key === tab;
                    return (
                      <li key={t.key}>
                        <button
                          type="button"
                          onClick={() => setTab(t.key)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-[13px] rounded-md transition-colors duration-150"
                          style={{
                            background: active ? 'var(--tfd-blue-50)' : 'transparent',
                            color: active ? 'var(--tfd-blue-700)' : 'var(--tfd-text-secondary)',
                            fontWeight: active ? 600 : 500,
                          }}
                          onMouseEnter={(e) => {
                            if (!active) e.currentTarget.style.background = 'var(--tfd-100)';
                          }}
                          onMouseLeave={(e) => {
                            if (!active) e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <Icon size={15} />
                          <span>{t.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Conteúdo */}
        <section className="col-span-12 lg:col-span-9 xl:col-span-10 min-w-0">
          {tab === 'overview'      && <OverviewSection />}
          {tab === 'colors'        && <ColorsSection />}
          {tab === 'typography'    && <TypographySection />}
          {tab === 'spacing'       && <SpacingSection />}
          {tab === 'radius-shadow' && <RadiusShadowSection />}
          {tab === 'motion'        && <MotionSection />}
          {tab === 'layout'        && <LayoutSection />}
          {tab === 'icons'         && <IconsSection />}
          {tab === 'buttons'       && <ButtonsSection />}
          {tab === 'forms'         && <FormsSection />}
          {tab === 'tags-badges'   && <TagsBadgesSection />}
          {tab === 'feedback'      && <FeedbackSection />}
          {tab === 'overlays'      && <OverlaysSection />}
          {tab === 'data'          && <DataSection />}
          {tab === 'patterns'      && <PatternsSection />}
        </section>
      </div>
    </>
  );
}

/* ──────────────────────────────────────────────────────
   Helpers de apresentação
   ────────────────────────────────────────────────────── */

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="mb-6">
      <h2
        className="text-[20px] font-bold"
        style={{ color: '#1A1D2B', letterSpacing: '-0.02em' }}
      >
        {title}
      </h2>
      {description && (
        <p className="mt-1 text-[14px]" style={{ color: 'var(--tfd-text-secondary)' }}>
          {description}
        </p>
      )}
    </header>
  );
}

function SubSection({
  title,
  children,
  hint,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="tfd-panel mb-6">
      <div className="tfd-panel-header">
        <div>
          <h3 className="text-[15px] font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
            {title}
          </h3>
          {hint && (
            <p className="mt-0.5 text-[12px]" style={{ color: 'var(--tfd-text-muted)' }}>
              {hint}
            </p>
          )}
        </div>
      </div>
      <div className="tfd-panel-content">{children}</div>
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div className="relative group mt-3">
      <pre
        className="overflow-x-auto rounded-md p-3 text-[12px] leading-relaxed"
        style={{
          background: 'var(--tfd-900)',
          color: 'var(--tfd-100)',
          fontFamily: 'var(--tfd-mono)',
        }}
      >
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={handleCopy}
        className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded transition-opacity opacity-0 group-hover:opacity-100"
        style={{ background: 'var(--tfd-700)', color: 'white' }}
        aria-label="Copiar código"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  );
}

function TokenRow({
  token,
  value,
  description,
}: {
  token: string;
  value: string;
  description?: string;
}) {
  return (
    <tr>
      <td>
        <code
          className="text-[12px]"
          style={{ fontFamily: 'var(--tfd-mono)', color: 'var(--tfd-blue-700)' }}
        >
          {token}
        </code>
      </td>
      <td>
        <span className="text-[13px]" style={{ color: 'var(--tfd-text-primary)' }}>
          {value}
        </span>
      </td>
      {description !== undefined && (
        <td>
          <span className="text-[13px]" style={{ color: 'var(--tfd-text-muted)' }}>
            {description}
          </span>
        </td>
      )}
    </tr>
  );
}

function Swatch({
  hex,
  token,
  textOnDark,
}: {
  hex: string;
  token: string;
  textOnDark?: boolean;
}) {
  return (
    <div
      className="flex flex-col rounded-lg overflow-hidden border"
      style={{ borderColor: 'var(--tfd-200)' }}
    >
      <div className="h-16" style={{ background: hex }} />
      <div className="px-3 py-2 bg-white">
        <div
          className="text-[11px] font-semibold"
          style={{ color: 'var(--tfd-text-primary)', fontFamily: 'var(--tfd-mono)' }}
        >
          {token}
        </div>
        <div className="text-[10px]" style={{ color: 'var(--tfd-text-muted)' }}>
          {hex.toUpperCase()}
        </div>
      </div>
      {textOnDark}
    </div>
  );
}

/* ──────────────────────────────────────────────────────
   SEÇÕES
   ────────────────────────────────────────────────────── */

function OverviewSection() {
  return (
    <>
      <SectionHeader
        title="Visão Geral"
        description="Princípios e estrutura do design system do TFD."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="tfd-card">
          <div className="tfd-card-title">Base</div>
          <div className="tfd-card-subtitle mt-1">PrimeOne 4.0.0 + shadcn/ui (estilo base-nova) + Tailwind v4</div>
          <p className="mt-3 text-[13px]" style={{ color: 'var(--tfd-text-secondary)' }}>
            A fonte de verdade dos tokens é <code>src/styles/variables.css</code>. O Tailwind apenas
            espelha esses tokens via <code>tailwind.config.ts</code>.
          </p>
        </div>
        <div className="tfd-card">
          <div className="tfd-card-title">Identidade</div>
          <div className="tfd-card-subtitle mt-1">Inter • Blue Primary • Slate Neutrals</div>
          <p className="mt-3 text-[13px]" style={{ color: 'var(--tfd-text-secondary)' }}>
            Visual sóbrio, denso de informação e legível em telas operacionais. Sombras em 4 camadas,
            radius progressivo, hover sutil em <code>--tfd-100</code>.
          </p>
        </div>
      </div>

      <SubSection
        title="Princípios"
        hint="Nortes de decisão usados em todo o sistema."
      >
        <ul className="space-y-3 text-[14px]" style={{ color: 'var(--tfd-text-secondary)' }}>
          <li>
            <strong style={{ color: 'var(--tfd-text-primary)' }}>Densidade controlada.</strong>{' '}
            Páginas operacionais com muita informação — preferir <code>text-[13px]</code> /{' '}
            <code>text-[14px]</code>, paddings de 12–16px e radius de 6–8px.
          </li>
          <li>
            <strong style={{ color: 'var(--tfd-text-primary)' }}>Cor como sinal.</strong> Azul é
            ação primária; severidade (success/warn/danger/info) sempre vem em par background+texto
            para garantir contraste WCAG AA.
          </li>
          <li>
            <strong style={{ color: 'var(--tfd-text-primary)' }}>Tokens, não valores soltos.</strong>{' '}
            Sempre que possível, usar variáveis <code>--tfd-*</code> ou classes <code>tfd-*</code>{' '}
            ao invés de hex inline.
          </li>
          <li>
            <strong style={{ color: 'var(--tfd-text-primary)' }}>Animação revela, não distrai.</strong>{' '}
            Reveals (<code>.tfd-reveal</code>, <code>.tfd-stagger</code>) em entrada de página.
            Hover usa <code>200ms</code>, modal/drawer usa <code>300ms</code>.
          </li>
        </ul>
      </SubSection>

      <SubSection
        title="Estrutura de arquivos"
        hint="Onde cada coisa mora."
      >
        <div className="tfd-table-wrap">
          <table className="tfd-table">
            <thead>
              <tr>
                <th>Caminho</th>
                <th>Responsabilidade</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>src/styles/variables.css</code></td>
                <td>Tokens primitivos e semânticos (cores, radius, shadow, motion, layout).</td>
              </tr>
              <tr>
                <td><code>src/app/globals.css</code></td>
                <td>Classes utilitárias <code>tfd-*</code> derivadas dos tokens.</td>
              </tr>
              <tr>
                <td><code>tailwind.config.ts</code></td>
                <td>Espelho das variáveis para o Tailwind.</td>
              </tr>
              <tr>
                <td><code>src/components/ui/*</code></td>
                <td>Componentes shadcn/ui (Base UI). Use quando precisar de comportamento (focus trap, keyboard nav).</td>
              </tr>
              <tr>
                <td><code>src/shared/components/*</code></td>
                <td>Componentes do produto (PageHeader, StatusTag, Drawer, Toast, etc.).</td>
              </tr>
            </tbody>
          </table>
        </div>
      </SubSection>
    </>
  );
}

function ColorsSection() {
  const blue = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
  const blueHex: Record<number, string> = {
    50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd',
    400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8',
    800: '#1e40af', 900: '#1e3a8a',
  };
  const slate = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  const slateHex: Record<number, string> = {
    50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
    400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155',
    800: '#1e293b', 900: '#0f172a', 950: '#020617',
  };

  return (
    <>
      <SectionHeader
        title="Cores"
        description="Paleta primitiva (Blue + Slate) e tokens semânticos (surface, text, severidade)."
      />

      <SubSection title="Blue — primária" hint="Token: --tfd-blue-* | Tailwind: bg-tfd-blue-500, text-tfd-blue-700">
        <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
          {blue.map((s) => (
            <Swatch key={s} hex={blueHex[s]} token={`blue-${s}`} />
          ))}
        </div>
        <CodeBlock code={`color: var(--tfd-blue);            /* 500 */
background: var(--tfd-blue-50);
className="bg-tfd-blue-500 text-white"`} />
      </SubSection>

      <SubSection title="Slate — neutros" hint="Token: --tfd-50 ... --tfd-950 | Base de superfícies, bordas e texto">
        <div className="grid grid-cols-5 md:grid-cols-11 gap-2">
          {slate.map((s) => (
            <Swatch key={s} hex={slateHex[s]} token={`slate-${s}`} />
          ))}
        </div>
      </SubSection>

      <SubSection title="Severidade" hint="Sempre em par cor + background, com contraste AA garantido.">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { name: 'success', fg: '#22c55e', bg: '#f0fdf4', token: '--tfd-success' },
            { name: 'warning', fg: '#f97316', bg: '#fff7ed', token: '--tfd-warning' },
            { name: 'danger',  fg: '#ef4444', bg: '#fef2f2', token: '--tfd-danger'  },
            { name: 'info',    fg: '#0ea5e9', bg: '#f0f9ff', token: '--tfd-info'    },
          ].map((c) => (
            <div
              key={c.name}
              className="rounded-lg p-4 border"
              style={{ background: c.bg, borderColor: 'var(--tfd-200)' }}
            >
              <div className="text-[12px] font-semibold uppercase tracking-wide" style={{ color: c.fg }}>
                {c.name}
              </div>
              <div className="mt-2 text-[11px]" style={{ color: 'var(--tfd-text-muted)', fontFamily: 'var(--tfd-mono)' }}>
                {c.token}
              </div>
              <div className="mt-1 text-[11px]" style={{ color: 'var(--tfd-text-muted)', fontFamily: 'var(--tfd-mono)' }}>
                fg {c.fg} · bg {c.bg}
              </div>
            </div>
          ))}
        </div>
      </SubSection>

      <SubSection title="Tokens semânticos" hint="Use estes tokens — não as cores brutas — em qualquer código novo.">
        <div className="tfd-table-wrap">
          <table className="tfd-table">
            <thead>
              <tr>
                <th>Token</th>
                <th>Valor</th>
                <th>Uso</th>
              </tr>
            </thead>
            <tbody>
              <TokenRow token="--tfd-surface-ground"  value="--tfd-50"   description="Fundo da página (atrás dos cards)" />
              <TokenRow token="--tfd-surface-card"    value="--tfd-white" description="Card, painel, dialog" />
              <TokenRow token="--tfd-surface-sidebar" value="--tfd-white" description="Sidebar e header" />
              <TokenRow token="--tfd-surface-hover"   value="--tfd-100"  description="Hover de linha de tabela e item de menu" />
              <TokenRow token="--tfd-surface-border"  value="--tfd-200"  description="Borda padrão de superfícies" />
              <TokenRow token="--tfd-text-primary"    value="--tfd-700"  description="Títulos, texto de body em destaque" />
              <TokenRow token="--tfd-text-secondary"  value="--tfd-600"  description="Texto de body padrão" />
              <TokenRow token="--tfd-text-muted"      value="--tfd-500"  description="Labels, captions, helper text" />
              <TokenRow token="--tfd-text-on-primary" value="--tfd-white" description="Texto sobre fundo azul" />
              <TokenRow token="--tfd-form-border"     value="--tfd-300"  description="Borda de inputs em estado default" />
              <TokenRow token="--tfd-form-focus"      value="--tfd-blue" description="Borda + ring de input em foco" />
              <TokenRow token="--tfd-form-invalid"    value="#f87171"    description="Input com erro" />
            </tbody>
          </table>
        </div>
      </SubSection>
    </>
  );
}

function TypographySection() {
  return (
    <>
      <SectionHeader
        title="Tipografia"
        description="Fonte Inter (300–700). Mono: JetBrains Mono. Tracking negativo (-0.01em a -0.025em) em títulos."
      />

      <SubSection title="Família" hint="Carregada via next/font/google em src/app/layout.tsx">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border p-4" style={{ borderColor: 'var(--tfd-200)' }}>
            <div className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--tfd-text-muted)' }}>Sans</div>
            <div className="mt-2 text-[28px] font-semibold" style={{ letterSpacing: '-0.02em' }}>Inter</div>
            <div className="mt-1 text-[12px]" style={{ color: 'var(--tfd-text-muted)', fontFamily: 'var(--tfd-mono)' }}>var(--tfd-font)</div>
          </div>
          <div className="rounded-lg border p-4" style={{ borderColor: 'var(--tfd-200)' }}>
            <div className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--tfd-text-muted)' }}>Mono</div>
            <div className="mt-2 text-[28px] font-semibold" style={{ fontFamily: 'var(--tfd-mono)' }}>JetBrains Mono</div>
            <div className="mt-1 text-[12px]" style={{ color: 'var(--tfd-text-muted)', fontFamily: 'var(--tfd-mono)' }}>var(--tfd-mono)</div>
          </div>
        </div>
      </SubSection>

      <SubSection title="Escala" hint="Convenção pragmática usada nas telas atuais.">
        <div className="space-y-4">
          <ScaleItem size="22px" weight={700} tracking="-0.02em" label="Page title" code="text-[22px] font-bold" />
          <ScaleItem size="20px" weight={700} tracking="-0.02em" label="Section h2" code="text-[20px] font-bold" />
          <ScaleItem size="16px" weight={600} tracking="-0.01em" label="Card / Dialog title" code="text-base font-semibold" />
          <ScaleItem size="15px" weight={600} label="Subtitle / Sub-section" code="text-[15px] font-semibold" />
          <ScaleItem size="14px" weight={500} label="Body" code="text-sm" />
          <ScaleItem size="13px" weight={500} label="Body small / Botões" code="text-[13px]" />
          <ScaleItem size="12px" weight={500} label="Caption / helper" code="text-[12px]" />
          <ScaleItem size="11px" weight={600} label="Overline / table head" code="text-[11px] uppercase tracking-wider" />
        </div>
      </SubSection>

      <SubSection title="Pesos" hint="Use o mínimo necessário — pesos extras pesam o bundle da fonte.">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { w: 300, l: 'Light' },
            { w: 400, l: 'Regular' },
            { w: 500, l: 'Medium' },
            { w: 600, l: 'Semibold' },
            { w: 700, l: 'Bold' },
          ].map((p) => (
            <div key={p.w} className="rounded-lg border p-3" style={{ borderColor: 'var(--tfd-200)' }}>
              <div className="text-[20px]" style={{ fontWeight: p.w }}>Aa Bb 123</div>
              <div className="mt-1 text-[12px]" style={{ color: 'var(--tfd-text-muted)' }}>{p.w} · {p.l}</div>
            </div>
          ))}
        </div>
      </SubSection>
    </>
  );
}

function ScaleItem({
  size,
  weight,
  tracking,
  label,
  code,
}: {
  size: string;
  weight: number;
  tracking?: string;
  label: string;
  code: string;
}) {
  return (
    <div className="flex items-baseline gap-4 pb-3 border-b" style={{ borderColor: 'var(--tfd-100)' }}>
      <div style={{ fontSize: size, fontWeight: weight, letterSpacing: tracking, color: 'var(--tfd-text-primary)' }}>
        {label}
      </div>
      <div className="ml-auto flex items-center gap-3 text-[12px]" style={{ color: 'var(--tfd-text-muted)' }}>
        <span>{size} / {weight}</span>
        <code style={{ fontFamily: 'var(--tfd-mono)', color: 'var(--tfd-blue-700)' }}>{code}</code>
      </div>
    </div>
  );
}

function SpacingSection() {
  const scale = [
    { name: '0.5', px: 2 },
    { name: '1',   px: 4 },
    { name: '2',   px: 8 },
    { name: '3',   px: 12 },
    { name: '4',   px: 16 },
    { name: '5',   px: 20 },
    { name: '6',   px: 24 },
    { name: '8',   px: 32 },
    { name: '10',  px: 40 },
    { name: '12',  px: 48 },
  ];

  return (
    <>
      <SectionHeader
        title="Espaçamento"
        description="Usamos a escala padrão Tailwind (4px base). Recomendações de uso por contexto abaixo."
      />

      <SubSection title="Escala" hint="1 unidade = 0.25rem = 4px">
        <div className="space-y-2">
          {scale.map((s) => (
            <div key={s.name} className="flex items-center gap-3">
              <div className="w-12 text-[12px]" style={{ color: 'var(--tfd-text-muted)', fontFamily: 'var(--tfd-mono)' }}>
                {s.name}
              </div>
              <div className="w-16 text-[12px]" style={{ color: 'var(--tfd-text-muted)' }}>
                {s.px}px
              </div>
              <div className="h-3 rounded-sm" style={{ width: s.px, background: 'var(--tfd-blue-500)' }} />
            </div>
          ))}
        </div>
      </SubSection>

      <SubSection title="Recomendações de uso">
        <div className="tfd-table-wrap">
          <table className="tfd-table">
            <thead>
              <tr>
                <th>Contexto</th>
                <th>Espaçamento</th>
                <th>Exemplo</th>
              </tr>
            </thead>
            <tbody>
              <TokenRow token="Gap entre seções de página" value="32px (gap-8 / mb-8)" description="Entre PageHeader e conteúdo" />
              <TokenRow token="Gap entre cards"            value="16–24px (gap-4 a gap-6)" description="Grid de KPIs, painéis lado a lado" />
              <TokenRow token="Padding de card"            value="24px (p-6)" description="Card padrão (.tfd-card)" />
              <TokenRow token="Padding de campo"           value="8px 12px"   description="Input padrão (.tfd-input)" />
              <TokenRow token="Padding de célula de tabela" value="12px 16px" description=".tfd-table td/th" />
              <TokenRow token="Padding de página (mobile)" value="20px (px-5)" description="AppLayout main" />
              <TokenRow token="Padding de página (desktop)" value="32px (px-8)" description="AppLayout main" />
            </tbody>
          </table>
        </div>
      </SubSection>
    </>
  );
}

function RadiusShadowSection() {
  const radii = [
    { token: '--tfd-radius-xs',   px: 2,  uso: 'Tags, chips pequenos' },
    { token: '--tfd-radius-sm',   px: 4,  uso: 'Tags, badges' },
    { token: '--tfd-radius-md',   px: 6,  uso: 'Inputs, botões, message' },
    { token: '--tfd-radius-lg',   px: 8,  uso: 'Cards, painéis' },
    { token: '--tfd-radius-xl',   px: 12, uso: 'Dialog, drawer' },
    { token: '--tfd-radius-full', px: 9999, uso: 'Avatar, badge contador, pill button' },
  ];

  const shadows = [
    { tier: 1, token: '--tfd-shadow-xs', uso: 'Form fields (input, select, checkbox)' },
    { tier: 2, token: '--tfd-shadow-sm', uso: 'Cards, painéis' },
    { tier: 3, token: '--tfd-shadow-md', uso: 'Overlays, dropdowns, popovers' },
    { tier: 4, token: '--tfd-shadow-lg', uso: 'Modais, dialogs, drawers' },
    { tier: 5, token: '--tfd-shadow-xl', uso: 'Botões "raised" / elevated' },
  ];

  return (
    <>
      <SectionHeader
        title="Radius & Shadow"
        description="Sistema de elevação em 4 camadas (PrimeOne) + escala progressiva de cantos."
      />

      <SubSection title="Border Radius">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {radii.map((r) => (
            <div key={r.token} className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--tfd-200)' }}>
              <div
                className="h-20 m-4 bg-white border"
                style={{
                  borderRadius: `var(${r.token})`,
                  borderColor: 'var(--tfd-300)',
                  background: 'var(--tfd-blue-50)',
                }}
              />
              <div className="px-4 pb-3">
                <code className="text-[11px]" style={{ color: 'var(--tfd-blue-700)', fontFamily: 'var(--tfd-mono)' }}>
                  {r.token}
                </code>
                <div className="text-[11px] mt-1" style={{ color: 'var(--tfd-text-muted)' }}>
                  {r.px === 9999 ? '9999px (pill)' : `${r.px}px`} · {r.uso}
                </div>
              </div>
            </div>
          ))}
        </div>
      </SubSection>

      <SubSection title="Sombras (4 camadas + raised)">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-4">
          {shadows.map((s) => (
            <div key={s.token} className="flex flex-col items-center text-center">
              <div
                className="w-32 h-20 bg-white rounded-lg"
                style={{ boxShadow: `var(${s.token})`, border: '1px solid var(--tfd-200)' }}
              />
              <div className="mt-3 text-[12px]" style={{ color: 'var(--tfd-text-muted)' }}>
                Tier {s.tier}
              </div>
              <code className="text-[11px]" style={{ color: 'var(--tfd-blue-700)', fontFamily: 'var(--tfd-mono)' }}>
                {s.token}
              </code>
              <div className="text-[11px] mt-1" style={{ color: 'var(--tfd-text-muted)' }}>{s.uso}</div>
            </div>
          ))}
        </div>
      </SubSection>
    </>
  );
}

function MotionSection() {
  return (
    <>
      <SectionHeader
        title="Motion"
        description="Easings e durações padronizadas. Use sempre os tokens — nunca timing functions soltos."
      />

      <SubSection title="Tokens">
        <div className="tfd-table-wrap">
          <table className="tfd-table">
            <thead>
              <tr>
                <th>Token</th>
                <th>Valor</th>
                <th>Uso</th>
              </tr>
            </thead>
            <tbody>
              <TokenRow token="--tfd-ease"            value="cubic-bezier(0.22, 1, 0.36, 1)" description="Padrão (entradas e hovers)" />
              <TokenRow token="--tfd-ease-out"        value="cubic-bezier(0, 0, 0.2, 1)"     description="Saídas e expansões" />
              <TokenRow token="--tfd-ease-in"         value="cubic-bezier(0.4, 0, 1, 1)"     description="Saídas curtas" />
              <TokenRow token="--tfd-duration"        value="200ms" description="Hover, focus, mudança de estado" />
              <TokenRow token="--tfd-duration-slow"   value="400ms" description="Drawer, dialog" />
              <TokenRow token="--tfd-duration-reveal" value="600ms" description="Reveal de página (.tfd-reveal, .tfd-stagger)" />
            </tbody>
          </table>
        </div>
      </SubSection>

      <SubSection title="Reveals" hint="Animações de entrada de página — disponíveis como classes utilitárias.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-lg border p-4" style={{ borderColor: 'var(--tfd-200)' }}>
            <div className="text-[13px] font-semibold mb-2">.tfd-reveal</div>
            <p className="text-[12px]" style={{ color: 'var(--tfd-text-muted)' }}>
              Fade + translateY 8px → 0 em 600ms. Use no container raiz da página ou de uma seção.
            </p>
          </div>
          <div className="rounded-lg border p-4" style={{ borderColor: 'var(--tfd-200)' }}>
            <div className="text-[13px] font-semibold mb-2">.tfd-stagger</div>
            <p className="text-[12px]" style={{ color: 'var(--tfd-text-muted)' }}>
              Aplica fade-up nos filhos diretos com delay incremental de 60ms (1º a 12º filho).
            </p>
          </div>
        </div>
      </SubSection>
    </>
  );
}

function LayoutSection() {
  return (
    <>
      <SectionHeader
        title="Layout"
        description="Shell de aplicação: sidebar fixa + header opcional + área de conteúdo."
      />

      <SubSection title="Tokens de layout">
        <div className="tfd-table-wrap">
          <table className="tfd-table">
            <thead>
              <tr>
                <th>Token</th>
                <th>Valor</th>
                <th>Uso</th>
              </tr>
            </thead>
            <tbody>
              <TokenRow token="--tfd-sidebar-w"    value="256px" description="Sidebar expandida (desktop ≥ 1280px)" />
              <TokenRow token="--tfd-sidebar-w-sm" value="72px"  description="Sidebar colapsada (768px – 1279px)" />
              <TokenRow token="--tfd-header-h"     value="64px"  description="Altura do header (quando presente)" />
              <TokenRow token="--tfd-content-pad"  value="2rem"  description="Padding lateral da área de conteúdo (desktop)" />
            </tbody>
          </table>
        </div>
      </SubSection>

      <SubSection title="Breakpoints">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { n: 'sm', w: '640px', uso: 'Desktops pequenos' },
            { n: 'md', w: '768px', uso: 'Sidebar colapsa' },
            { n: 'lg', w: '1024px', uso: 'Layouts em 2 colunas' },
            { n: 'xl', w: '1280px', uso: 'Sidebar expande' },
          ].map((b) => (
            <div key={b.n} className="rounded-lg border p-3" style={{ borderColor: 'var(--tfd-200)' }}>
              <div className="text-[14px] font-semibold">{b.n}</div>
              <div className="text-[12px]" style={{ color: 'var(--tfd-text-muted)' }}>{b.w}</div>
              <div className="text-[11px] mt-1" style={{ color: 'var(--tfd-text-muted)' }}>{b.uso}</div>
            </div>
          ))}
        </div>
      </SubSection>

      <SubSection title="Estrutura de página padrão">
        <CodeBlock
          code={`<PageHeader
  title="Título da página"
  subtitle="Descrição curta"
  actions={<button className="tfd-btn tfd-btn-primary">Ação</button>}
/>

<div className="grid grid-cols-12 gap-6">
  {/* conteúdo */}
</div>`}
        />
      </SubSection>
    </>
  );
}

type IconEntry = { Icon: React.ComponentType<{ size?: number }>; name: string; uso: string };

function IconGrid({ items }: { items: IconEntry[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map((i) => (
        <div
          key={i.name}
          className="flex items-center gap-3 rounded-lg border p-3"
          style={{ borderColor: 'var(--tfd-200)' }}
        >
          <div
            className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
            style={{ background: 'var(--tfd-blue-50)', color: 'var(--tfd-blue-700)' }}
          >
            <i.Icon size={18} />
          </div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--tfd-text-primary)' }}>
              {i.name}
            </div>
            <div className="text-[11px] truncate" style={{ color: 'var(--tfd-text-muted)' }}>
              {i.uso}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function IconsSection() {
  const sidebar: IconEntry[] = [
    { Icon: LayoutDashboard, name: 'LayoutDashboard', uso: 'Painel principal' },
    { Icon: FileText,        name: 'FileText',        uso: 'Solicitações' },
    { Icon: Microscope,      name: 'Microscope',      uso: 'Diagnóstico Clínico' },
    { Icon: Stethoscope,     name: 'Stethoscope',     uso: 'Parecer Médico / Médicos' },
    { Icon: ClipboardCheck,  name: 'ClipboardCheck',  uso: 'Regulação' },
    { Icon: MapPin,          name: 'MapPin',          uso: 'Agendamentos / Regionais' },
    { Icon: Plane,           name: 'Plane',           uso: 'Viagens' },
    { Icon: Wallet,          name: 'Wallet',          uso: 'Ajuda de Custo' },
    { Icon: CalendarClock,   name: 'CalendarClock',   uso: 'Permanência' },
    { Icon: LogOut,          name: 'LogOut',          uso: 'Alta / Encerramento · Sair' },
    { Icon: Contact,         name: 'Contact',         uso: 'Pacientes' },
    { Icon: Building2,       name: 'Building2',       uso: 'Unidades de Saúde' },
    { Icon: ShieldAlert,     name: 'ShieldAlert',     uso: 'Autorizações' },
    { Icon: Shield,          name: 'Shield',          uso: 'Permissões' },
    { Icon: Users,           name: 'Users',           uso: 'Usuários' },
    { Icon: BarChart3,       name: 'BarChart3',       uso: 'Relatórios' },
    { Icon: Settings,        name: 'Settings',        uso: 'Configurações' },
    { Icon: ScrollText,      name: 'ScrollText',      uso: 'Logs / Auditoria' },
    { Icon: ChevronsLeft,    name: 'ChevronsLeft',    uso: 'Recolher sidebar' },
    { Icon: ChevronsRight,   name: 'ChevronsRight',   uso: 'Expandir sidebar' },
  ];

  const acoes: IconEntry[] = [
    { Icon: Plus,         name: 'Plus',         uso: 'Adicionar / novo registro' },
    { Icon: Pencil,       name: 'Pencil',       uso: 'Editar' },
    { Icon: Trash2,       name: 'Trash2',       uso: 'Excluir' },
    { Icon: Search,       name: 'Search',       uso: 'Busca' },
    { Icon: Filter,       name: 'Filter',       uso: 'Filtrar' },
    { Icon: Download,     name: 'Download',     uso: 'Exportar / baixar' },
    { Icon: Upload,       name: 'Upload',       uso: 'Enviar arquivo' },
    { Icon: Send,         name: 'Send',         uso: 'Enviar / submeter' },
    { Icon: SendHorizonal,name: 'SendHorizonal',uso: 'Encaminhar' },
    { Icon: Eye,          name: 'Eye',          uso: 'Visualizar detalhe' },
    { Icon: Copy,         name: 'Copy',         uso: 'Copiar para clipboard' },
    { Icon: Check,        name: 'Check',        uso: 'Confirmar' },
    { Icon: RefreshCw,    name: 'RefreshCw',    uso: 'Recarregar / sync' },
    { Icon: RefreshCcw,   name: 'RefreshCcw',   uso: 'Reverter' },
    { Icon: ExternalLink, name: 'ExternalLink', uso: 'Abrir em nova aba' },
    { Icon: Paperclip,    name: 'Paperclip',    uso: 'Anexo' },
    { Icon: X,            name: 'X',            uso: 'Fechar / remover' },
  ];

  const navegacao: IconEntry[] = [
    { Icon: ChevronRight, name: 'ChevronRight', uso: 'Avançar / breadcrumb' },
    { Icon: ChevronLeft,  name: 'ChevronLeft',  uso: 'Voltar paginação' },
    { Icon: ArrowRight,   name: 'ArrowRight',   uso: 'Próxima etapa' },
    { Icon: ArrowLeft,    name: 'ArrowLeft',    uso: 'Etapa anterior / voltar' },
    { Icon: ArrowUpRight, name: 'ArrowUpRight', uso: 'Acessar / link saída' },
  ];

  const feedback: IconEntry[] = [
    { Icon: CheckCircle2, name: 'CheckCircle2', uso: 'Sucesso / aprovado' },
    { Icon: AlertTriangle,name: 'AlertTriangle',uso: 'Aviso / atenção' },
    { Icon: XCircle,      name: 'XCircle',      uso: 'Erro / recusado' },
    { Icon: XOctagon,     name: 'XOctagon',     uso: 'Bloqueio crítico' },
    { Icon: Info,         name: 'Info',         uso: 'Informação' },
    { Icon: Loader2,      name: 'Loader2',      uso: 'Carregando (use animate-spin)' },
    { Icon: Ban,          name: 'Ban',          uso: 'Cancelado / negado' },
    { Icon: Lock,         name: 'Lock',         uso: 'Bloqueado / restrito' },
    { Icon: Power,        name: 'Power',        uso: 'Ativar / desativar' },
  ];

  const dominio: IconEntry[] = [
    { Icon: Activity,        name: 'Activity',        uso: 'Sinais vitais / atividade' },
    { Icon: Heart,           name: 'Heart',           uso: 'Saúde / cuidado' },
    { Icon: Skull,           name: 'Skull',           uso: 'Óbito (relatórios)' },
    { Icon: User,            name: 'User',            uso: 'Usuário genérico' },
    { Icon: UserRound,       name: 'UserRound',       uso: 'Perfil de paciente' },
    { Icon: UserCheck,       name: 'UserCheck',       uso: 'Paciente verificado' },
    { Icon: UserPlus,        name: 'UserPlus',        uso: 'Novo paciente / médico' },
    { Icon: UserX,           name: 'UserX',           uso: 'Paciente removido' },
    { Icon: ShieldCheck,     name: 'ShieldCheck',     uso: 'Autorização concedida' },
    { Icon: Award,           name: 'Award',           uso: 'Concluído com mérito' },
    { Icon: FileSignature,   name: 'FileSignature',   uso: 'Documento assinado' },
    { Icon: Ticket,          name: 'Ticket',          uso: 'Passagem / ticket' },
    { Icon: Map,             name: 'Map',             uso: 'Rota / destino' },
    { Icon: Calendar,        name: 'Calendar',        uso: 'Data' },
    { Icon: CalendarRange,   name: 'CalendarRange',   uso: 'Período / intervalo' },
    { Icon: Clock,           name: 'Clock',           uso: 'Horário' },
    { Icon: Timer,           name: 'Timer',           uso: 'SLA / prazo' },
    { Icon: TrendingUp,      name: 'TrendingUp',      uso: 'Crescimento (KPI)' },
    { Icon: GitCompareArrows,name: 'GitCompareArrows',uso: 'Comparativo (KPI)' },
    { Icon: DollarSign,      name: 'DollarSign',      uso: 'Valor monetário' },
    { Icon: CreditCard,      name: 'CreditCard',      uso: 'Pagamento / recibo' },
    { Icon: Hash,            name: 'Hash',            uso: 'Número de protocolo' },
    { Icon: Mail,            name: 'Mail',            uso: 'E-mail' },
    { Icon: Phone,           name: 'Phone',           uso: 'Telefone' },
    { Icon: List,            name: 'List',            uso: 'Lista / detalhes' },
  ];

  return (
    <>
      <SectionHeader
        title="Ícones"
        description="Biblioteca: lucide-react. Tamanhos: 13–14 (inline em texto), 16 (botões/inputs), 18 (sidebar/menu), 20 (header)."
      />

      <SubSection title="Tamanhos">
        <div className="flex items-end gap-6">
          {[12, 14, 16, 18, 20, 24].map((s) => (
            <div key={s} className="flex flex-col items-center gap-1">
              <Search size={s} />
              <span className="text-[11px]" style={{ color: 'var(--tfd-text-muted)' }}>{s}px</span>
            </div>
          ))}
        </div>
      </SubSection>

      <SubSection title="Sidebar — navegação principal" hint="Ícones do menu lateral. Tamanho padrão: 18px.">
        <IconGrid items={sidebar} />
      </SubSection>

      <SubSection title="Ações" hint="Botões, toolbars e dropdowns. Tamanho padrão em botão: 16px.">
        <IconGrid items={acoes} />
      </SubSection>

      <SubSection title="Navegação inline" hint="Breadcrumbs, paginação, links com saída.">
        <IconGrid items={navegacao} />
      </SubSection>

      <SubSection title="Feedback & status" hint="Pareados com mensagens, tags e estados de loading.">
        <IconGrid items={feedback} />
      </SubSection>

      <SubSection title="Domínio TFD" hint="Ícones que carregam significado de negócio — paciente, viagem, saúde, financeiro.">
        <IconGrid items={dominio} />
      </SubSection>

      <SubSection title="Como importar">
        <CodeBlock code={`import { Plus, Loader2 } from 'lucide-react';

<button className="tfd-btn tfd-btn-primary">
  <Plus size={16} />
  Novo
</button>

{/* Loading: combine com animate-spin */}
<Loader2 size={16} className="animate-spin" />`} />
      </SubSection>
    </>
  );
}

function ButtonsSection() {
  return (
    <>
      <SectionHeader
        title="Botões"
        description="Variantes de severidade + tamanhos. Sempre usar a classe tfd-btn como base."
      />

      <SubSection title="Variantes">
        <div className="flex flex-wrap gap-3">
          <button className="tfd-btn tfd-btn-primary">Primary</button>
          <button className="tfd-btn tfd-btn-secondary">Secondary</button>
          <button className="tfd-btn tfd-btn-outline">Outline</button>
          <button className="tfd-btn tfd-btn-ghost">Ghost</button>
          <button className="tfd-btn tfd-btn-danger">Danger</button>
          <button className="tfd-btn tfd-btn-success">Success</button>
        </div>
        <CodeBlock code={`<button className="tfd-btn tfd-btn-primary">Salvar</button>
<button className="tfd-btn tfd-btn-secondary">Cancelar</button>
<button className="tfd-btn tfd-btn-danger">Excluir</button>`} />
      </SubSection>

      <SubSection title="Tamanhos & modificadores">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <button className="tfd-btn tfd-btn-primary tfd-btn--sm">Small</button>
          <button className="tfd-btn tfd-btn-primary">Default</button>
          <button className="tfd-btn tfd-btn-primary tfd-btn--lg">Large</button>
          <button className="tfd-btn tfd-btn-primary tfd-btn--pill">Pill</button>
          <button className="tfd-btn tfd-btn-ghost tfd-btn--icon-only" aria-label="Editar">
            <Pencil size={16} />
          </button>
        </div>
        <div className="flex gap-3">
          <button className="tfd-btn tfd-btn-primary tfd-btn--full">Full width</button>
        </div>
      </SubSection>

      <SubSection title="Com ícone">
        <div className="flex flex-wrap gap-3">
          <button className="tfd-btn tfd-btn-primary">
            <Plus size={16} /> Nova solicitação
          </button>
          <button className="tfd-btn tfd-btn-outline">
            <Download size={16} /> Exportar
          </button>
          <button className="tfd-btn tfd-btn-danger">
            <Trash2 size={16} /> Excluir
          </button>
        </div>
      </SubSection>

      <SubSection title="Estados">
        <div className="flex flex-wrap gap-3">
          <button className="tfd-btn tfd-btn-primary">Default</button>
          <button className="tfd-btn tfd-btn-primary" disabled>Disabled</button>
          <button className="tfd-btn tfd-btn-primary">
            <span className="inline-block w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
            Carregando…
          </button>
        </div>
      </SubSection>
    </>
  );
}

function FormsSection() {
  return (
    <>
      <SectionHeader
        title="Formulários"
        description="Inputs, labels e mensagens de erro com a classe tfd-input + tfd-label + tfd-field-error."
      />

      <SubSection title="Input simples">
        <div className="max-w-md space-y-1">
          <label className="tfd-label" htmlFor="ds-input-1">Nome do paciente</label>
          <input id="ds-input-1" className="tfd-input" placeholder="Ex: Maria Silva" />
        </div>
        <CodeBlock code={`<label className="tfd-label">Nome do paciente</label>
<input className="tfd-input" placeholder="..." />`} />
      </SubSection>

      <SubSection title="Estados">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
          <div className="space-y-1">
            <label className="tfd-label">Default</label>
            <input className="tfd-input" placeholder="Digite algo" />
          </div>
          <div className="space-y-1">
            <label className="tfd-label">Foco (clique no campo)</label>
            <input className="tfd-input" placeholder="Foque aqui" />
          </div>
          <div className="space-y-1">
            <label className="tfd-label">Disabled</label>
            <input className="tfd-input" placeholder="Desabilitado" disabled />
          </div>
          <div className="space-y-1">
            <label className="tfd-label">Inválido</label>
            <input className="tfd-input tfd-input--invalid" placeholder="CPF inválido" />
            <div className="tfd-field-error">CPF deve ter 11 dígitos.</div>
          </div>
        </div>
      </SubSection>

      <SubSection title="Com ícone à esquerda">
        <div className="max-w-md relative">
          <Search size={16} className="tfd-input-leading-icon" />
          <input className="tfd-input tfd-input--with-leading-icon" placeholder="Buscar paciente..." />
        </div>
      </SubSection>

      <SubSection title="Tamanho compacto">
        <div className="max-w-md">
          <input className="tfd-input tfd-input--sm" placeholder="Filtro inline" />
        </div>
      </SubSection>

      <SubSection title="Textarea & Select" hint="Usam mesma classe tfd-input.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl">
          <div className="space-y-1">
            <label className="tfd-label">Observações</label>
            <textarea className="tfd-input" rows={4} placeholder="Texto longo..." />
          </div>
          <div className="space-y-1">
            <label className="tfd-label">Status</label>
            <select className="tfd-input">
              <option>Pendente</option>
              <option>Aprovado</option>
              <option>Recusado</option>
            </select>
          </div>
        </div>
      </SubSection>
    </>
  );
}

function TagsBadgesSection() {
  return (
    <>
      <SectionHeader
        title="Tags & Badges"
        description="Tags comunicam status; Badges são contadores; Avatars representam pessoas."
      />

      <SubSection title="Tags por severidade">
        <div className="flex flex-wrap gap-2">
          <span className="tfd-tag tfd-tag--success">Aprovado</span>
          <span className="tfd-tag tfd-tag--warning">Pendente</span>
          <span className="tfd-tag tfd-tag--danger">Recusado</span>
          <span className="tfd-tag tfd-tag--info">Em análise</span>
          <span className="tfd-tag tfd-tag--neutral">Rascunho</span>
        </div>
        <CodeBlock code={`<span className="tfd-tag tfd-tag--success">Aprovado</span>`} />
      </SubSection>

      <SubSection title="Tag com dot (status indicator)">
        <div className="flex flex-wrap gap-2">
          <span className="tfd-tag tfd-tag--success tfd-tag--dot">Online</span>
          <span className="tfd-tag tfd-tag--warning tfd-tag--dot">Em viagem</span>
          <span className="tfd-tag tfd-tag--danger tfd-tag--dot">Crítico</span>
        </div>
      </SubSection>

      <SubSection title="Tag arredondada (pill)">
        <div className="flex flex-wrap gap-2">
          <span className="tfd-tag tfd-tag--info tfd-tag--rounded">Nova</span>
          <span className="tfd-tag tfd-tag--neutral tfd-tag--rounded">v2.1</span>
        </div>
      </SubSection>

      <SubSection title="Badges (contadores)">
        <div className="flex flex-wrap items-center gap-4">
          <span className="tfd-badge">3</span>
          <span className="tfd-badge">12</span>
          <span className="tfd-badge">99+</span>
          <div className="relative inline-flex">
            <button className="tfd-btn tfd-btn-ghost tfd-btn--icon-only" aria-label="Notificações">
              <Bell size={16} />
            </button>
            <span className="tfd-badge absolute -top-1 -right-1">5</span>
          </div>
        </div>
      </SubSection>

      <SubSection title="Avatars">
        <div className="flex items-center gap-3">
          <div className="tfd-avatar">RG</div>
          <div className="tfd-avatar tfd-avatar--lg">MS</div>
          <div className="tfd-avatar" style={{ background: 'var(--tfd-success)' }}>JV</div>
          <div className="tfd-avatar" style={{ background: 'var(--tfd-warning)' }}>AL</div>
        </div>
      </SubSection>
    </>
  );
}

function FeedbackSection() {
  return (
    <>
      <SectionHeader
        title="Mensagens & Toast"
        description="Comunicação assíncrona ou contextual com o usuário."
      />

      <SubSection title="Message (banner contextual)">
        <div className="space-y-3">
          <div className="tfd-message tfd-message--success">
            <CheckCircle2 size={18} className="tfd-message-icon" />
            <div>
              <div className="font-semibold">Solicitação aprovada</div>
              <div className="mt-0.5 text-[13px]" style={{ color: 'var(--tfd-text-secondary)' }}>
                A viagem foi gerada automaticamente.
              </div>
            </div>
          </div>
          <div className="tfd-message tfd-message--warn">
            <AlertTriangle size={18} className="tfd-message-icon" />
            <div>
              <div className="font-semibold">Documentação incompleta</div>
              <div className="mt-0.5 text-[13px]" style={{ color: 'var(--tfd-text-secondary)' }}>
                Faltam 2 anexos para concluir o parecer médico.
              </div>
            </div>
          </div>
          <div className="tfd-message tfd-message--danger">
            <XCircle size={18} className="tfd-message-icon" />
            <div>
              <div className="font-semibold">Não foi possível salvar</div>
              <div className="mt-0.5 text-[13px]" style={{ color: 'var(--tfd-text-secondary)' }}>
                Verifique sua conexão e tente novamente.
              </div>
            </div>
          </div>
          <div className="tfd-message tfd-message--info">
            <Info size={18} className="tfd-message-icon" />
            <div>
              <div className="font-semibold">Versão 2.4 disponível</div>
              <div className="mt-0.5 text-[13px]" style={{ color: 'var(--tfd-text-secondary)' }}>
                Novos relatórios e exportação para CSV.
              </div>
            </div>
          </div>
        </div>
        <CodeBlock code={`<div className="tfd-message tfd-message--success">
  <CheckCircle2 size={18} className="tfd-message-icon" />
  <div>
    <div className="font-semibold">Título</div>
    <div className="text-[13px]">Mensagem complementar.</div>
  </div>
</div>`} />
      </SubSection>

      <SubSection
        title="Toast"
        hint="Use o ToastProvider em layout.tsx + hook useToast(). Aparece no canto inferior direito por 4s."
      >
        <CodeBlock code={`import { useToast } from '@/shared/components/toast/Toast';

const { showToast } = useToast();
showToast('Solicitação salva com sucesso', 'success');`} />
      </SubSection>
    </>
  );
}

function OverlaysSection() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <SectionHeader
        title="Diálogos & Drawers"
        description="Overlays para confirmações, formulários longos e detalhe lateral."
      />

      <SubSection title="Dialog (modal centralizado)" hint="Tier 4 shadow + radius xl + scale-in">
        <button className="tfd-btn tfd-btn-primary" onClick={() => setOpen(true)}>
          Abrir dialog
        </button>

        {open && (
          <>
            <div className="tfd-overlay-backdrop" onClick={() => setOpen(false)} />
            <div
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] max-w-md tfd-dialog z-50"
              role="dialog"
              aria-modal="true"
            >
              <div className="tfd-dialog-header flex items-center justify-between">
                <span>Confirmar exclusão</span>
                <button className="tfd-btn tfd-btn-ghost tfd-btn--icon-only" onClick={() => setOpen(false)}>
                  <X size={16} />
                </button>
              </div>
              <div className="tfd-dialog-content text-[14px]" style={{ color: 'var(--tfd-text-secondary)' }}>
                Esta ação não poderá ser desfeita. Deseja continuar?
              </div>
              <div className="tfd-dialog-footer">
                <button className="tfd-btn tfd-btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
                <button className="tfd-btn tfd-btn-danger" onClick={() => setOpen(false)}>Excluir</button>
              </div>
            </div>
          </>
        )}

        <CodeBlock code={`<div className="tfd-overlay-backdrop" />
<div className="tfd-dialog">
  <div className="tfd-dialog-header">Título</div>
  <div className="tfd-dialog-content">Conteúdo</div>
  <div className="tfd-dialog-footer">
    <button className="tfd-btn tfd-btn-ghost">Cancelar</button>
    <button className="tfd-btn tfd-btn-primary">Confirmar</button>
  </div>
</div>`} />
      </SubSection>

      <SubSection
        title="Drawer — visão geral"
        hint="Painel lateral deslizante a partir da direita. Componente: src/shared/components/drawer/Drawer.tsx"
      >
        <DrawerDemo />
      </SubSection>

      <SubSection title="Anatomia do Drawer">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--tfd-200)' }}>
            <div className="flex flex-col" style={{ height: 320, background: 'var(--tfd-50)' }}>
              <div
                className="flex items-start justify-between gap-4 px-5 py-4"
                style={{ background: 'var(--tfd-white)', borderBottom: '1px solid var(--tfd-200)' }}
              >
                <div>
                  <div className="text-[14px] font-semibold">Header</div>
                  <div className="text-[11px]" style={{ color: 'var(--tfd-text-muted)' }}>title + subtitle + close</div>
                </div>
                <div className="tfd-btn tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only"><X size={14} /></div>
              </div>
              <div className="flex-1 px-5 py-4" style={{ background: 'var(--tfd-white)' }}>
                <div className="text-[14px] font-semibold">Content</div>
                <div className="text-[11px]" style={{ color: 'var(--tfd-text-muted)' }}>scroll vertical · padding 20px 24px</div>
              </div>
              <div
                className="flex items-center justify-end gap-2 px-5 py-3"
                style={{ background: 'var(--tfd-white)', borderTop: '1px solid var(--tfd-200)' }}
              >
                <div className="tfd-btn tfd-btn-ghost tfd-btn--sm">Cancelar</div>
                <div className="tfd-btn tfd-btn-primary tfd-btn--sm">Salvar</div>
              </div>
            </div>
          </div>
          <div className="tfd-table-wrap">
            <table className="tfd-table">
              <thead>
                <tr><th>Parte</th><th>Especificação</th></tr>
              </thead>
              <tbody>
                <TokenRow token="Backdrop"     value="rgba(0,0,0,0.4) · z-50 · clique fecha"     description="Sem blur — se distingue do dialog que tem blur" />
                <TokenRow token="Painel"       value="fixed inset-y-0 right-0 · z-50"            description="Sai pela direita" />
                <TokenRow token="Largura"      value="min(width, 100vw) · default 480px"         description="Aceita 'sm' (400) / 'md' (480) / 'lg' (640) / 'xl' (800)" />
                <TokenRow token="Background"   value="var(--tfd-surface-card)"                   description="Branco" />
                <TokenRow token="Shadow"       value="--tfd-shadow-lg (Tier 4)"                  description="Mesma elevação de modal" />
                <TokenRow token="Header"       value="px-6 py-5 · border-bottom 1px --tfd-200"   description="title 18/600 + subtitle 14 secondary + close à direita" />
                <TokenRow token="Content"      value="px-6 py-5 · flex-1 · overflow-y-auto"      description="Scroll independente do header/footer" />
                <TokenRow token="Footer"       value="px-6 py-4 · border-top 1px --tfd-200"      description="Opcional · ações alinhadas à direita" />
                <TokenRow token="Animação"     value="transform translateX 100% → 0 · 250ms ease-in-out" description="Backdrop fade 200ms ease-in-out" />
              </tbody>
            </table>
          </div>
        </div>
      </SubSection>

      <SubSection title="Larguras recomendadas">
        <div className="tfd-table-wrap">
          <table className="tfd-table">
            <thead>
              <tr>
                <th>Tamanho</th>
                <th>Valor</th>
                <th>Quando usar</th>
              </tr>
            </thead>
            <tbody>
              <TokenRow token="sm"  value="400px" description="Visualização de detalhe leitura · 1 coluna de info" />
              <TokenRow token="md (default)" value="480px" description="Form curto · ver/editar registro simples" />
              <TokenRow token="lg"  value="640px" description="Form com 2 colunas · timeline/histórico ao lado" />
              <TokenRow token="xl"  value="800px" description="Wizard multi-etapas · prévia de documento" />
              <TokenRow token="100%" value="100vw" description="Mobile (sempre limitado por min(width, 100vw))" />
            </tbody>
          </table>
        </div>
      </SubSection>

      <SubSection title="Props">
        <div className="tfd-table-wrap">
          <table className="tfd-table">
            <thead>
              <tr>
                <th>Prop</th>
                <th>Tipo</th>
                <th>Descrição</th>
              </tr>
            </thead>
            <tbody>
              <TokenRow token="open"      value="boolean"   description="Controla visibilidade — sempre controlado" />
              <TokenRow token="onClose"   value="() => void" description="Disparado em ESC, clique no backdrop ou no botão X" />
              <TokenRow token="title"     value="string (obrigatório)" description="Título no header — também serve como aria-label" />
              <TokenRow token="subtitle"  value="string?"   description="Texto secundário abaixo do título" />
              <TokenRow token="children"  value="ReactNode" description="Conteúdo principal — vai na área de scroll" />
              <TokenRow token="footer"    value="ReactNode?" description="Botões de ação · se omitido, footer não renderiza" />
              <TokenRow token="width"     value="string?"   description="CSS width (ex: '640px'). Default '480px'" />
            </tbody>
          </table>
        </div>
      </SubSection>

      <SubSection title="Comportamento">
        <ul className="space-y-2 text-[13px]" style={{ color: 'var(--tfd-text-secondary)' }}>
          <li>• <strong style={{ color: 'var(--tfd-text-primary)' }}>Trap de scroll:</strong> ao abrir, <code>document.body.style.overflow = &apos;hidden&apos;</code>.</li>
          <li>• <strong style={{ color: 'var(--tfd-text-primary)' }}>ESC fecha:</strong> listener global removido no unmount.</li>
          <li>• <strong style={{ color: 'var(--tfd-text-primary)' }}>Clique no backdrop fecha.</strong> Clique no painel é stopado.</li>
          <li>• <strong style={{ color: 'var(--tfd-text-primary)' }}>aria-modal=&quot;true&quot;</strong> + <code>role=&quot;dialog&quot;</code> + <code>aria-label=title</code>.</li>
          <li>• <strong style={{ color: 'var(--tfd-text-primary)' }}>Empilhamento:</strong> evite drawer dentro de drawer. Se precisar, abra um dialog modal por cima.</li>
        </ul>
      </SubSection>

      <SubSection title="Quando usar Drawer vs Dialog">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
          <div className="rounded-md border p-3" style={{ borderColor: 'var(--tfd-200)' }}>
            <div className="font-semibold mb-2">Drawer</div>
            <ul className="space-y-1" style={{ color: 'var(--tfd-text-secondary)' }}>
              <li>• Detalhe lateral mantendo o contexto da listagem</li>
              <li>• Form longo (mais de 3 campos) ou multi-seção</li>
              <li>• Edição em massa: usuário abre vários itens em sequência</li>
              <li>• Wizards de múltiplas etapas</li>
            </ul>
          </div>
          <div className="rounded-md border p-3" style={{ borderColor: 'var(--tfd-200)' }}>
            <div className="font-semibold mb-2">Dialog (modal)</div>
            <ul className="space-y-1" style={{ color: 'var(--tfd-text-secondary)' }}>
              <li>• Confirmações destrutivas (excluir, cancelar)</li>
              <li>• Decisões binárias rápidas</li>
              <li>• Mensagens de erro/sucesso que exigem ação imediata</li>
              <li>• Form curto (1–3 campos)</li>
            </ul>
          </div>
        </div>
      </SubSection>

      <SubSection title="Exemplo de uso">
        <CodeBlock code={`import Drawer from '@/shared/components/drawer/Drawer';

const [open, setOpen] = useState(false);

<button className="tfd-btn tfd-btn-primary" onClick={() => setOpen(true)}>
  Ver detalhes
</button>

<Drawer
  open={open}
  onClose={() => setOpen(false)}
  title="Solicitação #10234"
  subtitle="Maria Silva · Aprovada em 12/04/2026"
  width="640px"
  footer={
    <>
      <button className="tfd-btn tfd-btn-ghost" onClick={() => setOpen(false)}>
        Fechar
      </button>
      <button className="tfd-btn tfd-btn-primary">
        Encaminhar
      </button>
    </>
  }
>
  {/* conteúdo do drawer */}
  <section className="space-y-4">
    <div>
      <div className="tfd-label">Paciente</div>
      <div className="text-[14px]">Maria Silva</div>
    </div>
    {/* ... */}
  </section>
</Drawer>`} />
      </SubSection>
    </>
  );
}

function SortableTableDemo() {
  const data = [
    { id: '#10234', paciente: 'Maria Silva',     destino: 'São Luís — MA',   data: '2026-04-12' },
    { id: '#10235', paciente: 'João Pereira',    destino: 'Imperatriz — MA', data: '2026-04-14' },
    { id: '#10236', paciente: 'Ana Souza',       destino: 'Brasília — DF',   data: '2026-04-15' },
    { id: '#10237', paciente: 'Carlos Mendes',   destino: 'Recife — PE',     data: '2026-04-16' },
  ];
  const [sort, setSort] = useState<{ field: string; dir: SortDir }>({ field: 'data', dir: 'desc' });
  const toggleSort = (f: string) => setSort((prev) => nextSort(f, prev));
  const sorted = useMemo(() => {
    if (!sort.field || !sort.dir) return data;
    const get = (r: typeof data[number]) => (r as Record<string, unknown>)[sort.field];
    const s = [...data].sort((a, b) => compareValues(get(a), get(b)));
    return sort.dir === 'desc' ? s.reverse() : s;
  }, [sort]);
  return (
    <div className="tfd-table-wrap">
      <table className="tfd-table">
        <thead>
          <tr>
            <SortTh label="ID"       field="id"       currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
            <SortTh label="Paciente" field="paciente" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
            <SortTh label="Destino"  field="destino"  currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
            <SortTh label="Data"     field="data"     currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.id}>
              <td><code style={{ fontFamily: 'var(--tfd-mono)' }}>{r.id}</code></td>
              <td>{r.paciente}</td>
              <td>{r.destino}</td>
              <td>{r.data.split('-').reverse().join('/')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DataSection() {
  const rows = [
    { id: '#10234', paciente: 'Maria Silva',     status: 'success', destino: 'São Luís — MA',  data: '12/04/2026' },
    { id: '#10235', paciente: 'João Pereira',    status: 'warning', destino: 'Imperatriz — MA',  data: '14/04/2026' },
    { id: '#10236', paciente: 'Ana Souza',       status: 'info',    destino: 'Brasília — DF',    data: '15/04/2026' },
    { id: '#10237', paciente: 'Carlos Mendes',   status: 'danger',  destino: 'Recife — PE',      data: '16/04/2026' },
  ];

  return (
    <>
      <SectionHeader
        title="Tabelas & KPIs"
        description="Apresentação tabular de dados e cards de métrica para dashboards."
      />

      <SubSection title="KPI (Key Performance Indicator)">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="tfd-kpi">
            <div className="flex items-start justify-between">
              <div>
                <div className="tfd-kpi-label">Solicitações</div>
                <div className="tfd-kpi-value">128</div>
                <div className="tfd-kpi-sub">últimos 30 dias</div>
              </div>
              <div className="tfd-kpi-icon tfd-kpi-icon--blue">
                <CheckCircle2 size={18} />
              </div>
            </div>
            <span className="tfd-kpi-change tfd-kpi-change--up mt-3">+12%</span>
          </div>
          <div className="tfd-kpi">
            <div className="flex items-start justify-between">
              <div>
                <div className="tfd-kpi-label">Aprovadas</div>
                <div className="tfd-kpi-value">94</div>
                <div className="tfd-kpi-sub">73% do total</div>
              </div>
              <div className="tfd-kpi-icon tfd-kpi-icon--green">
                <CheckCircle2 size={18} />
              </div>
            </div>
            <span className="tfd-kpi-change tfd-kpi-change--up mt-3">+5%</span>
          </div>
          <div className="tfd-kpi">
            <div className="flex items-start justify-between">
              <div>
                <div className="tfd-kpi-label">Pendentes</div>
                <div className="tfd-kpi-value">22</div>
                <div className="tfd-kpi-sub">aguardando regulação</div>
              </div>
              <div className="tfd-kpi-icon tfd-kpi-icon--amber">
                <AlertTriangle size={18} />
              </div>
            </div>
            <span className="tfd-kpi-change tfd-kpi-change--down mt-3">−3%</span>
          </div>
          <div className="tfd-kpi">
            <div className="flex items-start justify-between">
              <div>
                <div className="tfd-kpi-label">Recusadas</div>
                <div className="tfd-kpi-value">12</div>
                <div className="tfd-kpi-sub">9% do total</div>
              </div>
              <div className="tfd-kpi-icon tfd-kpi-icon--red">
                <XCircle size={18} />
              </div>
            </div>
          </div>
        </div>
      </SubSection>

      <SubSection title="Card padrão">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="tfd-card">
            <div className="tfd-card-title">Card de informação</div>
            <div className="tfd-card-subtitle mt-1">Subtítulo descritivo</div>
            <p className="mt-3 text-[13px]" style={{ color: 'var(--tfd-text-secondary)' }}>
              Conteúdo principal do card. Bom para resumos, blocos de detalhe e CTAs secundários.
            </p>
          </div>
          <div className="tfd-card-featured">
            <div className="tfd-card-featured-badge">Destaque</div>
            <div className="tfd-card-title">Card destacado</div>
            <div className="tfd-card-subtitle mt-1">Variante com gradiente azul</div>
          </div>
        </div>
      </SubSection>

      <SubSection title="Toolbar" hint="Barra de ações acima de listagens (filtros, busca, criar novo).">
        <div className="tfd-toolbar">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="tfd-input-leading-icon" />
            <input className="tfd-input tfd-input--sm tfd-input--with-leading-icon" placeholder="Buscar..." />
          </div>
          <button className="tfd-btn tfd-btn-outline tfd-btn--sm">
            <Filter size={14} /> Filtros
          </button>
          <button className="tfd-btn tfd-btn-primary tfd-btn--sm ml-auto">
            <Plus size={14} /> Novo
          </button>
        </div>
      </SubSection>

      <SubSection title="Tabela — exemplo padrão">
        <div className="tfd-panel">
          <div className="overflow-x-auto">
            <table className="tfd-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Paciente</th>
                  <th>Status</th>
                  <th>Destino</th>
                  <th>Data</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td><code style={{ fontFamily: 'var(--tfd-mono)' }}>{r.id}</code></td>
                    <td>{r.paciente}</td>
                    <td>
                      <span className={`tfd-tag tfd-tag--${r.status}`}>
                        {r.status === 'success' ? 'Aprovado' : r.status === 'warning' ? 'Pendente' : r.status === 'info' ? 'Em análise' : 'Recusado'}
                      </span>
                    </td>
                    <td>{r.destino}</td>
                    <td>{r.data}</td>
                    <td className="text-right">
                      <button className="tfd-btn tfd-btn-ghost tfd-btn--icon-only" aria-label="Ver">
                        <ChevronRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <CodeBlock code={`<div className="tfd-panel">
  <div className="overflow-x-auto">
    <table className="tfd-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Paciente</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id}>
            <td>{r.id}</td>
            <td>{r.paciente}</td>
            <td><span className="tfd-tag tfd-tag--success">Aprovado</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>`} />
      </SubSection>

      <SubSection title="Tabela com ordenação (padrão Fluxo v2)" hint="Use SortTh nas colunas ordenáveis. Toggle: null → asc → desc → null.">
        <SortableTableDemo />
        <CodeBlock code={`import SortTh, { compareValues, nextSort, type SortDir } from '@/shared/components/sort-th/SortTh';

const [sort, setSort] = useState<{ field: string; dir: SortDir }>({ field: 'data', dir: 'desc' });
const toggleSort = (field: string) => setSort((prev) => nextSort(field, prev));

const ordenadas = useMemo(() => {
  if (!sort.field || !sort.dir) return rows;
  const get = (r) => r[sort.field];
  const sorted = [...rows].sort((a, b) => compareValues(get(a), get(b)));
  return sort.dir === 'desc' ? sorted.reverse() : sorted;
}, [rows, sort]);

<thead>
  <tr>
    <SortTh label="Paciente" field="paciente" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
    <SortTh label="Data"     field="data"     currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
  </tr>
</thead>`} />
      </SubSection>

      <SubSection title="Anatomia da tabela (v2)">
        <div className="tfd-table-wrap">
          <table className="tfd-table">
            <thead>
              <tr>
                <th>Parte</th>
                <th>Especificação</th>
                <th>Token / classe</th>
              </tr>
            </thead>
            <tbody>
              <TokenRow token="Wrapper"      value=".tfd-table-wrap (ou <div> branco + border + radius-lg)" description="white bg · 1px solid --tfd-surface-border · radius-lg · overflow-hidden" />
              <TokenRow token="thead tr"     value="background #F8FAFC + border-bottom" description="header soft / sutil para destacar sem ruído" />
              <TokenRow token="thead th"     value="12px / weight 600 / uppercase / letter-spacing 0.06em" description="cor #64748B · padding 12px 16px" />
              <TokenRow token="tbody td"     value="13px / weight 500 / regular case" description="cor: --tfd-text-primary · padding 14px 16px" />
              <TokenRow token="Borda linha"  value="1px solid --tfd-surface-border" description="border-bottom em cada tr (exceto última)" />
              <TokenRow token="Hover linha"  value="background #F8FAFC + transition 200ms" description="Apenas em tabelas interativas" />
              <TokenRow token="SortTh"       value="cursor-pointer + ícone ArrowUpDown/Up/Down" description="Use para colunas ordenáveis (shared/components/sort-th/SortTh)" />
            </tbody>
          </table>
        </div>
      </SubSection>

      <SubSection title="Tipos de coluna" hint="Convenções de formatação por tipo de dado.">
        <div className="tfd-table-wrap">
          <table className="tfd-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Alinhamento</th>
                <th>Formato</th>
                <th>Exemplo</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Texto</td><td>Esquerda</td><td>Capitalize natural</td><td>Maria Silva</td></tr>
              <tr><td>ID / código</td><td>Esquerda</td><td>Mono + cor primary-700</td><td><code style={{ fontFamily: 'var(--tfd-mono)', color: 'var(--tfd-blue-700)' }}>#10234</code></td></tr>
              <tr><td>Data</td><td>Esquerda</td><td>DD/MM/AAAA</td><td>12/04/2026</td></tr>
              <tr><td>Número</td><td>Direita</td><td>Tabular nums + separador BR</td><td style={{ textAlign: 'right' }}>1.245</td></tr>
              <tr><td>Moeda</td><td>Direita</td><td>R$ 0,00</td><td style={{ textAlign: 'right' }}>R$ 1.245,00</td></tr>
              <tr><td>Status</td><td>Esquerda</td><td>tfd-tag--*</td><td><span className="tfd-tag tfd-tag--success">Aprovado</span></td></tr>
              <tr><td>Ações</td><td>Direita</td><td>tfd-btn--icon-only ghost</td><td style={{ textAlign: 'right' }}><ChevronRight size={16} /></td></tr>
            </tbody>
          </table>
        </div>
      </SubSection>

      <SubSection title="Cabeçalho com sort + filter" hint="Componente: src/shared/components/table/SortableHeader.tsx">
        <div className="tfd-panel">
          <div className="overflow-x-auto">
            <table className="tfd-table">
              <thead>
                <tr>
                  <th>
                    <span className="inline-flex items-center gap-1 cursor-pointer">
                      Paciente
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.35 }}>
                        <path d="m21 16-4 4-4-4M17 20V4M3 8l4-4 4 4M7 4v16" />
                      </svg>
                    </span>
                  </th>
                  <th>
                    <span className="inline-flex items-center gap-1" style={{ color: 'var(--tfd-text-primary)' }}>
                      Data
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--tfd-blue-500)' }}>
                        <path d="m5 12 7-7 7 7M12 19V5" />
                      </svg>
                    </span>
                  </th>
                  <th>
                    <span className="inline-flex items-center gap-1">
                      Status
                      <span style={{ color: 'var(--tfd-blue-500)' }}>
                        <Filter size={12} />
                      </span>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr><td>Maria Silva</td><td>12/04/2026</td><td><span className="tfd-tag tfd-tag--success">Aprovado</span></td></tr>
                <tr><td>João Pereira</td><td>14/04/2026</td><td><span className="tfd-tag tfd-tag--warning">Pendente</span></td></tr>
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-[12px]" style={{ color: 'var(--tfd-text-secondary)' }}>
          <div className="rounded-md border p-3" style={{ borderColor: 'var(--tfd-200)' }}>
            <strong style={{ color: 'var(--tfd-text-primary)' }}>Sort inativo</strong>
            <p className="mt-1">Ícone <code>ArrowUpDown</code> a 35% de opacidade.</p>
          </div>
          <div className="rounded-md border p-3" style={{ borderColor: 'var(--tfd-200)' }}>
            <strong style={{ color: 'var(--tfd-text-primary)' }}>Sort ativo</strong>
            <p className="mt-1"><code>ArrowUp</code> ou <code>ArrowDown</code> em <code>--tfd-blue-500</code>, opacidade 100%.</p>
          </div>
          <div className="rounded-md border p-3" style={{ borderColor: 'var(--tfd-200)' }}>
            <strong style={{ color: 'var(--tfd-text-primary)' }}>Filter ativo</strong>
            <p className="mt-1">Ícone <code>Filter</code> em <code>--tfd-blue-500</code>. Dropdown com checkboxes (máx 12 opções).</p>
          </div>
        </div>
        <CodeBlock code={`import SortableHeader from '@/shared/components/table/SortableHeader';

<SortableHeader
  label="Data"
  sortDirection={sortKey === 'data' ? sortDir : null}
  onSort={() => toggleSort('data')}
  filterOptions={['Hoje', 'Esta semana', 'Este mês']}
  activeFilters={filters.data}
  onFilterChange={(v) => setFilters({ ...filters, data: v })}
/>`} />
      </SubSection>

      <SubSection title="Estados da tabela">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[13px]">
          <div className="tfd-card">
            <div className="text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--tfd-text-muted)' }}>Loading</div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-3 rounded" style={{ background: 'var(--tfd-100)', animation: 'tfd-fade-in 1s ease-in-out infinite alternate' }} />
              ))}
            </div>
            <p className="mt-3 text-[12px]" style={{ color: 'var(--tfd-text-muted)' }}>
              Skeleton de 3–5 linhas com animação pulse. Mesmo padding das linhas reais.
            </p>
          </div>
          <div className="tfd-card">
            <div className="text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--tfd-text-muted)' }}>Vazio</div>
            <div className="text-center py-4">
              <Search size={20} style={{ color: 'var(--tfd-text-muted)', margin: '0 auto' }} />
              <div className="mt-2 text-[13px] font-semibold">Nenhum registro</div>
              <div className="mt-0.5 text-[11px]" style={{ color: 'var(--tfd-text-muted)' }}>Ajuste os filtros</div>
            </div>
          </div>
          <div className="tfd-card">
            <div className="text-[12px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--tfd-text-muted)' }}>Erro</div>
            <div className="tfd-message tfd-message--danger" style={{ padding: '0.625rem 0.75rem' }}>
              <XCircle size={16} className="tfd-message-icon" />
              <div>
                <div className="font-semibold text-[13px]">Falha ao carregar</div>
                <button className="mt-1 text-[12px] underline" style={{ color: 'var(--tfd-blue-700)' }}>Tentar novamente</button>
              </div>
            </div>
          </div>
        </div>
      </SubSection>

      <SubSection title="Densidade & responsividade">
        <ul className="space-y-2 text-[13px]" style={{ color: 'var(--tfd-text-secondary)' }}>
          <li><strong style={{ color: 'var(--tfd-text-primary)' }}>Padding padrão:</strong> 12px 16px (densidade default).</li>
          <li><strong style={{ color: 'var(--tfd-text-primary)' }}>Altura mínima de linha:</strong> 44px (clicável confortável).</li>
          <li><strong style={{ color: 'var(--tfd-text-primary)' }}>Mobile (&lt; 768px):</strong> wrapper com <code>overflow-x-auto</code>; coluna fixa só se essencial. Considerar lista de cards como alternativa.</li>
          <li><strong style={{ color: 'var(--tfd-text-primary)' }}>Largura máxima por célula:</strong> 280px com <code>truncate</code> + tooltip se for cortar.</li>
          <li><strong style={{ color: 'var(--tfd-text-primary)' }}>Paginação:</strong> rodapé fora do <code>tfd-panel</code> com botões prev/next + selector de tamanho (10 / 25 / 50).</li>
        </ul>
      </SubSection>

      <SubSection title="Boas práticas">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[13px]">
          <div className="rounded-md border p-3" style={{ borderColor: 'var(--tfd-success)', background: '#f0fdf4' }}>
            <div className="font-semibold mb-2" style={{ color: '#15803d' }}>Faça</div>
            <ul className="space-y-1" style={{ color: 'var(--tfd-text-secondary)' }}>
              <li>✓ Use <code>tfd-tag</code> pra status — nunca cor de texto direta.</li>
              <li>✓ Alinhe números à direita com <code>tabular-nums</code>.</li>
              <li>✓ Mostre estado vazio com CTA pra ação principal.</li>
              <li>✓ Coluna de ação à direita, ghost icon-only.</li>
            </ul>
          </div>
          <div className="rounded-md border p-3" style={{ borderColor: 'var(--tfd-danger)', background: '#fef2f2' }}>
            <div className="font-semibold mb-2" style={{ color: '#b91c1c' }}>Evite</div>
            <ul className="space-y-1" style={{ color: 'var(--tfd-text-secondary)' }}>
              <li>✕ Mais de 7 colunas visíveis no desktop padrão.</li>
              <li>✕ Botões cheios (primary/danger) repetidos em cada linha.</li>
              <li>✕ Linhas zebradas (não fazem parte do sistema).</li>
              <li>✕ Truncar sem tooltip pra recuperar o texto.</li>
            </ul>
          </div>
        </div>
      </SubSection>

      <SubSection title="Progress bar">
        <div className="space-y-3 max-w-md">
          {[20, 60, 90].map((pct) => (
            <div key={pct}>
              <div className="flex items-center justify-between mb-1 text-[12px]" style={{ color: 'var(--tfd-text-muted)' }}>
                <span>Etapa {pct < 50 ? 'inicial' : pct < 90 ? 'em andamento' : 'finalizando'}</span>
                <span>{pct}%</span>
              </div>
              <div className="tfd-progressbar">
                <div className="tfd-progressbar-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </SubSection>

      <SubSection
        title="Charts"
        hint="Biblioteca: recharts. Use as cores --tfd-blue-500 (séries primárias) e a paleta de severidade para sinalização."
      >
        <CodeBlock code={`import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

<ResponsiveContainer width="100%" height={240}>
  <LineChart data={data}>
    <XAxis dataKey="mes" />
    <YAxis />
    <Tooltip />
    <Line
      type="monotone"
      dataKey="solicitacoes"
      stroke="var(--tfd-blue-500)"
      strokeWidth={2}
      dot={false}
    />
  </LineChart>
</ResponsiveContainer>`} />
      </SubSection>
    </>
  );
}

function PatternsSection() {
  return (
    <>
      <SectionHeader
        title="Padrões de Página"
        description="Receitas reutilizáveis para montar páginas consistentes em todo o produto."
      />

      <SubSection title="PageHeader">
        <CodeBlock code={`import PageHeader from '@/shared/components/page-header/PageHeader';

<PageHeader
  title="Solicitações"
  subtitle="Gerencie pedidos de TFD"
  actions={
    <>
      <button className="tfd-btn tfd-btn-outline tfd-btn--sm">
        <Download size={14} /> Exportar
      </button>
      <button className="tfd-btn tfd-btn-primary tfd-btn--sm">
        <Plus size={14} /> Nova
      </button>
    </>
  }
/>`} />
        <p className="mt-2 text-[13px]" style={{ color: 'var(--tfd-text-secondary)' }}>
          Breadcrumbs são gerados automaticamente a partir do pathname. Para customizar, passe
          <code> breadcrumbs</code> explicitamente.
        </p>
      </SubSection>

      <SubSection title="Painel com header e conteúdo">
        <div className="tfd-panel">
          <div className="tfd-panel-header">
            <div>
              <h3 className="text-[15px] font-semibold">Histórico</h3>
              <p className="text-[12px]" style={{ color: 'var(--tfd-text-muted)' }}>Últimos 30 dias</p>
            </div>
            <button className="tfd-btn tfd-btn-ghost tfd-btn--sm ml-auto">Ver tudo</button>
          </div>
          <div className="tfd-panel-content">
            <p className="text-[13px]" style={{ color: 'var(--tfd-text-secondary)' }}>
              Conteúdo do painel.
            </p>
          </div>
        </div>
      </SubSection>

      <SubSection
        title="Empty state"
        hint="Use src/shared/components/empty-state/. Sempre com ícone, título, descrição e CTA opcional."
      >
        <div
          className="rounded-lg border border-dashed py-12 px-6 text-center"
          style={{ borderColor: 'var(--tfd-300)', background: 'var(--tfd-50)' }}
        >
          <div
            className="mx-auto mb-3 w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'var(--tfd-blue-50)', color: 'var(--tfd-blue-600)' }}
          >
            <Search size={20} />
          </div>
          <div className="text-[15px] font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
            Nenhum resultado encontrado
          </div>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--tfd-text-muted)' }}>
            Tente ajustar os filtros ou criar uma nova solicitação.
          </p>
          <button className="tfd-btn tfd-btn-primary tfd-btn--sm mt-4">
            <Plus size={14} /> Nova solicitação
          </button>
        </div>
      </SubSection>

      <SubSection title="Checklist de qualidade para novas páginas">
        <ul className="space-y-2 text-[13px]" style={{ color: 'var(--tfd-text-secondary)' }}>
          {[
            'Usei <PageHeader /> com title + subtitle.',
            'Reaproveitei classes tfd-* ao invés de criar CSS novo.',
            'Cores via tokens (--tfd-*), nunca hex inline.',
            'Tabela usa .tfd-table dentro de um .tfd-panel.',
            'Estados de loading, vazio e erro foram cobertos.',
            'Botão primário aparece no máximo 1× por seção visível.',
            'Foco visível em todos os elementos interativos (focus-visible).',
            'Funciona em mobile (px-5) e desktop (px-8).',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <CheckCircle2 size={16} style={{ color: 'var(--tfd-success)', marginTop: 2 }} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </SubSection>
    </>
  );
}

function DrawerDemo() {
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState('480px');

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {[
          { label: 'sm (400)', w: '400px' },
          { label: 'md (480)', w: '480px' },
          { label: 'lg (640)', w: '640px' },
          { label: 'xl (800)', w: '800px' },
        ].map((s) => (
          <button
            key={s.w}
            type="button"
            onClick={() => { setWidth(s.w); setOpen(true); }}
            className="tfd-btn tfd-btn-outline tfd-btn--sm"
          >
            Abrir {s.label}
          </button>
        ))}
      </div>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Solicitação #10234"
        subtitle="Maria Silva · Aprovada em 12/04/2026"
        width={width}
        footer={
          <>
            <button className="tfd-btn tfd-btn-ghost tfd-btn--sm" onClick={() => setOpen(false)}>
              Fechar
            </button>
            <button className="tfd-btn tfd-btn-primary tfd-btn--sm">Encaminhar</button>
          </>
        }
      >
        <section className="space-y-4 text-[14px]">
          <div>
            <div className="tfd-label">Paciente</div>
            <div style={{ color: 'var(--tfd-text-primary)' }}>Maria Silva</div>
          </div>
          <div>
            <div className="tfd-label">CPF</div>
            <div style={{ color: 'var(--tfd-text-primary)' }}>123.456.789-00</div>
          </div>
          <div>
            <div className="tfd-label">Destino</div>
            <div style={{ color: 'var(--tfd-text-primary)' }}>São Luís — MA</div>
          </div>
          <div>
            <div className="tfd-label">Status</div>
            <div className="mt-1">
              <span className="tfd-tag tfd-tag--success">Aprovado</span>
            </div>
          </div>
          <div>
            <div className="tfd-label">Observações</div>
            <p style={{ color: 'var(--tfd-text-secondary)' }}>
              Paciente apto para deslocamento. Acompanhante autorizado pela coordenação.
            </p>
          </div>
        </section>
      </Drawer>
    </>
  );
}
