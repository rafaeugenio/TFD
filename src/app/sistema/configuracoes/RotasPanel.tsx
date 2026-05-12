'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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

import { buscarMunicipio } from '@/services/municipios.service';
import {
  distanciaKm,
  distanciaMilhas,
  distanciaMilhasNauticas,
} from '@/lib/distancia/haversine';

import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import Pagination from '@/shared/components/pagination/Pagination';
import SortTh, { type SortDir, nextSort, compareValues } from '@/shared/components/sort-th/SortTh';
import ConfirmDialog, { buildDiff, type DiffField } from '@/shared/components/confirm-dialog/ConfirmDialog';
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
import { TableRowsSkeleton } from '@/shared/components/skeleton';

const MODAL_LABELS = {
  aereo: 'Aéreo',
  terrestre: 'Terrestre',
  fluvial: 'Fluvial',
} as const;

type Modal = 'aereo' | 'terrestre' | 'fluvial';

const DEFAULT_PAGE_SIZE = 50;

function inferModal(item: RotaDeslocamento): Modal {
  if (item.distancia_km != null) return 'terrestre';
  if (item.distancia_milhas_nauticas != null) return 'fluvial';
  return 'aereo';
}

function distanciaSortKey(item: RotaDeslocamento): number {
  return item.distancia_km ?? item.distancia_milhas_nauticas ?? item.distancia_milhas ?? 0;
}

export default function RotasPanel() {
  const toast = useToast();
  const [items, setItems] = useState<RotaDeslocamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<RotaDeslocamento | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<RotaDeslocamento | null>(null);
  const [saveConfirm, setSaveConfirm] = useState<{ tone: 'create' | 'edit'; diff: DiffField[]; payload: Record<string, unknown> } | null>(null);
  const [deactivating, setDeactivating] = useState(false);

  /* Filters */
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterModal, setFilterModal] = useState<string>('');

  /* Sort & pagination */
  const [sort, setSort] = useState<{ field: string; dir: SortDir }>({ field: 'cidade_origem', dir: 'asc' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  /* Form state */
  const [fCidadeOrigem, setFCidadeOrigem] = useState('');
  const [fUfOrigem, setFUfOrigem] = useState('MA');
  const [fCidadeDestino, setFCidadeDestino] = useState('');
  const [fUfDestino, setFUfDestino] = useState('');
  const [fDistMilhas, setFDistMilhas] = useState('');
  const [fDistKm, setFDistKm] = useState('');
  const [fDistMn, setFDistMn] = useState('');
  const [fModal, setFModal] = useState<Modal>('aereo');
  const [fAtivo, setFAtivo] = useState(true);

  /* Debounce da busca (300ms) — refaz a query no banco */
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [filterModal]);

  const loadItems = async () => {
    setLoading(true);
    const { data } = await listarRotasAdmin(search ? { search } : undefined);
    if (data) setItems(data as RotaDeslocamento[]);
    setLoading(false);
  };

  useEffect(() => { loadItems(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [search]);

  const filtered = useMemo(() => {
    let result = items;
    if (filterModal) {
      result = result.filter((item) => inferModal(item) === filterModal);
    }

    if (sort.dir) {
      const dir = sort.dir === 'asc' ? 1 : -1;
      result = [...result].sort((a, b) => {
        if (sort.field === 'distancia') {
          return (distanciaSortKey(a) - distanciaSortKey(b)) * dir;
        }
        if (sort.field === 'modal') {
          return compareValues(inferModal(a), inferModal(b)) * dir;
        }
        const field = sort.field as keyof RotaDeslocamento;
        return compareValues(a[field], b[field]) * dir;
      });
    }
    return result;
  }, [items, filterModal, sort]);

  const paginated = useMemo(
    () => filtered.slice((page - 1) * pageSize, page * pageSize),
    [filtered, page, pageSize],
  );

  const toggleSort = (field: string) => setSort((prev) => nextSort(field, prev));

  const resetForm = () => {
    setFCidadeOrigem(''); setFUfOrigem('MA');
    setFCidadeDestino(''); setFUfDestino('');
    setFDistMilhas(''); setFDistKm(''); setFDistMn('');
    setFModal('aereo'); setFAtivo(true); setEditing(null);
  };

  const [calculandoDist, setCalculandoDist] = useState(false);
  const [distErro, setDistErro] = useState<string | null>(null);

  /** Auto-calcula a distância sempre que origem, destino ou modal mudam.
   *  Campo de distância é readOnly — o valor é derivado das coordenadas IBGE. */
  useEffect(() => {
    if (!fCidadeOrigem || !fUfOrigem || !fCidadeDestino || !fUfDestino) {
      setDistErro(null);
      return;
    }
    let cancelado = false;
    setCalculandoDist(true);
    setDistErro(null);
    (async () => {
      try {
        const [origem, destino] = await Promise.all([
          buscarMunicipio(fCidadeOrigem, fUfOrigem),
          buscarMunicipio(fCidadeDestino, fUfDestino),
        ]);
        if (cancelado) return;
        if (!origem) {
          setDistErro(`Cidade de origem "${fCidadeOrigem}/${fUfOrigem}" não está na base IBGE.`);
          setFDistMilhas(''); setFDistKm(''); setFDistMn('');
          return;
        }
        if (!destino) {
          setDistErro(`Cidade de destino "${fCidadeDestino}/${fUfDestino}" não está na base IBGE.`);
          setFDistMilhas(''); setFDistKm(''); setFDistMn('');
          return;
        }
        if (fModal === 'aereo') {
          setFDistMilhas(String(Math.round(distanciaMilhas(origem, destino))));
          setFDistKm(''); setFDistMn('');
        } else if (fModal === 'terrestre') {
          setFDistKm(String(Math.round(distanciaKm(origem, destino))));
          setFDistMilhas(''); setFDistMn('');
        } else {
          setFDistMn(String(Math.round(distanciaMilhasNauticas(origem, destino))));
          setFDistMilhas(''); setFDistKm('');
        }
      } catch (err) {
        if (!cancelado) {
          setDistErro(err instanceof Error ? err.message : 'Falha ao carregar base de municípios.');
        }
      } finally {
        if (!cancelado) setCalculandoDist(false);
      }
    })();
    return () => { cancelado = true; };
  }, [fCidadeOrigem, fUfOrigem, fCidadeDestino, fUfDestino, fModal]);

  const handleNew = () => { resetForm(); setDrawerOpen(true); };

  const handleEdit = (item: RotaDeslocamento) => {
    setEditing(item);
    setFCidadeOrigem(item.cidade_origem);
    setFUfOrigem(item.uf_origem);
    setFCidadeDestino(item.cidade_destino);
    setFUfDestino(item.uf_destino);
    setFDistMilhas(item.distancia_milhas != null ? String(item.distancia_milhas) : '');
    setFDistKm(item.distancia_km != null ? String(item.distancia_km) : '');
    setFDistMn(item.distancia_milhas_nauticas != null ? String(item.distancia_milhas_nauticas) : '');
    setFModal(inferModal(item));
    setFAtivo(item.ativo);
    setDrawerOpen(true);
  };

  const handleRequestSave = () => {
    if (!fCidadeOrigem || !fUfOrigem || !fCidadeDestino || !fUfDestino) {
      toast.warning('Campos obrigatórios', 'Preencha origem e destino antes de salvar.');
      return;
    }
    const payload = {
      cidade_origem: fCidadeOrigem,
      uf_origem: fUfOrigem,
      cidade_destino: fCidadeDestino,
      uf_destino: fUfDestino,
      distancia_milhas: fModal === 'aereo' && fDistMilhas ? parseFloat(fDistMilhas) : undefined,
      distancia_km: fModal === 'terrestre' && fDistKm ? parseFloat(fDistKm) : undefined,
      distancia_milhas_nauticas: fModal === 'fluvial' && fDistMn ? parseFloat(fDistMn) : undefined,
      ativo: fAtivo,
    };

    const fmtDist = (modal: Modal, p: typeof payload) => {
      if (modal === 'aereo' && p.distancia_milhas) return `${p.distancia_milhas} milhas`;
      if (modal === 'terrestre' && p.distancia_km) return `${p.distancia_km} km`;
      if (modal === 'fluvial' && p.distancia_milhas_nauticas) return `${p.distancia_milhas_nauticas} mn`;
      return '';
    };

    if (editing) {
      const before = {
        origem: `${editing.cidade_origem}/${editing.uf_origem}`,
        destino: `${editing.cidade_destino}/${editing.uf_destino}`,
        modal: MODAL_LABELS[inferModal(editing)],
        distancia: fmtDist(inferModal(editing), {
          distancia_milhas: editing.distancia_milhas,
          distancia_km: editing.distancia_km,
          distancia_milhas_nauticas: editing.distancia_milhas_nauticas,
        } as typeof payload),
        ativo: editing.ativo,
      };
      const after = {
        origem: `${payload.cidade_origem}/${payload.uf_origem}`,
        destino: `${payload.cidade_destino}/${payload.uf_destino}`,
        modal: MODAL_LABELS[fModal],
        distancia: fmtDist(fModal, payload),
        ativo: payload.ativo,
      };
      const diff = buildDiff(before, after, [
        { key: 'origem', label: 'Origem' },
        { key: 'destino', label: 'Destino' },
        { key: 'modal', label: 'Modal' },
        { key: 'distancia', label: 'Distância' },
        { key: 'ativo', label: 'Ativo' },
      ]);
      setSaveConfirm({ tone: 'edit', diff, payload });
    } else {
      setSaveConfirm({
        tone: 'create',
        payload,
        diff: [
          { label: 'Origem', after: `${payload.cidade_origem}/${payload.uf_origem}` },
          { label: 'Destino', after: `${payload.cidade_destino}/${payload.uf_destino}` },
          { label: 'Modal', after: MODAL_LABELS[fModal] },
          { label: 'Distância', after: fmtDist(fModal, payload) },
        ],
      });
    }
  };

  const handleConfirmSave = async () => {
    if (!saveConfirm) return;
    setSaving(true);
    try {
      const payload = saveConfirm.payload as Parameters<typeof criarRota>[0];
      if (editing) {
        const { error } = await atualizarRota(editing.id, payload);
        if (error) { toast.error('Erro ao salvar', error.message); return; }
        toast.success('Rota atualizada!', `${payload.cidade_origem}/${payload.uf_origem} → ${payload.cidade_destino}/${payload.uf_destino}`);
      } else {
        const { error } = await criarRota(payload);
        if (error) { toast.error('Erro ao criar', error.message); return; }
        toast.success('Rota cadastrada!', `${payload.cidade_origem}/${payload.uf_origem} → ${payload.cidade_destino}/${payload.uf_destino}`);
      }
      setSaveConfirm(null);
      setDrawerOpen(false);
      resetForm();
      await loadItems();
    } finally {
      setSaving(false);
    }
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    setDeactivating(true);
    try {
      const { error } = await desativarRota(deactivateTarget.id);
      if (error) { toast.error('Erro ao desativar', error.message); return; }
      toast.success('Rota desativada!', `${deactivateTarget.cidade_origem}/${deactivateTarget.uf_origem} → ${deactivateTarget.cidade_destino}/${deactivateTarget.uf_destino}`);
      setDeactivateTarget(null);
      await loadItems();
    } finally {
      setDeactivating(false);
    }
  };

  /* Preview do cálculo de procedimentos no drawer */
  const previewRota: RotaDeslocamento = {
    id: 0,
    cidade_origem: fCidadeOrigem,
    uf_origem: fUfOrigem,
    cidade_destino: fCidadeDestino,
    uf_destino: fUfDestino,
    distancia_milhas: fDistMilhas ? parseFloat(fDistMilhas) : undefined,
    distancia_km: fDistKm ? parseFloat(fDistKm) : undefined,
    distancia_milhas_nauticas: fDistMn ? parseFloat(fDistMn) : undefined,
    ativo: true,
  };
  const prevCalc = calcularProcedimentos(previewRota, fModal);

  const isFiltered = Boolean(search || filterModal);

  return (
    <>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold" style={{ color: 'var(--tfd-text-primary)' }}>
            Rotas de Deslocamento
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--tfd-text-muted)' }}>
            Cadastro de rotas com distâncias para cálculo automático SIGTAP
          </p>
        </div>
        <button className="tfd-btn tfd-btn-primary" onClick={handleNew}>
          <Plus size={16} />
          Nova Rota
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
            placeholder="Buscar por cidade de origem ou destino..."
            className="flex-1 bg-transparent outline-none text-[13px]"
          />
        </div>

        <select
          value={filterModal}
          onChange={(e) => setFilterModal(e.target.value)}
          style={{
            height: 36, padding: '0 12px',
            background: 'white', border: '1px solid var(--tfd-surface-border)',
            borderRadius: 8, fontSize: 13, color: '#1A1D2B',
          }}
        >
          <option value="">Todos os modais</option>
          <option value="aereo">Aéreo</option>
          <option value="terrestre">Terrestre</option>
          <option value="fluvial">Fluvial</option>
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
                <SortTh label="Origem" field="cidade_origem" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
                <Th align="center">{' '}</Th>
                <SortTh label="Destino" field="cidade_destino" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
                <SortTh label="Modal" field="modal" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
                <SortTh label="Distância" field="distancia" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} align="right" />
                <Th align="right">Ações</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <TableRowsSkeleton rows={6} columns={6} />
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center" style={{ color: '#9CA3AF' }}>
                    <div className="flex flex-col items-center gap-3">
                      <div
                        className="flex items-center justify-center w-14 h-14 rounded-2xl"
                        style={{ backgroundColor: 'var(--tfd-primary-50)' }}
                      >
                        <Package size={26} style={{ color: 'var(--tfd-primary-400)' }} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium mb-1" style={{ color: 'var(--tfd-text-primary)' }}>
                          {isFiltered ? 'Nenhuma rota para os filtros selecionados.' : 'Nenhuma rota cadastrada.'}
                        </p>
                        {!isFiltered && (
                          <p className="text-xs max-w-[280px]" style={{ color: 'var(--tfd-text-muted)' }}>
                            Cadastre rotas com distâncias para cálculo automático de procedimentos SIGTAP.
                          </p>
                        )}
                      </div>
                      {!isFiltered && (
                        <button className="tfd-btn tfd-btn-primary tfd-btn--sm" onClick={handleNew}>
                          <Plus size={14} /> Cadastrar primeira rota
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((item) => {
                  const modal = inferModal(item);
                  return (
                    <tr
                      key={item.id}
                      style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}
                      className="hover:bg-[#F8FAFC] transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <MapPin size={12} style={{ color: 'var(--tfd-primary-500)' }} />
                          <span className="font-medium" style={{ color: '#1A1D2B' }}>
                            {item.cidade_origem}/{item.uf_origem}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-3.5 text-center">
                        <ArrowRight size={12} style={{ color: '#9CA3AF' }} />
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-medium" style={{ color: '#1A1D2B' }}>
                          {item.cidade_destino}/{item.uf_destino}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className="tfd-tag tfd-tag--rounded text-[10px]"
                          style={{
                            backgroundColor:
                              modal === 'aereo'
                                ? 'var(--tfd-status-info-bg)'
                                : modal === 'terrestre'
                                  ? 'var(--tfd-surface-100)'
                                  : 'var(--tfd-status-warning-bg)',
                            color:
                              modal === 'aereo'
                                ? 'var(--tfd-status-info)'
                                : modal === 'terrestre'
                                  ? 'var(--tfd-text-secondary)'
                                  : 'var(--tfd-status-warning)',
                          }}
                        >
                          {MODAL_LABELS[modal]}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right" style={{ color: '#1A1D2B' }}>
                        {item.distancia_km != null ? (
                          <span>{item.distancia_km.toLocaleString('pt-BR')} km</span>
                        ) : item.distancia_milhas_nauticas != null ? (
                          <span>{item.distancia_milhas_nauticas.toLocaleString('pt-BR')} mn</span>
                        ) : item.distancia_milhas != null ? (
                          <span>{item.distancia_milhas.toLocaleString('pt-BR')} mi</span>
                        ) : (
                          <span style={{ color: 'var(--tfd-text-muted)' }}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          {!item.ativo && (
                            <span className="tfd-tag tfd-tag--rounded tfd-tag--dot tfd-tag--secondary text-[10px] mr-1">
                              Inativa
                            </span>
                          )}
                          <button
                            className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                            title="Editar"
                            onClick={() => handleEdit(item)}
                          >
                            <Pencil size={15} />
                          </button>
                          {item.ativo && (
                            <button
                              className="tfd-btn tfd-btn-danger tfd-btn--icon-only"
                              title="Desativar"
                              onClick={() => setDeactivateTarget(item)}
                            >
                              <Power size={15} />
                            </button>
                          )}
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
          recordLabel={`rota${filtered.length === 1 ? '' : 's'}${isFiltered ? ' (filtrado)' : ''}`}
        />
      </div>

      {/* Modal: Confirmar desativação */}
      <ConfirmDialog
        open={!!deactivateTarget}
        tone="delete"
        title="Desativar rota?"
        subject={deactivateTarget ? `${deactivateTarget.cidade_origem}/${deactivateTarget.uf_origem} → ${deactivateTarget.cidade_destino}/${deactivateTarget.uf_destino}` : undefined}
        description="A rota ficará inativa e não será usada no cálculo automático SIGTAP."
        confirmLabel="Desativar"
        busy={deactivating}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={confirmDeactivate}
      />

      {/* Modal: Confirmar criação / edição */}
      <ConfirmDialog
        open={!!saveConfirm}
        tone={saveConfirm?.tone ?? 'create'}
        title={editing ? 'Confirmar alterações na rota?' : 'Confirmar cadastro da rota?'}
        subject={fCidadeOrigem && fCidadeDestino ? `${fCidadeOrigem}/${fUfOrigem} → ${fCidadeDestino}/${fUfDestino}` : undefined}
        diff={saveConfirm?.diff}
        busy={saving}
        onClose={() => setSaveConfirm(null)}
        onConfirm={handleConfirmSave}
      />

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
            <button className="tfd-btn tfd-btn-primary" onClick={handleRequestSave} disabled={saving || !fCidadeOrigem || !fUfOrigem || !fCidadeDestino || !fUfDestino}>
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

        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Modal e Distância</h3>

        <FormField label="Modal de transporte" required>
          <select
            className="tfd-input"
            value={fModal}
            onChange={(e) => {
              setFModal(e.target.value as Modal);
              setFDistMilhas(''); setFDistKm(''); setFDistMn('');
            }}
          >
            <option value="aereo">Aéreo (milhas)</option>
            <option value="terrestre">Terrestre (km)</option>
            <option value="fluvial">Fluvial (milhas náuticas)</option>
          </select>
        </FormField>

        {(() => {
          const cfg =
            fModal === 'aereo'
              ? { label: 'Distância (milhas)', unidade: 'milhas', value: fDistMilhas, pr: 'pr-16' }
              : fModal === 'terrestre'
                ? { label: 'Distância (km)', unidade: 'km', value: fDistKm, pr: 'pr-10' }
                : { label: 'Distância (milhas náuticas)', unidade: 'mn', value: fDistMn, pr: 'pr-10' };
          const semCidades = !fCidadeOrigem || !fUfOrigem || !fCidadeDestino || !fUfDestino;
          const placeholder = semCidades
            ? 'Selecione origem e destino'
            : calculandoDist
              ? 'Calculando…'
              : '';
          return (
            <FormField label={cfg.label} required>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  className={`tfd-input ${cfg.pr}`}
                  placeholder={placeholder}
                  value={cfg.value}
                  style={{ backgroundColor: 'var(--tfd-surface-100)', cursor: 'not-allowed' }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium pointer-events-none" style={{ color: 'var(--tfd-text-muted)' }}>
                  {calculandoDist ? <Loader2 size={12} className="animate-spin" /> : cfg.unidade}
                </span>
              </div>
              <p className="text-[11px] mt-1" style={{ color: distErro ? 'var(--tfd-status-danger)' : 'var(--tfd-text-muted)' }}>
                {distErro
                  ? distErro
                  : 'Calculado automaticamente em linha reta a partir das coordenadas IBGE de origem e destino.'}
              </p>
            </FormField>
          );
        })()}

        {/* Preview de cálculo */}
        {prevCalc && (
          <>
            <hr className="tfd-divider" />
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--tfd-primary-50)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Route size={14} style={{ color: 'var(--tfd-primary-600)' }} />
                <p className="text-xs font-semibold" style={{ color: 'var(--tfd-primary-700)' }}>
                  Preview SIGTAP
                </p>
              </div>
              <p className="text-xs" style={{ color: 'var(--tfd-primary-600)' }}>
                {MODAL_LABELS[fModal]}: {prevCalc.distancia.toLocaleString('pt-BR')} {prevCalc.unidade} → {prevCalc.quantidade} procedimento{prevCalc.quantidade !== 1 ? 's' : ''}
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
