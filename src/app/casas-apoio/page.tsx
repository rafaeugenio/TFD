'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search, Pencil, Trash2, XCircle } from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import StatsRow from '@/shared/components/stats-row/StatsRow';
import Pagination from '@/shared/components/pagination/Pagination';
import { useToast } from '@/shared/components/toast/Toast';
import { usePermissions } from '@/shared/auth/PermissionsProvider';
import SortableHeader from '@/shared/components/table/SortableHeader';
import { useTableControls } from '@/shared/hooks/useTableControls';
import { useCasasApoio } from '@/app/fluxo-v2/_state/servicoSocialStore';
import type { CasaApoioMock } from '@/core/mocks/servico-social-seed';
import CasaApoioDrawer from './_CasaApoioDrawer';
import ExcluirCasaDialog from './_ExcluirCasaDialog';

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function CasasApoioPageWrapper() {
  return (
    <Suspense>
      <CasasApoioPage />
    </Suspense>
  );
}

/**
 * Cadastro de casas de apoio, no mesmo fluxo de Unidades de Saúde e
 * Regionais: tabela com busca, ordenação e filtro por coluna, detalhe ao
 * clicar na linha, drawer para cadastrar e editar, e exclusão com
 * confirmação. Casa vinculada a unidade de saúde ou a instrumento social
 * mostra um aviso antes de excluir, sem impedir a exclusão.
 */
function CasasApoioPage() {
  const router = useRouter();
  const toast = useToast();
  const casas = useCasasApoio();
  const { can } = usePermissions();
  const podeCriar = can('casa_apoio.criar');
  const podeEditar = can('casa_apoio.editar');
  const podeExcluir = can('casa_apoio.excluir');

  /* ---- Drawer state ---- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CasaApoioMock | null>(null);

  /* ---- Delete confirmation state ---- */
  const [excluindo, setExcluindo] = useState<CasaApoioMock | null>(null);

  const linhas = useMemo(
    () => casas.map((c) => ({ ...c, unidade: c.unidadeVinculadaNome ?? '', cidade: c.cidadeUf ?? '' })) as unknown as Record<string, unknown>[],
    [casas],
  );

  /* ---- Table controls (client-side search, sort, filter, pagination) ---- */
  const table = useTableControls({ data: linhas, searchFields: ['nome', 'responsavel', 'cidade', 'descricao'] });
  const items = table.paginated as unknown as (CasaApoioMock & { unidade: string; cidade: string })[];
  const cidadeFilterOptions = table.getFilterOptions('cidade');

  /* ---- Abrir drawer via query param ?editar=ID (vindo do detalhe) ---- */
  const searchParams = useSearchParams();
  const editarParam = searchParams.get('editar');
  const editarHandled = useRef<string | null>(null);
  useEffect(() => {
    if (editarParam && editarParam !== editarHandled.current && podeEditar) {
      const casa = casas.find((c) => c.id === editarParam);
      if (!casa) return;
      editarHandled.current = editarParam;
      setEditing(casa);
      setDrawerOpen(true);
      router.replace('/casas-apoio', { scroll: false });
    }
  }, [editarParam, casas, router, podeEditar]);

  function handleOpenCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }

  function handleOpenEdit(casa: CasaApoioMock) {
    setEditing(casa);
    setDrawerOpen(true);
  }

  const comUnidade = casas.filter((c) => c.unidadeVinculadaId).length;

  return (
    <>
      <PageHeader
        title="Casas de Apoio"
        subtitle="Gerenciamento das casas de apoio usadas nos encaminhamentos do Serviço Social"
        actions={
          podeCriar ? (
            <button className="tfd-btn tfd-btn-primary" onClick={handleOpenCreate}>
              <Plus size={16} />
              Nova Casa de Apoio
            </button>
          ) : undefined
        }
      />

      <StatsRow
        stats={[
          { label: 'Total de Casas', value: casas.length },
          { label: 'Com Unidade Vinculada', value: comUnidade },
        ]}
      />

      {/* ========== Toolbar ========== */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div
          className="flex items-center gap-2 px-3"
          style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8, height: 36, minWidth: 280 }}
        >
          <Search size={14} style={{ color: '#9CA3AF' }} />
          <input
            type="text"
            placeholder="Buscar por nome, responsável, cidade ou descrição..."
            value={table.search}
            onChange={(e) => table.setSearch(e.target.value)}
            className="flex-1 bg-transparent outline-none text-[13px]"
          />
        </div>
      </div>

      {/* ========== Table ========== */}
      <div className="tfd-table-wrap">
        <div className="overflow-x-auto">
          <table className="tfd-table">
            <thead>
              <tr>
                <SortableHeader label="Nome" sortDirection={table.getSortDirection('nome')} onSort={() => table.toggleSort('nome')} />
                <SortableHeader
                  label="Cidade/UF"
                  className="hidden md:table-cell"
                  sortDirection={table.getSortDirection('cidade')}
                  onSort={() => table.toggleSort('cidade')}
                  filterOptions={cidadeFilterOptions}
                  activeFilters={table.getActiveFilters('cidade')}
                  onFilterChange={(v) => table.setColumnFilter('cidade', v)}
                />
                <SortableHeader label="Responsável" className="hidden lg:table-cell" sortDirection={table.getSortDirection('responsavel')} onSort={() => table.toggleSort('responsavel')} />
                <th className="hidden md:table-cell">Contato</th>
                <SortableHeader label="Unidade Vinculada" className="hidden xl:table-cell" sortDirection={table.getSortDirection('unidade')} onSort={() => table.toggleSort('unidade')} />
                <th className="w-[100px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <XCircle size={32} style={{ color: 'var(--tfd-text-muted)' }} />
                      <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Nenhuma casa de apoio encontrada</p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((c) => (
                  <tr key={c.id} className="cursor-pointer" onClick={() => router.push(`/casas-apoio/${c.id}`)}>
                    <td className="max-w-[260px] truncate font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{c.nome}</td>
                    <td className="hidden md:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>{c.cidadeUf || '—'}</td>
                    <td className="hidden lg:table-cell" style={{ color: 'var(--tfd-text-secondary)' }}>{c.responsavel || '—'}</td>
                    <td className="hidden md:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>{c.contato || '—'}</td>
                    <td className="hidden xl:table-cell max-w-[220px] truncate" style={{ color: 'var(--tfd-text-secondary)' }}>{c.unidadeVinculadaNome || '—'}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        {podeEditar && (
                          <button className="tfd-btn tfd-btn-ghost tfd-btn--icon-only" title="Editar" aria-label={`Editar ${c.nome}`} onClick={(e) => { e.stopPropagation(); handleOpenEdit(c); }}>
                            <Pencil size={15} />
                          </button>
                        )}
                        {podeExcluir && (
                          <button className="tfd-btn tfd-btn-ghost tfd-btn--icon-only" title="Excluir" aria-label={`Excluir ${c.nome}`} style={{ color: '#DC2626' }} onClick={(e) => { e.stopPropagation(); setExcluindo(c); }}>
                            <Trash2 size={15} />
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

        {table.filtered.length > 0 && (
          <Pagination
            total={table.filtered.length}
            pageSize={table.pageSize}
            page={table.page}
            onPageChange={table.setPage}
            onPageSizeChange={table.setPageSize}
            recordLabel="casas de apoio"
          />
        )}
      </div>

      <ExcluirCasaDialog
        casa={excluindo}
        onClose={() => setExcluindo(null)}
        onExcluida={(nome) => toast.success('Casa de apoio excluída', `${nome} foi removida do cadastro.`)}
      />

      <CasaApoioDrawer open={drawerOpen} casa={editing} onClose={() => { setDrawerOpen(false); setEditing(null); }} />
    </>
  );
}
