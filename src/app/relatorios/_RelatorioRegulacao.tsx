'use client';

import { useMemo, useState } from 'react';
import { Calendar, Stamp, RefreshCw, MapPin, FileText, CalendarX2 } from 'lucide-react';
import { FluxoV2Provider, useFluxoV2State } from '../fluxo-v2/_state/FluxoV2Provider';
import { agendamentosConfirmados, dataDoAgendamento } from '../fluxo-v2/_utils/agendamento';
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
import type { CarimboRegulacao, SolicitacaoMock, ParecerMock } from '@/core/mocks/fluxo-v2-v3-seed';

/** Rótulos por carimbo — mesma nomenclatura usada no drawer de carimbo e na
 *  tabela da Regulação, na ordem em que aparecem no fluxo de decisão. */
const CARIMBO_LABEL: Record<CarimboRegulacao, string> = {
  APROVADO_DIRETO: 'Aprovado direto',
  CNRAC: 'CNRAC',
  CET: 'CET',
  SAAS: 'SAAS',
  AGENDAMENTO: 'Agendamento',
};

const CARIMBO_ORDEM: CarimboRegulacao[] = [
  'APROVADO_DIRETO', 'CNRAC', 'CET', 'SAAS', 'AGENDAMENTO',
];

/** Uma linha = um agendamento confirmado, não uma solicitação. Uma mesma
 *  solicitação com dois agendamentos (janeiro e fevereiro) gera duas linhas,
 *  uma em cada mês. */
interface LinhaRegulacao {
  id: string;
  solicitacaoId: string;
  numero: string;
  dataAgendamento: string | null;
  unidadeDestino: string;
  carimbo: CarimboRegulacao | null;
  cidParecer: string | null;
  cidParecerNome: string | null;
  dataLaudo: string | null;
  laudoOrigemUnidade: string | null;
  pacienteNome: string;
  pacienteCpf: string;
  pacienteMunicipio: string;
  pacienteRegional: string;
}

/** Último parecer da solicitação (mais recente por data) — mesmo critério
 *  usado no Relatório de Gestão para "o parecer que vale" quando há mais de
 *  um registrado. */
function ultimoParecer(s: SolicitacaoMock): ParecerMock | null {
  if (s.pareceres.length === 0) return null;
  return [...s.pareceres].sort((a, b) => b.data.localeCompare(a.data))[0];
}

function linhasDaSolicitacao(s: SolicitacaoMock): LinhaRegulacao[] {
  const parecer = ultimoParecer(s);
  const base = {
    solicitacaoId: s.id,
    numero: s.numero,
    carimbo: s.carimboRegulacao ?? null,
    cidParecer: parecer?.cidPrincipal ?? null,
    cidParecerNome: parecer?.cidPrincipalNome ?? null,
    dataLaudo: s.dataLaudo ?? null,
    laudoOrigemUnidade: s.laudoOrigemUnidade ?? null,
    pacienteNome: s.paciente.nome,
    pacienteCpf: s.paciente.cpf,
    pacienteMunicipio: s.paciente.municipio,
    pacienteRegional: s.paciente.regionalCodigo
      ? `${s.paciente.regionalCodigo} · ${s.paciente.regional}`
      : s.paciente.regional,
  };

  const agendamentos = agendamentosConfirmados(s);
  if (agendamentos.length === 0) return [];

  return agendamentos.map((t) => ({
    ...base,
    id: `${s.id}-${t.id}`,
    dataAgendamento: dataDoAgendamento(t)?.slice(0, 10) || null,
    unidadeDestino: t.unidade,
  }));
}

/**
 * A tela de Relatórios fica fora do route group `/fluxo-v2`, então o
 * `FluxoV2Provider` não está montado pelo layout — precisa ser provido
 * localmente aqui, no mesmo padrão usado pelo Painel (`/dashboard`).
 */
export default function RelatorioRegulacao() {
  return (
    <FluxoV2Provider>
      <RelatorioRegulacaoContent />
    </FluxoV2Provider>
  );
}

function RelatorioRegulacaoContent() {
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

  // Todos os agendamentos confirmados de todas as solicitações — a unidade
  // da tabela é o agendamento, não a solicitação.
  const todasAsLinhas = useMemo(
    () => solicitacoes.flatMap(linhasDaSolicitacao),
    [solicitacoes],
  );

  // Agendamentos sem data registrada não pertencem a nenhum período, mas não
  // podem simplesmente sumir — ficam sempre visíveis, com estado claro.
  const linhasSemData = useMemo(
    () => todasAsLinhas.filter((l) => !l.dataAgendamento),
    [todasAsLinhas],
  );

  const linhasNoPeriodo = useMemo(
    () => todasAsLinhas
      .filter((l) => l.dataAgendamento && l.dataAgendamento >= periodo.inicio && l.dataAgendamento <= periodo.fim)
      .sort((a, b) => (a.dataAgendamento ?? '').localeCompare(b.dataAgendamento ?? '')),
    [todasAsLinhas, periodo],
  );

  // Linhas exibidas na tabela: as do período + as sem data (sempre visíveis).
  const linhas = useMemo(
    () => [...linhasNoPeriodo, ...linhasSemData],
    [linhasNoPeriodo, linhasSemData],
  );

  const distribuicao = useMemo(() => {
    const acc: Record<CarimboRegulacao | 'sem', number> = {
      APROVADO_DIRETO: 0, CNRAC: 0, CET: 0, SAAS: 0, AGENDAMENTO: 0, sem: 0,
    };
    for (const l of linhasNoPeriodo) {
      if (!l.carimbo) acc.sem += 1;
      else acc[l.carimbo] += 1;
    }
    return acc;
  }, [linhasNoPeriodo]);

  const columns: ReportColumn<LinhaRegulacao>[] = [
    {
      key: 'data',
      header: 'Data do agendamento',
      width: '130px',
      render: (r) => (r.dataAgendamento
        ? fmtDataBR(r.dataAgendamento)
        : (
          <span className="inline-flex items-center gap-1 font-sans" style={{ color: 'var(--tfd-warning)' }} title="Agendamento sem data registrada no cadastro">
            <CalendarX2 size={11} /> Sem data
          </span>
        )),
    },
    {
      key: 'unidade',
      header: 'Unidade de destino',
      width: '200px',
      render: (r) => (
        <span className="text-[12.5px]" style={{ color: 'var(--tfd-text-primary)' }}>{r.unidadeDestino}</span>
      ),
    },
    {
      key: 'carimbo',
      header: 'Carimbo da Regulação',
      width: '160px',
      align: 'center',
      render: (r) => <CarimboBadge carimbo={r.carimbo} />,
    },
    {
      key: 'cid',
      header: 'CID do parecer',
      width: '160px',
      render: (r) => (r.cidParecer
        ? (
          <div className="flex flex-col gap-0.5 min-w-0">
            <span
              className="inline-block font-mono text-[10.5px] font-bold px-1.5 py-[1px] rounded self-start"
              style={{ background: 'var(--tfd-blue-50)', color: 'var(--tfd-blue-700)' }}
            >
              {r.cidParecer}
            </span>
            {r.cidParecerNome && (
              <span className="text-[11px] truncate" style={{ color: 'var(--tfd-text-muted)' }}>{r.cidParecerNome}</span>
            )}
          </div>
        )
        : <span className="text-[12px]" style={{ color: '#94A3B8' }}>Sem parecer</span>),
    },
    {
      key: 'laudo',
      header: 'Origem do laudo',
      width: '200px',
      render: (r) => (
        <div className="flex items-start gap-1.5 min-w-0">
          <FileText size={12} style={{ color: '#3730A3', flexShrink: 0, marginTop: 2 }} />
          <div className="min-w-0">
            <div className="text-[12.5px] font-medium truncate" style={{ color: 'var(--tfd-text-primary)' }}>
              {r.laudoOrigemUnidade ?? 'Não informado'}
            </div>
            {r.dataLaudo && (
              <div className="text-[11px] truncate" style={{ color: 'var(--tfd-text-muted)' }}>
                Laudo de {fmtDataBR(r.dataLaudo)}
              </div>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'paciente',
      header: 'Paciente',
      width: '220px',
      render: (r) => (
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="font-semibold truncate" style={{ color: 'var(--tfd-text-primary)' }}>{r.pacienteNome}</span>
          <span className="text-[11px] font-mono" style={{ color: 'var(--tfd-text-muted)' }}>{r.pacienteCpf}</span>
          <span className="inline-flex items-center gap-1 text-[11px] truncate" style={{ color: 'var(--tfd-text-muted)' }}>
            <MapPin size={9} style={{ flexShrink: 0 }} />
            {r.pacienteMunicipio} · {r.pacienteRegional}
          </span>
        </div>
      ),
    },
    {
      key: 'numero',
      header: 'Nº da solicitação',
      width: '130px',
      mono: true,
      render: (r) => r.numero,
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
        titulo="Relatório Regulação"
        periodoLabel={periodo.label}
        rightSlot={
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest opacity-80">Agendamentos no período</p>
            <p className="text-[20px] font-bold font-mono">{fmtInt(linhasNoPeriodo.length)}</p>
          </div>
        }
      />

      <StatsRow
        items={[
          ...CARIMBO_ORDEM.map((key) => ({
            label: CARIMBO_LABEL[key],
            value: fmtInt(distribuicao[key]),
            icon: <Stamp size={11} />,
          })),
          { label: 'Sem carimbo', value: fmtInt(distribuicao.sem), icon: <Stamp size={11} /> },
        ]}
      />

      {linhasSemData.length > 0 && (
        <div
          className="no-print flex items-start gap-2 px-4 py-3 text-[12.5px]"
          style={{ background: 'var(--tfd-warning-bg)', border: '1px solid #FCD34D', borderRadius: 10, color: '#92400E' }}
        >
          <CalendarX2 size={14} className="shrink-0 mt-px" />
          <span>
            {linhasSemData.length === 1 ? 'Há 1 agendamento' : `Há ${linhasSemData.length} agendamentos`} sem
            data registrada no cadastro — aparecem sempre na tabela, independentemente do período
            selecionado, marcados como <strong>Sem data</strong>.
          </span>
        </div>
      )}

      <TableCard
        title="Agendamentos"
        subtitle="Uma linha por agendamento, com o carimbo da Regulação da solicitação"
        count={linhas.length}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-[13px]" style={{ color: 'var(--tfd-text-muted)' }}>
            Carregando…
          </div>
        ) : (
          <ReportTable<LinhaRegulacao>
            columns={columns}
            rows={linhas}
            emptyLabel={`Nenhum agendamento no período de ${periodo.label.toLowerCase()}.`}
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
  // Carimbo é a informação mais importante deste relatório para a Manu —
  // destaque maior que as outras badges da tabela, sempre com os tokens de
  // marca (nunca cor solta).
  return (
    <span
      className="inline-flex items-center px-2.5 py-1 text-[11.5px] font-bold uppercase"
      style={{
        background: 'var(--tfd-primary-50)',
        color: 'var(--tfd-primary-700)',
        border: '1px solid var(--tfd-primary-200)',
        borderRadius: 6,
        letterSpacing: '0.04em',
      }}
    >
      {CARIMBO_LABEL[carimbo]}
    </span>
  );
}
