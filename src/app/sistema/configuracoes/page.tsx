'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  Users,
  Building2,
  MapPin,
  DollarSign,
  Plane,
  Stethoscope,
  Plus,
  Pencil,
  Trash2,
  Activity,
  FileText,
  XCircle,
  MessageSquare,
  Loader2,
  ChevronRight,
  Package,
  Megaphone,
  FileCode2,
  type LucideIcon,
} from 'lucide-react';
import SigtapPanel from './SigtapPanel';

import Cid10Panel from './Cid10Panel';
import Cid11Panel from './Cid11Panel';
import RelatorioFinanceiroPanel from './RelatorioFinanceiroPanel';

import PageHeader from '@/shared/components/page-header/PageHeader';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import { useToast } from '@/shared/components/toast/Toast';
import {
  listarPorCategoriaAdmin,
  criarItemAuxiliar,
  atualizarItemAuxiliar,
  excluirItemAuxiliar,
  listarCompanhiasAdmin,
  criarCompanhia,
  atualizarCompanhia,
  excluirCompanhia,
  type TabelaAuxiliar,
  type CompanhiaTransporte,
} from '@/services/tabelas-auxiliares.service';
import {
  listarRegioesAdmin,
  criarRegiao,
  atualizarRegiao,
  excluirRegiao,
} from '@/services/regioes.service';
import type { Regiao } from '@/core/models/regiao.model';
import { invalidateCache } from '@/shared/hooks/useLookup';
import { Skeleton } from '@/components/ui/skeleton';

/* -------------------------------------------------- */
/*  Tab config                                         */
/* -------------------------------------------------- */

type TabKey = 'tabelas' | 'cid10' | 'cid11' | 'sigtap' | 'financeiro';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'tabelas', label: 'Tabelas Auxiliares', icon: <Building2 size={16} /> },
  { key: 'cid10', label: 'CID-10', icon: <FileText size={16} /> },
  { key: 'cid11', label: 'CID-11', icon: <FileText size={16} /> },
  { key: 'sigtap', label: 'Códigos SIGTAP', icon: <FileCode2 size={16} /> },
  { key: 'financeiro', label: 'Relatório Financeiro', icon: <DollarSign size={16} /> },
];

/* -------------------------------------------------- */
/*  Cadastros mestres — categorias e seções            */
/* -------------------------------------------------- */

interface CategoriaConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  desc: string;
}

interface SecaoConfig {
  title: string;
  icon: LucideIcon;
  categorias: CategoriaConfig[];
}

const SECOES: SecaoConfig[] = [
  {
    title: 'Clínico',
    icon: Stethoscope,
    categorias: [
      { key: 'tipo_procedimento', label: 'Tipos de Procedimento', icon: Activity, desc: 'Consulta, cirurgia, exame, tratamento' },
      { key: 'tipo_documento', label: 'Tipos de Documento', icon: FileText, desc: 'Categorias de documentos aceitos no sistema' },
    ],
  },
  {
    title: 'Pacientes e Acompanhantes',
    icon: Users,
    categorias: [
      { key: 'vinculo_acompanhante', label: 'Vínculos de Acompanhante', icon: Users, desc: 'Tipos de vínculo com o paciente' },
    ],
  },
  {
    title: 'Transporte',
    icon: Plane,
    categorias: [
      { key: '_companhias', label: 'Companhias de Transporte', icon: Plane, desc: 'Empresas aéreas, rodoviárias e fluviais' },
    ],
  },
  {
    title: 'Financeiro e Permanência',
    icon: DollarSign,
    categorias: [
      { key: 'motivo_encerramento', label: 'Motivos de Encerramento', icon: XCircle, desc: 'Tipos de encerramento do processo' },
      { key: 'tipo_despesa', label: 'Tipos de Despesa', icon: DollarSign, desc: 'Categorias de despesa para adicionais' },
    ],
  },
  {
    title: 'Sistema e Acesso',
    icon: Settings,
    categorias: [
      { key: 'canal_comunicacao', label: 'Canais de Comunicação', icon: MessageSquare, desc: 'Canais de notificação ao paciente' },
      { key: '_regioes', label: 'Regiões do Maranhão', icon: MapPin, desc: 'Agrupamentos geográficos das regionais (Sul, Leste, Norte)' },
    ],
  },
];

// Flat list for lookups
const ALL_CATEGORIAS = SECOES.flatMap((s) => s.categorias);

/* -------------------------------------------------- */
/*  CadastrosPanel (Card-based layout by sections)     */
/* -------------------------------------------------- */

function CadastrosPanel() {
  const toast = useToast();

  /* ---- Active category drawer ---- */
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [items, setItems] = useState<TabelaAuxiliar[]>([]);
  const [companhias, setCompanhias] = useState<CompanhiaTransporte[]>([]);
  const [regioes, setRegioes] = useState<Regiao[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isCompanhias = activeKey === '_companhias';
  const isRegioes = activeKey === '_regioes';
  const isGeneric = activeKey != null && !isCompanhias && !isRegioes;
  const activeCat = ALL_CATEGORIAS.find((c) => c.key === activeKey);

  /* ---- Editing state ---- */
  const [editingItem, setEditingItem] = useState<TabelaAuxiliar | null>(null);
  const [editingCompanhia, setEditingCompanhia] = useState<CompanhiaTransporte | null>(null);
  const [editingRegiao, setEditingRegiao] = useState<Regiao | null>(null);

  /* ---- Form state — generic ---- */
  const [fNome, setFNome] = useState('');
  const [fDescricao, setFDescricao] = useState('');
  const [fAtivo, setFAtivo] = useState(true);

  /* ---- Inline form mode (list vs form in same drawer) ---- */
  const [formMode, setFormMode] = useState(false);

  /* ---- Counts per category ---- */
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Load all counts on mount
  useEffect(() => {
    const loadCounts = async () => {
      const newCounts: Record<string, number> = {};
      const genericKeys = ALL_CATEGORIAS
        .filter((c) => c.key !== '_companhias' && c.key !== '_regioes')
        .map((c) => c.key);
      const promises = genericKeys.map(async (key) => {
        const { data } = await listarPorCategoriaAdmin(key);
        newCounts[key] = data?.length ?? 0;
      });
      const [cRes, rRes] = await Promise.all([
        listarCompanhiasAdmin(),
        listarRegioesAdmin(),
        ...promises,
      ]);
      newCounts['_companhias'] = (cRes as { data: CompanhiaTransporte[] | null }).data?.length ?? 0;
      newCounts['_regioes'] = (rRes as { data: Regiao[] | null }).data?.length ?? 0;
      setCounts(newCounts);
    };
    loadCounts();
  }, []);

  /* ---- Load items for active category ---- */
  const loadItems = async (key: string) => {
    setLoading(true);
    setErrorMsg(null);
    if (key === '_companhias') {
      const { data, error } = await listarCompanhiasAdmin();
      if (error) setErrorMsg(error.message);
      setCompanhias((data as CompanhiaTransporte[]) ?? []);
    } else if (key === '_regioes') {
      const { data, error } = await listarRegioesAdmin();
      if (error) setErrorMsg(error.message);
      setRegioes((data as Regiao[]) ?? []);
    } else {
      const { data, error } = await listarPorCategoriaAdmin(key);
      if (error) setErrorMsg(error.message);
      setItems((data as TabelaAuxiliar[]) ?? []);
    }
    setLoading(false);
  };

  const handleOpenCategory = (key: string) => {
    setActiveKey(key);
    loadItems(key);
  };

  const handleCloseCategory = () => {
    setActiveKey(null);
    setItems([]);
    setCompanhias([]);
    setRegioes([]);
    setErrorMsg(null);
    setFormMode(false);
    resetForm();
  };

  // Update count when items change
  useEffect(() => {
    if (!activeKey) return;
    if (isCompanhias) setCounts((prev) => ({ ...prev, [activeKey]: companhias.length }));
    else if (isRegioes) setCounts((prev) => ({ ...prev, [activeKey]: regioes.length }));
    else setCounts((prev) => ({ ...prev, [activeKey]: items.length }));
  }, [items, companhias, regioes, activeKey, isCompanhias, isRegioes]);

  /* ---- Reset form ---- */
  const resetForm = () => {
    setFNome(''); setFDescricao(''); setFAtivo(true);
    setEditingItem(null); setEditingCompanhia(null); setEditingRegiao(null);
  };

  const handleNew = () => { resetForm(); setFormMode(true); };

  const handleEditGeneric = (item: TabelaAuxiliar) => {
    resetForm();
    setEditingItem(item);
    setFNome(item.nome);
    setFDescricao(item.descricao ?? ''); setFAtivo(item.ativo);
    setFormMode(true);
  };

  const handleEditCompanhia = (c: CompanhiaTransporte) => {
    resetForm();
    setEditingCompanhia(c);
    setFNome(c.nome); setFAtivo(c.ativo);
    setFormMode(true);
  };

  const handleEditRegiao = (r: Regiao) => {
    resetForm();
    setEditingRegiao(r);
    setFNome(r.nome); setFAtivo(r.ativo);
    setFormMode(true);
  };

  /* ---- Save ---- */
  const handleSave = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      let result: { error: { message: string } | null };

      if (isGeneric && activeKey) {
        const codigoAuto = fNome.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
        if (editingItem) {
          result = await atualizarItemAuxiliar(editingItem.id, {
            codigo: codigoAuto, nome: fNome, descricao: fDescricao || undefined, ativo: fAtivo,
          });
        } else {
          result = await criarItemAuxiliar({
            categoria: activeKey, codigo: codigoAuto, nome: fNome,
            descricao: fDescricao || undefined,
          });
        }
        if (result.error) { setErrorMsg(result.error.message); setSaving(false); return; }
        invalidateCache(activeKey);
      } else if (isRegioes) {
        if (editingRegiao) {
          result = await atualizarRegiao(editingRegiao.id, { nome: fNome, ativo: fAtivo });
        } else {
          result = await criarRegiao({ nome: fNome });
        }
        if (result.error) { setErrorMsg(result.error.message); setSaving(false); return; }
        invalidateCache('_regioes');
      } else {
        const payload = { nome: fNome, ativo: fAtivo };
        if (editingCompanhia) {
          result = await atualizarCompanhia(editingCompanhia.id, payload);
        } else {
          result = await criarCompanhia(payload);
        }
        if (result.error) { setErrorMsg(result.error.message); setSaving(false); return; }
        invalidateCache('_companhias');
      }

      const isEditing = !!(editingItem || editingCompanhia || editingRegiao);
      toast.success(isEditing ? 'Item atualizado!' : 'Item criado!', isEditing ? 'As alterações foram salvas.' : 'O novo registro foi salvo com sucesso.');
      resetForm();
      setFormMode(false);
      if (activeKey) await loadItems(activeKey);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Tente novamente.';
      setErrorMsg(`Erro de conexão: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  /* ---- Delete ---- */
  const handleDelete = async (
    type: 'generic' | 'companhia' | 'regiao',
    item: TabelaAuxiliar | CompanhiaTransporte | Regiao,
  ) => {
    const nome = item.nome ?? 'este item';
    if (!window.confirm(`Excluir "${nome}"? Esta ação não pode ser desfeita.`)) return;
    let error: { message: string } | null = null;
    if (type === 'generic') {
      const res = await excluirItemAuxiliar(item.id);
      error = res.error;
      if (!error && activeKey) invalidateCache(activeKey);
    } else if (type === 'companhia') {
      const res = await excluirCompanhia(item.id);
      error = res.error;
      if (!error) invalidateCache('_companhias');
    } else {
      const res = await excluirRegiao(item.id);
      error = res.error;
      if (!error) invalidateCache('_regioes');
    }
    if (error) { setErrorMsg(`Erro ao excluir: ${error.message}`); return; }
    toast.success('Item excluído!', 'O registro foi removido.');
    if (activeKey) await loadItems(activeKey);
  };

  /* ---- Drawer titles ---- */
  const formDrawerTitle = (() => {
    if (isCompanhias) return editingCompanhia ? 'Editar Companhia' : 'Nova Companhia';
    if (isRegioes) return editingRegiao ? 'Editar Região' : 'Nova Região';
    return editingItem ? 'Editar Item' : 'Novo Item';
  })();

  const formDrawerSubtitle = (() => {
    if (isCompanhias && editingCompanhia) return editingCompanhia.nome;
    if (isRegioes && editingRegiao) return editingRegiao.nome;
    if (isGeneric && editingItem) return editingItem.nome;
    return activeCat?.label ?? '';
  })();

  /* ---- Item list inside category drawer ---- */
  const currentItems = isCompanhias ? companhias : isRegioes ? regioes : items;
  const isEmpty = currentItems.length === 0 && !loading;

  const renderItemList = () => {
    if (loading) {
      return (
        <div className="py-2 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      );
    }

    if (isEmpty) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div
            className="flex items-center justify-center w-16 h-16 rounded-2xl"
            style={{ backgroundColor: 'var(--tfd-primary-50)' }}
          >
            <Package size={28} style={{ color: 'var(--tfd-primary-400)' }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--tfd-text-primary)' }}>
              Nenhum item cadastrado
            </p>
            <p className="text-xs max-w-[280px]" style={{ color: 'var(--tfd-text-muted)' }}>
              Adicione o primeiro item para que ele fique disponível nos formulários do sistema.
            </p>
          </div>
          <button className="tfd-btn tfd-btn-primary tfd-btn--sm" onClick={handleNew}>
            <Plus size={14} />
            Adicionar primeiro item
          </button>
        </div>
      );
    }

    if (isRegioes) {
      return (
        <div className="space-y-2">
          {regioes.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 p-3 rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--tfd-surface-50)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--tfd-surface-100)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--tfd-surface-50)'; }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{r.nome}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {!r.ativo && (
                  <span className="tfd-tag tfd-tag--rounded tfd-tag--dot tfd-tag--secondary text-[10px]">Inativo</span>
                )}
                <button className="tfd-btn tfd-btn-ghost tfd-btn--sm tfd-btn--icon-only" title="Editar" style={{ color: 'var(--tfd-primary-500)' }} onClick={() => handleEditRegiao(r)}>
                  <Pencil size={14} />
                </button>
                <button className="tfd-btn tfd-btn-ghost tfd-btn--sm tfd-btn--icon-only" title="Excluir" style={{ color: 'var(--tfd-status-danger)' }} onClick={() => handleDelete('regiao', r)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (isCompanhias) {
      return (
        <div className="space-y-2">
          {companhias.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-3 p-3 rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--tfd-surface-50)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--tfd-surface-100)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--tfd-surface-50)'; }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{c.nome}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {!c.ativo && (
                  <span className="tfd-tag tfd-tag--rounded tfd-tag--dot tfd-tag--secondary text-[10px]">Inativo</span>
                )}
                <button className="tfd-btn tfd-btn-ghost tfd-btn--sm tfd-btn--icon-only" title="Editar" style={{ color: 'var(--tfd-primary-500)' }} onClick={() => handleEditCompanhia(c)}>
                  <Pencil size={14} />
                </button>
                <button className="tfd-btn tfd-btn-ghost tfd-btn--sm tfd-btn--icon-only" title="Excluir" style={{ color: 'var(--tfd-status-danger)' }} onClick={() => handleDelete('companhia', c)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Generic items
    return (
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 p-3 rounded-lg transition-colors"
            style={{ backgroundColor: 'var(--tfd-surface-50)' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--tfd-surface-100)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--tfd-surface-50)'; }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{item.nome}</p>
              {item.descricao && (
                <p className="text-xs mt-0.5" style={{ color: 'var(--tfd-text-muted)' }}>{item.descricao}</p>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {!item.ativo && (
                <span className="tfd-tag tfd-tag--rounded tfd-tag--dot tfd-tag--secondary text-[10px]">Inativo</span>
              )}
              <button className="tfd-btn tfd-btn-ghost tfd-btn--sm tfd-btn--icon-only" title="Editar" style={{ color: 'var(--tfd-primary-500)' }} onClick={() => handleEditGeneric(item)}>
                <Pencil size={14} />
              </button>
              <button className="tfd-btn tfd-btn-ghost tfd-btn--sm tfd-btn--icon-only" title="Excluir" style={{ color: 'var(--tfd-status-danger)' }} onClick={() => handleDelete('generic', item)}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  /* ---- Form renderers (same as before) ---- */
  const renderGenericForm = () => (
    <div>
      <FormField label="Nome" required>
        <input type="text" className="tfd-input" placeholder="Nome do item" value={fNome} onChange={(e) => setFNome(e.target.value)} />
      </FormField>
      <FormField label="Descrição">
        <textarea className="tfd-input" rows={3} placeholder="Descrição opcional" value={fDescricao} onChange={(e) => setFDescricao(e.target.value)} />
      </FormField>
      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={fAtivo} onChange={(e) => setFAtivo(e.target.checked)} className="w-4 h-4 rounded" style={{ accentColor: 'var(--tfd-primary-600)' }} />
          <span className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>Item ativo</span>
        </label>
      </div>
    </div>
  );

  const renderRegiaoForm = () => (
    <div>
      <FormField label="Nome" required>
        <input type="text" className="tfd-input" placeholder="Ex: Sul, Leste, Norte" value={fNome} onChange={(e) => setFNome(e.target.value)} />
      </FormField>
      {editingRegiao && (
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={fAtivo} onChange={(e) => setFAtivo(e.target.checked)} className="w-4 h-4 rounded" style={{ accentColor: 'var(--tfd-primary-600)' }} />
            <span className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>Região ativa</span>
          </label>
        </div>
      )}
    </div>
  );

  const renderCompanhiaForm = () => (
    <div>
      <FormField label="Nome" required>
        <input type="text" className="tfd-input" placeholder="Nome da companhia" value={fNome} onChange={(e) => setFNome(e.target.value)} />
      </FormField>
      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={fAtivo} onChange={(e) => setFAtivo(e.target.checked)} className="w-4 h-4 rounded" style={{ accentColor: 'var(--tfd-primary-600)' }} />
          <span className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>Companhia ativa</span>
        </label>
      </div>
    </div>
  );

  return (
    <>
      {/* ===== Card grid by sections ===== */}
      <div className="space-y-8">
        {SECOES.map((secao) => {
          const SecaoIcon = secao.icon;
          return (
            <div key={secao.title}>
              <div className="flex items-center gap-2 mb-4">
                <SecaoIcon size={16} style={{ color: 'var(--tfd-text-muted)' }} />
                <h3
                  className="text-[11px] font-semibold tracking-[0.08em] uppercase"
                  style={{ color: 'var(--tfd-text-muted)' }}
                >
                  {secao.title}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {secao.categorias.map((cat) => {
                  const CatIcon = cat.icon;
                  const count = counts[cat.key];
                  return (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => handleOpenCategory(cat.key)}
                      className="flex items-center gap-3 p-4 rounded-xl text-left transition-all duration-150 group"
                      style={{
                        backgroundColor: 'var(--tfd-surface-card)',
                        border: '1px solid var(--tfd-surface-border)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--tfd-primary-200)';
                        e.currentTarget.style.backgroundColor = 'var(--tfd-primary-50)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--tfd-surface-border)';
                        e.currentTarget.style.backgroundColor = 'var(--tfd-surface-card)';
                      }}
                    >
                      <div
                        className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0 transition-colors"
                        style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}
                      >
                        <CatIcon size={20} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--tfd-text-primary)' }}>
                            {cat.label}
                          </p>
                          {count !== undefined && (
                            <span
                              className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                              style={{
                                backgroundColor: 'var(--tfd-surface-100)',
                                color: 'var(--tfd-text-muted)',
                                minWidth: '20px',
                                textAlign: 'center',
                              }}
                            >
                              {count}
                            </span>
                          )}
                        </div>
                        <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--tfd-text-muted)' }}>
                          {cat.desc}
                        </p>
                      </div>

                      <ChevronRight
                        size={16}
                        className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: 'var(--tfd-primary-400)' }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== Single drawer: list ↔ form ===== */}
      <Drawer
        open={activeKey !== null}
        onClose={handleCloseCategory}
        title={formMode ? formDrawerTitle : (activeCat?.label ?? '')}
        subtitle={formMode ? formDrawerSubtitle : activeCat?.desc}
        width="480px"
        footer={
          formMode ? (
            <>
              <button className="tfd-btn tfd-btn-secondary" onClick={() => { setFormMode(false); resetForm(); }}>
                Voltar
              </button>
              <button className="tfd-btn tfd-btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <><Loader2 size={14} className="animate-spin" /> Salvando...</>
                ) : (
                  editingItem || editingCompanhia || editingRegiao ? 'Salvar Alterações' : 'Criar'
                )}
              </button>
            </>
          ) : !isEmpty ? (
            <button className="tfd-btn tfd-btn-primary w-full" onClick={handleNew}>
              <Plus size={14} />
              Novo Item
            </button>
          ) : undefined
        }
      >
        {errorMsg && (
          <div className="p-3 rounded-lg flex items-start gap-2 mb-4" style={{ backgroundColor: 'var(--tfd-status-danger-bg)', color: 'var(--tfd-status-danger)' }}>
            <span className="shrink-0 mt-0.5">&#9888;</span>
            <p className="text-sm">{errorMsg}</p>
          </div>
        )}

        {formMode ? (
          <>
            {isGeneric && renderGenericForm()}
            {isCompanhias && renderCompanhiaForm()}
            {isRegioes && renderRegiaoForm()}
          </>
        ) : (
          renderItemList()
        )}
      </Drawer>
    </>
  );
}

/* -------------------------------------------------- */
/*  Main Component                                     */
/* -------------------------------------------------- */

export default function SistemaConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('tabelas');

  return (
    <>
      <PageHeader
        title="Configurações"
        subtitle="Gerencie as tabelas auxiliares do sistema"
      />

      {/* ========== Tab Navigation ========== */}
      <div
        className="flex items-center gap-1 mb-6 pb-3 overflow-x-auto"
        style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap relative"
              style={{
                color: isActive ? 'var(--tfd-primary-600)' : 'var(--tfd-text-secondary)',
                transition: 'color 0.2s ease-in-out',
              }}
            >
              {tab.icon}
              {tab.label}
              {isActive && (
                <span
                  className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
                  style={{ backgroundColor: 'var(--tfd-primary-500)', bottom: '-13px' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* ========== Tab Panels ========== */}
      {activeTab === 'tabelas' && <CadastrosPanel />}
      {activeTab === 'cid10' && <Cid10Panel />}
        {activeTab === 'cid11' && <Cid11Panel />}
      {activeTab === 'sigtap' && <SigtapPanel />}
      {activeTab === 'financeiro' && <RelatorioFinanceiroPanel />}
    </>
  );
}
