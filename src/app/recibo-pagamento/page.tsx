'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  Receipt,
  Search,
  Eye,
  Printer,
  ArrowLeft,
  Loader2,
  Ban,
  CheckCircle2,
  Clock,
  DollarSign,
  Calendar,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import SortableHeader from '@/shared/components/table/SortableHeader';
import { useToast } from '@/shared/components/toast/Toast';
import { useSupabaseData } from '@/shared/hooks/useSupabaseData';
import { useTableControls } from '@/shared/hooks/useTableControls';
import { listarRecibos } from '@/services/recibo-pagamento.service';
import { formatCurrency } from '@/shared/pipes/formatters';
import { MOCK_RECIBOS } from '@/core/mocks/recibo-pagamento.mock';
import type { ReciboPagamento, ReciboItem, MemoriaCalculo } from '@/core/models/recibo-pagamento.model';

/* -------------------------------------------------- */
/*  Constants                                          */
/* -------------------------------------------------- */

const STATUS_FILTER_OPTIONS = [
  { value: 'NAO_GERADO', label: 'Nao Gerado' },
  { value: 'GERADO', label: 'Gerado' },
  { value: 'IMPRESSO', label: 'Impresso' },
  { value: 'ENVIADO', label: 'Enviado' },
];

/* -------------------------------------------------- */
/*  Status styling                                     */
/* -------------------------------------------------- */

interface RecStyle {
  bg: string;
  text: string;
  label: string;
}

const statusStyleMap: Record<string, RecStyle> = {
  NAO_GERADO: { bg: '#FEF3C7', text: '#92400E', label: 'Não Gerado' },
  GERADO: { bg: '#DBEAFE', text: '#1D4ED8', label: 'Gerado' },
  IMPRESSO: { bg: '#DCFCE7', text: '#15803D', label: 'Impresso' },
  ENVIADO: { bg: '#E0E7FF', text: '#4338CA', label: 'Enviado' },
};

/* -------------------------------------------------- */
/*  Helpers                                            */
/* -------------------------------------------------- */

function formatDate(iso: string): string {
  if (!iso) return '—';
  const datePart = iso.includes('T') ? iso.split('T')[0] : iso;
  const [year, month, day] = datePart.split('-');
  if (!year || !month || !day) return '—';
  return `${day}/${month}/${year}`;
}

function formatDateExtenso(iso: string): string {
  if (!iso) return '—';
  const meses = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
  ];
  const datePart = iso.includes('T') ? iso.split('T')[0] : iso;
  const [year, month, day] = datePart.split('-');
  if (!year || !month || !day) return '—';
  return `${parseInt(day, 10)} de ${meses[parseInt(month, 10) - 1]} de ${year}`;
}

function calcularIdade(dataNasc: string): number {
  const nascimento = new Date(dataNasc);
  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const mesAtual = hoje.getMonth();
  const mesNasc = nascimento.getMonth();
  if (mesAtual < mesNasc || (mesAtual === mesNasc && hoje.getDate() < nascimento.getDate())) {
    idade--;
  }
  return idade;
}

/* -------------------------------------------------- */
/*  Display item type                                  */
/* -------------------------------------------------- */

interface ReciboDisplayItem extends Record<string, unknown> {
  id: string;
  numeroRecibo: string;
  numeroProcesso: string;
  pacienteNome: string;
  valorLiquido: number;
  status: string;
  dataGeracao: string;
  raw: ReciboPagamento;
}

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function ReciboPagamentoPage() {
  const toast = useToast();

  /* ---- Detail view state ---- */
  const [selectedRecibo, setSelectedRecibo] = useState<ReciboPagamento | null>(null);

  /* ---- Supabase data with mock fallback ---- */
  const { data: dbData, loading } = useSupabaseData(
    useCallback(
      () => listarRecibos({}),
      [],
    ),
    [],
  );

  /* ---- Map to display items ---- */
  const items: ReciboDisplayItem[] = useMemo(() => {
    const source = dbData.length > 0 ? dbData : MOCK_RECIBOS;
    return (source as any[]).map((r) => {
      // Supabase row
      if (r.numero_recibo !== undefined) {
        return {
          id: r.id,
          numeroRecibo: r.numero_recibo ?? '—',
          numeroProcesso: r.solicitacoes?.numero_processo ?? '—',
          pacienteNome: r.solicitacoes?.pacientes?.nome_completo ?? r.paciente_nome ?? '—',
          valorLiquido: r.valor_liquido ?? 0,
          status: r.status,
          dataGeracao: r.data_geracao ?? r.created_at ?? '',
          raw: r as any,
        };
      }
      // Mock
      const rec = r as ReciboPagamento;
      return {
        id: rec.id,
        numeroRecibo: rec.numeroRecibo,
        numeroProcesso: rec.numeroProcesso,
        pacienteNome: rec.pacienteNome,
        valorLiquido: rec.valorLiquido,
        status: rec.status,
        dataGeracao: rec.dataGeracao,
        raw: rec,
      };
    });
  }, [dbData]);

  /* ---- Table controls (search, sort, filter, pagination) ---- */
  const table = useTableControls<ReciboDisplayItem>({
    data: items,
    searchFields: ['pacienteNome', 'numeroRecibo', 'numeroProcesso'],
    dateField: 'dataGeracao',
    pageSize: 20,
  });

  const paginatedItems = table.paginated as unknown as ReciboDisplayItem[];

  /* ---- Summary ---- */
  const summary = useMemo(() => ({
    total: items.length,
    gerados: items.filter((r) => r.status === 'GERADO' || r.status === 'IMPRESSO' || r.status === 'ENVIADO').length,
    valorTotal: items.reduce((s, r) => s + r.valorLiquido, 0),
  }), [items]);

  /* ---- Print handler ---- */
  function handlePrint() {
    window.print();
  }

  /* ---- If showing receipt detail ---- */
  if (selectedRecibo) {
    return <ReciboDetail recibo={selectedRecibo} onBack={() => setSelectedRecibo(null)} onPrint={handlePrint} />;
  }

  /* ---- Table view ---- */
  return (
    <>
      <PageHeader
        title="Recibo de Pagamento"
        subtitle="Recibos de pagamento de ajuda de custo TFD"
      />

      {/* ========== Summary Cards ========== */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: 'var(--tfd-primary-50)', color: 'var(--tfd-primary-500)' }}
          >
            <Receipt size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Total de Recibos</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{summary.total}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#DCFCE7', color: '#16A34A' }}
          >
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Gerados</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-status-success)' }}>{summary.gerados}</p>
          </div>
        </div>

        <div className="tfd-card flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0"
            style={{ backgroundColor: '#DBEAFE', color: '#3B82F6' }}
          >
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Valor Total</p>
            <p className="text-lg font-semibold" style={{ color: 'var(--tfd-primary-700)' }}>{formatCurrency(summary.valorTotal)}</p>
          </div>
        </div>
      </div>

      {/* ========== Toolbar: Search + Date Range ========== */}
      <div className="tfd-toolbar mb-4 flex-wrap gap-3">
        <div className="relative flex-1 max-w-xs min-w-[200px]">
          <Search
            size={16}
            className="tfd-input-leading-icon"
            style={{ color: 'var(--tfd-text-muted)' }}
          />
          <input
            type="text"
            className="tfd-input tfd-input--sm tfd-input--with-leading-icon"
            placeholder="Buscar paciente, recibo ou processo..."
            value={table.search}
            onChange={(e) => table.setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Calendar size={14} style={{ color: 'var(--tfd-text-muted)', flexShrink: 0 }} />
          <input type="date" className="tfd-input tfd-input--sm" style={{ width: 'auto' }}
            value={table.dateStart} onChange={(e) => table.setDateStart(e.target.value)} title="Data inicio" />
          <span className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>ate</span>
          <input type="date" className="tfd-input tfd-input--sm" style={{ width: 'auto' }}
            value={table.dateEnd} onChange={(e) => table.setDateEnd(e.target.value)} title="Data fim" />
        </div>
      </div>

      {/* ========== Table ========== */}
      <div className="tfd-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tfd-table">
            <thead>
              <tr>
                <SortableHeader
                  label="Nº Recibo"
                  sortDirection={table.getSortDirection('numeroRecibo')}
                  onSort={() => table.toggleSort('numeroRecibo')}
                />
                <SortableHeader
                  label="Nº Processo"
                  sortDirection={table.getSortDirection('numeroProcesso')}
                  onSort={() => table.toggleSort('numeroProcesso')}
                />
                <SortableHeader
                  label="Paciente"
                  sortDirection={table.getSortDirection('pacienteNome')}
                  onSort={() => table.toggleSort('pacienteNome')}
                />
                <SortableHeader
                  label="Data"
                  className="hidden md:table-cell"
                  sortDirection={table.getSortDirection('dataGeracao')}
                  onSort={() => table.toggleSort('dataGeracao')}
                />
                <SortableHeader
                  label="Valor Líquido"
                  sortDirection={table.getSortDirection('valorLiquido')}
                  onSort={() => table.toggleSort('valorLiquido')}
                />
                <SortableHeader
                  label="Status"
                  sortDirection={table.getSortDirection('status')}
                  onSort={() => table.toggleSort('status')}
                  filterOptions={STATUS_FILTER_OPTIONS}
                  activeFilters={table.getActiveFilters('status')}
                  onFilterChange={(values) => table.setColumnFilter('status', values)}
                />
                <th className="w-[80px]">Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={32} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} />
                      <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                        Carregando recibos...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <Ban size={32} style={{ color: 'var(--tfd-text-muted)' }} />
                      <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
                        Nenhum recibo encontrado
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedItems.map((r) => {
                  const style = statusStyleMap[r.status] ?? { bg: 'var(--tfd-surface-100)', text: 'var(--tfd-surface-500)', label: r.status };
                  return (
                    <tr key={r.id} className="cursor-pointer" onClick={() => setSelectedRecibo(r.raw)}>
                      <td>
                        <span className="font-medium text-sm" style={{ color: 'var(--tfd-primary-500)' }}>
                          {r.numeroRecibo}
                        </span>
                      </td>
                      <td style={{ color: 'var(--tfd-text-secondary)' }}>{r.numeroProcesso}</td>
                      <td className="max-w-[180px] truncate font-medium">{r.pacienteNome}</td>
                      <td className="hidden md:table-cell whitespace-nowrap" style={{ color: 'var(--tfd-text-secondary)' }}>
                        {formatDate(r.dataGeracao)}
                      </td>
                      <td className="whitespace-nowrap font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                        {formatCurrency(r.valorLiquido)}
                      </td>
                      <td>
                        <span
                          className="tfd-tag tfd-tag--rounded"
                          style={{ backgroundColor: style.bg, color: style.text }}
                        >
                          {style.label}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            className="tfd-btn tfd-btn-ghost tfd-btn--sm tfd-btn--icon-only"
                            title="Ver recibo"
                            onClick={() => setSelectedRecibo(r.raw)}
                          >
                            <Eye size={15} />
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
            <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
              {table.filtered.length} recibo{table.filtered.length !== 1 ? 's' : ''} encontrado{table.filtered.length !== 1 ? 's' : ''}
            </p>
            <div className="flex items-center gap-1">
              {Array.from({ length: table.totalPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  onClick={() => table.setPage(pg)}
                  className="tfd-btn tfd-btn--sm"
                  style={{
                    minWidth: '32px',
                    backgroundColor: pg === table.page ? 'var(--tfd-primary-500)' : 'transparent',
                    color: pg === table.page ? '#fff' : 'var(--tfd-text-secondary)',
                  }}
                >
                  {pg}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ============================================================ */
/*  Receipt Detail / Print View                                  */
/* ============================================================ */

interface ReciboDetailProps {
  recibo: ReciboPagamento;
  onBack: () => void;
  onPrint: () => void;
}

function ReciboDetail({ recibo, onBack, onPrint }: ReciboDetailProps) {
  const r = recibo;
  const idade = r.pacienteDataNascimento ? calcularIdade(r.pacienteDataNascimento) : null;

  return (
    <>
      {/* Print-only styles */}
      <style>{`
        @media print {
          /* Hide everything except the receipt */
          body > *:not(#__next),
          nav, aside, header,
          .no-print,
          [data-sidebar],
          [data-layout-header] {
            display: none !important;
          }

          #__next > *:not(main) {
            display: none !important;
          }

          main {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
          }

          .recibo-container {
            box-shadow: none !important;
            border: none !important;
            padding: 24px !important;
            margin: 0 !important;
            max-width: 100% !important;
          }

          .recibo-section {
            break-inside: avoid;
          }

          @page {
            margin: 15mm;
            size: A4;
          }
        }
      `}</style>

      {/* Action bar (hidden on print) */}
      <div className="no-print mb-6">
        <div className="flex items-center justify-between">
          <button className="tfd-btn tfd-btn-secondary" onClick={onBack}>
            <ArrowLeft size={16} />
            Voltar
          </button>
          <div className="flex items-center gap-2">
            <button className="tfd-btn tfd-btn-primary" onClick={onPrint}>
              <Printer size={16} />
              Imprimir
            </button>
          </div>
        </div>
      </div>

      {/* Receipt document */}
      <div
        className="recibo-container tfd-card mx-auto"
        style={{ maxWidth: '800px', padding: '32px', fontFamily: 'Inter, sans-serif' }}
      >
        {/* ====== Header ====== */}
        <div className="recibo-section text-center mb-6" style={{ borderBottom: '2px solid var(--tfd-text-primary)', paddingBottom: '16px' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)', letterSpacing: '0.05em' }}>
            ESTADO DO MARANHÃO
          </p>
          <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
            SECRETARIA DE ESTADO DA SAÚDE
          </p>
          <p className="text-sm" style={{ color: 'var(--tfd-text-secondary)' }}>
            PROGRAMA DE TRATAMENTO FORA DE DOMICÍLIO — TFD
          </p>
          <p className="text-base font-bold mt-3" style={{ color: 'var(--tfd-text-primary)' }}>
            RECIBO DE PAGAMENTO A BENEFICIÁRIO
          </p>
          <p className="text-sm font-medium mt-1" style={{ color: 'var(--tfd-primary-500)' }}>
            Nº {r.numeroRecibo}
          </p>
        </div>

        {/* ====== Dados do Paciente ====== */}
        <div className="recibo-section mb-5">
          <h3
            className="text-xs font-bold mb-3"
            style={{ color: 'var(--tfd-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
          >
            Dados do Paciente
          </h3>
          <div
            className="rounded-lg p-4"
            style={{ backgroundColor: 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}
          >
            <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-sm">
              <div className="col-span-2">
                <span style={{ color: 'var(--tfd-text-muted)' }}>Paciente:</span>{' '}
                <span className="font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{r.pacienteNome}</span>
              </div>
              <div>
                <span style={{ color: 'var(--tfd-text-muted)' }}>Cartão SUS:</span>{' '}
                <span style={{ color: 'var(--tfd-text-primary)' }}>{r.pacienteCNS}</span>
              </div>
              <div>
                <span style={{ color: 'var(--tfd-text-muted)' }}>Data Nasc.:</span>{' '}
                <span style={{ color: 'var(--tfd-text-primary)' }}>
                  {formatDate(r.pacienteDataNascimento)}
                  {idade !== null && ` (${idade} anos)`}
                </span>
              </div>
              <div className="col-span-2">
                <span style={{ color: 'var(--tfd-text-muted)' }}>Endereço:</span>{' '}
                <span style={{ color: 'var(--tfd-text-primary)' }}>{r.pacienteEndereco}</span>
              </div>
              <div>
                <span style={{ color: 'var(--tfd-text-muted)' }}>Nº Processo:</span>{' '}
                <span className="font-medium" style={{ color: 'var(--tfd-primary-500)' }}>{r.numeroProcesso}</span>
              </div>
              <div>
                <span style={{ color: 'var(--tfd-text-muted)' }}>Local Trat.:</span>{' '}
                <span style={{ color: 'var(--tfd-text-primary)' }}>{r.localTratamento}</span>
              </div>
              <div className="col-span-2">
                <span style={{ color: 'var(--tfd-text-muted)' }}>Procedimento:</span>{' '}
                <span style={{ color: 'var(--tfd-text-primary)' }}>{r.procedimento}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ====== Tabela Paciente ====== */}
        {r.itensPaciente.length > 0 && (
          <div className="recibo-section mb-5">
            <h3
              className="text-xs font-bold mb-3"
              style={{ color: 'var(--tfd-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
            >
              Valores da Ajuda de Custo — Paciente
            </h3>
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--tfd-surface-border)' }}>
                  <th className="text-left py-2 px-3 font-semibold" style={{ color: 'var(--tfd-text-secondary)' }}>Período</th>
                  <th className="text-center py-2 px-3 font-semibold" style={{ color: 'var(--tfd-text-secondary)' }}>Dias</th>
                  <th className="text-right py-2 px-3 font-semibold" style={{ color: 'var(--tfd-text-secondary)' }}>Valor/Dia</th>
                  <th className="text-right py-2 px-3 font-semibold" style={{ color: 'var(--tfd-text-secondary)' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {r.itensPaciente.map((item: ReciboItem, idx: number) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}>
                    <td className="py-2 px-3" style={{ color: item.descricao?.startsWith('(-)') ? 'var(--tfd-status-danger)' : 'var(--tfd-text-primary)' }}>
                      {item.descricao || item.periodo}
                    </td>
                    <td className="py-2 px-3 text-center" style={{ color: 'var(--tfd-text-primary)' }}>{item.dias}</td>
                    <td className="py-2 px-3 text-right" style={{ color: 'var(--tfd-text-secondary)' }}>
                      {item.valorUnitario > 0 ? formatCurrency(item.valorUnitario) : '—'}
                    </td>
                    <td className="py-2 px-3 text-right font-medium" style={{ color: item.total < 0 ? 'var(--tfd-status-danger)' : 'var(--tfd-text-primary)' }}>
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--tfd-surface-border)' }}>
                  <td colSpan={3} className="py-2 px-3 text-right font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                    Subtotal Paciente
                  </td>
                  <td className="py-2 px-3 text-right font-bold" style={{ color: 'var(--tfd-text-primary)' }}>
                    {formatCurrency(r.subtotalPaciente)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ====== Tabela Acompanhante ====== */}
        {r.itensAcompanhante.length > 0 && (
          <div className="recibo-section mb-5">
            <h3
              className="text-xs font-bold mb-3"
              style={{ color: 'var(--tfd-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
            >
              Valores da Ajuda de Custo — Acompanhante
            </h3>
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--tfd-surface-border)' }}>
                  <th className="text-left py-2 px-3 font-semibold" style={{ color: 'var(--tfd-text-secondary)' }}>Período</th>
                  <th className="text-center py-2 px-3 font-semibold" style={{ color: 'var(--tfd-text-secondary)' }}>Dias</th>
                  <th className="text-right py-2 px-3 font-semibold" style={{ color: 'var(--tfd-text-secondary)' }}>Valor/Dia</th>
                  <th className="text-right py-2 px-3 font-semibold" style={{ color: 'var(--tfd-text-secondary)' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {r.itensAcompanhante.map((item: ReciboItem, idx: number) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}>
                    <td className="py-2 px-3" style={{ color: 'var(--tfd-text-primary)' }}>{item.descricao || item.periodo}</td>
                    <td className="py-2 px-3 text-center" style={{ color: 'var(--tfd-text-primary)' }}>{item.dias}</td>
                    <td className="py-2 px-3 text-right" style={{ color: 'var(--tfd-text-secondary)' }}>{formatCurrency(item.valorUnitario)}</td>
                    <td className="py-2 px-3 text-right font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--tfd-surface-border)' }}>
                  <td colSpan={3} className="py-2 px-3 text-right font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                    Subtotal Acompanhante
                  </td>
                  <td className="py-2 px-3 text-right font-bold" style={{ color: 'var(--tfd-text-primary)' }}>
                    {formatCurrency(r.subtotalAcompanhante)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ====== Memória de Cálculo ====== */}
        {r.memoriaCalculo.length > 0 && (
          <div className="recibo-section mb-5">
            <h3
              className="text-xs font-bold mb-3"
              style={{ color: 'var(--tfd-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
            >
              Memória de Cálculo
            </h3>
            <div
              className="rounded-lg p-4"
              style={{ backgroundColor: 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}
            >
              {r.memoriaCalculo.map((mc: MemoriaCalculo, idx: number) => (
                <div key={idx} className={idx > 0 ? 'mt-4 pt-4' : ''} style={idx > 0 ? { borderTop: '1px solid var(--tfd-surface-border)' } : {}}>
                  <p className="text-sm font-semibold mb-2" style={{ color: 'var(--tfd-text-primary)' }}>
                    {mc.tipo === 'PACIENTE' ? 'Paciente' : 'Acompanhante'}
                  </p>
                  <div className="text-sm space-y-1" style={{ color: 'var(--tfd-text-secondary)' }}>
                    <p>Período total: {mc.periodoTotal} = {mc.diasTotais} dias</p>
                    {mc.diasInternacao > 0 && (
                      <p>(-) Dias de internação: {mc.diasInternacao} dias</p>
                    )}
                    <p>= Dias elegíveis: {mc.diasElegiveis} dias</p>
                    <p className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>
                      Cálculo: {mc.formula}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ====== Totais ====== */}
        <div className="recibo-section mb-5">
          <h3
            className="text-xs font-bold mb-3"
            style={{ color: 'var(--tfd-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
          >
            Totais
          </h3>
          <div
            className="rounded-lg p-4"
            style={{ backgroundColor: 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}
          >
            <div className="flex justify-between text-sm mb-1">
              <span style={{ color: 'var(--tfd-text-secondary)' }}>Subtotal Paciente:</span>
              <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{formatCurrency(r.subtotalPaciente)}</span>
            </div>
            {r.subtotalAcompanhante > 0 && (
              <div className="flex justify-between text-sm mb-1">
                <span style={{ color: 'var(--tfd-text-secondary)' }}>Subtotal Acompanhante:</span>
                <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{formatCurrency(r.subtotalAcompanhante)}</span>
              </div>
            )}
            <div
              className="flex justify-between pt-3 mt-3"
              style={{ borderTop: '2px solid var(--tfd-surface-border)' }}
            >
              <span className="text-base font-bold" style={{ color: 'var(--tfd-text-primary)' }}>
                VALOR LÍQUIDO DA AJUDA DE CUSTO
              </span>
              <span className="text-lg font-bold" style={{ color: 'var(--tfd-primary-500)' }}>
                {formatCurrency(r.valorLiquido)}
              </span>
            </div>
          </div>
        </div>

        {/* ====== Dados do Sacador ====== */}
        {!r.sacadorEPaciente && r.sacadorNome && (
          <div className="recibo-section mb-5">
            <h3
              className="text-xs font-bold mb-3"
              style={{ color: 'var(--tfd-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
            >
              Dados do Sacador
            </h3>
            <div
              className="rounded-lg p-4"
              style={{ backgroundColor: 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}
            >
              <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-sm">
                <div>
                  <span style={{ color: 'var(--tfd-text-muted)' }}>Nome:</span>{' '}
                  <span style={{ color: 'var(--tfd-text-primary)' }}>{r.sacadorNome}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--tfd-text-muted)' }}>CPF:</span>{' '}
                  <span style={{ color: 'var(--tfd-text-primary)' }}>{r.sacadorCPF}</span>
                </div>
                <div className="col-span-2">
                  <span style={{ color: 'var(--tfd-text-muted)' }}>Vínculo:</span>{' '}
                  <span style={{ color: 'var(--tfd-text-primary)' }}>{r.sacadorVinculo}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ====== Dados Bancários ====== */}
        {r.banco && (
          <div className="recibo-section mb-5">
            <h3
              className="text-xs font-bold mb-3"
              style={{ color: 'var(--tfd-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
            >
              Dados Bancários para Depósito
            </h3>
            <div
              className="rounded-lg p-4"
              style={{ backgroundColor: 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}
            >
              <div className="grid grid-cols-2 gap-y-2 gap-x-6 text-sm">
                <div>
                  <span style={{ color: 'var(--tfd-text-muted)' }}>Banco:</span>{' '}
                  <span style={{ color: 'var(--tfd-text-primary)' }}>{r.banco}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--tfd-text-muted)' }}>Agência:</span>{' '}
                  <span style={{ color: 'var(--tfd-text-primary)' }}>{r.agencia}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--tfd-text-muted)' }}>Conta:</span>{' '}
                  <span style={{ color: 'var(--tfd-text-primary)' }}>{r.conta}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--tfd-text-muted)' }}>Tipo:</span>{' '}
                  <span style={{ color: 'var(--tfd-text-primary)' }}>{r.tipoConta}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--tfd-text-muted)' }}>Titular:</span>{' '}
                  <span style={{ color: 'var(--tfd-text-primary)' }}>{r.titularConta}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--tfd-text-muted)' }}>CPF Titular:</span>{' '}
                  <span style={{ color: 'var(--tfd-text-primary)' }}>{r.cpfTitular}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ====== Footer — Assinaturas ====== */}
        <div className="recibo-section mt-10">
          <p className="text-sm text-center mb-10" style={{ color: 'var(--tfd-text-secondary)' }}>
            São Luís/MA, {formatDateExtenso(r.dataGeracao)}
          </p>

          <div className="grid grid-cols-2 gap-12 mt-12">
            {/* Responsável */}
            <div className="text-center">
              <div style={{ borderTop: '1px solid var(--tfd-text-primary)', paddingTop: '8px' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                  {r.responsavelNome}
                </p>
                <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>
                  {r.responsavelCargo}
                </p>
                <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                  Responsável pelo pagamento
                </p>
              </div>
            </div>

            {/* Beneficiário */}
            <div className="text-center">
              <div style={{ borderTop: '1px solid var(--tfd-text-primary)', paddingTop: '8px' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>
                  {r.sacadorEPaciente ? r.pacienteNome : r.sacadorNome}
                </p>
                <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>
                  CPF: {r.sacadorEPaciente ? r.cpfTitular : r.sacadorCPF}
                </p>
                <p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>
                  Declaro ter recebido o valor acima
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
