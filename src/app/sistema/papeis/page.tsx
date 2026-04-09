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
import { useToast } from '@/shared/components/toast/Toast';
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

const ACAO_LABELS: Record<string, string> = {
  visualizar: 'Visualizar',
  criar: 'Criar',
  editar: 'Editar',
  excluir: 'Excluir',
  encaminhar: 'Encaminhar',
  encaminhar_setor_anterior: 'Setor Anterior',
  aprovar: 'Aprovar',
  reprovar: 'Reprovar',
  analisar: 'Analisar',
  emitir: 'Emitir',
  gerenciar: 'Gerenciar',
  adicionar_ajuda_custo: 'Aj. de Custo',
  encerrar: 'Encerrar',
};

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

/** Converte linhas { tela_id, acao } em mapa tela_id → acoes[]. */
function rowsToAcoesMap(rows: { tela_id: string; acao: string }[]): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const row of rows) {
    if (!map[row.tela_id]) map[row.tela_id] = [];
    map[row.tela_id].push(row.acao);
  }
  return map;
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
  const toast = useToast();

  /* ---- Data state ---- */
  const [papeis, setPapeis] = useState<Papel[]>([]);
  const [telas, setTelas] = useState<TelaSistema[]>([]);
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  /* ---- Accordion state ---- */
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedTelaAcoes, setExpandedTelaAcoes] = useState<Record<string, string[]>>({});
  const [loadingExpand, setLoadingExpand] = useState(false);

  /* ---- Drawer state ---- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPapel, setEditingPapel] = useState<Papel | null>(null);
  const [saving, setSaving] = useState(false);

  /* ---- Form state ---- */
  const [formNome, setFormNome] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formCor, setFormCor] = useState(DEFAULT_COLORS[0]);
  /** tela_id → lista de ações selecionadas */
  const [formTelas, setFormTelas] = useState<Record<string, string[]>>({});

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

      const counts: Record<string, number> = {};
      for (const row of usersData) {
        counts[row.papel_id] = (counts[row.papel_id] || 0) + 1;
      }
      setUserCounts(counts);
    } catch {
      // empty state will show
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
      setExpandedTelaAcoes({});
      return;
    }

    setExpandedId(papelId);
    setLoadingExpand(true);
    try {
      const res = await listarTelasDoPapel(papelId);
      const rows = (res.data as unknown as { tela_id: string; acao: string }[]) ?? [];
      setExpandedTelaAcoes(rowsToAcoesMap(rows));
    } catch {
      setExpandedTelaAcoes({});
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
    setFormTelas({});
    setDrawerOpen(true);
  }

  async function handleOpenEdit(papel: Papel) {
    setEditingPapel(papel);
    setFormNome(papel.nome);
    setFormDescricao(papel.descricao ?? '');
    setFormCor(papel.cor);

    try {
      const res = await listarTelasDoPapel(papel.id);
      const rows = (res.data as unknown as { tela_id: string; acao: string }[]) ?? [];
      setFormTelas(rowsToAcoesMap(rows));
    } catch {
      setFormTelas({});
    }

    setDrawerOpen(true);
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
    setEditingPapel(null);
  }

  /* ---- Form: toggle ações por tela ---- */

  function toggleAcao(telaId: string, acao: string) {
    setFormTelas((prev) => {
      const current = prev[telaId] ?? [];

      if (current.includes(acao)) {
        // Tentando remover visualizar enquanto há outras ações: bloqueado
        if (acao === 'visualizar' && current.filter((a) => a !== 'visualizar').length > 0) {
          return prev;
        }
        const updated = current.filter((a) => a !== acao);
        if (updated.length === 0) {
          const { [telaId]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [telaId]: updated };
      } else {
        // Adicionando qualquer ação: garante que visualizar também está presente
        const base = current.includes('visualizar') ? current : ['visualizar', ...current];
        return { ...prev, [telaId]: [...base, acao] };
      }
    });
  }

  function toggleTela(tela: TelaSistema) {
    setFormTelas((prev) => {
      if ((prev[tela.id]?.length ?? 0) > 0) {
        const { [tela.id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [tela.id]: [...tela.acoes_disponiveis] };
    });
  }

  function toggleModule(modulo: string) {
    const moduleTelas = telasByModule[modulo] ?? [];
    const allSelected = moduleTelas.every((t) => (formTelas[t.id]?.length ?? 0) > 0);

    setFormTelas((prev) => {
      const next = { ...prev };
      if (allSelected) {
        for (const t of moduleTelas) delete next[t.id];
      } else {
        for (const t of moduleTelas) next[t.id] = [...t.acoes_disponiveis];
      }
      return next;
    });
  }

  function selectAllTelas() {
    const all: Record<string, string[]> = {};
    for (const tela of telas) all[tela.id] = [...tela.acoes_disponiveis];
    setFormTelas(all);
  }

  function selectNoneTelas() {
    setFormTelas({});
  }

  /* ---- Save ---- */
  async function handleSave() {
    if (!formNome.trim()) return;

    setSaving(true);
    try {
      const telaAcoes = Object.entries(formTelas).flatMap(([tela_id, acoes]) =>
        acoes.map((acao) => ({ tela_id, acao })),
      );

      if (editingPapel) {
        await atualizarPapel(editingPapel.id, {
          nome: formNome.trim(),
          descricao: formDescricao.trim() || undefined,
          cor: formCor,
        });
        await salvarTelasDoPapel(editingPapel.id, telaAcoes);
        toast.success('Papel atualizado!', 'As permissões foram salvas.');
      } else {
        const res = await criarPapel({
          nome: formNome.trim(),
          descricao: formDescricao.trim() || undefined,
          cor: formCor,
        });
        const newPapel = res.data as unknown as Papel;
        if (newPapel?.id) {
          await salvarTelasDoPapel(newPapel.id, telaAcoes);
        }
        toast.success('Papel criado!', 'O novo papel de acesso está disponível.');
      }
      handleCloseDrawer();
      setExpandedId(null);
      setExpandedTelaAcoes({});
      await loadData();
    } catch {
      // silently handle
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
        setExpandedTelaAcoes({});
      }
      toast.success('Papel excluído!', 'O papel foi removido do sistema.');
      await loadData();
    } catch {
      // silently handle
    }
  }

  /* ---- Helpers ---- */

  function getScreenCountText(telaAcoes: Record<string, string[]>): string {
    const total = telas.length;
    const count = Object.values(telaAcoes).filter((a) => a.length > 0).length;
    if (count === total && total > 0) return 'Acesso total';
    return `${count} de ${total} telas`;
  }

  function getModuleStats(moduleTelas: TelaSistema[], telaAcoes: Record<string, string[]>) {
    const selected = moduleTelas.filter((t) => (telaAcoes[t.id]?.length ?? 0) > 0).length;
    return { selected, total: moduleTelas.length };
  }

  const formTelaCount = Object.values(formTelas).filter((a) => a.length > 0).length;

  /* -------------------------------------------------- */
  /*  Render                                             */
  /* -------------------------------------------------- */

  return (
    <>
      <PageHeader
        title="Permissões"
        subtitle="Crie e configure permissões de acesso por tela e ação"
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
          description="Crie papéis para definir quais telas e ações cada grupo de usuários pode acessar."
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
                {/* Card header */}
                <button
                  type="button"
                  className="w-full flex items-center gap-4 px-5 py-4 text-left"
                  style={{ background: 'transparent' }}
                  onClick={() => handleToggleExpand(papel.id)}
                >
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-full shrink-0 text-sm font-bold"
                    style={{ backgroundColor: papel.cor, color: '#FFFFFF' }}
                  >
                    {getInitials(papel.nome)}
                  </div>

                  <span
                    className="font-semibold text-base flex-1 min-w-0 truncate"
                    style={{ color: 'var(--tfd-text-primary)' }}
                  >
                    {papel.nome}
                  </span>

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

                    {isExpanded && !loadingExpand && (
                      <span
                        className="tfd-tag tfd-tag--rounded text-xs"
                        style={{
                          backgroundColor:
                            Object.values(expandedTelaAcoes).filter((a) => a.length > 0).length === telas.length && telas.length > 0
                              ? 'var(--tfd-status-success-bg)'
                              : 'var(--tfd-primary-50)',
                          color:
                            Object.values(expandedTelaAcoes).filter((a) => a.length > 0).length === telas.length && telas.length > 0
                              ? 'var(--tfd-status-success)'
                              : 'var(--tfd-primary-500)',
                        }}
                      >
                        {getScreenCountText(expandedTelaAcoes)}
                      </span>
                    )}
                  </div>

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
                        <div className="px-5 py-4">
                          {moduleNames.map((modulo) => {
                            const moduleTelas = telasByModule[modulo];
                            const stats = getModuleStats(moduleTelas, expandedTelaAcoes);

                            return (
                              <div key={modulo} className="mb-4 last:mb-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <span
                                    className="text-sm font-semibold"
                                    style={{ color: 'var(--tfd-text-primary)' }}
                                  >
                                    {modulo}
                                  </span>
                                  <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                                    {stats.selected}/{stats.total}
                                  </span>
                                </div>

                                <div className="flex flex-col gap-1.5 pl-2">
                                  {moduleTelas.map((tela) => {
                                    const acoes = expandedTelaAcoes[tela.id] ?? [];
                                    const hasAccess = acoes.length > 0;
                                    return (
                                      <div key={tela.id} className="flex items-start gap-2">
                                        {hasAccess ? (
                                          <CheckCircle2
                                            size={16}
                                            style={{ color: 'var(--tfd-status-success)', marginTop: 2 }}
                                            className="shrink-0"
                                          />
                                        ) : (
                                          <Circle
                                            size={16}
                                            style={{ color: 'var(--tfd-text-muted)', marginTop: 2 }}
                                            className="shrink-0"
                                          />
                                        )}
                                        <div className="flex-1 min-w-0">
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
                                          <div className="flex flex-wrap gap-1 mt-0.5">
                                            {(tela.acoes_disponiveis ?? []).map((acao) => {
                                              const isEnabled = acoes.includes(acao);
                                              return (
                                                <span
                                                  key={acao}
                                                  className="text-[10px] px-1.5 py-0.5 rounded"
                                                  style={{
                                                    background: isEnabled ? 'var(--tfd-primary-50)' : 'var(--tfd-surface-100)',
                                                    color: isEnabled ? 'var(--tfd-primary-500)' : 'var(--tfd-text-muted)',
                                                  }}
                                                >
                                                  {ACAO_LABELS[acao] ?? acao}
                                                </span>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>

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
            : 'Defina o nome e as permissões por tela'
        }
        width="600px"
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
          <h3 className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
            Telas e ações ({formTelaCount} de {telas.length})
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

        {/* Modules with telas and action pills */}
        {moduleNames.map((modulo) => {
          const moduleTelas = telasByModule[modulo];
          const selectedCount = moduleTelas.filter((t) => (formTelas[t.id]?.length ?? 0) > 0).length;
          const allSelected = selectedCount === moduleTelas.length;
          const someSelected = selectedCount > 0 && !allSelected;

          return (
            <div key={modulo} className="mb-5">
              {/* Module parent checkbox */}
              <div className="flex items-center gap-2 mb-2">
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
                  ({moduleTelas.length})
                </span>
              </div>

              {/* Telas com ação pills */}
              <div className="flex flex-col gap-2 pl-6">
                {moduleTelas.map((tela) => {
                  const selectedAcoes = formTelas[tela.id] ?? [];
                  const hasAnyAcao = selectedAcoes.length > 0;

                  return (
                    <div
                      key={tela.id}
                      className="rounded-lg p-2"
                      style={{
                        background: hasAnyAcao ? 'var(--tfd-primary-50)' : 'var(--tfd-surface-100)',
                        border: `1px solid ${hasAnyAcao ? 'var(--tfd-primary-100, #DBEAFE)' : 'var(--tfd-surface-border)'}`,
                      }}
                    >
                      {/* Row: checkbox + nome */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <input
                          id={`tela-${tela.id}`}
                          type="checkbox"
                          checked={hasAnyAcao}
                          onChange={() => toggleTela(tela)}
                          style={{ accentColor: 'var(--tfd-primary-500)' }}
                        />
                        <label
                          htmlFor={`tela-${tela.id}`}
                          className="text-sm font-medium cursor-pointer select-none flex-1"
                          style={{
                            color: hasAnyAcao
                              ? 'var(--tfd-text-primary)'
                              : 'var(--tfd-text-secondary)',
                          }}
                        >
                          {tela.nome}
                        </label>
                      </div>

                      {/* Action pills */}
                      <div className="flex flex-wrap gap-1">
                        {(tela.acoes_disponiveis ?? []).map((acao) => {
                          const isSelected = selectedAcoes.includes(acao);
                          const otherActionsActive = selectedAcoes.filter((a) => a !== 'visualizar').length > 0;
                          const isLocked = acao === 'visualizar' && isSelected && otherActionsActive;
                          return (
                            <button
                              key={acao}
                              type="button"
                              className="text-[11px] px-2 py-0.5 rounded-full border transition-colors"
                              style={{
                                background: isSelected ? 'var(--tfd-primary-500)' : 'var(--tfd-surface-card)',
                                color: isSelected ? '#FFFFFF' : 'var(--tfd-text-muted)',
                                borderColor: isSelected
                                  ? 'var(--tfd-primary-500)'
                                  : 'var(--tfd-surface-border)',
                                opacity: isLocked ? 0.7 : 1,
                                cursor: isLocked ? 'not-allowed' : 'pointer',
                              }}
                              onClick={() => toggleAcao(tela.id, acao)}
                              title={isLocked ? 'Visualizar é obrigatório quando outras ações estão ativas' : undefined}
                            >
                              {ACAO_LABELS[acao] ?? acao}
                            </button>
                          );
                        })}
                      </div>
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
