'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wallet, Send, Search } from 'lucide-react';
import RowActions from '../_components/RowActions';
import BotaoEnvio from '../_components/BotaoEnvio';
import NewAjudaCustoDrawer from '../_components/drawers/NewAjudaCustoDrawer';
import SolicitacaoNumeroCell from '../_components/SolicitacaoNumeroCell';
import PacienteHoverCell from '../_components/PacienteHoverCell';
import EnviarParaSetorDrawer from '../_components/drawers/EnviarParaSetorDrawer';
import { snapshotFromSolicitacao } from '../_components/SnapshotPaciente';
import { useFluxoV2State } from '../_state/FluxoV2Provider';
import { tempoNoSetor } from '../_utils/tempoSetor';
import { isTramitacaoRecente } from '../_utils/tramitacao';
import { TramitacaoInfoPopover } from '../_components/TramitacaoBadge';
import { isLocked, tooltipLocked } from '../_utils/lock';
import { casaComFiltroRegiao, REGIAO_FILTRO_VAZIO, type RegiaoFiltroValue } from '../_utils/derivarRegional';
import RegiaoRegionalMunicipioFilter from '../_components/RegiaoRegionalMunicipioFilter';
import Pagination from '@/shared/components/pagination/Pagination';
import StatsRow from '@/shared/components/stats-row/StatsRow';
import { totalDiariasNoMes, formatBRL } from '../_utils/stats';
import {
  calcularAjudaCustoTipo,
  TIPO_CALCULO_AJUDA_LABEL,
  type AjudaCustoMock,
  type SolicitacaoMock,
} from '@/core/mocks/fluxo-v2-v3-seed';
import StatusDot from '../_components/StatusDot';
import PageHeader from '@/shared/components/page-header/PageHeader';
import SortTh, { compareValues, nextSort, type SortDir } from '@/shared/components/sort-th/SortTh';
import { Skeleton } from '@/components/ui/skeleton';
import { Can } from '@/shared/auth/Can';

const DEFAULT_PAGE_SIZE = 25;

type AjudaCustoFiltro = 'all' | 'sem_ajuda' | 'adicional_pendente';

const FILTRO_OPTIONS: { value: AjudaCustoFiltro; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'sem_ajuda', label: 'Sem ajuda de custo' },
  { value: 'adicional_pendente', label: 'Com adicional pendente' },
];

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtDataBR = (iso: string) => {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

type DrawerKind = 'ajuda' | null;

/**
 * Última ajuda de custo já lançada (pela data de início), usada para
 * mostrar o período vigente e para derivar o próximo período.
 */
function ultimaAjudaLancada(s: SolicitacaoMock) {
  const ativas = s.ajudasCusto.filter((a) => a.ativa !== false);
  if (ativas.length === 0) return null;
  return [...ativas].sort((a, b) => b.dataFim.localeCompare(a.dataFim))[0];
}

/** Valor de um período respeitando o tipo de cálculo (discovery 09/08/2026) —
 *  resolve a ajuda de referência dentro da mesma solicitação quando aplicável. */
function valorAjudaPeriodo(a: AjudaCustoMock, s: SolicitacaoMock): number {
  return calcularAjudaCustoTipo({
    tipoCalculo: a.tipoCalculo ?? 'padrao',
    dataInicio: a.dataInicio,
    dataFim: a.dataFim,
    pernoiteRetorno: a.pernoiteRetorno,
    ajudaReferencia: a.ajudaReferenciaId ? s.ajudasCusto.find((x) => x.id === a.ajudaReferenciaId) : undefined,
  }).valor;
}

/**
 * Próximo período a ser lançado: começa no dia seguinte ao fim do último
 * período já lançado. Quando ainda não há nenhum lançamento, usa a data de
 * início da primeira viagem de ida como referência — é a partir dela que a
 * ajuda de custo passa a ser devida. Sem nenhuma das duas bases, retorna
 * `null` em vez de inventar uma data.
 */
function proximoPeriodoAjuda(s: SolicitacaoMock): { data: string; origem: 'ultimo_periodo' | 'inicio_viagem' } | null {
  const ultima = ultimaAjudaLancada(s);
  if (ultima) {
    const fim = new Date(`${ultima.dataFim}T00:00:00`);
    fim.setDate(fim.getDate() + 1);
    return { data: fim.toISOString().slice(0, 10), origem: 'ultimo_periodo' };
  }
  const idas = s.viagens
    .filter((v) => v.ativa !== false && v.tipo === 'ida')
    .sort((a, b) => a.data.localeCompare(b.data));
  if (idas.length > 0) {
    return { data: idas[0].data, origem: 'inicio_viagem' };
  }
  return null;
}

/**
 * Fila do setor de Ajuda de Custo (PBI 13237): listagem exclusiva das
 * solicitações sob responsabilidade de quem calcula e paga diárias —
 * separada da fila de Passagens. Dentro do detalhe da solicitação as
 * duas frentes continuam juntas na aba Financeiro.
 */
export default function AjudaCustoListPage() {
  const router = useRouter();
  const { solicitacoes, isLoading } = useFluxoV2State();

  const [drawer, setDrawer] = useState<{ kind: DrawerKind; sol: SolicitacaoMock | null }>({
    kind: null, sol: null,
  });
  const [enviar, setEnviar] = useState<SolicitacaoMock | null>(null);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<AjudaCustoFiltro>('all');
  const [regiaoFiltro, setRegiaoFiltro] = useState<RegiaoFiltroValue>(REGIAO_FILTRO_VAZIO);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<{ field: string; dir: SortDir }>({ field: 'tempo', dir: 'desc' });

  const filaBase = useMemo(
    () => solicitacoes.filter((s) => s.status === 'em_ajuda_custo'),
    [solicitacoes],
  );

  const stats = useMemo(() => {
    const semAjuda = filaBase.filter(
      (s) => s.ajudasCusto.filter((a) => a.ativa !== false).length === 0,
    ).length;
    const emitidas = filaBase.reduce(
      (acc, s) => acc + s.ajudasCusto.filter((a) => a.ativa !== false && a.status === 'emitido').length,
      0,
    );
    return {
      semAjuda,
      emitidas,
      totalDiarias: totalDiariasNoMes(filaBase),
    };
  }, [filaBase]);

  const fila = useMemo(
    () => filaBase.filter((s) => {
      const semAjuda = s.ajudasCusto.filter((a) => a.ativa !== false).length === 0;
      const adicionalPendente = s.adicionais.some((a) => a.status === 'pendente_aprovacao');

      if (filtro === 'sem_ajuda' && !semAjuda) return false;
      if (filtro === 'adicional_pendente' && !adicionalPendente) return false;
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
    [filaBase, busca, filtro, regiaoFiltro],
  );

  useEffect(() => {
    setPage(1);
  }, [busca, filtro, regiaoFiltro, sort]);

  const filaOrdenada = useMemo(() => {
    if (!sort.field || !sort.dir) return fila;
    const totalAjuda = (s: SolicitacaoMock): number => s.ajudasCusto.reduce(
      (a, x) => a + valorAjudaPeriodo(x, s), 0,
    );
    const getValue = (s: SolicitacaoMock): unknown => {
      switch (sort.field) {
        case 'numero': return s.numero;
        case 'paciente': return s.paciente.nome;
        case 'municipio': return s.paciente.municipio;
        case 'total': return totalAjuda(s);
        case 'tempo': return tempoNoSetor(s.dataCriacao);
        default: return '';
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

  function open(kind: Exclude<DrawerKind, null>, sol: SolicitacaoMock) {
    setDrawer({ kind, sol });
  }
  function close() {
    setDrawer({ kind: null, sol: null });
  }

  const ativo = drawer.sol;

  return (
    <div>
      <PageHeader
        title="Ajuda de Custo"
        subtitle="Cálculo, lançamento e pagamento de diárias das solicitações."
      />

      <StatsRow
        stats={[
          {
            label: 'Aguardando lançamento',
            value: stats.semAjuda,
            hint: 'sem ajuda',
            title: 'Solicitações em Ajuda de Custo ainda sem nenhum período cadastrado',
          },
          {
            label: 'Ajudas emitidas',
            value: stats.emitidas,
            hint: 'aguardando conclusão',
            title: 'Ajudas de custo emitidas, aguardando confirmação/pagamento final',
          },
          {
            label: 'Total em diárias mês',
            value: formatBRL(stats.totalDiarias),
            hint: 'ajudas concluídas',
            title: 'Ajudas de custo concluídas no mês corrente',
          },
        ]}
      />

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
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as AjudaCustoFiltro)}
          style={{
            height: 36, padding: '0 12px',
            background: 'white', border: '1px solid var(--tfd-surface-border)',
            borderRadius: 8, fontSize: 13, color: '#1A1D2B',
          }}
        >
          {FILTRO_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <RegiaoRegionalMunicipioFilter
          solicitacoes={filaBase}
          value={regiaoFiltro}
          onChange={setRegiaoFiltro}
        />
      </div>

      <div style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 'var(--tfd-radius-lg)', overflow: 'hidden' }}>
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--tfd-surface-border)' }}>
              <SortTh label="Número" field="numero" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <SortTh label="Paciente" field="paciente" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <SortTh label="Origem" field="municipio" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <Th>Período lançado</Th>
              <Th>Próximo período</Th>
              <SortTh label="Total previsto" field="total" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} align="right" />
              <SortTh label="Aguardando há" field="tempo" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <Th align="right">Ações</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`sk-${i}`} style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}>
                  {Array.from({ length: 8 }).map((__, c) => (
                    <td key={c} className="px-4 py-3.5">
                      <Skeleton className={`h-4 ${c === 0 ? 'w-24' : c === 1 ? 'w-44' : c === 7 ? 'w-16 ml-auto' : 'w-28'}`} />
                    </td>
                  ))}
                </tr>
              ))
            )}
            {!isLoading && fila.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center" style={{ color: '#9CA3AF' }}>
                  Nenhuma solicitação aguardando ação em Ajuda de Custo.
                </td>
              </tr>
            )}
            {!isLoading && paginadas.map((s) => {
              const ajudasAtivas = s.ajudasCusto.filter((a) => a.ativa !== false);
              const totalAjuda = ajudasAtivas.reduce((acc, a) => acc + valorAjudaPeriodo(a, s), 0);
              const ultima = ultimaAjudaLancada(s);
              const proximo = proximoPeriodoAjuda(s);

              const tram = s.ultimaTramitacao;
              const destaque =
                tram &&
                tram.tipo === 'envio' &&
                tram.destino === 'ajuda_custo' &&
                isTramitacaoRecente(tram);
              const locked = isLocked(s, 'ajuda_custo');
              const lockedTip = tooltipLocked(s, 'ajuda_custo');

              return (
                <tr
                  key={s.id}
                  style={{
                    borderBottom: '1px solid #E2E8F0',
                    boxShadow: destaque ? 'inset 3px 0 0 0 #94A3B8' : undefined,
                    cursor: 'pointer',
                  }}
                  className="hover:bg-[#F8FAFC] transition-colors"
                  onClick={() => router.push(`/fluxo-v2/solicitacoes/${s.id}?tab=financeiro&from=ajuda-custo`)}
                >
                  <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <SolicitacaoNumeroCell
                      s={s}
                      trailing={destaque && tram ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="font-mono text-[11px]" style={{ color: '#64748B' }}>
                            · Chegou há {tram.data ? Math.max(1, Math.round((Date.now() - new Date(tram.data).getTime()) / 3.6e6)) : 0}h
                          </span>
                          <TramitacaoInfoPopover tramitacao={tram} variant="blue" />
                        </span>
                      ) : null}
                    />
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
                    {ultima ? (
                      <div className="leading-tight">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span style={{ color: '#1E293B', fontSize: 13, fontWeight: 500 }}>
                            {fmtDataBR(ultima.dataInicio)} → {fmtDataBR(ultima.dataFim)}
                          </span>
                          <StatusDot tone="neutral">{TIPO_CALCULO_AJUDA_LABEL[ultima.tipoCalculo ?? 'padrao']}</StatusDot>
                        </div>
                        {ajudasAtivas.length > 1 && (
                          <div style={{ color: '#94A3B8', fontSize: 12 }}>
                            {ajudasAtivas.length} períodos ao todo
                          </div>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: '#CBD5E1', fontSize: 12 }}>Sem ajuda</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {proximo ? (
                      <div className="leading-tight">
                        <div style={{ color: '#1E293B', fontSize: 13, fontWeight: 500 }}>{fmtDataBR(proximo.data)}</div>
                        <div style={{ color: '#94A3B8', fontSize: 12 }}>
                          {proximo.origem === 'ultimo_periodo' ? 'a partir do último período' : 'a partir do início da viagem'}
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: '#CBD5E1', fontSize: 12 }}>Sem base para calcular</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono" style={{ color: '#0F172A', fontWeight: 600, fontSize: 14 }}>
                    {fmtBRL(totalAjuda)}
                  </td>
                  <td className="px-4 py-3.5" style={{ color: '#64748B', fontSize: 13 }}>
                    {tempoNoSetor(s.dataCriacao)}d
                  </td>
                  <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center">
                      <RowActions
                        actions={[
                          {
                            key: 'ajuda' as const,
                            icon: Wallet,
                            label: locked ? lockedTip : 'Adicionar ajuda de custo',
                            onClick: () => open('ajuda', s),
                            disabled: locked,
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

      {enviar && (
        <EnviarParaSetorDrawer
          open={!!enviar}
          onClose={() => setEnviar(null)}
          solicitacaoId={enviar.id}
          setorAtual="ajuda_custo"
        />
      )}

      {ativo && (
        <NewAjudaCustoDrawer
          open={drawer.kind === 'ajuda'}
          onClose={close}
          solicitacaoId={ativo.id}
          snapshotPaciente={snapshotFromSolicitacao(ativo)}
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
