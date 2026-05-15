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
import { useToast } from '@/shared/components/toast/Toast';
import { useSupabaseData } from '@/shared/hooks/useSupabaseData';
import { maskPhone } from '@/shared/pipes/formatters';
import SortableHeader from '@/shared/components/table/SortableHeader';
import { useTableControls } from '@/shared/hooks/useTableControls';

import {
  listarRegionaisSaude,
  buscarRegionalSaude,
  desativarRegionalSaude,
} from '@/services/regionais-saude.service';
import { Skeleton } from '@/components/ui/skeleton';
import { Can } from '@/shared/auth/Can';
import RegionalDrawer from './_RegionalDrawer';

/* -------------------------------------------------- */
/*  Wrapper                                            */
/* -------------------------------------------------- */

export default function RegionaisSaudePageWrapper() {
  return (
    <Suspense>
      <RegionaisSaudePage />
    </Suspense>
  );
}

function RegionaisSaudePage() {
  const toast = useToast();
  const router = useRouter();

  /* ---- Drawer state ---- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Record<string, unknown> | null>(null);

  /* ---- Deactivate confirmation ---- */
  const [deactivateConfirmId, setDeactivateConfirmId] = useState<string | null>(null);
  const [deactivateConfirmName, setDeactivateConfirmName] = useState('');

  /* ---- Data fetching ---- */
  const { data: regionaisRaw, loading, refresh } = useSupabaseData(
    () => listarRegionaisSaude({ pageSize: 1000 }),
    [],
  );

  /* ---- Table controls (search, sort, filter, pagination) ---- */
  const table = useTableControls({
    data: regionaisRaw as unknown as Record<string, unknown>[],
    searchFields: ['nome', 'codigo', 'municipio_sede'],
    dateField: 'created_at',
  });

  const items = table.paginated as unknown as Record<string, unknown>[];

  /* ---- Summary counters (derived from fetched data) ---- */
  const counts = { total: regionaisRaw.length, ativas: regionaisRaw.length };

  /* ---- Abrir drawer via query param ?editar=ID ---- */
  const searchParams = useSearchParams();
  const editarParam = searchParams.get('editar');
  const editarHandled = useRef<string | null>(null);

  useEffect(() => {
    if (editarParam && editarParam !== editarHandled.current && !loading && regionaisRaw.length > 0) {
      editarHandled.current = editarParam;
      const reg = regionaisRaw.find((r: Record<string, unknown>) => r.id === editarParam);
      if (reg) {
        handleOpenEdit(reg as Record<string, unknown>);
      } else {
        buscarRegionalSaude(editarParam).then(({ data }) => {
          if (data) handleOpenEdit(data as Record<string, unknown>);
        });
      }
      router.replace('/regionais-saude', { scroll: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editarParam, loading, regionaisRaw]);

  /* ---- Drawer handlers ---- */
  function handleOpenCreate() {
    setEditingId(null);
    setEditingData(null);
    setDrawerOpen(true);
  }

  function handleOpenEdit(reg: Record<string, unknown>) {
    setEditingId(reg.id as string);
    setEditingData(reg);
    setDrawerOpen(true);
  }

  function handleCloseDrawer() {
    setDrawerOpen(false);
    setEditingId(null);
    setEditingData(null);
  }

  function handleOpenDeactivate(reg: Record<string, unknown>) {
    setDeactivateConfirmId(reg.id as string);
    setDeactivateConfirmName((reg.nome as string) ?? 'Regional');
  }

  async function handleConfirmDeactivate() {
    if (!deactivateConfirmId) return;
    const result = await desativarRegionalSaude(deactivateConfirmId);
    if (result.error) {
      toast.error('Erro ao excluir', (result.error as { message?: string }).message ?? 'Erro desconhecido');
      return;
    }
    toast.success('Regional excluída', 'O registro foi desativado do sistema.');
    setDeactivateConfirmId(null);
    setDeactivateConfirmName('');
    refresh();
  }

  /* -------------------------------------------------- */
  /*  Render                                             */
  /* -------------------------------------------------- */

  return (
    <>
      <PageHeader
        title="Regionais"
        subtitle="Unidades Regionais de Saúde (URS) do estado do Maranhão"
        actions={
          <Can action="regionais_saude.criar">
            <button
              className="tfd-btn tfd-btn-primary"
              onClick={handleOpenCreate}
            >
              <Plus size={16} />
              Nova Regional
            </button>
          </Can>
        }
      />

      <StatsRow
        stats={[
          { label: 'Total de Regionais', value: counts.total },
          { label: 'Regionais Ativas', value: counts.ativas },
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
            placeholder="Buscar por nome, código ou sede..."
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
                  label="Código"
                  sortDirection={table.getSortDirection('codigo')}
                  onSort={() => table.toggleSort('codigo')}
                  filterOptions={table.getFilterOptions('codigo')}
                  activeFilters={table.getActiveFilters('codigo')}
                  onFilterChange={(v) => table.setColumnFilter('codigo', v)}
                />
                <SortableHeader
                  label="Nome"
                  sortDirection={table.getSortDirection('nome')}
                  onSort={() => table.toggleSort('nome')}
                />
                <SortableHeader
                  label="Sede"
                  className="hidden md:table-cell"
                  sortDirection={table.getSortDirection('municipio_sede')}
                  onSort={() => table.toggleSort('municipio_sede')}
                  filterOptions={table.getFilterOptions('municipio_sede')}
                  activeFilters={table.getActiveFilters('municipio_sede')}
                  onFilterChange={(v) => table.setColumnFilter('municipio_sede', v)}
                />
                <SortableHeader
                  label="Região"
                  className="hidden md:table-cell"
                  sortDirection={table.getSortDirection('regiao_nome')}
                  onSort={() => table.toggleSort('regiao_nome')}
                  filterOptions={table.getFilterOptions('regiao_nome', (row) =>
                    ((row.regiao as { nome?: string } | null)?.nome) ?? '')}
                  activeFilters={table.getActiveFilters('regiao_nome')}
                  onFilterChange={(v) => table.setColumnFilter('regiao_nome', v)}
                />
                <SortableHeader
                  label="Telefone"
                  className="hidden lg:table-cell"
                  sortDirection={table.getSortDirection('telefone')}
                  onSort={() => table.toggleSort('telefone')}
                />
                <SortableHeader
                  label="E-mail"
                  className="hidden lg:table-cell"
                  sortDirection={table.getSortDirection('email')}
                  onSort={() => table.toggleSort('email')}
                />
                <th className="w-[100px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`sk-${i}`}>
                    {Array.from({ length: 7 }).map((__, c) => (
                      <td key={c} className="px-4 py-3.5">
                        <Skeleton className={`h-4 ${c === 0 ? 'w-16' : c === 6 ? 'w-16 ml-auto' : 'w-32'}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <XCircle size={32} style={{ color: 'var(--tfd-text-muted)' }} />
                      <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Nenhuma regional encontrada</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((reg: Record<string, unknown>) => (
                  <tr
                    key={reg.id as string}
                    className="cursor-pointer"
                    onClick={() => router.push(`/regionais-saude/${reg.id}`)}
                  >
                    <td>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}
                      >
                        {reg.codigo as string}
                      </span>
                    </td>
                    <td className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                      {reg.nome as string}
                    </td>
                    <td className="hidden md:table-cell" style={{ color: 'var(--tfd-text-secondary)' }}>
                      {(reg.municipio_sede as string) || '\u2014'}
                    </td>
                    <td className="hidden md:table-cell">
                      {(() => {
                        const r = (reg.regiao as { nome?: string } | null) ?? null;
                        return r?.nome ? (
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: 'var(--tfd-surface-100, #F1F5F9)', color: 'var(--tfd-text-secondary)' }}
                          >
                            {r.nome}
                          </span>
                        ) : <span style={{ color: 'var(--tfd-text-muted)' }}>\u2014</span>;
                      })()}
                    </td>
                    <td className="hidden lg:table-cell" style={{ color: 'var(--tfd-text-secondary)' }}>
                      {(reg.telefone as string) ? maskPhone(reg.telefone as string) : '\u2014'}
                    </td>
                    <td className="hidden lg:table-cell" style={{ color: 'var(--tfd-text-secondary)' }}>
                      {(reg.email as string) || '\u2014'}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        <Can action="regionais_saude.editar">
                          <button
                            className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                            title="Editar"
                            onClick={(e) => { e.stopPropagation(); handleOpenEdit(reg as Record<string, unknown>); }}
                          >
                            <Pencil size={15} />
                          </button>
                        </Can>
                        <Can action="regionais_saude.excluir">
                          <button
                            className="tfd-btn tfd-btn-ghost tfd-btn--icon-only"
                            title="Excluir"
                            style={{ color: '#DC2626' }}
                            onClick={(e) => { e.stopPropagation(); handleOpenDeactivate(reg as Record<string, unknown>); }}
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
            recordLabel="regionais"
          />
        )}
      </div>

      {/* ========== Delete Confirmation Modal ========== */}
      <ConfirmDialog
        open={!!deactivateConfirmId}
        tone="delete"
        title="Excluir regional?"
        subject={deactivateConfirmName}
        description="Esta ação não pode ser desfeita."
        onClose={() => { setDeactivateConfirmId(null); setDeactivateConfirmName(''); }}
        onConfirm={handleConfirmDeactivate}
      />

      {/* ========== Drawer ========== */}
      <RegionalDrawer
        open={drawerOpen}
        editandoId={editingId}
        editandoData={editingData}
        onClose={handleCloseDrawer}
        onSaved={() => refresh()}
      />
    </>
  );
}
