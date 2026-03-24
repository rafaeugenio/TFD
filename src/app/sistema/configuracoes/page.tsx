'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  Users,
  Building2,
  Sliders,
  MapPin,
  Shield,
  Clock,
  DollarSign,
  Plane,
  Stethoscope,
  Plus,
  Pencil,
  Trash2,
  Activity,
  FileText,
  CalendarClock,
  XCircle,
  MessageSquare,
  Loader2,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import {
  listarPorCategoriaAdmin,
  criarItemAuxiliar,
  atualizarItemAuxiliar,
  excluirItemAuxiliar,
  listarUnidadesDestinoAdmin,
  criarUnidadeDestino,
  atualizarUnidadeDestino,
  excluirUnidadeDestino,
  listarCompanhiasAdmin,
  criarCompanhia,
  atualizarCompanhia,
  excluirCompanhia,
  type TabelaAuxiliar,
  type UnidadeDestino,
  type CompanhiaTransporte,
} from '@/services/tabelas-auxiliares.service';
import { useLookup, invalidateCache } from '@/shared/hooks/useLookup';

/* -------------------------------------------------- */
/*  Tab config                                         */
/* -------------------------------------------------- */

type TabKey = 'tabelas' | 'parametros';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'tabelas', label: 'Tabelas Auxiliares', icon: <Building2 size={16} /> },
  { key: 'parametros', label: 'Parâmetros do Sistema', icon: <Sliders size={16} /> },
];

/* -------------------------------------------------- */
/*  Parameter types                                    */
/* -------------------------------------------------- */

// Icons by grupo
const GRUPO_ICONS: Record<string, React.ReactNode> = {
  diarias: <DollarSign size={16} />,
  transporte: <Plane size={16} />,
  sla: <Clock size={16} />,
};

const GRUPO_LABELS: Record<string, string> = {
  diarias: 'Diárias e Ajuda de Custo',
  transporte: 'Transporte',
  sla: 'Prazos e SLA',
};

const TIPO_SUFIXOS: Record<string, string> = {
  moeda: '',
  dias: ' dias',
  horas: 'h',
  km: ' km',
  booleano: '',
  texto: '',
  numero: '',
};

/* -------------------------------------------------- */
/*  Cadastros mestres — categorias                     */
/* -------------------------------------------------- */

interface CategoriaConfig {
  key: string;
  label: string;
  icon: React.ReactNode;
  desc: string;
}

const CATEGORIAS: CategoriaConfig[] = [
  { key: 'especialidade', label: 'Especialidades Médicas', icon: <Stethoscope size={16} />, desc: 'Especialidades para encaminhamento TFD' },
  { key: 'tipo_procedimento', label: 'Tipos de Procedimento', icon: <Activity size={16} />, desc: 'Consulta, cirurgia, exame, tratamento' },
  { key: 'cid10', label: 'CIDs Frequentes', icon: <FileText size={16} />, desc: 'Códigos CID-10 mais utilizados' },
  { key: 'vinculo_acompanhante', label: 'Vínculos de Acompanhante', icon: <Users size={16} />, desc: 'Tipos de vínculo com o paciente' },
  { key: 'motivo_permanencia', label: 'Motivos de Permanência', icon: <CalendarClock size={16} />, desc: 'Razões para extensão de estada' },
  { key: 'motivo_encerramento', label: 'Motivos de Encerramento', icon: <XCircle size={16} />, desc: 'Tipos de encerramento do processo' },
  { key: 'canal_comunicacao', label: 'Canais de Comunicação', icon: <MessageSquare size={16} />, desc: 'Canais de notificação ao paciente' },
  { key: 'modal_transporte', label: 'Modais de Transporte', icon: <Plane size={16} />, desc: 'Tipos de transporte disponíveis' },
  { key: 'origem_agendamento', label: 'Origens de Agendamento', icon: <MapPin size={16} />, desc: 'Como o agendamento foi obtido' },
  { key: 'perfil_usuario', label: 'Perfis de Usuário', icon: <Shield size={16} />, desc: 'Funções e permissões' },
  { key: 'regional', label: 'Regionais', icon: <Building2 size={16} />, desc: 'Regionais de saúde do estado' },
  { key: '_unidades_destino', label: 'Unidades de Destino', icon: <Building2 size={16} />, desc: 'Hospitais e clínicas de referência' },
  { key: '_companhias', label: 'Companhias de Transporte', icon: <Plane size={16} />, desc: 'Empresas aéreas e rodoviárias' },
];

/* -------------------------------------------------- */
/*  ParametrosPanel                                    */
/* -------------------------------------------------- */

function ParametrosPanel() {
  const [parametros, setParametros] = useState<import('@/services/parametros.service').Parametro[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingParam, setEditingParam] = useState<import('@/services/parametros.service').Parametro | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  // For "Novo Parâmetro"
  const [newGrupo, setNewGrupo] = useState('diarias');
  const [newChave, setNewChave] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newValor, setNewValor] = useState('');
  const [newTipo, setNewTipo] = useState('texto');
  const [newDescricao, setNewDescricao] = useState('');
  const [addDrawerOpen, setAddDrawerOpen] = useState(false);

  const loadParametros = async () => {
    setLoading(true);
    const { listarParametros } = await import('@/services/parametros.service');
    const { data } = await listarParametros();
    if (data) setParametros(data as unknown as import('@/services/parametros.service').Parametro[]);
    setLoading(false);
  };

  useEffect(() => { loadParametros(); }, []);

  const handleEdit = (param: import('@/services/parametros.service').Parametro) => {
    setEditingParam(param);
    setEditValue(param.valor);
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!editingParam) return;
    setSaving(true);
    const { atualizarParametro } = await import('@/services/parametros.service');
    const { invalidateParametrosCache } = await import('@/shared/hooks/useParametros');
    await atualizarParametro(editingParam.id, editValue);
    invalidateParametrosCache();
    setSaving(false);
    setDrawerOpen(false);
    setEditingParam(null);
    await loadParametros();
  };

  const handleAddNew = async () => {
    if (!newChave || !newLabel || !newValor) return;
    setSaving(true);
    const { criarParametro } = await import('@/services/parametros.service');
    const { invalidateParametrosCache } = await import('@/shared/hooks/useParametros');
    await criarParametro({
      grupo: newGrupo,
      chave: newChave,
      valor: newValor,
      tipo: newTipo,
      label: newLabel,
      descricao: newDescricao || undefined,
      ordem: parametros.filter(p => p.grupo === newGrupo).length + 1,
    });
    invalidateParametrosCache();
    setSaving(false);
    setAddDrawerOpen(false);
    setNewChave(''); setNewLabel(''); setNewValor(''); setNewDescricao('');
    await loadParametros();
  };

  const handleDelete = async (param: import('@/services/parametros.service').Parametro) => {
    if (!window.confirm(`Excluir o parâmetro "${param.label}"?`)) return;
    const { excluirParametro } = await import('@/services/parametros.service');
    const { invalidateParametrosCache } = await import('@/shared/hooks/useParametros');
    await excluirParametro(param.id);
    invalidateParametrosCache();
    await loadParametros();
  };

  const formatDisplayValue = (param: import('@/services/parametros.service').Parametro) => {
    if (param.tipo === 'moeda') return `R$ ${parseFloat(param.valor).toFixed(2).replace('.', ',')}`;
    if (param.tipo === 'booleano') return param.valor === 'true' ? 'Sim' : 'Não';
    const sufixo = TIPO_SUFIXOS[param.tipo] ?? '';
    return `${param.valor}${sufixo}`;
  };

  // Group parametros
  const grupos = ['diarias', 'transporte', 'sla'];
  const byGrupo = (g: string) => parametros.filter((p) => p.grupo === g);
  // Custom groups (user-created)
  const customGrupos = [...new Set(parametros.map(p => p.grupo))].filter(g => !grupos.includes(g));

  return (
    <>
      <div className="tfd-card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
            Parâmetros do Sistema
          </h2>
          <div className="flex items-center gap-2">
            <span className="tfd-tag tfd-tag--rounded tfd-tag--info">
              Somente Administradores
            </span>
            <button className="tfd-btn tfd-btn-primary tfd-btn--sm" onClick={() => setAddDrawerOpen(true)}>
              <Plus size={14} /> Novo Parâmetro
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--tfd-text-muted)' }} />
          </div>
        ) : (
          <>
            {[...grupos, ...customGrupos].map((grupo, idx) => {
              const items = byGrupo(grupo);
              if (items.length === 0) return null;
              return (
                <div key={grupo}>
                  {idx > 0 && <hr className="tfd-divider" />}
                  <div className="mb-6">
                    <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
                      {GRUPO_LABELS[grupo] ?? grupo}
                    </h3>
                    <div className="space-y-2">
                      {items.map((param) => (
                        <div
                          key={param.id}
                          className="flex items-center justify-between gap-4 p-3 rounded-lg"
                          style={{ backgroundColor: 'var(--tfd-surface-50)' }}
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span style={{ color: 'var(--tfd-text-muted)' }}>
                              {GRUPO_ICONS[param.grupo] ?? <Settings size={16} />}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                                {param.label}
                              </p>
                              {param.descricao && (
                                <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                                  {param.descricao}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className="text-sm font-semibold px-3 py-1 rounded-md"
                              style={{
                                backgroundColor: param.tipo === 'booleano'
                                  ? (param.valor === 'true' ? 'var(--tfd-status-success-bg)' : 'var(--tfd-status-danger-bg)')
                                  : 'var(--tfd-primary-50)',
                                color: param.tipo === 'booleano'
                                  ? (param.valor === 'true' ? 'var(--tfd-status-success)' : 'var(--tfd-status-danger)')
                                  : 'var(--tfd-primary-700)',
                              }}
                            >
                              {formatDisplayValue(param)}
                            </span>
                            {param.editavel && (
                              <button
                                className="tfd-btn tfd-btn--text tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only"
                                title="Editar"
                                onClick={() => handleEdit(param)}
                              >
                                <Pencil size={14} />
                              </button>
                            )}
                            <button
                              className="tfd-btn tfd-btn--text tfd-btn-danger tfd-btn--sm tfd-btn--icon-only"
                              title="Excluir"
                              onClick={() => handleDelete(param)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Drawer: Editar Parâmetro */}
      <Drawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setEditingParam(null); }}
        title="Editar Parâmetro"
        subtitle={editingParam?.label}
        width="420px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={() => { setDrawerOpen(false); setEditingParam(null); }}>
              Cancelar
            </button>
            <button className="tfd-btn tfd-btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </>
        }
      >
        {editingParam && (
          <>
            <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--tfd-surface-50)' }}>
              <p className="text-xs font-medium" style={{ color: 'var(--tfd-text-muted)' }}>Chave</p>
              <p className="text-sm font-mono" style={{ color: 'var(--tfd-text-primary)' }}>{editingParam.chave}</p>
            </div>

            {editingParam.descricao && (
              <div className="tfd-message tfd-message--info mb-4">
                <span className="tfd-message-icon mt-0.5 shrink-0" style={{ color: 'var(--tfd-status-info)' }}>
                  <Settings size={14} />
                </span>
                <p className="text-sm">{editingParam.descricao}</p>
              </div>
            )}

            <FormField label="Valor" required>
              {editingParam.tipo === 'booleano' ? (
                <div className="flex items-center gap-3 mt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paramBool"
                      checked={editValue === 'true'}
                      onChange={() => setEditValue('true')}
                      style={{ accentColor: 'var(--tfd-primary-500)' }}
                    />
                    <span className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>Sim</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paramBool"
                      checked={editValue === 'false'}
                      onChange={() => setEditValue('false')}
                      style={{ accentColor: 'var(--tfd-primary-500)' }}
                    />
                    <span className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>Não</span>
                  </label>
                </div>
              ) : editingParam.tipo === 'moeda' ? (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--tfd-text-muted)' }}>R$</span>
                  <input
                    type="number"
                    step="0.01"
                    className="tfd-input pl-10"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                  />
                </div>
              ) : ['numero', 'dias', 'horas', 'km'].includes(editingParam.tipo) ? (
                <div className="relative">
                  <input
                    type="number"
                    className="tfd-input"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                  />
                  {TIPO_SUFIXOS[editingParam.tipo] && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                      {TIPO_SUFIXOS[editingParam.tipo]?.trim()}
                    </span>
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  className="tfd-input"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                />
              )}
            </FormField>

            <p className="text-xs mt-2" style={{ color: 'var(--tfd-text-muted)' }}>
              Tipo: <strong>{editingParam.tipo}</strong> · Grupo: <strong>{GRUPO_LABELS[editingParam.grupo] ?? editingParam.grupo}</strong>
            </p>
          </>
        )}
      </Drawer>

      {/* Drawer: Novo Parâmetro */}
      <Drawer
        open={addDrawerOpen}
        onClose={() => setAddDrawerOpen(false)}
        title="Novo Parâmetro"
        subtitle="Adicionar parâmetro ao sistema"
        width="420px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={() => setAddDrawerOpen(false)}>
              Cancelar
            </button>
            <button className="tfd-btn tfd-btn-primary" onClick={handleAddNew} disabled={saving || !newChave || !newLabel || !newValor}>
              {saving ? 'Salvando...' : 'Criar Parâmetro'}
            </button>
          </>
        }
      >
        <FormField label="Grupo" required>
          <select className="tfd-input" value={newGrupo} onChange={(e) => setNewGrupo(e.target.value)}>
            <option value="diarias">Diárias e Ajuda de Custo</option>
            <option value="transporte">Transporte</option>
            <option value="sla">Prazos e SLA</option>
            <option value="custom">Outro (personalizado)</option>
          </select>
        </FormField>
        {newGrupo === 'custom' && (
          <FormField label="Nome do grupo" required>
            <input type="text" className="tfd-input" placeholder="ex: financeiro" value={newGrupo === 'custom' ? '' : newGrupo} onChange={(e) => setNewGrupo(e.target.value)} />
          </FormField>
        )}
        <FormField label="Chave (identificador único)" required>
          <input type="text" className="tfd-input" placeholder="ex: valor_taxa_embarque" value={newChave} onChange={(e) => setNewChave(e.target.value)} />
        </FormField>
        <FormField label="Nome de exibição" required>
          <input type="text" className="tfd-input" placeholder="ex: Taxa de embarque" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
        </FormField>
        <FormField label="Tipo de valor" required>
          <select className="tfd-input" value={newTipo} onChange={(e) => setNewTipo(e.target.value)}>
            <option value="texto">Texto</option>
            <option value="numero">Número</option>
            <option value="moeda">Moeda (R$)</option>
            <option value="dias">Dias</option>
            <option value="horas">Horas</option>
            <option value="km">Quilômetros</option>
            <option value="booleano">Sim/Não</option>
          </select>
        </FormField>
        <FormField label="Valor" required>
          {newTipo === 'booleano' ? (
            <select className="tfd-input" value={newValor} onChange={(e) => setNewValor(e.target.value)}>
              <option value="">Selecione...</option>
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </select>
          ) : (
            <input
              type={['numero', 'moeda', 'dias', 'horas', 'km'].includes(newTipo) ? 'number' : 'text'}
              step={newTipo === 'moeda' ? '0.01' : undefined}
              className="tfd-input"
              value={newValor}
              onChange={(e) => setNewValor(e.target.value)}
            />
          )}
        </FormField>
        <FormField label="Descrição (opcional)">
          <textarea className="tfd-input" rows={2} value={newDescricao} onChange={(e) => setNewDescricao(e.target.value)} placeholder="Explicação sobre o parâmetro..." />
        </FormField>
      </Drawer>
    </>
  );
}

/* -------------------------------------------------- */
/*  CadastrosPanel (Tabelas Auxiliares)                */
/* -------------------------------------------------- */

function CadastrosPanel() {
  const [selectedKey, setSelectedKey] = useState(CATEGORIAS[0].key);
  const [items, setItems] = useState<TabelaAuxiliar[]>([]);
  const [unidades, setUnidades] = useState<UnidadeDestino[]>([]);
  const [companhias, setCompanhias] = useState<CompanhiaTransporte[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Editing state — null = creating new
  const [editingItem, setEditingItem] = useState<TabelaAuxiliar | null>(null);
  const [editingUnidade, setEditingUnidade] = useState<UnidadeDestino | null>(null);
  const [editingCompanhia, setEditingCompanhia] = useState<CompanhiaTransporte | null>(null);

  // Counts per category (for sidebar badges)
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Form state — generic
  const [fCodigo, setFCodigo] = useState('');
  const [fNome, setFNome] = useState('');
  const [fDescricao, setFDescricao] = useState('');
  const [fOrdem, setFOrdem] = useState(0);
  const [fAtivo, setFAtivo] = useState(true);

  // Form state — unidade destino
  const [fUCnes, setFUCnes] = useState('');
  const [fUCidade, setFUCidade] = useState('');
  const [fUUf, setFUUf] = useState('');
  const [fUTipo, setFUTipo] = useState('');
  const [fUContatoNome, setFUContatoNome] = useState('');
  const [fUContatoTel, setFUContatoTel] = useState('');
  const [fUContatoEmail, setFUContatoEmail] = useState('');
  const [fUEndereco, setFUEndereco] = useState('');

  // Form state — companhia
  const [fCModal, setFCModal] = useState('Aéreo');
  const [fCCnpj, setFCCnpj] = useState('');
  const [fCContato, setFCContato] = useState('');

  const selected = CATEGORIAS.find((c) => c.key === selectedKey) ?? CATEGORIAS[0];
  const isUnidades = selectedKey === '_unidades_destino';
  const isCompanhias = selectedKey === '_companhias';
  const isGeneric = !isUnidades && !isCompanhias;

  // ---- Load data when category changes ----
  const loadItems = async (key: string) => {
    setLoading(true);
    setErrorMsg(null);
    if (key === '_unidades_destino') {
      const { data, error } = await listarUnidadesDestinoAdmin();
      if (error) { console.error('Supabase error:', error); setErrorMsg(error.message); }
      setUnidades((data as UnidadeDestino[]) ?? []);
    } else if (key === '_companhias') {
      const { data, error } = await listarCompanhiasAdmin();
      if (error) { console.error('Supabase error:', error); setErrorMsg(error.message); }
      setCompanhias((data as CompanhiaTransporte[]) ?? []);
    } else {
      const { data, error } = await listarPorCategoriaAdmin(key);
      if (error) { console.error('Supabase error:', error); setErrorMsg(error.message); }
      setItems((data as TabelaAuxiliar[]) ?? []);
    }
    setLoading(false);
  };

  // Load on mount and category change
  useEffect(() => {
    loadItems(selectedKey);
  }, [selectedKey]);

  // Load all counts on mount
  useEffect(() => {
    const loadCounts = async () => {
      const newCounts: Record<string, number> = {};
      // Load generic category counts in parallel
      const genericKeys = CATEGORIAS.filter((c) => c.key !== '_unidades_destino' && c.key !== '_companhias').map((c) => c.key);
      const promises = genericKeys.map(async (key) => {
        const { data } = await listarPorCategoriaAdmin(key);
        newCounts[key] = data?.length ?? 0;
      });
      const [uRes, cRes] = await Promise.all([
        listarUnidadesDestinoAdmin(),
        listarCompanhiasAdmin(),
        ...promises,
      ]);
      newCounts['_unidades_destino'] = (uRes as { data: UnidadeDestino[] | null }).data?.length ?? 0;
      newCounts['_companhias'] = (cRes as { data: CompanhiaTransporte[] | null }).data?.length ?? 0;
      setCounts(newCounts);
    };
    loadCounts();
  }, []);

  // Update count for the active category when items change
  useEffect(() => {
    if (isUnidades) setCounts((prev) => ({ ...prev, [selectedKey]: unidades.length }));
    else if (isCompanhias) setCounts((prev) => ({ ...prev, [selectedKey]: companhias.length }));
    else setCounts((prev) => ({ ...prev, [selectedKey]: items.length }));
  }, [items, unidades, companhias, selectedKey, isUnidades, isCompanhias]);

  // ---- Reset form ----
  const resetForm = () => {
    setFCodigo(''); setFNome(''); setFDescricao(''); setFOrdem(0); setFAtivo(true);
    setFUCnes(''); setFUCidade(''); setFUUf(''); setFUTipo('');
    setFUContatoNome(''); setFUContatoTel(''); setFUContatoEmail(''); setFUEndereco('');
    setFCModal('Aéreo'); setFCCnpj(''); setFCContato('');
    setEditingItem(null); setEditingUnidade(null); setEditingCompanhia(null);
  };

  // ---- Open drawer for new ----
  const handleNew = () => {
    resetForm();
    setDrawerOpen(true);
  };

  // ---- Open drawer for edit ----
  const handleEditGeneric = (item: TabelaAuxiliar) => {
    resetForm();
    setEditingItem(item);
    setFCodigo(item.codigo); setFNome(item.nome);
    setFDescricao(item.descricao ?? ''); setFOrdem(item.ordem); setFAtivo(item.ativo);
    setDrawerOpen(true);
  };

  const handleEditUnidade = (u: UnidadeDestino) => {
    resetForm();
    setEditingUnidade(u);
    setFNome(u.nome); setFUCnes(u.cnes ?? ''); setFUCidade(u.cidade); setFUUf(u.uf);
    setFUTipo(u.tipo ?? ''); setFUContatoNome(u.contato_nome ?? '');
    setFUContatoTel(u.contato_telefone ?? ''); setFUContatoEmail(u.contato_email ?? '');
    setFUEndereco(u.endereco ?? ''); setFAtivo(u.ativo);
    setDrawerOpen(true);
  };

  const handleEditCompanhia = (c: CompanhiaTransporte) => {
    resetForm();
    setEditingCompanhia(c);
    setFNome(c.nome); setFCModal(c.tipo_modal); setFCCnpj(c.cnpj ?? '');
    setFCContato(c.contato ?? ''); setFAtivo(c.ativo);
    setDrawerOpen(true);
  };

  // ---- Save ----
  const handleSave = async () => {
    setSaving(true);
    setErrorMsg(null);
    try {
      let result: { error: { message: string } | null };

      if (isGeneric) {
        if (editingItem) {
          result = await atualizarItemAuxiliar(editingItem.id, {
            codigo: fCodigo, nome: fNome, descricao: fDescricao || undefined, ordem: fOrdem, ativo: fAtivo,
          });
        } else {
          result = await criarItemAuxiliar({
            categoria: selectedKey, codigo: fCodigo, nome: fNome,
            descricao: fDescricao || undefined, ordem: fOrdem,
          });
        }
        if (result.error) {
          setErrorMsg(`Erro ao salvar: ${result.error.message}`);
          setSaving(false);
          return;
        }
        invalidateCache(selectedKey);
      } else if (isUnidades) {
        const payload = {
          nome: fNome, cnes: fUCnes || null, cidade: fUCidade, uf: fUUf,
          tipo: fUTipo || null, contato_nome: fUContatoNome || null,
          contato_telefone: fUContatoTel || null, contato_email: fUContatoEmail || null,
          endereco: fUEndereco || null, ativo: fAtivo,
        };
        if (editingUnidade) {
          result = await atualizarUnidadeDestino(editingUnidade.id, payload);
        } else {
          result = await criarUnidadeDestino(payload);
        }
        if (result.error) {
          setErrorMsg(`Erro ao salvar: ${result.error.message}`);
          setSaving(false);
          return;
        }
        invalidateCache('_unidades_destino');
      } else {
        const payload = {
          nome: fNome, tipo_modal: fCModal as import('@/lib/supabase/database.types').ModalTransporte,
          cnpj: fCCnpj || null, contato: fCContato || null, ativo: fAtivo,
        };
        if (editingCompanhia) {
          result = await atualizarCompanhia(editingCompanhia.id, payload);
        } else {
          result = await criarCompanhia(payload);
        }
        if (result.error) {
          setErrorMsg(`Erro ao salvar: ${result.error.message}`);
          setSaving(false);
          return;
        }
        invalidateCache('_companhias');
      }
      setDrawerOpen(false);
      resetForm();
      await loadItems(selectedKey);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Tente novamente.';
      setErrorMsg(`Erro de conexão: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  // ---- Delete ----
  const handleDeleteGeneric = async (item: TabelaAuxiliar) => {
    if (!window.confirm(`Excluir "${item.nome}"? Esta ação não pode ser desfeita.`)) return;
    const { error } = await excluirItemAuxiliar(item.id);
    if (error) { setErrorMsg(`Erro ao excluir: ${error.message}`); return; }
    invalidateCache(selectedKey);
    await loadItems(selectedKey);
  };

  const handleDeleteUnidade = async (u: UnidadeDestino) => {
    if (!window.confirm(`Excluir "${u.nome}"? Esta ação não pode ser desfeita.`)) return;
    const { error } = await excluirUnidadeDestino(u.id);
    if (error) { setErrorMsg(`Erro ao excluir: ${error.message}`); return; }
    invalidateCache('_unidades_destino');
    await loadItems(selectedKey);
  };

  const handleDeleteCompanhia = async (c: CompanhiaTransporte) => {
    if (!window.confirm(`Excluir "${c.nome}"? Esta ação não pode ser desfeita.`)) return;
    const { error } = await excluirCompanhia(c.id);
    if (error) { setErrorMsg(`Erro ao excluir: ${error.message}`); return; }
    invalidateCache('_companhias');
    await loadItems(selectedKey);
  };

  // ---- Drawer title ----
  const drawerTitle = (() => {
    if (isUnidades) return editingUnidade ? 'Editar Unidade' : 'Nova Unidade';
    if (isCompanhias) return editingCompanhia ? 'Editar Companhia' : 'Nova Companhia';
    return editingItem ? 'Editar Item' : 'Novo Item';
  })();

  const drawerSubtitle = (() => {
    if (isUnidades && editingUnidade) return `Editando ${editingUnidade.nome}`;
    if (isCompanhias && editingCompanhia) return `Editando ${editingCompanhia.nome}`;
    if (isGeneric && editingItem) return `Editando ${editingItem.nome}`;
    return selected.label;
  })();

  // ---- Table renderers ----
  const renderGenericTable = () => (
    <table className="tfd-table">
      <thead>
        <tr>
          <th>Código</th>
          <th>Nome</th>
          <th className="hidden md:table-cell">Descrição</th>
          <th>Status</th>
          <th className="w-[100px]">Ações</th>
        </tr>
      </thead>
      <tbody>
        {items.length === 0 && !loading && (
          <tr>
            <td colSpan={5} className="text-center py-8" style={{ color: 'var(--tfd-text-muted)' }}>
              Nenhum item cadastrado nesta categoria.
            </td>
          </tr>
        )}
        {items.map((item) => (
          <tr key={item.id}>
            <td className="font-mono text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>{item.codigo}</td>
            <td className="font-medium">{item.nome}</td>
            <td className="hidden md:table-cell" style={{ color: 'var(--tfd-text-secondary)' }}>
              {item.descricao || '—'}
            </td>
            <td>
              {item.ativo ? (
                <span className="tfd-tag tfd-tag--rounded tfd-tag--dot tfd-tag--success">Ativo</span>
              ) : (
                <span className="tfd-tag tfd-tag--rounded tfd-tag--dot tfd-tag--secondary">Inativo</span>
              )}
            </td>
            <td>
              <div className="flex items-center gap-1">
                <button
                  className="tfd-btn tfd-btn--text tfd-btn-primary tfd-btn--sm tfd-btn--icon-only"
                  title="Editar"
                  onClick={() => handleEditGeneric(item)}
                >
                  <Pencil size={14} />
                </button>
                <button
                  className="tfd-btn tfd-btn--text tfd-btn-danger tfd-btn--sm tfd-btn--icon-only"
                  title="Excluir"
                  onClick={() => handleDeleteGeneric(item)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderUnidadesTable = () => (
    <table className="tfd-table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>CNES</th>
          <th className="hidden md:table-cell">Cidade/UF</th>
          <th className="hidden lg:table-cell">Tipo</th>
          <th>Status</th>
          <th className="w-[100px]">Ações</th>
        </tr>
      </thead>
      <tbody>
        {unidades.length === 0 && !loading && (
          <tr>
            <td colSpan={6} className="text-center py-8" style={{ color: 'var(--tfd-text-muted)' }}>
              Nenhuma unidade de destino cadastrada.
            </td>
          </tr>
        )}
        {unidades.map((u) => (
          <tr key={u.id}>
            <td className="font-medium">{u.nome}</td>
            <td className="font-mono text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>{u.cnes || '—'}</td>
            <td className="hidden md:table-cell" style={{ color: 'var(--tfd-text-secondary)' }}>
              {u.cidade}/{u.uf}
            </td>
            <td className="hidden lg:table-cell" style={{ color: 'var(--tfd-text-secondary)' }}>
              {u.tipo || '—'}
            </td>
            <td>
              {u.ativo ? (
                <span className="tfd-tag tfd-tag--rounded tfd-tag--dot tfd-tag--success">Ativo</span>
              ) : (
                <span className="tfd-tag tfd-tag--rounded tfd-tag--dot tfd-tag--secondary">Inativo</span>
              )}
            </td>
            <td>
              <div className="flex items-center gap-1">
                <button
                  className="tfd-btn tfd-btn--text tfd-btn-primary tfd-btn--sm tfd-btn--icon-only"
                  title="Editar"
                  onClick={() => handleEditUnidade(u)}
                >
                  <Pencil size={14} />
                </button>
                <button
                  className="tfd-btn tfd-btn--text tfd-btn-danger tfd-btn--sm tfd-btn--icon-only"
                  title="Excluir"
                  onClick={() => handleDeleteUnidade(u)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  const renderCompanhiasTable = () => (
    <table className="tfd-table">
      <thead>
        <tr>
          <th>Nome</th>
          <th>Modal</th>
          <th className="hidden md:table-cell">CNPJ</th>
          <th>Status</th>
          <th className="w-[100px]">Ações</th>
        </tr>
      </thead>
      <tbody>
        {companhias.length === 0 && !loading && (
          <tr>
            <td colSpan={5} className="text-center py-8" style={{ color: 'var(--tfd-text-muted)' }}>
              Nenhuma companhia cadastrada.
            </td>
          </tr>
        )}
        {companhias.map((c) => (
          <tr key={c.id}>
            <td className="font-medium">{c.nome}</td>
            <td>
              <span className="tfd-tag tfd-tag--rounded tfd-tag--info">{c.tipo_modal}</span>
            </td>
            <td className="hidden md:table-cell font-mono text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>
              {c.cnpj || '—'}
            </td>
            <td>
              {c.ativo ? (
                <span className="tfd-tag tfd-tag--rounded tfd-tag--dot tfd-tag--success">Ativo</span>
              ) : (
                <span className="tfd-tag tfd-tag--rounded tfd-tag--dot tfd-tag--secondary">Inativo</span>
              )}
            </td>
            <td>
              <div className="flex items-center gap-1">
                <button
                  className="tfd-btn tfd-btn--text tfd-btn-primary tfd-btn--sm tfd-btn--icon-only"
                  title="Editar"
                  onClick={() => handleEditCompanhia(c)}
                >
                  <Pencil size={14} />
                </button>
                <button
                  className="tfd-btn tfd-btn--text tfd-btn-danger tfd-btn--sm tfd-btn--icon-only"
                  title="Excluir"
                  onClick={() => handleDeleteCompanhia(c)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  // ---- Drawer form renderers ----
  const renderGenericForm = () => (
    <div>
      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
        Dados do Item
      </h3>
      <FormField label="Código" required>
        <input
          type="text"
          className="tfd-input"
          placeholder="Ex: ESP001"
          value={fCodigo}
          onChange={(e) => setFCodigo(e.target.value)}
        />
      </FormField>
      <FormField label="Nome" required>
        <input
          type="text"
          className="tfd-input"
          placeholder="Nome do item"
          value={fNome}
          onChange={(e) => setFNome(e.target.value)}
        />
      </FormField>
      <FormField label="Descrição">
        <textarea
          className="tfd-input"
          rows={3}
          placeholder="Descrição opcional"
          value={fDescricao}
          onChange={(e) => setFDescricao(e.target.value)}
        />
      </FormField>
      <FormField label="Ordem">
        <input
          type="number"
          className="tfd-input"
          placeholder="0"
          value={fOrdem}
          onChange={(e) => setFOrdem(parseInt(e.target.value) || 0)}
        />
      </FormField>
      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={fAtivo}
            onChange={(e) => setFAtivo(e.target.checked)}
            className="w-4 h-4 rounded"
            style={{ accentColor: 'var(--tfd-primary-600)' }}
          />
          <span className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>
            Item ativo
          </span>
        </label>
      </div>
    </div>
  );

  const renderUnidadeForm = () => (
    <div>
      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
        Dados da Unidade
      </h3>
      <FormField label="Nome" required>
        <input type="text" className="tfd-input" placeholder="Nome da unidade" value={fNome} onChange={(e) => setFNome(e.target.value)} />
      </FormField>
      <FormField label="CNES">
        <input type="text" className="tfd-input" placeholder="Código CNES" value={fUCnes} onChange={(e) => setFUCnes(e.target.value)} />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Cidade" required>
          <input type="text" className="tfd-input" placeholder="Cidade" value={fUCidade} onChange={(e) => setFUCidade(e.target.value)} />
        </FormField>
        <FormField label="UF" required>
          <input type="text" className="tfd-input" placeholder="UF" maxLength={2} value={fUUf} onChange={(e) => setFUUf(e.target.value.toUpperCase())} />
        </FormField>
      </div>
      <FormField label="Tipo">
        <input type="text" className="tfd-input" placeholder="Ex: Hospital, Clínica" value={fUTipo} onChange={(e) => setFUTipo(e.target.value)} />
      </FormField>

      <h3 className="text-sm font-semibold mb-3 mt-5" style={{ color: 'var(--tfd-text-primary)' }}>
        Contato
      </h3>
      <FormField label="Nome do contato">
        <input type="text" className="tfd-input" placeholder="Nome" value={fUContatoNome} onChange={(e) => setFUContatoNome(e.target.value)} />
      </FormField>
      <FormField label="Telefone">
        <input type="text" className="tfd-input" placeholder="(00) 00000-0000" value={fUContatoTel} onChange={(e) => setFUContatoTel(e.target.value)} />
      </FormField>
      <FormField label="E-mail">
        <input type="email" className="tfd-input" placeholder="contato@unidade.com" value={fUContatoEmail} onChange={(e) => setFUContatoEmail(e.target.value)} />
      </FormField>
      <FormField label="Endereço">
        <textarea className="tfd-input" rows={2} placeholder="Endereço completo" value={fUEndereco} onChange={(e) => setFUEndereco(e.target.value)} />
      </FormField>
      <div className="mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={fAtivo} onChange={(e) => setFAtivo(e.target.checked)} className="w-4 h-4 rounded" style={{ accentColor: 'var(--tfd-primary-600)' }} />
          <span className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>Unidade ativa</span>
        </label>
      </div>
    </div>
  );

  const renderCompanhiaForm = () => (
    <div>
      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>
        Dados da Companhia
      </h3>
      <FormField label="Nome" required>
        <input type="text" className="tfd-input" placeholder="Nome da companhia" value={fNome} onChange={(e) => setFNome(e.target.value)} />
      </FormField>
      <FormField label="Tipo Modal" required>
        <select className="tfd-input" value={fCModal} onChange={(e) => setFCModal(e.target.value)}>
          <option value="Aéreo">Aéreo</option>
          <option value="Terrestre">Terrestre</option>
          <option value="Fluvial">Fluvial</option>
        </select>
      </FormField>
      <FormField label="CNPJ">
        <input type="text" className="tfd-input" placeholder="00.000.000/0000-00" value={fCCnpj} onChange={(e) => setFCCnpj(e.target.value)} />
      </FormField>
      <FormField label="Contato">
        <input type="text" className="tfd-input" placeholder="Telefone ou e-mail" value={fCContato} onChange={(e) => setFCContato(e.target.value)} />
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
    <div className="flex gap-0 rounded-xl overflow-hidden" style={{ border: '1px solid var(--tfd-surface-border)', backgroundColor: 'var(--tfd-surface-card)' }}>
      {/* ===== Left sidebar ===== */}
      <div
        className="shrink-0 overflow-y-auto"
        style={{
          width: '240px',
          borderRight: '1px solid var(--tfd-surface-border)',
          backgroundColor: 'var(--tfd-surface-50)',
          maxHeight: '70vh',
        }}
      >
        <div className="p-3">
          <p className="text-xs font-semibold uppercase tracking-wider mb-2 px-2" style={{ color: 'var(--tfd-text-muted)' }}>
            Categorias
          </p>
          {CATEGORIAS.map((cat) => {
            const isActive = cat.key === selectedKey;
            return (
              <button
                key={cat.key}
                onClick={() => setSelectedKey(cat.key)}
                className="flex items-center gap-2 w-full text-left px-2 py-2 rounded-lg text-sm transition-colors mb-0.5"
                style={{
                  backgroundColor: isActive ? 'var(--tfd-primary-50)' : 'transparent',
                  color: isActive ? 'var(--tfd-primary-700)' : 'var(--tfd-text-secondary)',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                <span className="shrink-0" style={{ color: isActive ? 'var(--tfd-primary-600)' : 'var(--tfd-text-muted)' }}>
                  {cat.icon}
                </span>
                <span className="flex-1 truncate">{cat.label}</span>
                {counts[cat.key] !== undefined && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: isActive ? 'var(--tfd-primary-100)' : 'var(--tfd-surface-200)',
                      color: isActive ? 'var(--tfd-primary-700)' : 'var(--tfd-text-muted)',
                      fontWeight: 500,
                      minWidth: '20px',
                      textAlign: 'center',
                    }}
                  >
                    {counts[cat.key]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== Main area ===== */}
      <div className="flex-1 min-w-0">
        <>
          {/* Error message */}
          {errorMsg && (
            <div className="mx-4 mt-3 p-3 rounded-lg flex items-start gap-2" style={{ backgroundColor: 'var(--tfd-status-danger-bg)', color: 'var(--tfd-status-danger)' }}>
              <span className="shrink-0 mt-0.5">&#9888;</span>
              <div>
                <p className="text-sm font-medium">Erro ao comunicar com o banco de dados</p>
                <p className="text-xs mt-1 opacity-80">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                {selected.label}
              </h3>
              <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                {selected.desc}
              </p>
            </div>
            <button className="tfd-btn tfd-btn-primary tfd-btn--sm shrink-0" onClick={handleNew}>
              <Plus size={14} />
              Novo Item
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto" style={{ maxHeight: 'calc(70vh - 73px)' }}>
            {loading ? (
              <div className="flex items-center justify-center py-16 gap-2" style={{ color: 'var(--tfd-text-muted)' }}>
                <Loader2 size={18} className="animate-spin" />
                <span className="text-sm">Carregando...</span>
              </div>
            ) : (
              <>
                {isGeneric && renderGenericTable()}
                {isUnidades && renderUnidadesTable()}
                {isCompanhias && renderCompanhiasTable()}
              </>
            )}
          </div>
        </>
      </div>

      {/* ===== Drawer ===== */}
      <Drawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); resetForm(); }}
        title={drawerTitle}
        subtitle={drawerSubtitle}
        width="460px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={() => { setDrawerOpen(false); resetForm(); }}>
              Cancelar
            </button>
            <button className="tfd-btn tfd-btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? (
                <><Loader2 size={14} className="animate-spin" /> Salvando...</>
              ) : (
                editingItem || editingUnidade || editingCompanhia ? 'Salvar Alterações' : 'Criar'
              )}
            </button>
          </>
        }
      >
        {isGeneric && renderGenericForm()}
        {isUnidades && renderUnidadeForm()}
        {isCompanhias && renderCompanhiaForm()}
      </Drawer>
    </div>
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
        subtitle="Gerencie as tabelas auxiliares e parâmetros do sistema"
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
      {activeTab === 'parametros' && <ParametrosPanel />}
    </>
  );
}
