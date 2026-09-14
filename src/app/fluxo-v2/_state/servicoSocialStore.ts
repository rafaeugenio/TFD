'use client';

/* -------------------------------------------------------------------------- */
/*  Store do módulo Serviço Social (spec de 14/09/2026)                       */
/*                                                                            */
/*  Mesmo desenho do `saldoAjudaCustoStore`: store module-level com           */
/*  `useSyncExternalStore`, fora do FluxoV2Provider. O módulo precisa ser     */
/*  lido pela fila em /fluxo-v2/servico-social, pela aba dentro do detalhe    */
/*  da solicitação e pela flag na listagem, e escrito de qualquer um deles.   */
/*                                                                            */
/*  Sem persistência no Supabase. As demandas de demonstração são semeadas    */
/*  a partir das solicitações que o Provider carregou do banco (os ids são    */
/*  UUIDs reais, então não dá para fixá-los aqui), uma única vez por sessão.  */
/* -------------------------------------------------------------------------- */

import { useSyncExternalStore } from 'react';
import {
  seedCasasApoio,
  demandaEstaAberta,
  type CasaApoioMock,
  type DemandaSocialMock,
  type InstrumentoSocialMock,
  type SetorOrigemDemanda,
  type SituacaoDemandaSocial,
  type TipoInstrumento,
} from '@/core/mocks/servico-social-seed';

interface SnapshotServicoSocial {
  demandas: DemandaSocialMock[];
  instrumentos: InstrumentoSocialMock[];
  casas: CasaApoioMock[];
}

let state: SnapshotServicoSocial = {
  demandas: [],
  instrumentos: [],
  casas: [...seedCasasApoio],
};

const listeners = new Set<() => void>();

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
const nowIso = () => new Date().toISOString();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): SnapshotServicoSocial {
  return state;
}

/* -------------------------------------------------------------------------- */
/*  Leitura                                                                   */
/* -------------------------------------------------------------------------- */

export function todasDemandas(): DemandaSocialMock[] {
  return [...state.demandas].sort((a, b) =>
    b.dataEncaminhamento.localeCompare(a.dataEncaminhamento),
  );
}

export function demandasDaSolicitacao(solicitacaoId: string): DemandaSocialMock[] {
  return state.demandas
    .filter((d) => d.solicitacaoId === solicitacaoId)
    .sort((a, b) => b.dataEncaminhamento.localeCompare(a.dataEncaminhamento));
}

/** Base da flag "Serviço Social: demanda aberta" na listagem e no detalhe. */
export function temDemandaAberta(solicitacaoId: string): boolean {
  return state.demandas.some((d) => d.solicitacaoId === solicitacaoId && demandaEstaAberta(d));
}

export function instrumentosDaDemanda(demandaId: string): InstrumentoSocialMock[] {
  return state.instrumentos
    .filter((i) => i.demandaId === demandaId)
    .sort((a, b) => b.dataCriacao.localeCompare(a.dataCriacao));
}

export function instrumentosDaSolicitacao(solicitacaoId: string): InstrumentoSocialMock[] {
  return state.instrumentos
    .filter((i) => i.solicitacaoId === solicitacaoId)
    .sort((a, b) => b.dataCriacao.localeCompare(a.dataCriacao));
}

export function contarInstrumentos(demandaId: string): number {
  return state.instrumentos.filter((i) => i.demandaId === demandaId).length;
}

export function todasCasas(): CasaApoioMock[] {
  return [...state.casas].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export function casaPorId(id: string | undefined): CasaApoioMock | undefined {
  if (!id) return undefined;
  return state.casas.find((c) => c.id === id);
}

/** Encaminhamentos vinculados a uma casa — alimenta o histórico no detalhe
 *  dela. Uma casa inativa continua aparecendo aqui. */
export function encaminhamentosDaCasa(casaId: string): Array<{
  instrumento: InstrumentoSocialMock;
  demanda: DemandaSocialMock | undefined;
}> {
  return state.instrumentos
    .filter((i) => i.casaApoioId === casaId)
    .sort((a, b) => b.dataCriacao.localeCompare(a.dataCriacao))
    .map((instrumento) => ({
      instrumento,
      demanda: state.demandas.find((d) => d.id === instrumento.demandaId),
    }));
}

/* -------------------------------------------------------------------------- */
/*  Escrita — demandas                                                        */
/* -------------------------------------------------------------------------- */

export interface NovaDemandaInput {
  solicitacaoId: string;
  solicitacaoNumero: string;
  pacienteNome: string;
  pacienteCpf: string;
  motivo: string;
  setorOrigem: SetorOrigemDemanda;
  encaminhadoPor: string;
}

/** Abrir uma demanda não altera setor nem etapa do fluxo principal. */
export function abrirDemanda(input: NovaDemandaInput): DemandaSocialMock {
  const nova: DemandaSocialMock = {
    id: uid('ds'),
    solicitacaoId: input.solicitacaoId,
    solicitacaoNumero: input.solicitacaoNumero,
    pacienteNome: input.pacienteNome,
    pacienteCpf: input.pacienteCpf,
    dataEncaminhamento: nowIso(),
    encaminhadoPor: input.encaminhadoPor,
    setorOrigem: input.setorOrigem,
    motivo: input.motivo.trim(),
    situacao: 'pendente',
  };
  state = { ...state, demandas: [...state.demandas, nova] };
  emit();
  return nova;
}

/** Assumir a demanda — Pendente vira Em atendimento com profissional. */
export function assumirDemanda(demandaId: string, profissional: string): void {
  state = {
    ...state,
    demandas: state.demandas.map((d) =>
      d.id === demandaId
        ? { ...d, situacao: 'em_atendimento' as SituacaoDemandaSocial, profissionalResponsavel: profissional }
        : d,
    ),
  };
  emit();
}

/** Conclusão com orientação final. Data/hora e autora são automáticas. */
export function concluirDemanda(
  demandaId: string,
  orientacaoFinal: string,
  concluidaPor: string,
): void {
  state = {
    ...state,
    demandas: state.demandas.map((d) =>
      d.id === demandaId
        ? {
            ...d,
            situacao: 'concluida' as SituacaoDemandaSocial,
            orientacaoFinal: orientacaoFinal.trim() || undefined,
            dataConclusao: nowIso(),
            concluidaPor,
            profissionalResponsavel: d.profissionalResponsavel ?? concluidaPor,
          }
        : d,
    ),
  };
  emit();
}

export function cancelarDemanda(
  demandaId: string,
  motivoCancelamento: string,
  canceladaPor: string,
): void {
  state = {
    ...state,
    demandas: state.demandas.map((d) =>
      d.id === demandaId
        ? {
            ...d,
            situacao: 'cancelada' as SituacaoDemandaSocial,
            motivoCancelamento: motivoCancelamento.trim() || undefined,
            dataConclusao: nowIso(),
            concluidaPor: canceladaPor,
          }
        : d,
    ),
  };
  emit();
}

/** Volta uma demanda concluída ou cancelada para Em atendimento. Instrumentos
 *  e histórico nunca são apagados. */
export function reabrirDemanda(demandaId: string, profissional: string): void {
  state = {
    ...state,
    demandas: state.demandas.map((d) =>
      d.id === demandaId
        ? {
            ...d,
            situacao: 'em_atendimento' as SituacaoDemandaSocial,
            profissionalResponsavel: d.profissionalResponsavel ?? profissional,
            dataConclusao: undefined,
            concluidaPor: undefined,
          }
        : d,
    ),
  };
  emit();
}

/* -------------------------------------------------------------------------- */
/*  Escrita — instrumentos                                                    */
/* -------------------------------------------------------------------------- */

export interface NovoInstrumentoInput {
  demandaId: string;
  solicitacaoId: string;
  tipo: TipoInstrumento;
  conteudo: string;
  sigiloso: boolean;
  autora: string;
  autoraId?: string;
  casaApoioId?: string;
}

export function criarInstrumento(input: NovoInstrumentoInput): InstrumentoSocialMock {
  const novo: InstrumentoSocialMock = {
    id: uid('is'),
    demandaId: input.demandaId,
    solicitacaoId: input.solicitacaoId,
    tipo: input.tipo,
    conteudo: input.conteudo,
    sigiloso: input.sigiloso,
    autora: input.autora,
    autoraId: input.autoraId,
    casaApoioId: input.casaApoioId,
    dataCriacao: nowIso(),
  };
  state = { ...state, instrumentos: [...state.instrumentos, novo] };
  emit();
  return novo;
}

/* -------------------------------------------------------------------------- */
/*  Escrita — casas de apoio                                                  */
/* -------------------------------------------------------------------------- */

export type CasaApoioInput = Omit<CasaApoioMock, 'id'>;

export function criarCasaApoio(input: CasaApoioInput): CasaApoioMock {
  const nova: CasaApoioMock = { id: uid('casa'), ...input };
  state = { ...state, casas: [...state.casas, nova] };
  emit();
  return nova;
}

export function editarCasaApoio(id: string, patch: Partial<CasaApoioInput>): void {
  state = {
    ...state,
    casas: state.casas.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  };
  emit();
}

/* -------------------------------------------------------------------------- */
/*  Seed de demonstração                                                      */
/* -------------------------------------------------------------------------- */

interface SolicitacaoParaSeed {
  id: string;
  numero: string;
  dataCriacao: string;
  paciente: { nome: string; cpf: string };
}

let seedAplicado = false;

/**
 * Semeia demandas de demonstração para que a fila, a aba e a flag tenham
 * conteúdo na validação presencial. Roda uma única vez por sessão e só quando
 * ainda não existe nenhuma demanda, então nunca sobrescreve o que a equipe
 * cadastrar durante a demonstração.
 *
 * As solicitações escolhidas seguem a mesma ordem da listagem (número
 * decrescente), e não a ordem crua do banco: semear nas primeiras que o banco
 * devolveu jogava a flag para a quinta página, onde ninguém a veria na
 * demonstração.
 */
export function semearDemandasDemo(solicitacoes: SolicitacaoParaSeed[]): void {
  if (seedAplicado || state.demandas.length > 0 || solicitacoes.length === 0) return;
  seedAplicado = true;

  const maisRecentes = [...solicitacoes].sort((a, b) =>
    (b.numero ?? '').localeCompare(a.numero ?? ''),
  );

  const diasAtras = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
  };

  const modelos: Array<{
    motivo: string;
    setor: SetorOrigemDemanda;
    encaminhadoPor: string;
    situacao: SituacaoDemandaSocial;
    dias: number;
    profissional?: string;
    orientacao?: string;
  }> = [
    {
      motivo:
        'Paciente relata não ter onde ficar durante o tratamento em São Paulo e não tem familiar na cidade. Avaliar encaminhamento para casa de apoio antes da emissão das passagens.',
      setor: 'passagens',
      encaminhadoPor: 'Luiz Cutrim',
      situacao: 'pendente',
      dias: 2,
    },
    {
      motivo:
        'Acompanhante indicada é a filha, que declarou não ter condições de arcar com alimentação no período. Avaliar a situação socioeconômica da família para o cálculo da ajuda de custo.',
      setor: 'ajuda_custo',
      encaminhadoPor: 'Thiago Mendes',
      situacao: 'em_atendimento',
      dias: 5,
      profissional: 'Ana Cláudia Mendes',
    },
    {
      motivo:
        'Paciente idoso sem rede de apoio no município de origem. Regulação solicita parecer social antes de decidir sobre acompanhante adicional.',
      setor: 'regulacao',
      encaminhadoPor: 'Dr. Carlos Aguiar',
      situacao: 'em_atendimento',
      dias: 9,
      profissional: 'Rosângela Barros Lima',
    },
    {
      motivo:
        'Família solicitou orientação sobre documentação e direitos durante o período de permanência fora do domicílio.',
      setor: 'acompanhamento',
      encaminhadoPor: 'Manuela Freitas',
      situacao: 'concluida',
      dias: 18,
      profissional: 'Ana Cláudia Mendes',
      orientacao:
        'Família orientada presencialmente sobre a documentação necessária e sobre os direitos do acompanhante durante a permanência. Nenhuma pendência social remanescente para as etapas do TFD.',
    },
  ];

  const novas: DemandaSocialMock[] = [];
  modelos.forEach((m, idx) => {
    const s = maisRecentes[idx];
    if (!s) return;
    const data = diasAtras(m.dias);
    novas.push({
      id: uid('ds'),
      solicitacaoId: s.id,
      solicitacaoNumero: s.numero,
      pacienteNome: s.paciente.nome,
      pacienteCpf: s.paciente.cpf,
      dataEncaminhamento: data,
      encaminhadoPor: m.encaminhadoPor,
      setorOrigem: m.setor,
      motivo: m.motivo,
      situacao: m.situacao,
      profissionalResponsavel: m.profissional,
      orientacaoFinal: m.orientacao,
      dataConclusao: m.situacao === 'concluida' ? diasAtras(Math.max(0, m.dias - 4)) : undefined,
      concluidaPor: m.situacao === 'concluida' ? m.profissional : undefined,
    });
  });

  if (novas.length === 0) return;
  state = { ...state, demandas: [...state.demandas, ...novas] };
  emit();
}

/* -------------------------------------------------------------------------- */
/*  Hooks reativos                                                            */
/* -------------------------------------------------------------------------- */

export function useServicoSocial(): SnapshotServicoSocial {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Demandas de uma solicitação, reativo. */
export function useDemandasDaSolicitacao(solicitacaoId: string): DemandaSocialMock[] {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return demandasDaSolicitacao(solicitacaoId);
}

/** Flag de demanda aberta, reativo. Usado na listagem de solicitações e no
 *  cabeçalho do detalhe. */
export function useFlagServicoSocial(solicitacaoId: string): {
  aberta: boolean;
  total: number;
} {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    aberta: temDemandaAberta(solicitacaoId),
    total: state.demandas.filter((d) => d.solicitacaoId === solicitacaoId).length,
  };
}

export function useCasasApoio(): CasaApoioMock[] {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return todasCasas();
}
