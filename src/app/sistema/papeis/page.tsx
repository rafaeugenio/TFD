'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Plus,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Circle,
  Loader2,
  Shield,
  Trash2,
  Pencil,
  Check,
  X,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import EmptyState from '@/shared/components/empty-state/EmptyState';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import {
  listarPapeis,
  listarTelas,
  contarUsuariosPorPapel,
  listarTelasDoPapel,
  criarPapel,
  atualizarPapel,
  excluirPapel,
  salvarTelasDoPapel,
} from '@/services/papeis.service';
import type { Papel, TelaSistema } from '@/services/papeis.service';

/* -------------------------------------------------- */
/*  Constants                                          */
/* -------------------------------------------------- */

const DEFAULT_COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B',
  '#10B981', '#EF4444', '#06B6D4', '#F97316',
];

/* -------------------------------------------------- */
/*  Helpers                                            */
/* -------------------------------------------------- */

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

function groupTelasByModule(telas: TelaSistema[]): Record<string, TelaSistema[]> {
  const groups: Record<string, TelaSistema[]> = {};
  for (const tela of telas) {
    if (!groups[tela.modulo]) groups[tela.modulo] = [];
    groups[tela.modulo].push(tela);
  }
  return groups;
}

/* -------------------------------------------------- */
/*  Indeterminate checkbox                             */
/* -------------------------------------------------- */

function IndeterminateCheckbox({
  checked,
  indeterminate,
  onChange,
  id,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      style={{ accentColor: 'var(--tfd-primary-500)' }}
    />
  );
}

/* -------------------------------------------------- */
/*  Page Component                                     */
/* -------------------------------------------------- */

export default function PapeisPage() {
  /* ---- Data state ---- */
  const [papeis, setPapeis] = useState<Papel[]>([]);
  const [telas, setTelas] = useState<TelaSistema[]>([]);
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  /* ---- Accordion state ---- */
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedTelas, setExpandedTelas] = useState<string[]>([]);
  const [loadingExpand, setLoadingExpand] = useState(false);

  /* ---- Drawer state ---- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPapel, setEditingPapel] = useState<Papel | null>(null);
  const [saving, setSaving] = useState(false);

  /* ---- Form state ---- */
  const [formNome, setFormNome] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formCor, setFormCor] = useState(DEFAULT_COLORS[0]);
  const [formTelas, setFormTelas] = useState<string[]>([]);

  /* ---- Grouped telas ---- */
  const telasByModule = useMemo(() => groupTelasByModule(telas), [telas]);
  const moduleNames = useMemo(() => Object.keys(telasByModule), [telasByModule]);

  /* ---- Data loading ---- */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [papeisRes, telasRes, usersRes] = await Promise.all([
        listarPapeis(),
        listarTelas(),
        contarUsuariosPorPapel(),
      ]);

      const papeisData = (papeisRes.data as unknown as Papel[]) ?? [];
      const telasData = (telasRes.data as unknown as TelaSistema[]) ?? [];
      const usersData = (usersRes.data as unknown as { papel_id: string }[]) ?? [];

      setPapeis(papeisData);
      setTelas(telasData);

      // Count users per papel
      const counts: Record<string, number> = {};
      for (const row of usersData) {
        counts[row.papel_id] = (counts[row.papel_id] || 0) + 1;
      }
      setUserCounts(counts);
    } catch {
      // Silently handle — empty state will show
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ---- Accordion expand ---- */
  async function handleToggleExpand(papelId: string) {
    if (expandedId === papelId) {
      setExpandedId(null);
      setExpandedTelas([]);
      return;
    }

    setExpandedId(papelId);
    setLoadingExpand(true);
    try {
      const res = await listarTelasDoPapel(papelId);
      const data = (res.data as unknown as { tela_id: string }[]) ?? [];
      setExpandedTelas(data.map((r) => r.tela_id));
    } catch {
      setExpandedTelas([]);
    } finally {
      setLoadingExpand(false);
    }
  }

  /* ---- Drawer open/close ---- */
  function handleOpenCreate() {
    setEditingPapel(null);
    setFormNome('');
    setFormDescricao('');
    setFormCor(DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)]);
    setFormTelas([]);
    setDrawerOpen(true);
  }

  async function handleOpenEdit(papel: Papel) {
    setEditingPapel(papel);
    setFormNome(papel.nome);
    setFormDescricao(papel.descricao ?? '');
    setFormCor(papel.cor);

    // Load telas for this papel
    try {
      const res = await listarTelasDoPapel(papel.id);
      const data = (res.data as unknown as { tela_id: string }[]) ?? [];
      setFormTelas(data.map((r) => r.tela_id));
    } catch {
      setFormTelas([]);
    }

    setDrawerOpen(true);
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
    setEditingPapel(null);
  }

  /* ---- Form: toggle telas ---- */
  function toggleTela(telaId: string) {
    setFormTelas((prev) =>
      prev.includes(telaId) ? prev.filter((id) => id !== telaId) : [...prev, telaId],
    );
  }

  function toggleModule(modulo: string) {
    const moduleTelas = telasByModule[modulo] ?? [];
    const moduleTelaIds = moduleTelas.map((t) => t.id);
    const allSelected = moduleTelaIds.every((id) => formTelas.includes(id));

    if (allSelected) {
      setFormTelas((prev) => prev.filter((id) => !moduleTelaIds.includes(id)));
    } else {
      setFormTelas((prev) => [...new Set([...prev, ...moduleTelaIds])]);
    }
  }

  function selectAllTelas() {
    setFormTelas(telas.map((t) => t.id));
  }

  function selectNoneTelas() {
    setFormTelas([]);
  }

  /* ---- Save ---- */
  async function handleSave() {
    if (!formNome.trim()) return;

    setSaving(true);
    try {
      if (editingPapel) {
        await atualizarPapel(editingPapel.id, {
          nome: formNome.trim(),
          descricao: formDescricao.trim() || undefined,
          cor: formCor,
        });
        await salvarTelasDoPapel(editingPapel.id, formTelas);
      } else {
        const res = await criarPapel({
          nome: formNome.trim(),
          descricao: formDescricao.trim() || undefined,
          cor: formCor,
        });
        const newPapel = res.data as unknown as Papel;
        if (newPapel?.id) {
          await salvarTelasDoPapel(newPapel.id, formTelas);
        }
      }
      handleCloseDrawer();
      await loadData();
    } catch {
      // Error handling could be enhanced
    } finally {
      setSaving(false);
    }
  }

  /* ---- Delete ---- */
  async function handleDelete(papel: Papel) {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o papel "${papel.nome}"? Esta ação não pode ser desfeita.`,
    );
    if (!confirmed) return;

    try {
      await excluirPapel(papel.id);
      if (expandedId === papel.id) {
        setExpandedId(null);
        setExpandedTelas([]);
      }
      await loadData();
    } catch {
      // Silently handle
    }
  }

  /* ---- Helper: screen count text for a papel ---- */
  function getScreenCountText(papelTelaIds: string[]): string {
    const total = telas.length;
    const count = papelTelaIds.length;
    if (count === total && total > 0) return 'Acesso total';
    return `${count} de ${total} telas`;
  }

  /* ---- Module states for expanded view ---- */
  function getModuleStats(moduleTelaIds: string[], selectedTelaIds: string[]) {
    const selected = moduleTelaIds.filter((id) => selectedTelaIds.includes(id)).length;
    return { selected, total: moduleTelaIds.length };
  }

  /* -------------------------------------------------- */
  /*  Render                                             */
  /* -------------------------------------------------- */

  return (
    <>
      <PageHeader
        title="Permissões"
        subtitle="Crie e configure permissões de acesso por tela"
        actions={
          <button className="tfd-btn tfd-btn-primary" onClick={handleOpenCreate}>
            <Plus size={16} />
            Novo Papel
          </button>
        }
      />

      {/* ========== Loading ========== */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2
            size={32}
            className="animate-spin"
            style={{ color: 'var(--tfd-primary-500)' }}
          />
        </div>
      )}

      {/* ========== Empty state ========== */}
      {!loading && papeis.length === 0 && (
        <EmptyState
          icon={<Shield />}
          title="Nenhum papel cadastrado"
          description="Crie papéis para definir quais telas cada grupo de usuários pode acessar."
          action={
            <button className="tfd-btn tfd-btn-primary" onClick={handleOpenCreate}>
              <Plus size={16} />
              Novo Papel
            </button>
          }
        />
      )}

      {/* ========== Papel cards (accordion) ========== */}
      {!loading && papeis.length > 0 && (
        <div className="flex flex-col gap-3">
          {papeis.map((papel) => {
            const isExpanded = expandedId === papel.id;
            const usrCount = userCounts[papel.id] ?? 0;

            return (
              <div key={papel.id} className="tfd-card p-0 overflow-hidden">
                {/* Card header — clickable */}
                <button
                  type="button"
                  className="w-full flex items-center gap-4 px-5 py-4 text-left"
                  style={{ background: 'transparent' }}
                  onClick={() => handleToggleExpand(papel.id)}
                >
                  {/* Avatar */}
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-full shrink-0 text-sm font-bold"
                    style={{
                      backgroundColor: papel.cor,
                      color: '#FFFFFF',
                    }}
                  >
                    {getInitials(papel.nome)}
                  </div>

                  {/* Name */}
                  <span
                    className="font-semibold text-base flex-1 min-w-0 truncate"
                    style={{ color: 'var(--tfd-text-primary)' }}
                  >
                    {papel.nome}
                  </span>

                  {/* Badges */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="tfd-tag tfd-tag--rounded text-xs"
                      style={{
                        backgroundColor: 'var(--tfd-surface-100)',
                        color: 'var(--tfd-text-secondary)',
                      }}
                    >
                      {usrCount} usuário{usrCount !== 1 ? 's' : ''}
                    </span>

                    {isExpanded && !loadingExpand ? (
                      <span
                        className="tfd-tag tfd-tag--rounded text-xs"
                        style={{
                          backgroundColor: expandedTelas.length === telas.length && telas.length > 0
                            ? 'var(--tfd-status-success-bg)'
                            : 'var(--tfd-primary-50)',
                          color: expandedTelas.length === telas.length && telas.length > 0
                            ? 'var(--tfd-status-success)'
                            : 'var(--tfd-primary-500)',
                        }}
                      >
                        {getScreenCountText(expandedTelas)}
                      </span>
                    ) : null}
                  </div>

                  {/* Chevron */}
                  {isExpanded ? (
                    <ChevronUp size={18} style={{ color: 'var(--tfd-text-muted)' }} />
                  ) : (
                    <ChevronDown size={18} style={{ color: 'var(--tfd-text-muted)' }} />
                  )}
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--tfd-surface-border)' }}>
                    {loadingExpand ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2
                          size={20}
                          className="animate-spin"
                          style={{ color: 'var(--tfd-primary-500)' }}
                        />
                      </div>
                    ) : (
                      <>
                        {/* Screens grouped by module */}
                        <div className="px-5 py-4">
                          {moduleNames.map((modulo) => {
                            const moduleTelas = telasByModule[modulo];
                            const moduleTelaIds = moduleTelas.map((t) => t.id);
                            const stats = getModuleStats(moduleTelaIds, expandedTelas);

                            return (
                              <div key={modulo} className="mb-4 last:mb-0">
                                {/* Module header */}
                                <div className="flex items-center gap-2 mb-2">
                                  <span
                                    className="text-sm font-semibold"
                                    style={{ color: 'var(--tfd-text-primary)' }}
                                  >
                                    {modulo}
                                  </span>
                                  <span
                                    className="text-xs"
                                    style={{ color: 'var(--tfd-text-muted)' }}
                                  >
                                    {stats.selected}/{stats.total}
                                  </span>
                                </div>

                                {/* Screens */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 pl-2">
                                  {moduleTelas.map((tela) => {
                                    const hasAccess = expandedTelas.includes(tela.id);
                                    return (
                                      <div key={tela.id} className="flex items-center gap-2 py-0.5">
                                        {hasAccess ? (
                                          <CheckCircle2
                                            size={16}
                                            style={{ color: 'var(--tfd-status-success)' }}
                                            className="shrink-0"
                                          />
                                        ) : (
                                          <Circle
                                            size={16}
                                            style={{ color: 'var(--tfd-text-muted)' }}
                                            className="shrink-0"
                                          />
                                        )}
                                        <span
                                          className="text-sm"
                                          style={{
                                            color: hasAccess
                                              ? 'var(--tfd-text-primary)'
                                              : 'var(--tfd-text-muted)',
                                          }}
                                        >
                                          {tela.nome}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Footer actions */}
                        <div
                          className="flex items-center justify-between px-5 py-3"
                          style={{ borderTop: '1px solid var(--tfd-surface-border)' }}
                        >
                          <button
                            className="tfd-btn tfd-btn-danger tfd-btn--sm"
                            onClick={() => handleDelete(papel)}
                          >
                            <Trash2 size={14} />
                            Excluir
                          </button>
                          <button
                            className="tfd-btn tfd-btn-primary tfd-btn--sm"
                            onClick={() => handleOpenEdit(papel)}
                          >
                            <Pencil size={14} />
                            Editar
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========== Drawer: Create / Edit ========== */}
      <Drawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        title={editingPapel ? 'Editar Papel' : 'Novo Papel'}
        subtitle={
          editingPapel
            ? `Editando "${editingPapel.nome}"`
            : 'Defina o nome e as telas com acesso'
        }
        width="520px"
        footer={
          <>
            <button
              className="tfd-btn tfd-btn-secondary"
              onClick={handleCloseDrawer}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              className="tfd-btn tfd-btn-primary"
              onClick={handleSave}
              disabled={saving || !formNome.trim()}
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              Salvar
            </button>
          </>
        }
      >
        {/* Name */}
        <FormField label="Nome do Papel" required>
          <input
            type="text"
            className="tfd-input"
            placeholder="Ex: Administrador, Regulador..."
            value={formNome}
            onChange={(e) => setFormNome(e.target.value)}
          />
        </FormField>

        {/* Description */}
        <FormField label="Descrição">
          <textarea
            className="tfd-input"
            rows={3}
            placeholder="Descreva brevemente o que este papel pode fazer"
            value={formDescricao}
            onChange={(e) => setFormDescricao(e.target.value)}
          />
        </FormField>

        {/* Color */}
        <FormField label="Cor">
          <div className="flex items-center gap-2 flex-wrap">
            {DEFAULT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className="w-8 h-8 rounded-full border-2 flex items-center justify-center"
                style={{
                  backgroundColor: color,
                  borderColor: formCor === color ? 'var(--tfd-text-primary)' : 'transparent',
                }}
                onClick={() => setFormCor(color)}
                title={color}
              >
                {formCor === color && <Check size={14} color="#FFFFFF" />}
              </button>
            ))}
          </div>
        </FormField>

        <hr className="tfd-divider" />

        {/* Telas section */}
        <div className="flex items-center justify-between mb-3">
          <h3
            className="text-sm font-semibold"
            style={{ color: 'var(--tfd-text-primary)' }}
          >
            Telas com acesso ({formTelas.length} de {telas.length})
          </h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="tfd-btn tfd-btn-secondary tfd-btn--sm"
              onClick={selectAllTelas}
            >
              <Check size={14} />
              Todas
            </button>
            <button
              type="button"
              className="tfd-btn tfd-btn-secondary tfd-btn--sm"
              onClick={selectNoneTelas}
            >
              <X size={14} />
              Nenhuma
            </button>
          </div>
        </div>

        {/* Modules with checkboxes */}
        {moduleNames.map((modulo) => {
          const moduleTelas = telasByModule[modulo];
          const moduleTelaIds = moduleTelas.map((t) => t.id);
          const selectedCount = moduleTelaIds.filter((id) => formTelas.includes(id)).length;
          const allSelected = selectedCount === moduleTelaIds.length;
          const someSelected = selectedCount > 0 && !allSelected;

          return (
            <div key={modulo} className="mb-4">
              {/* Module parent checkbox */}
              <div className="flex items-center gap-2 mb-1.5">
                <IndeterminateCheckbox
                  id={`module-${modulo}`}
                  checked={allSelected}
                  indeterminate={someSelected}
                  onChange={() => toggleModule(modulo)}
                />
                <label
                  htmlFor={`module-${modulo}`}
                  className="text-sm font-semibold cursor-pointer select-none"
                  style={{ color: 'var(--tfd-text-primary)' }}
                >
                  {modulo}
                </label>
                <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                  ({moduleTelaIds.length})
                </span>
              </div>

              {/* Individual screen checkboxes */}
              <div className="flex flex-col gap-1 pl-6">
                {moduleTelas.map((tela) => {
                  const isChecked = formTelas.includes(tela.id);
                  return (
                    <div key={tela.id} className="flex items-center gap-2">
                      <input
                        id={`tela-${tela.id}`}
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleTela(tela.id)}
                        style={{ accentColor: 'var(--tfd-primary-500)' }}
                      />
                      <label
                        htmlFor={`tela-${tela.id}`}
                        className="text-sm cursor-pointer select-none"
                        style={{
                          color: isChecked
                            ? 'var(--tfd-text-primary)'
                            : 'var(--tfd-text-secondary)',
                        }}
                      >
                        {tela.nome}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </Drawer>
    </>
  );
}
