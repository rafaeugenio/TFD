'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Pencil,
  Loader2,
  Search,
  Package,
  Trash2,
} from 'lucide-react';

import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import Pagination from '@/shared/components/pagination/Pagination';
import SortTh, { type SortDir, nextSort } from '@/shared/components/sort-th/SortTh';
import ConfirmDialog, { buildDiff, type DiffField } from '@/shared/components/confirm-dialog/ConfirmDialog';
import { useToast } from '@/shared/components/toast/Toast';
import {
  listarCid11,
  criarCid11,
  atualizarCid11,
  excluirCid11,
} from '@/services/cid11.service';
import type { Cid11 } from '@/core/models/cid11.model';
import { invalidateCache } from '@/shared/hooks/useLookup';

const DEFAULT_PAGE_SIZE = 50;

export default function Cid11Panel() {
  const toast = useToast();
  const [items, setItems] = useState<Cid11[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  /* Filters & pagination */
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<{ field: string; dir: SortDir }>({ field: 'codigo', dir: 'asc' });

  /* Drawer */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Cid11 | null>(null);
  const [fCodigo, setFCodigo] = useState('');
  const [fDescricao, setFDescricao] = useState('');

  /* Delete confirmation */
  const [deleteTarget, setDeleteTarget] = useState<Cid11 | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* Save confirmation (create / edit) */
  const [saveConfirm, setSaveConfirm] = useState<{ tone: 'create' | 'edit'; diff: DiffField[] } | null>(null);

  /* Debounce da busca (300ms) */
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const { data, count } = await listarCid11({ page, pageSize, search });
      setItems(applySort(data, sort));
      setTotal(count);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar CID-11';
      toast.error('Erro ao carregar', msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadItems(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [page, pageSize, search, sort]);

  const toggleSort = (field: string) => setSort((prev) => nextSort(field, prev));

  const resetForm = () => {
    setFCodigo('');
    setFDescricao('');
    setEditing(null);
  };

  const handleNew = () => { resetForm(); setDrawerOpen(true); };

  const handleEdit = (item: Cid11) => {
    setEditing(item);
    setFCodigo(item.codigo);
    setFDescricao(item.descricao);
    setDrawerOpen(true);
  };

  const handleRequestSave = () => {
    if (!fCodigo || !fDescricao) {
      toast.warning('Campos obrigatórios', 'Preencha código e descrição antes de salvar.');
      return;
    }
    if (editing) {
      const diff = buildDiff(
        { codigo: editing.codigo, descricao: editing.descricao },
        { codigo: fCodigo, descricao: fDescricao },
        [
          { key: 'codigo', label: 'Código' },
          { key: 'descricao', label: 'Descrição' },
        ],
      );
      setSaveConfirm({ tone: 'edit', diff });
    } else {
      setSaveConfirm({
        tone: 'create',
        diff: [
          { label: 'Código', after: fCodigo },
          { label: 'Descrição', after: fDescricao },
        ],
      });
    }
  };

  const handleConfirmSave = async () => {
    setSaving(true);
    try {
      if (editing) {
        const { error } = await atualizarCid11(editing.id, { codigo: fCodigo, descricao: fDescricao });
        if (error) { toast.error('Erro ao salvar', error.message); return; }
        toast.success('CID atualizado!', `${fCodigo} — ${fDescricao}`);
      } else {
        const { error } = await criarCid11({ codigo: fCodigo, descricao: fDescricao });
        if (error) { toast.error('Erro ao criar', error.message); return; }
        toast.success('CID adicionado!', `${fCodigo} — ${fDescricao}`);
      }
      invalidateCache('cid11');
      setSaveConfirm(null);
      setDrawerOpen(false);
      resetForm();
      await loadItems();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await excluirCid11(deleteTarget.id);
      if (error) { toast.error('Erro ao excluir', error.message); return; }
      toast.success('CID removido!', `${deleteTarget.codigo} — ${deleteTarget.descricao}`);
      invalidateCache('cid11');
      setDeleteTarget(null);
      await loadItems();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--tfd-text-primary)' }}>
            Códigos CID-11
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--tfd-text-muted)' }}>
            Classificação Internacional de Doenças, 11ª revisão (OMS)
          </p>
        </div>
        <button className="tfd-btn tfd-btn-primary" onClick={handleNew}>
          <Plus size={16} />
          Novo CID
        </button>
      </div>

      {/* Search */}
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
            placeholder="Buscar por código ou descrição..."
            className="flex-1 bg-transparent outline-none text-[13px]"
          />
        </div>
      </div>

      {/* Tabela */}
      <div
        style={{
          background: 'white',
          border: '1px solid var(--tfd-surface-border)',
          borderRadius: 'var(--tfd-radius-lg)',
          overflow: 'hidden',
        }}
      >
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--tfd-surface-border)' }}>
              <SortTh label="Código" field="codigo" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <SortTh label="Descrição" field="descricao" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <Th align="right">Ações</Th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="px-4 py-12 text-center" style={{ color: '#9CA3AF' }}>
                  <div className="inline-flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Carregando...
                  </div>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-16 text-center" style={{ color: '#9CA3AF' }}>
                  <div className="flex flex-col items-center gap-3">
                    <div
                      className="flex items-center justify-center w-14 h-14 rounded-2xl"
                      style={{ backgroundColor: 'var(--tfd-primary-50)' }}
                    >
                      <Package size={26} style={{ color: 'var(--tfd-primary-400)' }} />
                    </div>
                    <p className="text-sm">
                      {search
                        ? 'Nenhum resultado para esta busca.'
                        : 'Nenhum CID-11 cadastrado.'}
                    </p>
                    {!search && (
                      <button className="tfd-btn tfd-btn-primary tfd-btn--sm" onClick={handleNew}>
                        <Plus size={14} /> Cadastrar primeiro CID
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr
                  key={item.id}
                  style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}
                  className="hover:bg-[#F8FAFC] transition-colors"
                >
                  <td className="px-4 py-3.5 font-mono text-[12px]" style={{ color: '#146BFA', fontWeight: 600, width: 140 }}>
                    {item.codigo}
                  </td>
                  <td className="px-4 py-3.5" style={{ color: '#1A1D2B' }}>
                    {item.descricao}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button
                        className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                        title="Editar"
                        onClick={() => handleEdit(item)}
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="tfd-btn tfd-btn-danger tfd-btn--icon-only"
                        title="Excluir"
                        onClick={() => setDeleteTarget(item)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <Pagination
          total={total}
          pageSize={pageSize}
          page={page}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          recordLabel={`código${total === 1 ? '' : 's'} CID-11${search ? ' (filtrado)' : ''}`}
        />
      </div>

      {/* Drawer: Editar/Novo CID */}
      <Drawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); resetForm(); }}
        title={editing ? 'Editar CID-11' : 'Novo CID-11'}
        subtitle={editing ? editing.codigo : 'Cadastrar novo código CID-11'}
        width="480px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={() => { setDrawerOpen(false); resetForm(); }}>
              Cancelar
            </button>
            <button
              className="tfd-btn tfd-btn-primary"
              onClick={handleRequestSave}
              disabled={saving || !fCodigo || !fDescricao}
            >
              {saving
                ? <><Loader2 size={14} className="animate-spin" /> Salvando...</>
                : (editing ? 'Salvar Alterações' : 'Adicionar CID')}
            </button>
          </>
        }
      >
        <FormField label="Código CID-11" required>
          <input
            type="text"
            className="tfd-input font-mono"
            placeholder="Ex: 1A00, BA00.0"
            value={fCodigo}
            onChange={(e) => setFCodigo(e.target.value.toUpperCase())}
          />
          <p className="text-[11px] mt-1" style={{ color: 'var(--tfd-text-muted)' }}>
            Código da Classificação Internacional de Doenças, 11ª revisão (OMS)
          </p>
        </FormField>

        <FormField label="Descrição" required>
          <textarea
            className="tfd-input"
            rows={3}
            placeholder="Descrição completa do diagnóstico"
            value={fDescricao}
            onChange={(e) => setFDescricao(e.target.value)}
          />
        </FormField>
      </Drawer>

      {/* Modal: Confirmar exclusão */}
      <ConfirmDialog
        open={!!deleteTarget}
        tone="delete"
        title="Excluir CID-11?"
        subject={deleteTarget ? `${deleteTarget.codigo} — ${deleteTarget.descricao}` : undefined}
        description="Esta ação não pode ser desfeita."
        busy={deleting}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />

      {/* Modal: Confirmar criação / edição */}
      <ConfirmDialog
        open={!!saveConfirm}
        tone={saveConfirm?.tone ?? 'create'}
        title={editing ? 'Confirmar alterações no CID-11?' : 'Confirmar cadastro de CID-11?'}
        subject={fCodigo ? `${fCodigo} — ${fDescricao}` : undefined}
        diff={saveConfirm?.diff}
        busy={saving}
        onClose={() => setSaveConfirm(null)}
        onConfirm={handleConfirmSave}
      />
    </>
  );
}

/* -------------------------------------------------- */
/*  Helpers                                            */
/* -------------------------------------------------- */

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      className={`px-4 py-3 font-semibold ${align === 'right' ? 'text-right' : 'text-left'}`}
      style={{ color: '#64748B', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}
    >
      {children}
    </th>
  );
}

function applySort(rows: Cid11[], sort: { field: string; dir: SortDir }): Cid11[] {
  if (!sort.dir) return rows;
  const dir = sort.dir === 'asc' ? 1 : -1;
  const field = sort.field as keyof Cid11;
  return [...rows].sort((a, b) => {
    const av = String(a[field] ?? '').toLowerCase();
    const bv = String(b[field] ?? '').toLowerCase();
    return av.localeCompare(bv, 'pt-BR', { numeric: true, sensitivity: 'base' }) * dir;
  });
}
