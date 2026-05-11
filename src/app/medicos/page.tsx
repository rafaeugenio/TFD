'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
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
import StatsRow from '@/shared/components/stats-row/StatsRow';
import Pagination from '@/shared/components/pagination/Pagination';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import { useToast } from '@/shared/components/toast/Toast';
import { useSupabaseData } from '@/shared/hooks/useSupabaseData';
import LookupSelect from '@/shared/components/lookup-select/LookupSelect';
import { maskCPF } from '@/shared/pipes/formatters';
import SortableHeader from '@/shared/components/table/SortableHeader';
import { useTableControls } from '@/shared/hooks/useTableControls';
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

  /* ---- Data fetching (all records — client-side filtering) ---- */
  const { data: medicos, loading, refresh } = useSupabaseData(
    () => listarMedicosAdmin(),
    [],
  );

  /* ---- Table controls (search, sort, column filters, pagination) ---- */
  const table = useTableControls({
    data: medicos as unknown as Record<string, unknown>[],
    searchFields: ['nome_completo', 'crm'],
  });

  const items = table.paginated as unknown as Medico[];
  const allFiltered = table.filtered as unknown as Medico[];

  /* Column filter options */
  const especialidadeFilterOptions = table.getFilterOptions('especialidade');
  const ufFilterOptions = table.getFilterOptions('crm_uf');

  /* ---- Summary counters (derived from loaded data) ---- */
  const allMedicos = medicos as Medico[];
  const counts = {
    total: allMedicos.length,
    ativos: allMedicos.filter((m) => m.ativo).length,
    especialidades: new Set(allMedicos.map((m) => m.especialidade).filter(Boolean)).size,
  };

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

      <StatsRow
        stats={[
          { label: 'Total de Médicos', value: counts.total },
          { label: 'Médicos Ativos', value: counts.ativos },
          { label: 'Especialidades', value: counts.especialidades },
        ]}
      />

      {/* ========== Toolbar (estilo v2) ========== */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div
          className="flex items-center gap-2 px-3"
          style={{
            background: 'white', border: '1px solid var(--tfd-surface-border)',
            borderRadius: 8, height: 36, minWidth: 280,
          }}
        >
          <Search size={14} style={{ color: '#9CA3AF' }} />
          <input
            type="text"
            placeholder="Buscar por nome ou CRM..."
            value={table.search}
            onChange={(e) => table.setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-[13px]"
          />
        </div>

      </div>

      {/* ========== Table (estilo v2) ========== */}
      <div className="tfd-table-wrap">
        <div className="overflow-x-auto">
          <table className="tfd-table">
            <thead>
              <tr>
                <SortableHeader
                  label="Nome"
                  sortDirection={table.getSortDirection('nome_completo')}
                  onSort={() => table.toggleSort('nome_completo')}
                />
                <SortableHeader
                  label="CRM"
                  className="hidden md:table-cell"
                  sortDirection={table.getSortDirection('crm')}
                  onSort={() => table.toggleSort('crm')}
                  filterOptions={ufFilterOptions}
                  activeFilters={table.getActiveFilters('crm_uf')}
                  onFilterChange={(values) => table.setColumnFilter('crm_uf', values)}
                />
                <SortableHeader
                  label="Especialidade"
                  className="hidden lg:table-cell"
                  sortDirection={table.getSortDirection('especialidade')}
                  onSort={() => table.toggleSort('especialidade')}
                  filterOptions={especialidadeFilterOptions}
                  activeFilters={table.getActiveFilters('especialidade')}
                  onFilterChange={(values) => table.setColumnFilter('especialidade', values)}
                />
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
              ) : items.length === 0 ? (
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
                items.map((item) => (
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

        {allFiltered.length > 0 && (
          <Pagination
            total={allFiltered.length}
            pageSize={table.pageSize}
            page={table.page}
            onPageChange={table.setPage}
            onPageSizeChange={table.setPageSize}
            recordLabel="médicos"
          />
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

        <LookupSelect
          categoria="especialidade"
          label="Especialidade"
          value={fEspecialidade}
          onChange={setFEspecialidade}
          valueField="nome"
        />

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
