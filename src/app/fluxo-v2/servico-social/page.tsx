'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, AlertTriangle, FileText } from 'lucide-react';
import PageHeader from '@/shared/components/page-header/PageHeader';
import StatsRow from '@/shared/components/stats-row/StatsRow';
import Pagination from '@/shared/components/pagination/Pagination';
import SortTh, { compareValues, nextSort, type SortDir } from '@/shared/components/sort-th/SortTh';
import StatusDot, { type StatusDotTone } from '../_components/StatusDot';
import { useFluxoV2State } from '../_state/FluxoV2Provider';
import {
  useServicoSocial,
  contarInstrumentos,
} from '../_state/servicoSocialStore';
import {
  ETAPAS_IMPACTADAS,
  ETAPA_IMPACTADA_LABEL,
  SETOR_ORIGEM_LABEL,
  SITUACAO_DEMANDA_LABEL,
  demandaEstaAberta,
  type DemandaSocialMock,
  type EtapaImpactada,
  type SituacaoDemandaSocial,
} from '@/core/mocks/servico-social-seed';

const DEFAULT_PAGE_SIZE = 25;

const SITUACAO_TONE: Record<SituacaoDemandaSocial, StatusDotTone> = {
  pendente: 'warning',
  em_atendimento: 'info',
  concluida: 'success',
  cancelada: 'muted',
};

/** O filtro de situação começa em "abertas", que reúne Pendente e Em atendimento. */
type SituacaoFiltro = 'abertas' | 'todas' | SituacaoDemandaSocial;

const SITUACAO_OPTIONS: { value: SituacaoFiltro; label: string }[] = [
  { value: 'abertas', label: 'Abertas (pendentes e em atendimento)' },
  { value: 'todas', label: 'Todas as situações' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_atendimento', label: 'Em atendimento' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'cancelada', label: 'Cancelada' },
];

function dataHoraBR(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Fila de trabalho do Serviço Social. Lista as demandas vinculadas às
 * solicitações de TFD, independente da listagem principal de solicitações.
 * Cada linha leva ao detalhe da solicitação de origem, na aba Serviço Social.
 */
export default function ServicoSocialListPage() {
  const router = useRouter();
  const { isLoading } = useFluxoV2State();
  const { demandas } = useServicoSocial();

  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState<SituacaoFiltro>('abertas');
  const [profissional, setProfissional] = useState('');
  const [etapa, setEtapa] = useState<EtapaImpactada | ''>('');
  const [de, setDe] = useState('');
  const [ate, setAte] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<{ field: string; dir: SortDir }>({ field: 'data', dir: 'desc' });

  const profissionaisNaFila = useMemo(() => {
    const set = new Set<string>();
    demandas.forEach((d) => { if (d.profissionalResponsavel) set.add(d.profissionalResponsavel); });
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [demandas]);

  const stats = useMemo(() => {
    const pendentes = demandas.filter((d) => d.situacao === 'pendente').length;
    const emAtendimento = demandas.filter((d) => d.situacao === 'em_atendimento').length;
    const comEtapaImpactada = demandas.filter(
      (d) => demandaEstaAberta(d) && d.etapasImpactadas.length > 0,
    ).length;
    return { pendentes, emAtendimento, comEtapaImpactada };
  }, [demandas]);

  const filtroAtivo =
    busca.trim() !== '' || situacao !== 'abertas' || profissional !== '' ||
    etapa !== '' || de !== '' || ate !== '';

  function limparFiltros() {
    setBusca('');
    setSituacao('abertas');
    setProfissional('');
    setEtapa('');
    setDe('');
    setAte('');
  }

  const filtradas = useMemo(
    () => demandas.filter((d) => {
      if (situacao === 'abertas' && !demandaEstaAberta(d)) return false;
      if (situacao !== 'abertas' && situacao !== 'todas' && d.situacao !== situacao) return false;
      if (profissional && d.profissionalResponsavel !== profissional) return false;
      if (etapa && !d.etapasImpactadas.includes(etapa)) return false;

      const dia = d.dataEncaminhamento.slice(0, 10);
      if (de && dia < de) return false;
      if (ate && dia > ate) return false;

      if (busca.trim()) {
        const q = busca.toLowerCase();
        if (
          !d.pacienteNome.toLowerCase().includes(q) &&
          !d.solicitacaoNumero.toLowerCase().includes(q) &&
          !d.pacienteCpf.includes(q)
        ) return false;
      }
      return true;
    }),
    [demandas, situacao, profissional, etapa, de, ate, busca],
  );

  useEffect(() => { setPage(1); }, [busca, situacao, profissional, etapa, de, ate, sort]);

  const ordenadas = useMemo(() => {
    if (!sort.field || !sort.dir) return filtradas;
    const getValue = (d: DemandaSocialMock): unknown => {
      switch (sort.field) {
        case 'paciente': return d.pacienteNome;
        case 'numero': return d.solicitacaoNumero;
        case 'data': return d.dataEncaminhamento;
        case 'situacao': return SITUACAO_DEMANDA_LABEL[d.situacao];
        case 'instrumentos': return contarInstrumentos(d.id);
        default: return '';
      }
    };
    return [...filtradas].sort((a, b) => {
      const r = compareValues(getValue(a), getValue(b));
      return sort.dir === 'asc' ? r : -r;
    });
  }, [filtradas, sort]);

  const paginadas = useMemo(
    () => ordenadas.slice((page - 1) * pageSize, page * pageSize),
    [ordenadas, page, pageSize],
  );

  const toggleSort = (field: string) => setSort((prev) => nextSort(field, prev));

  const inputStyle = {
    height: 36,
    padding: '0 12px',
    background: 'white',
    border: '1px solid var(--tfd-surface-border)',
    borderRadius: 8,
    fontSize: 13,
    color: '#1A1D2B',
  } as const;

  return (
    <div>
      <PageHeader
        title="Serviço Social"
        subtitle="Demandas sociais vinculadas às solicitações de TFD. Correm em paralelo ao fluxo principal."
      />

      <StatsRow
        stats={[
          {
            label: 'Pendentes',
            value: stats.pendentes,
            hint: 'aguardando atendimento',
            title: 'Demandas encaminhadas que ainda não foram assumidas pela equipe social',
          },
          {
            label: 'Em atendimento',
            value: stats.emAtendimento,
            hint: 'com profissional',
            title: 'Demandas já assumidas por uma profissional do Serviço Social',
          },
          {
            label: 'Com etapa impactada',
            value: stats.comEtapaImpactada,
            hint: 'entre as abertas',
            title: 'Demandas abertas que sinalizaram impacto em alguma etapa do fluxo do TFD',
          },
        ]}
      />

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

        <select value={situacao} onChange={(e) => setSituacao(e.target.value as SituacaoFiltro)} style={inputStyle}>
          {SITUACAO_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <select value={profissional} onChange={(e) => setProfissional(e.target.value)} style={inputStyle}>
          <option value="">Todas as profissionais</option>
          {profissionaisNaFila.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <select value={etapa} onChange={(e) => setEtapa(e.target.value as EtapaImpactada | '')} style={inputStyle}>
          <option value="">Todas as etapas impactadas</option>
          {ETAPAS_IMPACTADAS.map((e) => (
            <option key={e} value={e}>{ETAPA_IMPACTADA_LABEL[e]}</option>
          ))}
        </select>

        <div className="flex items-center gap-1.5">
          <input type="date" value={de} onChange={(e) => setDe(e.target.value)} style={inputStyle} title="Encaminhadas a partir de" />
          <span className="text-[12px]" style={{ color: '#94A3B8' }}>até</span>
          <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} style={inputStyle} title="Encaminhadas até" />
        </div>

        {filtroAtivo && (
          <button type="button" className="tfd-btn tfd-btn-ghost" onClick={limparFiltros}>
            Limpar filtros
          </button>
        )}
      </div>

      <div style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 'var(--tfd-radius-lg)', overflow: 'hidden' }}>
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--tfd-surface-border)' }}>
              <SortTh label="Paciente" field="paciente" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <SortTh label="Solicitação" field="numero" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <SortTh label="Encaminhada em" field="data" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <Th>Origem</Th>
              <SortTh label="Situação" field="situacao" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <Th>Etapas impactadas</Th>
              <SortTh label="Instrumentos" field="instrumentos" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} align="right" />
            </tr>
          </thead>
          <tbody>
            {isLoading && demandas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center" style={{ color: '#9CA3AF' }}>
                  Carregando...
                </td>
              </tr>
            )}

            {!isLoading && ordenadas.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <p className="text-[13px]" style={{ color: '#64748B' }}>
                    {filtroAtivo
                      ? 'Nenhuma demanda encontrada com os filtros aplicados.'
                      : 'Nenhuma demanda de Serviço Social registrada.'}
                  </p>
                  {filtroAtivo && (
                    <button type="button" className="tfd-btn tfd-btn-ghost mt-3 inline-flex" onClick={limparFiltros}>
                      Limpar filtros
                    </button>
                  )}
                </td>
              </tr>
            )}

            {paginadas.map((d) => {
              const qtd = contarInstrumentos(d.id);
              const aberta = demandaEstaAberta(d);
              return (
                <tr
                  key={d.id}
                  style={{ borderBottom: '1px solid #E2E8F0', cursor: 'pointer' }}
                  className="hover:bg-[#F8FAFC] transition-colors"
                  onClick={() =>
                    router.push(`/fluxo-v2/solicitacoes/${d.solicitacaoId}?tab=servico-social&from=servico-social`)
                  }
                >
                  <td className="px-4 py-3.5">
                    <div className="leading-tight">
                      <div style={{ color: '#1E293B', fontSize: 13, fontWeight: 500 }}>{d.pacienteNome}</div>
                      <div className="font-mono" style={{ color: '#94A3B8', fontSize: 12 }}>{d.pacienteCpf}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono" style={{ color: '#146BFA', fontSize: 13, fontWeight: 500 }}>
                    {d.solicitacaoNumero}
                  </td>
                  <td className="px-4 py-3.5" style={{ color: '#475569', fontSize: 13 }}>
                    {dataHoraBR(d.dataEncaminhamento)}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="leading-tight">
                      <div style={{ color: '#1E293B', fontSize: 13 }}>{d.encaminhadoPor}</div>
                      <div style={{ color: '#94A3B8', fontSize: 12 }}>{SETOR_ORIGEM_LABEL[d.setorOrigem]}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusDot tone={SITUACAO_TONE[d.situacao]}>
                      {SITUACAO_DEMANDA_LABEL[d.situacao]}
                    </StatusDot>
                    {d.profissionalResponsavel && (
                      <div style={{ color: '#94A3B8', fontSize: 12 }}>{d.profissionalResponsavel}</div>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {d.etapasImpactadas.length === 0 ? (
                      <span style={{ color: '#CBD5E1', fontSize: 12 }}>Nenhuma</span>
                    ) : (
                      <div className="flex items-center gap-1 flex-wrap">
                        {d.etapasImpactadas.map((e) => (
                          <span
                            key={e}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[11.5px]"
                            style={{
                              background: aberta ? '#FFF7ED' : '#F8FAFC',
                              border: `1px solid ${aberta ? '#FDBA74' : '#E2E8F0'}`,
                              borderRadius: 999,
                              color: aberta ? '#9A3412' : '#94A3B8',
                            }}
                          >
                            <AlertTriangle size={10} /> {ETAPA_IMPACTADA_LABEL[e]}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="inline-flex items-center gap-1.5" style={{ color: qtd > 0 ? '#1E293B' : '#CBD5E1', fontSize: 13 }}>
                      <FileText size={13} /> {qtd}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Pagination
          total={ordenadas.length}
          pageSize={pageSize}
          page={page}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          recordLabel="demandas"
        />
      </div>
    </div>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      className={`px-4 py-3 font-semibold ${align === 'right' ? 'text-right' : 'text-left'}`}
      style={{ color: '#64748B', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}
    >
      {children}
    </th>
  );
}
