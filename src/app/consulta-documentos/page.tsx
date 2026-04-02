'use client';

import { useState, useMemo } from 'react';
import {
  Search,
  FileSearch,
  Eye,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import Drawer from '@/shared/components/drawer/Drawer';
import { useToast } from '@/shared/components/toast/Toast';
import { consultarDocumentos, type FiltrosConsultaDocumentos } from '@/services/consulta-documentos.service';
import {
  TIPOS_FORMULARIO,
  TIPOS_DOCUMENTO,
  ETAPAS,
  STATUS_LEGADO,
  ETAPA_LABELS,
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

const ITEMS_PER_PAGE = 20;

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

  /* ---- Filter state ---- */
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [tipoFormulario, setTipoFormulario] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('');
  const [etapa, setEtapa] = useState('');
  const [statusChecked, setStatusChecked] = useState<string[]>([...STATUS_LEGADO]);
  const [pacienteBusca, setPacienteBusca] = useState('');
  const [numeroProcesso, setNumeroProcesso] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  /* ---- Results state ---- */
  const [results, setResults] = useState<DocumentoConsulta[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);

  /* ---- Drawer state ---- */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentoConsulta | null>(null);

  /* ---- Validation ---- */
  const periodoValido = dataInicio !== '' && dataFim !== '';
  const periodoExcede12Meses = useMemo(() => {
    if (!dataInicio || !dataFim) return false;
    const d1 = new Date(dataInicio);
    const d2 = new Date(dataFim);
    const diffMonths = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
    return diffMonths > 12;
  }, [dataInicio, dataFim]);

  const canSearch = periodoValido && !periodoExcede12Meses;

  /* ---- Search handler ---- */
  async function handleSearch(newPage = 1) {
    if (!canSearch) return;
    setLoading(true);
    setPage(newPage);

    const filtros: FiltrosConsultaDocumentos = {
      dataInicio,
      dataFim,
      tipoFormulario: tipoFormulario || undefined,
      tipoDocumento: tipoDocumento || undefined,
      etapa: etapa || undefined,
      statusList: statusChecked.length < STATUS_LEGADO.length ? statusChecked : undefined,
      pacienteBusca: pacienteBusca || undefined,
      numeroProcesso: numeroProcesso || undefined,
      page: newPage,
      pageSize: ITEMS_PER_PAGE,
    };

    const { data, count, error } = await consultarDocumentos(filtros);
    if (error) {
      toast.error('Erro ao consultar documentos');
    }
    setResults(data);
    setTotalCount(count);
    setSearched(true);
    setLoading(false);
  }

  function handleClearFilters() {
    setDataInicio('');
    setDataFim('');
    setTipoFormulario('');
    setTipoDocumento('');
    setEtapa('');
    setStatusChecked([...STATUS_LEGADO]);
    setPacienteBusca('');
    setNumeroProcesso('');
    setResults([]);
    setTotalCount(0);
    setSearched(false);
    setPage(1);
  }

  function toggleStatus(s: string) {
    setStatusChecked((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  function handleViewDoc(doc: DocumentoConsulta) {
    setSelectedDoc(doc);
    setDrawerOpen(true);
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  /* ---- Pagination range ---- */
  const startItem = (page - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(page * ITEMS_PER_PAGE, totalCount);

  return (
    <>
      <PageHeader
        title="Consulta de Documentos"
        subtitle="Busca transversal unificada em todos os documentos e formulários do sistema TFD"
      />

      {/* ═══ Filter Panel ═══ */}
      <div className="tfd-card mb-6">
        {/* Main filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="tfd-label">Data Início *</label>
            <input
              type="date"
              className="tfd-input"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
            />
          </div>
          <div>
            <label className="tfd-label">Data Fim *</label>
            <input
              type="date"
              className="tfd-input"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
            />
          </div>
          <div>
            <label className="tfd-label">Tipo de Formulário</label>
            <select
              className="tfd-input"
              value={tipoFormulario}
              onChange={(e) => setTipoFormulario(e.target.value)}
            >
              <option value="">Todos</option>
              {TIPOS_FORMULARIO.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {periodoExcede12Meses && (
          <p className="text-sm mb-3" style={{ color: 'var(--tfd-status-danger)' }}>
            O período máximo para consulta é de 12 meses. Reduza o intervalo.
          </p>
        )}

        {/* Toggle advanced */}
        <button
          type="button"
          className="tfd-btn tfd-btn-ghost text-sm mb-4 flex items-center gap-1"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showAdvanced ? 'Menos filtros' : 'Mais filtros'}
        </button>

        {/* Advanced filters */}
        {showAdvanced && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="tfd-label">Tipo de Documento</label>
              <select
                className="tfd-input"
                value={tipoDocumento}
                onChange={(e) => setTipoDocumento(e.target.value)}
              >
                <option value="">Todos</option>
                {TIPOS_DOCUMENTO.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="tfd-label">Etapa</label>
              <select
                className="tfd-input"
                value={etapa}
                onChange={(e) => setEtapa(e.target.value)}
              >
                <option value="">Todas</option>
                {ETAPAS.map((e) => (
                  <option key={e} value={e}>{ETAPA_LABELS[e] ?? e}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="tfd-label">Paciente (nome ou CPF)</label>
              <input
                type="text"
                className="tfd-input"
                placeholder="Mínimo 3 caracteres"
                value={pacienteBusca}
                onChange={(e) => setPacienteBusca(e.target.value)}
              />
            </div>
            <div>
              <label className="tfd-label">Nº Processo</label>
              <input
                type="text"
                className="tfd-input"
                placeholder="TFD-2026-00123"
                value={numeroProcesso}
                onChange={(e) => setNumeroProcesso(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="tfd-label">Status</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {STATUS_LEGADO.map((s) => (
                  <label
                    key={s}
                    className="flex items-center gap-1.5 text-sm cursor-pointer"
                    style={{ color: 'var(--tfd-text-secondary)' }}
                  >
                    <input
                      type="checkbox"
                      checked={statusChecked.includes(s)}
                      onChange={() => toggleStatus(s)}
                      className="rounded"
                      style={{ accentColor: 'var(--tfd-primary-500)' }}
                    />
                    {s}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="tfd-btn tfd-btn-primary"
            disabled={!canSearch || loading}
            onClick={() => handleSearch(1)}
          >
            <Search size={15} />
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
          <button
            type="button"
            className="tfd-btn tfd-btn-secondary"
            onClick={handleClearFilters}
          >
            Limpar filtros
          </button>
          <button
            type="button"
            className="tfd-btn tfd-btn-ghost ml-auto"
            disabled
            title="Exportação CSV — disponível em breve"
          >
            <Download size={15} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* ═══ Results ═══ */}
      {!searched && (
        <div className="tfd-card text-center py-16">
          <FileSearch size={48} className="mx-auto mb-4" style={{ color: 'var(--tfd-text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
            Informe o período e clique em &quot;Buscar&quot; para consultar os documentos do sistema.
          </p>
        </div>
      )}

      {searched && !loading && results.length === 0 && (
        <div className="tfd-card text-center py-16">
          <FileText size={48} className="mx-auto mb-4" style={{ color: 'var(--tfd-text-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
            Nenhum documento encontrado para os filtros informados.
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--tfd-text-muted)' }}>
            Tente ampliar o período ou remover alguns filtros.
          </p>
        </div>
      )}

      {searched && (loading || results.length > 0) && (
        <div className="tfd-card">
          {/* Counter */}
          {!loading && totalCount > 0 && (
            <p className="text-xs mb-3" style={{ color: 'var(--tfd-text-muted)' }}>
              Exibindo {startItem}\u2013{endItem} de {totalCount} resultados
            </p>
          )}

          <div className="overflow-x-auto -mx-6">
            <table className="tfd-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft: '1.5rem' }}>Nº Processo</th>
                  <th>Paciente</th>
                  <th>Tipo Documento</th>
                  <th className="hidden lg:table-cell">Formulário</th>
                  <th className="hidden md:table-cell">Etapa</th>
                  <th>Status</th>
                  <th className="hidden lg:table-cell">Data Inclusão</th>
                  <th className="hidden xl:table-cell">Incluído por</th>
                  <th style={{ paddingRight: '1.5rem' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10" style={{ color: 'var(--tfd-text-muted)', paddingLeft: '1.5rem' }}>
                      Carregando...
                    </td>
                  </tr>
                ) : (
                  results.map((doc) => {
                    const style = statusStyleMap[doc.status] ?? { bg: 'var(--tfd-surface-100)', text: 'var(--tfd-surface-600)' };
                    return (
                      <tr key={doc.id}>
                        <td style={{ paddingLeft: '1.5rem' }}>
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
                        <td style={{ paddingRight: '1.5rem' }}>
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
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: '1px solid var(--tfd-surface-border)' }}>
              <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                Página {page} de {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  className="tfd-btn tfd-btn-ghost tfd-btn--sm tfd-btn--icon-only"
                  disabled={page <= 1}
                  onClick={() => handleSearch(page - 1)}
                >
                  <ChevronLeft size={15} />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`tfd-btn tfd-btn--sm ${p === page ? 'tfd-btn-primary' : 'tfd-btn-ghost'}`}
                    onClick={() => handleSearch(p)}
                    style={{ minWidth: 32 }}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  className="tfd-btn tfd-btn-ghost tfd-btn--sm tfd-btn--icon-only"
                  disabled={page >= totalPages}
                  onClick={() => handleSearch(page + 1)}
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ Preview Drawer ═══ */}
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
                { label: 'Nº Processo', value: selectedDoc.numeroProcesso },
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
