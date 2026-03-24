'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Check,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import {
  listarPorCategoriaAdmin,
  criarItemAuxiliar,
  atualizarItemAuxiliar,
  excluirItemAuxiliar,
  type TabelaAuxiliar,
} from '@/services/tabelas-auxiliares.service';
import { invalidateCache } from '@/shared/hooks/useLookup';

/* -------------------------------------------------- */
/*  Módulos e telas do sistema TFD                     */
/* -------------------------------------------------- */

const MODULOS = [
  {
    key: 'operacional',
    label: 'Operacional',
    telas: [
      { key: 'dashboard', label: 'Dashboard' },
      { key: 'solicitacoes', label: 'Solicitações' },
      { key: 'regulacao', label: 'Regulação Médica' },
    ],
  },
  {
    key: 'atendimento',
    label: 'Atendimento e Viagem',
    telas: [
      { key: 'atendimento-destino', label: 'Agendamentos' },
      { key: 'viagens', label: 'Viagens e Passagens' },
    ],
  },
  {
    key: 'financeiro',
    label: 'Financeiro',
    telas: [
      { key: 'ajuda-custo', label: 'Ajuda de Custo / Diárias' },
      { key: 'permanencia', label: 'Permanência' },
    ],
  },
  {
    key: 'gestao',
    label: 'Gestão',
    telas: [
      { key: 'alta-encerramento', label: 'Altas e Encerramento' },
      { key: 'relatorios', label: 'Relatórios' },
      { key: 'configuracoes', label: 'Configurações' },
    ],
  },
];

const TOTAL_TELAS = MODULOS.reduce((acc, m) => acc + m.telas.length, 0);

/* -------------------------------------------------- */
/*  Permissões helpers                                 */
/* -------------------------------------------------- */

interface PermissaoMap {
  [telaKey: string]: { visualizar: boolean; editar: boolean };
}

function parsePermissoes(descricao: string | null): PermissaoMap {
  if (!descricao) return {};
  try {
    const parsed = JSON.parse(descricao);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  } catch { /* descricao is plain text, not JSON */ }
  return {};
}

function serializePermissoes(permissoes: PermissaoMap): string {
  return JSON.stringify(permissoes);
}

function countActivePermissoes(permissoes: PermissaoMap): number {
  return Object.values(permissoes).filter((p) => p.visualizar || p.editar).length;
}

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

interface Props {
  onCountChange?: (count: number) => void;
}

export default function PermissoesPanel({ onCountChange }: Props) {
  const [items, setItems] = useState<TabelaAuxiliar[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<TabelaAuxiliar | null>(null);

  // Form fields
  const [fCodigo, setFCodigo] = useState('');
  const [fNome, setFNome] = useState('');
  const [fAtivo, setFAtivo] = useState(true);
  const [fOrdem, setFOrdem] = useState(0);
  const [permissoes, setPermissoes] = useState<PermissaoMap>({});
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(MODULOS.map((m) => m.key)),
  );

  /* ---- Data loading ---- */

  const loadItems = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    const { data, error } = await listarPorCategoriaAdmin('perfil_usuario');
    if (error) {
      console.error('Supabase error (perfis):', error);
      setErrorMsg(error.message);
      setItems([]);
    } else {
      const rows = (data as TabelaAuxiliar[]) ?? [];
      setItems(rows);
      onCountChange?.(rows.length);
    }
    setLoading(false);
  }, [onCountChange]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  /* ---- Form helpers ---- */

  const resetForm = () => {
    setFCodigo('');
    setFNome('');
    setFAtivo(true);
    setFOrdem(0);
    setPermissoes({});
    setEditingItem(null);
    setExpandedModules(new Set(MODULOS.map((m) => m.key)));
  };

  const handleNew = () => {
    resetForm();
    setDrawerOpen(true);
  };

  const handleEdit = (item: TabelaAuxiliar) => {
    resetForm();
    setEditingItem(item);
    setFCodigo(item.codigo);
    setFNome(item.nome);
    setFAtivo(item.ativo);
    setFOrdem(item.ordem);
    setPermissoes(parsePermissoes(item.descricao));
    setDrawerOpen(true);
  };

  /* ---- Save ---- */

  const handleSave = async () => {
    if (!fCodigo || !fNome) return;
    setSaving(true);
    setErrorMsg(null);

    const descricao = serializePermissoes(permissoes);

    try {
      if (editingItem) {
        const { error } = await atualizarItemAuxiliar(editingItem.id, {
          codigo: fCodigo,
          nome: fNome,
          descricao,
          ativo: fAtivo,
          ordem: fOrdem,
        });
        if (error) {
          setErrorMsg(`Erro ao atualizar: ${error.message}`);
          setSaving(false);
          return;
        }
      } else {
        const { error } = await criarItemAuxiliar({
          categoria: 'perfil_usuario',
          codigo: fCodigo,
          nome: fNome,
          descricao,
          ordem: fOrdem,
        });
        if (error) {
          setErrorMsg(`Erro ao criar: ${error.message}`);
          setSaving(false);
          return;
        }
      }
      invalidateCache('perfil_usuario');
      setDrawerOpen(false);
      resetForm();
      await loadItems();
    } catch (err) {
      setErrorMsg(`Erro de conexão: ${err instanceof Error ? err.message : 'Tente novamente.'}`);
    } finally {
      setSaving(false);
    }
  };

  /* ---- Delete ---- */

  const handleDelete = async (item: TabelaAuxiliar) => {
    if (!window.confirm(`Excluir o perfil "${item.nome}"? Esta ação não pode ser desfeita.`)) return;
    const { error } = await excluirItemAuxiliar(item.id);
    if (error) {
      setErrorMsg(`Erro ao excluir: ${error.message}`);
      return;
    }
    invalidateCache('perfil_usuario');
    await loadItems();
  };

  /* ---- TreeTable toggles ---- */

  const toggleModule = (moduleKey: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleKey)) next.delete(moduleKey);
      else next.add(moduleKey);
      return next;
    });
  };

  const togglePermissao = (telaKey: string, tipo: 'visualizar' | 'editar') => {
    setPermissoes((prev) => {
      const current = prev[telaKey] || { visualizar: false, editar: false };
      const updated = { ...current };

      if (tipo === 'editar') {
        updated.editar = !updated.editar;
        if (updated.editar) updated.visualizar = true;
      } else {
        updated.visualizar = !updated.visualizar;
        if (!updated.visualizar) updated.editar = false;
      }

      return { ...prev, [telaKey]: updated };
    });
  };

  const toggleModulePermissao = (moduleKey: string, tipo: 'visualizar' | 'editar') => {
    const modulo = MODULOS.find((m) => m.key === moduleKey);
    if (!modulo) return;

    const allHave = modulo.telas.every((t) => {
      const p = permissoes[t.key];
      return p && p[tipo];
    });

    setPermissoes((prev) => {
      const next = { ...prev };
      modulo.telas.forEach((t) => {
        const current = next[t.key] || { visualizar: false, editar: false };
        if (tipo === 'editar') {
          next[t.key] = {
            visualizar: !allHave ? true : current.visualizar,
            editar: !allHave,
          };
        } else {
          next[t.key] = {
            visualizar: !allHave,
            editar: !allHave ? current.editar : false,
          };
        }
      });
      return next;
    });
  };

  const getModuleCheckState = (
    moduleKey: string,
    tipo: 'visualizar' | 'editar',
  ): 'all' | 'some' | 'none' => {
    const modulo = MODULOS.find((m) => m.key === moduleKey);
    if (!modulo) return 'none';

    const count = modulo.telas.filter((t) => {
      const p = permissoes[t.key];
      return p && p[tipo];
    }).length;

    if (count === modulo.telas.length) return 'all';
    if (count > 0) return 'some';
    return 'none';
  };

  /* ---- Checkbox renderer ---- */

  const renderCheckbox = (
    checked: boolean | 'some',
    color: string,
    onClick: () => void,
  ) => {
    const isChecked = checked === true;
    const isIndeterminate = checked === 'some';
    const active = isChecked || isIndeterminate;

    return (
      <button
        type="button"
        className="w-[18px] h-[18px] rounded border-[1.5px] flex items-center justify-center transition-all"
        style={{
          borderColor: active ? color : 'var(--tfd-surface-300)',
          backgroundColor: isChecked ? color : isIndeterminate ? `${color}18` : 'transparent',
        }}
        onClick={onClick}
      >
        {isChecked && <Check size={11} color="white" strokeWidth={3} />}
        {isIndeterminate && (
          <div className="w-2 h-[2px] rounded-full" style={{ backgroundColor: color }} />
        )}
      </button>
    );
  };

  /* ---- Render ---- */

  return (
    <>
      {/* Header */}
      <div
        className="flex items-center justify-between p-4"
        style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}
      >
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
            Perfis de Permissão
          </h3>
          <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
            Configure quais telas cada perfil pode visualizar ou editar
          </p>
        </div>
        <button className="tfd-btn tfd-btn-primary tfd-btn--sm" onClick={handleNew}>
          <Plus size={14} /> Novo Perfil
        </button>
      </div>

      {/* Error message */}
      {errorMsg && (
        <div
          className="mx-4 mt-3 p-3 rounded-lg flex items-start gap-2"
          style={{
            backgroundColor: 'var(--tfd-status-danger-bg)',
            color: 'var(--tfd-status-danger)',
          }}
        >
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Erro ao comunicar com o banco de dados</p>
            <p className="text-xs mt-1 opacity-80">{errorMsg}</p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto" style={{ maxHeight: 'calc(70vh - 73px)' }}>
        {loading ? (
          <div
            className="flex items-center justify-center py-16 gap-2"
            style={{ color: 'var(--tfd-text-muted)' }}
          >
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Carregando...</span>
          </div>
        ) : (
          <table className="tfd-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nome</th>
                <th>Permissões</th>
                <th>Status</th>
                <th className="w-[100px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-8"
                    style={{ color: 'var(--tfd-text-muted)' }}
                  >
                    Nenhum perfil cadastrado.
                  </td>
                </tr>
              )}
              {items.map((item) => {
                const perms = parsePermissoes(item.descricao);
                const count = countActivePermissoes(perms);
                return (
                  <tr key={item.id}>
                    <td
                      className="font-mono text-xs"
                      style={{ color: 'var(--tfd-text-secondary)' }}
                    >
                      {item.codigo}
                    </td>
                    <td className="font-medium">{item.nome}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div
                          className="flex-1 h-1.5 rounded-full overflow-hidden"
                          style={{
                            backgroundColor: 'var(--tfd-surface-200)',
                            maxWidth: '80px',
                          }}
                        >
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${TOTAL_TELAS > 0 ? (count / TOTAL_TELAS) * 100 : 0}%`,
                              backgroundColor:
                                count > 0 ? 'var(--tfd-primary-500)' : 'transparent',
                            }}
                          />
                        </div>
                        <span
                          className="text-xs whitespace-nowrap"
                          style={{ color: 'var(--tfd-text-muted)' }}
                        >
                          {count}/{TOTAL_TELAS} telas
                        </span>
                      </div>
                    </td>
                    <td>
                      {item.ativo ? (
                        <span className="tfd-tag tfd-tag--rounded tfd-tag--dot tfd-tag--success">
                          Ativo
                        </span>
                      ) : (
                        <span className="tfd-tag tfd-tag--rounded tfd-tag--dot tfd-tag--secondary">
                          Inativo
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          className="tfd-btn tfd-btn--text tfd-btn-primary tfd-btn--sm tfd-btn--icon-only"
                          title="Editar permissões"
                          onClick={() => handleEdit(item)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="tfd-btn tfd-btn--text tfd-btn-danger tfd-btn--sm tfd-btn--icon-only"
                          title="Excluir"
                          onClick={() => handleDelete(item)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ===== Drawer ===== */}
      <Drawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          resetForm();
        }}
        title={editingItem ? 'Editar Perfil' : 'Novo Perfil de Permissão'}
        subtitle={
          editingItem
            ? `Editando ${editingItem.nome}`
            : 'Defina o nome e as permissões de acesso'
        }
        width="560px"
        footer={
          <>
            <button
              className="tfd-btn tfd-btn-secondary"
              onClick={() => {
                setDrawerOpen(false);
                resetForm();
              }}
            >
              Cancelar
            </button>
            <button
              className="tfd-btn tfd-btn-primary"
              onClick={handleSave}
              disabled={saving || !fCodigo || !fNome}
            >
              {saving ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Salvando...
                </>
              ) : editingItem ? (
                'Salvar Alterações'
              ) : (
                'Criar Perfil'
              )}
            </button>
          </>
        }
      >
        <div>
          {/* ---- Profile data ---- */}
          <h3
            className="text-sm font-semibold mb-3"
            style={{ color: 'var(--tfd-text-primary)' }}
          >
            Dados do Perfil
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Código" required>
              <input
                type="text"
                className="tfd-input"
                placeholder="Ex: ATENDENTE"
                value={fCodigo}
                onChange={(e) => setFCodigo(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
              />
            </FormField>
            <FormField label="Ordem">
              <input
                type="number"
                className="tfd-input"
                value={fOrdem}
                onChange={(e) => setFOrdem(parseInt(e.target.value) || 0)}
              />
            </FormField>
          </div>

          <FormField label="Nome" required>
            <input
              type="text"
              className="tfd-input"
              placeholder="Nome do perfil"
              value={fNome}
              onChange={(e) => setFNome(e.target.value)}
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
                Perfil ativo
              </span>
            </label>
          </div>

          <hr className="tfd-divider" />

          {/* ---- TreeTable ---- */}
          <h3
            className="text-sm font-semibold mb-1 mt-4"
            style={{ color: 'var(--tfd-text-primary)' }}
          >
            Permissões de Acesso às Telas
          </h3>
          <p className="text-xs mb-4" style={{ color: 'var(--tfd-text-muted)' }}>
            Marque &quot;Editar&quot; para conceder edição (inclui visualização automaticamente).
          </p>

          <div
            className="rounded-lg overflow-hidden"
            style={{ border: '1px solid var(--tfd-surface-border)' }}
          >
            {/* Header row */}
            <div
              className="flex items-center px-3 py-2.5 text-xs font-semibold uppercase tracking-wider"
              style={{
                backgroundColor: 'var(--tfd-surface-100)',
                color: 'var(--tfd-text-muted)',
                borderBottom: '1px solid var(--tfd-surface-border)',
              }}
            >
              <span className="flex-1">Módulo / Tela</span>
              <span className="w-[72px] text-center">Visualizar</span>
              <span className="w-[72px] text-center">Editar</span>
            </div>

            {MODULOS.map((modulo, idx) => {
              const isExpanded = expandedModules.has(modulo.key);
              const viewState = getModuleCheckState(modulo.key, 'visualizar');
              const editState = getModuleCheckState(modulo.key, 'editar');

              return (
                <div key={modulo.key}>
                  {/* Module row */}
                  <div
                    className="flex items-center px-3 py-2.5 select-none"
                    style={{
                      backgroundColor: 'var(--tfd-surface-50)',
                      borderTop:
                        idx > 0 ? '1px solid var(--tfd-surface-border)' : undefined,
                    }}
                  >
                    <div
                      className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                      onClick={() => toggleModule(modulo.key)}
                    >
                      <span style={{ color: 'var(--tfd-text-muted)' }}>
                        {isExpanded ? (
                          <ChevronDown size={14} />
                        ) : (
                          <ChevronRight size={14} />
                        )}
                      </span>
                      <span
                        className="text-sm font-semibold"
                        style={{ color: 'var(--tfd-text-primary)' }}
                      >
                        {modulo.label}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                        ({modulo.telas.length})
                      </span>
                    </div>

                    {/* Module-level checkboxes */}
                    <div className="w-[72px] flex justify-center">
                      {renderCheckbox(
                        viewState === 'all' ? true : viewState === 'some' ? 'some' : false,
                        'var(--tfd-primary-500)',
                        () => toggleModulePermissao(modulo.key, 'visualizar'),
                      )}
                    </div>
                    <div className="w-[72px] flex justify-center">
                      {renderCheckbox(
                        editState === 'all' ? true : editState === 'some' ? 'some' : false,
                        '#D97706',
                        () => toggleModulePermissao(modulo.key, 'editar'),
                      )}
                    </div>
                  </div>

                  {/* Tela rows (collapsed/expanded) */}
                  {isExpanded &&
                    modulo.telas.map((tela) => {
                      const perm = permissoes[tela.key] || {
                        visualizar: false,
                        editar: false,
                      };
                      return (
                        <div
                          key={tela.key}
                          className="flex items-center px-3 py-2 pl-10"
                          style={{
                            borderTop: '1px solid var(--tfd-surface-border)',
                          }}
                        >
                          <span
                            className="flex-1 text-sm"
                            style={{ color: 'var(--tfd-text-secondary)' }}
                          >
                            {tela.label}
                          </span>

                          <div className="w-[72px] flex justify-center">
                            {renderCheckbox(perm.visualizar, 'var(--tfd-primary-500)', () =>
                              togglePermissao(tela.key, 'visualizar'),
                            )}
                          </div>
                          <div className="w-[72px] flex justify-center">
                            {renderCheckbox(perm.editar, '#D97706', () =>
                              togglePermissao(tela.key, 'editar'),
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="mt-3 flex items-center gap-4 text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
            <span className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: 'var(--tfd-primary-500)' }}
              />
              Visualizar
            </span>
            <span className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-sm"
                style={{ backgroundColor: '#D97706' }}
              />
              Editar (inclui visualizar)
            </span>
          </div>
        </div>
      </Drawer>
    </>
  );
}
