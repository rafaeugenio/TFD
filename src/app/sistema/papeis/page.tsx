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
  listarPermissoes,
  contarUsuariosPorPapel,
  listarPermissoesDoPapel,
  listarTodosPapelPermissoes,
  criarPapel,
  atualizarPapel,
  excluirPapel,
  salvarPermissoesDoPapel,
} from '@/services/papeis.service';
import type { Papel, Permissao } from '@/services/papeis.service';
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

/** Rótulo de cada ação de cadastro (família `item`). */
const ACAO_ITEM_LABELS: Record<string, string> = { criar: 'Criar', editar: 'Editar', excluir: 'Excluir' };

interface PermissaoItemGroup {
  itemId: string;
  label: string;
  grupo: string;
  ordem: number;
  acoes: { id: string; label: string }[];
}

/**
 * Separa o catálogo de permissões nas três famílias do modelo simplificado
 * e, na família `item`, agrupa as ações criar/editar/excluir do mesmo
 * cadastro numa única linha (ex: "Paciente" com pills Criar/Editar/Excluir).
 */
function agruparPermissoes(permissoes: Permissao[]) {
  const telas = permissoes.filter((p) => p.familia === 'tela').sort((a, b) => a.ordem - b.ordem);
  const acoes = permissoes.filter((p) => p.familia === 'acao').sort((a, b) => a.ordem - b.ordem);

  const itemMap = new Map<string, PermissaoItemGroup>();
  for (const p of permissoes.filter((p) => p.familia === 'item')) {
    const match = p.id.match(/^(.+)\.(criar|editar|excluir)$/);
    if (!match) continue;
    const [, itemId, acaoChave] = match;
    if (!itemMap.has(itemId)) {
      itemMap.set(itemId, {
        itemId,
        // "Criar solicitação" → "Solicitação"
        label: p.nome.replace(/^(Criar|Editar|Excluir)\s+/, '').replace(/^\w/, (c) => c.toUpperCase()),
        grupo: p.grupo ?? 'Outros',
        ordem: p.ordem,
        acoes: [],
      });
    }
    itemMap.get(itemId)!.acoes.push({ id: p.id, label: ACAO_ITEM_LABELS[acaoChave] ?? acaoChave });
  }
  const itens = Array.from(itemMap.values()).sort((a, b) => a.ordem - b.ordem);

  return { telas, acoes, itens };
}

/** Agrupa uma lista de permissões (ou grupos de item) pelo campo `grupo`, preservando a ordem de aparição. */
function agruparPorGrupo<T extends { grupo: string | null }>(rows: T[]): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const row of rows) {
    const chave = row.grupo ?? 'Outros';
    if (!groups[chave]) groups[chave] = [];
    groups[chave].push(row);
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

interface PapelComContagens extends Papel {
  __usrCount: number;
  __telaCount: number;
}

export default function PapeisPage() {
  return <PapeisPanel showHeader />;
}

export function PapeisPanel({ showHeader = true }: { showHeader?: boolean }) {
  const toast = useToast();

  /* ---- Data state ---- */
  const [papeis, setPapeis] = useState<Papel[]>([]);
  const [permissoes, setPermissoes] = useState<Permissao[]>([]);
  const [userCounts, setUserCounts] = useState<Record<string, number>>({});
  /** Nº de permissões `tela.*.visualizar` que cada papel tem, para a coluna "Telas" da listagem. */
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
  /** IDs de permissão selecionados (ex: "tela.pacientes.visualizar", "paciente.criar", "acao.tramitar"). */
  const [formPermissoes, setFormPermissoes] = useState<Set<string>>(new Set());

  /* ---- Permissões agrupadas pelas três famílias do modelo simplificado ---- */
  const { telas: permissoesTelas, acoes: permissoesAcoes, itens: permissoesItens } = useMemo(
    () => agruparPermissoes(permissoes),
    [permissoes],
  );
  const permissoesTelasPorGrupo = useMemo(() => agruparPorGrupo(permissoesTelas), [permissoesTelas]);
  const permissoesItensPorGrupo = useMemo(() => agruparPorGrupo(permissoesItens), [permissoesItens]);

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
      const [papeisRes, permissoesRes, usersRes, papelPermissoesRes] = await Promise.all([
        listarPapeis(),
        listarPermissoes(),
        contarUsuariosPorPapel(),
        listarTodosPapelPermissoes(),
      ]);

      const papeisData = (papeisRes.data as unknown as Papel[]) ?? [];
      const permissoesData = permissoesRes.data ?? [];
      const usersData = (usersRes.data as unknown as { papel_id: string }[]) ?? [];
      const papelPermissoesData =
        (papelPermissoesRes.data as unknown as { papel_id: string; permissao_id: string }[]) ?? [];

      setPapeis(papeisData);
      setPermissoes(permissoesData);

      const counts: Record<string, number> = {};
      for (const row of usersData) {
        counts[row.papel_id] = (counts[row.papel_id] || 0) + 1;
      }
      setUserCounts(counts);

      // Coluna "Telas" da listagem: quantas permissões `tela.*.visualizar` cada papel tem.
      const telaCounts: Record<string, number> = {};
      for (const row of papelPermissoesData) {
        if (!row.permissao_id.startsWith('tela.')) continue;
        telaCounts[row.papel_id] = (telaCounts[row.papel_id] || 0) + 1;
      }
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
    setFormPermissoes(new Set());
    setDrawerOpen(true);
  }

  async function handleOpenEdit(papel: Papel) {
    setEditingPapel(papel);
    setFormNome(papel.nome);
    setFormDescricao(papel.descricao ?? '');
    setFormCor(papel.cor);

    try {
      const res = await listarPermissoesDoPapel(papel.id);
      const rows = (res.data as unknown as { permissao_id: string }[]) ?? [];
      setFormPermissoes(new Set(rows.map((r) => r.permissao_id)));
    } catch {
      setFormPermissoes(new Set());
    }

    setDrawerOpen(true);
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
    setEditingPapel(null);
  }

  /* ---- Form: toggle de permissões ---- */

  /** Liga/desliga uma única permissão (usado por telas, ações de fluxo e pills de cadastro). */
  function togglePermissao(id: string) {
    setFormPermissoes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** Liga/desliga um grupo de permissões de uma vez (checkbox pai de um item ou de uma seção). */
  function toggleGrupoPermissoes(ids: string[]) {
    setFormPermissoes((prev) => {
      const allSelected = ids.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        for (const id of ids) next.delete(id);
      } else {
        for (const id of ids) next.add(id);
      }
      return next;
    });
  }

  function selectAllPermissoes() {
    setFormPermissoes(new Set(permissoes.map((p) => p.id)));
  }

  function selectNonePermissoes() {
    setFormPermissoes(new Set());
  }

  /** Valida e abre o modal de confirmação. */
  function handleRequestSave() {
    if (!formNome.trim()) { toast.error('Campo obrigatório', 'Informe o nome do papel.'); return; }

    const novoTelaCount = permissoesTelas.filter((p) => formPermissoes.has(p.id)).length;

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
      diff.push({ label: 'Telas com permissão', before: '', after: `${novoTelaCount} de ${permissoesTelas.length}` });
      setSaveConfirm({ tone: 'edit', diff });
    } else {
      setSaveConfirm({
        tone: 'create',
        diff: [
          { label: 'Nome', after: formNome.trim() },
          { label: 'Descrição', after: formDescricao.trim() },
          { label: 'Telas com permissão', after: `${novoTelaCount} de ${permissoesTelas.length}` },
        ],
      });
    }
  }

  /* ---- Save ---- */
  async function handleSave() {
    if (!formNome.trim()) return;

    setSaving(true);
    try {
      const permissaoIds = Array.from(formPermissoes);

      if (editingPapel) {
        await atualizarPapel(editingPapel.id, {
          nome: formNome.trim(),
          descricao: formDescricao.trim() || undefined,
          cor: formCor,
        });
        await salvarPermissoesDoPapel(editingPapel.id, permissaoIds);
        toast.success('Papel atualizado!', 'As permissões foram salvas.');
      } else {
        const res = await criarPapel({
          nome: formNome.trim(),
          descricao: formDescricao.trim() || undefined,
          cor: formCor,
        });
        const newPapel = res.data as unknown as Papel;
        if (newPapel?.id) {
          await salvarPermissoesDoPapel(newPapel.id, permissaoIds);
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

  const formPermissoesCount = formPermissoes.size;
  const totalPermissoes = permissoes.length;
  const totalTelas = permissoesTelas.length;

  /* -------------------------------------------------- */
  /*  Render                                             */
  /* -------------------------------------------------- */

  return (
    <>
      {showHeader && (
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
      )}
      {/* Filters + ação (botão alinhado à mesma linha da busca quando em aba) */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
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

        {!showHeader && (
          <div className="ml-auto">
            <Can action="sys_papeis.criar">
              <button className="tfd-btn tfd-btn-primary" onClick={handleOpenCreate}>
                <Plus size={16} />
                Novo Papel
              </button>
            </Can>
          </div>
        )}
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

        {/* Permissões — modelo simplificado: acesso às telas, cadastros, ações de fluxo */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
            Permissões ({formPermissoesCount} de {totalPermissoes})
          </h3>
          <div className="flex items-center gap-2">
            <button type="button" className="tfd-btn tfd-btn-secondary tfd-btn--sm" onClick={selectAllPermissoes}>
              <Check size={14} />
              Todas
            </button>
            <button type="button" className="tfd-btn tfd-btn-secondary tfd-btn--sm" onClick={selectNonePermissoes}>
              <X size={14} />
              Nenhuma
            </button>
          </div>
        </div>

        {/* Família 1 — Acesso às telas */}
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--tfd-text-muted)' }}>
            Acesso às telas
          </p>
          {Object.entries(permissoesTelasPorGrupo).map(([grupo, telasDoGrupo]) => (
            <div key={grupo} className="flex flex-col gap-1.5 mb-3 pl-1">
              <span className="text-xs font-medium" style={{ color: 'var(--tfd-text-secondary)' }}>{grupo}</span>
              {telasDoGrupo.map((tela) => {
                const checked = formPermissoes.has(tela.id);
                return (
                  <label
                    key={tela.id}
                    htmlFor={`perm-${tela.id}`}
                    className="flex items-center gap-2 rounded-md p-1.5 cursor-pointer select-none"
                    style={{ background: checked ? 'var(--tfd-primary-50)' : 'transparent' }}
                    title={tela.descricao ?? undefined}
                  >
                    <input
                      id={`perm-${tela.id}`}
                      type="checkbox"
                      checked={checked}
                      onChange={() => togglePermissao(tela.id)}
                      style={{ accentColor: 'var(--tfd-primary-500)' }}
                    />
                    <span
                      className="text-sm"
                      style={{ color: checked ? 'var(--tfd-text-primary)' : 'var(--tfd-text-secondary)' }}
                    >
                      {tela.nome}
                    </span>
                  </label>
                );
              })}
            </div>
          ))}
        </div>

        {/* Família 2 — Cadastros (criar/editar/excluir por item, válido em todos os pontos de entrada) */}
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--tfd-text-muted)' }}>
            Cadastros
          </p>
          {Object.entries(permissoesItensPorGrupo).map(([grupo, itensDoGrupo]) => (
            <div key={grupo} className="flex flex-col gap-2 mb-3 pl-1">
              <span className="text-xs font-medium" style={{ color: 'var(--tfd-text-secondary)' }}>{grupo}</span>
              {itensDoGrupo.map((item) => {
                const idsDoItem = item.acoes.map((a) => a.id);
                const selectedCount = idsDoItem.filter((id) => formPermissoes.has(id)).length;
                const allSelected = selectedCount === idsDoItem.length;
                const someSelected = selectedCount > 0 && !allSelected;

                return (
                  <div
                    key={item.itemId}
                    className="rounded-lg p-2"
                    style={{
                      background: selectedCount > 0 ? 'var(--tfd-primary-50)' : 'var(--tfd-surface-100)',
                      border: `1px solid ${selectedCount > 0 ? 'var(--tfd-primary-100, #DBEAFE)' : 'var(--tfd-surface-border)'}`,
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <IndeterminateCheckbox
                        id={`item-${item.itemId}`}
                        checked={allSelected}
                        indeterminate={someSelected}
                        onChange={() => toggleGrupoPermissoes(idsDoItem)}
                      />
                      <label
                        htmlFor={`item-${item.itemId}`}
                        className="text-sm font-medium cursor-pointer select-none flex-1"
                        style={{ color: selectedCount > 0 ? 'var(--tfd-text-primary)' : 'var(--tfd-text-secondary)' }}
                      >
                        {item.label}
                      </label>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {item.acoes.map((acao) => {
                        const isSelected = formPermissoes.has(acao.id);
                        return (
                          <button
                            key={acao.id}
                            type="button"
                            className="text-[11px] px-2 py-0.5 rounded-full border transition-colors"
                            style={{
                              background: isSelected ? 'var(--tfd-primary-500)' : 'var(--tfd-surface-card)',
                              color: isSelected ? '#FFFFFF' : 'var(--tfd-text-muted)',
                              borderColor: isSelected ? 'var(--tfd-primary-500)' : 'var(--tfd-surface-border)',
                            }}
                            onClick={() => togglePermissao(acao.id)}
                          >
                            {acao.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Família 3 — Ações de fluxo */}
        <div className="mb-2">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--tfd-text-muted)' }}>
            Ações de fluxo
          </p>
          <div className="flex flex-col gap-1.5 pl-1">
            {permissoesAcoes.map((acao) => {
              const checked = formPermissoes.has(acao.id);
              return (
                <label
                  key={acao.id}
                  htmlFor={`perm-${acao.id}`}
                  className="flex items-center gap-2 rounded-md p-1.5 cursor-pointer select-none"
                  style={{ background: checked ? 'var(--tfd-primary-50)' : 'transparent' }}
                  title={acao.descricao ?? undefined}
                >
                  <input
                    id={`perm-${acao.id}`}
                    type="checkbox"
                    checked={checked}
                    onChange={() => togglePermissao(acao.id)}
                    style={{ accentColor: 'var(--tfd-primary-500)' }}
                  />
                  <span
                    className="text-sm"
                    style={{ color: checked ? 'var(--tfd-text-primary)' : 'var(--tfd-text-secondary)' }}
                  >
                    {acao.nome}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
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
