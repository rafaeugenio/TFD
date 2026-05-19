'use client';

import { useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ListChecks,
  Workflow,
  FileCode2,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import PageHeader from '@/shared/components/page-header/PageHeader';
import type {
  BacklogTree,
  Epic,
  Feature,
  UserStory,
  UserStorySection,
} from './_types';

interface Selection {
  epicCode: string;
  featureCode?: string;
  usId?: string;
}

type View = 'overview' | 'wireframes' | 'sprints' | 'us';

export default function BacklogClient({ tree }: { tree: BacklogTree }) {
  const firstEpic = tree.epics[0];
  const [selection, setSelection] = useState<Selection>({
    epicCode: firstEpic?.code ?? '',
  });
  const [view, setView] = useState<View>('overview');
  // épicos abertos no menu — por default abre o primeiro
  const [openEpics, setOpenEpics] = useState<Set<string>>(
    new Set(firstEpic ? [firstEpic.code] : []),
  );

  const epic = useMemo(
    () => tree.epics.find((e) => e.code === selection.epicCode) ?? tree.epics[0],
    [tree.epics, selection.epicCode],
  );
  const feature = useMemo(
    () => epic?.features.find((f) => f.code === selection.featureCode),
    [epic, selection.featureCode],
  );
  const us = useMemo(
    () => feature?.userStories.find((u) => u.id === selection.usId),
    [feature, selection.usId],
  );

  const toggleEpic = (code: string) => {
    setOpenEpics((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const totalEpicos = tree.epics.length;
  const totalFeatures = tree.epics.reduce((acc, e) => acc + e.features.length, 0);
  const totalUSs = tree.epics.reduce(
    (acc, e) => acc + e.features.reduce((a, f) => a + f.userStories.length, 0),
    0,
  );

  return (
    <>
      <PageHeader
        title="Backlog do TFD"
        subtitle="Épicos, features e user stories — gerado automaticamente a partir do vault Obsidian, atualiza a cada visita."
        breadcrumbs={[{ label: 'Sistema', href: '/sistema/configuracoes' }]}
      />

      {tree.error && (
        <div
          className="mb-6 p-4 flex items-start gap-3"
          style={{
            background: 'var(--tfd-status-danger-bg, #FEF2F2)',
            border: '1px solid #FECACA',
            borderRadius: 'var(--tfd-radius-lg)',
            color: '#991B1B',
          }}
        >
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <p className="text-[13.5px] font-semibold mb-1">
              Não foi possível ler o vault de backlog
            </p>
            <p className="text-[12.5px]" style={{ fontFamily: 'var(--tfd-mono)' }}>
              {tree.error}
            </p>
          </div>
        </div>
      )}

      {/* Stats globais do backlog */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Épicos" value={totalEpicos} icon={<BookOpen size={16} />} />
        <StatCard label="Features" value={totalFeatures} icon={<ListChecks size={16} />} />
        <StatCard label="User stories" value={totalUSs} icon={<FileCode2 size={16} />} />
        <StatCard
          label="Pendentes"
          value={tree.epics.filter((e) => e.pendente).length}
          icon={<AlertTriangle size={16} />}
          tone="warning"
        />
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar — árvore Épico → Feature → US */}
        <aside className="col-span-12 lg:col-span-3 xl:col-span-3">
          <nav
            className="lg:sticky lg:top-6"
            style={{
              background: 'white',
              border: '1px solid var(--tfd-surface-border)',
              borderRadius: 'var(--tfd-radius-lg)',
              maxHeight: 'calc(100vh - 80px)',
              overflowY: 'auto',
            }}
          >
            {/* Atalhos do épico ativo */}
            {epic && (
              <div className="px-3 pt-3 pb-2" style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}>
                <p
                  className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: 'var(--tfd-text-muted)' }}
                >
                  Visões do épico
                </p>
                <div className="flex flex-col gap-0.5">
                  <ViewLink
                    label="Visão geral"
                    icon={<Sparkles size={13} />}
                    active={view === 'overview' && !feature && !us}
                    onClick={() => {
                      setView('overview');
                      setSelection({ epicCode: epic.code });
                    }}
                  />
                  <ViewLink
                    label="Wireframe do fluxo"
                    icon={<Workflow size={13} />}
                    active={view === 'wireframes'}
                    onClick={() => {
                      setView('wireframes');
                      setSelection({ epicCode: epic.code });
                    }}
                  />
                  {tree.cronograma && (
                    <ViewLink
                      label="Cronograma de sprints"
                      icon={<Calendar size={13} />}
                      active={view === 'sprints'}
                      onClick={() => {
                        setView('sprints');
                      }}
                    />
                  )}
                </div>
              </div>
            )}

            <div className="px-3 py-3">
              <p
                className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--tfd-text-muted)' }}
              >
                Épicos
              </p>
              {tree.epics.length === 0 && (
                <p className="text-[12px] py-3 text-center" style={{ color: 'var(--tfd-text-muted)' }}>
                  Nenhum épico encontrado.
                </p>
              )}
              <ul className="flex flex-col gap-1">
                {tree.epics.map((e) => (
                  <li key={e.code}>
                    <EpicNode
                      epic={e}
                      isOpen={openEpics.has(e.code)}
                      onToggle={() => toggleEpic(e.code)}
                      selection={selection}
                      onSelectEpic={() => {
                        setSelection({ epicCode: e.code });
                        setView('overview');
                        setOpenEpics((prev) => new Set(prev).add(e.code));
                      }}
                      onSelectFeature={(f) => {
                        setSelection({ epicCode: e.code, featureCode: f.code });
                        setView('us');
                      }}
                      onSelectUs={(f, u) => {
                        setSelection({ epicCode: e.code, featureCode: f.code, usId: u.id });
                        setView('us');
                      }}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </aside>

        {/* Conteúdo principal */}
        <section className="col-span-12 lg:col-span-9 xl:col-span-9 min-w-0">
          {view === 'sprints' && tree.cronograma ? (
            <MdPanel
              title="Cronograma de sprints"
              hint="Distribuição em sprints de 2 semanas."
              raw={tree.cronograma}
            />
          ) : view === 'wireframes' && epic ? (
            <WireframePanel epic={epic} />
          ) : us && feature && epic ? (
            <UserStoryPanel epic={epic} feature={feature} us={us} />
          ) : feature && epic ? (
            <FeaturePanel epic={epic} feature={feature} onSelectUs={(u) => setSelection({ epicCode: epic.code, featureCode: feature.code, usId: u.id })} />
          ) : epic ? (
            <EpicOverview
              epic={epic}
              onSelectFeature={(f) => setSelection({ epicCode: epic.code, featureCode: f.code })}
              onSelectUs={(f, u) => setSelection({ epicCode: epic.code, featureCode: f.code, usId: u.id })}
            />
          ) : (
            <EmptyState />
          )}
        </section>
      </div>
    </>
  );
}

/* ──────────────────────────────────────────────────────
   Sidebar nodes
   ────────────────────────────────────────────────────── */

function ViewLink({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2 px-2 py-1.5 text-[12.5px] text-left transition-colors"
      style={{
        background: active ? 'var(--tfd-blue-50)' : 'transparent',
        color: active ? 'var(--tfd-blue-700)' : 'var(--tfd-text-secondary)',
        fontWeight: active ? 600 : 500,
        borderRadius: 6,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = '#F8FAFC';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function EpicNode({
  epic,
  isOpen,
  onToggle,
  selection,
  onSelectEpic,
  onSelectFeature,
  onSelectUs,
}: {
  epic: Epic;
  isOpen: boolean;
  onToggle: () => void;
  selection: Selection;
  onSelectEpic: () => void;
  onSelectFeature: (f: Feature) => void;
  onSelectUs: (f: Feature, u: UserStory) => void;
}) {
  const isActive = selection.epicCode === epic.code;
  const totalUSs = epic.features.reduce((a, f) => a + f.userStories.length, 0);

  return (
    <div>
      <div
        className="flex items-center gap-1 px-2 py-1.5"
        style={{
          background: isActive && !selection.featureCode ? 'var(--tfd-blue-50)' : 'transparent',
          borderRadius: 6,
        }}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-label={isOpen ? 'Recolher' : 'Expandir'}
          className="flex-shrink-0 p-0.5 rounded hover:bg-[#E2E8F0] transition-colors"
          style={{ color: 'var(--tfd-text-muted)' }}
        >
          {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
        <button
          type="button"
          onClick={onSelectEpic}
          className="flex-1 flex items-center gap-2 min-w-0 text-left"
          style={{ color: isActive ? 'var(--tfd-blue-700)' : 'var(--tfd-text-primary)' }}
        >
          <span
            className="font-mono text-[10px] flex-shrink-0"
            style={{ color: 'var(--tfd-text-muted)' }}
          >
            {epic.code}
          </span>
          <span
            className="text-[12.5px] truncate"
            style={{ fontWeight: isActive ? 600 : 500 }}
          >
            {epic.title}
          </span>
          {epic.pendente && (
            <span
              className="text-[9px] font-semibold uppercase px-1 py-[1px] rounded"
              style={{ background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }}
            >
              Pend.
            </span>
          )}
          <span className="ml-auto text-[10px]" style={{ color: 'var(--tfd-text-muted)', fontFamily: 'var(--tfd-mono)' }}>
            {totalUSs}
          </span>
        </button>
      </div>

      {isOpen && epic.features.length > 0 && (
        <ul className="ml-3 mt-0.5 mb-1 pl-2" style={{ borderLeft: '1px solid var(--tfd-surface-border)' }}>
          {epic.features.map((f) => (
            <FeatureNode
              key={f.code}
              feature={f}
              isActive={selection.featureCode === f.code && selection.epicCode === epic.code}
              selectedUsId={selection.epicCode === epic.code && selection.featureCode === f.code ? selection.usId : undefined}
              onSelect={() => onSelectFeature(f)}
              onSelectUs={(u) => onSelectUs(f, u)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function FeatureNode({
  feature,
  isActive,
  selectedUsId,
  onSelect,
  onSelectUs,
}: {
  feature: Feature;
  isActive: boolean;
  selectedUsId?: string;
  onSelect: () => void;
  onSelectUs: (u: UserStory) => void;
}) {
  const [open, setOpen] = useState(isActive);
  // Mantém aberto se está ativo
  const isOpen = open || isActive;

  return (
    <li>
      <div
        className="flex items-center gap-1 px-2 py-1"
        style={{
          background: isActive && !selectedUsId ? 'var(--tfd-blue-50)' : 'transparent',
          borderRadius: 6,
        }}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={isOpen ? 'Recolher' : 'Expandir'}
          className="flex-shrink-0 p-0.5 rounded hover:bg-[#E2E8F0] transition-colors"
          style={{ color: 'var(--tfd-text-muted)' }}
        >
          {isOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        </button>
        <button
          type="button"
          onClick={onSelect}
          className="flex-1 flex items-center gap-2 min-w-0 text-left text-[12px]"
          style={{ color: isActive ? 'var(--tfd-blue-700)' : 'var(--tfd-text-secondary)' }}
        >
          <span className="font-mono text-[10px] flex-shrink-0" style={{ color: 'var(--tfd-text-muted)' }}>
            {feature.code}
          </span>
          <span className="truncate" style={{ fontWeight: isActive ? 600 : 400 }}>
            {feature.title}
          </span>
          <span className="ml-auto text-[10px]" style={{ color: 'var(--tfd-text-muted)', fontFamily: 'var(--tfd-mono)' }}>
            {feature.userStories.length}
          </span>
        </button>
      </div>

      {isOpen && feature.userStories.length > 0 && (
        <ul className="ml-3 mt-0.5 mb-1 pl-2" style={{ borderLeft: '1px solid var(--tfd-surface-border)' }}>
          {feature.userStories.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => onSelectUs(u)}
                className="w-full text-left px-2 py-1 text-[11.5px] flex items-center gap-2 transition-colors"
                style={{
                  background: u.id === selectedUsId ? 'var(--tfd-blue-50)' : 'transparent',
                  color: u.id === selectedUsId ? 'var(--tfd-blue-700)' : 'var(--tfd-text-secondary)',
                  fontWeight: u.id === selectedUsId ? 600 : 400,
                  borderRadius: 6,
                }}
                onMouseEnter={(e) => {
                  if (u.id !== selectedUsId) e.currentTarget.style.background = '#F8FAFC';
                }}
                onMouseLeave={(e) => {
                  if (u.id !== selectedUsId) e.currentTarget.style.background = 'transparent';
                }}
              >
                <span className="font-mono text-[10px]" style={{ color: 'var(--tfd-text-muted)' }}>
                  {u.id.replace(/^US-/, '')}
                </span>
                <span className="truncate">{u.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

/* ──────────────────────────────────────────────────────
   Painéis de conteúdo
   ────────────────────────────────────────────────────── */

function StatCard({
  label,
  value,
  icon,
  tone = 'default',
}: {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  tone?: 'default' | 'warning';
}) {
  const colors =
    tone === 'warning'
      ? { iconBg: '#FFFBEB', iconFg: '#92400E' }
      : { iconBg: 'var(--tfd-blue-50)', iconFg: 'var(--tfd-blue-700)' };
  return (
    <div
      style={{
        background: 'white',
        border: '1px solid var(--tfd-surface-border)',
        borderRadius: 'var(--tfd-radius-lg)',
        padding: '14px 16px',
        display: 'flex',
        gap: 12,
        alignItems: 'center',
      }}
    >
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: colors.iconBg,
          color: colors.iconFg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <div
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--tfd-text-muted)' }}
        >
          {label}
        </div>
        <div className="text-[18px] font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function Crumbs({ items }: { items: { label: string; onClick?: () => void }[] }) {
  return (
    <div className="flex items-center gap-1.5 text-[12px] mb-3" style={{ color: 'var(--tfd-text-muted)' }}>
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight size={11} />}
          {it.onClick ? (
            <button
              type="button"
              onClick={it.onClick}
              className="hover:underline transition-colors"
              style={{ color: i === items.length - 1 ? 'var(--tfd-text-primary)' : 'var(--tfd-text-secondary)' }}
            >
              {it.label}
            </button>
          ) : (
            <span style={{ color: 'var(--tfd-text-primary)', fontWeight: 600 }}>{it.label}</span>
          )}
        </span>
      ))}
    </div>
  );
}

function EpicOverview({
  epic,
  onSelectFeature,
  onSelectUs,
}: {
  epic: Epic;
  onSelectFeature: (f: Feature) => void;
  onSelectUs: (f: Feature, u: UserStory) => void;
}) {
  return (
    <div>
      <Crumbs items={[{ label: 'Backlog' }, { label: epic.code + ' · ' + epic.title }]} />

      <div className="tfd-panel mb-6">
        <div className="tfd-panel-header">
          <div>
            <h2 className="text-[20px] font-bold" style={{ color: '#1A1D2B', letterSpacing: '-0.02em' }}>
              {epic.code} — {epic.title}
            </h2>
            <p className="mt-1 text-[14px]" style={{ color: 'var(--tfd-text-secondary)' }}>
              {epic.features.length} {epic.features.length === 1 ? 'feature' : 'features'} ·{' '}
              {epic.features.reduce((a, f) => a + f.userStories.length, 0)} user stories
              {epic.pendente && (
                <>
                  {' '}·{' '}
                  <span
                    className="text-[11px] font-semibold uppercase tracking-wider px-2 py-[2px] rounded"
                    style={{ background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }}
                  >
                    Pendente de validação
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="tfd-panel-content">
          <p className="text-[13.5px]" style={{ color: 'var(--tfd-text-secondary)', lineHeight: 1.6 }}>
            {epic.pendente
              ? 'Este épico foi documentado mas ainda aguarda validação dos setores. Não está alocado em sprints — pode haver ajustes antes da implementação.'
              : 'Validado pelos setores e refletido no protótipo. As features abaixo são prontas para virar PBIs no Azure DevOps.'}
          </p>
        </div>
      </div>

      {/* Lista de features */}
      <div className="flex flex-col gap-3">
        {epic.features.map((f) => (
          <button
            key={f.code}
            type="button"
            onClick={() => onSelectFeature(f)}
            className="text-left p-4 transition-all"
            style={{
              background: 'white',
              border: '1px solid var(--tfd-surface-border)',
              borderRadius: 'var(--tfd-radius-lg)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--tfd-blue-300)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(20,107,250,0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--tfd-surface-border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div className="flex items-start gap-3">
              <span
                className="font-mono text-[11px] font-semibold uppercase px-2 py-1 rounded flex-shrink-0"
                style={{ background: 'var(--tfd-blue-50)', color: 'var(--tfd-blue-700)' }}
              >
                {f.code}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="text-[15px] font-semibold mb-1" style={{ color: 'var(--tfd-text-primary)' }}>
                  {f.title}
                </h3>
                {f.description && (
                  <p className="text-[13px] mb-3" style={{ color: 'var(--tfd-text-secondary)', lineHeight: 1.5 }}>
                    {f.description}
                  </p>
                )}
                {/* Meta */}
                {f.meta.length > 0 && (
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2 text-[12px]" style={{ color: 'var(--tfd-text-muted)' }}>
                    {f.meta.map((m, idx) => (
                      <span key={idx}>
                        <span style={{ fontWeight: 600 }}>{m.key}:</span>{' '}
                        <span>{m.value}</span>
                      </span>
                    ))}
                  </div>
                )}
                {/* USs como chips */}
                <div className="flex flex-wrap gap-1 mt-3">
                  {f.userStories.map((u) => (
                    <span
                      key={u.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectUs(f, u);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium cursor-pointer transition-colors"
                      style={{
                        background: '#F8FAFC',
                        color: 'var(--tfd-text-secondary)',
                        border: '1px solid var(--tfd-surface-border)',
                        borderRadius: 6,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--tfd-blue-50)';
                        e.currentTarget.style.color = 'var(--tfd-blue-700)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#F8FAFC';
                        e.currentTarget.style.color = 'var(--tfd-text-secondary)';
                      }}
                      title={u.title}
                    >
                      <span style={{ fontFamily: 'var(--tfd-mono)', color: 'var(--tfd-text-muted)' }}>
                        {u.id}
                      </span>
                      <span className="truncate" style={{ maxWidth: 180 }}>{u.title}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function FeaturePanel({
  epic,
  feature,
  onSelectUs,
}: {
  epic: Epic;
  feature: Feature;
  onSelectUs: (u: UserStory) => void;
}) {
  return (
    <div>
      <Crumbs
        items={[
          { label: 'Backlog' },
          { label: epic.code },
          { label: feature.code + ' · ' + feature.title },
        ]}
      />

      <div className="tfd-panel mb-6">
        <div className="tfd-panel-header">
          <div>
            <h2 className="text-[20px] font-bold" style={{ color: '#1A1D2B', letterSpacing: '-0.02em' }}>
              {feature.code} — {feature.title}
            </h2>
            {feature.description && (
              <p className="mt-2 text-[14px]" style={{ color: 'var(--tfd-text-secondary)', lineHeight: 1.6 }}>
                {feature.description}
              </p>
            )}
          </div>
        </div>
        {feature.meta.length > 0 && (
          <div className="tfd-panel-content">
            <table className="text-[13px]" style={{ width: '100%' }}>
              <tbody>
                {feature.meta.map((m, idx) => (
                  <tr key={idx}>
                    <td
                      style={{
                        padding: '4px 12px 4px 0',
                        color: 'var(--tfd-text-muted)',
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        width: 100,
                        verticalAlign: 'top',
                      }}
                    >
                      {m.key}
                    </td>
                    <td style={{ padding: '4px 0', color: 'var(--tfd-text-primary)' }}>
                      <InlineMd text={m.value} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <h3
        className="text-[12px] font-semibold uppercase tracking-wider mb-2"
        style={{ color: 'var(--tfd-text-muted)' }}
      >
        User stories ({feature.userStories.length})
      </h3>
      <div className="flex flex-col gap-2">
        {feature.userStories.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => onSelectUs(u)}
            className="text-left p-3 transition-all"
            style={{
              background: 'white',
              border: '1px solid var(--tfd-surface-border)',
              borderRadius: 'var(--tfd-radius-md, 8px)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--tfd-blue-300)';
              e.currentTarget.style.background = '#FAFCFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--tfd-surface-border)';
              e.currentTarget.style.background = 'white';
            }}
          >
            <div className="flex items-baseline gap-3">
              <span
                className="font-mono text-[11px] font-semibold uppercase px-2 py-1 rounded flex-shrink-0"
                style={{ background: 'var(--tfd-blue-50)', color: 'var(--tfd-blue-700)' }}
              >
                {u.id}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[14px] font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                  {u.title}
                </div>
                {u.story && (
                  <p className="text-[12.5px] mt-1 italic" style={{ color: 'var(--tfd-text-secondary)', lineHeight: 1.5 }}>
                    <InlineMd text={u.story.length > 220 ? u.story.slice(0, 220) + '...' : u.story} />
                  </p>
                )}
                <div className="flex gap-3 mt-2 text-[11px]" style={{ color: 'var(--tfd-text-muted)' }}>
                  <span>{u.criterios.length} critérios</span>
                  <span>·</span>
                  <span>{u.regras.length} regras</span>
                  {u.dependencias.length > 0 && (
                    <>
                      <span>·</span>
                      <span>{u.dependencias.length} dependências</span>
                    </>
                  )}
                </div>
              </div>
              <ChevronRight size={14} style={{ color: 'var(--tfd-text-muted)', flexShrink: 0 }} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function UserStoryPanel({
  epic,
  feature,
  us,
}: {
  epic: Epic;
  feature: Feature;
  us: UserStory;
}) {
  return (
    <div>
      <Crumbs
        items={[
          { label: 'Backlog' },
          { label: epic.code },
          { label: feature.code },
          { label: us.id },
        ]}
      />

      <div className="tfd-panel mb-5">
        <div className="tfd-panel-header" style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span
            className="font-mono text-[12px] font-semibold uppercase px-2.5 py-1 rounded"
            style={{ background: 'var(--tfd-blue-50)', color: 'var(--tfd-blue-700)', flexShrink: 0 }}
          >
            {us.id}
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="text-[20px] font-bold" style={{ color: '#1A1D2B', letterSpacing: '-0.02em' }}>
              {us.title}
            </h2>
            <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--tfd-text-muted)' }}>
              {epic.code} · {feature.code} — {feature.title}
            </p>
          </div>
        </div>
        {us.story && (
          <div
            className="tfd-panel-content"
            style={{
              background: '#FAFCFF',
              borderTop: 'none',
              borderLeft: '3px solid var(--tfd-blue-500)',
              fontStyle: 'italic',
              fontSize: 14,
              lineHeight: 1.6,
              color: 'var(--tfd-text-primary)',
            }}
          >
            <InlineMd text={us.story} />
          </div>
        )}
      </div>

      {us.sections.map((sec, i) => (
        <SectionRenderer key={i} section={sec} />
      ))}
    </div>
  );
}

/**
 * Renderiza qualquer seção de User Story de forma adequada ao conteúdo:
 * — Tabelas de markdown (`|`) viram tabela HTML;
 * — Listas com `-` viram lista com checkbox/bullet conforme a seção;
 * — Parágrafos viram parágrafos.
 */
function SectionRenderer({ section }: { section: UserStorySection }) {
  const title = section.title;
  const body = section.body;

  // Pega ícone e estilo conforme o título da seção
  const meta = sectionMeta(title);

  return (
    <Section title={title} icon={meta.icon}>
      <SectionBody body={body} bulletStyle={meta.bulletStyle} />
    </Section>
  );
}

function sectionMeta(title: string): {
  icon: React.ReactNode;
  bulletStyle: 'checkbox' | 'bullet' | 'arrow';
} {
  const t = title.toLowerCase();
  if (t.startsWith('critérios')) {
    return { icon: <CheckCircle2 size={15} style={{ color: '#047857' }} />, bulletStyle: 'checkbox' };
  }
  if (t.startsWith('regras')) {
    return { icon: <ListChecks size={15} style={{ color: 'var(--tfd-blue-700)' }} />, bulletStyle: 'bullet' };
  }
  if (t.startsWith('dependências') || t.startsWith('dependencias')) {
    return { icon: <ExternalLink size={14} style={{ color: 'var(--tfd-text-muted)' }} />, bulletStyle: 'arrow' };
  }
  if (t.startsWith('componentes')) {
    return { icon: <FileCode2 size={15} style={{ color: '#6D28D9' }} />, bulletStyle: 'bullet' };
  }
  if (t.startsWith('layout')) {
    return { icon: <Workflow size={15} style={{ color: 'var(--tfd-blue-700)' }} />, bulletStyle: 'bullet' };
  }
  if (t.startsWith('estados')) {
    return { icon: <Sparkles size={15} style={{ color: '#92400E' }} />, bulletStyle: 'bullet' };
  }
  if (t.startsWith('schema') || t.startsWith('banco')) {
    return { icon: <ListChecks size={15} style={{ color: '#0F766E' }} />, bulletStyle: 'bullet' };
  }
  if (t.startsWith('permissões') || t.startsWith('permissoes')) {
    return { icon: <ListChecks size={15} style={{ color: '#B91C1C' }} />, bulletStyle: 'bullet' };
  }
  if (t.startsWith('side effects') || t.startsWith('auditoria') || t.startsWith('acessibilidade')) {
    return { icon: <ListChecks size={15} style={{ color: 'var(--tfd-text-muted)' }} />, bulletStyle: 'bullet' };
  }
  return { icon: <ListChecks size={15} style={{ color: 'var(--tfd-text-muted)' }} />, bulletStyle: 'bullet' };
}

/**
 * Renderiza o body de uma seção lidando com markdown comum:
 *  - Tabelas (` | a | b |` com separador `|---|---|`)
 *  - Listas (`-`) com checkbox/bullet/arrow
 *  - Parágrafos
 */
function SectionBody({
  body,
  bulletStyle,
}: {
  body: string;
  bulletStyle: 'checkbox' | 'bullet' | 'arrow';
}) {
  const lines = body.split('\n');
  const blocks: React.ReactNode[] = [];
  let listBuf: string[] = [];
  let tableBuf: string[] = [];
  let paragraphBuf: string[] = [];

  const flushList = () => {
    if (listBuf.length === 0) return;
    blocks.push(
      <BulletList key={blocks.length} items={listBuf} style={bulletStyle} />,
    );
    listBuf = [];
  };
  const flushTable = () => {
    if (tableBuf.length === 0) return;
    blocks.push(<MdTable key={blocks.length} lines={tableBuf} />);
    tableBuf = [];
  };
  const flushParagraph = () => {
    if (paragraphBuf.length === 0) return;
    const text = paragraphBuf.join(' ').trim();
    if (text) {
      blocks.push(
        <p key={blocks.length} className="text-[13px] my-1" style={{ color: 'var(--tfd-text-primary)', lineHeight: 1.55 }}>
          <InlineMd text={text} />
        </p>,
      );
    }
    paragraphBuf = [];
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, '');
    // Tabela markdown
    if (/^\s*\|/.test(line)) {
      flushList();
      flushParagraph();
      tableBuf.push(line);
      continue;
    } else if (tableBuf.length > 0) {
      flushTable();
    }
    // Lista
    if (/^\s*-\s+/.test(line)) {
      flushParagraph();
      listBuf.push(line.replace(/^\s*-\s+/, '').replace(/^\[\s*\]\s*/, ''));
      continue;
    } else if (listBuf.length > 0) {
      flushList();
    }
    // Vazio
    if (line.trim() === '') {
      flushParagraph();
      continue;
    }
    // Parágrafo
    paragraphBuf.push(line);
  }
  flushList();
  flushTable();
  flushParagraph();

  return <>{blocks}</>;
}

function BulletList({
  items,
  style,
}: {
  items: string[];
  style: 'checkbox' | 'bullet' | 'arrow';
}) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex items-start gap-2.5 text-[13px]"
          style={{ color: 'var(--tfd-text-primary)', lineHeight: 1.5 }}
        >
          {style === 'checkbox' ? (
            <span
              className="flex-shrink-0 mt-[3px]"
              style={{
                width: 14,
                height: 14,
                border: '1.5px solid var(--tfd-text-muted)',
                borderRadius: 3,
                background: 'white',
              }}
              aria-hidden
            />
          ) : style === 'arrow' ? (
            <span style={{ color: 'var(--tfd-text-muted)', fontFamily: 'var(--tfd-mono)', flexShrink: 0 }}>→</span>
          ) : (
            <span style={{ color: 'var(--tfd-blue-500)', fontWeight: 700, flexShrink: 0 }}>•</span>
          )}
          <span style={{ flex: 1, minWidth: 0 }}>
            <InlineMd text={item} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function MdTable({ lines }: { lines: string[] }) {
  // Primeira linha = header; segunda = separador `|---|---|`; restante = rows
  if (lines.length < 2) return null;
  const parseRow = (row: string): string[] =>
    row
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((c) => c.trim());

  const header = parseRow(lines[0]);
  const dataRows = lines.slice(2).map(parseRow);

  return (
    <div className="overflow-x-auto my-2">
      <table
        className="w-full text-[12.5px]"
        style={{ border: '1px solid var(--tfd-surface-border)', borderRadius: 6, borderCollapse: 'separate', borderSpacing: 0 }}
      >
        <thead>
          <tr style={{ background: '#FAFAF7' }}>
            {header.map((h, i) => (
              <th
                key={i}
                style={{
                  textAlign: 'left',
                  padding: '6px 10px',
                  fontWeight: 600,
                  color: 'var(--tfd-text-muted)',
                  fontSize: 10.5,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  borderBottom: '1px solid var(--tfd-surface-border)',
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dataRows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  style={{
                    padding: '6px 10px',
                    borderBottom: ri < dataRows.length - 1 ? '1px solid #F1F5F9' : 'none',
                    verticalAlign: 'top',
                    color: 'var(--tfd-text-primary)',
                  }}
                >
                  <InlineMd text={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="tfd-panel mb-4">
      <div className="tfd-panel-header" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {icon}
        <h3 className="text-[14px] font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
          {title}
        </h3>
      </div>
      <div className="tfd-panel-content">{children}</div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────
   Wireframe do fluxo (visualização ASCII-ish do épico)
   ────────────────────────────────────────────────────── */

function WireframePanel({ epic }: { epic: Epic }) {
  return (
    <div>
      <Crumbs items={[{ label: 'Backlog' }, { label: epic.code }, { label: 'Wireframe do fluxo' }]} />

      <div className="tfd-panel mb-5">
        <div className="tfd-panel-header">
          <div>
            <h2 className="text-[18px] font-bold" style={{ color: '#1A1D2B' }}>
              Fluxo de {epic.title}
            </h2>
            <p className="mt-1 text-[13px]" style={{ color: 'var(--tfd-text-secondary)' }}>
              Mapa visual das telas e relação entre as user stories. Cada caixa equivale a uma feature do épico.
            </p>
          </div>
        </div>
      </div>

      <div className="tfd-panel">
        <div className="tfd-panel-content" style={{ background: '#F8FAFC' }}>
          <div className="flex flex-col gap-3">
            {epic.features.map((f, idx) => (
              <div key={f.code}>
                <div
                  className="flex items-center gap-3 p-3"
                  style={{
                    background: 'white',
                    border: '1px solid var(--tfd-surface-border)',
                    borderRadius: 8,
                    boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
                  }}
                >
                  <div
                    className="flex-shrink-0 flex items-center justify-center font-mono text-[11px] font-bold"
                    style={{
                      width: 56,
                      height: 56,
                      background: 'var(--tfd-blue-50)',
                      color: 'var(--tfd-blue-700)',
                      borderRadius: 8,
                    }}
                  >
                    {f.code}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[14px] font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                      {f.title}
                    </div>
                    {f.description && (
                      <div className="text-[12px] mt-0.5 truncate" style={{ color: 'var(--tfd-text-muted)' }}>
                        {f.description}
                      </div>
                    )}
                    <div
                      className="flex flex-wrap gap-1 mt-2"
                      style={{ fontFamily: 'var(--tfd-mono)', fontSize: 10 }}
                    >
                      {f.userStories.slice(0, 6).map((u) => (
                        <span
                          key={u.id}
                          style={{
                            padding: '1px 6px',
                            background: '#F1F5F9',
                            color: 'var(--tfd-text-secondary)',
                            borderRadius: 4,
                            border: '1px solid var(--tfd-surface-border)',
                          }}
                        >
                          {u.id}
                        </span>
                      ))}
                      {f.userStories.length > 6 && (
                        <span style={{ color: 'var(--tfd-text-muted)' }}>+{f.userStories.length - 6}</span>
                      )}
                    </div>
                  </div>
                  {f.meta.find((m) => m.key.toLowerCase() === 'tela') && (
                    <div
                      className="flex-shrink-0 text-[11px] font-mono px-2 py-1 rounded"
                      style={{
                        background: '#F8FAFC',
                        color: 'var(--tfd-text-muted)',
                        border: '1px solid var(--tfd-surface-border)',
                      }}
                    >
                      {f.meta.find((m) => m.key.toLowerCase() === 'tela')!.value.split('·')[0].trim()}
                    </div>
                  )}
                </div>
                {idx < epic.features.length - 1 && (
                  <div className="flex justify-center py-1" aria-hidden>
                    <span style={{ color: 'var(--tfd-text-muted)', fontFamily: 'var(--tfd-mono)' }}>↓</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────
   Painel de Markdown bruto (cronograma, README)
   ────────────────────────────────────────────────────── */

function MdPanel({ title, hint, raw }: { title: string; hint?: string; raw: string }) {
  return (
    <div>
      <Crumbs items={[{ label: 'Backlog' }, { label: title }]} />
      <div className="tfd-panel">
        <div className="tfd-panel-header">
          <div>
            <h2 className="text-[18px] font-bold" style={{ color: '#1A1D2B' }}>
              {title}
            </h2>
            {hint && <p className="mt-1 text-[13px]" style={{ color: 'var(--tfd-text-secondary)' }}>{hint}</p>}
          </div>
        </div>
        <div className="tfd-panel-content">
          <MarkdownView raw={raw} />
        </div>
      </div>
    </div>
  );
}

function MarkdownView({ raw }: { raw: string }) {
  // Renderer simples — só o que precisamos pros MDs do backlog.
  const stripped = raw.replace(/^---[\s\S]*?---\s*/m, '');
  const lines = stripped.split('\n');
  const out: React.ReactNode[] = [];
  let listBuf: string[] = [];

  const flushList = () => {
    if (listBuf.length === 0) return;
    out.push(
      <ul key={out.length} className="list-disc pl-5 my-2 text-[13.5px]" style={{ color: 'var(--tfd-text-primary)', lineHeight: 1.6 }}>
        {listBuf.map((l, i) => (
          <li key={i}><InlineMd text={l} /></li>
        ))}
      </ul>,
    );
    listBuf = [];
  };

  for (const line of lines) {
    if (/^\s*[-*]\s/.test(line)) {
      listBuf.push(line.replace(/^\s*[-*]\s/, ''));
      continue;
    }
    flushList();
    if (/^#\s/.test(line)) {
      out.push(
        <h2 key={out.length} className="text-[18px] font-bold mt-4 mb-2" style={{ color: '#1A1D2B' }}>
          {line.replace(/^#\s+/, '')}
        </h2>,
      );
    } else if (/^##\s/.test(line)) {
      out.push(
        <h3 key={out.length} className="text-[15px] font-semibold mt-3 mb-1" style={{ color: 'var(--tfd-text-primary)' }}>
          {line.replace(/^##\s+/, '')}
        </h3>,
      );
    } else if (/^###\s/.test(line)) {
      out.push(
        <h4 key={out.length} className="text-[13px] font-semibold uppercase tracking-wider mt-3 mb-1" style={{ color: 'var(--tfd-text-muted)' }}>
          {line.replace(/^###\s+/, '')}
        </h4>,
      );
    } else if (/^>/.test(line)) {
      out.push(
        <blockquote
          key={out.length}
          className="my-2 px-3 py-2 text-[13px] italic"
          style={{ borderLeft: '3px solid var(--tfd-blue-300)', background: '#F8FAFC', color: 'var(--tfd-text-secondary)' }}
        >
          <InlineMd text={line.replace(/^>\s?/, '')} />
        </blockquote>,
      );
    } else if (line.trim() === '') {
      // pula
    } else {
      out.push(
        <p key={out.length} className="text-[13.5px] my-1.5" style={{ color: 'var(--tfd-text-primary)', lineHeight: 1.6 }}>
          <InlineMd text={line} />
        </p>,
      );
    }
  }
  flushList();
  return <>{out}</>;
}

/**
 * Markdown inline mínimo: **bold**, *italic*, `code`, [link](url) e wikilinks
 * `[[arquivo|label]]` — comuns no vault Obsidian.
 */
function InlineMd({ text }: { text: string }) {
  // wikilinks → texto comum (não viram link pq apontam pra arquivo do vault)
  let t = text.replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2');
  t = t.replace(/\[\[([^\]]+)\]\]/g, '$1');

  // tokenização simples
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(t)) !== null) {
    if (m.index > lastIndex) parts.push(t.slice(lastIndex, m.index));
    const token = m[0];
    if (token.startsWith('**')) {
      parts.push(<strong key={key++}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('`')) {
      parts.push(
        <code
          key={key++}
          style={{
            background: '#F1F5F9',
            color: 'var(--tfd-text-primary)',
            padding: '1px 5px',
            borderRadius: 3,
            fontFamily: 'var(--tfd-mono)',
            fontSize: '0.88em',
          }}
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith('[')) {
      const linkMatch = token.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        parts.push(
          <a
            key={key++}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--tfd-blue-700)', textDecoration: 'underline', textUnderlineOffset: 2 }}
          >
            {linkMatch[1]}
          </a>,
        );
      } else {
        parts.push(token);
      }
    } else if (token.startsWith('*')) {
      parts.push(<em key={key++}>{token.slice(1, -1)}</em>);
    }
    lastIndex = m.index + token.length;
  }
  if (lastIndex < t.length) parts.push(t.slice(lastIndex));
  return <>{parts}</>;
}

function EmptyState() {
  return (
    <div className="text-center py-16" style={{ color: 'var(--tfd-text-muted)' }}>
      <p className="text-[14px]">Selecione um épico no menu lateral.</p>
    </div>
  );
}
