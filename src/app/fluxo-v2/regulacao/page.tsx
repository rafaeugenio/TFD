'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Stethoscope, Stamp, CalendarPlus, CalendarCheck, Send, Search } from 'lucide-react';
import { idadeAnos } from '../_utils/idade';
import RowActions from '../_components/RowActions';
import BotaoEnvio from '../_components/BotaoEnvio';
import NewParecerDrawer from '../_components/drawers/NewParecerDrawer';
import CarimboRegulacaoDrawer from '../_components/drawers/CarimboRegulacaoDrawer';
import RegistrarAgendamentoDrawer from '../_components/drawers/RegistrarAgendamentoDrawer';
import EnviarParaSetorDrawer from '../_components/drawers/EnviarParaSetorDrawer';
import { snapshotFromSolicitacao } from '../_components/SnapshotPaciente';
import { useFluxoV2State } from '../_state/FluxoV2Provider';
import { tempoNoSetor } from '../_utils/tempoSetor';
import { isTramitacaoRecente } from '../_utils/tramitacao';
import { TramitacaoInfoPopover } from '../_components/TramitacaoBadge';
import { isLocked, setorAtual, tooltipLocked } from '../_utils/lock';
import { temAgendamentoConfirmado, agendamentoConfirmado, dataDoAgendamento } from '../_utils/agendamento';

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
  { value: 'SAIS_DUTRA', label: 'SAIS / DUTRA' },
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<{ field: string; dir: SortDir }>({ field: 'tempo', dir: 'desc' });

  const stats = useMemo(() => ({
    aguardandoParecer: contarAguardandoParecer(solicitacoes),
    aguardandoAgendamento: contarAguardandoAgendamento(solicitacoes),
    deferidosMes: contarPareceres(solicitacoes, 'deferido', true),
    indeferidosMes: contarPareceres(solicitacoes, 'indeferido', true),
  }), [solicitacoes]);

  const fila = useMemo(
    () => solicitacoes.filter((s) => {
      if (s.status !== 'em_regulacao') return false;
      if (carimboFiltro === 'sem_carimbo') {
        if (s.carimboRegulacao) return false;
      } else if (carimboFiltro !== 'all') {
        if (s.carimboRegulacao !== carimboFiltro) return false;
      }
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
    [solicitacoes, busca, carimboFiltro],
  );

  useEffect(() => {
    setPage(1);
  }, [busca, carimboFiltro, sort]);

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
              <SortTh label="Carimbo" field="carimbo" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <SortTh label="Tempo" field="tempo" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <Th align="right">Ações</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`sk-${i}`} style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}>
                  {Array.from({ length: 7 }).map((__, c) => (
                    <td key={c} className="px-4 py-3.5">
                      <Skeleton className={`h-4 ${c === 0 ? 'w-24' : c === 1 ? 'w-44' : c === 6 ? 'w-16 ml-auto' : 'w-28'}`} />
                    </td>
                  ))}
                </tr>
              ))
            )}
            {!isLoading && fila.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center" style={{ color: '#9CA3AF' }}>
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
                  <td className="px-4 py-3.5 font-mono text-[13px]">
                    <span className="inline-flex items-center gap-1.5 flex-wrap">
                      <span>{s.numero}</span>
                      {destaque && tram && (
                        <span className="inline-flex items-center gap-1">
                          <span className="font-mono text-[11px]" style={{ color: '#64748B' }}>
                            · Chegou há {tram.data ? Math.max(1, Math.round((Date.now() - new Date(tram.data).getTime()) / 3.6e6)) : 0}h
                          </span>
                          <TramitacaoInfoPopover tramitacao={tram} variant="amber" />
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/pacientes/${s.paciente.id}`}
                        className="transition-colors hover:underline"
                        style={{ color: '#146BFA', fontWeight: 500, fontSize: 14, textUnderlineOffset: 3 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {s.paciente.nome}
                      </Link>
                      <span className="text-[12px]" style={{ color: '#94A3B8' }}>{idadeAnos(s.paciente.dataNascimento)} anos</span>
                    </div>
                    <div className="text-[12px] font-mono mt-0.5" style={{ color: '#94A3B8' }}>{s.paciente.cpf}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="leading-tight">
                      <div style={{ color: '#1E293B', fontSize: 13, fontWeight: 500 }}>{s.paciente.municipio.split(' - ')[0]}</div>
                      <div style={{ color: '#94A3B8', fontSize: 12 }}>{s.paciente.regional}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <ResumoRegulacao s={s} />
                  </td>
                  <td className="px-4 py-3.5">
                    {s.carimboRegulacao ? (
                      <span
                        className="inline-flex items-center px-2 py-[3px] text-[11px] font-semibold uppercase"
                        style={{
                          background: '#F1F5F9',
                          color: '#475569',
                          border: '1px solid #E2E8F0',
                          borderRadius: 6,
                          letterSpacing: '0.05em',
                        }}
                        title={
                          s.carimboRegulacao === 'AGENDAMENTO' && s.carimboOutrosInfo
                            ? `Agendamento — ${s.carimboOutrosInfo.unidadeOrgao}`
                            : undefined
                        }
                      >
                        {s.carimboRegulacao === 'APROVADO_DIRETO'
                          ? 'APR'
                          : s.carimboRegulacao === 'SAIS_DUTRA'
                            ? 'SAIS'
                            : s.carimboRegulacao === 'AGENDAMENTO'
                              ? 'AGND'
                              : s.carimboRegulacao}
                      </span>
                    ) : (
                      <span style={{ color: '#CBD5E1', fontSize: 13 }}>—</span>
                    )}
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
  const ag = agendamentoConfirmado(s);
  const dataAg = ag ? fmtDataBR(dataDoAgendamento(ag).slice(0, 10)) : null;
  const unidadeAg = ag?.unidade ?? null;

  const totalPareceres = s.pareceres.length;
  const ultimoParecer = totalPareceres > 0 ? s.pareceres[totalPareceres - 1] : null;
  const ultimaDecisao = ultimoParecer?.decisao === 'deferido' ? 'Deferido' : ultimoParecer?.decisao === 'indeferido' ? 'Indeferido' : null;

  return (
    <div className="flex flex-col gap-1">
      <ResumoLinha
        icon={ag ? <CalendarCheck size={13} strokeWidth={2.2} /> : <CalendarPlus size={13} strokeWidth={2.2} />}
        tone={ag ? 'green' : 'muted'}
        label={ag ? 'Agendamento' : '0 agendamentos'}
        info={
          ag
            ? [unidadeAg?.split(' (')[0], dataAg].filter(Boolean).join(' · ')
            : null
        }
        statusInline={ag ? null : 'Sem agendamento'}
        statusTone="green"
      />
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
    </div>
  );
}

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
