'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarCheck, Send, Search, LogOut, Eye } from 'lucide-react';
import RowActions from '../_components/RowActions';
import BotaoEnvio from '../_components/BotaoEnvio';
import SolicitacaoNumeroCell from '../_components/SolicitacaoNumeroCell';
import PacienteHoverCell from '../_components/PacienteHoverCell';
import StatusV2Badge from '../_components/StatusV2Badge';
import EnviarParaSetorDrawer from '../_components/drawers/EnviarParaSetorDrawer';
import StatusDot from '../_components/StatusDot';
import { useFluxoV2State } from '../_state/FluxoV2Provider';
import { SETOR_LABEL, SETOR_ORIGEM_DOT_COLOR } from '../_utils/lock';
import { casaComFiltroRegiao, REGIAO_FILTRO_VAZIO, type RegiaoFiltroValue } from '../_utils/derivarRegional';
import RegiaoRegionalMunicipioFilter from '../_components/RegiaoRegionalMunicipioFilter';
import { casaComFiltroResponsavel, RESPONSAVEL_FILTRO_VAZIO, type ResponsavelFiltroValue } from '../_utils/derivarResponsavel';
import ResponsavelFilter from '../_components/ResponsavelFilter';
import ResponsavelAvatar from '../_components/ResponsavelAvatar';
import Pagination from '@/shared/components/pagination/Pagination';
import StatsRow from '@/shared/components/stats-row/StatsRow';
import { contarEncerradasNoMes, dentroDoMesAtual } from '../_utils/stats';
import Drawer from '@/shared/components/drawer/Drawer';
import FormField from '@/shared/components/drawer/FormField';
import LookupSelect from '@/shared/components/lookup-select/LookupSelect';
import { useToast } from '@/shared/components/toast/Toast';
import { type SolicitacaoMock } from '@/core/mocks/fluxo-v2-v3-seed';
import PageHeader from '@/shared/components/page-header/PageHeader';
import SortTh, { compareValues, nextSort, type SortDir } from '@/shared/components/sort-th/SortTh';
import { Skeleton } from '@/components/ui/skeleton';
import { Can } from '@/shared/auth/Can';

const DEFAULT_PAGE_SIZE = 25;
const MS_HORA = 1000 * 60 * 60;

/** Setores que podem enviar uma solicitação para Aprovação (todos os
 *  operacionais, exceto o próprio Aprovação e o Encerramento). */
type SetorOrigemAprovacao = NonNullable<SolicitacaoMock['setorOrigemAprovacao']>;

const SETOR_ORIGEM_OPTIONS: SetorOrigemAprovacao[] = [
  'dados_basicos',
  'regulacao',
  'passagens',
  'ajuda_custo',
  'acompanhamento',
];

/** Horas desde que a solicitação entrou em Aprovação — usa o momento da
 *  última tramitação (o envio que trouxe pra cá) e cai para a data de
 *  criação quando esse dado ainda não existir (registro legado). */
function horasEmAprovacao(s: SolicitacaoMock): number {
  const referencia = s.ultimaTramitacao?.data ?? s.dataCriacao;
  const d = new Date(referencia);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / MS_HORA));
}

/**
 * Fila de Aprovações: solicitações encaminhadas por qualquer um dos cinco
 * setores operacionais para análise e decisão de um setor responsável.
 * Diferente das demais filas do fluxo, Aprovação não tem posição fixa na
 * cadeia — pode ser acessada e deixada a partir de qualquer setor, por isso
 * a solicitação registra o setor de origem e a observação (motivo do
 * pedido) junto com a tramitação, para a fila poder exibi-los mesmo depois
 * de um reload.
 */
export default function AprovacoesListPage() {
  const router = useRouter();
  const toast = useToast();
  const { solicitacoes, isLoading, encerrar } = useFluxoV2State();

  const [enviar, setEnviar] = useState<SolicitacaoMock | null>(null);
  const [encerrarItem, setEncerrarItem] = useState<SolicitacaoMock | null>(null);
  const [motivo, setMotivo] = useState('');
  const [dataEncerramento, setDataEncerramento] = useState('');
  const [observacao, setObservacao] = useState('');

  const [busca, setBusca] = useState('');
  const [setorOrigemFiltro, setSetorOrigemFiltro] = useState<SetorOrigemAprovacao | ''>('');
  const [regiaoFiltro, setRegiaoFiltro] = useState<RegiaoFiltroValue>(REGIAO_FILTRO_VAZIO);
  const [responsavelFiltro, setResponsavelFiltro] = useState<ResponsavelFiltroValue>(RESPONSAVEL_FILTRO_VAZIO);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sort, setSort] = useState<{ field: string; dir: SortDir }>({ field: 'tempo', dir: 'desc' });

  const filaBase = useMemo(
    () => solicitacoes.filter((s) => s.status === 'em_aprovacao'),
    [solicitacoes],
  );

  const stats = useMemo(() => {
    // "Tramitadas no mês" conta as solicitações que passaram pelo status de
    // Aprovação neste mês, olhando `ultimaTramitacao` em TODAS as solicitações
    // (não só as que ainda estão na fila). O protótipo guarda apenas a última
    // tramitação de cada uma, então um envio mais recente para outro setor
    // sobrescreve este dado.
    const tramitadasNoMes = solicitacoes.filter(
      (s) => s.ultimaTramitacao?.destino === 'aprovacao' && dentroDoMesAtual(s.ultimaTramitacao.data),
    ).length;
    return {
      total: filaBase.length,
      tramitadasNoMes,
      encerradasNoMes: contarEncerradasNoMes(solicitacoes),
    };
  }, [filaBase, solicitacoes]);

  const fila = useMemo(
    () => filaBase.filter((s) => {
      if (setorOrigemFiltro && s.setorOrigemAprovacao !== setorOrigemFiltro) return false;
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
    [filaBase, busca, setorOrigemFiltro, regiaoFiltro, responsavelFiltro],
  );

  useEffect(() => {
    setPage(1);
  }, [busca, setorOrigemFiltro, regiaoFiltro, responsavelFiltro, sort]);

  const filaOrdenada = useMemo(() => {
    if (!sort.field || !sort.dir) return fila;
    const getValue = (s: SolicitacaoMock): unknown => {
      switch (sort.field) {
        case 'numero': return s.numero;
        case 'paciente': return s.paciente.nome;
        case 'municipio': return s.paciente.municipio;
        case 'setorOrigem': return s.setorOrigemAprovacao ? SETOR_LABEL[s.setorOrigemAprovacao] : '';
        case 'tempo': return horasEmAprovacao(s);
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

  const temFiltroSetor = !!setorOrigemFiltro;

  function handleOpenEncerrar(s: SolicitacaoMock) {
    setEncerrarItem(s);
    setMotivo('');
    setDataEncerramento(new Date().toISOString().slice(0, 10));
    setObservacao('');
  }

  function handleCloseEncerrar() {
    setEncerrarItem(null);
    setMotivo('');
    setDataEncerramento('');
    setObservacao('');
  }

  function handleConfirmarEncerramento() {
    if (!encerrarItem) return;
    if (!motivo) { toast.error('Campo obrigatório', 'Selecione o motivo do encerramento.'); return; }
    if (!dataEncerramento) { toast.error('Campo obrigatório', 'Informe a data do encerramento.'); return; }

    encerrar(encerrarItem.id, {
      data: dataEncerramento,
      motivo,
      observacao: observacao.trim() || undefined,
    });
    toast.success('Solicitação encerrada!', 'O caso foi finalizado e saiu da fila de Aprovações.');
    handleCloseEncerrar();
  }

  return (
    <div>
      <PageHeader
        title="Aprovações"
        subtitle="Solicitações encaminhadas para análise e decisão dos setores responsáveis."
      />

      <StatsRow
        stats={[
          {
            label: 'Em aprovação',
            value: stats.total,
            hint: 'solicitações',
            title: 'Solicitações no status geral Aprovação',
          },
          {
            label: 'Tramitadas no mês',
            value: stats.tramitadasNoMes,
            hint: 'passaram por Aprovação',
            title: 'Solicitações que passaram pelo status de Aprovação no mês corrente',
          },
          {
            label: 'Encerradas no mês',
            value: stats.encerradasNoMes,
            hint: 'finalizadas',
            title: 'Solicitações encerradas no mês corrente',
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
          value={setorOrigemFiltro}
          onChange={(e) => setSetorOrigemFiltro(e.target.value as SetorOrigemAprovacao | '')}
          style={{
            height: 36, padding: '0 12px', background: 'white',
            border: '1px solid var(--tfd-surface-border)', borderRadius: 8,
            fontSize: 13, color: '#1A1D2B', minWidth: 168,
          }}
          aria-label="Filtrar por setor de origem"
        >
          <option value="">Todos os setores</option>
          {SETOR_ORIGEM_OPTIONS.map((setor) => (
            <option key={setor} value={setor}>{SETOR_LABEL[setor]}</option>
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

        {temFiltroSetor && (
          <button
            type="button"
            onClick={() => setSetorOrigemFiltro('')}
            className="text-[12.5px] font-medium transition-colors"
            style={{ height: 36, padding: '0 10px', color: '#64748B' }}
          >
            Limpar setor
          </button>
        )}
      </div>

      <div style={{ background: 'white', border: '1px solid var(--tfd-surface-border)', borderRadius: 'var(--tfd-radius-lg)', overflow: 'hidden' }}>
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '1px solid var(--tfd-surface-border)' }}>
              <SortTh label="Número" field="numero" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <SortTh label="Paciente" field="paciente" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <SortTh label="Município / Regional" field="municipio" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <SortTh label="Setor de origem" field="setorOrigem" currentField={sort.field} currentDir={sort.dir} onToggle={toggleSort} />
              <Th>Observação para aprovação</Th>
              <Th>Status</Th>
              <Th>Responsável</Th>
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
                  Nenhuma solicitação em aprovação.
                </td>
              </tr>
            )}
            {!isLoading && paginadas.map((s) => (
              <tr
                key={s.id}
                style={{ borderBottom: '1px solid #E2E8F0', cursor: 'pointer' }}
                className="hover:bg-[#F8FAFC] transition-colors"
                onClick={() => router.push(`/fluxo-v2/solicitacoes/${s.id}?from=aprovacoes`)}
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
                  {s.setorOrigemAprovacao ? (
                    <StatusDot dotColor={SETOR_ORIGEM_DOT_COLOR[s.setorOrigemAprovacao]}>
                      {SETOR_LABEL[s.setorOrigemAprovacao]}
                    </StatusDot>
                  ) : (
                    <span style={{ color: '#CBD5E1', fontSize: 12 }}>—</span>
                  )}
                </td>
                <td className="px-4 py-3.5" style={{ maxWidth: 320 }}>
                  {s.observacaoAprovacao ? (
                    <p style={{ color: '#334155', fontSize: 12.5, lineHeight: 1.4, whiteSpace: 'pre-wrap', overflowWrap: 'break-word' }}>
                      {s.observacaoAprovacao}
                    </p>
                  ) : (
                    <span style={{ color: '#CBD5E1', fontSize: 12 }}>Sem observação</span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <StatusV2Badge status={s.status} />
                </td>
                <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                  <ResponsavelAvatar responsaveis={s.responsaveisAtuais} />
                </td>
                <td className="px-4 py-3.5 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="inline-flex items-center">
                    <RowActions
                      actions={[
                        {
                          key: 'ver',
                          icon: Eye,
                          label: 'Ver solicitação',
                          onClick: () => router.push(`/fluxo-v2/solicitacoes/${s.id}?from=aprovacoes`),
                        },
                      ]}
                    />
                    <Can action="tramitacao.tramitar">
                      <BotaoEnvio
                        icon={Send}
                        label="Tramitar"
                        onClick={() => setEnviar(s)}
                      />
                      <BotaoEnvio
                        icon={LogOut}
                        label="Encerrar solicitação"
                        onClick={() => handleOpenEncerrar(s)}
                      />
                    </Can>
                  </div>
                </td>
              </tr>
            ))}
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
          setorAtual="aprovacao"
        />
      )}

      <Drawer
        open={!!encerrarItem}
        onClose={handleCloseEncerrar}
        title="Encerrar Solicitação"
        subtitle={encerrarItem?.numero ?? ''}
        width="480px"
        footer={
          <>
            <button type="button" className="tfd-btn tfd-btn-ghost" onClick={handleCloseEncerrar}>Cancelar</button>
            <button type="button" className="tfd-btn tfd-btn-danger" onClick={handleConfirmarEncerramento}>
              <CalendarCheck size={14} /> Confirmar Encerramento
            </button>
          </>
        }
      >
        {encerrarItem && (
          <div className="rounded-lg p-3 mb-4" style={{ background: '#F8FAFC', border: '1px solid var(--tfd-surface-border)' }}>
            <p className="font-semibold text-sm" style={{ color: '#0F172A' }}>{encerrarItem.paciente.nome}</p>
            <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>
              Processo: <span className="font-semibold" style={{ color: '#146BFA' }}>{encerrarItem.numero}</span>
            </p>
          </div>
        )}

        <LookupSelect
          categoria="motivo_encerramento"
          label="Motivo do encerramento"
          value={motivo}
          onChange={setMotivo}
          required
        />
        <FormField label="Data do encerramento" required>
          <input
            type="date"
            className="tfd-input"
            value={dataEncerramento}
            onChange={(e) => setDataEncerramento(e.target.value)}
          />
        </FormField>
        <FormField label="Observações">
          <textarea
            className="tfd-input"
            rows={3}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
        </FormField>
      </Drawer>
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
