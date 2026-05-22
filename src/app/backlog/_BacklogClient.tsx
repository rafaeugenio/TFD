'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  ExternalLink,
  Square,
  CheckSquare2,
  User as UserIcon,
  Target,
  Zap,
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

type View = 'overview' | 'us';

/**
 * Checklist persistente em localStorage — dev marca US/Feature/Épico como feito
 * e o estado sobrevive a refresh e deploy. Chave única por ID (US-XXX, F01, EPIC-01).
 */
const CHECKLIST_KEY = 'tfd-backlog-done-v1';

function useChecklist() {
  const [done, setDone] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CHECKLIST_KEY);
      if (raw) setDone(new Set(JSON.parse(raw) as string[]));
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(CHECKLIST_KEY, JSON.stringify(Array.from(done)));
    } catch {}
  }, [done, hydrated]);

  /**
   * Marca/desmarca um id. Se `cascade` for informado (lista de ids filhos),
   * o estado do `id` é propagado em massa: marcar pai → marca todos filhos;
   * desmarcar pai → desmarca todos. Usado em Épicos (propaga p/ features + US)
   * e Features (propaga p/ US).
   */
  const toggle = useCallback((id: string, cascade?: string[]) => {
    setDone((prev) => {
      const next = new Set(prev);
      const willCheck = !next.has(id);
      if (willCheck) {
        next.add(id);
        for (const c of cascade ?? []) next.add(c);
      } else {
        next.delete(id);
        for (const c of cascade ?? []) next.delete(c);
      }
      return next;
    });
  }, []);

  const isDone = useCallback((id: string) => done.has(id), [done]);

  return { isDone, toggle, hydrated };
}

interface Checklist {
  isDone: (id: string) => boolean;
  toggle: (id: string, cascade?: string[]) => void;
  hydrated: boolean;
}

function featureProgress(feature: Feature, isDone: (id: string) => boolean) {
  const total = feature.userStories.length;
  const done = feature.userStories.filter((u) => isDone(u.id)).length;
  return { total, done };
}

function epicProgress(epic: Epic, isDone: (id: string) => boolean) {
  let total = 0;
  let done = 0;
  for (const f of epic.features) {
    for (const u of f.userStories) {
      total += 1;
      if (isDone(u.id)) done += 1;
    }
  }
  return { total, done };
}

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
  const checklist = useChecklist();

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
  const totalDone = tree.epics.reduce(
    (acc, e) => acc + e.features.reduce((a, f) => a + f.userStories.filter((u) => checklist.isDone(u.id)).length, 0),
    0,
  );
  const pctDone = totalUSs > 0 ? Math.round((totalDone / totalUSs) * 100) : 0;

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Épicos" value={totalEpicos} icon={<BookOpen size={16} />} />
        <StatCard label="Features" value={totalFeatures} icon={<ListChecks size={16} />} />
        <StatCard label="User stories" value={totalUSs} icon={<FileCode2 size={16} />} />
        <StatCard
          label="Concluídas"
          value={`${totalDone}/${totalUSs}`}
          icon={<CheckCircle2 size={16} />}
          tone="success"
        />
      </div>

      {/* Barra de progresso global + dica de checkbox */}
      <div
        className="mb-6 p-4 flex items-center gap-4"
        style={{
          background: 'white',
          border: '1px solid var(--tfd-surface-border)',
          borderRadius: 'var(--tfd-radius-lg)',
        }}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--tfd-text-muted)' }}>
              Progresso geral
            </span>
            <span className="text-[12px] font-mono font-semibold" style={{ color: 'var(--tfd-blue-700)' }}>
              {pctDone}% · {totalDone} de {totalUSs} US
            </span>
          </div>
          <div style={{ height: 6, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
            <div
              style={{
                width: `${pctDone}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--tfd-blue-500), #10B981)',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
        <p className="text-[11.5px] hidden md:block" style={{ color: 'var(--tfd-text-muted)', maxWidth: 260, lineHeight: 1.5 }}>
          Marque os checkboxes do menu lateral conforme conclui cada US. O estado fica salvo neste navegador.
        </p>
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
                      checklist={checklist}
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
          {us && feature && epic ? (
            <UserStoryPanel epic={epic} feature={feature} us={us} checklist={checklist} />
          ) : feature && epic ? (
            <FeaturePanel
              epic={epic}
              feature={feature}
              checklist={checklist}
              onSelectUs={(u) => setSelection({ epicCode: epic.code, featureCode: feature.code, usId: u.id })}
            />
          ) : epic ? (
            <EpicOverview
              epic={epic}
              checklist={checklist}
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

function CheckboxCell({
  checked,
  onToggle,
  size = 14,
  title,
}: {
  checked: boolean;
  onToggle: () => void;
  size?: number;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      aria-label={checked ? 'Desmarcar como feito' : 'Marcar como feito'}
      title={title ?? (checked ? 'Feito — clique para desmarcar' : 'Marcar como feito')}
      className="flex-shrink-0 flex items-center justify-center rounded transition-colors"
      style={{
        width: size + 4,
        height: size + 4,
        color: checked ? '#059669' : 'var(--tfd-text-muted)',
        background: 'transparent',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = checked ? '#ECFDF5' : '#F1F5F9';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {checked ? <CheckSquare2 size={size} strokeWidth={2.5} /> : <Square size={size} strokeWidth={1.8} />}
    </button>
  );
}

function ProgressDot({ done, total }: { done: number; total: number }) {
  if (total === 0) return null;
  const pct = Math.round((done / total) * 100);
  const complete = done === total;
  return (
    <span
      className="ml-auto inline-flex items-center gap-1 text-[10px] flex-shrink-0"
      style={{
        fontFamily: 'var(--tfd-mono)',
        color: complete ? '#059669' : 'var(--tfd-text-muted)',
        fontWeight: complete ? 600 : 500,
      }}
      title={`${done} de ${total} concluídas`}
    >
      {complete && <CheckCircle2 size={11} />}
      <span>{done}/{total}</span>
    </span>
  );
}

function EpicNode({
  epic,
  isOpen,
  onToggle,
  selection,
  checklist,
  onSelectEpic,
  onSelectFeature,
  onSelectUs,
}: {
  epic: Epic;
  isOpen: boolean;
  onToggle: () => void;
  selection: Selection;
  checklist: Checklist;
  onSelectEpic: () => void;
  onSelectFeature: (f: Feature) => void;
  onSelectUs: (f: Feature, u: UserStory) => void;
}) {
  const isActive = selection.epicCode === epic.code;
  const prog = epicProgress(epic, checklist.isDone);
  const epicDone = checklist.isDone(epic.code);

  return (
    <div>
      <div
        className="flex items-center gap-1 px-1 py-1.5"
        style={{
          background: isActive && !selection.featureCode ? 'var(--tfd-blue-50)' : 'transparent',
          borderRadius: 6,
        }}
      >
        <CheckboxCell
          checked={epicDone}
          onToggle={() => checklist.toggle(epic.code, [
            ...epic.features.map((f) => f.code),
            ...epic.features.flatMap((f) => f.userStories.map((u) => u.id)),
          ])}
          size={14}
          title={epicDone ? 'Épico marcado como concluído' : 'Marcar épico inteiro como concluído (propaga p/ features + US)'}
        />
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
          style={{
            color: isActive ? 'var(--tfd-blue-700)' : 'var(--tfd-text-primary)',
            opacity: epicDone ? 0.6 : 1,
          }}
        >
          <span
            className="font-mono text-[10px] flex-shrink-0"
            style={{ color: 'var(--tfd-text-muted)' }}
          >
            {epic.code}
          </span>
          <span
            className="text-[12.5px] truncate"
            style={{
              fontWeight: isActive ? 600 : 500,
              textDecoration: epicDone ? 'line-through' : 'none',
            }}
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
          <ProgressDot done={prog.done} total={prog.total} />
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
              checklist={checklist}
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
  checklist,
  onSelect,
  onSelectUs,
}: {
  feature: Feature;
  isActive: boolean;
  selectedUsId?: string;
  checklist: Checklist;
  onSelect: () => void;
  onSelectUs: (u: UserStory) => void;
}) {
  const [open, setOpen] = useState(isActive);
  // Mantém aberto se está ativo
  const isOpen = open || isActive;
  const prog = featureProgress(feature, checklist.isDone);
  const featureDone = checklist.isDone(feature.code);

  return (
    <li>
      <div
        className="flex items-center gap-1 px-1 py-1"
        style={{
          background: isActive && !selectedUsId ? 'var(--tfd-blue-50)' : 'transparent',
          borderRadius: 6,
        }}
      >
        <CheckboxCell
          checked={featureDone}
          onToggle={() => checklist.toggle(feature.code, feature.userStories.map((u) => u.id))}
          size={12}
          title={featureDone ? 'Feature marcada como concluída' : 'Marcar feature como concluída (propaga p/ US)'}
        />
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
          style={{
            color: isActive ? 'var(--tfd-blue-700)' : 'var(--tfd-text-secondary)',
            opacity: featureDone ? 0.6 : 1,
          }}
        >
          <span className="font-mono text-[10px] flex-shrink-0" style={{ color: 'var(--tfd-text-muted)' }}>
            {feature.code}
          </span>
          <span
            className="truncate"
            style={{
              fontWeight: isActive ? 600 : 400,
              textDecoration: featureDone ? 'line-through' : 'none',
            }}
          >
            {feature.title}
          </span>
          <ProgressDot done={prog.done} total={prog.total} />
        </button>
      </div>

      {isOpen && feature.userStories.length > 0 && (
        <ul className="ml-3 mt-0.5 mb-1 pl-2" style={{ borderLeft: '1px solid var(--tfd-surface-border)' }}>
          {feature.userStories.map((u) => {
            const usDone = checklist.isDone(u.id);
            const isUsActive = u.id === selectedUsId;
            return (
              <li key={u.id}>
                <div
                  className="flex items-center gap-1 px-1 py-0.5 transition-colors"
                  style={{
                    background: isUsActive ? 'var(--tfd-blue-50)' : 'transparent',
                    borderRadius: 6,
                  }}
                >
                  <CheckboxCell
                    checked={usDone}
                    onToggle={() => checklist.toggle(u.id)}
                    size={11}
                  />
                  <button
                    type="button"
                    onClick={() => onSelectUs(u)}
                    className="flex-1 text-left px-1 py-1 text-[11.5px] flex items-center gap-2 transition-colors min-w-0"
                    style={{
                      color: isUsActive ? 'var(--tfd-blue-700)' : 'var(--tfd-text-secondary)',
                      fontWeight: isUsActive ? 600 : 400,
                      opacity: usDone ? 0.55 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!isUsActive) e.currentTarget.style.background = '#F8FAFC';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    <span className="font-mono text-[10px] flex-shrink-0" style={{ color: 'var(--tfd-text-muted)' }}>
                      {u.id.replace(/^US-/, '')}
                    </span>
                    <span
                      className="truncate"
                      style={{ textDecoration: usDone ? 'line-through' : 'none' }}
                    >
                      {u.title}
                    </span>
                  </button>
                </div>
              </li>
            );
          })}
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
  tone?: 'default' | 'warning' | 'success';
}) {
  const colors =
    tone === 'warning'
      ? { iconBg: '#FFFBEB', iconFg: '#92400E' }
      : tone === 'success'
        ? { iconBg: '#ECFDF5', iconFg: '#047857' }
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
  checklist,
  onSelectFeature,
  onSelectUs,
}: {
  epic: Epic;
  checklist: Checklist;
  onSelectFeature: (f: Feature) => void;
  onSelectUs: (f: Feature, u: UserStory) => void;
}) {
  const prog = epicProgress(epic, checklist.isDone);
  const pct = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
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
          <p className="text-[13.5px] mb-3" style={{ color: 'var(--tfd-text-secondary)', lineHeight: 1.6 }}>
            {epic.pendente
              ? 'Este épico foi documentado mas ainda aguarda validação dos setores. Não está alocado em sprints — pode haver ajustes antes da implementação.'
              : 'Validado pelos setores e refletido no protótipo. As features abaixo são prontas para virar PBIs no Azure DevOps.'}
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1" style={{ height: 8, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: pct === 100 ? '#10B981' : 'var(--tfd-blue-500)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <span className="text-[12px] font-mono font-semibold flex-shrink-0" style={{ color: pct === 100 ? '#047857' : 'var(--tfd-blue-700)' }}>
              {prog.done}/{prog.total} US · {pct}%
            </span>
          </div>
        </div>
      </div>

      {/* Lista de features */}
      <div className="flex flex-col gap-3">
        {epic.features.map((f) => {
          const fp = featureProgress(f, checklist.isDone);
          const fpct = fp.total > 0 ? Math.round((fp.done / fp.total) * 100) : 0;
          const fdone = checklist.isDone(f.code);
          return (
          <div
            key={f.code}
            className="p-4 transition-all"
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
              <CheckboxCell checked={fdone} onToggle={() => checklist.toggle(f.code, f.userStories.map((u) => u.id))} size={16} />
              <button
                type="button"
                onClick={() => onSelectFeature(f)}
                className="font-mono text-[11px] font-semibold uppercase px-2 py-1 rounded flex-shrink-0 cursor-pointer"
                style={{ background: 'var(--tfd-blue-50)', color: 'var(--tfd-blue-700)' }}
              >
                {f.code}
              </button>
              <div className="flex-1 min-w-0" onClick={() => onSelectFeature(f)} style={{ cursor: 'pointer' }}>
                <div className="flex items-center justify-between gap-3 mb-1">
                  <h3
                    className="text-[15px] font-semibold"
                    style={{
                      color: 'var(--tfd-text-primary)',
                      textDecoration: fdone ? 'line-through' : 'none',
                      opacity: fdone ? 0.7 : 1,
                    }}
                  >
                    {f.title}
                  </h3>
                  <span
                    className="text-[11px] font-mono font-semibold flex-shrink-0"
                    style={{ color: fpct === 100 ? '#047857' : 'var(--tfd-text-muted)' }}
                  >
                    {fp.done}/{fp.total} · {fpct}%
                  </span>
                </div>
                <div className="mb-2" style={{ height: 4, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${fpct}%`,
                      height: '100%',
                      background: fpct === 100 ? '#10B981' : 'var(--tfd-blue-400, #60a5fa)',
                    }}
                  />
                </div>
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
                  {f.userStories.map((u) => {
                    const udone = checklist.isDone(u.id);
                    return (
                      <span
                        key={u.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectUs(f, u);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium cursor-pointer transition-colors"
                        style={{
                          background: udone ? '#ECFDF5' : '#F8FAFC',
                          color: udone ? '#047857' : 'var(--tfd-text-secondary)',
                          border: '1px solid ' + (udone ? '#A7F3D0' : 'var(--tfd-surface-border)'),
                          borderRadius: 6,
                          textDecoration: udone ? 'line-through' : 'none',
                        }}
                        title={u.title}
                      >
                        {udone && <CheckCircle2 size={11} />}
                        <span style={{ fontFamily: 'var(--tfd-mono)', color: udone ? '#059669' : 'var(--tfd-text-muted)' }}>
                          {u.id}
                        </span>
                        <span className="truncate" style={{ maxWidth: 180 }}>{u.title}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

function FeaturePanel({
  epic,
  feature,
  checklist,
  onSelectUs,
}: {
  epic: Epic;
  feature: Feature;
  checklist: Checklist;
  onSelectUs: (u: UserStory) => void;
}) {
  const prog = featureProgress(feature, checklist.isDone);
  const pct = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
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
          <div className="flex items-start gap-3 w-full">
            <CheckboxCell checked={checklist.isDone(feature.code)} onToggle={() => checklist.toggle(feature.code, feature.userStories.map((u) => u.id))} size={18} />
            <div className="flex-1 min-w-0">
              <h2 className="text-[20px] font-bold" style={{ color: '#1A1D2B', letterSpacing: '-0.02em' }}>
                {feature.code} — {feature.title}
              </h2>
              {feature.description && (
                <p className="mt-2 text-[14px]" style={{ color: 'var(--tfd-text-secondary)', lineHeight: 1.6 }}>
                  {feature.description}
                </p>
              )}
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1" style={{ height: 6, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden', maxWidth: 360 }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: '100%',
                      background: pct === 100 ? '#10B981' : 'var(--tfd-blue-500)',
                    }}
                  />
                </div>
                <span className="text-[12px] font-mono font-semibold" style={{ color: pct === 100 ? '#047857' : 'var(--tfd-blue-700)' }}>
                  {prog.done}/{prog.total} · {pct}%
                </span>
              </div>
            </div>
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
        {feature.userStories.map((u) => {
          const udone = checklist.isDone(u.id);
          const parsed = parseStory(u.story);
          return (
            <div
              key={u.id}
              className="p-3 transition-all"
              style={{
                background: udone ? '#F8FFFB' : 'white',
                border: '1px solid ' + (udone ? '#A7F3D0' : 'var(--tfd-surface-border)'),
                borderRadius: 'var(--tfd-radius-md, 8px)',
              }}
            >
              <div className="flex items-start gap-3">
                <CheckboxCell checked={udone} onToggle={() => checklist.toggle(u.id)} size={16} />
                <span
                  className="font-mono text-[11px] font-semibold uppercase px-2 py-1 rounded flex-shrink-0"
                  style={{ background: 'var(--tfd-blue-50)', color: 'var(--tfd-blue-700)' }}
                >
                  {u.id}
                </span>
                <button
                  type="button"
                  onClick={() => onSelectUs(u)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div
                    className="text-[14px] font-semibold"
                    style={{
                      color: 'var(--tfd-text-primary)',
                      textDecoration: udone ? 'line-through' : 'none',
                      opacity: udone ? 0.7 : 1,
                    }}
                  >
                    {u.title}
                  </div>
                  {/* Story compacto em pills */}
                  {parsed && (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {parsed.persona && <StoryPill icon={<UserIcon size={10} />} label="Persona" value={parsed.persona} tone="purple" />}
                      {parsed.quero && <StoryPill icon={<Zap size={10} />} label="Quer" value={parsed.quero} tone="blue" />}
                      {parsed.paraQue && <StoryPill icon={<Target size={10} />} label="Para" value={parsed.paraQue} tone="green" />}
                    </div>
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
                </button>
                <ChevronRight size={14} style={{ color: 'var(--tfd-text-muted)', flexShrink: 0, marginTop: 4 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Parse de "**Como** X, **Quero** Y, **Para que** Z" para 3 pedaços. Aceita
 * variações pequenas (com ou sem vírgulas, com **Para** ou **Para que**).
 */
function parseStory(story?: string): { persona: string; quero: string; paraQue: string } | null {
  if (!story) return null;
  // Normaliza: tira **, troca quebras de linha por espaço (substitui flag `s`).
  const clean = story.replace(/\*\*/g, '').replace(/\s+/g, ' ');
  const m = clean.match(/Como\s+(.+?),?\s*Quero\s+(.+?),?\s*Para(?:\s+que)?\s+(.+)/i);
  if (!m) return null;
  return {
    persona: m[1].trim().replace(/[.,;]$/, ''),
    quero: m[2].trim().replace(/[.,;]$/, ''),
    paraQue: m[3].trim().replace(/[.,;]$/, ''),
  };
}

function StoryPill({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: 'purple' | 'blue' | 'green';
}) {
  const palette = {
    purple: { bg: '#F5F3FF', fg: '#5B21B6', border: '#DDD6FE' },
    blue: { bg: 'var(--tfd-blue-50)', fg: 'var(--tfd-blue-700)', border: '#BFDBFE' },
    green: { bg: '#ECFDF5', fg: '#047857', border: '#A7F3D0' },
  }[tone];
  return (
    <span
      className="inline-flex items-start gap-1.5 px-2 py-1 text-[11px]"
      style={{
        background: palette.bg,
        color: palette.fg,
        border: `1px solid ${palette.border}`,
        borderRadius: 6,
        maxWidth: '100%',
      }}
    >
      <span className="flex-shrink-0 mt-[2px]">{icon}</span>
      <span>
        <span className="font-semibold uppercase tracking-wider" style={{ fontSize: 9, opacity: 0.8, marginRight: 4 }}>
          {label}
        </span>
        <span>{value}</span>
      </span>
    </span>
  );
}

function UserStoryPanel({
  epic,
  feature,
  us,
  checklist,
}: {
  epic: Epic;
  feature: Feature;
  us: UserStory;
  checklist: Checklist;
}) {
  const parsed = parseStory(us.story);
  const usDone = checklist.isDone(us.id);
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

      {/* Header da US — código + título + status + checkbox */}
      <div className="tfd-panel mb-4">
        <div className="tfd-panel-header" style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <CheckboxCell checked={usDone} onToggle={() => checklist.toggle(us.id)} size={20} />
          <span
            className="font-mono text-[12px] font-semibold uppercase px-2.5 py-1 rounded"
            style={{ background: 'var(--tfd-blue-50)', color: 'var(--tfd-blue-700)', flexShrink: 0 }}
          >
            {us.id}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2
                className="text-[20px] font-bold"
                style={{
                  color: '#1A1D2B',
                  letterSpacing: '-0.02em',
                  textDecoration: usDone ? 'line-through' : 'none',
                  opacity: usDone ? 0.7 : 1,
                }}
              >
                {us.title}
              </h2>
              {usDone && (
                <span
                  className="text-[10px] font-semibold uppercase tracking-wider px-2 py-[2px] rounded inline-flex items-center gap-1"
                  style={{ background: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0' }}
                >
                  <CheckCircle2 size={11} /> Concluída
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--tfd-text-muted)' }}>
              {epic.code} · {feature.code} — {feature.title}
            </p>
          </div>
        </div>
      </div>

      {/* Canvas Persona / Quer / Para que — 3 colunas visuais */}
      {parsed ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          <StoryCanvasCard
            title="Persona"
            label="Como"
            icon={<UserIcon size={14} />}
            tone="purple"
            value={parsed.persona}
          />
          <StoryCanvasCard
            title="Quer fazer"
            label="Quero"
            icon={<Zap size={14} />}
            tone="blue"
            value={parsed.quero}
          />
          <StoryCanvasCard
            title="Para que"
            label="Para que"
            icon={<Target size={14} />}
            tone="green"
            value={parsed.paraQue}
          />
        </div>
      ) : (
        us.story && (
          <div className="tfd-panel mb-5">
            <div
              className="tfd-panel-content"
              style={{
                background: '#FAFCFF',
                borderLeft: '3px solid var(--tfd-blue-500)',
                fontStyle: 'italic',
                fontSize: 14,
                lineHeight: 1.6,
                color: 'var(--tfd-text-primary)',
              }}
            >
              <InlineMd text={us.story} />
            </div>
          </div>
        )
      )}

      {us.sections.map((sec, i) => (
        <SectionRenderer key={i} section={sec} />
      ))}
    </div>
  );
}

function StoryCanvasCard({
  title,
  label,
  icon,
  tone,
  value,
}: {
  title: string;
  label: string;
  icon: React.ReactNode;
  tone: 'purple' | 'blue' | 'green';
  value: string;
}) {
  // Paleta unificada (cinza/azul) — tons antes eram saturados (roxo/verde),
  // ficou poluído. Mantemos só uma pitada de azul para destacar como bloco.
  void tone;
  const palette = {
    bg: 'white',
    fg: 'var(--tfd-blue-700)',
    border: 'var(--tfd-surface-border)',
    accent: 'var(--tfd-blue-500)',
  };
  return (
    <div
      className="p-4 flex flex-col"
      style={{
        background: palette.bg,
        border: `1px solid ${palette.border}`,
        borderTop: `3px solid ${palette.accent}`,
        borderRadius: 'var(--tfd-radius-lg)',
        minHeight: 110,
      }}
    >
      <div className="flex items-center gap-1.5 mb-2" style={{ color: palette.fg }}>
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wider">{title}</span>
      </div>
      <p className="text-[13.5px]" style={{ color: 'var(--tfd-text-primary)', lineHeight: 1.5 }}>
        <span className="font-semibold" style={{ color: palette.fg }}>{label}</span>{' '}
        <InlineMd text={value} />
      </p>
    </div>
  );
}

/**
 * Renderiza qualquer seção de User Story de forma adequada ao conteúdo.
 * Para seções com semântica forte (Critérios de aceite, Regras de negócio,
 * Side effects, Dependências, Estados visuais), usamos renderers visuais
 * dedicados — o resto cai no SectionBody genérico (tabelas / listas / paragráfos).
 */
function SectionRenderer({ section }: { section: UserStorySection }) {
  const title = section.title;
  const body = section.body;
  const t = title.toLowerCase();
  const meta = sectionMeta(title);

  // Listas estruturadas (cada item começa com `-` ou `[ ]`)
  const items = parseListItems(body);
  const hasOnlyList = items !== null && !hasTable(body);

  if (hasOnlyList) {
    if (t.startsWith('critérios')) {
      return (
        <Section title={title} icon={meta.icon}>
          <CriteriaList items={items!} />
        </Section>
      );
    }
    if (t.startsWith('regras')) {
      return (
        <Section title={title} icon={meta.icon}>
          <RulesList items={items!} />
        </Section>
      );
    }
    if (t.startsWith('side effects')) {
      return (
        <Section title={title} icon={meta.icon}>
          <SideEffectsTimeline items={items!} />
        </Section>
      );
    }
    if (t.startsWith('dependências') || t.startsWith('dependencias')) {
      return (
        <Section title={title} icon={meta.icon}>
          <DependencyChips items={items!} />
        </Section>
      );
    }
    if (t.startsWith('estados visuais') || t === 'estados') {
      return (
        <Section title={title} icon={meta.icon}>
          <StatesGrid items={items!} />
        </Section>
      );
    }
  }

  return (
    <Section title={title} icon={meta.icon}>
      <SectionBody body={body} bulletStyle={meta.bulletStyle} />
    </Section>
  );
}

function parseListItems(body: string): string[] | null {
  const lines = body.split('\n').map((l) => l.replace(/\s+$/, ''));
  const items: string[] = [];
  let buf: string | null = null;
  for (const line of lines) {
    if (/^\s*-\s+/.test(line)) {
      if (buf !== null) items.push(buf);
      buf = line.replace(/^\s*-\s+/, '').replace(/^\[\s*\]\s*/, '');
    } else if (line.trim() === '' || /^\s*\|/.test(line)) {
      if (buf !== null) {
        items.push(buf);
        buf = null;
      }
      if (/^\s*\|/.test(line)) return null;
    } else if (buf !== null && /^\s{2,}/.test(line)) {
      // continuação de item (linha indentada)
      buf += ' ' + line.trim();
    } else if (buf === null && line.trim() !== '') {
      // texto fora de lista — abandona
      return null;
    }
  }
  if (buf !== null) items.push(buf);
  return items.length > 0 ? items : null;
}

function hasTable(body: string): boolean {
  return body.split('\n').some((l) => /^\s*\|/.test(l));
}

/**
 * Critérios de aceite — cada item é uma "regra de aceite" que o dev valida.
 * Mostramos com um checkbox decorativo verde e bordas suaves. Se o item começa
 * com Dado/Quando/Então, destacamos o conector.
 */
function CriteriaList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item, i) => {
        const gherkin = item.match(/^(Dado|Quando|Então|Entao|E)\s+(.+)/i);
        return (
          <li
            key={i}
            className="flex items-start gap-2.5 p-2.5"
            style={{
              background: 'white',
              border: '1px solid var(--tfd-surface-border)',
              borderRadius: 6,
              lineHeight: 1.5,
            }}
          >
            <CheckCircle2 size={14} style={{ color: 'var(--tfd-text-muted)', flexShrink: 0, marginTop: 2 }} />
            <span className="text-[13px]" style={{ color: 'var(--tfd-text-primary)' }}>
              {gherkin ? (
                <>
                  <span
                    className="font-mono font-semibold text-[10.5px] uppercase tracking-wider mr-1.5 px-1 py-[1px] rounded"
                    style={{ background: '#F1F5F9', color: 'var(--tfd-text-secondary)' }}
                  >
                    {gherkin[1]}
                  </span>
                  <InlineMd text={gherkin[2]} />
                </>
              ) : (
                <InlineMd text={item} />
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Regras de negócio — cada item recebe um número (RN-1, RN-2...) em chip azul. */
function RulesList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex items-start gap-2.5 p-2.5"
          style={{
            background: 'white',
            border: '1px solid var(--tfd-surface-border)',
            borderLeft: '3px solid var(--tfd-blue-500)',
            borderRadius: 6,
            lineHeight: 1.5,
          }}
        >
          <span
            className="font-mono text-[10.5px] font-bold flex-shrink-0 mt-[1px] px-1.5 py-[2px] rounded"
            style={{ background: 'var(--tfd-blue-50)', color: 'var(--tfd-blue-700)' }}
          >
            RN-{String(i + 1).padStart(2, '0')}
          </span>
          <span className="text-[13px]" style={{ color: 'var(--tfd-text-primary)' }}>
            <InlineMd text={item} />
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Side effects — timeline numerada (passos ordenados). */
function SideEffectsTimeline({ items }: { items: string[] }) {
  return (
    <ol className="flex flex-col gap-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3">
          <div className="flex flex-col items-center flex-shrink-0" style={{ width: 24 }}>
            <span
              className="font-mono text-[10.5px] font-bold flex items-center justify-center rounded-full"
              style={{
                width: 22,
                height: 22,
                background: '#F1F5F9',
                color: 'var(--tfd-text-secondary)',
                border: '1px solid var(--tfd-surface-border)',
              }}
            >
              {i + 1}
            </span>
            {i < items.length - 1 && (
              <span style={{ width: 1, flex: 1, background: 'var(--tfd-surface-border)', minHeight: 8 }} />
            )}
          </div>
          <span className="text-[13px] pb-2" style={{ color: 'var(--tfd-text-primary)', lineHeight: 1.5 }}>
            <InlineMd text={item} />
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Dependências — chips com → para ficar claro que "depende disso". */
function DependencyChips({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <li
          key={i}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[12px]"
          style={{
            background: '#F8FAFC',
            border: '1px dashed var(--tfd-surface-border)',
            borderRadius: 6,
            color: 'var(--tfd-text-primary)',
          }}
        >
          <ExternalLink size={11} style={{ color: 'var(--tfd-text-muted)', flexShrink: 0 }} />
          <InlineMd text={item} />
        </li>
      ))}
    </ul>
  );
}

/**
 * Estados visuais — destaca o nome do estado (antes do `:` ou primeira palavra
 * em **negrito**) em chip colorido, e descrição ao lado. Ajuda a ler "ó isso é
 * um mini-wireframe das variações da tela".
 */
function StatesGrid({ items }: { items: string[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {items.map((item, i) => {
        const stateName = extractStateName(item);
        const rest = stateName ? item.replace(/^(\*\*[^*]+\*\*|[^:—-]+)([:—-])\s*/, '') : item;
        return (
          <div
            key={i}
            className="p-2.5"
            style={{
              background: 'white',
              border: '1px solid var(--tfd-surface-border)',
              borderRadius: 6,
              borderLeft: '3px solid var(--tfd-text-muted)',
            }}
          >
            {stateName && (
              <span
                className="inline-block text-[10.5px] font-semibold uppercase tracking-wider mb-1 px-1.5 py-[2px] rounded"
                style={{ background: '#F1F5F9', color: 'var(--tfd-text-secondary)' }}
              >
                {stateName}
              </span>
            )}
            <p className="text-[12.5px]" style={{ color: 'var(--tfd-text-secondary)', lineHeight: 1.5 }}>
              <InlineMd text={rest} />
            </p>
          </div>
        );
      })}
    </div>
  );
}

function extractStateName(item: string): string | null {
  const bold = item.match(/^\*\*([^*]+)\*\*/);
  if (bold) return bold[1].replace(/[:—-]\s*$/, '').trim();
  const colon = item.match(/^([^:—-]{2,40})\s*[:—-]/);
  if (colon) return colon[1].trim();
  return null;
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
