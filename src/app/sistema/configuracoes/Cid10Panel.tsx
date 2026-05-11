'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Pencil,
  Loader2,
  Search,
  Filter,
  Package,
  Trash2,
} from 'lucide-react';

import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import { useToast } from '@/shared/components/toast/Toast';
import {
  listarCid10,
  criarCid10,
  atualizarCid10,
  excluirCid10,
} from '@/services/cid10.service';
import type { Cid10 } from '@/core/models/cid10.model';
import { invalidateCache } from '@/shared/hooks/useLookup';

/* ── Agrupamentos por capítulo (primeira letra) ── */

const GRUPOS: { key: string; label: string }[] = [
  { key: '', label: 'Todos os grupos' },
  { key: 'A', label: 'Infectologia (A-B)' },
  { key: 'C', label: 'Oncologia (C)' },
  { key: 'D', label: 'Hematologia / Neoplasias benignas (D)' },
  { key: 'E', label: 'Endócrino / Metabólico (E)' },
  { key: 'F', label: 'Transtornos mentais (F)' },
  { key: 'G', label: 'Neurologia (G)' },
  { key: 'H', label: 'Oftalmologia / Otorrino (H)' },
  { key: 'I', label: 'Cardiologia / Vascular (I)' },
  { key: 'J', label: 'Pneumologia (J)' },
  { key: 'K', label: 'Gastro / Hepatologia (K)' },
  { key: 'L', label: 'Dermatologia (L)' },
  { key: 'M', label: 'Ortopedia / Reumatologia (M)' },
  { key: 'N', label: 'Nefrologia / Urologia (N)' },
  { key: 'O', label: 'Obstetrícia (O)' },
  { key: 'P', label: 'Perinatais (P)' },
  { key: 'Q', label: 'Malformações congênitas (Q)' },
  { key: 'R', label: 'Sintomas e sinais (R)' },
  { key: 'S', label: 'Lesões / Trauma (S-T)' },
  { key: 'Z', label: 'Transplantes / Acompanhamento (Z)' },
];

function getGrupoLetra(codigo: string): string {
  return codigo.charAt(0).toUpperCase();
}

const PAGE_SIZE = 30;

export default function Cid10Panel() {
  const toast = useToast();
  const [items, setItems] = useState<Cid10[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Cid10 | null>(null);

  /* Filters */
  const [search, setSearch] = useState('');
  const [filterGrupo, setFilterGrupo] = useState('');
  const [page, setPage] = useState(1);

  /* Form state */
  const [fCodigo, setFCodigo] = useState('');
  const [fDescricao, setFDescricao] = useState('');

  const loadItems = async () => {
    setLoading(true);
    const { data, error } = await listarCid10();
    if (error) {
      toast.error('Erro ao carregar', error.message);
    } else if (data) {
      setItems(data as Cid10[]);
    }
    setLoading(false);
  };

  useEffect(() => { loadItems(); }, []);

  /* Reset page on filter change */
  useEffect(() => { setPage(1); }, [search, filterGrupo]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filterGrupo) {
        const letra = getGrupoLetra(item.codigo);
        if (filterGrupo === 'A') {
          if (letra !== 'A' && letra !== 'B') return false;
        } else if (filterGrupo === 'S') {
          if (letra !== 'S' && letra !== 'T') return false;
        } else if (letra !== filterGrupo) {
          return false;
        }
      }
      if (search) {
        const q = search.toLowerCase();
        if (
          !item.codigo.toLowerCase().includes(q) &&
          !item.descricao.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [items, filterGrupo, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetForm = () => {
    setFCodigo('');
    setFDescricao('');
    setEditing(null);
  };

  const handleNew = () => { resetForm(); setDrawerOpen(true); };

  const handleEdit = (item: Cid10) => {
    setEditing(item);
    setFCodigo(item.codigo);
    setFDescricao(item.descricao);
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!fCodigo || !fDescricao) return;
    setSaving(true);

    if (editing) {
      const { error } = await atualizarCid10(editing.id, {
        codigo: fCodigo,
        descricao: fDescricao,
      });
      if (error) { toast.error('Erro ao salvar', error.message); setSaving(false); return; }
      toast.success('CID atualizado!');
    } else {
      const { error } = await criarCid10({
        codigo: fCodigo,
        descricao: fDescricao,
      });
      if (error) { toast.error('Erro ao criar', error.message); setSaving(false); return; }
      toast.success('CID adicionado!');
    }

    invalidateCache('cid10');
    setSaving(false);
    setDrawerOpen(false);
    resetForm();
    await loadItems();
  };

  const handleDelete = async (item: Cid10) => {
    if (!confirm(`Excluir o CID ${item.codigo}?`)) return;
    const { error } = await excluirCid10(item.id);
    if (error) { toast.error('Erro ao excluir', error.message); return; }
    toast.success('CID removido!');
    invalidateCache('cid10');
    await loadItems();
  };

  return (
    <>
      <div className="tfd-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
              Códigos CID-10
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--tfd-text-muted)' }}>
              Classificação Internacional de Doenças — códigos utilizados no TFD
            </p>
          </div>
          <button className="tfd-btn tfd-btn-primary tfd-btn--sm" onClick={handleNew}>
            <Plus size={14} /> Novo CID
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--tfd-text-muted)' }} />
            <input
              type="text"
              className="tfd-input pl-9"
              placeholder="Buscar por código ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} style={{ color: 'var(--tfd-text-muted)' }} />
            <select
              className="tfd-input"
              style={{ width: 'auto' }}
              value={filterGrupo}
              onChange={(e) => setFilterGrupo(e.target.value)}
            >
              {GRUPOS.map((g) => (
                <option key={g.key} value={g.key}>{g.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--tfd-text-muted)' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl" style={{ backgroundColor: 'var(--tfd-primary-50)' }}>
              <Package size={28} style={{ color: 'var(--tfd-primary-400)' }} />
            </div>
            <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
              {items.length === 0
                ? 'Nenhum CID cadastrado.'
                : 'Nenhum resultado para os filtros selecionados.'}
            </p>
            {items.length === 0 && (
              <button className="tfd-btn tfd-btn-primary tfd-btn--sm" onClick={handleNew}>
                <Plus size={14} /> Cadastrar primeiro CID
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5 -mb-5">
            <table className="tfd-table">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}>
                  <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--tfd-text-muted)' }}>
                    Código
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--tfd-text-muted)' }}>
                    Descrição
                  </th>
                  <th className="text-center py-2 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--tfd-text-muted)', width: 90 }}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((item) => (
                  <tr
                    key={item.id}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--tfd-surface-50)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
                  >
                    <td className="py-2.5 px-3" style={{ width: 100 }}>
                      <span className="font-mono text-xs font-semibold" style={{ color: 'var(--tfd-primary-600)' }}>
                        {item.codigo}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <p className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>
                        {item.descricao}
                      </p>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          className="tfd-btn tfd-btn-ghost tfd-btn--sm tfd-btn--icon-only"
                          title="Editar"
                          style={{ color: 'var(--tfd-primary-500)' }}
                          onClick={() => handleEdit(item)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="tfd-btn tfd-btn-ghost tfd-btn--sm tfd-btn--icon-only"
                          title="Excluir"
                          style={{ color: 'var(--tfd-status-danger)' }}
                          onClick={() => handleDelete(item)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer: count + pagination */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
            {filtered.length} código{filtered.length !== 1 ? 's' : ''} CID-10
            {search || filterGrupo ? ' (filtrado)' : ''}
          </p>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                className="tfd-btn tfd-btn-ghost tfd-btn--sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Anterior
              </button>
              <span className="text-xs px-2" style={{ color: 'var(--tfd-text-secondary)' }}>
                {page} / {totalPages}
              </span>
              <button
                className="tfd-btn tfd-btn-ghost tfd-btn--sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Próxima →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Drawer: Editar/Novo CID */}
      <Drawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); resetForm(); }}
        title={editing ? 'Editar CID-10' : 'Novo CID-10'}
        subtitle={editing ? editing.codigo : 'Cadastrar novo código CID-10'}
        width="480px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={() => { setDrawerOpen(false); resetForm(); }}>
              Cancelar
            </button>
            <button
              className="tfd-btn tfd-btn-primary"
              onClick={handleSave}
              disabled={saving || !fCodigo || !fDescricao}
            >
              {saving
                ? <><Loader2 size={14} className="animate-spin" /> Salvando...</>
                : (editing ? 'Salvar Alterações' : 'Adicionar CID')}
            </button>
          </>
        }
      >
        <FormField label="Código CID-10" required>
          <input
            type="text"
            className="tfd-input font-mono"
            placeholder="Ex: C50.1, I25.1, N18.0"
            value={fCodigo}
            onChange={(e) => setFCodigo(e.target.value.toUpperCase())}
          />
          <p className="text-[11px] mt-1" style={{ color: 'var(--tfd-text-muted)' }}>
            Formato: letra + números, com ponto opcional (ex: C50.4)
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
    </>
  );
}
