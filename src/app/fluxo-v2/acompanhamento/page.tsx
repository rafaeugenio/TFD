'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, Plane, Search, Archive } from 'lucide-react';
import { idadeAnos } from '../_utils/idade';
import RowActions from '../_components/RowActions';
import NewPassagemDrawer from '../_components/drawers/NewPassagemDrawer';
import { useFluxoV2State } from '../_state/FluxoV2Provider';
import {
  calcularValorAjuda,
  type SolicitacaoMock,
  type ViagemMock,
} from '@/core/mocks/fluxo-v2-v3-seed';
import Pagination from '@/shared/components/pagination/Pagination';
import StatsRow from '@/shared/components/stats-row/StatsRow';
import PageHeader from '@/shared/components/page-header/PageHeader';
import SortTh, { compareValues, nextSort, type SortDir } from '@/shared/components/sort-th/SortTh';
import { Skeleton } from '@/components/ui/skeleton';
import { fmtDataBR } from '@/shared/utils/fmtData';

const DEFAULT_PAGE_SIZE = 25;

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const VIAGEM_ATIVA: ViagemMock['status'][] = ['agendada', 'confirmada', 'remarcada', 'nao_compareceu'];

/**
 * Uma solicitação aparece no Acompanhamento quando há algo já emitido
 * para ser controlado/conciliado/encerrado:
 *  - viagem em status ativo (não cancelada/reembolso) OU
 *  - ajuda em aprovada/em_pagamento/concluida OU
 *  - status === encerrada (histórico)
 */
function temAcompanhamento(s: SolicitacaoMock): boolean {
  if (s.status === 'encerrada') return true;
  if (s.viagens.some((v) => VIAGEM_ATIVA.includes(v.status))) return true;
  if (s.ajudasCusto.some((a) => ['aprovada', 'em_pagamento', 'concluida'].includes(a.status))) return true;
  return false;
}

function proximaViagem(s: SolicitacaoMock): { viagem: ViagemMock; trecho: string } | null {
  const validas = s.viagens.filter((v) => !['cancelada', 'reembolso'].includes(v.status));
  if (validas.length === 0) return null;
  const hoje = new Date().toISOString().slice(0, 10);
  const futuras = validas.filter((v) => v.data >= hoje).sort((a, b) => a.data.localeCompare(b.data));
  const escolhida = futuras.length > 0
    ? futuras[0]
    : [...validas].sort((a, b) => b.data.localeCompare(a.data))[0];
  return {
    viagem: escolhida,
    trecho: `${escolhida.origem.split(' - ')[0]} → ${escolhida.destino.split(' - ')[0]}`,
  };
}

/** Valor efetivamente desembolsado, descontando reembolsos parciais.
 *  (Viagem cancelada/reembolso integral entra com 0; reembolso parcial
 *  desconta o valorReembolso do valor cheio.) */
function totalEfetivo(s: SolicitacaoMock): number {
  type Viagem = ViagemMock & { valorReembolso?: number };
  const p = s.viagens.reduce((a, v) => {
    if (['cancelada', 'reembolso'].includes(v.status)) return a;
    const reembolso = (v as Viagem).valorReembolso ?? 0;
    return a + Math.max(0, v.valor - reembolso);
  }, 0);
  const ac = s.ajudasCusto.reduce(
    (a, x) => a + calcularValorAjuda(x.dataInicio, x.dataFim, x.pernoiteRetorno).valor,
    0,
  );
  const ad = s.adicionais.filter((x) => x.status === 'aprovado' || x.status === 'pago').reduce((a, x) => a + x.valor, 0);
  return p + ac + ad;
}

const STATUS_LABEL: Record<ViagemMock['status'], { label: string; color: string }> = {
  agendada:        { label: 'Emitida',     color: '#2563EB' },
  confirmada:      { label: 'Embarcou',    color: '#15803D' },
  remarcada:       { label: 'Remarcada',   color: '#D97706' },
  nao_compareceu:  { label: 'No-show',     color: '#B91C1C' },
  cancelada:       { label: 'Cancelada',   color: '#6B7280' },
  reembolso:       { label: 'Reembolso',   color: '#6B7280' },
};

type Aba = 'ativas' | 'encerradas';

export default function AcompanhamentoListPage() {
  const router = useRouter();
  const { solicitacoes, isLoading } = useFluxoV2State();

  const [aba, setAba] = useState<Aba>('ativas');
  const [busca, setBusca] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<{ field: string; dir: SortDir }>({ field: 'proxima', dir: 'asc' });

  const [editarViagem, setEditarViagem] = useState<{ solicitacao: SolicitacaoMock; viagem: ViagemMock } | null>(null);

  const stats = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    const em7dias = new Date();
    em7dias.setDate(em7dias.getDate() + 7);
    const ate = em7dias.toISOString().slice(0, 10);

    let proximas = 0;
    let utilizadasMes = 0;
    let encerradasMes = 0;
    let totalAcompanhado = 0;
    const mesAtual = new Date().toISOString().slice(0, 7);
    for (const s of solicitacoes) {
      for (const v of s.viagens) {
        if (VIAGEM_ATIVA.includes(v.status) && v.data >= hoje && v.data <= ate) proximas++;
        if (v.status === 'confirmada' && v.data.slice(0, 7) === mesAtual) utilizadasMes++;
        if (VIAGEM_ATIVA.includes(v.status)) totalAcompanhado += v.valor;
      }
      if (s.status === 'encerrada' && s.encerramento?.data?.slice(0, 7) === mesAtual) encerradasMes++;
    }
    return { proximas, utilizadasMes, encerradasMes, totalAcompanhado };
  }, [solicitacoes]);

  const fila = useMemo(
    () => solicitacoes.filter((s) => {
      if (!temAcompanhamento(s)) return false;
      if (aba === 'ativas' && s.status === 'encerrada') return false;
      if (aba === 'encerradas' && s.status !== 'encerrada') return false;

      if (busca.trim()) {
        const q = busca.toLowerCase();
        if (
          !s.paciente.nome.toLowerCase().includes(q) &&
          !s.paciente.cpf.includes(q) &&
          !s.numero.toLowerCase().includes(q)
        ) return false;
      }
      return true;
    }),
    [solicitacoes, aba, busca],
  );

  useEffect(() => { setPage(1); }, [aba, busca, sort]);

  const filaOrdenada = useMemo(() => {
    if (!sort.field || !sort.dir) return fila;
    const getValue = (s: SolicitacaoMock): unknown => {
      switch (sort.field) {
        case 'numero':   return s.numero;
        case 'paciente': return s.paciente.nome;
        case 'destino': {
          const px = proximaViagem(s);
          return px ? px.viagem.destino : '';
        }
        case 'proxima':  return proximaViagem(s)?.viagem.data ?? '9999-99-99';
        case 'total':    return totalEfetivo(s);
        default:         return '';
      }
    };
    const sorted = [...fila].sort((a, b) => compareValues(getValue(a), getValue(b)));
    return sort.dir === 'desc' ? sorted.reverse() : sorted;
  }, [fila, sort]);

  const toggleSort = (field: string) => setSort((prev) => nextSort(field, prev));

  const paginadas = useMemo(
    () => filaOrdenada.slice((page - 1) * pageSize, page * pageSize),
    [filaOrdenada, page, pageSize],
  );

  return (
    <div>
      <PageHeader
        title="Acompanhamento"
        subtitle="Controle pós-emissão: remarcar, cancelar, registrar embarque e conciliar pagamentos."
      />

      <StatsRow
        stats={[
          { label: 'Embarques próximos 7d', value: stats.proximas, hint: 'viagens ativas com data nas próximas semanas' },
          { label: 'Utilizadas no mês', value: stats.utilizadasMes, hint: 'passageiros que embarcaram' },
          { label: 'Encerradas no mês', value: stats.encerradasMes, hint: 'alta, transferência, óbito, abandono ou desistência' },
          { label: 'Total acompanhado', value: fmtBRL(stats.totalAcompanhado), hint: 'valor de passagens ativas' },
        ]}
      />

      {/* Tabs Ativas / Encerradas */}
      <div className="flex items-center gap-1 mt-2 mb-4" style={{ borderBottom: '1px solid #E2E8F0' }}>
        {([
          { key: 'ativas',     label: 'Em acompanhamento' },
          { key: 'encerradas', label: 'Encerradas' },
        ] as { key: Aba; label: string }[]).map((t) => {
          const active = aba === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setAba(t.key)}
              className="relative px-4 py-2.5 text-[13px] font-medium transition-colors"
              style={{
                color: active ? '#146BFA' : '#64748B',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {t.label}
              {active && (
                <span style={{ position: 'absolute', left: 0, right: 0, bottom: -1, height: 2, background: '#146BFA' }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div
          className="flex items-center gap-2 px-3"
          style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8, height: 36, minWidth: 280 }}
        >
          <Search size={14} style={{ color: '#9CA3AF' }} />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por paciente, CPF ou número..."
            className="flex-1 bg-transparent outline-none text-[13px]"
          />
        </div>
      </div>

      {/* Tabela */}
      <div
        style={{
          background: 'white',
          border: '1px solid var(--tfd-surface-border)',
          borderRadius: 'var(--tfd-radius-lg)',
          overflow: 'hidden',
        }}
      >
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--tfd-surface-border)' }}>
              <SortTh label="Número" field="numero" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <SortTh label="Paciente" field="paciente" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <SortTh label="Destino" field="destino" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <SortTh label="Próximo embarque" field="proxima" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <th className="px-4 py-3 font-semibold text-left" style={{ color: '#64748B', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</th>
              <th className="px-4 py-3 font-semibold text-left" style={{ color: '#64748B', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Bilhete / Cia</th>
              <SortTh label="Total efetivo" field="total" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} align="right" />
              <th className="px-4 py-3 font-semibold text-right" style={{ color: '#64748B', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 6 }).map((_, i) => (
              <tr key={`sk-${i}`} style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}>
                {Array.from({ length: 8 }).map((__, j) => (
                  <td key={j} className="px-4 py-3.5"><Skeleton className="h-4 w-24" /></td>
                ))}
              </tr>
            ))}
            {!isLoading && fila.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-16 text-center" style={{ color: '#9CA3AF' }}>
                  <p className="text-sm">
                    {aba === 'ativas' ? 'Nada para acompanhar no momento.' : 'Nenhuma solicitação encerrada ainda.'}
                  </p>
                </td>
              </tr>
            )}
            {!isLoading && paginadas.map((s) => {
              const proxima = proximaViagem(s);
              const total = totalEfetivo(s);
              const v = proxima?.viagem;
              const destinoText = v ? v.destino : '—';
              return (
                <tr
                  key={s.id}
                  style={{ borderBottom: '1px solid #E2E8F0', cursor: 'pointer' }}
                  className="hover:bg-[#F8FAFC] transition-colors"
                  onClick={() => router.push(`/fluxo-v2/solicitacoes/${s.id}?tab=financeiro`)}
                >
                  <td className="px-4 py-3.5 font-mono text-[13px]">{s.numero}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/pacientes/${s.paciente.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="transition-colors hover:underline"
                        style={{ color: '#146BFA', fontWeight: 500, fontSize: 14, textUnderlineOffset: 3 }}
                      >
                        {s.paciente.nome}
                      </Link>
                      <span className="text-[12px]" style={{ color: '#94A3B8' }}>{idadeAnos(s.paciente.dataNascimento)} anos</span>
                    </div>
                    <div className="text-[12px] font-mono mt-0.5" style={{ color: '#94A3B8' }}>{s.paciente.cpf}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    {v ? (
                      <div className="leading-tight">
                        <div style={{ color: '#1E293B', fontSize: 13, fontWeight: 500 }}>{destinoText}</div>
                        <div style={{ color: '#94A3B8', fontSize: 11 }} title={proxima?.trecho}>
                          {v.tipo === 'ida' ? 'Ida' : v.tipo === 'volta' ? 'Volta' : v.tipo === 'transfer' ? 'Transfer' : '—'}
                          {v.modal ? ` · ${v.modal.charAt(0).toUpperCase() + v.modal.slice(1)}` : ''}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: '#CBD5E1' }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5" style={{ color: '#1E293B', fontSize: 13, fontWeight: 500 }}>
                    {v ? (
                      <span title={proxima?.trecho}>{fmtDataBR(v.data)}</span>
                    ) : (
                      <span style={{ color: '#CBD5E1' }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {v ? (
                      <span
                        className="inline-flex items-center px-2 py-[3px] text-[11px] font-semibold uppercase"
                        style={{
                          background: '#F1F5F9',
                          color: STATUS_LABEL[v.status].color,
                          border: '1px solid #E2E8F0',
                          borderRadius: 6,
                          letterSpacing: '0.05em',
                        }}
                      >
                        {STATUS_LABEL[v.status].label}
                      </span>
                    ) : s.status === 'encerrada' ? (
                      <span className="inline-flex items-center gap-1 text-[12px]" style={{ color: '#6B7280' }}>
                        <Archive size={12} /> Encerrada
                      </span>
                    ) : (
                      <span style={{ color: '#CBD5E1', fontSize: 13 }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {v && (v.companhia || v.bilheteUrl) ? (
                      <div className="leading-tight">
                        {v.companhia && <div style={{ color: '#1E293B', fontSize: 12, fontWeight: 500 }}>{v.companhia}</div>}
                        {v.bilheteUrl && <div className="font-mono" style={{ color: '#94A3B8', fontSize: 11 }}>{v.bilheteUrl}</div>}
                      </div>
                    ) : (
                      <span style={{ color: '#CBD5E1', fontSize: 13 }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono" style={{ color: '#0F172A', fontWeight: 600, fontSize: 14 }}>
                    {fmtBRL(total)}
                  </td>
                  <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <RowActions
                      actions={[
                        {
                          key: 'abrir',
                          icon: Eye,
                          label: 'Abrir detalhes',
                          onClick: () => router.push(`/fluxo-v2/solicitacoes/${s.id}?tab=financeiro`),
                        },
                        {
                          key: 'editar-viagem',
                          icon: Plane,
                          label: v ? 'Editar próxima viagem' : 'Sem viagem ativa',
                          disabled: !v,
                          onClick: () => {
                            const next = s.viagens
                              .filter((vv) => !['cancelada', 'reembolso'].includes(vv.status))
                              .sort((a, b) => a.data.localeCompare(b.data))[0];
                            if (next) setEditarViagem({ solicitacao: s, viagem: next });
                          },
                        },
                      ]}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <Pagination
          total={filaOrdenada.length}
          pageSize={pageSize}
          page={page}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          recordLabel="solicitação(ões)"
        />
      </div>

      {/* Drawer de edição de viagem reaproveitado */}
      {editarViagem && (
        <NewPassagemDrawer
          open
          onClose={() => setEditarViagem(null)}
          solicitacaoId={editarViagem.solicitacao.id}
          editar={editarViagem.viagem}
        />
      )}
    </div>
  );
}
