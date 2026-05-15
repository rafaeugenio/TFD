'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
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
import { useToast } from '@/shared/components/toast/Toast';
import { useSupabaseData } from '@/shared/hooks/useSupabaseData';
import { maskPhone } from '@/shared/pipes/formatters';
import SortableHeader from '@/shared/components/table/SortableHeader';
import { useTableControls } from '@/shared/hooks/useTableControls';
import { Skeleton } from '@/components/ui/skeleton';
import { Can } from '@/shared/auth/Can';
import UnidadeDrawer from './_UnidadeDrawer';

import {
  listarUnidadesSaude,
  buscarUnidadeSaude,
  desativarUnidadeSaude,
} from '@/services/unidades-saude.service';

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function UnidadesSaudePageWrapper() {
  return (
    <Suspense>
      <UnidadesSaudePage />
    </Suspense>
  );
}

function UnidadesSaudePage() {
  const toast = useToast();
  const router = useRouter();

  /* ---- Drawer state ---- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Record<string, unknown> | null>(null);

  /* ---- Deactivate confirmation state ---- */
  const [deactivateConfirmId, setDeactivateConfirmId] = useState<string | null>(null);
  const [deactivateConfirmName, setDeactivateConfirmName] = useState('');

  /* ---- Data fetching via Supabase ---- */
  const { data: unidades, loading, refresh } = useSupabaseData(
    () => listarUnidadesSaude({ pageSize: 1000 }),
    [],
  );

  /* ---- Table controls (client-side search, sort, filter, pagination) ---- */
  const table = useTableControls({
    data: unidades as unknown as Record<string, unknown>[],
    searchFields: ['nome', 'cnes'],
    dateField: 'created_at',
  });

  const items = table.paginated as unknown as Record<string, unknown>[];
  const tipoFilterOptions = table.getFilterOptions('tipo');

  /* ---- Summary counters ---- */
  const [counts, setCounts] = useState({ total: 0, ativas: 0 });

  const refreshCounts = useCallback(() => {
    listarUnidadesSaude({ pageSize: 1 }).then(({ count }) => {
      const total = count ?? 0;
      setCounts({ total, ativas: total });
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
    if (editarParam && editarParam !== editarHandled.current && !loading && unidades.length > 0) {
      editarHandled.current = editarParam;
      const uni = unidades.find((u: Record<string, unknown>) => u.id === editarParam);
      if (uni) {
        handleOpenEdit(uni as Record<string, unknown>);
      } else {
        buscarUnidadeSaude(editarParam).then(({ data }) => {
          if (data) handleOpenEdit(data as Record<string, unknown>);
        });
      }
      router.replace('/unidades-saude', { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editarParam, loading, unidades]);

  /* ---- Drawer handlers ---- */
  function handleOpenCreate() {
    setEditingId(null);
    setEditingData(null);
    setDrawerOpen(true);
  }

  function handleOpenEdit(uni: Record<string, unknown>) {
    setEditingId(uni.id as string);
    setEditingData(uni);
    setDrawerOpen(true);
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
    setEditingId(null);
    setEditingData(null);
  }

  function handleOpenDeactivate(uni: Record<string, unknown>) {
    setDeactivateConfirmId(uni.id as string);
    setDeactivateConfirmName((uni.nome as string) ?? 'Unidade');
  }

  async function handleConfirmDeactivate() {
    if (!deactivateConfirmId) return;
    try {
      const result = await desativarUnidadeSaude(deactivateConfirmId);
      if (result.error) {
        toast.error('Erro ao excluir', (result.error as { message?: string }).message ?? 'Erro desconhecido');
        return;
      }
      toast.success('Unidade excluída', 'O registro foi desativado do sistema.');
      setDeactivateConfirmId(null);
      setDeactivateConfirmName('');
      refresh();
      refreshCounts();
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast.error('Erro inesperado', e.message ?? 'Tente novamente');
    }
  }


  /* -------------------------------------------------- */
  /*  Render                                             */
  /* -------------------------------------------------- */

  return (
    <>
      <PageHeader
        title="Unidades de Saúde"
        subtitle="Gerenciamento de unidades de saúde de destino TFD"
        actions={
          <Can action="unidades_saude.criar">
            <button className="tfd-btn tfd-btn-primary" onClick={handleOpenCreate}>
              <Plus size={16} />
              Nova Unidade
            </button>
          </Can>
        }
      />

      <StatsRow
        stats={[
          { label: 'Total de Unidades', value: counts.total },
          { label: 'Unidades Ativas', value: counts.ativas },
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
            placeholder="Buscar por nome ou CNES..."
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
                  sortDirection={table.getSortDirection('nome')}
                  onSort={() => table.toggleSort('nome')}
                />
                <SortableHeader
                  label="CNES"
                  className="hidden md:table-cell"
                  sortDirection={table.getSortDirection('cnes')}
                  onSort={() => table.toggleSort('cnes')}
                />
                <SortableHeader
                  label="Tipo"
                  className="hidden lg:table-cell"
                  sortDirection={table.getSortDirection('tipo')}
                  onSort={() => table.toggleSort('tipo')}
                  filterOptions={tipoFilterOptions}
                  activeFilters={table.getActiveFilters('tipo')}
                  onFilterChange={(v) => table.setColumnFilter('tipo', v)}
                />
                <SortableHeader
                  label="Município"
                  className="hidden xl:table-cell"
                  sortDirection={table.getSortDirection('municipio')}
                  onSort={() => table.toggleSort('municipio')}
                />
                <th className="hidden md:table-cell">Telefone</th>
                <th className="w-[100px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`}>
                    {Array.from({ length: 6 }).map((__, c) => (
                      <td key={c} className="px-4 py-3.5">
                        <Skeleton className={`h-4 ${c === 0 ? 'w-48' : c === 5 ? 'w-16 ml-auto' : 'w-28'}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <XCircle size={32} style={{ color: 'var(--tfd-text-muted)' }} />
                      <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                        Nenhuma unidade encontrada
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((uni: Record<string, unknown>) => (
                    <tr key={uni.id as string} className="cursor-pointer" onClick={() => router.push(`/unidades-saude/${uni.id}`)}>
                      <td className="max-w-[200px] truncate font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                        {uni.nome as string}
                      </td>
                      <td className="hidden md:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>
                        {(uni.cnes as string) || '\u2014'}
                      </td>
                      <td className="hidden lg:table-cell" style={{ color: 'var(--tfd-text-secondary)' }}>
                        {(uni.tipo as string) || '\u2014'}
                      </td>
                      <td className="hidden xl:table-cell" style={{ color: 'var(--tfd-text-secondary)' }}>
                        {(uni.municipio as string) || (uni.cidade as string) || '\u2014'}
                      </td>
                      <td className="hidden md:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>
                        {(uni.telefone as string) ? maskPhone(uni.telefone as string) : '\u2014'}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Can action="unidades_saude.editar">
                            <button
                              className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                              title="Editar"
                              onClick={(e) => { e.stopPropagation(); handleOpenEdit(uni as Record<string, unknown>); }}
                            >
                              <Pencil size={15} />
                            </button>
                          </Can>
                          <Can action="unidades_saude.excluir">
                            <button
                              className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                              title="Excluir"
                              style={{ color: '#DC2626' }}
                              onClick={(e) => { e.stopPropagation(); handleOpenDeactivate(uni as Record<string, unknown>); }}
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

        {!loading && table.filtered.length > 0 && (
          <Pagination
            total={table.filtered.length}
            pageSize={table.pageSize}
            page={table.page}
            onPageChange={table.setPage}
            onPageSizeChange={table.setPageSize}
            recordLabel="unidades"
          />
        )}
      </div>

      {/* ========== Delete Confirmation Modal ========== */}
      <ConfirmDialog
        open={!!deactivateConfirmId}
        tone="delete"
        title="Excluir unidade?"
        subject={deactivateConfirmName}
        description="Esta ação não pode ser desfeita."
        onClose={() => { setDeactivateConfirmId(null); setDeactivateConfirmName(''); }}
        onConfirm={handleConfirmDeactivate}
      />

      {/* ========== Unidade Drawer (extraído) ========== */}
      <UnidadeDrawer
        open={drawerOpen}
        editandoId={editingId}
        editandoData={editingData}
        onClose={handleCloseDrawer}
        onSaved={() => { refresh(); refreshCounts(); }}
      />
    </>
  );
}
