'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Stethoscope,
  CheckCircle2,
  Award,
  Plus,
  Search,
  Pencil,
  Power,
  ChevronLeft,
  ChevronRight,
  UserRound,
  Loader2,
  XCircle,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import { useToast } from '@/shared/components/toast/Toast';
import { useSupabaseData } from '@/shared/hooks/useSupabaseData';
import { useLookup } from '@/shared/hooks/useLookup';
import { maskCPF } from '@/shared/pipes/formatters';
import {
  listarMedicosAdmin,
  buscarMedico,
  criarMedico,
  atualizarMedico,
  desativarMedico,
} from '@/services/medicos.service';
import type { Medico } from '@/core/models';

/* -------------------------------------------------- */
/*  Constants                                          */
/* -------------------------------------------------- */

const ITEMS_PER_PAGE = 10;

const UFS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

/* -------------------------------------------------- */
/*  Wrapper with Suspense                              */
/* -------------------------------------------------- */

export default function MedicosPageWrapper() {
  return (
    <Suspense>
      <MedicosPage />
    </Suspense>
  );
}

/* -------------------------------------------------- */
/*  Main component                                     */
/* -------------------------------------------------- */

function MedicosPage() {
  const toast = useToast();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  /* ---- Drawer state ---- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Medico | null>(null);
  const [saving, setSaving] = useState(false);

  /* ---- Form state ---- */
  const [fNome, setFNome] = useState('');
  const [fCrm, setFCrm] = useState('');
  const [fCrmUf, setFCrmUf] = useState('MA');
  const [fCpf, setFCpf] = useState('');
  const [fEspecialidade, setFEspecialidade] = useState('');
  const [fAtivo, setFAtivo] = useState(true);

  /* ---- Lookups ---- */
  const { options: especialidades } = useLookup('especialidade');

  /* ---- Data fetching ---- */
  const { data: medicos, loading, count: totalCount, refresh } = useSupabaseData(
    () => listarMedicosAdmin({ search, page: currentPage, pageSize: ITEMS_PER_PAGE }),
    [search, currentPage],
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  /* ---- Summary counters ---- */
  const [counts, setCounts] = useState({ total: 0, ativos: 0, especialidades: 0 });

  const refreshCounts = useCallback(() => {
    listarMedicosAdmin().then(({ data: allData }) => {
      const all = (allData ?? []) as Medico[];
      const numAtivos = all.filter((m) => m.ativo).length;
      const uniqueEsp = new Set(all.map((m) => m.especialidade).filter(Boolean));
      setCounts({ total: all.length, ativos: numAtivos, especialidades: uniqueEsp.size });
    });
  }, []);

  useEffect(() => {
    refreshCounts();
  }, [refreshCounts]);

  /* ---- Abrir drawer via query param ?editar=ID ---- */
  const searchParams = useSearchParams();
  const editarParam = searchParams.get('editar');
  const editarHandled = useRef<string | null>(null);

  useEffect(() => {
    if (editarParam && editarParam !== editarHandled.current && !loading && medicos.length > 0) {
      editarHandled.current = editarParam;
      const found = (medicos as Medico[]).find((m) => m.id === editarParam);
      if (found) {
        handleEdit(found);
      } else {
        buscarMedico(editarParam).then(({ data }) => {
          if (data) handleEdit(data as Medico);
        });
      }
      router.replace('/medicos', { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editarParam, loading, medicos]);

  /* -------------------------------------------------- */
  /*  Form reset & handlers                             */
  /* -------------------------------------------------- */

  function resetForm() {
    setFNome('');
    setFCrm('');
    setFCrmUf('MA');
    setFCpf('');
    setFEspecialidade('');
    setFAtivo(true);
    setEditing(null);
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
    resetForm();
  }

  function handleNew() {
    resetForm();
    setDrawerOpen(true);
  }

  function handleEdit(item: Medico) {
    setEditing(item);
    setFNome(item.nome_completo);
    setFCrm(item.crm);
    setFCrmUf(item.crm_uf);
    setFCpf(item.cpf ? maskCPF(item.cpf) : '');
    setFEspecialidade(item.especialidade ?? '');
    setFAtivo(item.ativo);
    setDrawerOpen(true);
  }

  async function handleSave() {
    if (!fNome || !fCrm || !fCrmUf) return;
    setSaving(true);

    const payload = {
      nome_completo: fNome,
      crm: fCrm,
      crm_uf: fCrmUf,
      cpf: fCpf ? fCpf.replace(/\D/g, '') : undefined,
      especialidade: fEspecialidade || undefined,
      ativo: fAtivo,
    };

    if (editing) {
      const { error } = await atualizarMedico(editing.id, payload);
      if (error) {
        toast.error('Erro ao salvar', error.message);
        setSaving(false);
        return;
      }
      toast.success('Medico atualizado!');
    } else {
      const { error } = await criarMedico(payload);
      if (error) {
        toast.error('Erro ao criar', error.message);
        setSaving(false);
        return;
      }
      toast.success('Medico cadastrado!');
    }

    setSaving(false);
    handleCloseDrawer();
    refresh();
    refreshCounts();
  }

  async function handleDeactivate(item: Medico) {
    if (!window.confirm(`Desativar o medico "${item.nome_completo}"?`)) return;
    const { error } = await desativarMedico(item.id);
    if (error) {
      toast.error('Erro', error.message);
      return;
    }
    toast.success('Medico desativado!');
    refresh();
    refreshCounts();
  }

  /* -------------------------------------------------- */
  /*  Render                                            */
  /* -------------------------------------------------- */

  return (
    <>
      <PageHeader
        title="Medicos"
        subtitle="Gerenciamento de medicos"
        actions={
          <button className="tfd-btn tfd-btn-primary" onClick={handleNew}>
            <Plus size={16} />
            Novo Medico
          </button>
        }
      />

      {/* ========== Summary Cards ========== */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}
          >
            <Stethoscope size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Total de Medicos</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{counts.total}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: 'var(--tfd-status-success-bg)', color: 'var(--tfd-status-success)' }}
          >
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Medicos Ativos</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-status-success)' }}>{counts.ativos}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: 'var(--tfd-status-info-bg)', color: 'var(--tfd-status-info)' }}
          >
            <Award size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Especialidades</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{counts.especialidades}</p>
          </div>
        </div>
      </div>

      {/* ========== Toolbar ========== */}
      <div className="tfd-toolbar mb-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={16}
              className="tfd-input-leading-icon"
              style={{ color: 'var(--tfd-text-muted)' }}
            />
            <input
              type="text"
              className="tfd-input tfd-input--sm tfd-input--with-leading-icon"
              placeholder="Buscar por nome ou CRM..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
          {totalCount} resultado{totalCount !== 1 && 's'}
        </p>
      </div>

      {/* ========== Table ========== */}
      <div className="tfd-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tfd-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th className="hidden md:table-cell">CRM</th>
                <th className="hidden lg:table-cell">Especialidade</th>
                <th className="w-[100px]">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-12">
                    <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                      Carregando...
                    </p>
                  </td>
                </tr>
              ) : medicos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <XCircle size={32} style={{ color: 'var(--tfd-text-muted)' }} />
                      <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                        Nenhum medico encontrado
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                (medicos as Medico[]).map((item) => (
                  <tr
                    key={item.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/medicos/${item.id}`)}
                  >
                    <td className="max-w-[200px] truncate font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                      <div className="flex items-center gap-2">
                        <div
                          className="flex items-center justify-center w-7 h-7 rounded-full shrink-0"
                          style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}
                        >
                          <UserRound size={14} />
                        </div>
                        <span className="truncate">
                          {item.nome_completo}
                          {!item.ativo && (
                            <span className="tfd-tag tfd-tag--rounded tfd-tag--dot tfd-tag--secondary text-[10px] ml-2">Inativo</span>
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>
                      CRM {item.crm}/{item.crm_uf}
                    </td>
                    <td className="hidden lg:table-cell" style={{ color: 'var(--tfd-text-secondary)' }}>
                      {item.especialidade || '\u2014'}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                          title="Editar"
                          onClick={(e) => { e.stopPropagation(); handleEdit(item); }}
                        >
                          <Pencil size={15} />
                        </button>
                        {item.ativo && (
                          <button
                            className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                            title="Desativar"
                            style={{ color: 'var(--tfd-status-danger)' }}
                            onClick={(e) => { e.stopPropagation(); handleDeactivate(item); }}
                          >
                            <Power size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid var(--tfd-surface-border)' }}
          >
            <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
              Pagina {currentPage} de {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                className="tfd-btn tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="tfd-btn tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========== Drawer: Novo/Editar Medico ========== */}
      <Drawer
        open={drawerOpen}
        onClose={handleCloseDrawer}
        title={editing ? 'Editar Medico' : 'Novo Medico'}
        subtitle={editing ? `CRM ${editing.crm}/${editing.crm_uf}` : 'Cadastrar profissional medico'}
        width="480px"
        footer={
          <>
            <button className="tfd-btn tfd-btn-secondary" onClick={handleCloseDrawer}>
              Cancelar
            </button>
            <button
              className="tfd-btn tfd-btn-primary"
              onClick={handleSave}
              disabled={saving || !fNome || !fCrm || !fCrmUf}
            >
              {saving ? (
                <><Loader2 size={14} className="animate-spin" /> Salvando...</>
              ) : (
                editing ? 'Salvar Alteracoes' : 'Cadastrar Medico'
              )}
            </button>
          </>
        }
      >
        <FormField label="Nome Completo" required>
          <input
            type="text"
            className="tfd-input"
            placeholder="Nome completo do medico"
            value={fNome}
            onChange={(e) => setFNome(e.target.value)}
          />
        </FormField>

        <div className="grid grid-cols-[1fr_100px] gap-3">
          <FormField label="CRM" required>
            <input
              type="text"
              className="tfd-input"
              placeholder="Numero do CRM"
              value={fCrm}
              onChange={(e) => setFCrm(e.target.value)}
            />
          </FormField>
          <FormField label="UF" required>
            <select className="tfd-input" value={fCrmUf} onChange={(e) => setFCrmUf(e.target.value)}>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField label="CPF">
          <input
            type="text"
            className="tfd-input"
            placeholder="000.000.000-00"
            value={fCpf}
            onChange={(e) => setFCpf(maskCPF(e.target.value))}
          />
        </FormField>

        <FormField label="Especialidade">
          <select className="tfd-input" value={fEspecialidade} onChange={(e) => setFEspecialidade(e.target.value)}>
            <option value="">Selecione...</option>
            {especialidades.map((esp) => (
              <option key={esp.value} value={esp.label}>{esp.label}</option>
            ))}
          </select>
          <p className="text-xs mt-1" style={{ color: 'var(--tfd-text-muted)' }}>
            Especialidades configuradas em Tabelas Auxiliares &gt; Especialidades Medicas
          </p>
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
              <span className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>Medico ativo</span>
            </label>
          </div>
        )}
      </Drawer>
    </>
  );
}
