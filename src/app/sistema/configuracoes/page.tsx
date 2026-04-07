'use client';

import { useState, useEffect, useMemo } from 'react';
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
  ChevronRight,
  Package,
  Navigation,
  Megaphone,
  type LucideIcon,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import { useToast } from '@/shared/components/toast/Toast';
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
import { invalidateCache } from '@/shared/hooks/useLookup';
import { maskCNPJ, maskPhone } from '@/shared/pipes/formatters';

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
      { key: 'especialidade', label: 'Especialidades Médicas', icon: Stethoscope, desc: 'Especialidades para encaminhamento TFD' },
      { key: 'tipo_procedimento', label: 'Tipos de Procedimento', icon: Activity, desc: 'Consulta, cirurgia, exame, tratamento' },
      { key: 'cid10', label: 'CIDs Frequentes', icon: FileText, desc: 'Códigos CID-10 mais utilizados' },
      { key: 'origem_laudo', label: 'Origens de Laudo', icon: FileText, desc: 'Origem do laudo médico (estadual, municipal)' },
      { key: 'carater_atendimento', label: 'Caráter de Atendimento', icon: Activity, desc: 'Hospitalar, ambulatorial e outros' },
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
    title: 'Regulação e Agendamento',
    icon: Navigation,
    categorias: [
      { key: 'origem_agendamento', label: 'Origens de Agendamento', icon: MapPin, desc: 'Como o agendamento foi obtido' },
      { key: '_unidades_destino', label: 'Unidades de Destino', icon: Building2, desc: 'Hospitais e clínicas de referência' },
      { key: 'destinatario_rota', label: 'Destinatários de Rota', icon: Navigation, desc: 'Instituições de encaminhamento na regulação' },
    ],
  },
  {
    title: 'Transporte',
    icon: Plane,
    categorias: [
      { key: 'modal_transporte', label: 'Modais de Transporte', icon: Plane, desc: 'Tipos de transporte disponíveis' },
      { key: '_companhias', label: 'Companhias de Transporte', icon: Plane, desc: 'Empresas aéreas, rodoviárias e fluviais' },
    ],
  },
  {
    title: 'Financeiro e Permanência',
    icon: DollarSign,
    categorias: [
      { key: 'motivo_permanencia', label: 'Motivos de Permanência', icon: CalendarClock, desc: 'Razões para extensão de estada' },
      { key: 'motivo_encerramento', label: 'Motivos de Encerramento', icon: XCircle, desc: 'Tipos de encerramento do processo' },
      { key: 'status_ajuda_custo', label: 'Status Ajuda de Custo', icon: DollarSign, desc: 'Status gerenciais para controle financeiro' },
      { key: 'comunicado_por', label: 'Comunicado Por', icon: Megaphone, desc: 'Quem comunicou a permanência' },
    ],
  },
  {
    title: 'Sistema e Acesso',
    icon: Settings,
    categorias: [
      { key: 'canal_comunicacao', label: 'Canais de Comunicação', icon: MessageSquare, desc: 'Canais de notificação ao paciente' },
      { key: 'perfil_usuario', label: 'Perfis de Usuário', icon: Shield, desc: 'Funções e permissões do sistema' },
      { key: 'regional', label: 'Regionais', icon: Building2, desc: 'Regionais de saúde do estado' },
    ],
  },
];

// Flat list for lookups
const ALL_CATEGORIAS = SECOES.flatMap((s) => s.categorias);

/* -------------------------------------------------- */
/*  ParametrosPanel                                    */
/* -------------------------------------------------- */

function ParametrosPanel() {
  const toast = useToast();
  const [parametros, setParametros] = useState<import('@/services/parametros.service').Parametro[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingParam, setEditingParam] = useState<import('@/services/parametros.service').Parametro | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
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
    toast.success('Parâmetro salvo!', 'O valor foi atualizado no sistema.');
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
    toast.success('Parâmetro criado!', 'O novo parâmetro está disponível.');
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
    toast.success('Parâmetro excluído!');
    await loadParametros();
  };

  const formatDisplayValue = (param: import('@/services/parametros.service').Parametro) => {
    if (param.tipo === 'moeda') return `R$ ${parseFloat(param.valor).toFixed(2).replace('.', ',')}`;
    if (param.tipo === 'booleano') return param.valor === 'true' ? 'Sim' : 'Não';
    const sufixo = TIPO_SUFIXOS[param.tipo] ?? '';
    return `${param.valor}${sufixo}`;
  };

  const grupos = ['diarias', 'transporte', 'sla'];
  const byGrupo = (g: string) => parametros.filter((p) => p.grupo === g);
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
                    <input type="radio" name="paramBool" checked={editValue === 'true'} onChange={() => setEditValue('true')} style={{ accentColor: 'var(--tfd-primary-500)' }} />
                    <span className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>Sim</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="paramBool" checked={editValue === 'false'} onChange={() => setEditValue('false')} style={{ accentColor: 'var(--tfd-primary-500)' }} />
                    <span className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>Não</span>
                  </label>
                </div>
              ) : editingParam.tipo === 'moeda' ? (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--tfd-text-muted)' }}>R$</span>
                  <input type="number" step="0.01" className="tfd-input pl-10" value={editValue} onChange={(e) => setEditValue(e.target.value)} />
                </div>
              ) : ['numero', 'dias', 'horas', 'km'].includes(editingParam.tipo) ? (
                <div className="relative">
                  <input type="number" className="tfd-input" value={editValue} onChange={(e) => setEditValue(e.target.value)} />
                  {TIPO_SUFIXOS[editingParam.tipo] && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                      {TIPO_SUFIXOS[editingParam.tipo]?.trim()}
                    </span>
                  )}
                </div>
              ) : (
                <input type="text" className="tfd-input" value={editValue} onChange={(e) => setEditValue(e.target.value)} />
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
/*  CadastrosPanel (Card-based layout by sections)     */
/* -------------------------------------------------- */

function CadastrosPanel() {
  const toast = useToast();

  /* ---- Active category drawer ---- */
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [items, setItems] = useState<TabelaAuxiliar[]>([]);
  const [unidades, setUnidades] = useState<UnidadeDestino[]>([]);
  const [companhias, setCompanhias] = useState<CompanhiaTransporte[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isUnidades = activeKey === '_unidades_destino';
  const isCompanhias = activeKey === '_companhias';
  const isGeneric = activeKey != null && !isUnidades && !isCompanhias;
  const activeCat = ALL_CATEGORIAS.find((c) => c.key === activeKey);

  /* ---- Editing state ---- */
  const [editingItem, setEditingItem] = useState<TabelaAuxiliar | null>(null);
  const [editingUnidade, setEditingUnidade] = useState<UnidadeDestino | null>(null);
  const [editingCompanhia, setEditingCompanhia] = useState<CompanhiaTransporte | null>(null);

  /* ---- Form state — generic ---- */
  const [fNome, setFNome] = useState('');
  const [fDescricao, setFDescricao] = useState('');
  const [fAtivo, setFAtivo] = useState(true);

  /* ---- Form state — unidade destino ---- */
  const [fUCnes, setFUCnes] = useState('');
  const [fUCidade, setFUCidade] = useState('');
  const [fUUf, setFUUf] = useState('');
  const [fUTipo, setFUTipo] = useState('');
  const [fUContatoNome, setFUContatoNome] = useState('');
  const [fUContatoTel, setFUContatoTel] = useState('');
  const [fUContatoEmail, setFUContatoEmail] = useState('');
  const [fUEndereco, setFUEndereco] = useState('');

  /* ---- Form state — companhia ---- */
  const [fCModal, setFCModal] = useState('Aéreo');
  const [fCCnpj, setFCCnpj] = useState('');
  const [fCContato, setFCContato] = useState('');

  /* ---- Inline form mode (list vs form in same drawer) ---- */
  const [formMode, setFormMode] = useState(false);

  /* ---- Counts per category ---- */
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Load all counts on mount
  useEffect(() => {
    const loadCounts = async () => {
      const newCounts: Record<string, number> = {};
      const genericKeys = ALL_CATEGORIAS.filter((c) => c.key !== '_unidades_destino' && c.key !== '_companhias').map((c) => c.key);
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

  /* ---- Load items for active category ---- */
  const loadItems = async (key: string) => {
    setLoading(true);
    setErrorMsg(null);
    if (key === '_unidades_destino') {
      const { data, error } = await listarUnidadesDestinoAdmin();
      if (error) setErrorMsg(error.message);
      setUnidades((data as UnidadeDestino[]) ?? []);
    } else if (key === '_companhias') {
      const { data, error } = await listarCompanhiasAdmin();
      if (error) setErrorMsg(error.message);
      setCompanhias((data as CompanhiaTransporte[]) ?? []);
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
    setUnidades([]);
    setCompanhias([]);
    setErrorMsg(null);
    setFormMode(false);
    resetForm();
  };

  // Update count when items change
  useEffect(() => {
    if (!activeKey) return;
    if (isUnidades) setCounts((prev) => ({ ...prev, [activeKey]: unidades.length }));
    else if (isCompanhias) setCounts((prev) => ({ ...prev, [activeKey]: companhias.length }));
    else setCounts((prev) => ({ ...prev, [activeKey]: items.length }));
  }, [items, unidades, companhias, activeKey, isUnidades, isCompanhias]);

  /* ---- Reset form ---- */
  const resetForm = () => {
    setFNome(''); setFDescricao(''); setFAtivo(true);
    setFUCnes(''); setFUCidade(''); setFUUf(''); setFUTipo('');
    setFUContatoNome(''); setFUContatoTel(''); setFUContatoEmail(''); setFUEndereco('');
    setFCModal('Aéreo'); setFCCnpj(''); setFCContato('');
    setEditingItem(null); setEditingUnidade(null); setEditingCompanhia(null);
  };

  const handleNew = () => { resetForm(); setFormMode(true); };

  const handleEditGeneric = (item: TabelaAuxiliar) => {
    resetForm();
    setEditingItem(item);
    setFNome(item.nome);
    setFDescricao(item.descricao ?? ''); setFAtivo(item.ativo);
    setFormMode(true);
  };

  const handleEditUnidade = (u: UnidadeDestino) => {
    resetForm();
    setEditingUnidade(u);
    setFNome(u.nome); setFUCnes(u.cnes ?? ''); setFUCidade(u.cidade); setFUUf(u.uf);
    setFUTipo(u.tipo ?? ''); setFUContatoNome(u.contato_nome ?? '');
    setFUContatoTel(u.contato_telefone ?? ''); setFUContatoEmail(u.contato_email ?? '');
    setFUEndereco(u.endereco ?? ''); setFAtivo(u.ativo);
    setFormMode(true);
  };

  const handleEditCompanhia = (c: CompanhiaTransporte) => {
    resetForm();
    setEditingCompanhia(c);
    setFNome(c.nome); setFCModal(c.tipo_modal); setFCCnpj(c.cnpj ?? '');
    setFCContato(c.contato ?? ''); setFAtivo(c.ativo);
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
        if (result.error) { setErrorMsg(result.error.message); setSaving(false); return; }
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
        if (result.error) { setErrorMsg(result.error.message); setSaving(false); return; }
        invalidateCache('_companhias');
      }

      const isEditing = !!(editingItem || editingUnidade || editingCompanhia);
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
  const handleDelete = async (type: 'generic' | 'unidade' | 'companhia', item: any) => {
    const nome = item.nome ?? 'este item';
    if (!window.confirm(`Excluir "${nome}"? Esta ação não pode ser desfeita.`)) return;
    let error: { message: string } | null = null;
    if (type === 'generic') {
      const res = await excluirItemAuxiliar(item.id);
      error = res.error;
      if (!error && activeKey) invalidateCache(activeKey);
    } else if (type === 'unidade') {
      const res = await excluirUnidadeDestino(item.id);
      error = res.error;
      if (!error) invalidateCache('_unidades_destino');
    } else {
      const res = await excluirCompanhia(item.id);
      error = res.error;
      if (!error) invalidateCache('_companhias');
    }
    if (error) { setErrorMsg(`Erro ao excluir: ${error.message}`); return; }
    toast.success('Item excluído!', 'O registro foi removido.');
    if (activeKey) await loadItems(activeKey);
  };

  /* ---- Drawer titles ---- */
  const formDrawerTitle = (() => {
    if (isUnidades) return editingUnidade ? 'Editar Unidade' : 'Nova Unidade';
    if (isCompanhias) return editingCompanhia ? 'Editar Companhia' : 'Nova Companhia';
    return editingItem ? 'Editar Item' : 'Novo Item';
  })();

  const formDrawerSubtitle = (() => {
    if (isUnidades && editingUnidade) return editingUnidade.nome;
    if (isCompanhias && editingCompanhia) return editingCompanhia.nome;
    if (isGeneric && editingItem) return editingItem.nome;
    return activeCat?.label ?? '';
  })();

  /* ---- Item list inside category drawer ---- */
  const currentItems = isUnidades ? unidades : isCompanhias ? companhias : items;
  const isEmpty = currentItems.length === 0 && !loading;

  const renderItemList = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-16 gap-2" style={{ color: 'var(--tfd-text-muted)' }}>
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Carregando...</span>
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

    if (isUnidades) {
      return (
        <div className="space-y-2">
          {unidades.map((u) => (
            <div
              key={u.id}
              className="flex items-center justify-between gap-3 p-3 rounded-lg transition-colors"
              style={{ backgroundColor: 'var(--tfd-surface-50)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--tfd-surface-100)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--tfd-surface-50)'; }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{u.nome}</p>
                <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                  {u.cidade}/{u.uf} {u.cnes ? `· CNES: ${u.cnes}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {!u.ativo && (
                  <span className="tfd-tag tfd-tag--rounded tfd-tag--dot tfd-tag--secondary text-[10px]">Inativo</span>
                )}
                <button className="tfd-btn tfd-btn-ghost tfd-btn--sm tfd-btn--icon-only" title="Editar" style={{ color: 'var(--tfd-primary-500)' }} onClick={() => handleEditUnidade(u)}>
                  <Pencil size={14} />
                </button>
                <button className="tfd-btn tfd-btn-ghost tfd-btn--sm tfd-btn--icon-only" title="Excluir" style={{ color: 'var(--tfd-status-danger)' }} onClick={() => handleDelete('unidade', u)}>
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
                <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                  {c.tipo_modal} {c.cnpj ? `· ${c.cnpj}` : ''}
                </p>
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

  const renderUnidadeForm = () => (
    <div>
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
      <hr className="tfd-divider" />
      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Contato</h3>
      <FormField label="Nome do contato">
        <input type="text" className="tfd-input" placeholder="Nome" value={fUContatoNome} onChange={(e) => setFUContatoNome(e.target.value)} />
      </FormField>
      <FormField label="Telefone">
        <input type="text" className="tfd-input" placeholder="(00) 00000-0000" value={fUContatoTel} onChange={(e) => setFUContatoTel(maskPhone(e.target.value))} />
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
        <input type="text" className="tfd-input" placeholder="00.000.000/0000-00" value={fCCnpj} onChange={(e) => setFCCnpj(maskCNPJ(e.target.value))} />
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
                  editingItem || editingUnidade || editingCompanhia ? 'Salvar Alterações' : 'Criar'
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
            {isUnidades && renderUnidadeForm()}
            {isCompanhias && renderCompanhiaForm()}
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
