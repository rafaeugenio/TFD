'use client';

import { useState } from 'react';
import {
  Search,
  FileSearch,
  Eye,
  Download,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  FileText,
  Calendar,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import SortableHeader from '@/shared/components/table/SortableHeader';
import Drawer from '@/shared/components/drawer/Drawer';
import { useToast } from '@/shared/components/toast/Toast';
import { useTableControls } from '@/shared/hooks/useTableControls';
import {
  ETAPA_LABELS,
  MOCK_DOCUMENTOS,
  type DocumentoConsulta,
} from '@/core/mocks/consulta-documentos.mock';

/* -------------------------------------------------- */
/*  Status styling                                     */
/* -------------------------------------------------- */

interface DocStatusStyle {
  bg: string;
  text: string;
}

const statusStyleMap: Record<string, DocStatusStyle> = {
  Rascunho: { bg: 'var(--tfd-surface-100)', text: 'var(--tfd-surface-600)' },
  Pendente: { bg: '#FEF3C7', text: '#92400E' },
  'Enviado p/ Rota': { bg: '#DBEAFE', text: '#1D4ED8' },
  'Em Aprovação': { bg: '#EDE9FE', text: '#6D28D9' },
  Reprovado: { bg: '#FEE2E2', text: '#B91C1C' },
  'Pendente c/ Gestor': { bg: '#FFF7ED', text: '#C2410C' },
  Aprovado: { bg: '#DCFCE7', text: '#15803D' },
};

/* -------------------------------------------------- */
/*  Helpers                                            */
/* -------------------------------------------------- */

function formatDateTime(iso: string): string {
  if (!iso) return '\u2014';
  const d = new Date(iso);
  const date = d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  });
  const time = d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Sao_Paulo',
  });
  return `${date} ${time}`;
}

function formatDateOnly(iso: string): string {
  if (!iso) return '\u2014';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  });
}

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function ConsultaDocumentosPage() {
  const toast = useToast();

  /* ---- Drawer state ---- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentoConsulta | null>(null);

  /* ---- Table controls (client-side search, filter, sort, pagination) ---- */
  const table = useTableControls({
    data: MOCK_DOCUMENTOS as unknown as Record<string, unknown>[],
    searchFields: ['numeroProcesso', 'paciente'],
    dateField: 'dataInclusao',
  });

  const items = table.paginated as unknown as DocumentoConsulta[];
  const allFiltered = table.filtered as unknown as DocumentoConsulta[];

  /* ---- Column filter options ---- */
  const tipoDocumentoFilterOptions = table.getFilterOptions('tipoDocumento');
  const tipoFormularioFilterOptions = table.getFilterOptions('tipoFormulario');
  const etapaFilterOptions = table.getFilterOptions('etapa').map((v) => ({
    value: v,
    label: ETAPA_LABELS[v] ?? v,
  }));
  const statusFilterOptions = table.getFilterOptions('status');

  /* ---- Actions ---- */
  function handleViewDoc(doc: DocumentoConsulta) {
    setSelectedDoc(doc);
    setDrawerOpen(true);
  }

  return (
    <>
      <PageHeader
        title="Consulta de Documentos"
        subtitle="Busca transversal unificada em todos os documentos e formulários do sistema TFD"
      />

      {/* ========== Toolbar ========== */}
      <div className="tfd-toolbar mb-4 flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search
            size={16}
            className="tfd-input-leading-icon"
            style={{ color: 'var(--tfd-text-muted)' }}
          />
          <input
            type="text"
            className="tfd-input tfd-input--sm tfd-input--with-leading-icon"
            placeholder="Buscar por processo, paciente..."
            value={table.search}
            onChange={(e) => table.setSearch(e.target.value)}
          />
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <Calendar size={14} style={{ color: 'var(--tfd-text-muted)', flexShrink: 0 }} />
          <input
            type="date"
            className="tfd-input tfd-input--sm"
            style={{ width: 'auto' }}
            value={table.dateStart}
            onChange={(e) => table.setDateStart(e.target.value)}
            title="Data início"
          />
          <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>até</span>
          <input
            type="date"
            className="tfd-input tfd-input--sm"
            style={{ width: 'auto' }}
            value={table.dateEnd}
            onChange={(e) => table.setDateEnd(e.target.value)}
            title="Data fim"
          />
        </div>

        {/* Result count + actions */}
        <div className="flex items-center gap-2 ml-auto">
          <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
            {allFiltered.length} resultado{allFiltered.length !== 1 && 's'}
          </p>
          <button
            type="button"
            className="tfd-btn tfd-btn-ghost tfd-btn--sm"
            disabled
            title="Exportação CSV — disponível em breve"
          >
            <Download size={15} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* ========== Table ========== */}
      <div className="tfd-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tfd-table">
            <thead>
              <tr>
                <SortableHeader
                  label="N° Processo"
                  sortDirection={table.getSortDirection('numeroProcesso')}
                  onSort={() => table.toggleSort('numeroProcesso')}
                />
                <SortableHeader
                  label="Paciente"
                  sortDirection={table.getSortDirection('paciente')}
                  onSort={() => table.toggleSort('paciente')}
                />
                <SortableHeader
                  label="Tipo Documento"
                  sortDirection={table.getSortDirection('tipoDocumento')}
                  onSort={() => table.toggleSort('tipoDocumento')}
                  filterOptions={tipoDocumentoFilterOptions}
                  activeFilters={table.getActiveFilters('tipoDocumento')}
                  onFilterChange={(v) => table.setColumnFilter('tipoDocumento', v)}
                />
                <SortableHeader
                  label="Formulário"
                  className="hidden lg:table-cell"
                  sortDirection={table.getSortDirection('tipoFormulario')}
                  onSort={() => table.toggleSort('tipoFormulario')}
                  filterOptions={tipoFormularioFilterOptions}
                  activeFilters={table.getActiveFilters('tipoFormulario')}
                  onFilterChange={(v) => table.setColumnFilter('tipoFormulario', v)}
                />
                <SortableHeader
                  label="Etapa"
                  className="hidden md:table-cell"
                  sortDirection={table.getSortDirection('etapa')}
                  onSort={() => table.toggleSort('etapa')}
                  filterOptions={etapaFilterOptions}
                  activeFilters={table.getActiveFilters('etapa')}
                  onFilterChange={(v) => table.setColumnFilter('etapa', v)}
                />
                <SortableHeader
                  label="Status"
                  sortDirection={table.getSortDirection('status')}
                  onSort={() => table.toggleSort('status')}
                  filterOptions={statusFilterOptions}
                  activeFilters={table.getActiveFilters('status')}
                  onFilterChange={(v) => table.setColumnFilter('status', v)}
                />
                <SortableHeader
                  label="Data Inclusão"
                  className="hidden lg:table-cell"
                  sortDirection={table.getSortDirection('dataInclusao')}
                  onSort={() => table.toggleSort('dataInclusao')}
                />
                <SortableHeader
                  label="Incluído por"
                  className="hidden xl:table-cell"
                />
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <FileSearch size={32} style={{ color: 'var(--tfd-text-muted)' }} />
                      <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                        Nenhum documento encontrado
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((doc) => {
                  const style = statusStyleMap[doc.status] ?? { bg: 'var(--tfd-surface-100)', text: 'var(--tfd-surface-600)' };
                  return (
                    <tr key={doc.id}>
                      <td>
                        <span className="font-medium text-sm" style={{ color: 'var(--tfd-primary-500)' }}>
                          {doc.numeroProcesso}
                        </span>
                      </td>
                      <td>
                        <span className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>
                          {doc.paciente}
                        </span>
                      </td>
                      <td>
                        <span className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
                          {doc.tipoDocumento}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell">
                        <span className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
                          {doc.tipoFormulario}
                        </span>
                      </td>
                      <td className="hidden md:table-cell">
                        <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                          {ETAPA_LABELS[doc.etapa] ?? doc.etapa}
                        </span>
                      </td>
                      <td>
                        <span
                          className="tfd-tag tfd-tag--rounded"
                          style={{ backgroundColor: style.bg, color: style.text }}
                        >
                          {doc.status}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell">
                        <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                          {formatDateTime(doc.dataInclusao)}
                        </span>
                      </td>
                      <td className="hidden xl:table-cell">
                        <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                          {doc.incluidoPor}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="tfd-btn tfd-btn-ghost tfd-btn--sm tfd-btn--icon-only"
                            title="Visualizar"
                            onClick={() => handleViewDoc(doc)}
                          >
                            <Eye size={15} />
                          </button>
                          {doc.possuiArquivo && (
                            <button
                              type="button"
                              className="tfd-btn tfd-btn-ghost tfd-btn--sm tfd-btn--icon-only"
                              title="Download"
                              onClick={() => toast.info('Download iniciado')}
                            >
                              <Download size={15} />
                            </button>
                          )}
                          <button
                            type="button"
                            className="tfd-btn tfd-btn-ghost tfd-btn--sm tfd-btn--icon-only"
                            title="Ir para processo"
                            onClick={() => toast.info(`Navegando para ${doc.numeroProcesso}`)}
                          >
                            <ExternalLink size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {table.totalPages > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid var(--tfd-surface-border)' }}
          >
            <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
              Página {table.page} de {table.totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                className="tfd-btn tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only"
                disabled={table.page <= 1}
                onClick={() => table.setPage(Math.max(1, table.page - 1))}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                className="tfd-btn tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only"
                disabled={table.page >= table.totalPages}
                onClick={() => table.setPage(Math.min(table.totalPages, table.page + 1))}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ========== Preview Drawer ========== */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={selectedDoc ? `${selectedDoc.tipoDocumento}` : 'Documento'}
        subtitle={selectedDoc ? `Processo ${selectedDoc.numeroProcesso}` : ''}
        width="520px"
        footer={
          <div className="flex items-center gap-2">
            {selectedDoc?.possuiArquivo && (
              <button
                type="button"
                className="tfd-btn tfd-btn-secondary"
                onClick={() => toast.info('Download iniciado')}
              >
                <Download size={15} />
                Download
              </button>
            )}
            <button
              type="button"
              className="tfd-btn tfd-btn-primary"
              onClick={() => {
                toast.info(`Navegando para ${selectedDoc?.numeroProcesso}`);
                setDrawerOpen(false);
              }}
            >
              <ExternalLink size={15} />
              Ir para Processo
            </button>
          </div>
        }
      >
        {selectedDoc && (
          <div className="space-y-5">
            {/* Status tag */}
            <div className="flex items-center gap-2">
              {(() => {
                const style = statusStyleMap[selectedDoc.status] ?? { bg: 'var(--tfd-surface-100)', text: 'var(--tfd-surface-600)' };
                return (
                  <span
                    className="tfd-tag tfd-tag--rounded"
                    style={{ backgroundColor: style.bg, color: style.text }}
                  >
                    {selectedDoc.status}
                  </span>
                );
              })()}
              <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                {formatDateTime(selectedDoc.dataInclusao)}
              </span>
            </div>

            <div className="tfd-divider" />

            {/* Detail fields */}
            <div className="space-y-3">
              {[
                { label: 'Paciente', value: selectedDoc.paciente },
                { label: 'N° Processo', value: selectedDoc.numeroProcesso },
                { label: 'Tipo de Documento', value: selectedDoc.tipoDocumento },
                { label: 'Tipo de Formulário', value: selectedDoc.tipoFormulario },
                { label: 'Etapa', value: ETAPA_LABELS[selectedDoc.etapa] ?? selectedDoc.etapa },
                { label: 'Data de Inclusão', value: formatDateOnly(selectedDoc.dataInclusao) },
                { label: 'Incluído por', value: selectedDoc.incluidoPor },
              ].map((field) => (
                <div key={field.label}>
                  <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--tfd-text-muted)' }}>
                    {field.label}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--tfd-text-primary)' }}>
                    {field.value}
                  </p>
                </div>
              ))}
            </div>

            {/* File preview placeholder */}
            {selectedDoc.possuiArquivo && (
              <>
                <div className="tfd-divider" />
                <div
                  className="rounded-md flex items-center justify-center py-12"
                  style={{ backgroundColor: 'var(--tfd-surface-50)', border: '1px dashed var(--tfd-surface-border)' }}
                >
                  <div className="text-center">
                    <FileText size={32} className="mx-auto mb-2" style={{ color: 'var(--tfd-text-muted)' }} />
                    <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                      Preview do documento
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--tfd-text-muted)' }}>
                      (Integração com visualizador pendente)
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </Drawer>
    </>
  );
}
