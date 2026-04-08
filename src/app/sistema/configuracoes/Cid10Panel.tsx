'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Pencil,
  Loader2,
  Search,
  Filter,
  FileText,
  Package,
  Trash2,
} from 'lucide-react';

import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import { useToast } from '@/shared/components/toast/Toast';
import {
  listarPorCategoriaAdmin,
  criarItemAuxiliar,
  atualizarItemAuxiliar,
  excluirItemAuxiliar,
  type TabelaAuxiliar,
} from '@/services/tabelas-auxiliares.service';
import { invalidateCache } from '@/shared/hooks/useLookup';

/* ── Agrupamentos por especialidade ── */

const GRUPOS: { key: string; label: string }[] = [
  { key: '', label: 'Todos os grupos' },
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
  { key: 'T', label: 'Complicações / Rejeição (T)' },
  { key: 'Z', label: 'Transplantes / Acompanhamento (Z)' },
  { key: 'A', label: 'Infectologia (A-B)' },
  { key: 'B', label: 'Infectologia (A-B)' },
];

function getGrupoLetra(codigo: string): string {
  return codigo.charAt(0).toUpperCase();
}

const PAGE_SIZE = 30;

export default function Cid10Panel() {
  const toast = useToast();
  const [items, setItems] = useState<TabelaAuxiliar[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<TabelaAuxiliar | null>(null);

  /* Filters */
  const [search, setSearch] = useState('');
  const [filterGrupo, setFilterGrupo] = useState('');
  const [showInativos, setShowInativos] = useState(false);
  const [page, setPage] = useState(1);

  /* Form state */
  const [fCodigo, setFCodigo] = useState('');
  const [fDescricao, setFDescricao] = useState('');
  const [fAtivo, setFAtivo] = useState(true);

  const loadItems = async () => {
    setLoading(true);
    const { data } = await listarPorCategoriaAdmin('cid10');
    if (data) setItems(data as unknown as TabelaAuxiliar[]);
    setLoading(false);
  };

  useEffect(() => { loadItems(); }, []);

  /* Reset page on filter change */
  useEffect(() => { setPage(1); }, [search, filterGrupo, showInativos]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (!showInativos && !item.ativo) return false;
      if (filterGrupo) {
        const letra = getGrupoLetra(item.codigo);
        if (filterGrupo === 'A' || filterGrupo === 'B') {
          if (letra !== 'A' && letra !== 'B') return false;
        } else if (filterGrupo === 'S') {
          if (letra !== 'S' && letra !== 'T') return false;
        } else {
          if (letra !== filterGrupo) return false;
        }
      }
      if (search) {
        const q = search.toLowerCase();
        if (
          !item.codigo.toLowerCase().includes(q) &&
          !item.nome.toLowerCase().includes(q) &&
          !(item.descricao ?? '').toLowerCase().includes(q)
        ) return false;
      }
      return true;
    });
  }, [items, filterGrupo, showInativos, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const resetForm = () => {
    setFCodigo('');
    setFDescricao('');
    setFAtivo(true);
    setEditing(null);
  };

  const handleNew = () => { resetForm(); setDrawerOpen(true); };

  const handleEdit = (item: TabelaAuxiliar) => {
    setEditing(item);
    setFCodigo(item.codigo);
    setFDescricao(item.descricao ?? '');
    setFAtivo(item.ativo);
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!fCodigo || !fDescricao) return;
    setSaving(true);

    if (editing) {
      const { error } = await atualizarItemAuxiliar(editing.id, {
        codigo: fCodigo,
        nome: fCodigo,
        descricao: fDescricao,
        ativo: fAtivo,
      });
      if (error) { toast.error('Erro ao salvar', error.message); setSaving(false); return; }
      toast.success('CID atualizado!');
    } else {
      const { error } = await criarItemAuxiliar({
        categoria: 'cid10',
        codigo: fCodigo,
        nome: fCodigo,
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

  const handleDelete = async (item: TabelaAuxiliar) => {
    if (!confirm(`Excluir o CID ${item.codigo}?`)) return;
    const { error } = await excluirItemAuxiliar(item.id);
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
              {GRUPOS.filter((g, i, arr) =>
                arr.findIndex((x) => x.label === g.label) === i
              ).map((g) => (
                <option key={g.key} value={g.key}>{g.label}</option>
              ))}
            </select>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>
              <input
                type="checkbox"
                checked={showInativos}
                onChange={(e) => setShowInativos(e.target.checked)}
                className="w-3.5 h-3.5 rounded"
                style={{ accentColor: 'var(--tfd-primary-600)' }}
              />
              Inativos
            </label>
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}>
                  <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--tfd-text-muted)' }}>
                    Código
                  </th>
                  <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--tfd-text-muted)' }}>
                    Descrição
                  </th>
                  <th className="text-center py-2 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--tfd-text-muted)', width: 80 }}>
                    Status
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
                        {item.descricao || item.nome}
                      </p>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {!item.ativo && (
                        <span className="tfd-tag tfd-tag--rounded" style={{
                          backgroundColor: 'var(--tfd-status-warning-bg)',
                          color: 'var(--tfd-status-warning)',
                          fontSize: '10px',
                        }}>
                          Inativo
                        </span>
                      )}
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

        {editing && (
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={fAtivo}
                onChange={(e) => setFAtivo(e.target.checked)}
                className="w-4 h-4 rounded"
                style={{ accentColor: 'var(--tfd-primary-600)' }}
              />
              <span className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>CID ativo</span>
            </label>
          </div>
        )}
      </Drawer>
    </>
  );
}
