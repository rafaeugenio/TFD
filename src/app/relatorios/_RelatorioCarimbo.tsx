'use client';

import { useMemo, useState } from 'react';
import { Calendar, Stamp, RefreshCw, AlertTriangle } from 'lucide-react';
import { FluxoV2Provider, useFluxoV2State } from '../fluxo-v2/_state/FluxoV2Provider';
import { contarPorCarimboNoPeriodo, type DistribuicaoCarimbo } from '../fluxo-v2/_utils/stats';
import {
  ReportToolbar,
  FilterField,
  PillButton,
  PrintButton,
  ReportHero,
  StatsRow,
  TableCard,
  ReportPrintStyles,
} from './_shared/ReportShell';
import { ReportTable, type ReportColumn } from './_shared/ReportTable';
import { MES_LABEL, MES_LABEL_SHORT, fmtInt, fmtDataBR, anosDisponiveis } from './_shared/format';
import type { CarimboRegulacao, SolicitacaoMock } from '@/core/mocks/fluxo-v2-v3-seed';

/** Rótulos por carimbo — mesma nomenclatura usada no drawer de carimbo e na
 *  tabela da Regulação, na ordem em que aparecem no fluxo de decisão. */
const CARIMBO_LABEL: Record<CarimboRegulacao, string> = {
  APROVADO_DIRETO: 'Aprovado direto',
  CNRAC: 'CNRAC',
  CET: 'CET',
  SAAS: 'SAAS',
  AGENDAMENTO: 'Agendamento',
};

const CARIMBO_ORDEM: (keyof DistribuicaoCarimbo)[] = [
  'APROVADO_DIRETO', 'CNRAC', 'CET', 'SAAS', 'AGENDAMENTO', 'sem',
];

interface LinhaCarimbo {
  id: string;
  numero: string;
  paciente: string;
  municipio: string;
  carimbo: CarimboRegulacao | null;
  dataCriacao: string;
}

/**
 * A tela de Relatórios fica fora do route group `/fluxo-v2`, então o
 * `FluxoV2Provider` não está montado pelo layout — precisa ser provido
 * localmente aqui, no mesmo padrão usado pelo Painel (`/dashboard`).
 */
export default function RelatorioCarimbo() {
  return (
    <FluxoV2Provider>
      <RelatorioCarimboContent />
    </FluxoV2Provider>
  );
}

function RelatorioCarimboContent() {
  const { solicitacoes, isLoading } = useFluxoV2State();
  const hoje = new Date();
  const [ano, setAno] = useState<number>(hoje.getFullYear());
  const [mes, setMes] = useState<number>(hoje.getMonth() + 1); // 0 = ano inteiro

  const periodo = useMemo(() => {
    if (mes === 0) {
      return { inicio: `${ano}-01-01`, fim: `${ano}-12-31`, label: `Ano de ${ano}` };
    }
    const lastDay = new Date(ano, mes, 0).getDate();
    const mm = String(mes).padStart(2, '0');
    return {
      inicio: `${ano}-${mm}-01`,
      fim: `${ano}-${mm}-${String(lastDay).padStart(2, '0')}`,
      label: `${MES_LABEL[mes - 1]} de ${ano}`,
    };
  }, [ano, mes]);

  const distribuicao = useMemo(
    () => contarPorCarimboNoPeriodo(solicitacoes, periodo.inicio, periodo.fim),
    [solicitacoes, periodo],
  );

  const solicitacoesNoPeriodo = useMemo(
    () => solicitacoes.filter((s) => {
      const dataRef = s.dataCriacao.slice(0, 10);
      return dataRef >= periodo.inicio && dataRef <= periodo.fim;
    }),
    [solicitacoes, periodo],
  );

  const linhas: LinhaCarimbo[] = useMemo(
    () => [...solicitacoesNoPeriodo]
      .sort((a, b) => a.dataCriacao.localeCompare(b.dataCriacao))
      .map((s: SolicitacaoMock) => ({
        id: s.id,
        numero: s.numero,
        paciente: s.paciente.nome,
        municipio: s.paciente.municipio,
        carimbo: s.carimboRegulacao ?? null,
        dataCriacao: s.dataCriacao,
      })),
    [solicitacoesNoPeriodo],
  );

  const total = solicitacoesNoPeriodo.length;

  const columns: ReportColumn<LinhaCarimbo>[] = [
    {
      key: 'numero',
      header: 'Nº processo',
      width: '120px',
      mono: true,
      render: (r) => r.numero,
    },
    {
      key: 'paciente',
      header: 'Paciente',
      render: (r) => (
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-semibold truncate" style={{ color: 'var(--tfd-text-primary)' }}>{r.paciente}</span>
          <span className="text-[11px] truncate" style={{ color: 'var(--tfd-text-muted)' }}>{r.municipio}</span>
        </div>
      ),
    },
    {
      key: 'carimbo',
      header: 'Carimbo',
      width: '160px',
      align: 'center',
      render: (r) => <CarimboBadge carimbo={r.carimbo} />,
    },
    {
      key: 'data',
      header: 'Criada em',
      width: '110px',
      render: (r) => fmtDataBR(r.dataCriacao),
    },
  ];

  return (
    <div className="space-y-4">
      <ReportPrintStyles />

      <ReportToolbar
        filters={
          <>
            <FilterField label="Ano" icon={<Calendar size={11} />}>
              <select
                className="tfd-input"
                style={{ minWidth: 100 }}
                value={ano}
                onChange={(e) => setAno(parseInt(e.target.value, 10))}
              >
                {anosDisponiveis().map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </FilterField>

            <FilterField label="Mês">
              <div className="flex items-center gap-1 flex-wrap">
                <PillButton active={mes === 0} onClick={() => setMes(0)}>Ano inteiro</PillButton>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <PillButton key={m} active={mes === m} onClick={() => setMes(m)}>
                    {MES_LABEL_SHORT[m - 1]}
                  </PillButton>
                ))}
              </div>
            </FilterField>
          </>
        }
        actions={
          <>
            <button
              type="button"
              className="tfd-btn tfd-btn-ghost"
              onClick={() => { setAno(hoje.getFullYear()); setMes(hoje.getMonth() + 1); }}
              title="Voltar para o mês atual"
            >
              <RefreshCw size={13} /> Mês atual
            </button>
            <PrintButton label="Imprimir / PDF" />
          </>
        }
      />

      <ReportHero
        titulo="Relatório por Carimbo — Regulação"
        periodoLabel={periodo.label}
        rightSlot={
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest opacity-80">Solicitações no período</p>
            <p className="text-[20px] font-bold font-mono">{fmtInt(total)}</p>
          </div>
        }
      />

      <div
        className="no-print flex items-start gap-2 px-4 py-3 text-[12.5px]"
        style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 10, color: '#92400E' }}
      >
        <AlertTriangle size={14} className="shrink-0 mt-px" />
        <span>
          O sistema não registra a data em que o carimbo foi aplicado, só a data de criação da
          solicitação. Por isso o período abaixo filtra pela <strong>data de criação</strong>, e o
          carimbo exibido é o atual da solicitação (pode ter sido definido em outro dia).
        </span>
      </div>

      <StatsRow
        items={CARIMBO_ORDEM.map((key) => ({
          label: key === 'sem' ? 'Sem carimbo' : CARIMBO_LABEL[key as CarimboRegulacao],
          value: fmtInt(distribuicao[key]),
          icon: <Stamp size={11} />,
        }))}
      />

      <TableCard
        title="Solicitações do período"
        subtitle="Uma linha por solicitação, com o carimbo atual"
        count={linhas.length}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-[13px]" style={{ color: 'var(--tfd-text-muted)' }}>
            Carregando…
          </div>
        ) : (
          <ReportTable<LinhaCarimbo>
            columns={columns}
            rows={linhas}
            emptyLabel={`Nenhuma solicitação criada em ${periodo.label.toLowerCase()}.`}
          />
        )}
      </TableCard>
    </div>
  );
}

function CarimboBadge({ carimbo }: { carimbo: CarimboRegulacao | null }) {
  if (!carimbo) {
    return (
      <span
        className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold"
        style={{ background: '#F1F5F9', color: '#94A3B8', borderRadius: 6 }}
      >
        Sem carimbo
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold uppercase"
      style={{ background: '#F1F5F9', color: '#475569', border: '1px solid #E2E8F0', borderRadius: 6, letterSpacing: '0.04em' }}
    >
      {CARIMBO_LABEL[carimbo]}
    </span>
  );
}
