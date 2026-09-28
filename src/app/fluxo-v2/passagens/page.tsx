'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plane, PlusCircle, Send, Search } from 'lucide-react';
import RowActions from '../_components/RowActions';
import BotaoEnvio from '../_components/BotaoEnvio';
import NewPassagemDrawer from '../_components/drawers/NewPassagemDrawer';
import NewAdicionalDrawer from '../_components/drawers/NewAdicionalDrawer';
import SolicitacaoNumeroCell from '../_components/SolicitacaoNumeroCell';
import PacienteHoverCell from '../_components/PacienteHoverCell';
import EnviarParaSetorDrawer from '../_components/drawers/EnviarParaSetorDrawer';
import { snapshotFromSolicitacao } from '../_components/SnapshotPaciente';
import { useFluxoV2State } from '../_state/FluxoV2Provider';
import { tempoNoSetor } from '../_utils/tempoSetor';
import { isTramitacaoRecente } from '../_utils/tramitacao';
import { TramitacaoInfoPopover } from '../_components/TramitacaoBadge';
import { isLocked, setorAtual, tooltipLocked } from '../_utils/lock';
import { casaComFiltroRegiao, REGIAO_FILTRO_VAZIO, type RegiaoFiltroValue } from '../_utils/derivarRegional';
import RegiaoRegionalMunicipioFilter from '../_components/RegiaoRegionalMunicipioFilter';
import { casaComFiltroResponsavel, RESPONSAVEL_FILTRO_VAZIO, type ResponsavelFiltroValue } from '../_utils/derivarResponsavel';
import ResponsavelFilter from '../_components/ResponsavelFilter';
import ResponsavelAvatar from '../_components/ResponsavelAvatar';
import Pagination from '@/shared/components/pagination/Pagination';
import StatsRow from '@/shared/components/stats-row/StatsRow';
import { dentroDoMesAtual, formatBRL } from '../_utils/stats';
import { type SolicitacaoMock } from '@/core/mocks/fluxo-v2-v3-seed';
import PageHeader from '@/shared/components/page-header/PageHeader';
import SortTh, { compareValues, nextSort, type SortDir } from '@/shared/components/sort-th/SortTh';
import { Skeleton } from '@/components/ui/skeleton';
import { Can } from '@/shared/auth/Can';

const DEFAULT_PAGE_SIZE = 25;

type PassagensFiltro = 'all' | 'sem_viagem' | 'adicional_pendente';

const FILTRO_OPTIONS: { value: PassagensFiltro; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'sem_viagem', label: 'Sem viagem agendada' },
  { value: 'adicional_pendente', label: 'Com adicional pendente' },
];

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function proximaViagem(s: SolicitacaoMock): { data: string; trecho: string } | null {
  const hoje = new Date().toISOString().slice(0, 10);
  const validas = s.viagens.filter((v) => !['cancelada', 'reembolso'].includes(v.status));
  if (validas.length === 0) return null;
  const futuras = validas.filter((v) => v.data >= hoje).sort((a, b) => a.data.localeCompare(b.data));
  const escolhida = futuras.length > 0
    ? futuras[0]
    : [...validas].sort((a, b) => b.data.localeCompare(a.data))[0];
  return {
    data: escolhida.data,
    trecho: `${escolhida.origem.split(' - ')[0]} → ${escolhida.destino.split(' - ')[0]}`,
  };
}

/**
 * Tipo de viagem exibido na fila, conforme o que está cadastrado nas
 * viagens ativas da solicitação: ida, ida e volta, apenas volta ou apenas
 * transfer. `null` quando não há viagem cadastrada ainda.
 */
function tipoViagemFila(s: SolicitacaoMock): string | null {
  const ativas = s.viagens.filter((v) => !['cancelada', 'reembolso'].includes(v.status));
  if (ativas.length === 0) return null;
  const temIda = ativas.some((v) => v.tipo === 'ida');
  const temVolta = ativas.some((v) => v.tipo === 'volta');
  if (temIda && temVolta) return 'Ida e volta';
  if (temIda) return 'Ida';
  if (temVolta) return 'Volta';
  return 'Transfer';
}

const fmtDataBR = (iso: string) => {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

type DrawerKind = 'passagem' | 'adicional' | null;

/**
 * Fila do setor de Passagens (PBI 13237): listagem exclusiva das
 * solicitações sob responsabilidade de quem emite e acompanha passagens
 * — separada da fila de Ajuda de Custo. Dentro do detalhe da solicitação
 * as duas frentes continuam juntas na aba Financeiro.
 */
export default function PassagensListPage() {
  const router = useRouter();
  const { solicitacoes, isLoading } = useFluxoV2State();

  const [drawer, setDrawer] = useState<{ kind: DrawerKind; sol: SolicitacaoMock | null }>({
    kind: null, sol: null,
  });
  const [enviar, setEnviar] = useState<SolicitacaoMock | null>(null);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<PassagensFiltro>('all');
  const [regiaoFiltro, setRegiaoFiltro] = useState<RegiaoFiltroValue>(REGIAO_FILTRO_VAZIO);
  const [responsavelFiltro, setResponsavelFiltro] = useState<ResponsavelFiltroValue>(RESPONSAVEL_FILTRO_VAZIO);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<{ field: string; dir: SortDir }>({ field: 'tempo', dir: 'desc' });

  const filaBase = useMemo(
    () => solicitacoes.filter((s) => s.status === 'em_passagens'),
    [solicitacoes],
  );

  const stats = useMemo(() => {
    let semViagem = 0;
    let emitidasNoMes = 0;
    let valorEmitidoNoMes = 0;
    for (const s of filaBase) {
      const ativas = s.viagens.filter((v) => v.ativa !== false);
      if (ativas.length === 0) semViagem += 1;
      for (const v of ativas) {
        const dataRef = v.dataCriacao ?? v.data;
        if (dentroDoMesAtual(dataRef)) {
          emitidasNoMes += 1;
          valorEmitidoNoMes += v.valor - (v.valorReembolso ?? 0);
        }
      }
    }
    return { semViagem, emitidasNoMes, valorEmitidoNoMes };
  }, [filaBase]);

  const fila = useMemo(
    () => filaBase.filter((s) => {
      const semViagem = s.viagens.filter(
        (v) => !['cancelada', 'reembolso'].includes(v.status),
      ).length === 0;
      const adicionalPendente = s.adicionais.some((a) => a.status === 'pendente_aprovacao');

      if (filtro === 'sem_viagem' && !semViagem) return false;
      if (filtro === 'adicional_pendente' && !adicionalPendente) return false;
      if (!casaComFiltroRegiao(s.paciente, regiaoFiltro)) return false;
      if (!casaComFiltroResponsavel(s, responsavelFiltro)) return false;

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
    [filaBase, busca, filtro, regiaoFiltro, responsavelFiltro],
  );

  useEffect(() => {
    setPage(1);
  }, [busca, filtro, regiaoFiltro, responsavelFiltro, sort]);

  const filaOrdenada = useMemo(() => {
    if (!sort.field || !sort.dir) return fila;
    const totalViagens = (s: SolicitacaoMock): number =>
      s.viagens.filter((v) => v.status !== 'reembolso' && v.status !== 'cancelada').reduce((a, v) => a + v.valor, 0);
    const getValue = (s: SolicitacaoMock): unknown => {
      switch (sort.field) {
        case 'numero': return s.numero;
        case 'paciente': return s.paciente.nome;
        case 'municipio': return s.paciente.municipio;
        case 'proxima': return proximaViagem(s)?.data ?? '9999-99-99';
        case 'total': return totalViagens(s);
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
        title="Passagens"
        subtitle="Emissão, remarcação e acompanhamento das passagens das solicitações."
      />

      <StatsRow
        stats={[
          {
            label: 'Aguardando emissão',
            value: stats.semViagem,
            hint: 'sem passagem',
            title: 'Solicitações em Passagens ainda sem nenhuma viagem cadastrada',
          },
          {
            label: 'Emitidas no mês',
            value: stats.emitidasNoMes,
            hint: 'passagens',
            title: 'Passagens ativas cadastradas no mês corrente',
          },
          {
            label: 'Valor emitido no mês',
            value: formatBRL(stats.valorEmitidoNoMes),
            hint: 'líquido de reembolso',
            title: 'Soma das passagens emitidas no mês, descontado reembolso',
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
          onChange={(e) => setFiltro(e.target.value as PassagensFiltro)}
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
        <ResponsavelFilter
          solicitacoes={filaBase}
          value={responsavelFiltro}
          onChange={setResponsavelFiltro}
        />
      </div>

      <div style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 'var(--tfd-radius-lg)', overflow: 'hidden' }}>
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--tfd-surface-border)' }}>
              <SortTh label="Número" field="numero" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <SortTh label="Paciente" field="paciente" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <SortTh label="Origem" field="municipio" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <Th>Tipo de viagem</Th>
              <SortTh label="Próxima viagem" field="proxima" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <SortTh label="Total passagens" field="total" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} align="right" />
              <SortTh label="Aguardando há" field="tempo" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <Th>Responsável</Th>
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
                  Nenhuma solicitação aguardando ação em Passagens.
                </td>
              </tr>
            )}
            {!isLoading && paginadas.map((s) => {
              const totalPassagens = s.viagens
                .filter((v) => v.status !== 'reembolso' && v.status !== 'cancelada')
                .reduce((acc, v) => acc + v.valor, 0);
              const prox = proximaViagem(s);
              const tipoViagem = tipoViagemFila(s);

              const tram = s.ultimaTramitacao;
              const destaque =
                tram &&
                tram.tipo === 'envio' &&
                tram.destino === 'passagens' &&
                isTramitacaoRecente(tram);
              const locked = isLocked(s, 'passagens');
              const lockedTip = tooltipLocked(s, 'passagens');

              return (
                <tr
                  key={s.id}
                  style={{
                    borderBottom: '1px solid #E2E8F0',
                    boxShadow: destaque ? 'inset 3px 0 0 0 #94A3B8' : undefined,
                    cursor: 'pointer',
                  }}
                  className="hover:bg-[#F8FAFC] transition-colors"
                  onClick={() => router.push(`/fluxo-v2/solicitacoes/${s.id}?tab=financeiro&from=passagens`)}
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
                    {tipoViagem ? (
                      <span style={{ color: '#1E293B', fontSize: 13 }}>{tipoViagem}</span>
                    ) : (
                      <span style={{ color: '#CBD5E1', fontSize: 12 }}>Sem viagem</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    {prox ? (
                      <div className="leading-tight">
                        <div style={{ color: '#1E293B', fontSize: 13, fontWeight: 500 }}>{fmtDataBR(prox.data)}</div>
                        <div style={{ color: '#94A3B8', fontSize: 12 }}>{prox.trecho}</div>
                      </div>
                    ) : (
                      <span style={{ color: '#CBD5E1', fontSize: 12 }}>Sem viagem</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="inline-flex items-center justify-end gap-2">
                      <span
                        className="inline-flex items-center justify-center shrink-0"
                        style={{ width: 22, height: 22, background: '#EFF6FF', color: '#1D4ED8', borderRadius: 6 }}
                        aria-hidden
                      >
                        <Plane size={13} strokeWidth={2.2} />
                      </span>
                      <span className="font-mono" style={{ color: '#0F172A', fontWeight: 600, fontSize: 14 }}>
                        {fmtBRL(totalPassagens)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5" style={{ color: '#64748B', fontSize: 13 }}>
                    {tempoNoSetor(s.dataCriacao)}d
                  </td>
                  <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <ResponsavelAvatar responsaveis={s.responsaveisAtuais} />
                  </td>
                  <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center">
                      <RowActions
                        actions={[
                          {
                            key: 'passagem' as const,
                            icon: Plane,
                            label: locked ? lockedTip : 'Adicionar passagem',
                            onClick: () => open('passagem', s),
                            disabled: locked,
                          },
                          {
                            key: 'adicional',
                            icon: PlusCircle,
                            label: locked ? lockedTip : 'Adicionar adicional',
                            onClick: () => open('adicional', s),
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
          setorAtual="passagens"
        />
      )}

      {ativo && (
        <>
          <NewPassagemDrawer
            open={drawer.kind === 'passagem'}
            onClose={close}
            solicitacaoId={ativo.id}
            snapshotPaciente={snapshotFromSolicitacao(ativo)}
          />
          <NewAdicionalDrawer
            open={drawer.kind === 'adicional'}
            onClose={close}
            solicitacaoId={ativo.id}
            snapshotPaciente={snapshotFromSolicitacao(ativo)}
          />
        </>
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
