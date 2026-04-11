'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  CalendarClock, Search, Clock, AlertTriangle, CheckCircle2, RefreshCw,
  Eye, Plus, Loader2, Trash2, Pencil, Plane, Wallet, Ban, XCircle,
  Calendar, ChevronLeft, ChevronRight,
} from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import { useToast } from '@/shared/components/toast/Toast';
import {
  listarSolicitacoesPoRegulacao, buscarDetalhesPermanencia, garantirPermanencia,
  criarProrrogacao, aprovarProrrogacao, indeferirProrrogacao, excluirProrrogacao,
  criarViagemProrrogacao, criarAjudaCustoProrrogacao,
} from '@/services/permanencias.service';
import { useParametroNumero } from '@/shared/hooks/useParametros';
import { calcularTotalDiarias } from '@/shared/utils/diarias';
import { useSupabaseData } from '@/shared/hooks/useSupabaseData';
import { formatCurrency, formatDate, maskCurrency, parseCurrency } from '@/shared/pipes/formatters';
import SortableHeader from '@/shared/components/table/SortableHeader';
import { useTableControls } from '@/shared/hooks/useTableControls';
import AdicionaisSection from '@/shared/components/adicionais-section/AdicionaisSection';

/* ── Status maps ────────────────────────────────────── */

const solStatusStyleMap: Record<string, { bg: string; text: string; label: string }> = {
  AGUARDANDO_AGENDAMENTO: { bg: '#EDE9FE', text: '#7C3AED', label: 'Ag. Agendamento' },
  AGUARDANDO_EMISSAO: { bg: '#DBEAFE', text: '#1D4ED8', label: 'Ag. Emissao' },
  EMITIDA: { bg: '#E0E7FF', text: '#4338CA', label: 'Emitida' },
  EM_VIAGEM: { bg: '#FFF7ED', text: '#C2410C', label: 'Em Viagem' },
  EM_PAGAMENTO: { bg: '#FEF3C7', text: '#92400E', label: 'Em Pagamento' },
  EM_PERMANENCIA: { bg: '#FFEDD5', text: '#EA580C', label: 'Em Permanencia' },
  CONCLUIDO: { bg: '#DCFCE7', text: '#15803D', label: 'Concluido' },
};

const decisaoStyleMap: Record<string, { bg: string; text: string; label: string }> = {
  PENDENTE: { bg: '#FEF3C7', text: '#92400E', label: 'Pendente' },
  APROVADA: { bg: '#DCFCE7', text: '#15803D', label: 'Aprovada' },
  INDEFERIDA: { bg: '#FEE2E2', text: '#B91C1C', label: 'Indeferida' },
};

/* ── Inline action types ─────────────────────────────── */

type InlineAction =
  | { type: 'aprovar'; id: string }
  | { type: 'indeferir'; id: string }
  | { type: 'excluir'; id: string }
  | { type: 'add-passagem'; id: string }
  | { type: 'add-ajuda'; id: string }
  | null;

/* ── Helper: prorrogação sub-status ──────────────────── */

function prorrogacaoSubStatus(p: any): string {
  if (p.decisao === 'PENDENTE') return 'PENDENTE';
  if (p.decisao === 'INDEFERIDA') return 'INDEFERIDA';
  // APROVADA → check if passagem and ajuda exist
  const temViagem = !!p.viagem_prorrogacao_id || !!(p as any).viagem;
  const temAjuda = !!p.complemento_ajuda_id || !!(p as any).ajuda;
  if (!temViagem) return 'SEM_PASSAGEM';
  if (!temAjuda) return 'SEM_AJUDA';
  return 'FINALIZADA';
}

/* ══════════════════════════════════════════════════════ */

export default function PermanenciaPage() {
  const toast = useToast();
  const { valor: valorDiariaCompleta } = useParametroNumero('diaria_valor_completa');
  const { valor: valorDiariaRetorno } = useParametroNumero('diaria_valor_retorno');

  /* ── Main data ─────────────────────────────────────── */
  const { data: solicitacoes, loading, refresh } = useSupabaseData(
    useCallback(() => listarSolicitacoesPoRegulacao(), []),
    [],
  );

  /* ── Drawer state ──────────────────────────────────── */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSolId, setDrawerSolId] = useState('');
  const [drawerNumProcesso, setDrawerNumProcesso] = useState('');
  const [drawerPaciente, setDrawerPaciente] = useState('');
  const [drawerViagens, setDrawerViagens] = useState<any[]>([]);
  const [drawerAjudas, setDrawerAjudas] = useState<any[]>([]);
  const [drawerProrrogacoes, setDrawerProrrogacoes] = useState<any[]>([]);
  const [drawerPermanenciaId, setDrawerPermanenciaId] = useState<string | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  /* ── New prorrogacao form ──────────────────────────── */
  const [addingProrrogacao, setAddingProrrogacao] = useState(false);
  const [diasAdicionais, setDiasAdicionais] = useState('');
  const [novaDataRetorno, setNovaDataRetorno] = useState('');
  const [justificativaProrr, setJustificativaProrr] = useState('');

  /* ── Inline actions ────────────────────────────────── */
  const [inlineAction, setInlineAction] = useState<InlineAction>(null);
  const [indeferirMotivo, setIndeferirMotivo] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  /* ── Passagem form fields ──────────────────────────── */
  const [passagemTipo, setPassagemTipo] = useState('RETORNO');
  const [passagemOrigem, setPassagemOrigem] = useState('');
  const [passagemOrigemUf, setPassagemOrigemUf] = useState('');
  const [passagemDestino, setPassagemDestino] = useState('');
  const [passagemDestinoUf, setPassagemDestinoUf] = useState('');
  const [passagemData, setPassagemData] = useState('');
  const [passagemCompanhia, setPassagemCompanhia] = useState('');
  const [passagemValor, setPassagemValor] = useState('');

  /* ── Ajuda form fields ─────────────────────────────── */
  const [ajudaDataInicio, setAjudaDataInicio] = useState('');
  const [ajudaDataFim, setAjudaDataFim] = useState('');
  const [ajudaValorDiaria, setAjudaValorDiaria] = useState('');

  /* ── Helpers ───────────────────────────────────────── */

  function resetForm() {
    setAddingProrrogacao(false);
    setDiasAdicionais(''); setNovaDataRetorno(''); setJustificativaProrr('');
  }

  function resetInlineAction() {
    setInlineAction(null); setIndeferirMotivo(''); setActionLoading(false);
    setPassagemTipo('RETORNO'); setPassagemOrigem(''); setPassagemOrigemUf('');
    setPassagemDestino(''); setPassagemDestinoUf(''); setPassagemData('');
    setPassagemCompanhia(''); setPassagemValor('');
    setAjudaDataInicio(''); setAjudaDataFim(''); setAjudaValorDiaria('');
  }

  function handleCloseDrawer() {
    setDrawerOpen(false); resetForm(); resetInlineAction();
  }

  async function carregarDrawer(solId: string) {
    setDrawerLoading(true);
    const d = await buscarDetalhesPermanencia(solId);
    setDrawerViagens(d.viagens);
    setDrawerAjudas(d.ajudas);
    setDrawerProrrogacoes(d.prorrogacoes);
    setDrawerPermanenciaId(d.permanencia?.id ?? null);
    setDrawerLoading(false);
  }

  async function handleOpenDrawer(sol: any) {
    setDrawerSolId(sol.id);
    setDrawerNumProcesso(sol.numero_processo ?? '—');
    setDrawerPaciente((sol.pacientes as any)?.nome_completo ?? '—');
    resetForm(); resetInlineAction();
    setDrawerOpen(true);
    await carregarDrawer(sol.id);
  }

  /* ── Save prorrogacao ──────────────────────────────── */

  async function handleSaveProrrogacao() {
    if (!diasAdicionais || parseInt(diasAdicionais) <= 0) { toast.error('Obrigatorio', 'Informe os dias adicionais.'); return; }
    if (!novaDataRetorno) { toast.error('Obrigatorio', 'Informe a nova data de retorno.'); return; }
    if (!justificativaProrr.trim()) { toast.error('Obrigatorio', 'Informe a justificativa.'); return; }

    let permId = drawerPermanenciaId;
    if (!permId) {
      permId = await garantirPermanencia(drawerSolId);
      if (!permId) { toast.error('Erro', 'Nao foi possivel criar o registro de permanencia.'); return; }
      setDrawerPermanenciaId(permId);
    }

    const { error } = await criarProrrogacao({
      permanencia_id: permId,
      justificativa_medica: justificativaProrr,
      dias_adicionais_solicitados: parseInt(diasAdicionais),
      nova_data_retorno: novaDataRetorno,
      decisao: 'PENDENTE',
    } as any);
    if (error) { toast.error('Erro ao criar', (error as any).message); return; }
    toast.success('Prorrogacao cadastrada!', 'Aguardando aprovacao.');
    resetForm();
    await carregarDrawer(drawerSolId);
    refresh();
  }

  /* ── Inline actions ────────────────────────────────── */

  async function handleConfirmAprovar(id: string) {
    setActionLoading(true);
    const { error } = await aprovarProrrogacao(id);
    if (error) toast.error('Erro', (error as any).message);
    else toast.success('Aprovada!', 'Adicione a passagem e ajuda de custo.');
    resetInlineAction();
    await carregarDrawer(drawerSolId); refresh();
  }

  async function handleConfirmIndeferir(id: string) {
    if (!indeferirMotivo.trim()) { toast.error('Obrigatorio', 'Informe o motivo.'); return; }
    setActionLoading(true);
    const { error } = await indeferirProrrogacao(id, indeferirMotivo);
    if (error) toast.error('Erro', (error as any).message);
    else toast.success('Indeferida', 'Registro salvo.');
    resetInlineAction();
    await carregarDrawer(drawerSolId); refresh();
  }

  async function handleConfirmExcluir(id: string) {
    setActionLoading(true);
    const { error } = await excluirProrrogacao(id);
    if (error) toast.error('Erro', (error as any).message);
    else toast.success('Excluida', 'Prorrogacao removida.');
    resetInlineAction();
    await carregarDrawer(drawerSolId); refresh();
  }

  async function handleSalvarPassagem(prorrogacaoId: string) {
    if (!passagemOrigem || !passagemDestino || !passagemData) {
      toast.error('Campos obrigatorios', 'Preencha origem, destino e data.');
      return;
    }
    setActionLoading(true);
    const { error } = await criarViagemProrrogacao(drawerSolId, prorrogacaoId, {
      tipo: passagemTipo,
      origemCidade: passagemOrigem,
      origemUf: passagemOrigemUf || 'MA',
      destinoCidade: passagemDestino,
      destinoUf: passagemDestinoUf || 'MA',
      dataEmbarque: passagemData,
      companhia: passagemCompanhia || undefined,
      valor: passagemValor ? parseCurrency(passagemValor) : undefined,
    });
    if (error) toast.error('Erro', (error as any).message);
    else toast.success('Passagem adicionada!', 'Agora adicione a ajuda de custo.');
    resetInlineAction();
    await carregarDrawer(drawerSolId); refresh();
  }

  async function handleSalvarAjuda(prorrogacaoId: string) {
    if (!ajudaDataInicio || !ajudaDataFim) {
      toast.error('Campos obrigatorios', 'Preencha data inicio e fim.');
      return;
    }
    const vDiaria = ajudaValorDiaria ? parseCurrency(ajudaValorDiaria) : valorDiariaCompleta;
    const d1 = new Date(ajudaDataInicio);
    const d2 = new Date(ajudaDataFim);
    const dias = Math.max(0, Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));

    // Portaria SAS/MS 55/1999: (dias - 1) × diária completa + diária de retorno.
    const { valorTotal } = calcularTotalDiarias({
      dias,
      valorDiariaCompleta: vDiaria,
      valorDiariaRetorno,
    });

    setActionLoading(true);
    const { error } = await criarAjudaCustoProrrogacao(drawerSolId, prorrogacaoId, {
      dataInicio: ajudaDataInicio,
      dataFim: ajudaDataFim,
      valorDiaria: vDiaria,
      valorTotal,
    });
    if (error) toast.error('Erro', (error as any).message);
    else toast.success('Ajuda de custo adicionada!', 'O periodo foi registrado.');
    resetInlineAction();
    await carregarDrawer(drawerSolId); refresh();
  }

  /* ── Computed rows ─────────────────────────────────── */

  const rows = useMemo(() => {
    return (solicitacoes as any[]).map((sol: any) => {
      const perms = sol.permanencias ?? [];
      const prorrogacoes = perms.flatMap((p: any) => p.prorrogacoes ?? []);
      const ajudas = sol.ajudas_custo ?? [];
      const viagens = sol.viagens ?? [];
      return {
        ...sol,
        paciente_nome: (sol.pacientes as any)?.nome_completo ?? '',
        viagensCount: viagens.length,
        ajudasTotal: ajudas.reduce((s: number, a: any) => s + (a.valor_total ?? 0), 0),
        prorrogacoesCount: prorrogacoes.length,
        prorrogacoesPendentes: prorrogacoes.filter((p: any) => p.decisao === 'PENDENTE').length,
        prorrogacoesAprovadas: prorrogacoes.filter((p: any) => p.decisao === 'APROVADA').length,
        prorrogacoesSemPassagem: prorrogacoes.filter((p: any) => p.decisao === 'APROVADA' && !p.viagem_prorrogacao_id).length,
        prorrogacoesSemAjuda: prorrogacoes.filter((p: any) => p.decisao === 'APROVADA' && !p.complemento_ajuda_id).length,
        prorrogacoesCompletas: prorrogacoes.filter((p: any) => p.decisao === 'APROVADA' && p.viagem_prorrogacao_id && p.complemento_ajuda_id).length,
        prorrogacoesIndeferidas: prorrogacoes.filter((p: any) => p.decisao === 'INDEFERIDA').length,
      };
    });
  }, [solicitacoes]);

  /* ── Table controls ───────────────────────────────── */
  const table = useTableControls({
    data: rows as unknown as Record<string, unknown>[],
    searchFields: ['numero_processo', 'paciente_nome'] as any,
    dateField: 'created_at' as any,
  });

  const items = table.paginated as unknown as any[];
  const allFiltered = table.filtered as unknown as any[];

  /* ── Filter options ───────────────────────────────── */
  const statusFilterOptions = table.getFilterOptions('status').map((v) => ({
    value: v,
    label: (solStatusStyleMap[v] ?? { label: v }).label,
  }));

  const counts = useMemo(() => {
    return {
      total: rows.length,
      pendentes: rows.filter((r: any) => r.prorrogacoesPendentes > 0).length,
      semPassagem: rows.filter((r: any) => r.prorrogacoesSemPassagem > 0).length,
      semAjuda: rows.filter((r: any) => r.prorrogacoesSemAjuda > 0).length,
      completas: rows.filter((r: any) => r.prorrogacoesCompletas > 0).length,
      indeferidas: rows.filter((r: any) => r.prorrogacoesIndeferidas > 0).length,
    };
  }, [rows]);

  /* ── Drawer totals ─────────────────────────────────── */
  const drawerAjudasTotal = useMemo(() => drawerAjudas.reduce((s: number, a: any) => s + (a.valor_total ?? 0), 0), [drawerAjudas]);
  const drawerAjudasPago = useMemo(() => drawerAjudas.reduce((s: number, a: any) => s + (a.valor_pago ?? 0), 0), [drawerAjudas]);

  /* ══════════════════════════════════════════════════ */

  return (
    <>
      <PageHeader title="Permanencia, Prorrogacoes e Adicionais" subtitle="Acompanhamento pos-regulacao, prorrogacoes e custos extras do TFD" />

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="tfd-card flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: '#DBEAFE', color: '#3B82F6' }}><CalendarClock size={20} /></div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Processos Ativos</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{counts.total}</p>
            <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--tfd-text-muted)' }}>Pacientes no destino com permanência comunicada</p>
          </div>
        </div>
        <div className="tfd-card flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: '#FEF3C7', color: '#F59E0B' }}><Clock size={20} /></div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Prorrog. Pendentes</p>
            <p className="text-xl font-semibold" style={{ color: 'var(--tfd-status-warning)' }}>{counts.pendentes}</p>
            <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--tfd-text-muted)' }}>Prorrogações aguardando aprovação</p>
          </div>
        </div>
        <div className="tfd-card flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: '#EDE9FE', color: '#7C3AED' }}><Plane size={20} /></div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Sem Passagem</p>
            <p className="text-xl font-semibold" style={{ color: '#7C3AED' }}>{counts.semPassagem}</p>
            <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--tfd-text-muted)' }}>Aprovadas sem passagem de retorno emitida</p>
          </div>
        </div>
        <div className="tfd-card flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg shrink-0" style={{ backgroundColor: '#FFF7ED', color: '#EA580C' }}><Wallet size={20} /></div>
          <div>
            <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>Sem Ajuda Custo</p>
            <p className="text-xl font-semibold" style={{ color: '#EA580C' }}>{counts.semAjuda}</p>
            <p className="text-[10px] leading-tight mt-0.5" style={{ color: 'var(--tfd-text-muted)' }}>Aprovadas sem complemento de diária registrado</p>
          </div>
        </div>
      </div>

      {/* ── Search + Date Range ── */}
      <div className="tfd-toolbar mb-4 flex-wrap gap-3">
        <div className="relative flex-1 max-w-xs min-w-[200px]">
          <Search size={16} className="tfd-input-leading-icon" style={{ color: 'var(--tfd-text-muted)' }} />
          <input type="text" className="tfd-input tfd-input--sm tfd-input--with-leading-icon" placeholder="Buscar paciente ou processo..."
            value={table.search} onChange={(e) => table.setSearch(e.target.value)} />
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

      {/* ── Table ── */}
      <div className="tfd-card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="tfd-table">
            <thead>
              <tr>
                <SortableHeader label="Processo" sortDirection={table.getSortDirection('numero_processo')} onSort={() => table.toggleSort('numero_processo')} />
                <SortableHeader label="Paciente" sortDirection={table.getSortDirection('paciente_nome')} onSort={() => table.toggleSort('paciente_nome')} />
                <SortableHeader label="Passagens" className="text-center" sortDirection={table.getSortDirection('viagensCount')} onSort={() => table.toggleSort('viagensCount')} />
                <SortableHeader label="Ajuda de Custo" className="hidden md:table-cell" sortDirection={table.getSortDirection('ajudasTotal')} onSort={() => table.toggleSort('ajudasTotal')} />
                <SortableHeader label="Prorrogacoes" className="text-center" sortDirection={table.getSortDirection('prorrogacoesCount')} onSort={() => table.toggleSort('prorrogacoesCount')} />
                <SortableHeader label="Status"
                  filterOptions={statusFilterOptions}
                  activeFilters={table.getActiveFilters('status')}
                  onFilterChange={(v) => table.setColumnFilter('status', v)} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12"><Loader2 size={32} className="animate-spin mx-auto mb-2" style={{ color: 'var(--tfd-primary-500)' }} /><p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Carregando...</p></td></tr>
              ) : allFiltered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12"><Ban size={32} style={{ color: 'var(--tfd-text-muted)' }} className="mx-auto mb-2" /><p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>Nenhum processo encontrado</p></td></tr>
              ) : items.map((r: any) => {
                const sStyle = solStatusStyleMap[r.status] ?? { bg: 'var(--tfd-surface-100)', text: 'var(--tfd-surface-500)', label: r.status };
                return (
                  <tr key={r.id} className="cursor-pointer" onClick={() => handleOpenDrawer(r)}>
                    <td><Link href={`/solicitacoes/${r.id}?from=permanencia`} className="font-medium text-sm hover:underline" style={{ color: 'var(--tfd-primary-500)' }} onClick={(e) => e.stopPropagation()}>{r.numero_processo}</Link></td>
                    <td className="max-w-[180px] truncate font-medium">{(r.pacientes as any)?.nome_completo ?? '—'}</td>
                    <td className="text-center">{r.viagensCount > 0 ? <span className="inline-flex items-center justify-center min-w-[24px] h-[22px] px-1.5 rounded-full text-xs font-semibold" style={{ backgroundColor: '#DBEAFE', color: '#1D4ED8' }}>{r.viagensCount}</span> : <span style={{ color: 'var(--tfd-text-muted)' }}>—</span>}</td>
                    <td className="hidden md:table-cell whitespace-nowrap">{r.ajudasTotal > 0 ? <span className="font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{formatCurrency(r.ajudasTotal)}</span> : <span style={{ color: 'var(--tfd-text-muted)' }}>—</span>}</td>
                    <td className="text-center">
                      {r.prorrogacoesCount > 0 ? (
                        <div className="flex items-center justify-center gap-1">
                          <span className="inline-flex items-center justify-center min-w-[24px] h-[22px] px-1.5 rounded-full text-xs font-semibold" style={{ backgroundColor: '#FFEDD5', color: '#C2410C' }}>{r.prorrogacoesCount}</span>
                          {r.prorrogacoesSemPassagem > 0 && <span className="text-[10px] font-bold px-1 py-0.5 rounded" style={{ backgroundColor: '#EDE9FE', color: '#7C3AED' }} title="Sem passagem">{r.prorrogacoesSemPassagem} s/pass</span>}
                        </div>
                      ) : <span style={{ color: 'var(--tfd-text-muted)' }}>—</span>}
                    </td>
                    <td><span className="tfd-tag tfd-tag--rounded tfd-tag--dot" style={{ backgroundColor: sStyle.bg, color: sStyle.text }}>{sStyle.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && allFiltered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--tfd-surface-border)' }}>
            <p className="text-sm" style={{ color: 'var(--tfd-text-muted)' }}>
              Exibindo{' '}
              <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{(table.page - 1) * 20 + 1}</span>
              {' '}&ndash;{' '}
              <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{Math.min(table.page * 20, allFiltered.length)}</span>
              {' '}de{' '}
              <span className="font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{allFiltered.length}</span>
              {' '}registros
            </p>
            <div className="flex items-center gap-1">
              <button className="tfd-btn tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only" onClick={() => table.setPage(Math.max(1, table.page - 1))} disabled={table.page === 1} aria-label="Pagina anterior">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm px-3 font-medium" style={{ color: 'var(--tfd-text-primary)' }}>{table.page} / {table.totalPages}</span>
              <button className="tfd-btn tfd-btn-secondary tfd-btn--sm tfd-btn--icon-only" onClick={() => table.setPage(Math.min(table.totalPages, table.page + 1))} disabled={table.page === table.totalPages} aria-label="Proxima pagina">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ══ Drawer ══ */}
      <Drawer open={drawerOpen} onClose={handleCloseDrawer} title="Permanencia e Prorrogacoes" subtitle={drawerNumProcesso} width="600px" footer={<button className="tfd-btn tfd-btn-secondary" onClick={handleCloseDrawer}>Fechar</button>}>
        {/* Patient */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg mb-4" style={{ backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE' }}>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{drawerPaciente}</p>
            <p className="text-xs" style={{ color: '#1E40AF' }}>Processo: {drawerNumProcesso}</p>
          </div>
          <Link href={`/solicitacoes/${drawerSolId}?from=permanencia`} className="tfd-btn tfd-btn-ghost tfd-btn--icon-only" title="Ver processo"><Eye size={15} /></Link>
        </div>

        {drawerLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin" style={{ color: 'var(--tfd-primary-500)' }} /></div>
        ) : (
          <>
            {/* ── Passagens ── */}
            <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--tfd-text-primary)' }}><Plane size={14} className="inline mr-1.5" />Passagens</h3>
            {drawerViagens.length === 0 ? (
              <p className="text-xs mb-4" style={{ color: 'var(--tfd-text-muted)' }}>Nenhuma passagem</p>
            ) : (
              <div className="flex flex-col gap-2 mb-4">
                {drawerViagens.map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between px-3 py-2 rounded-lg text-xs" style={{ backgroundColor: v.prorrogacao_id ? '#F5F3FF' : 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>{v.tipo === 'IDA' ? 'Ida' : 'Retorno'}</span>
                      <span style={{ color: 'var(--tfd-text-secondary)' }}>{v.data_embarque_prevista ? formatDate(v.data_embarque_prevista) : '—'}</span>
                      {v.origem_cidade && <span style={{ color: 'var(--tfd-text-muted)' }}>{v.origem_cidade} → {v.destino_cidade}</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      {v.prorrogacao_id && <span className="tfd-tag tfd-tag--rounded" style={{ fontSize: '0.55rem', backgroundColor: '#EDE9FE', color: '#7C3AED' }}>Prorrogacao</span>}
                      {v.embarcou != null && (
                        <span className="tfd-tag tfd-tag--rounded" style={{ fontSize: '0.55rem', backgroundColor: v.embarcou ? '#DCFCE7' : '#FEE2E2', color: v.embarcou ? '#15803D' : '#B91C1C' }}>
                          {v.embarcou ? 'Embarcou' : 'Nao embarcou'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── Ajuda custo ── */}
            <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--tfd-text-primary)' }}><Wallet size={14} className="inline mr-1.5" />Ajuda de Custo</h3>
            {drawerAjudas.length === 0 ? (
              <p className="text-xs mb-4" style={{ color: 'var(--tfd-text-muted)' }}>Nenhuma ajuda de custo</p>
            ) : (
              <div className="px-3 py-2.5 rounded-lg mb-4 text-xs" style={{ backgroundColor: 'var(--tfd-surface-50)', border: '1px solid var(--tfd-surface-border)' }}>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--tfd-text-secondary)' }}>{drawerAjudas.length} periodo{drawerAjudas.length !== 1 ? 's' : ''}</span>
                  <span className="font-semibold" style={{ color: 'var(--tfd-text-primary)' }}>Total: {formatCurrency(drawerAjudasTotal)}</span>
                </div>
                {drawerAjudasPago > 0 && <div className="flex items-center justify-between mt-1"><span style={{ color: 'var(--tfd-text-muted)' }}>Pago</span><span className="font-medium" style={{ color: '#15803D' }}>{formatCurrency(drawerAjudasPago)}</span></div>}
              </div>
            )}

            <hr className="tfd-divider" />

            {/* ── Prorrogacoes ── */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--tfd-text-primary)' }}><RefreshCw size={14} className="inline mr-1.5" />Prorrogacoes</h3>
              {!addingProrrogacao && <button type="button" className="tfd-btn tfd-btn-primary tfd-btn--sm" onClick={() => { resetForm(); setAddingProrrogacao(true); }}><Plus size={14} /> Nova</button>}
            </div>

            {drawerProrrogacoes.length === 0 && !addingProrrogacao ? (
              <div className="text-center py-6"><Ban size={24} style={{ color: 'var(--tfd-text-muted)' }} className="mx-auto mb-2" /><p className="text-xs" style={{ color: 'var(--tfd-text-muted)' }}>Nenhuma prorrogacao</p></div>
            ) : (
              <div className="flex flex-col gap-3 mb-4">
                {drawerProrrogacoes.map((p: any, idx: number) => {
                  const dStyle = decisaoStyleMap[p.decisao] ?? decisaoStyleMap.PENDENTE;
                  const isTarget = inlineAction?.id === p.id;
                  const subStatus = prorrogacaoSubStatus(p);
                  const viagem = (p as any).viagem;
                  const ajuda = (p as any).ajuda;

                  return (
                    <div key={p.id} className="rounded-lg px-4 py-3" style={{ border: `1px solid ${isTarget ? 'var(--tfd-primary-300)' : 'var(--tfd-surface-border)'}`, backgroundColor: isTarget ? 'var(--tfd-primary-50)' : 'var(--tfd-surface-50)' }}>
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold" style={{ color: 'var(--tfd-text-muted)' }}>#{idx + 1}</span>
                          <span className="text-sm font-medium" style={{ color: 'var(--tfd-text-primary)' }}>+{p.dias_adicionais_solicitados} dias</span>
                          {p.nova_data_retorno && <span className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>→ {formatDate(p.nova_data_retorno)}</span>}
                        </div>
                        <span className="tfd-tag tfd-tag--rounded tfd-tag--dot shrink-0" style={{ backgroundColor: dStyle.bg, color: dStyle.text, fontSize: '0.65rem' }}>{dStyle.label}</span>
                      </div>

                      <p className="text-xs" style={{ color: 'var(--tfd-text-secondary)' }}>{p.justificativa_medica}</p>

                      {/* Sub-status indicators for APROVADA */}
                      {p.decisao === 'APROVADA' && (
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: viagem ? '#DCFCE7' : '#EDE9FE', color: viagem ? '#15803D' : '#7C3AED' }}>
                            {viagem ? `Passagem: ${formatDate(viagem.data_embarque_prevista)}` : 'Sem passagem'}
                          </span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: ajuda ? '#DCFCE7' : '#FFF7ED', color: ajuda ? '#15803D' : '#EA580C' }}>
                            {ajuda ? `Ajuda: ${formatCurrency(ajuda.valor_total ?? 0)}` : 'Sem ajuda custo'}
                          </span>
                        </div>
                      )}

                      {p.justificativa_decisao && <p className="text-xs mt-1" style={{ color: 'var(--tfd-text-muted)' }}>Motivo: {p.justificativa_decisao}</p>}

                      {/* Action buttons */}
                      {!isTarget && !addingProrrogacao && (
                        <div className="flex items-center gap-1.5 pt-2 mt-2" style={{ borderTop: '1px solid var(--tfd-surface-border)' }}>
                          {p.decisao === 'PENDENTE' && (
                            <>
                              <button type="button" className="tfd-btn tfd-btn--sm" style={{ backgroundColor: 'var(--tfd-status-success)', color: 'white', fontSize: '0.7rem', padding: '3px 8px' }} onClick={() => setInlineAction({ type: 'aprovar', id: p.id })}><CheckCircle2 size={12} /> Aprovar</button>
                              <button type="button" className="tfd-btn tfd-btn--sm" style={{ backgroundColor: '#FEE2E2', color: '#B91C1C', fontSize: '0.7rem', padding: '3px 8px' }} onClick={() => setInlineAction({ type: 'indeferir', id: p.id })}><XCircle size={12} /> Indeferir</button>
                            </>
                          )}
                          {p.decisao === 'APROVADA' && !viagem && (
                            <button type="button" className="tfd-btn tfd-btn--sm" style={{ backgroundColor: '#7C3AED', color: 'white', fontSize: '0.7rem', padding: '3px 8px' }} onClick={() => setInlineAction({ type: 'add-passagem', id: p.id })}><Plane size={12} /> Adicionar Passagem</button>
                          )}
                          {p.decisao === 'APROVADA' && !ajuda && (
                            <button type="button" className="tfd-btn tfd-btn--sm" style={{ backgroundColor: '#EA580C', color: 'white', fontSize: '0.7rem', padding: '3px 8px' }} onClick={() => setInlineAction({ type: 'add-ajuda', id: p.id })}><Wallet size={12} /> Adicionar Ajuda Custo</button>
                          )}
                          {p.decisao === 'APROVADA' && viagem && ajuda && (
                            <span className="text-xs" style={{ color: 'var(--tfd-status-success)' }}><CheckCircle2 size={12} className="inline mr-1" />Finalizada</span>
                          )}
                          {p.decisao === 'INDEFERIDA' && <span className="text-xs" style={{ color: '#B91C1C' }}>Indeferida</span>}
                        </div>
                      )}

                      {/* ── INLINE: Aprovar ── */}
                      {isTarget && inlineAction?.type === 'aprovar' && (
                        <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--tfd-primary-200)' }}>
                          <p className="text-xs font-medium mb-2" style={{ color: 'var(--tfd-text-primary)' }}>Confirma aprovacao de +{p.dias_adicionais_solicitados} dias?</p>
                          <div className="flex gap-2">
                            <button className="tfd-btn tfd-btn-secondary tfd-btn--sm flex-1" disabled={actionLoading} onClick={resetInlineAction}>Cancelar</button>
                            <button className="tfd-btn tfd-btn--sm flex-1" style={{ backgroundColor: 'var(--tfd-status-success)', color: 'white' }} disabled={actionLoading} onClick={() => handleConfirmAprovar(p.id)}>{actionLoading ? 'Aprovando...' : 'Confirmar'}</button>
                          </div>
                        </div>
                      )}

                      {/* ── INLINE: Indeferir ── */}
                      {isTarget && inlineAction?.type === 'indeferir' && (
                        <div className="mt-2 pt-2" style={{ borderTop: '1px solid #FCA5A5' }}>
                          <textarea className="tfd-input mb-2" rows={2} placeholder="Motivo do indeferimento..." value={indeferirMotivo} onChange={(e) => setIndeferirMotivo(e.target.value)} autoFocus />
                          <div className="flex gap-2">
                            <button className="tfd-btn tfd-btn-secondary tfd-btn--sm flex-1" disabled={actionLoading} onClick={resetInlineAction}>Cancelar</button>
                            <button className="tfd-btn tfd-btn--sm flex-1" style={{ background: '#EF4444', color: 'white' }} disabled={actionLoading || !indeferirMotivo.trim()} onClick={() => handleConfirmIndeferir(p.id)}>{actionLoading ? 'Indeferindo...' : 'Confirmar'}</button>
                          </div>
                        </div>
                      )}


                      {/* ── INLINE: Add Passagem ── */}
                      {isTarget && inlineAction?.type === 'add-passagem' && (
                        <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--tfd-primary-200)' }}>
                          <p className="text-xs font-semibold mb-2" style={{ color: '#7C3AED' }}>Adicionar Passagem</p>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <FormField label="Tipo">
                              <select className="tfd-input tfd-input--sm" value={passagemTipo} onChange={(e) => setPassagemTipo(e.target.value)}>
                                <option value="RETORNO">Retorno</option>
                                <option value="IDA">Ida</option>
                              </select>
                            </FormField>
                            <FormField label="Data embarque" required>
                              <input type="date" className="tfd-input tfd-input--sm" value={passagemData} onChange={(e) => setPassagemData(e.target.value)} />
                            </FormField>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <FormField label="Origem" required>
                              <input type="text" className="tfd-input tfd-input--sm" placeholder="Cidade" value={passagemOrigem} onChange={(e) => setPassagemOrigem(e.target.value)} />
                            </FormField>
                            <FormField label="Destino" required>
                              <input type="text" className="tfd-input tfd-input--sm" placeholder="Cidade" value={passagemDestino} onChange={(e) => setPassagemDestino(e.target.value)} />
                            </FormField>
                          </div>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <FormField label="Companhia">
                              <input type="text" className="tfd-input tfd-input--sm" placeholder="Ex: LATAM" value={passagemCompanhia} onChange={(e) => setPassagemCompanhia(e.target.value)} />
                            </FormField>
                            <FormField label="Valor">
                              <input type="text" className="tfd-input tfd-input--sm" placeholder="R$ 0,00" value={passagemValor} onChange={(e) => setPassagemValor(maskCurrency(e.target.value))} />
                            </FormField>
                          </div>
                          <div className="flex gap-2">
                            <button className="tfd-btn tfd-btn-secondary tfd-btn--sm flex-1" disabled={actionLoading} onClick={resetInlineAction}>Cancelar</button>
                            <button className="tfd-btn tfd-btn--sm flex-1" style={{ backgroundColor: '#7C3AED', color: 'white' }} disabled={actionLoading} onClick={() => handleSalvarPassagem(p.id)}>{actionLoading ? 'Salvando...' : 'Salvar Passagem'}</button>
                          </div>
                        </div>
                      )}

                      {/* ── INLINE: Add Ajuda Custo ── */}
                      {isTarget && inlineAction?.type === 'add-ajuda' && (
                        <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--tfd-primary-200)' }}>
                          <p className="text-xs font-semibold mb-2" style={{ color: '#EA580C' }}>Adicionar Ajuda de Custo</p>
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <FormField label="Data inicio" required>
                              <input type="date" className="tfd-input tfd-input--sm" value={ajudaDataInicio} onChange={(e) => setAjudaDataInicio(e.target.value)} />
                            </FormField>
                            <FormField label="Data fim" required>
                              <input type="date" className="tfd-input tfd-input--sm" value={ajudaDataFim} onChange={(e) => setAjudaDataFim(e.target.value)} />
                            </FormField>
                          </div>
                          <FormField label="Valor diaria">
                            <input type="text" className="tfd-input tfd-input--sm" placeholder={`R$ ${valorDiariaCompleta.toFixed(2).replace('.', ',')}`} value={ajudaValorDiaria} onChange={(e) => setAjudaValorDiaria(maskCurrency(e.target.value))} />
                          </FormField>
                          <div className="flex gap-2">
                            <button className="tfd-btn tfd-btn-secondary tfd-btn--sm flex-1" disabled={actionLoading} onClick={resetInlineAction}>Cancelar</button>
                            <button className="tfd-btn tfd-btn--sm flex-1" style={{ backgroundColor: '#EA580C', color: 'white' }} disabled={actionLoading} onClick={() => handleSalvarAjuda(p.id)}>{actionLoading ? 'Salvando...' : 'Salvar Ajuda Custo'}</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Adicionais (PA1–PA4, AU1) ── */}
            {drawerSolId && !addingProrrogacao && (
              <>
                <hr className="tfd-divider" />
                <AdicionaisSection solicitacaoId={drawerSolId} />
              </>
            )}

            {/* ── Add prorrogacao form ── */}
            {addingProrrogacao && (
              <>
                <hr className="tfd-divider" />
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--tfd-text-primary)' }}>Nova Prorrogacao</h3>
                <FormField label="Dias adicionais" required>
                  <input type="number" className="tfd-input" min={1} placeholder="Ex: 5" value={diasAdicionais} onChange={(e) => setDiasAdicionais(e.target.value)} />
                </FormField>
                <FormField label="Nova data retorno" required>
                  <input type="date" className="tfd-input" value={novaDataRetorno} onChange={(e) => setNovaDataRetorno(e.target.value)} />
                </FormField>
                <FormField label="Justificativa" required>
                  <textarea className="tfd-input" rows={3} placeholder="Justificativa medica ou administrativa..." value={justificativaProrr} onChange={(e) => setJustificativaProrr(e.target.value)} />
                </FormField>
                <div className="flex gap-2">
                  <button className="tfd-btn tfd-btn-secondary flex-1" onClick={resetForm}>Cancelar</button>
                  <button className="tfd-btn tfd-btn-primary flex-1" onClick={handleSaveProrrogacao}>Solicitar Prorrogacao</button>
                </div>
              </>
            )}
          </>
        )}
      </Drawer>
    </>
  );
}
