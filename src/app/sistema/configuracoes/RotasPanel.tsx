'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Pencil,
  Loader2,
  Search,
  MapPin,
  ArrowRight,
  Package,
  Power,
  Route,
} from 'lucide-react';

import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import UfCidadeSelect from '@/shared/components/uf-cidade-select/UfCidadeSelect';
import { useToast } from '@/shared/components/toast/Toast';
import {
  listarRotasAdmin,
  criarRota,
  atualizarRota,
  desativarRota,
  calcularProcedimentos,
} from '@/services/rotas-deslocamento.service';
import type { RotaDeslocamento } from '@/core/models';

const MODAL_LABELS = {
  aereo: 'Aéreo',
  terrestre: 'Terrestre',
  fluvial: 'Fluvial',
} as const;

export default function RotasPanel() {
  const toast = useToast();
  const [items, setItems] = useState<RotaDeslocamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<RotaDeslocamento | null>(null);

  /* Form state */
  const [fCidadeOrigem, setFCidadeOrigem] = useState('');
  const [fUfOrigem, setFUfOrigem] = useState('MA');
  const [fCidadeDestino, setFCidadeDestino] = useState('');
  const [fUfDestino, setFUfDestino] = useState('');
  const [fDistMilhas, setFDistMilhas] = useState('');
  const [fModal, setFModal] = useState<'aereo' | 'terrestre' | 'fluvial'>('aereo');
  const [fAtivo, setFAtivo] = useState(true);

  const loadItems = async () => {
    setLoading(true);
    const { data } = await listarRotasAdmin(search ? { search } : undefined);
    if (data) setItems(data as RotaDeslocamento[]);
    setLoading(false);
  };

  useEffect(() => { loadItems(); }, []);

  const handleSearch = () => { loadItems(); };

  const resetForm = () => {
    setFCidadeOrigem('');
    setFUfOrigem('MA');
    setFCidadeDestino('');
    setFUfDestino('');
    setFDistMilhas('');
    setFModal('aereo');
    setFAtivo(true);
    setEditing(null);
  };

  const handleNew = () => { resetForm(); setDrawerOpen(true); };

  const handleEdit = (item: RotaDeslocamento) => {
    setEditing(item);
    setFCidadeOrigem(item.cidade_origem);
    setFUfOrigem(item.uf_origem);
    setFCidadeDestino(item.cidade_destino);
    setFUfDestino(item.uf_destino);
    setFDistMilhas(item.distancia_milhas != null ? String(item.distancia_milhas) : '');
    setFModal('aereo');
    setFAtivo(item.ativo);
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!fCidadeOrigem || !fUfOrigem || !fCidadeDestino || !fUfDestino) return;
    setSaving(true);
    const payload = {
      cidade_origem: fCidadeOrigem,
      uf_origem: fUfOrigem,
      cidade_destino: fCidadeDestino,
      uf_destino: fUfDestino,
      distancia_milhas: fDistMilhas ? parseFloat(fDistMilhas) : undefined,
      ativo: fAtivo,
    };

    if (editing) {
      const { error } = await atualizarRota(editing.id, payload);
      if (error) { toast.error('Erro ao salvar', error.message); setSaving(false); return; }
      toast.success('Rota atualizada!');
    } else {
      const { error } = await criarRota(payload);
      if (error) { toast.error('Erro ao criar', error.message); setSaving(false); return; }
      toast.success('Rota cadastrada!');
    }

    setSaving(false);
    setDrawerOpen(false);
    resetForm();
    await loadItems();
  };

  const handleDeactivate = async (item: RotaDeslocamento) => {
    if (!window.confirm(`Desativar a rota "${item.cidade_origem}/${item.uf_origem} → ${item.cidade_destino}/${item.uf_destino}"?`)) return;
    const { error } = await desativarRota(item.id);
    if (error) { toast.error('Erro', error.message); return; }
    toast.success('Rota desativada!');
    await loadItems();
  };

  /* Preview do cálculo de procedimentos no drawer */
  const previewRota: RotaDeslocamento = {
    id: 0,
    cidade_origem: fCidadeOrigem,
    uf_origem: fUfOrigem,
    cidade_destino: fCidadeDestino,
    uf_destino: fUfDestino,
    distancia_milhas: fDistMilhas ? parseFloat(fDistMilhas) : undefined,
    ativo: true,
  };

  const prevCalc = calcularProcedimentos(previewRota, fModal);

  return (
    <>
      <div className="tfd-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
            Rotas de Deslocamento
          </h2>
          <button className="tfd-btn tfd-btn-primary tfd-btn--sm" onClick={handleNew}>
            <Plus size={14} /> Nova Rota
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 mb-4">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--tfd-text-muted)' }} />
            <input
              type="text"
              className="tfd-input pl-9"
              placeholder="Buscar por cidade de origem ou destino..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            />
          </div>
          <button className="tfd-btn tfd-btn-secondary tfd-btn--sm" onClick={handleSearch}>
            Buscar
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--tfd-text-muted)' }} />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl" style={{ backgroundColor: 'var(--tfd-primary-50)' }}>
              <Package size={28} style={{ color: 'var(--tfd-primary-400)' }} />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--tfd-text-primary)' }}>Nenhuma rota cadastrada</p>
              <p className="text-xs max-w-[280px]" style={{ color: 'var(--tfd-text-muted)' }}>Cadastre rotas com distâncias para cálculo automático de procedimentos SIGTAP.</p>
            </div>
            <button className="tfd-btn tfd-btn-primary tfd-btn--sm" onClick={handleNew}>
              <Plus size={14} /> Cadastrar primeira rota
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}>
                  <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--tfd-text-muted)' }}>Origem</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--tfd-text-muted)' }}></th>
                  <th className="text-left py-2 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--tfd-text-muted)' }}>Destino</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--tfd-text-muted)' }}>Milhas</th>
                  <th className="text-center py-2 px-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--tfd-text-muted)' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="transition-colors"
                    style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--tfd-surface-50)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
                  >
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} style={{ color: 'var(--tfd-primary-500)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                          {item.cidade_origem}/{item.uf_origem}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-1 text-center">
                      <ArrowRight size={12} style={{ color: 'var(--tfd-text-muted)' }} />
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                        {item.cidade_destino}/{item.uf_destino}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {item.distancia_milhas != null ? (
                        <span className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>
                          {item.distancia_milhas.toLocaleString('pt-BR')}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--tfd-text-muted)' }}>—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center justify-center gap-1">
                        {!item.ativo && (
                          <span className="tfd-tag tfd-tag--rounded tfd-tag--dot tfd-tag--secondary text-[10px]">Inativo</span>
                        )}
                        <button
                          className="tfd-btn tfd-btn-ghost tfd-btn--sm tfd-btn--icon-only"
                          title="Editar"
                          style={{ color: 'var(--tfd-primary-500)' }}
                          onClick={() => handleEdit(item)}
                        >
                          <Pencil size={14} />
                        </button>
                        {item.ativo && (
                          <button
                            className="tfd-btn tfd-btn-ghost tfd-btn--sm tfd-btn--icon-only"
                            title="Desativar"
                            style={{ color: 'var(--tfd-status-danger)' }}
                            onClick={() => handleDeactivate(item)}
                          >
                            <Power size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4">
          <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
            {items.length} rota{items.length !== 1 ? 's' : ''} cadastrada{items.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Drawer: Nova/Editar Rota */}
      <Drawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); resetForm(); }}
        title={editing ? 'Editar Rota' : 'Nova Rota de Deslocamento'}
        subtitle={editing ? `${editing.cidade_origem}/${editing.uf_origem} → ${editing.cidade_destino}/${editing.uf_destino}` : 'Cadastrar rota com distância'}
        width="520px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={() => { setDrawerOpen(false); resetForm(); }}>
              Cancelar
            </button>
            <button className="tfd-btn tfd-btn-primary" onClick={handleSave} disabled={saving || !fCidadeOrigem || !fUfOrigem || !fCidadeDestino || !fUfDestino}>
              {saving ? <><Loader2 size={14} className="animate-spin" /> Salvando...</> : (editing ? 'Salvar Alterações' : 'Criar Rota')}
            </button>
          </>
        }
      >
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Origem</h3>
        <UfCidadeSelect
          ufLabel="UF"
          cidadeLabel="Cidade"
          uf={fUfOrigem}
          cidade={fCidadeOrigem}
          onUfChange={setFUfOrigem}
          onCidadeChange={setFCidadeOrigem}
          required
        />

        <h3 className="text-sm font-semibold mb-3 mt-4" style={{ color: 'var(--tfd-text-primary)' }}>Destino</h3>
        <UfCidadeSelect
          ufLabel="UF"
          cidadeLabel="Cidade"
          uf={fUfDestino}
          cidade={fCidadeDestino}
          onUfChange={setFUfDestino}
          onCidadeChange={setFCidadeDestino}
          required
        />

        <hr className="tfd-divider" />

        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Distância</h3>

        <FormField label="Distância" required>
          <div className="relative">
            <input
              type="number"
              step="1"
              min="0"
              className="tfd-input pr-16"
              placeholder="Ex: 1456"
              value={fDistMilhas}
              onChange={(e) => setFDistMilhas(e.target.value)}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium pointer-events-none" style={{ color: 'var(--tfd-text-muted)' }}>
              milhas
            </span>
          </div>
        </FormField>

        <FormField label="Modal de transporte">
          <select
            className="tfd-input"
            value={fModal}
            onChange={(e) => setFModal(e.target.value as 'aereo' | 'terrestre' | 'fluvial')}
          >
            <option value="aereo">Aéreo</option>
            <option value="terrestre">Terrestre</option>
            <option value="fluvial">Fluvial</option>
          </select>
        </FormField>

        {/* Preview de cálculo */}
        {prevCalc && (
          <>
            <hr className="tfd-divider" />
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--tfd-primary-50)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Route size={14} style={{ color: 'var(--tfd-primary-600)' }} />
                <p className="text-xs font-semibold" style={{ color: 'var(--tfd-primary-700)' }}>
                  Preview de Procedimentos
                </p>
              </div>
              <p className="text-xs" style={{ color: 'var(--tfd-primary-600)' }}>
                {MODAL_LABELS[fModal]}: {prevCalc.distancia.toLocaleString('pt-BR')} milhas → {prevCalc.quantidade} procedimento{prevCalc.quantidade !== 1 ? 's' : ''}
              </p>
            </div>
          </>
        )}

        {editing && (
          <div className="mb-4 mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={fAtivo} onChange={(e) => setFAtivo(e.target.checked)} className="w-4 h-4 rounded" style={{ accentColor: 'var(--tfd-primary-600)' }} />
              <span className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>Rota ativa</span>
            </label>
          </div>
        )}
      </Drawer>
    </>
  );
}
