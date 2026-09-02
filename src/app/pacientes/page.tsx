'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  XCircle,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import StatsRow from '@/shared/components/stats-row/StatsRow';
import Pagination from '@/shared/components/pagination/Pagination';
import ConfirmDialog from '@/shared/components/confirm-dialog/ConfirmDialog';
import SortableHeader from '@/shared/components/table/SortableHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { Can } from '@/shared/auth/Can';
import { useToast } from '@/shared/components/toast/Toast';
import { useSupabaseData } from '@/shared/hooks/useSupabaseData';
import { useTableControls } from '@/shared/hooks/useTableControls';
import { formatCPF, maskPhone } from '@/shared/pipes/formatters';

import IdadeBadge from '@/shared/components/idade-badge';
import PacienteDrawer from './_PacienteDrawer';

import { listarPacientes, buscarPaciente, atualizarPaciente } from '@/services/pacientes.service';

/* -------------------------------------------------- */
/*  Constants & helpers                                */
/* -------------------------------------------------- */

const ITEMS_PER_PAGE = 10;


function formatDateBR(iso: string): string {
  if (!iso) return '\u2014';
  const datePart = iso.includes('T') ? iso.split('T')[0] : iso;
  const [year, month, day] = datePart.split('-');
  return `${day}/${month}/${year}`;
}


/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function PacientesPageWrapper() {
  return (
    <Suspense>
      <PacientesPage />
    </Suspense>
  );
}

function PacientesPage() {
  const toast = useToast();
  const router = useRouter();

  /* ---- Drawer state ---- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Record<string, unknown> | null>(null);

  /* ---- Delete confirmation state ---- */
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

  /* ---- Data fetching via Supabase (fetch all, filter client-side) ---- */
  const { data: pacientesRaw, loading, refresh } = useSupabaseData(
    () => listarPacientes({ pageSize: 9999 }),
    [],
  );

  /* ---- Table controls (search, sort, filter, pagination) ---- */
  const table = useTableControls({
    data: pacientesRaw as unknown as Record<string, unknown>[],
    searchFields: ['nome_completo', 'cpf', 'cns'],
    dateField: 'created_at',
    pageSize: ITEMS_PER_PAGE,
  });

  /* ---- Summary counters (derived from raw data) ---- */
  const counts = { total: pacientesRaw.length, ativos: pacientesRaw.length };

  /* ---- Abrir drawer via query param ?editar=ID ---- */
  const searchParams = useSearchParams();
  const editarParam = searchParams.get('editar');
  const editarHandled = useRef<string | null>(null);

  useEffect(() => {
    if (editarParam && editarParam !== editarHandled.current && !loading && pacientesRaw.length > 0) {
      editarHandled.current = editarParam;
      const pac = pacientesRaw.find((p: Record<string, unknown>) => p.id === editarParam);
      if (pac) {
        handleOpenEdit(pac as Record<string, unknown>);
      } else {
        // Busca direto no banco se não está na página atual
        buscarPaciente(editarParam).then(({ data }) => {
          if (data) handleOpenEdit(data as Record<string, unknown>);
        });
      }
      // Limpa o query param da URL sem recarregar
      router.replace('/pacientes', { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editarParam, loading, pacientesRaw]);

  /* -------------------------------------------------- */
  /*  Drawer handlers                                   */
  /* -------------------------------------------------- */

  function handleOpenCreate() {
    setEditingId(null);
    setEditingData(null);
    setDrawerOpen(true);
  }

  function handleOpenEdit(pac: Record<string, unknown>) {
    setEditingId(pac.id as string);
    setEditingData(pac);
    setDrawerOpen(true);
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
    setEditingId(null);
    setEditingData(null);
  }

  function handleOpenDelete(pac: Record<string, unknown>) {
    setDeleteConfirmId(pac.id as string);
    setDeleteConfirmName((pac.nome_completo as string) ?? 'Paciente');
  }

  async function handleConfirmDelete() {
    if (!deleteConfirmId) return;
    try {
      const result = await atualizarPaciente(deleteConfirmId, { ativo: false } as any);
      if (result.error) {
        toast.error('Erro ao excluir', (result.error as { message?: string }).message ?? 'Erro desconhecido');
        return;
      }
      toast.success('Paciente excluido', 'O registro foi desativado do sistema.');
      setDeleteConfirmId(null);
      setDeleteConfirmName('');
      refresh();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error('Erro inesperado', e.message ?? 'Tente novamente');
    }
  }


  /* -------------------------------------------------- */
  /*  Render                                            */
  /* -------------------------------------------------- */

  return (
    <>
      <PageHeader
        title="Pacientes"
        subtitle="Gerenciamento de pacientes TFD"
        actions={
          <Can action="pacientes.criar">
            <button className="tfd-btn tfd-btn-primary" onClick={handleOpenCreate}>
              <Plus size={16} />
              Novo Paciente
            </button>
          </Can>
        }
      />

      <StatsRow
        stats={[
          { label: 'Total de Pacientes', value: counts.total },
          { label: 'Pacientes Ativos', value: counts.ativos },
          { label: 'Com Processo Ativo', value: '\u2014' },
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
            placeholder="Buscar por nome, CPF ou CNS..."
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
                  label="CPF"
                  className="hidden md:table-cell"
                  sortDirection={table.getSortDirection('cpf')}
                  onSort={() => table.toggleSort('cpf')}
                />
                <SortableHeader
                  label="CNS"
                  className="hidden lg:table-cell"
                  sortDirection={table.getSortDirection('cns')}
                  onSort={() => table.toggleSort('cns')}
                />
                <SortableHeader
                  label="Municipio"
                  className="hidden lg:table-cell"
                  sortDirection={table.getSortDirection('municipio')}
                  onSort={() => table.toggleSort('municipio')}
                  filterOptions={table.getFilterOptions('municipio')}
                  activeFilters={table.getActiveFilters('municipio')}
                  onFilterChange={(values) => table.setColumnFilter('municipio', values)}
                />
                <SortableHeader
                  label="Telefone"
                  className="hidden md:table-cell"
                  sortDirection={table.getSortDirection('telefone_celular')}
                  onSort={() => table.toggleSort('telefone_celular')}
                />
                <SortableHeader
                  label="Data Cadastro"
                  className="hidden md:table-cell"
                  sortDirection={table.getSortDirection('created_at')}
                  onSort={() => table.toggleSort('created_at')}
                />
                <th className="w-[100px]">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`}>
                    {Array.from({ length: 7 }).map((__, c) => (
                      <td key={c} className="px-4 py-3.5">
                        <Skeleton className={`h-4 ${c === 0 ? 'w-48' : c === 6 ? 'w-16 ml-auto' : 'w-28'}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (table.paginated as unknown as Record<string, unknown>[]).length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <XCircle size={32} style={{ color: 'var(--tfd-text-muted)' }} />
                      <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                        Nenhum paciente encontrado
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                (table.paginated as unknown as Record<string, unknown>[]).map((pac: Record<string, unknown>) => (
                  <tr key={pac.id as string} className="cursor-pointer" onClick={() => router.push(`/pacientes/${pac.id}`)}>
                    <td className="max-w-[260px] font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                      <div className="flex items-center gap-2">
                        <span className="truncate">{pac.nome_completo as string}</span>
                        <IdadeBadge dataNascimento={pac.data_nascimento as string} />
                      </div>
                    </td>
                    <td className="hidden md:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>
                      {formatCPF((pac.cpf as string) ?? '')}
                    </td>
                    <td className="hidden lg:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>
                      {(pac.cns as string) || '\u2014'}
                    </td>
                    <td className="hidden lg:table-cell" style={{ color: 'var(--tfd-text-secondary)' }}>
                      {(pac.municipio as string) || '\u2014'}
                    </td>
                    <td className="hidden md:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>
                      {(pac.telefone_celular as string) ? maskPhone(pac.telefone_celular as string) : '\u2014'}
                    </td>
                    <td className="hidden md:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>
                      {formatDateBR(pac.created_at as string)}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Can action="pacientes.editar">
                          <button
                            className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                            title="Editar"
                            onClick={(e) => { e.stopPropagation(); handleOpenEdit(pac); }}
                          >
                            <Pencil size={15} />
                          </button>
                        </Can>
                        <Can action="pacientes.excluir">
                          <button
                            className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                            title="Excluir"
                            style={{ color: '#DC2626' }}
                            onClick={(e) => { e.stopPropagation(); handleOpenDelete(pac); }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </Can>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {table.filtered.length > 0 && (
          <Pagination
            total={table.filtered.length}
            pageSize={table.pageSize}
            page={table.page}
            onPageChange={table.setPage}
            onPageSizeChange={table.setPageSize}
            recordLabel="pacientes"
          />
        )}
      </div>

      {/* ========== Delete Confirmation Modal ========== */}
      <ConfirmDialog
        open={!!deleteConfirmId}
        tone="delete"
        title="Excluir paciente?"
        subject={deleteConfirmName}
        description="O paciente sai da listagem. Para reativar, cadastre novamente com o mesmo CPF."
        onClose={() => { setDeleteConfirmId(null); setDeleteConfirmName(''); }}
        onConfirm={handleConfirmDelete}
      />

      {/* ========== Patient Drawer (extraído) ========== */}
      <PacienteDrawer
        open={drawerOpen}
        editandoId={editingId}
        editandoData={editingData}
        onClose={handleCloseDrawer}
        onSaved={() => refresh()}
      />
    </>
  );
}
