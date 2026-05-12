'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Search, Eye, Pencil, Archive, Send } from 'lucide-react';
import { idadeAnos } from '../_utils/idade';
import StatusV2Badge from '../_components/StatusV2Badge';
import RowActions from '../_components/RowActions';
import BotaoEnvio from '../_components/BotaoEnvio';
import NewEditarSolicitacaoDrawer from '../_components/drawers/NewEditarSolicitacaoDrawer';
import EnviarParaSetorDrawer from '../_components/drawers/EnviarParaSetorDrawer';
import { snapshotFromSolicitacao } from '../_components/SnapshotPaciente';
import { useFluxoV2State } from '../_state/FluxoV2Provider';
import { derivarEventos, tempoRelativo } from '../_utils/derivarLinhaDoTempo';
import { isLocked, setorAtual, tooltipLocked } from '../_utils/lock';
import {
  STATUS_LABEL,
  MOTIVO_ENCERRAMENTO_LABEL,
  type SolicitacaoMock,
  type StatusGlobalV2,
  type MotivoEncerramento,
} from '@/core/mocks/fluxo-v2-v3-seed';
import Pagination from '@/shared/components/pagination/Pagination';
import StatsRow from '@/shared/components/stats-row/StatsRow';
import {
  contarPorStatus,
  contarEncerradasNoMes,
  taxaAprovacao,
} from '../_utils/stats';
import NewSolicitacaoDrawer from './_NewSolicitacaoDrawer';
import PageHeader from '@/shared/components/page-header/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { Can } from '@/shared/auth/Can';
import SortTh, { compareValues, nextSort, type SortDir } from '@/shared/components/sort-th/SortTh';

const DEFAULT_PAGE_SIZE = 25;

const STATUS_OPTIONS: (StatusGlobalV2 | 'all')[] = [
  'all',
  'em_dados_basicos',
  'em_regulacao',
  'em_financeiro',
  'encerrada',
];

export default function SolicitacoesV2ListPage() {
  const router = useRouter();
  const { solicitacoes, encerrar, isLoading } = useFluxoV2State();
  const [statusFilter, setStatusFilter] = useState<StatusGlobalV2 | 'all'>('all');
  const [busca, setBusca] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<{ field: string; dir: SortDir }>({ field: 'numero', dir: 'desc' });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editar, setEditar] = useState<SolicitacaoMock | null>(null);
  const [encerrarTarget, setEncerrarTarget] = useState<SolicitacaoMock | null>(null);
  const [enviar, setEnviar] = useState<SolicitacaoMock | null>(null);
  const [motivo, setMotivo] = useState<MotivoEncerramento>('alta_medica');
  const [dataEnc, setDataEnc] = useState(new Date().toISOString().slice(0, 10));
  const [obsEnc, setObsEnc] = useState('');

  const stats = useMemo(() => {
    const porStatus = contarPorStatus(solicitacoes);
    return {
      total: solicitacoes.length,
      em_dados_basicos: porStatus.em_dados_basicos,
      em_regulacao: porStatus.em_regulacao,
      em_financeiro: porStatus.em_financeiro,
      encerradasMes: contarEncerradasNoMes(solicitacoes),
      aprovacao: taxaAprovacao(solicitacoes),
    };
  }, [solicitacoes]);

  const filtradas = useMemo(() => {
    return solicitacoes.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (busca.trim()) {
        const q = busca.toLowerCase();
        if (
          !s.paciente.nome.toLowerCase().includes(q) &&
          !s.paciente.cpf.includes(q) &&
          !s.numero.includes(q)
        ) return false;
      }
      return true;
    });
  }, [solicitacoes, statusFilter, busca]);

  // Reset paginação quando os filtros mudam — caso contrário o usuário
  // pode acabar olhando uma página vazia.
  useEffect(() => {
    setPage(1);
  }, [busca, statusFilter, sort]);

  const ordenadas = useMemo(() => {
    if (!sort.field || !sort.dir) return filtradas;
    const getValue = (s: SolicitacaoMock): unknown => {
      switch (sort.field) {
        case 'numero': return s.numero;
        case 'paciente': return s.paciente.nome;
        case 'municipio': return s.paciente.municipio;
        case 'status': return s.status;
        case 'atualizacao': {
          const ev = derivarEventos(s)[0];
          return ev?.data ?? '';
        }
        default: return '';
      }
    };
    const sorted = [...filtradas].sort((a, b) => compareValues(getValue(a), getValue(b)));
    return sort.dir === 'desc' ? sorted.reverse() : sorted;
  }, [filtradas, sort]);

  const toggleSort = (field: string) => setSort((prev) => nextSort(field, prev));

  const paginadas = useMemo(
    () => ordenadas.slice((page - 1) * pageSize, page * pageSize),
    [ordenadas, page, pageSize],
  );

  function abrirEncerrar(s: SolicitacaoMock) {
    setEncerrarTarget(s);
    setMotivo('alta_medica');
    setDataEnc(new Date().toISOString().slice(0, 10));
    setObsEnc('');
  }

  function confirmarEncerrar() {
    if (!encerrarTarget) return;
    encerrar(encerrarTarget.id, { data: dataEnc, motivo, observacao: obsEnc.trim() || undefined });
    setEncerrarTarget(null);
  }

  return (
    <div>
      <PageHeader
        title="Solicitações"
        subtitle="Visão geral de todas as solicitações com seu estado consolidado."
        actions={
          <Can action="solicitacoes.criar">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="tfd-btn tfd-btn-primary"
            >
              <Plus size={16} /> Nova solicitação
            </button>
          </Can>
        }
      />

      <StatsRow
        stats={[
          { label: 'Total', value: stats.total },
          {
            label: 'Em Dados Básicos',
            value: stats.em_dados_basicos,
            onClick: () =>
              setStatusFilter((cur) => (cur === 'em_dados_basicos' ? 'all' : 'em_dados_basicos')),
            active: statusFilter === 'em_dados_basicos',
          },
          {
            label: 'Em Regulação',
            value: stats.em_regulacao,
            onClick: () =>
              setStatusFilter((cur) => (cur === 'em_regulacao' ? 'all' : 'em_regulacao')),
            active: statusFilter === 'em_regulacao',
          },
          {
            label: 'Em Financeiro',
            value: stats.em_financeiro,
            onClick: () =>
              setStatusFilter((cur) => (cur === 'em_financeiro' ? 'all' : 'em_financeiro')),
            active: statusFilter === 'em_financeiro',
          },
          {
            label: 'Encerradas no mês',
            value: stats.encerradasMes,
            hint: 'do mês corrente',
            onClick: () =>
              setStatusFilter((cur) => (cur === 'encerrada' ? 'all' : 'encerrada')),
            active: statusFilter === 'encerrada',
            title: 'Solicitações encerradas no mês corrente',
          },
          {
            label: 'Taxa de aprovação',
            value: `${stats.aprovacao}%`,
            hint: 'deferidos / total',
            title: 'Pareceres deferidos / total de pareceres com decisão',
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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusGlobalV2 | 'all')}
          style={{
            height: 36, padding: '0 12px',
            background: 'white', border: '1px solid var(--tfd-surface-border)',
            borderRadius: 8, fontSize: 13, color: '#1A1D2B',
          }}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? 'Todos os status' : STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {/* Tabela */}
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
              <SortTh label="Município / Regional" field="municipio" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <SortTh label="Status" field="status" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <SortTh label="Última atualização" field="atualizacao" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <Th align="right">Ações</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`sk-${i}`} style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}>
                  {Array.from({ length: 6 }).map((__, c) => (
                    <td key={c} className="px-4 py-3.5">
                      <Skeleton className={`h-4 ${c === 0 ? 'w-24' : c === 1 ? 'w-48' : c === 5 ? 'w-20 ml-auto' : 'w-32'}`} />
                    </td>
                  ))}
                </tr>
              ))
            )}
            {!isLoading && filtradas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center" style={{ color: '#9CA3AF' }}>
                  Nenhuma solicitação encontrada.
                </td>
              </tr>
            )}
            {!isLoading && paginadas.map((s) => {
              const eventos = derivarEventos(s);
              const ultimaAtualizacao = eventos[0];
              return (
                <tr
                  key={s.id}
                  style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}
                  className="hover:bg-[#F8FAFC] transition-colors"
                >
                  <td className="px-4 py-3.5 font-mono text-[12px]" style={{ color: '#1A1D2B' }}>{s.numero}</td>
                  <td className="px-4 py-3.5.5">
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
                      <div style={{ color: '#1A1D2B', fontSize: 12, fontWeight: 500 }}>{s.paciente.municipio}</div>
                      <div style={{ color: '#94A3B8', fontSize: 10.5 }}>{s.paciente.regional}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5"><StatusV2Badge status={s.status} /></td>
                  <td className="px-4 py-3.5" style={{ color: '#475569', fontSize: 12 }}>
                    {ultimaAtualizacao ? (
                      <span title={new Date(ultimaAtualizacao.data).toLocaleString('pt-BR')}>
                        {tempoRelativo(ultimaAtualizacao.data)}
                      </span>
                    ) : (
                      <span style={{ color: '#9CA3AF' }}>—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="inline-flex items-center">
                      <RowActions
                        actions={[
                          {
                            key: 'abrir',
                            icon: Eye,
                            label: 'Abrir',
                            onClick: () => router.push(`/fluxo-v2/solicitacoes/${s.id}`),
                          },
                          {
                            key: 'editar',
                            icon: Pencil,
                            label: isLocked(s, 'dados_basicos')
                              ? tooltipLocked(s, 'dados_basicos')
                              : 'Editar solicitação',
                            onClick: () => setEditar(s),
                            disabled: isLocked(s, 'dados_basicos'),
                          },
                          {
                            key: 'encerrar',
                            icon: Archive,
                            label: s.status === 'encerrada'
                              ? 'Solicitação já encerrada'
                              : 'Encerrar solicitação',
                            tone: 'danger',
                            onClick: () => abrirEncerrar(s),
                            disabled: s.status === 'encerrada',
                          },
                        ]}
                      />
                      {setorAtual(s) === 'dados_basicos' && (
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
          total={filtradas.length}
          pageSize={pageSize}
          page={page}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          recordLabel="solicitações"
        />
      </div>

      <NewSolicitacaoDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {enviar && (
        <EnviarParaSetorDrawer
          open={!!enviar}
          onClose={() => setEnviar(null)}
          solicitacaoId={enviar.id}
          setorAtual="dados_basicos"
        />
      )}

      {editar && (
        <NewEditarSolicitacaoDrawer
          open={!!editar}
          onClose={() => setEditar(null)}
          solicitacao={editar}
          snapshotPaciente={snapshotFromSolicitacao(editar)}
        />
      )}

      {encerrarTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setEncerrarTarget(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: 'white', borderRadius: 12, width: 'min(480px, 92vw)', padding: 24 }}>
            <h3 className="text-[18px] font-semibold mb-1" style={{ color: '#1A1D2B' }}>Encerrar solicitação</h3>
            <p className="text-[13px] mb-4" style={{ color: '#6B7280' }}>{encerrarTarget.numero} — {encerrarTarget.paciente.nome}</p>
            <label className="block text-[12px] font-medium mb-1" style={{ color: '#475569' }}>Motivo</label>
            <select
              value={motivo} onChange={(e) => setMotivo(e.target.value as MotivoEncerramento)}
              className="w-full px-3 py-2 text-[13px] mb-3"
              style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
            >
              {(Object.keys(MOTIVO_ENCERRAMENTO_LABEL) as MotivoEncerramento[]).map((m) => (
                <option key={m} value={m}>{MOTIVO_ENCERRAMENTO_LABEL[m]}</option>
              ))}
            </select>
            <label className="block text-[12px] font-medium mb-1" style={{ color: '#475569' }}>Data</label>
            <input
              type="date" value={dataEnc} onChange={(e) => setDataEnc(e.target.value)}
              className="w-full px-3 py-2 text-[13px] mb-3"
              style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
            />
            <label className="block text-[12px] font-medium mb-1" style={{ color: '#475569' }}>Observação</label>
            <textarea
              value={obsEnc} onChange={(e) => setObsEnc(e.target.value)} rows={3}
              className="w-full px-3 py-2 text-[13px] mb-4"
              style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 8 }}
            />
            <div className="flex justify-end gap-2">
              <button type="button" className="tfd-btn tfd-btn-ghost" onClick={() => setEncerrarTarget(null)}>Cancelar</button>
              <button type="button" className="tfd-btn tfd-btn-danger" onClick={confirmarEncerrar}>Confirmar encerramento</button>
            </div>
          </div>
        </div>
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
