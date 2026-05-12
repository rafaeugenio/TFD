'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Plus,
  Loader2,
  Shield,
  Trash2,
  Pencil,
  Check,
  X,
  Search,
  Users as UsersIcon,
  Package,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import EmptyState from '@/shared/components/empty-state/EmptyState';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import Pagination from '@/shared/components/pagination/Pagination';
import ConfirmDialog, { buildDiff, type DiffField } from '@/shared/components/confirm-dialog/ConfirmDialog';
import SortTh, { type SortDir, nextSort, compareValues } from '@/shared/components/sort-th/SortTh';
import { useToast } from '@/shared/components/toast/Toast';
import {
  listarPapeis,
  listarTelasComAcoes,
  contarUsuariosPorPapel,
  listarTelasDoPapel,
  criarPapel,
  atualizarPapel,
  excluirPapel,
  salvarTelasDoPapel,
} from '@/services/papeis.service';
import type { Papel, TelaSistema } from '@/services/papeis.service';
import { TableRowsSkeleton } from '@/shared/components/skeleton';
import { Can } from '@/shared/auth/Can';

/* -------------------------------------------------- */
/*  Constants                                          */
/* -------------------------------------------------- */

const DEFAULT_COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B',
  '#10B981', '#EF4444', '#06B6D4', '#F97316',
];

const DEFAULT_PAGE_SIZE = 25;

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

interface PapelComContagens extends Papel {
  __usrCount: number;
  __telaCount: number;
}

export default function PapeisPage() {
  const toast = useToast();

  /* ---- Data state ---- */
  const [papeis, setPapeis] = useState<Papel[]>([]);
  const [telas, setTelas] = useState<TelaSistema[]>([]);
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  const [telaCountsByPapel, setTelaCountsByPapel] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  /* ---- Filter / sort / pagination ---- */
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ field: string; dir: SortDir }>({ field: 'nome', dir: 'asc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  /* ---- Drawer state ---- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPapel, setEditingPapel] = useState<Papel | null>(null);
  const [saving, setSaving] = useState(false);

  /* ---- Delete confirmation ---- */
  const [deleteTarget, setDeleteTarget] = useState<Papel | null>(null);
  const [saveConfirm, setSaveConfirm] = useState<{ tone: 'create' | 'edit'; diff: DiffField[] } | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* ---- Form state ---- */
  const [formNome, setFormNome] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formCor, setFormCor] = useState(DEFAULT_COLORS[0]);
  /** tela_id → lista de ações selecionadas */
  const [formTelas, setFormTelas] = useState<Record<string, string[]>>({});

  /* ---- Grouped telas ---- */
  const telasByModule = useMemo(() => groupTelasByModule(telas), [telas]);
  const moduleNames = useMemo(() => Object.keys(telasByModule), [telasByModule]);

  /* ---- Debounce search (300ms) ---- */
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  /* ---- Data loading ---- */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [papeisRes, telasRes, usersRes] = await Promise.all([
        listarPapeis(),
        listarTelasComAcoes(),
        contarUsuariosPorPapel(),
      ]);

      const papeisData = (papeisRes.data as unknown as Papel[]) ?? [];
      const telasData = telasRes.data ?? [];
      const usersData = (usersRes.data as unknown as { papel_id: string }[]) ?? [];

      setPapeis(papeisData);
      setTelas(telasData);

      const counts: Record<string, number> = {};
      for (const row of usersData) {
        counts[row.papel_id] = (counts[row.papel_id] || 0) + 1;
      }
      setUserCounts(counts);

      // Carrega contagem de telas por papel em paralelo (para mostrar na coluna).
      const telaCountPromises = papeisData.map(async (p) => {
        const res = await listarTelasDoPapel(p.id);
        const rows = (res.data as unknown as { tela_id: string; acao: string }[]) ?? [];
        const uniqueTelas = new Set(rows.map((r) => r.tela_id));
        return [p.id, uniqueTelas.size] as const;
      });
      const telaCountsArr = await Promise.all(telaCountPromises);
      const telaCounts: Record<string, number> = {};
      for (const [id, c] of telaCountsArr) telaCounts[id] = c;
      setTelaCountsByPapel(telaCounts);
    } catch {
      // empty state will show
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  /* ---- Filtragem, ordenação, paginação (client-side) ---- */
  const enriquecidos: PapelComContagens[] = useMemo(
    () =>
      papeis.map((p) => ({
        ...p,
        __usrCount: userCounts[p.id] ?? 0,
        __telaCount: telaCountsByPapel[p.id] ?? 0,
      })),
    [papeis, userCounts, telaCountsByPapel],
  );

  const filtered = useMemo(() => {
    let result = enriquecidos;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) => p.nome.toLowerCase().includes(q) || (p.descricao ?? '').toLowerCase().includes(q),
      );
    }
    if (sort.dir) {
      const dir = sort.dir === 'asc' ? 1 : -1;
      result = [...result].sort((a, b) => {
        const field = sort.field as keyof PapelComContagens;
        return compareValues(a[field], b[field]) * dir;
      });
    }
    return result;
  }, [enriquecidos, search, sort]);

  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

  const toggleSort = (field: string) => setSort((prev) => nextSort(field, prev));

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
      return { ...prev, [tela.id]: tela.acoes.map((a) => a.acao) };
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
        for (const t of moduleTelas) next[t.id] = t.acoes.map((a) => a.acao);
      }
      return next;
    });
  }

  function selectAllTelas() {
    const all: Record<string, string[]> = {};
    for (const tela of telas) all[tela.id] = tela.acoes.map((a) => a.acao);
    setFormTelas(all);
  }

  function selectNoneTelas() {
    setFormTelas({});
  }

  /** Valida e abre o modal de confirmação. */
  function handleRequestSave() {
    if (!formNome.trim()) { toast.error('Campo obrigatório', 'Informe o nome do papel.'); return; }

    const novoTelaCount = Object.values(formTelas).filter((a) => a.length > 0).length;

    if (editingPapel) {
      // Carrega contagem atual de telas a partir do editingPapel.id no telaCountsByPapel... mas o estado pode estar desatualizado.
      // Para simplificar, mostra apenas o número novo + ações editáveis básicas.
      const before = {
        nome: editingPapel.nome,
        descricao: editingPapel.descricao ?? '',
        cor: editingPapel.cor,
      };
      const after = {
        nome: formNome.trim(),
        descricao: formDescricao.trim(),
        cor: formCor,
      };
      const diff = buildDiff(before, after, [
        { key: 'nome', label: 'Nome' },
        { key: 'descricao', label: 'Descrição' },
        { key: 'cor', label: 'Cor' },
      ]);
      // Permissões serão sempre re-salvas — adiciona como info informativa.
      diff.push({ label: 'Telas com permissão', before: '', after: `${novoTelaCount} de ${telas.length}` });
      setSaveConfirm({ tone: 'edit', diff });
    } else {
      setSaveConfirm({
        tone: 'create',
        diff: [
          { label: 'Nome', after: formNome.trim() },
          { label: 'Descrição', after: formDescricao.trim() },
          { label: 'Telas com permissão', after: `${novoTelaCount} de ${telas.length}` },
        ],
      });
    }
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
      await loadData();
    } catch {
      // silently handle
    } finally {
      setSaving(false);
    }
  }

  /* ---- Delete ---- */
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await excluirPapel(deleteTarget.id);
      toast.success('Papel excluído!', 'O papel foi removido do sistema.');
      setDeleteTarget(null);
      await loadData();
    } catch {
      // silently handle
    } finally {
      setDeleting(false);
    }
  }

  const formTelaCount = Object.values(formTelas).filter((a) => a.length > 0).length;
  const totalTelas = telas.length;

  /* -------------------------------------------------- */
  /*  Render                                             */
  /* -------------------------------------------------- */

  return (
    <>
      <PageHeader
        title="Permissões"
        subtitle="Crie e configure permissões de acesso por tela e ação"
        actions={
          <Can action="sys_papeis.criar">
            <button className="tfd-btn tfd-btn-primary" onClick={handleOpenCreate}>
              <Plus size={16} />
              Novo Papel
            </button>
          </Can>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div
          className="flex items-center gap-2 px-3"
          style={{
            background: 'white',
            border: '1px solid var(--tfd-surface-border)',
            borderRadius: 8,
            height: 36,
            minWidth: 280,
            flex: 1,
            maxWidth: 420,
          }}
        >
          <Search size={14} style={{ color: '#9CA3AF' }} />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por nome ou descrição..."
            className="flex-1 bg-transparent outline-none text-[13px]"
          />
        </div>
      </div>

      {/* Empty state (no data at all) */}
      {!loading && papeis.length === 0 ? (
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
      ) : (
        /* Table */
        <div
          style={{
            background: 'white',
            border: '1px solid var(--tfd-surface-border)',
            borderRadius: 'var(--tfd-radius-lg)',
            overflow: 'hidden',
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--tfd-surface-border)' }}>
                  <SortTh label="Papel" field="nome" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
                  <SortTh label="Descrição" field="descricao" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
                  <SortTh label="Usuários" field="__usrCount" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} align="right" />
                  <SortTh label="Telas" field="__telaCount" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} align="right" />
                  <Th align="right">Ações</Th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <TableRowsSkeleton rows={6} columns={5} />
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-16 text-center" style={{ color: '#9CA3AF' }}>
                      <div className="flex flex-col items-center gap-3">
                        <div
                          className="flex items-center justify-center w-14 h-14 rounded-2xl"
                          style={{ backgroundColor: 'var(--tfd-primary-50)' }}
                        >
                          <Package size={26} style={{ color: 'var(--tfd-primary-400)' }} />
                        </div>
                        <p className="text-sm">Nenhum resultado para esta busca.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  paginated.map((papel) => {
                    const acessoTotal = papel.__telaCount === totalTelas && totalTelas > 0;
                    return (
                      <tr
                        key={papel.id}
                        style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}
                        className="hover:bg-[#F8FAFC] transition-colors"
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div
                              className="flex items-center justify-center w-8 h-8 rounded-full shrink-0 text-[11px] font-semibold"
                              style={{ backgroundColor: papel.cor, color: '#FFFFFF' }}
                            >
                              {getInitials(papel.nome)}
                            </div>
                            <span className="font-semibold" style={{ color: '#1A1D2B' }}>
                              {papel.nome}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 max-w-[360px]" style={{ color: 'var(--tfd-text-secondary)' }}>
                          <p className="truncate">
                            {papel.descricao || <span style={{ color: 'var(--tfd-text-muted)' }}>—</span>}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                            style={{ backgroundColor: 'var(--tfd-surface-100)', color: 'var(--tfd-text-secondary)' }}
                          >
                            <UsersIcon size={11} />
                            {papel.__usrCount}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                            style={{
                              backgroundColor: acessoTotal ? 'var(--tfd-status-success-bg)' : 'var(--tfd-primary-50)',
                              color: acessoTotal ? 'var(--tfd-status-success)' : 'var(--tfd-primary-500)',
                            }}
                          >
                            {acessoTotal ? 'Acesso total' : `${papel.__telaCount} / ${totalTelas}`}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="inline-flex items-center gap-1">
                            <Can anyOf={['sys_papeis.editar','sys_papeis.permissoes_editar']}>
                              <button
                                className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                                title="Editar"
                                onClick={() => handleOpenEdit(papel)}
                              >
                                <Pencil size={15} />
                              </button>
                            </Can>
                            <Can action="sys_papeis.excluir">
                              <button
                                className="tfd-btn tfd-btn-danger tfd-btn--icon-only"
                                title="Excluir"
                                onClick={() => setDeleteTarget(papel)}
                              >
                                <Trash2 size={15} />
                              </button>
                            </Can>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            total={filtered.length}
            pageSize={pageSize}
            page={page}
            onPageChange={setPage}
            onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
            recordLabel={`pap${filtered.length === 1 ? 'el' : 'éis'}${search ? ' (filtrado)' : ''}`}
          />
        </div>
      )}

      {/* Modal: Confirmar exclusão */}
      <ConfirmDialog
        open={!!deleteTarget}
        tone="delete"
        title={deleteTarget ? `Excluir papel "${deleteTarget.nome}"?` : 'Excluir papel?'}
        description={
          deleteTarget && (userCounts[deleteTarget.id] ?? 0) > 0
            ? `Este papel tem ${userCounts[deleteTarget.id]} usuário${userCounts[deleteTarget.id] !== 1 ? 's' : ''} vinculado${userCounts[deleteTarget.id] !== 1 ? 's' : ''}. Eles ficarão sem papel até serem realocados. Esta ação não pode ser desfeita.`
            : 'O papel e todas as suas permissões serão removidos. Esta ação não pode ser desfeita.'
        }
        busy={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      {/* Modal: Confirmar criação / edição */}
      <ConfirmDialog
        open={!!saveConfirm}
        tone={saveConfirm?.tone ?? 'create'}
        title={editingPapel ? 'Confirmar alterações no papel?' : 'Confirmar cadastro de papel?'}
        subject={formNome.trim() || undefined}
        diff={saveConfirm?.diff}
        busy={saving}
        onClose={() => setSaveConfirm(null)}
        onConfirm={async () => {
          await handleSave();
          setSaveConfirm(null);
        }}
      />

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
              onClick={handleRequestSave}
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
                        {tela.acoes.map((a) => {
                          const isSelected = selectedAcoes.includes(a.acao);
                          const otherActionsActive = selectedAcoes.filter((x) => x !== 'visualizar').length > 0;
                          const isLocked = a.acao === 'visualizar' && isSelected && otherActionsActive;
                          return (
                            <button
                              key={a.acao}
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
                              onClick={() => toggleAcao(tela.id, a.acao)}
                              title={isLocked ? 'Visualizar é obrigatório quando outras ações estão ativas' : (a.descricao ?? undefined)}
                            >
                              {a.nome_humano}
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

/* -------------------------------------------------- */
/*  Helpers                                            */
/* -------------------------------------------------- */

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' | 'center' }) {
  const cls = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  return (
    <th
      className={`px-4 py-3 font-semibold ${cls}`}
      style={{ color: '#64748B', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}
    >
      {children}
    </th>
  );
}
