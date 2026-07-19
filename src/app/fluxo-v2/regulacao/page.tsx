'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Stethoscope, Stamp, CalendarPlus, CalendarCheck, Send, Search } from 'lucide-react';
import RowActions from '../_components/RowActions';
import BotaoEnvio from '../_components/BotaoEnvio';
import NewParecerDrawer from '../_components/drawers/NewParecerDrawer';
import CarimboRegulacaoDrawer from '../_components/drawers/CarimboRegulacaoDrawer';
import RegistrarAgendamentoDrawer from '../_components/drawers/RegistrarAgendamentoDrawer';
import EnviarParaSetorDrawer from '../_components/drawers/EnviarParaSetorDrawer';
import { snapshotFromSolicitacao } from '../_components/SnapshotPaciente';
import SolicitacaoNumeroCell from '../_components/SolicitacaoNumeroCell';
import PacienteHoverCell from '../_components/PacienteHoverCell';
import { useFluxoV2State } from '../_state/FluxoV2Provider';
import { tempoNoSetor } from '../_utils/tempoSetor';
import { isTramitacaoRecente } from '../_utils/tramitacao';
import { TramitacaoInfoPopover } from '../_components/TramitacaoBadge';
import { isLocked, setorAtual, tooltipLocked } from '../_utils/lock';
import { temAgendamentoConfirmado, agendamentoConfirmado, dataDoAgendamento } from '../_utils/agendamento';
import { casaComFiltroRegiao, REGIAO_FILTRO_VAZIO, type RegiaoFiltroValue } from '../_utils/derivarRegional';
import RegiaoRegionalMunicipioFilter from '../_components/RegiaoRegionalMunicipioFilter';
import HoverTooltip, { TooltipKV } from '../_components/HoverTooltip';
import { TIPO_PROCEDIMENTO_LABEL } from '@/core/mocks/fluxo-v2-v3-seed';
import { useCidLookup, getCidDescricao } from '../_utils/useCidLookup';

const fmtDataBR = (iso: string) => {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};
import Pagination from '@/shared/components/pagination/Pagination';
import StatsRow from '@/shared/components/stats-row/StatsRow';
import PageHeader from '@/shared/components/page-header/PageHeader';
import SortTh, { compareValues, nextSort, type SortDir } from '@/shared/components/sort-th/SortTh';
import { Skeleton } from '@/components/ui/skeleton';
import { Can } from '@/shared/auth/Can';
import {
  contarAguardandoParecer,
  contarAguardandoAgendamento,
  contarPareceres,
  contarPorCarimbo,
} from '../_utils/stats';
import type { CarimboRegulacao, SolicitacaoMock } from '@/core/mocks/fluxo-v2-v3-seed';

const DEFAULT_PAGE_SIZE = 25;

type DrawerKind = 'parecer' | 'carimbo' | 'agendamento' | null;

type CarimboFiltro = 'all' | CarimboRegulacao | 'sem_carimbo';

const CARIMBO_OPTIONS: { value: CarimboFiltro; label: string }[] = [
  { value: 'all', label: 'Todos os carimbos' },
  { value: 'APROVADO_DIRETO', label: 'APROVADO DIRETO' },
  { value: 'CNRAC', label: 'CNRAC' },
  { value: 'CET', label: 'CET' },
  { value: 'SAAS', label: 'SAAS' },
  { value: 'AGENDAMENTO', label: 'AGENDAMENTO' },
  { value: 'sem_carimbo', label: 'Sem carimbo' },
];

export default function RegulacaoListPage() {
  const router = useRouter();
  const { solicitacoes, setCarimbo, isLoading } = useFluxoV2State();

  const [drawer, setDrawer] = useState<{ kind: DrawerKind; sol: SolicitacaoMock | null }>({
    kind: null, sol: null,
  });
  const [enviar, setEnviar] = useState<SolicitacaoMock | null>(null);
  const [busca, setBusca] = useState('');
  const [carimboFiltro, setCarimboFiltro] = useState<CarimboFiltro>('all');
  const [regiaoFiltro, setRegiaoFiltro] = useState<RegiaoFiltroValue>(REGIAO_FILTRO_VAZIO);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<{ field: string; dir: SortDir }>({ field: 'tempo', dir: 'desc' });

  const stats = useMemo(() => ({
    aguardandoParecer: contarAguardandoParecer(solicitacoes),
    aguardandoAgendamento: contarAguardandoAgendamento(solicitacoes),
    deferidosMes: contarPareceres(solicitacoes, 'deferido', true),
    indeferidosMes: contarPareceres(solicitacoes, 'indeferido', true),
  }), [solicitacoes]);

  // Base da fila de Regulação, antes dos filtros interativos — usada para
  // derivar as opções do filtro Região > Regional > Município, que assim não
  // "somem" quando outro filtro (carimbo/busca/região) já reduziu a lista.
  const filaBase = useMemo(
    () => solicitacoes.filter((s) => s.status === 'em_regulacao'),
    [solicitacoes],
  );

  const fila = useMemo(
    () => filaBase.filter((s) => {
      if (carimboFiltro === 'sem_carimbo') {
        if (s.carimboRegulacao) return false;
      } else if (carimboFiltro !== 'all') {
        if (s.carimboRegulacao !== carimboFiltro) return false;
      }
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
    [filaBase, busca, carimboFiltro, regiaoFiltro],
  );

  useEffect(() => {
    setPage(1);
  }, [busca, carimboFiltro, regiaoFiltro, sort]);

  const filaOrdenada = useMemo(() => {
    if (!sort.field || !sort.dir) return fila;
    const getValue = (s: SolicitacaoMock): unknown => {
      switch (sort.field) {
        case 'numero': return s.numero;
        case 'paciente': return s.paciente.nome;
        case 'municipio': return s.paciente.municipio;
        case 'carimbo': return s.carimboRegulacao ?? '';
        case 'tempo': return tempoNoSetor(s.dataCriacao);
        default: return '';
      }
    };
    const sorted = [...fila].sort((a, b) => compareValues(getValue(a), getValue(b)));
    return sort.dir === 'desc' ? sorted.reverse() : sorted;
  }, [fila, sort]);

  const paginadas = useMemo(
    () => filaOrdenada.slice((page - 1) * pageSize, page * pageSize),
    [filaOrdenada, page, pageSize],
  );

  // Coleta os CIDs (principal + secundário) do último parecer de cada solicitação
  // exibida na página e resolve as descrições em batch via cid10/cid11.
  const cidPares = useMemo(() => {
    const pares: Array<{ codigo: string | undefined; versao: '10' | '11' | undefined }> = [];
    for (const s of paginadas) {
      const ultimo = s.pareceres.length > 0 ? s.pareceres[s.pareceres.length - 1] : null;
      if (!ultimo) continue;
      if (ultimo.cidPrincipal) pares.push({ codigo: ultimo.cidPrincipal, versao: ultimo.versaoCID });
      if (ultimo.cidSecundario) pares.push({ codigo: ultimo.cidSecundario, versao: ultimo.versaoCID });
    }
    return pares;
  }, [paginadas]);
  const cidMap = useCidLookup(cidPares);

  const toggleSort = (field: string) => setSort((prev) => nextSort(field, prev));

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
        title="Regulação"
        subtitle="Fila de solicitações aguardando parecer médico, encaminhamento ou agendamento de exceção."
      />

      <StatsRow
        stats={[
          { label: 'Aguardando parecer', value: stats.aguardandoParecer },
          {
            label: 'Aguardando agendamento',
            value: stats.aguardandoAgendamento,
            title: 'Solicitações com carimbo CNRAC ou CET sem tentativa confirmada',
          },
          { label: 'Deferidos no mês', value: stats.deferidosMes, hint: 'no mês corrente' },
          { label: 'Indeferidos no mês', value: stats.indeferidosMes, hint: 'no mês corrente' },
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
          value={carimboFiltro}
          onChange={(e) => setCarimboFiltro(e.target.value as CarimboFiltro)}
          style={{
            height: 36, padding: '0 12px',
            background: 'white', border: '1px solid var(--tfd-surface-border)',
            borderRadius: 8, fontSize: 13, color: '#1A1D2B',
          }}
        >
          {CARIMBO_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
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
              <SortTh label="Município" field="municipio" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <Th>Resumo</Th>
              <Th>CID</Th>
              <SortTh label="Carimbo" field="carimbo" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <SortTh label="Tempo" field="tempo" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
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
                  Nenhuma solicitação na fila de regulação.
                </td>
              </tr>
            )}
            {!isLoading && paginadas.map((s) => {
              const carimboExigeAg = s.carimboRegulacao === 'CNRAC' || s.carimboRegulacao === 'CET';
              const podeAgendar = carimboExigeAg && !temAgendamentoConfirmado(s);
              const locked = isLocked(s, 'regulacao');
              const lockedTip = tooltipLocked(s, 'regulacao');

              const tram = s.ultimaTramitacao;
              const destaque =
                tram &&
                tram.tipo === 'devolucao_regulacao' &&
                isTramitacaoRecente(tram);
              return (
                <tr
                  key={s.id}
                  style={{
                    borderBottom: '1px solid #E2E8F0',
                    boxShadow: destaque ? 'inset 3px 0 0 0 #94A3B8' : undefined,
                    cursor: 'pointer',
                  }}
                  className={'hover:bg-[#F8FAFC] transition-colors'}
                  onClick={() => router.push(`/fluxo-v2/solicitacoes/${s.id}?tab=regulacao&from=regulacao`)}
                >
                  <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <SolicitacaoNumeroCell
                      s={s}
                      trailing={destaque && tram ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="font-mono text-[11px]" style={{ color: '#64748B' }}>
                            · Chegou há {tram.data ? Math.max(1, Math.round((Date.now() - new Date(tram.data).getTime()) / 3.6e6)) : 0}h
                          </span>
                          <TramitacaoInfoPopover tramitacao={tram} variant="amber" />
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
                    <ResumoRegulacao s={s} />
                  </td>
                  <td className="px-4 py-3.5">
                    <CidCell s={s} cidMap={cidMap} />
                  </td>
                  <td className="px-4 py-3.5">
                    <CarimboCell s={s} />
                  </td>
                  <td className="px-4 py-3.5" style={{ color: '#64748B', fontSize: 13 }}>
                    {tempoNoSetor(s.dataCriacao)}d
                  </td>
                  <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center">
                      <RowActions
                        actions={[
                          {
                            key: 'parecer',
                            icon: Stethoscope,
                            label: locked ? lockedTip : 'Parecer rápido',
                            onClick: () => open('parecer', s),
                            disabled: locked,
                          },
                          {
                            key: 'carimbo',
                            icon: Stamp,
                            label: locked
                              ? lockedTip
                              : s.carimboRegulacao ? 'Editar carimbo' : 'Definir carimbo',
                            onClick: () => open('carimbo', s),
                            disabled: locked,
                          },
                          {
                            key: 'agendamento',
                            icon: CalendarPlus,
                            label: locked ? lockedTip : 'Agendamento rápido',
                            onClick: () => open('agendamento', s),
                            visivel: podeAgendar,
                            disabled: locked,
                          },
                        ]}
                      />
                      {setorAtual(s) === 'regulacao' && (
                        <Can action="tramitacao.tramitar">
                          <BotaoEnvio
                            icon={Send}
                            label="Enviar para outro setor"
                            onClick={() => setEnviar(s)}
                          />
                        </Can>
                      )}
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

      {/* Drawer único de tramitação */}
      {enviar && (
        <EnviarParaSetorDrawer
          open={!!enviar}
          onClose={() => setEnviar(null)}
          solicitacaoId={enviar.id}
          setorAtual="regulacao"
        />
      )}

      {/* Drawers — únicos, reutilizados por todas as linhas via state */}
      {ativo && (
        <>
          <NewParecerDrawer
            open={drawer.kind === 'parecer'}
            onClose={close}
            solicitacaoId={ativo.id}
            snapshotPaciente={snapshotFromSolicitacao(ativo)}
          />
          <CarimboRegulacaoDrawer
            open={drawer.kind === 'carimbo'}
            onClose={close}
            carimboAtual={ativo.carimboRegulacao}
            observacaoAtual={ativo.carimboObservacao}
            outrosInfoAtual={ativo.carimboOutrosInfo}
            solicitacaoId={ativo.id}
            onSalvar={(c, obs, info) => setCarimbo(ativo.id, c, obs, info)}
            snapshotPaciente={snapshotFromSolicitacao(ativo)}
          />
          <RegistrarAgendamentoDrawer
            open={drawer.kind === 'agendamento'}
            onClose={close}
            solicitacaoId={ativo.id}
            carimbo={ativo.carimboRegulacao ?? null}
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

/**
 * Coluna Pareceres — link para o último parecer (abre print em nova aba).
 * Quando não há pareceres, mostra texto cinza "Sem parecer ainda".
 */
/**
 * Resumo do que a solicitação tem dentro da Regulação:
 *  Linha 1 (verde)   — Agendamento confirmado (unidade + data) ou "Sem agendamento".
 *  Linha 2 (violeta) — Pareceres com último desfecho ou "Sem parecer".
 *
 * Mesma estética do resumo do Financeiro: ícone em quadrado colorido +
 * contagem em negrito + info secundária em monospace + chip inline para
 * estados que exigem atenção.
 */
function ResumoRegulacao({ s }: { s: SolicitacaoMock }) {
  // Todos os agendamentos confirmados (suporta múltiplos procedimentos criados
  // na própria solicitação OU adicionados depois pela Regulação).
  const agendamentosConfirmados = useMemo(
    () => (s.agendamento?.tentativas ?? []).filter((t) => t.desfecho === 'agendamento_confirmado'),
    [s.agendamento],
  );
  // "Resumo" do primeiro/principal — usado pra preencher a linha colapsada
  const ag = agendamentosConfirmados[0] ?? null;
  const dataAgIso = ag ? dataDoAgendamento(ag) : null;
  const dataAg = dataAgIso ? fmtDataBR(dataAgIso.slice(0, 10)) : null;
  const unidadeAg = ag?.unidade ?? null;
  const totalAgendamentos = agendamentosConfirmados.length;

  const totalPareceres = s.pareceres.length;
  const ultimoParecer = totalPareceres > 0 ? s.pareceres[totalPareceres - 1] : null;
  const ultimaDecisao = ultimoParecer?.decisao === 'deferido' ? 'Deferido' : ultimoParecer?.decisao === 'indeferido' ? 'Indeferido' : null;

  // Tooltip do agendamento — lista TODOS os agendamentos confirmados, cada um
  // com tipo de procedimento + data (formato compacto, ordenado por data asc).
  const agendamentoTooltip = totalAgendamentos > 0 ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div
        style={{
          color: '#94A3B8',
          fontSize: 10.5,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          fontWeight: 600,
        }}
      >
        {totalAgendamentos === 1
          ? '1 agendamento confirmado'
          : `${totalAgendamentos} agendamentos confirmados`}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[...agendamentosConfirmados]
          .sort((a, b) => {
            const da = dataDoAgendamento(a) ?? '';
            const db = dataDoAgendamento(b) ?? '';
            return da.localeCompare(db);
          })
          .map((t, idx) => {
            const dataIso = dataDoAgendamento(t);
            const dataBR = dataIso ? fmtDataBR(dataIso.slice(0, 10)) : '—';
            const tipoLabel = t.tipoProcedimento
              ? TIPO_PROCEDIMENTO_LABEL[t.tipoProcedimento] ?? t.tipoProcedimento
              : null;
            const isFirst = idx === 0;
            return (
              <div
                key={t.id}
                style={{
                  paddingTop: isFirst ? 0 : 8,
                  borderTop: isFirst ? 'none' : '1px solid rgba(255,255,255,0.10)',
                }}
              >
                <TooltipKV
                  rows={[
                    ...(tipoLabel ? [{ k: 'Procedimento', v: tipoLabel }] : []),
                    { k: 'Data', v: dataBR, mono: true },
                    ...(t.hora ? [{ k: 'Hora', v: t.hora, mono: true }] : []),
                    { k: 'Unidade', v: t.unidade ?? '—' },
                    ...(t.contatoUnidade ? [{ k: 'Contato', v: t.contatoUnidade, mono: true }] : []),
                    ...(t.observacoesChegada ? [{ k: 'Chegada', v: t.observacoesChegada }] : []),
                  ]}
                />
              </div>
            );
          })}
      </div>
    </div>
  ) : null;

  // Tooltip do parecer — exibe decisão, médico, data e trecho da observação
  const parecerTooltip = ultimoParecer ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <TooltipKV
        rows={[
          {
            k: 'Decisão',
            v: (
              <strong style={{ color: ultimoParecer.decisao === 'deferido' ? '#86EFAC' : '#FCA5A5' }}>
                {ultimaDecisao}
              </strong>
            ),
          },
          { k: 'Médico', v: ultimoParecer.medico },
          ...(ultimoParecer.medicoCrm
            ? [{ k: 'CRM', v: `${ultimoParecer.medicoCrm}${ultimoParecer.medicoCrmUf ? '/' + ultimoParecer.medicoCrmUf : ''}`, mono: true }]
            : []),
          { k: 'Data', v: fmtDataBR(ultimoParecer.data.slice(0, 10)), mono: true },
          ...(totalPareceres > 1
            ? [{ k: 'Histórico', v: `${totalPareceres} pareceres nesta solicitação` }]
            : []),
        ]}
      />
      {ultimoParecer.observacao && (
        <div
          style={{
            paddingTop: 8,
            borderTop: '1px solid rgba(255,255,255,0.12)',
            color: '#E2E8F0',
            fontSize: 11.5,
            fontStyle: 'italic',
            lineHeight: 1.5,
          }}
        >
          {truncate(ultimoParecer.observacao, 220)}
        </div>
      )}
    </div>
  ) : null;

  return (
    <div className="flex flex-col gap-1">
      <HoverTooltip
        content={agendamentoTooltip}
        disabled={totalAgendamentos === 0}
        maxWidth={360}
      >
        <ResumoLinha
          icon={totalAgendamentos > 0 ? <CalendarCheck size={13} strokeWidth={2.2} /> : <CalendarPlus size={13} strokeWidth={2.2} />}
          tone={totalAgendamentos > 0 ? 'green' : 'muted'}
          label={
            totalAgendamentos === 0
              ? '0 agendamentos'
              : totalAgendamentos === 1
                ? '1 agendamento'
                : `${totalAgendamentos} agendamentos`
          }
          info={
            ag
              ? [unidadeAg?.split(' (')[0], dataAg].filter(Boolean).join(' · ')
              : null
          }
          statusInline={totalAgendamentos === 0 ? 'Sem agendamento' : null}
          statusTone="green"
        />
      </HoverTooltip>
      <HoverTooltip
        content={parecerTooltip}
        disabled={!ultimoParecer}
      >
        <ResumoLinha
          icon={<Stethoscope size={13} strokeWidth={2.2} />}
          tone={totalPareceres > 0 ? 'violet' : 'muted'}
          label={
            totalPareceres === 0
              ? '0 pareceres'
              : totalPareceres === 1
                ? '1 parecer'
                : `${totalPareceres} pareceres`
          }
          info={ultimaDecisao ? `Último: ${ultimaDecisao}` : null}
          statusInline={totalPareceres === 0 ? 'Sem parecer' : null}
          statusTone="violet"
        />
      </HoverTooltip>
    </div>
  );
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).trimEnd() + '…';
}

/**
 * Coluna CID — mostra CID principal (e secundário) do último parecer, com
 * tooltip exibindo a descrição completa de cada CID. As descrições vêm:
 *   1) do snapshot embarcado no parecer (`cidPrincipalNome` / `cidSecundarioNome`)
 *   2) OU do `cidMap` resolvido em batch pela página via `useCidLookup`.
 */
function CidCell({
  s,
  cidMap,
}: {
  s: SolicitacaoMock;
  cidMap: Map<string, string>;
}) {
  const ultimoParecer = s.pareceres.length > 0 ? s.pareceres[s.pareceres.length - 1] : null;
  const cidPrincipal = ultimoParecer?.cidPrincipal;
  const cidSecundario = ultimoParecer?.cidSecundario;
  const versao = (ultimoParecer?.versaoCID ?? '10') as '10' | '11';

  if (!cidPrincipal && !cidSecundario) {
    return <span style={{ color: '#CBD5E1', fontSize: 13 }}>—</span>;
  }

  // Snapshot embarcado tem prioridade; fallback no map resolvido.
  const descPrincipal =
    ultimoParecer?.cidPrincipalNome ?? getCidDescricao(cidMap, cidPrincipal, versao);
  const descSecundario =
    ultimoParecer?.cidSecundarioNome ?? getCidDescricao(cidMap, cidSecundario, versao);

  const renderLinha = (codigo: string, descricao: string | undefined) => (
    <span style={{ display: 'flex', flexDirection: 'column' }}>
      <span style={{ fontFamily: 'var(--tfd-mono, ui-monospace, monospace)', fontWeight: 600 }}>{codigo}</span>
      {descricao ? (
        <span style={{ color: '#E2E8F0', fontWeight: 400, marginTop: 1 }}>{descricao}</span>
      ) : (
        <span style={{ color: '#94A3B8', fontWeight: 400, fontStyle: 'italic', marginTop: 1 }}>
          descrição não disponível
        </span>
      )}
    </span>
  );

  const tooltip = (
    <TooltipKV
      rows={[
        { k: 'Versão', v: `CID-${versao}` },
        ...(cidPrincipal ? [{ k: 'Principal', v: renderLinha(cidPrincipal, descPrincipal) }] : []),
        ...(cidSecundario ? [{ k: 'Secundário', v: renderLinha(cidSecundario, descSecundario) }] : []),
      ]}
    />
  );

  return (
    <HoverTooltip content={tooltip}>
      <div className="flex flex-col gap-0.5 leading-tight" style={{ cursor: 'help' }}>
        {cidPrincipal && (
          <span
            className="font-mono text-[12.5px] font-semibold"
            style={{ color: '#6D28D9' }}
          >
            {cidPrincipal}
          </span>
        )}
        {cidSecundario && (
          <span
            className="font-mono text-[11px]"
            style={{ color: '#94A3B8' }}
          >
            {cidSecundario}
          </span>
        )}
      </div>
    </HoverTooltip>
  );
}

/**
 * Célula do Carimbo — chip com a sigla do carimbo e tooltip com a observação
 * digitada pela enfermeira responsável (e info de origem quando AGENDAMENTO).
 */
function CarimboCell({ s }: { s: SolicitacaoMock }) {
  if (!s.carimboRegulacao) {
    return <span style={{ color: '#CBD5E1', fontSize: 13 }}>—</span>;
  }

  const sigla =
    s.carimboRegulacao === 'APROVADO_DIRETO'
      ? 'APR'
      : s.carimboRegulacao === 'SAAS'
        ? 'SAAS'
        : s.carimboRegulacao === 'AGENDAMENTO'
          ? 'AGND'
          : s.carimboRegulacao;

  const nomeCarimbo: Record<string, string> = {
    APROVADO_DIRETO: 'Aprovado direto',
    SAAS: 'SAAS',
    AGENDAMENTO: 'Agendamento',
    CNRAC: 'CNRAC',
    CET: 'CET',
  };

  const temObs = !!s.carimboObservacao?.trim();
  const temOutros = s.carimboRegulacao === 'AGENDAMENTO' && !!s.carimboOutrosInfo;

  const tooltip = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <TooltipKV
        rows={[
          { k: 'Carimbo', v: nomeCarimbo[s.carimboRegulacao] ?? s.carimboRegulacao },
          ...(temOutros && s.carimboOutrosInfo
            ? [
                { k: 'Unidade/Órgão', v: s.carimboOutrosInfo.unidadeOrgao },
                { k: 'Contato', v: FORMA_CONTATO_LABEL_LOCAL[s.carimboOutrosInfo.formaContato] ?? s.carimboOutrosInfo.formaContato },
              ]
            : []),
        ]}
      />
      {temObs && (
        <div
          style={{
            paddingTop: 8,
            borderTop: '1px solid rgba(255,255,255,0.12)',
            color: '#E2E8F0',
            fontSize: 11.5,
            fontStyle: 'italic',
            lineHeight: 1.5,
          }}
        >
          {truncate(s.carimboObservacao!.trim(), 240)}
        </div>
      )}
    </div>
  );

  return (
    <HoverTooltip content={tooltip} disabled={!temObs && !temOutros}>
      <span
        className="inline-flex items-center px-2 py-[3px] text-[11px] font-semibold uppercase"
        style={{
          background: '#F1F5F9',
          color: '#475569',
          border: '1px solid #E2E8F0',
          borderRadius: 6,
          letterSpacing: '0.05em',
          cursor: temObs || temOutros ? 'help' : 'default',
        }}
      >
        {sigla}
      </span>
    </HoverTooltip>
  );
}

const FORMA_CONTATO_LABEL_LOCAL: Record<string, string> = {
  email: 'E-mail',
  telefone: 'Telefone',
  sistema: 'Sistema',
  presencial: 'Presencial',
};

function ResumoLinha({
  icon,
  tone,
  label,
  info,
  statusInline,
  statusTone,
}: {
  icon: React.ReactNode;
  tone: 'green' | 'violet' | 'muted';
  label: string;
  info?: string | null;
  statusInline?: string | null;
  /** Tom do chip de status quando exibido. */
  statusTone?: 'green' | 'violet';
}) {
  const tones: Record<
    'green' | 'violet' | 'muted',
    { fg: string; iconBg: string }
  > = {
    green:  { fg: '#047857', iconBg: '#ECFDF5' },
    violet: { fg: '#6D28D9', iconBg: '#F5F3FF' },
    muted:  { fg: '#94A3B8', iconBg: '#F1F5F9' },
  };
  const chipTones: Record<'green' | 'violet', { bg: string; fg: string; dot: string }> = {
    green:  { bg: '#ECFDF5', fg: '#047857', dot: '#10B981' },
    violet: { bg: '#F5F3FF', fg: '#6D28D9', dot: '#8B5CF6' },
  };
  const t = tones[tone];
  const chip = statusInline && statusTone ? chipTones[statusTone] : null;

  return (
    <div className="inline-flex items-center gap-2 text-[12.5px] whitespace-nowrap">
      <span
        className="inline-flex items-center justify-center shrink-0"
        style={{
          width: 22, height: 22,
          background: t.iconBg, color: t.fg,
          borderRadius: 6,
        }}
        aria-hidden
      >
        {icon}
      </span>
      <span style={{ color: '#1E293B' }}>
        <strong style={{ fontWeight: 600 }}>{label.split(' ')[0]}</strong>{' '}
        {label.split(' ').slice(1).join(' ')}
      </span>
      {info && (
        <span className="font-mono" style={{ color: '#64748B' }} title={info}>
          · {info}
        </span>
      )}
      {chip && statusInline && (
        <span
          className="inline-flex items-center gap-1 shrink-0"
          style={{
            background: chip.bg,
            color: chip.fg,
            borderRadius: 999,
            padding: '1px 8px',
            fontSize: 10.5,
            fontWeight: 600,
            lineHeight: 1.4,
            marginLeft: 2,
          }}
        >
          <span
            style={{ width: 5, height: 5, borderRadius: '50%', background: chip.dot }}
            aria-hidden
          />
          {statusInline}
        </span>
      )}
    </div>
  );
}
