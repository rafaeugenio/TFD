'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  FileCode2,
  Package,
  AlertTriangle,
} from 'lucide-react';

import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import Pagination from '@/shared/components/pagination/Pagination';
import SortTh, { type SortDir, nextSort, compareValues } from '@/shared/components/sort-th/SortTh';
import { useToast } from '@/shared/components/toast/Toast';
import {
  listarSigtapAdmin,
  criarSigtap,
  atualizarSigtap,
  desativarSigtap,
} from '@/services/sigtap.service';
import type { SigtapProcedimento } from '@/core/models';

const TIPO_LABELS: Record<string, string> = {
  ajuda_custo: 'Ajuda de Custo',
  deslocamento: 'Deslocamento',
};

const SUBTIPO_LABELS: Record<string, string> = {
  aereo: 'Aéreo',
  terrestre: 'Terrestre',
  fluvial: 'Fluvial',
};

const BENEFICIARIO_LABELS: Record<string, string> = {
  paciente: 'Paciente',
  acompanhante: 'Acompanhante',
};

const DEFAULT_PAGE_SIZE = 50;

export default function SigtapPanel() {
  const toast = useToast();
  const [items, setItems] = useState<SigtapProcedimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<SigtapProcedimento | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SigtapProcedimento | null>(null);
  const [deleting, setDeleting] = useState(false);

  /* Filters */
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState<string>('');
  const [filterBeneficiario, setFilterBeneficiario] = useState<string>('');

  /* Sort & pagination */
  const [sort, setSort] = useState<{ field: string; dir: SortDir }>({ field: 'codigo', dir: 'asc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  /* Form state */
  const [fCodigo, setFCodigo] = useState('');
  const [fDescricao, setFDescricao] = useState('');
  const [fTipo, setFTipo] = useState<'ajuda_custo' | 'deslocamento'>('ajuda_custo');
  const [fSubtipo, setFSubtipo] = useState<string>('');
  const [fBeneficiario, setFBeneficiario] = useState<'paciente' | 'acompanhante'>('paciente');
  const [fValor, setFValor] = useState('');
  const [fUnidade, setFUnidade] = useState('');
  const [fCnrac, setFCnrac] = useState(false);
  const [fPortaria, setFPortaria] = useState('');
  const [fVigencia, setFVigencia] = useState('');
  const [fAtivo, setFAtivo] = useState(true);

  /* Debounce da busca (300ms) */
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [filterTipo, filterBeneficiario]);

  const loadItems = async () => {
    setLoading(true);
    const { data } = await listarSigtapAdmin();
    if (data) setItems(data as SigtapProcedimento[]);
    setLoading(false);
  };

  useEffect(() => { loadItems(); }, []);

  const filtered = useMemo(() => {
    let result = items.filter((item) => {
      if (filterTipo && item.tipo !== filterTipo) return false;
      if (filterBeneficiario && item.beneficiario !== filterBeneficiario) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!item.codigo.toLowerCase().includes(q) && !item.descricao.toLowerCase().includes(q)) return false;
      }
      return true;
    });

    if (sort.dir) {
      const dir = sort.dir === 'asc' ? 1 : -1;
      const field = sort.field as keyof SigtapProcedimento;
      result = [...result].sort((a, b) => compareValues(a[field], b[field]) * dir);
    }
    return result;
  }, [items, filterTipo, filterBeneficiario, search, sort]);

  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

  const toggleSort = (field: string) => setSort((prev) => nextSort(field, prev));

  const resetForm = () => {
    setFCodigo(''); setFDescricao(''); setFTipo('ajuda_custo');
    setFSubtipo(''); setFBeneficiario('paciente'); setFValor('');
    setFUnidade(''); setFCnrac(false); setFPortaria('');
    setFVigencia(''); setFAtivo(true); setEditing(null);
  };

  const handleNew = () => { resetForm(); setDrawerOpen(true); };

  const handleEdit = (item: SigtapProcedimento) => {
    setEditing(item);
    setFCodigo(item.codigo);
    setFDescricao(item.descricao);
    setFTipo(item.tipo);
    setFSubtipo(item.subtipo ?? '');
    setFBeneficiario(item.beneficiario);
    setFValor(String(item.valor_unitario));
    setFUnidade(item.unidade_medida ?? '');
    setFCnrac(item.cnrac);
    setFPortaria(item.portaria_referencia ?? '');
    setFVigencia(item.data_vigencia ?? '');
    setFAtivo(item.ativo);
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!fCodigo || !fDescricao || !fValor) return;
    setSaving(true);
    const payload = {
      codigo: fCodigo,
      descricao: fDescricao,
      tipo: fTipo,
      subtipo: fSubtipo ? (fSubtipo as 'aereo' | 'terrestre' | 'fluvial') : undefined,
      beneficiario: fBeneficiario,
      valor_unitario: parseFloat(fValor),
      unidade_medida: fUnidade || undefined,
      cnrac: fCnrac,
      portaria_referencia: fPortaria || undefined,
      data_vigencia: fVigencia || undefined,
      ativo: fAtivo,
    };

    if (editing) {
      const { error } = await atualizarSigtap(editing.id, payload);
      if (error) { toast.error('Erro ao salvar', error.message); setSaving(false); return; }
      toast.success('Procedimento atualizado!');
    } else {
      const { error } = await criarSigtap(payload);
      if (error) { toast.error('Erro ao criar', error.message); setSaving(false); return; }
      toast.success('Procedimento criado!');
    }

    setSaving(false);
    setDrawerOpen(false);
    resetForm();
    await loadItems();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await desativarSigtap(deleteTarget.id);
    if (error) { toast.error('Erro ao remover', error.message); setDeleting(false); return; }
    toast.success('Procedimento removido!');
    setDeleting(false);
    setDeleteTarget(null);
    await loadItems();
  };

  const isFiltered = Boolean(search || filterTipo || filterBeneficiario);

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--tfd-text-primary)' }}>
            Códigos SIGTAP
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--tfd-text-muted)' }}>
            Procedimentos do SUS utilizados no TFD — Portaria SAS/MS n. 55/1999
          </p>
        </div>
        <button className="tfd-btn tfd-btn-primary" onClick={handleNew}>
          <Plus size={16} />
          Novo Código
        </button>
      </div>

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
            placeholder="Buscar por código ou descrição..."
            className="flex-1 bg-transparent outline-none text-[13px]"
          />
        </div>

        <select
          value={filterTipo}
          onChange={(e) => setFilterTipo(e.target.value)}
          style={{
            height: 36, padding: '0 12px',
            background: 'white', border: '1px solid var(--tfd-surface-border)',
            borderRadius: 8, fontSize: 13, color: '#1A1D2B',
          }}
        >
          <option value="">Todos os tipos</option>
          <option value="ajuda_custo">Ajuda de Custo</option>
          <option value="deslocamento">Deslocamento</option>
        </select>

        <select
          value={filterBeneficiario}
          onChange={(e) => setFilterBeneficiario(e.target.value)}
          style={{
            height: 36, padding: '0 12px',
            background: 'white', border: '1px solid var(--tfd-surface-border)',
            borderRadius: 8, fontSize: 13, color: '#1A1D2B',
          }}
        >
          <option value="">Todos beneficiários</option>
          <option value="paciente">Paciente</option>
          <option value="acompanhante">Acompanhante</option>
        </select>
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
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--tfd-surface-border)' }}>
                <SortTh label="Código" field="codigo" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
                <SortTh label="Descrição" field="descricao" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
                <SortTh label="Tipo" field="tipo" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
                <SortTh label="Beneficiário" field="beneficiario" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
                <SortTh label="Valor" field="valor_unitario" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} align="right" />
                <Th>Unidade</Th>
                <Th align="center">CNRAC</Th>
                <Th align="right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center" style={{ color: '#9CA3AF' }}>
                    <div className="inline-flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      Carregando...
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center" style={{ color: '#9CA3AF' }}>
                    <div className="flex flex-col items-center gap-3">
                      <div
                        className="flex items-center justify-center w-14 h-14 rounded-2xl"
                        style={{ backgroundColor: 'var(--tfd-primary-50)' }}
                      >
                        <Package size={26} style={{ color: 'var(--tfd-primary-400)' }} />
                      </div>
                      <p className="text-sm">
                        {isFiltered ? 'Nenhum resultado para os filtros selecionados.' : 'Nenhum procedimento cadastrado.'}
                      </p>
                      {!isFiltered && (
                        <button className="tfd-btn tfd-btn-primary tfd-btn--sm" onClick={handleNew}>
                          <Plus size={14} /> Cadastrar primeiro código
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((item) => (
                  <tr
                    key={item.id}
                    style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}
                    className="hover:bg-[#F8FAFC] transition-colors"
                  >
                    <td className="px-4 py-3.5 font-mono text-[12px]" style={{ color: '#146BFA', fontWeight: 600 }}>
                      {item.codigo}
                    </td>
                    <td className="px-4 py-3.5 max-w-[320px]" style={{ color: '#1A1D2B' }}>
                      <p className="truncate">{item.descricao}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className="tfd-tag tfd-tag--rounded"
                        style={{
                          backgroundColor: item.tipo === 'ajuda_custo' ? 'var(--tfd-status-info-bg)' : 'var(--tfd-status-warning-bg)',
                          color: item.tipo === 'ajuda_custo' ? 'var(--tfd-status-info)' : 'var(--tfd-status-warning)',
                        }}
                      >
                        {TIPO_LABELS[item.tipo]}
                        {item.subtipo && ` · ${SUBTIPO_LABELS[item.subtipo]}`}
                      </span>
                    </td>
                    <td className="px-4 py-3.5" style={{ color: 'var(--tfd-text-secondary)' }}>
                      {BENEFICIARIO_LABELS[item.beneficiario]}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold" style={{ color: '#1A1D2B' }}>
                      R$ {item.valor_unitario.toFixed(2).replace('.', ',')}
                    </td>
                    <td className="px-4 py-3.5 text-[12px]" style={{ color: 'var(--tfd-text-muted)' }}>
                      {item.unidade_medida ?? '—'}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {item.cnrac ? (
                        <span className="tfd-tag tfd-tag--rounded tfd-tag--success text-[10px]">CNRAC</span>
                      ) : (
                        <span style={{ color: 'var(--tfd-text-muted)' }}>—</span>
                      )}
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
                          title="Remover"
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
        </div>

        <Pagination
          total={filtered.length}
          pageSize={pageSize}
          page={page}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          recordLabel={`procedimento${filtered.length === 1 ? '' : 's'}${isFiltered ? ' (filtrado)' : ''}`}
        />
      </div>

      <div className="mt-2 flex items-center justify-end gap-1 text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
        <FileCode2 size={12} />
        <span>Ref.: Portaria SAS/MS n. 55/1999</span>
      </div>

      {/* Modal: Confirmar remoção */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="tfd-card tfd-card--flat w-full max-w-md" style={{ backgroundColor: 'var(--tfd-surface-card)' }}>
            <div className="flex items-start gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full shrink-0" style={{ backgroundColor: '#fef2f2' }}>
                <AlertTriangle size={18} style={{ color: '#dc2626' }} />
              </div>
              <div>
                <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--tfd-text-primary)' }}>
                  Remover procedimento?
                </h3>
                <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
                  O procedimento{' '}
                  <span className="font-mono font-semibold" style={{ color: 'var(--tfd-primary-600)' }}>
                    {deleteTarget.codigo}
                  </span>{' '}
                  — {deleteTarget.descricao} — será desativado e não aparecerá mais nas listagens.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button className="tfd-btn tfd-btn-secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancelar
              </button>
              <button className="tfd-btn tfd-btn-danger" onClick={confirmDelete} disabled={deleting}>
                {deleting ? <><Loader2 size={14} className="animate-spin" /> Removendo...</> : <><Trash2 size={14} /> Remover</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer: Editar/Novo SIGTAP */}
      <Drawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); resetForm(); }}
        title={editing ? 'Editar Procedimento' : 'Novo Procedimento SIGTAP'}
        subtitle={editing ? editing.codigo : 'Cadastrar novo código de procedimento'}
        width="520px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={() => { setDrawerOpen(false); resetForm(); }}>
              Cancelar
            </button>
            <button className="tfd-btn tfd-btn-primary" onClick={handleSave} disabled={saving || !fCodigo || !fDescricao || !fValor}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : (editing ? 'Salvar Alterações' : 'Criar Procedimento')}
            </button>
          </>
        }
      >
        <FormField label="Código SIGTAP" required>
          <input type="text" className="tfd-input font-mono" placeholder="08.03.01.001-0" value={fCodigo} onChange={(e) => setFCodigo(e.target.value)} />
        </FormField>

        <FormField label="Descrição" required>
          <textarea className="tfd-input" rows={2} placeholder="Descrição do procedimento" value={fDescricao} onChange={(e) => setFDescricao(e.target.value)} />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Tipo" required>
            <select className="tfd-input" value={fTipo} onChange={(e) => setFTipo(e.target.value as 'ajuda_custo' | 'deslocamento')}>
              <option value="ajuda_custo">Ajuda de Custo</option>
              <option value="deslocamento">Deslocamento</option>
            </select>
          </FormField>

          <FormField label="Subtipo">
            <select className="tfd-input" value={fSubtipo} onChange={(e) => setFSubtipo(e.target.value)}>
              <option value="">Nenhum</option>
              <option value="aereo">Aéreo</option>
              <option value="terrestre">Terrestre</option>
              <option value="fluvial">Fluvial</option>
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Beneficiário" required>
            <select className="tfd-input" value={fBeneficiario} onChange={(e) => setFBeneficiario(e.target.value as 'paciente' | 'acompanhante')}>
              <option value="paciente">Paciente</option>
              <option value="acompanhante">Acompanhante</option>
            </select>
          </FormField>

          <FormField label="Valor Unitário (R$)" required>
            <input type="number" step="0.01" className="tfd-input" placeholder="0,00" value={fValor} onChange={(e) => setFValor(e.target.value)} />
          </FormField>
        </div>

        <FormField label="Unidade de Medida">
          <input type="text" className="tfd-input" placeholder="Ex: dia, 200 milhas, 50 km" value={fUnidade} onChange={(e) => setFUnidade(e.target.value)} />
        </FormField>

        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={fCnrac} onChange={(e) => setFCnrac(e.target.checked)} className="w-4 h-4 rounded" style={{ accentColor: 'var(--tfd-primary-600)' }} />
            <span className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>Código CNRAC (interestadual)</span>
          </label>
        </div>

        <hr className="tfd-divider" />

        <FormField label="Portaria de Referência">
          <input type="text" className="tfd-input" placeholder="Ex: Portaria SAS/MS n. 55/1999" value={fPortaria} onChange={(e) => setFPortaria(e.target.value)} />
        </FormField>

        <FormField label="Data de Vigência">
          <input type="date" className="tfd-input" value={fVigencia} onChange={(e) => setFVigencia(e.target.value)} />
        </FormField>

        {editing && (
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={fAtivo} onChange={(e) => setFAtivo(e.target.checked)} className="w-4 h-4 rounded" style={{ accentColor: 'var(--tfd-primary-600)' }} />
              <span className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>Procedimento ativo</span>
            </label>
          </div>
        )}
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
