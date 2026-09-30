'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Send, FilePlus, PlayCircle, FileText } from 'lucide-react';
import RowActions from '../_components/RowActions';
import BotaoEnvio from '../_components/BotaoEnvio';
import SolicitacaoNumeroCell from '../_components/SolicitacaoNumeroCell';
import PacienteHoverCell from '../_components/PacienteHoverCell';
import RegiaoRegionalMunicipioFilter from '../_components/RegiaoRegionalMunicipioFilter';
import StatusDot, { type StatusDotTone } from '../_components/StatusDot';
import StatusV2Badge from '../_components/StatusV2Badge';
import EnviarParaSetorDrawer from '../_components/drawers/EnviarParaSetorDrawer';
import AssumirDemandaDrawer from '../_components/drawers/AssumirDemandaDrawer';
import NewInstrumentoDrawer from '../_components/drawers/NewInstrumentoDrawer';
import { useFluxoV2State } from '../_state/FluxoV2Provider';
import { useServicoSocial } from '../_state/servicoSocialStore';
import { tempoNoSetor } from '../_utils/tempoSetor';
import { setorAtual, type SetorAcao } from '../_utils/lock';
import { casaComFiltroRegiao, REGIAO_FILTRO_VAZIO, type RegiaoFiltroValue } from '../_utils/derivarRegional';
import Pagination from '@/shared/components/pagination/Pagination';
import StatsRow from '@/shared/components/stats-row/StatsRow';
import PageHeader from '@/shared/components/page-header/PageHeader';
import SortTh, { compareValues, nextSort, type SortDir } from '@/shared/components/sort-th/SortTh';
import { Skeleton } from '@/components/ui/skeleton';
import { Can } from '@/shared/auth/Can';
import { usePermissions } from '@/shared/auth/PermissionsProvider';
import {
  SITUACAO_DEMANDA_LABEL,
  demandaEstaAberta,
  type DemandaSocialMock,
  type SituacaoDemandaSocial,
} from '@/core/mocks/servico-social-seed';
import type { SolicitacaoMock } from '@/core/mocks/fluxo-v2-v3-seed';

const DEFAULT_PAGE_SIZE = 25;

/** O drawer de tramitação só aceita os setores de ação. Uma solicitação
 *  encerrada cai em Acompanhamento como origem, já que a demanda social é
 *  paralela e não depende do setor. */
function setorDeOrigem(s: SolicitacaoMock): SetorAcao {
  const atual = setorAtual(s);
  return atual === 'encerramento' ? 'acompanhamento' : atual;
}

const SITUACAO_TONE: Record<SituacaoDemandaSocial, StatusDotTone> = {
  pendente: 'warning',
  em_atendimento: 'info',
  concluida: 'success',
  cancelada: 'muted',
};

/** O filtro começa em "abertas", que reúne Pendente e Em atendimento. */
type SituacaoFiltro = 'abertas' | 'all' | SituacaoDemandaSocial;

const SITUACAO_OPTIONS: { value: SituacaoFiltro; label: string }[] = [
  { value: 'abertas', label: 'Demandas abertas' },
  { value: 'all', label: 'Todas as situações' },
  { value: 'pendente', label: 'Pendente' },
  { value: 'em_atendimento', label: 'Em atendimento' },
  { value: 'concluida', label: 'Concluída' },
  { value: 'cancelada', label: 'Cancelada' },
];

type DrawerKind = 'instrumento' | 'assumir' | null;

/**
 * Fila do setor de Serviço Social. Mesma estrutura das demais filas do fluxo
 * (Regulação, Passagens, Ajuda de Custo, Acompanhamento): uma linha por
 * solicitação, com a mesma ordem de colunas, os mesmos filtros e a mesma
 * coluna de ações. A diferença é que a demanda é paralela: a solicitação
 * continua no setor em que está, sem trava e sem mudar de etapa.
 */
export default function ServicoSocialListPage() {
  const router = useRouter();
  const { solicitacoes, isLoading } = useFluxoV2State();
  const { demandas, instrumentos } = useServicoSocial();
  const { can } = usePermissions();
  /** PBI 16409, RN09: as ações da equipe dependem do perfil Serviço Social. */
  const podeAtender = can('acao.servico_social.atender');
  const podeCriarInstrumento = can('instrumento_social.criar');

  const [drawer, setDrawer] = useState<{ kind: DrawerKind; sol: SolicitacaoMock | null; demanda: DemandaSocialMock | null }>({
    kind: null, sol: null, demanda: null,
  });
  const [enviar, setEnviar] = useState<SolicitacaoMock | null>(null);
  const [busca, setBusca] = useState('');
  const [situacaoFiltro, setSituacaoFiltro] = useState<SituacaoFiltro>('abertas');
  const [profissionalFiltro, setProfissionalFiltro] = useState('');
  const [regiaoFiltro, setRegiaoFiltro] = useState<RegiaoFiltroValue>(REGIAO_FILTRO_VAZIO);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<{ field: string; dir: SortDir }>({ field: 'tempo', dir: 'desc' });

  /** Demandas agrupadas por solicitação, da mais recente para a mais antiga. */
  const porSolicitacao = useMemo(() => {
    const m = new Map<string, DemandaSocialMock[]>();
    for (const d of demandas) {
      const lista = m.get(d.solicitacaoId) ?? [];
      lista.push(d);
      m.set(d.solicitacaoId, lista);
    }
    for (const lista of m.values()) {
      lista.sort((a, b) => b.dataEncaminhamento.localeCompare(a.dataEncaminhamento));
    }
    return m;
  }, [demandas]);

  /** A fila é de solicitações que têm ao menos uma demanda social. */
  const filaBase = useMemo(
    () => solicitacoes.filter((s) => porSolicitacao.has(s.id)),
    [solicitacoes, porSolicitacao],
  );

  /** Demanda que representa a solicitação na linha: a aberta mais recente;
   *  sem nenhuma aberta, a última registrada. */
  const demandaDaLinha = useMemo(() => {
    const m = new Map<string, DemandaSocialMock>();
    for (const [id, lista] of porSolicitacao) {
      m.set(id, lista.find(demandaEstaAberta) ?? lista[0]);
    }
    return m;
  }, [porSolicitacao]);

  /** Profissionais que já assumiram alguma demanda — alimenta o filtro. */
  const profissionais = useMemo(() => {
    const set = new Set<string>();
    demandas.forEach((d) => { if (d.profissionalResponsavel) set.add(d.profissionalResponsavel); });
    return [...set].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [demandas]);

  /** Documentos do Serviço Social da solicitação, vinculados a demanda ou
   *  avulsos (PBI 16409, CA01). */
  const totaisInstrumentos = useMemo(() => {
    const m = new Map<string, number>();
    for (const i of instrumentos) {
      m.set(i.solicitacaoId, (m.get(i.solicitacaoId) ?? 0) + 1);
    }
    return m;
  }, [instrumentos]);

  const stats = useMemo(() => {
    const pendentes = demandas.filter((d) => d.situacao === 'pendente').length;
    const emAtendimento = demandas.filter((d) => d.situacao === 'em_atendimento').length;
    const semResponsavel = demandas.filter(
      (d) => demandaEstaAberta(d) && !d.profissionalResponsavel,
    ).length;
    return { pendentes, emAtendimento, semResponsavel };
  }, [demandas]);

  const fila = useMemo(
    () => filaBase.filter((s) => {
      const lista = porSolicitacao.get(s.id) ?? [];

      if (situacaoFiltro === 'abertas' && !lista.some(demandaEstaAberta)) return false;
      if (situacaoFiltro !== 'abertas' && situacaoFiltro !== 'all'
        && !lista.some((d) => d.situacao === situacaoFiltro)) return false;
      if (profissionalFiltro && !lista.some((d) => d.profissionalResponsavel === profissionalFiltro)) return false;
      if (!casaComFiltroRegiao(s.paciente, regiaoFiltro)) return false;

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
    [filaBase, porSolicitacao, situacaoFiltro, profissionalFiltro, regiaoFiltro, busca],
  );

  useEffect(() => {
    setPage(1);
  }, [busca, situacaoFiltro, profissionalFiltro, regiaoFiltro, sort]);

  const filaOrdenada = useMemo(() => {
    if (!sort.field || !sort.dir) return fila;
    const getValue = (s: SolicitacaoMock): unknown => {
      const d = demandaDaLinha.get(s.id);
      switch (sort.field) {
        case 'numero': return s.numero;
        case 'paciente': return s.paciente.nome;
        case 'municipio': return s.paciente.municipio;
        case 'status': return s.status;
        case 'situacao': return d ? SITUACAO_DEMANDA_LABEL[d.situacao] : '';
        case 'responsavel': return d?.profissionalResponsavel ?? '';
        case 'instrumentos': return totaisInstrumentos.get(s.id) ?? 0;
        // Tempo de espera: "desc" (padrão) põe a demanda mais antiga em cima.
        case 'tempo': return d ? Date.now() - Date.parse(d.dataEncaminhamento) : Number.NEGATIVE_INFINITY;
        default: return '';
      }
    };
    return [...fila].sort((a, b) => {
      const r = compareValues(getValue(a), getValue(b));
      return sort.dir === 'asc' ? r : -r;
    });
  }, [fila, sort, demandaDaLinha, totaisInstrumentos]);

  const paginadas = useMemo(
    () => filaOrdenada.slice((page - 1) * pageSize, page * pageSize),
    [filaOrdenada, page, pageSize],
  );

  const toggleSort = (field: string) => setSort((prev) => nextSort(field, prev));

  function abrirInstrumento(s: SolicitacaoMock) {
    const lista = porSolicitacao.get(s.id) ?? [];
    const alvo = lista.find(demandaEstaAberta) ?? lista[0];
    if (!alvo) return;
    setDrawer({ kind: 'instrumento', sol: s, demanda: alvo });
  }

  function fechar() {
    setDrawer({ kind: null, sol: null, demanda: null });
  }

  return (
    <div>
      <PageHeader
        title="Serviço Social"
        subtitle="Demandas sociais vinculadas às solicitações. Correm em paralelo, sem travar o fluxo."
      />

      <StatsRow
        stats={[
          {
            label: 'Pendentes',
            value: stats.pendentes,
            hint: 'aguardando atendimento',
            title: 'Demandas encaminhadas que ainda não foram assumidas pela equipe social',
            active: situacaoFiltro === 'pendente',
            onClick: () => setSituacaoFiltro((prev) => (prev === 'pendente' ? 'abertas' : 'pendente')),
          },
          {
            label: 'Em atendimento',
            value: stats.emAtendimento,
            hint: 'com profissional',
            title: 'Demandas já assumidas por uma profissional do Serviço Social',
            active: situacaoFiltro === 'em_atendimento',
            onClick: () => setSituacaoFiltro((prev) => (prev === 'em_atendimento' ? 'abertas' : 'em_atendimento')),
          },
          {
            label: 'Sem responsável',
            value: stats.semResponsavel,
            hint: 'entre as abertas',
            title: 'Demandas abertas que ainda não foram assumidas por uma profissional',
          },
        ]}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div
          className="flex items-center gap-2 px-3"
          style={{
            background: 'white', border: '1px solid var(--tfd-surface-border)',
            borderRadius: 8, height: 36, minWidth: 280,
          }}
        >
          <Search size={14} style={{ color: '#9CA3AF' }} />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, CPF ou número..."
            className="flex-1 bg-transparent outline-none text-[13px]"
          />
        </div>
        <select
          value={situacaoFiltro}
          onChange={(e) => setSituacaoFiltro(e.target.value as SituacaoFiltro)}
          style={{
            height: 36, padding: '0 12px',
            background: 'white', border: '1px solid var(--tfd-surface-border)',
            borderRadius: 8, fontSize: 13, color: '#1A1D2B',
          }}
          aria-label="Filtrar por situação da demanda"
        >
          {SITUACAO_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select
          value={profissionalFiltro}
          onChange={(e) => setProfissionalFiltro(e.target.value)}
          style={{
            height: 36, padding: '0 12px',
            background: 'white', border: '1px solid var(--tfd-surface-border)',
            borderRadius: 8, fontSize: 13, color: '#1A1D2B',
          }}
          aria-label="Filtrar por profissional responsável"
        >
          <option value="">Todas as profissionais</option>
          {profissionais.map((nome) => (
            <option key={nome} value={nome}>{nome}</option>
          ))}
        </select>
        <RegiaoRegionalMunicipioFilter
          solicitacoes={filaBase}
          value={regiaoFiltro}
          onChange={setRegiaoFiltro}
        />
      </div>

      <div
        style={{
          background: 'white', border: '1px solid var(--tfd-surface-border)',
          borderRadius: 'var(--tfd-radius-lg)', overflow: 'hidden',
        }}
      >
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--tfd-surface-border)' }}>
              <SortTh label="Número" field="numero" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <SortTh label="Paciente" field="paciente" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <SortTh label="Origem" field="municipio" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <SortTh label="Status" field="status" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <SortTh label="Situação" field="situacao" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <SortTh label="Instrumentos" field="instrumentos" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} align="right" />
              <SortTh label="Aguardando há" field="tempo" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <SortTh label="Responsável" field="responsavel" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <Th align="right">Ações</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`sk-${i}`} style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}>
                  {Array.from({ length: 9 }).map((__, c) => (
                    <td key={c} className="px-4 py-3.5">
                      <Skeleton className={`h-4 ${c === 0 ? 'w-24' : c === 1 ? 'w-44' : c === 8 ? 'w-16 ml-auto' : 'w-28'}`} />
                    </td>
                  ))}
                </tr>
              ))
            )}
            {!isLoading && fila.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center" style={{ color: '#9CA3AF' }}>
                  Nenhuma solicitação com demanda de Serviço Social nos filtros aplicados.
                </td>
              </tr>
            )}
            {!isLoading && paginadas.map((s) => {
              const d = demandaDaLinha.get(s.id);
              const qtdInstrumentos = totaisInstrumentos.get(s.id) ?? 0;
              const lista = porSolicitacao.get(s.id) ?? [];
              const temPendente = lista.some((x) => x.situacao === 'pendente');
              const aberta = lista.some(demandaEstaAberta);

              return (
                <tr
                  key={s.id}
                  style={{ borderBottom: '1px solid #E2E8F0', cursor: 'pointer' }}
                  className="hover:bg-[#F8FAFC] transition-colors"
                  onClick={() => router.push(`/fluxo-v2/solicitacoes/${s.id}?tab=servico-social&from=servico-social`)}
                >
                  <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <SolicitacaoNumeroCell s={s} />
                  </td>
                  <td className="px-4 py-3.5">
                    <PacienteHoverCell paciente={s.paciente} />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="leading-tight">
                      <div style={{ color: '#1E293B', fontSize: 13, fontWeight: 500 }}>{s.paciente.municipio.split(' - ')[0]}</div>
                      <div style={{ color: '#94A3B8', fontSize: 12 }}>
                        {s.paciente.regional
                          ? `${s.paciente.regionalCodigo ?? ''}${s.paciente.regionalCodigo ? ' · ' : ''}${s.paciente.regional}`
                          : '—'}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusV2Badge status={s.status} />
                  </td>
                  <td className="px-4 py-3.5">
                    {d ? (
                      <div className="leading-tight">
                        <StatusDot tone={SITUACAO_TONE[d.situacao]}>
                          {SITUACAO_DEMANDA_LABEL[d.situacao]}
                        </StatusDot>
                        <div style={{ color: '#94A3B8', fontSize: 12 }}>
                          Aberta por {d.encaminhadoPor}
                          {lista.length > 1 ? ` · ${lista.length} demandas` : ''}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: '#CBD5E1', fontSize: 12 }}>Sem demanda</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span
                      className="inline-flex items-center gap-1.5"
                      style={{ color: qtdInstrumentos > 0 ? '#0F172A' : '#CBD5E1', fontSize: 14, fontWeight: 600 }}
                    >
                      <FileText size={13} /> {qtdInstrumentos}
                    </span>
                  </td>
                  <td className="px-4 py-3.5" style={{ color: '#64748B', fontSize: 13 }}>
                    {d ? `${tempoNoSetor(d.dataEncaminhamento)}d` : '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    {d?.profissionalResponsavel ? (
                      <span style={{ color: '#1E293B', fontSize: 13 }}>{d.profissionalResponsavel}</span>
                    ) : (
                      <span style={{ color: '#CBD5E1', fontSize: 12 }}>Não assumida</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center">
                      <RowActions
                        actions={[
                          {
                            key: 'assumir' as const,
                            icon: PlayCircle,
                            label: 'Assumir demanda',
                            onClick: () => {
                              const alvo = lista.find((x) => x.situacao === 'pendente');
                              if (alvo) setDrawer({ kind: 'assumir', sol: s, demanda: alvo });
                            },
                            visivel: temPendente && podeAtender,
                          },
                          {
                            key: 'instrumento' as const,
                            icon: FilePlus,
                            label: aberta
                              ? 'Criar instrumento'
                              : 'Criar instrumento na última demanda',
                            onClick: () => abrirInstrumento(s),
                            visivel: podeCriarInstrumento,
                          },
                        ]}
                      />
                      <Can action="tramitacao.tramitar">
                        <BotaoEnvio
                          icon={Send}
                          label="Enviar para outro setor"
                          onClick={() => setEnviar(s)}
                        />
                      </Can>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Pagination
          total={fila.length}
          pageSize={pageSize}
          page={page}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          recordLabel="solicitações"
        />
      </div>


      {/* Drawer único de tramitação entre setores */}
      {enviar && (
        <EnviarParaSetorDrawer
          open={!!enviar}
          onClose={() => setEnviar(null)}
          solicitacaoId={enviar.id}
          setorAtual={setorDeOrigem(enviar)}
        />
      )}

      {drawer.demanda && drawer.kind === 'assumir' && podeAtender && (
        <AssumirDemandaDrawer
          open
          onClose={fechar}
          demanda={drawer.demanda}
        />
      )}

      {drawer.sol && drawer.demanda && drawer.kind === 'instrumento' && podeCriarInstrumento && (
        <NewInstrumentoDrawer
          open={drawer.kind === 'instrumento'}
          onClose={fechar}
          s={drawer.sol}
          demandas={porSolicitacao.get(drawer.sol.id) ?? [drawer.demanda]}
          demandaInicialId={drawer.demanda.id}
        />
      )}
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
