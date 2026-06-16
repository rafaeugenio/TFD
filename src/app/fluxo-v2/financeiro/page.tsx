'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plane, Wallet, PlusCircle, Send, Search } from 'lucide-react';
import RowActions from '../_components/RowActions';
import BotaoEnvio from '../_components/BotaoEnvio';
import NewPassagemDrawer from '../_components/drawers/NewPassagemDrawer';
import NewAjudaCustoDrawer from '../_components/drawers/NewAjudaCustoDrawer';
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
import Pagination from '@/shared/components/pagination/Pagination';
import StatsRow from '@/shared/components/stats-row/StatsRow';
import {
  contarSolicitacoesAguardandoEmissao,
  contarSolicitacoesAjudaPendente,
  totalEmitidoNoMes,
  totalDiariasNoMes,
  formatBRL,
} from '../_utils/stats';
import {
  calcularValorAjuda,
  STATUS_VIAGEM_LABEL,
  STATUS_AJUDA_LABEL,
  type SolicitacaoMock,
  type ViagemMock,
  type AjudaCustoMock,
} from '@/core/mocks/fluxo-v2-v3-seed';
import HoverTooltip, { TooltipKV } from '../_components/HoverTooltip';
import PageHeader from '@/shared/components/page-header/PageHeader';
import SortTh, { compareValues, nextSort, type SortDir } from '@/shared/components/sort-th/SortTh';
import { Skeleton } from '@/components/ui/skeleton';
import { Can } from '@/shared/auth/Can';

const DEFAULT_PAGE_SIZE = 25;

type FinanceiroFiltro =
  | 'all'
  | 'passagens_pendentes'
  | 'sem_viagem'
  | 'adicional_pendente';

const FILTRO_OPTIONS: { value: FinanceiroFiltro; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'passagens_pendentes', label: 'Com passagens pendentes' },
  { value: 'sem_viagem', label: 'Sem viagem agendada' },
  { value: 'adicional_pendente', label: 'Com adicional pendente' },
];

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Próxima viagem (futura) ou, se não houver, a última (passada).
 * Ignora status `cancelada` e `reembolso` em ambos os casos.
 * Retorna null apenas se a solicitação não tiver nenhuma viagem válida.
 */
function proximaViagem(s: SolicitacaoMock): { data: string; trecho: string } | null {
  const hoje = new Date().toISOString().slice(0, 10);
  const validas = s.viagens.filter((v) => !['cancelada', 'reembolso'].includes(v.status));
  if (validas.length === 0) return null;
  const futuras = validas.filter((v) => v.data >= hoje).sort((a, b) => a.data.localeCompare(b.data));
  const escolhida = futuras.length > 0
    ? futuras[0]
    : [...validas].sort((a, b) => b.data.localeCompare(a.data))[0]; // mais recente passada
  return {
    data: escolhida.data,
    trecho: `${escolhida.origem.split(' - ')[0]} → ${escolhida.destino.split(' - ')[0]}`,
  };
}

const fmtDataBR = (iso: string) => {
  // iso: YYYY-MM-DD
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

type DrawerKind = 'passagem' | 'ajuda' | 'adicional' | null;

export default function FinanceiroListPage() {
  const router = useRouter();
  const { solicitacoes, isLoading } = useFluxoV2State();

  const [drawer, setDrawer] = useState<{ kind: DrawerKind; sol: SolicitacaoMock | null }>({
    kind: null, sol: null,
  });
  const [enviar, setEnviar] = useState<SolicitacaoMock | null>(null);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<FinanceiroFiltro>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<{ field: string; dir: SortDir }>({ field: 'tempo', dir: 'desc' });

  const stats = useMemo(() => ({
    aguardandoEmissao: contarSolicitacoesAguardandoEmissao(solicitacoes),
    ajudasPendentes: contarSolicitacoesAjudaPendente(solicitacoes),
    totalEmitido: totalEmitidoNoMes(solicitacoes),
    totalDiarias: totalDiariasNoMes(solicitacoes),
  }), [solicitacoes]);

  const fila = useMemo(
    () => solicitacoes.filter((s) => {
      if (s.status !== 'em_financeiro') return false;

      const semViagem = s.viagens.filter(
        (v) => !['cancelada', 'reembolso'].includes(v.status),
      ).length === 0;
      const adicionalPendente = s.adicionais.some((a) => a.status === 'pendente_aprovacao');

      if (filtro === 'passagens_pendentes') {
        if (!s.viagens.some((v) => v.status === 'agendada') && !semViagem) return false;
      } else if (filtro === 'sem_viagem') {
        if (!semViagem) return false;
      } else if (filtro === 'adicional_pendente') {
        if (!adicionalPendente) return false;
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
    [solicitacoes, busca, filtro],
  );

  useEffect(() => {
    setPage(1);
  }, [busca, filtro, sort]);

  const filaOrdenada = useMemo(() => {
    if (!sort.field || !sort.dir) return fila;
    const totalPrevisto = (s: SolicitacaoMock): number => {
      const p = s.viagens
        .filter((v) => v.status !== 'reembolso' && v.status !== 'cancelada')
        .reduce((a, v) => a + v.valor, 0);
      const ac = s.ajudasCusto.reduce(
        (a, x) => a + calcularValorAjuda(x.dataInicio, x.dataFim, x.pernoiteRetorno).valor,
        0,
      );
      const ad = s.adicionais.reduce((a, x) => a + x.valor, 0);
      return p + ac + ad;
    };
    const getValue = (s: SolicitacaoMock): unknown => {
      switch (sort.field) {
        case 'numero': return s.numero;
        case 'paciente': return s.paciente.nome;
        case 'municipio': return s.paciente.municipio;
        case 'proxima': return proximaViagem(s)?.data ?? '9999-99-99';
        case 'total': return totalPrevisto(s);
        case 'carimbo': return s.carimboRegulacao ?? '';
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
        title="Financeiro"
        subtitle="Solicitações em execução: passagens, ajudas de custo e adicionais."
      />

      <StatsRow
        stats={[
          {
            label: 'Aguardando emissão',
            value: stats.aguardandoEmissao,
            hint: 'sem passagem',
            title: 'Solicitações com passagem prevista ainda sem passagem cadastrada',
          },
          {
            label: 'Ajudas pendentes',
            value: stats.ajudasPendentes,
            hint: 'sem ajuda',
            title: 'Solicitações com passagem e sem ajuda de custo cadastrada',
          },
          {
            label: 'Total emitido no mês',
            value: formatBRL(stats.totalEmitido),
            hint: 'passagens + adicionais',
            title: 'Passagens emitidas no mês (líquido de reembolso) mais adicionais vinculados a passagem',
          },
          {
            label: 'Total em diárias mês',
            value: formatBRL(stats.totalDiarias),
            hint: 'ajudas concluídas',
            title: 'Ajudas de custo concluídas no mês',
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
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as FinanceiroFiltro)}
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
      </div>

      <div style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 'var(--tfd-radius-lg)', overflow: 'hidden' }}>
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--tfd-surface-border)' }}>
              <SortTh label="Número" field="numero" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <SortTh label="Paciente" field="paciente" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <SortTh label="Origem" field="municipio" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <Th>Resumo</Th>
              <SortTh label="Total previsto" field="total" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} align="right" />
              <SortTh label="Aguardando há" field="tempo" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
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
                  Nenhuma solicitação aguardando ação no Financeiro.
                </td>
              </tr>
            )}
            {!isLoading && paginadas.map((s) => {
              const totalPassagens = s.viagens
                .filter((v) => v.status !== 'reembolso' && v.status !== 'cancelada')
                .reduce((acc, v) => acc + v.valor, 0);
              const totalAjuda = s.ajudasCusto.reduce(
                (acc, a) => acc + calcularValorAjuda(a.dataInicio, a.dataFim, a.pernoiteRetorno).valor,
                0,
              );
              const totalAdicionais = s.adicionais.reduce((acc, a) => acc + a.valor, 0);
              const total = totalPassagens + totalAjuda + totalAdicionais;

              const tram = s.ultimaTramitacao;
              const destaque =
                tram &&
                (tram.tipo === 'envio_financeiro' || tram.tipo === 'encaminhamento_financeiro') &&
                isTramitacaoRecente(tram);
              const locked = isLocked(s, 'financeiro');
              const lockedTip = tooltipLocked(s, 'financeiro');
              const isAjudaCusto = s.tipoSolicitacao === 'ajuda_custo';

              return (
                <tr
                  key={s.id}
                  style={{
                    borderBottom: '1px solid #E2E8F0',
                    boxShadow: destaque ? 'inset 3px 0 0 0 #94A3B8' : undefined,
                    cursor: 'pointer',
                  }}
                  className={'hover:bg-[#F8FAFC] transition-colors'}
                  onClick={() => router.push(`/fluxo-v2/solicitacoes/${s.id}?tab=financeiro&from=financeiro`)}
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
                    <ResumoSolicitacao
                      s={s}
                      totalPassagens={totalPassagens}
                      totalAjuda={totalAjuda}
                      isAjudaCusto={isAjudaCusto}
                    />
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono" style={{ color: '#0F172A', fontWeight: 600, fontSize: 14 }}>
                    {fmtBRL(total)}
                  </td>
                  <td className="px-4 py-3.5" style={{ color: '#64748B', fontSize: 13 }}>
                    {tempoNoSetor(s.dataCriacao)}d
                  </td>
                  <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="inline-flex items-center">
                      <RowActions
                        actions={[
                          ...(isAjudaCusto ? [] : [{
                            key: 'passagem' as const,
                            icon: Plane,
                            label: locked ? lockedTip : 'Adicionar passagem',
                            onClick: () => open('passagem', s),
                            disabled: locked,
                          }]),
                          {
                            key: 'ajuda',
                            icon: Wallet,
                            label: locked ? lockedTip : 'Adicionar ajuda de custo',
                            onClick: () => open('ajuda', s),
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
                      {setorAtual(s) === 'financeiro' && (
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

      {enviar && (
        <EnviarParaSetorDrawer
          open={!!enviar}
          onClose={() => setEnviar(null)}
          solicitacaoId={enviar.id}
          setorAtual="financeiro"
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
          <NewAjudaCustoDrawer
            open={drawer.kind === 'ajuda'}
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

/** Chips de pendências da solicitação dentro do Financeiro. Cada chip
 *  representa uma ação que o operador precisa tomar. */
/**
 * Resumo do que a solicitação já tem hoje (passagens + ajudas de custo),
 * com ícone, contagem e valor agregado. Não mostra adicionais por escolha
 * do usuário — quem precisa desse detalhe abre a solicitação.
 */
function ResumoSolicitacao({
  s,
  totalPassagens,
  totalAjuda,
  isAjudaCusto = false,
}: {
  s: SolicitacaoMock;
  totalPassagens: number;
  totalAjuda: number;
  isAjudaCusto?: boolean;
}) {
  const viagensAtivas = s.viagens.filter(
    (v) => !['cancelada', 'reembolso'].includes(v.status),
  );
  const qtdPassagens = viagensAtivas.length;
  const ajudasAtivas = s.ajudasCusto.filter((a) => a.ativa !== false);
  const qtdAjudas = ajudasAtivas.length;

  const viagensAgendadas = viagensAtivas.filter((v) => v.status === 'agendada').length;
  const ajudaEmitida = ajudasAtivas.filter((a) => a.status === 'emitido').length;

  const statusPassagem =
    qtdPassagens === 0
      ? 'Sem viagem'
      : viagensAgendadas > 0
        ? `${viagensAgendadas} a emitir`
        : null;

  const statusAjuda = ajudaEmitida > 0 ? `${ajudaEmitida} emitida${ajudaEmitida > 1 ? 's' : ''}` : null;

  if (qtdPassagens === 0 && qtdAjudas === 0) {
    return <span style={{ color: '#CBD5E1', fontSize: 12 }}>—</span>;
  }

  // Solicitações de ajuda de custo nunca têm passagens — omite a linha de viagens.
  const mostrarPassagens = !isAjudaCusto;

  // Resolve nome do acompanhante por id (usado nos tooltips)
  const nomeAcompanhante = (id?: string): string | null => {
    if (!id) return null;
    const a = s.acompanhantes.find((x) => x.id === id);
    return a?.nome ?? null;
  };

  // ── Tooltip de Passagens: lista cada viagem com tipo, modal, datas,
  // trecho, beneficiário, status e valor.
  const passagensTooltip = qtdPassagens > 0 ? (
    <ListaTooltip
      header={`${qtdPassagens} passagem${qtdPassagens > 1 ? 's' : ''} · ${fmtBRL(totalPassagens)}`}
      itens={[...viagensAtivas]
        .sort((a, b) => a.data.localeCompare(b.data))
        .map((v) => (
          <PassagemTooltipItem key={v.id} v={v} nomeAcompanhante={nomeAcompanhante} />
        ))}
    />
  ) : null;

  // ── Tooltip de Ajudas de Custo: lista cada ajuda com período, dias,
  // beneficiário, status, observação e valor calculado (com pernoite extra
  // quando aplicável).
  const ajudasTooltip = qtdAjudas > 0 ? (
    <ListaTooltip
      header={`${qtdAjudas} ajuda${qtdAjudas > 1 ? 's' : ''} de custo · ${fmtBRL(totalAjuda)}`}
      itens={[...ajudasAtivas]
        .sort((a, b) => a.dataInicio.localeCompare(b.dataInicio))
        .map((a) => (
          <AjudaTooltipItem key={a.id} a={a} nomeAcompanhante={nomeAcompanhante} />
        ))}
    />
  ) : null;

  return (
    <div className="flex flex-col gap-1">
      {mostrarPassagens && (
        <HoverTooltip content={passagensTooltip} disabled={qtdPassagens === 0} maxWidth={380}>
          <ResumoItem
            icon={<Plane size={13} strokeWidth={2.2} />}
            tone="blue"
            quantidade={qtdPassagens}
            unidadeSing="passagem"
            unidadePlural="passagens"
            valor={totalPassagens}
            statusInline={statusPassagem}
          />
        </HoverTooltip>
      )}
      {qtdAjudas > 0 && (
        <HoverTooltip content={ajudasTooltip} disabled={qtdAjudas === 0} maxWidth={380}>
          <ResumoItem
            icon={<Wallet size={13} strokeWidth={2.2} />}
            tone="orange"
            quantidade={qtdAjudas}
            unidadeSing="ajuda de custo"
            unidadePlural="ajudas de custo"
            valor={totalAjuda}
            statusInline={statusAjuda}
          />
        </HoverTooltip>
      )}
    </div>
  );
}

/* ── Helpers de tooltip ───────────────────────────────────────── */

/** Wrapper visual: header em mono uppercase + items separados por divisor sutil. */
function ListaTooltip({
  header,
  itens,
}: {
  header: string;
  itens: React.ReactNode[];
}) {
  return (
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
        {header}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {itens.map((node, idx) => (
          <div
            key={idx}
            style={{
              paddingTop: idx === 0 ? 0 : 8,
              borderTop: idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.10)',
            }}
          >
            {node}
          </div>
        ))}
      </div>
    </div>
  );
}

const MODAL_LABEL: Record<string, string> = {
  aereo: 'Aéreo',
  terrestre: 'Terrestre',
  fluvial: 'Fluvial',
};

const TIPO_VIAGEM_LABEL: Record<string, string> = {
  ida: 'Ida',
  volta: 'Volta',
  transfer: 'Transfer',
};

function PassagemTooltipItem({
  v,
  nomeAcompanhante,
}: {
  v: ViagemMock;
  nomeAcompanhante: (id?: string) => string | null;
}) {
  const tipoLabel = TIPO_VIAGEM_LABEL[v.tipo] ?? v.tipo;
  const modalLabel = MODAL_LABEL[v.modal] ?? v.modal;
  const statusLabel = STATUS_VIAGEM_LABEL[v.status] ?? v.status;
  const trecho =
    v.origem && v.destino
      ? `${v.origem.split(' - ')[0]} → ${v.destino.split(' - ')[0]}`
      : null;
  const beneficiario =
    v.beneficiarioTipo === 'paciente'
      ? 'Paciente'
      : nomeAcompanhante(v.beneficiarioId) ?? 'Acompanhante';
  const dataBR = v.data ? fmtDataBR(v.data) : '—';

  // Chip de status colorido por estado
  const chipColor = (() => {
    switch (v.status) {
      case 'confirmada': return { bg: 'rgba(16,185,129,0.18)', fg: '#86EFAC' };
      case 'agendada': return { bg: 'rgba(20,107,250,0.18)', fg: '#93C5FD' };
      case 'remarcada': return { bg: 'rgba(245,158,11,0.18)', fg: '#FCD34D' };
      case 'nao_compareceu':
      case 'cancelada': return { bg: 'rgba(239,68,68,0.18)', fg: '#FCA5A5' };
      default: return { bg: 'rgba(148,163,184,0.18)', fg: '#CBD5E1' };
    }
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <strong style={{ color: 'white', fontSize: 12 }}>{tipoLabel}</strong>
        <span style={{ color: '#94A3B8', fontSize: 11 }}>·</span>
        <span style={{ color: '#E2E8F0', fontSize: 11 }}>{modalLabel}</span>
        <span
          style={{
            background: chipColor.bg,
            color: chipColor.fg,
            padding: '1px 8px',
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginLeft: 'auto',
          }}
        >
          {statusLabel}
        </span>
      </div>
      <TooltipKV
        rows={[
          { k: 'Data', v: dataBR, mono: true },
          ...(trecho ? [{ k: 'Trecho', v: trecho }] : []),
          ...(v.companhia ? [{ k: 'Companhia', v: v.companhia }] : []),
          { k: 'Beneficiário', v: beneficiario },
          { k: 'Valor', v: fmtBRL(v.valor), mono: true },
          ...(v.valorReembolso
            ? [{ k: 'Reembolso', v: `${fmtBRL(v.valorReembolso)} em ${v.dataReembolso ? fmtDataBR(v.dataReembolso) : '—'}`, mono: true }]
            : []),
        ]}
      />
    </div>
  );
}

function AjudaTooltipItem({
  a,
  nomeAcompanhante,
}: {
  a: AjudaCustoMock;
  nomeAcompanhante: (id?: string) => string | null;
}) {
  const calc = calcularValorAjuda(a.dataInicio, a.dataFim, a.pernoiteRetorno);
  const statusLabel = STATUS_AJUDA_LABEL[a.status] ?? a.status;
  const beneficiario =
    a.beneficiarioTipo === 'paciente'
      ? 'Paciente'
      : nomeAcompanhante(a.beneficiarioId) ?? 'Acompanhante';

  const chipColor = (() => {
    switch (a.status) {
      case 'concluido': return { bg: 'rgba(16,185,129,0.18)', fg: '#86EFAC' };
      case 'emitido': return { bg: 'rgba(20,107,250,0.18)', fg: '#93C5FD' };
      case 'glosada': return { bg: 'rgba(239,68,68,0.18)', fg: '#FCA5A5' };
      default: return { bg: 'rgba(148,163,184,0.18)', fg: '#CBD5E1' };
    }
  })();

  const periodo = `${fmtDataBR(a.dataInicio)} → ${fmtDataBR(a.dataFim)}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <strong style={{ color: 'white', fontSize: 12 }}>Ajuda de custo</strong>
        <span
          style={{
            background: chipColor.bg,
            color: chipColor.fg,
            padding: '1px 8px',
            borderRadius: 999,
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            marginLeft: 'auto',
          }}
        >
          {statusLabel}
        </span>
      </div>
      <TooltipKV
        rows={[
          { k: 'Período', v: periodo, mono: true },
          { k: 'Dias', v: `${calc.dias} ${calc.dias === 1 ? 'dia' : 'dias'}` },
          { k: 'Beneficiário', v: beneficiario },
          ...(a.pernoiteRetorno
            ? [{ k: 'Pernoite', v: `Retorno após meia-noite (+${fmtBRL(calc.pernoiteRetornoExtra)})` }]
            : []),
          { k: 'Valor', v: fmtBRL(calc.valor), mono: true },
          ...(a.valorReembolso
            ? [{ k: 'Reembolso', v: `${fmtBRL(a.valorReembolso)} em ${a.dataReembolso ? fmtDataBR(a.dataReembolso) : '—'}`, mono: true }]
            : []),
          ...(a.observacao ? [{ k: 'Observação', v: a.observacao }] : []),
        ]}
      />
    </div>
  );
}

function ResumoItem({
  icon,
  tone,
  quantidade,
  unidadeSing,
  unidadePlural,
  valor,
  statusInline,
}: {
  icon: React.ReactNode;
  tone: 'blue' | 'orange';
  quantidade: number;
  unidadeSing: string;
  unidadePlural: string;
  valor: number;
  /** Pequeno chip de status na mesma linha (ex.: "1 a emitir"). Quando null,
   *  fica oculto — o resumo fica em uma única linha limpa. */
  statusInline?: string | null;
}) {
  const tones: Record<'blue' | 'orange', { fg: string; iconBg: string; chipBg: string; chipFg: string; chipDot: string }> = {
    blue:   { fg: '#1D4ED8', iconBg: '#EFF6FF', chipBg: '#EFF6FF', chipFg: '#1D4ED8', chipDot: '#146BFA' },
    orange: { fg: '#C2410C', iconBg: '#FFF7ED', chipBg: '#FFF7ED', chipFg: '#C2410C', chipDot: '#F97316' },
  };
  const t = tones[tone];
  const label = quantidade === 1 ? unidadeSing : unidadePlural;
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
        <strong style={{ fontWeight: 600 }}>{quantidade}</strong> {label}
      </span>
      <span className="font-mono" style={{ color: '#64748B' }}>
        · {fmtBRL(valor)}
      </span>
      {statusInline && (
        <span
          className="inline-flex items-center gap-1 shrink-0"
          style={{
            background: t.chipBg,
            color: t.chipFg,
            borderRadius: 999,
            padding: '1px 8px',
            fontSize: 10.5,
            fontWeight: 600,
            lineHeight: 1.4,
            marginLeft: 2,
          }}
        >
          <span
            style={{ width: 5, height: 5, borderRadius: '50%', background: t.chipDot }}
            aria-hidden
          />
          {statusInline}
        </span>
      )}
    </div>
  );
}
