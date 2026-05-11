'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, Plane, Wallet, PlusCircle, Send, Search } from 'lucide-react';
import { idadeAnos } from '../_utils/idade';
import RowActions from '../_components/RowActions';
import BotaoEnvio from '../_components/BotaoEnvio';
import NewPassagemDrawer from '../_components/drawers/NewPassagemDrawer';
import NewAjudaCustoDrawer from '../_components/drawers/NewAjudaCustoDrawer';
import NewAdicionalDrawer from '../_components/drawers/NewAdicionalDrawer';
import EnviarParaSetorDrawer from '../_components/drawers/EnviarParaSetorDrawer';
import { snapshotFromSolicitacao } from '../_components/SnapshotPaciente';
import { useFluxoV2State } from '../_state/FluxoV2Provider';
import { tempoNoSetor } from '../_utils/tempoSetor';
import { isTramitacaoRecente } from '../_utils/tramitacao';
import { TramitacaoInfoPopover } from '../_components/TramitacaoBadge';
import { isLocked, setorAtual, tooltipLocked } from '../_utils/lock';
import Pagination from '../_components/Pagination';
import StatsRow from '../_components/StatsRow';
import {
  contarViagensAguardandoEmissao,
  contarViagensProximas7Dias,
  contarAdicionaisPendentes,
  contarAjudasPendentes,
  totalEmitidoNoMes,
  totalDiariasNoMes,
  formatBRL,
} from '../_utils/stats';
import {
  calcularValorAjuda,
  type SolicitacaoMock,
} from '@/core/mocks/fluxo-v2-v3-seed';
import PageHeader from '@/shared/components/page-header/PageHeader';

const PAGE_SIZE = 10;

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
  const { solicitacoes } = useFluxoV2State();

  const [drawer, setDrawer] = useState<{ kind: DrawerKind; sol: SolicitacaoMock | null }>({
    kind: null, sol: null,
  });
  const [enviar, setEnviar] = useState<SolicitacaoMock | null>(null);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<FinanceiroFiltro>('all');
  const [page, setPage] = useState(1);

  const stats = useMemo(() => ({
    aguardandoEmissao: contarViagensAguardandoEmissao(solicitacoes),
    proximas7: contarViagensProximas7Dias(solicitacoes),
    adicionaisPendentes: contarAdicionaisPendentes(solicitacoes),
    ajudasPendentes: contarAjudasPendentes(solicitacoes),
    totalEmitido: totalEmitidoNoMes(solicitacoes),
    totalDiarias: totalDiariasNoMes(solicitacoes),
  }), [solicitacoes]);

  const fila = useMemo(
    () => solicitacoes.filter((s) => {
      if (s.status !== 'em_financeiro') return false;

      if (filtro === 'passagens_pendentes') {
        if (!s.viagens.some((v) => v.status === 'agendada')) return false;
      } else if (filtro === 'sem_viagem') {
        const ativas = s.viagens.filter(
          (v) => !['cancelada', 'reembolso'].includes(v.status),
        );
        if (ativas.length > 0) return false;
      } else if (filtro === 'adicional_pendente') {
        if (!s.adicionais.some((a) => a.status === 'pendente_aprovacao')) return false;
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
  }, [busca, filtro]);

  const paginadas = useMemo(
    () => fila.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [fila, page],
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
            onClick: () =>
              setFiltro((f) => (f === 'passagens_pendentes' ? 'all' : 'passagens_pendentes')),
            active: filtro === 'passagens_pendentes',
          },
          {
            label: 'Próximas 7 dias',
            value: stats.proximas7,
            hint: 'viagens próximas',
            title: 'Viagens com data nos próximos 7 dias',
          },
          {
            label: 'Adicionais pendentes',
            value: stats.adicionaisPendentes,
            onClick: () =>
              setFiltro((f) => (f === 'adicional_pendente' ? 'all' : 'adicional_pendente')),
            active: filtro === 'adicional_pendente',
          },
          {
            label: 'Ajudas pendentes',
            value: stats.ajudasPendentes,
            title: 'Ajudas de custo aprovadas ou em pagamento',
          },
          {
            label: 'Total emitido no mês',
            value: formatBRL(stats.totalEmitido),
            hint: 'passagens emitidas',
          },
          {
            label: 'Total em diárias mês',
            value: formatBRL(stats.totalDiarias),
            hint: 'ajudas concluídas',
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
              <Th>Número</Th>
              <Th>Paciente</Th>
              <Th>Município</Th>
              <Th>Próx. viagem</Th>
              <Th align="right">Total previsto</Th>
              <Th>Carimbo</Th>
              <Th>Tempo</Th>
              <Th align="right">Ações</Th>
            </tr>
          </thead>
          <tbody>
            {fila.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center" style={{ color: '#9CA3AF' }}>
                  Nenhuma solicitação no financeiro.
                </td>
              </tr>
            )}
            {paginadas.map((s) => {
              const totalPassagens = s.viagens.reduce((acc, v) => acc + v.valor, 0);
              const totalAjuda = s.ajudasCusto.reduce(
                (acc, a) => acc + calcularValorAjuda(a.dataInicio, a.dataFim, a.pernoiteRetorno).valor,
                0,
              );
              const totalAdicionais = s.adicionais.reduce((acc, a) => acc + a.valor, 0);
              const total = totalPassagens + totalAjuda + totalAdicionais;

              const proxima = proximaViagem(s);
              const tram = s.ultimaTramitacao;
              const destaque =
                tram &&
                (tram.tipo === 'envio_financeiro' || tram.tipo === 'encaminhamento_financeiro') &&
                isTramitacaoRecente(tram);
              const locked = isLocked(s, 'financeiro');
              const lockedTip = tooltipLocked(s, 'financeiro');

              return (
                <tr
                  key={s.id}
                  style={{
                    borderBottom: '1px solid #E2E8F0',
                    boxShadow: destaque ? 'inset 3px 0 0 0 #94A3B8' : undefined,
                  }}
                  className={'hover:bg-[#F8FAFC] transition-colors'}
                >
                  <td className="px-4 py-3.5 font-mono text-[13px]">
                    <span className="inline-flex items-center gap-1.5 flex-wrap">
                      <span>{s.numero}</span>
                      {destaque && tram && (
                        <span className="inline-flex items-center gap-1">
                          <span className="font-mono text-[11px]" style={{ color: '#64748B' }}>
                            · Chegou há {tram.data ? Math.max(1, Math.round((Date.now() - new Date(tram.data).getTime()) / 3.6e6)) : 0}h
                          </span>
                          <TramitacaoInfoPopover tramitacao={tram} variant="blue" />
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
                  <td className="px-4 py-3.5" style={{ color: '#1E293B', fontSize: 13, fontWeight: 500 }}>
                    {proxima ? (
                      <span title={proxima.trecho}>{fmtDataBR(proxima.data)}</span>
                    ) : (
                      <span style={{ color: '#CBD5E1' }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono" style={{ color: '#0F172A', fontWeight: 600, fontSize: 14 }}>
                    {fmtBRL(total)}
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
                          s.carimboRegulacao === 'OUTROS' && s.carimboOutrosInfo
                            ? `Outros — ${s.carimboOutrosInfo.unidadeOrgao} (${s.carimboOutrosInfo.formaContato})`
                            : undefined
                        }
                      >
                        {s.carimboRegulacao === 'APROVADO_DIRETO' ? 'APR' : s.carimboRegulacao}
                      </span>
                    ) : (
                      <span style={{ color: '#CBD5E1', fontSize: 13 }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5" style={{ color: '#64748B', fontSize: 13 }}>
                    {tempoNoSetor(s.dataCriacao)}d
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="inline-flex items-center">
                      <RowActions
                        actions={[
                          {
                            key: 'abrir',
                            icon: Eye,
                            label: 'Abrir',
                            onClick: () => router.push(`/fluxo-v2/solicitacoes/${s.id}?tab=financeiro`),
                          },
                          {
                            key: 'passagem',
                            icon: Plane,
                            label: locked ? lockedTip : 'Adicionar passagem',
                            onClick: () => open('passagem', s),
                            disabled: locked,
                          },
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
                        <BotaoEnvio
                          icon={Send}
                          label="Enviar para outro setor"
                          onClick={() => setEnviar(s)}
                        />
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
          pageSize={PAGE_SIZE}
          page={page}
          onPageChange={setPage}
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
