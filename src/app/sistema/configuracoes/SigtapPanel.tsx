'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  Filter,
  FileCode2,
  Package,
  AlertTriangle,
} from 'lucide-react';

import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
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
  const [filterTipo, setFilterTipo] = useState<string>('');
  const [filterBeneficiario, setFilterBeneficiario] = useState<string>('');
  const [search, setSearch] = useState('');

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

  const loadItems = async () => {
    setLoading(true);
    const { data } = await listarSigtapAdmin();
    if (data) setItems(data as SigtapProcedimento[]);
    setLoading(false);
  };

  useEffect(() => { loadItems(); }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filterTipo && item.tipo !== filterTipo) return false;
      if (filterBeneficiario && item.beneficiario !== filterBeneficiario) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!item.codigo.toLowerCase().includes(q) && !item.descricao.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [items, filterTipo, filterBeneficiario, search]);

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

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await desativarSigtap(deleteTarget.id);
    if (error) { toast.error('Erro ao remover', error.message); setDeleting(false); return; }
    toast.success('Procedimento removido!');
    setDeleting(false);
    setDeleteTarget(null);
    await loadItems();
  };

  return (
    <>
      <div className="tfd-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
            Códigos SIGTAP — Procedimentos TFD
          </h2>
          <button className="tfd-btn tfd-btn-primary tfd-btn--sm" onClick={handleNew}>
            <Plus size={14} /> Novo Código
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
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
            <select className="tfd-input" style={{ width: 'auto' }} value={filterTipo} onChange={(e) => setFilterTipo(e.target.value)}>
              <option value="">Todos os tipos</option>
              <option value="ajuda_custo">Ajuda de Custo</option>
              <option value="deslocamento">Deslocamento</option>
            </select>
            <select className="tfd-input" style={{ width: 'auto' }} value={filterBeneficiario} onChange={(e) => setFilterBeneficiario(e.target.value)}>
              <option value="">Todos beneficiários</option>
              <option value="paciente">Paciente</option>
              <option value="acompanhante">Acompanhante</option>
            </select>
          </div>
        </div>

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
              {items.length === 0 ? 'Nenhum procedimento cadastrado.' : 'Nenhum resultado para os filtros selecionados.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5 -mb-5">
            <table className="tfd-table">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}>
                  <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--tfd-text-muted)' }}>Código</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--tfd-text-muted)' }}>Descrição</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--tfd-text-muted)' }}>Tipo</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--tfd-text-muted)' }}>Beneficiário</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--tfd-text-muted)' }}>Valor Unit.</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--tfd-text-muted)' }}>Unidade</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--tfd-text-muted)' }}>CNRAC</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--tfd-text-muted)' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--tfd-surface-50)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
                  >
                    <td className="py-2.5 px-3">
                      <span className="font-mono text-xs font-semibold" style={{ color: 'var(--tfd-primary-600)' }}>
                        {item.codigo}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 max-w-[300px]">
                      <p className="text-sm truncate" style={{ color: 'var(--tfd-text-primary)' }}>{item.descricao}</p>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="tfd-tag tfd-tag--rounded" style={{
                        backgroundColor: item.tipo === 'ajuda_custo' ? 'var(--tfd-status-info-bg)' : 'var(--tfd-status-warning-bg)',
                        color: item.tipo === 'ajuda_custo' ? 'var(--tfd-status-info)' : 'var(--tfd-status-warning)',
                      }}>
                        {TIPO_LABELS[item.tipo]}
                        {item.subtipo && ` · ${SUBTIPO_LABELS[item.subtipo]}`}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
                      {BENEFICIARIO_LABELS[item.beneficiario]}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="font-semibold text-sm" style={{ color: 'var(--tfd-text-primary)' }}>
                        R$ {item.valor_unitario.toFixed(2).replace('.', ',')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                      {item.unidade_medida ?? '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {item.cnrac ? (
                        <span className="tfd-tag tfd-tag--rounded tfd-tag--success text-[10px]">CNRAC</span>
                      ) : (
                        <span style={{ color: 'var(--tfd-text-muted)' }}>—</span>
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
                          title="Remover"
                          style={{ color: '#dc2626' }}
                          onClick={() => setDeleteTarget(item)}
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

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
            {filtered.length} procedimento{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
            <FileCode2 size={12} />
            <span>Ref.: Portaria SAS/MS n. 55/1999</span>
          </div>
        </div>
      </div>

      {/* Modal: Confirmar remoção */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="tfd-card w-full max-w-md" style={{ backgroundColor: 'var(--tfd-surface-card)' }}>
            <div className="flex items-start gap-3 mb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full shrink-0" style={{ backgroundColor: '#fef2f2' }}>
                <AlertTriangle size={18} style={{ color: '#dc2626' }} />
              </div>
              <div>
                <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--tfd-text-primary)' }}>
                  Remover procedimento?
                </h3>
                <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
                  O procedimento <span className="font-mono font-semibold" style={{ color: 'var(--tfd-primary-600)' }}>{deleteTarget.codigo}</span> — {deleteTarget.descricao} será desativado e não aparecerá mais nas listagens.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="tfd-btn tfd-btn-secondary"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                className="tfd-btn tfd-btn-danger"
                onClick={handleDelete}
                disabled={deleting}
              >
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
