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
  PROFISSIONAIS_SERVICO_SOCIAL_DEMO,
  demandaEstaAberta,
  type AnexoInstrumentoMock,
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

/** Demandas ainda abertas de uma solicitação, da mais recente para a mais
 *  antiga. Alimenta o alerta exibido ao lado do número nas filas. */
export function demandasAbertasDaSolicitacao(solicitacaoId: string): DemandaSocialMock[] {
  return state.demandas
    .filter((d) => d.solicitacaoId === solicitacaoId && demandaEstaAberta(d))
    .sort((a, b) => b.dataEncaminhamento.localeCompare(a.dataEncaminhamento));
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
  /** Ausente quando o instrumento é avulso, produzido sem demanda. */
  demandaId?: string;
  solicitacaoId: string;
  tipo: TipoInstrumento;
  conteudo: string;
  sigiloso: boolean;
  autora: string;
  autoraId?: string;
  casaApoioId?: string;
  solicitacaoNumero?: string;
  pacienteNome?: string;
  pacienteCpf?: string;
  titulo?: string;
  anexoAssinado?: AnexoInstrumentoMock;
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
    solicitacaoNumero: input.solicitacaoNumero,
    pacienteNome: input.pacienteNome,
    pacienteCpf: input.pacienteCpf,
    titulo: input.titulo?.trim() || undefined,
    anexoAssinado: input.anexoAssinado,
    dataCriacao: nowIso(),
  };
  state = { ...state, instrumentos: [...state.instrumentos, novo] };
  emit();
  return novo;
}

/** Anexa (ou troca) a cópia assinada de um instrumento. */
export function anexarAssinado(instrumentoId: string, anexo: AnexoInstrumentoMock): void {
  const antigo = state.instrumentos.find((i) => i.id === instrumentoId)?.anexoAssinado;
  if (antigo && antigo.url !== anexo.url) URL.revokeObjectURL(antigo.url);
  state = { ...state, instrumentos: state.instrumentos.map((i) => (i.id === instrumentoId ? { ...i, anexoAssinado: anexo } : i)) };
  emit();
}

export function removerAssinado(instrumentoId: string): void {
  const antigo = state.instrumentos.find((i) => i.id === instrumentoId)?.anexoAssinado;
  if (antigo) URL.revokeObjectURL(antigo.url);
  state = { ...state, instrumentos: state.instrumentos.map((i) => (i.id === instrumentoId ? { ...i, anexoAssinado: undefined } : i)) };
  emit();
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

/** Vínculos da casa no sistema: unidade de saúde e instrumentos sociais
 *  que a citam. Usado para avisar antes da exclusão (que não é bloqueada). */
export function vinculosDaCasa(id: string): { unidade?: string; instrumentos: number } {
  const casa = state.casas.find((c) => c.id === id);
  return {
    unidade: casa?.unidadeVinculadaNome,
    instrumentos: state.instrumentos.filter((i) => i.casaApoioId === id).length,
  };
}

/** Exclui a casa. Instrumentos já emitidos continuam existindo; o nome da
 *  casa fica registrado no próprio conteúdo do documento. */
export function excluirCasaApoio(id: string): void {
  state = { ...state, casas: state.casas.filter((c) => c.id !== id) };
  emit();
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

  // Massa de teste dos últimos 3 meses (scripts/seed-demo): demandas fixas por cenário.
  if (semearDemoUltimos3Meses(solicitacoes)) return;

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

/** Alerta de demanda em aberto ao lado do número da solicitação, reativo. */
export function useDemandasAbertasDaSolicitacao(solicitacaoId: string): DemandaSocialMock[] {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return demandasAbertasDaSolicitacao(solicitacaoId);
}

/** Demandas, instrumentos e casas para o construtor de relatórios, reativo. */
export function useBaseServicoSocial(): SnapshotServicoSocial {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useCasasApoio(): CasaApoioMock[] {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return todasCasas();
}

/* ------------------------------------------------------------------ */
/*  Massa de teste dos últimos 3 meses                                  */
/* ------------------------------------------------------------------ */

/** Solicitações da massa de teste: ids `d3a00004-...`, processos TFD-*-2026/9001xx. */
const PREFIXO_DEMO = 'd3a00004-';
const NUMERO_BASE_DEMO = 900100;

/**
 * Demandas e instrumentos fixos para a massa de teste, de acordo com o cenário
 * de cada solicitação (o cenário é a posição do número no gerador: 5 por
 * cenário, na ordem de `CENARIOS` em scripts/seed-demo/seed-ultimos-3-meses.mts).
 * Devolve false quando a massa não está no banco.
 */
function semearDemoUltimos3Meses(solicitacoes: SolicitacaoParaSeed[]): boolean {
  const demo = solicitacoes.filter((s) => s.id.startsWith(PREFIXO_DEMO));
  if (demo.length === 0) return false;

  const [ana, rosangela] = PROFISSIONAIS_SERVICO_SOCIAL_DEMO;
  const casas = ['casa-1', 'casa-2', 'casa-3', 'casa-5', 'casa-6', 'casa-7', 'casa-8', 'casa-9'];
  const depois = (iso: string, dias: number) => {
    const d = new Date(iso);
    d.setDate(d.getDate() + dias);
    const agora = new Date();
    return (d > agora ? agora : d).toISOString();
  };

  const demandas: DemandaSocialMock[] = [];
  const instrumentos: InstrumentoSocialMock[] = [];
  const nova = (
    s: SolicitacaoParaSeed, n: number,
    d: Pick<DemandaSocialMock, 'setorOrigem' | 'motivo' | 'situacao' | 'encaminhadoPor'> & Partial<DemandaSocialMock>, dias: number,
  ) => {
    const demanda: DemandaSocialMock = {
      id: `ds-demo-${n}`,
      solicitacaoId: s.id,
      solicitacaoNumero: s.numero,
      pacienteNome: s.paciente.nome,
      pacienteCpf: s.paciente.cpf,
      dataEncaminhamento: depois(s.dataCriacao, dias),
      ...d,
    };
    demandas.push(demanda);
    return demanda;
  };
  const instrumento = (s: SolicitacaoParaSeed, demanda: DemandaSocialMock | undefined, tipo: InstrumentoSocialMock['tipo'], conteudo: string, autora: string, n: number, casaApoioId?: string) => {
    instrumentos.push({
      id: `is-demo-${n}`, demandaId: demanda?.id, solicitacaoId: s.id, tipo, conteudo, sigiloso: tipo === 'parecer_social' && n % 2 === 0,
      autora, dataCriacao: demanda?.dataConclusao ?? depois(s.dataCriacao, 12), casaApoioId,
      solicitacaoNumero: s.numero, pacienteNome: s.paciente.nome, pacienteCpf: s.paciente.cpf,
    });
  };

  for (const s of demo) {
    const n = Number(s.numero.split('/').pop()) - NUMERO_BASE_DEMO;
    if (!Number.isFinite(n) || n < 0) continue;
    const cenario = Math.floor(n / 5);
    const pos = n % 5;
    const casa = casas[n % casas.length];

    if (cenario === 5) {
      // Encaminhadas ao Serviço Social pela regulação, em todas as situações.
      const situacao = (['pendente', 'pendente', 'em_atendimento', 'em_atendimento', 'concluida'] as const)[pos];
      const prof = pos % 2 === 0 ? ana.nome : rosangela.nome;
      const d = nova(s, n, {
        setorOrigem: 'regulacao', encaminhadoPor: 'Dr. Carlos Aguiar', situacao,
        motivo: 'Paciente sem rede de apoio no destino. Regulação pede avaliação social antes de definir acompanhante e hospedagem.',
        profissionalResponsavel: situacao === 'pendente' ? undefined : prof,
        dataConclusao: situacao === 'concluida' ? depois(s.dataCriacao, 14) : undefined,
        concluidaPor: situacao === 'concluida' ? prof : undefined,
        orientacaoFinal: situacao === 'concluida' ? 'Avaliação concluída: indicado acompanhante e encaminhamento para casa de apoio no destino.' : undefined,
      }, 6);
      if (situacao === 'concluida') {
        instrumento(s, d, 'parecer_social', 'Parecer social favorável ao acompanhante, considerando vulnerabilidade socioeconômica da família.', prof, n);
        instrumento(s, d, 'encaminhamento_casa_apoio', 'Encaminhamos o paciente e acompanhante para hospedagem durante o tratamento.', prof, n + 1000, casa);
      }
    } else if (cenario === 6 && pos < 2) {
      nova(s, n, {
        setorOrigem: 'passagens', encaminhadoPor: 'Luiz Cutrim', situacao: 'pendente',
        motivo: 'Paciente informou que não tem onde ficar no destino. Avaliar casa de apoio antes da emissão das passagens.',
      }, 10);
    } else if (cenario === 11) {
      // Em permanência: casa de apoio em atendimento ou já resolvida.
      const concluida = pos >= 3;
      const prof = pos % 2 === 0 ? rosangela.nome : ana.nome;
      const d = nova(s, n, {
        setorOrigem: 'acompanhamento', encaminhadoPor: 'Manuela Freitas', situacao: concluida ? 'concluida' : 'em_atendimento',
        motivo: 'Permanência prolongada no destino. Família pede apoio para hospedagem e alimentação.',
        profissionalResponsavel: prof,
        dataConclusao: concluida ? depois(s.dataCriacao, 30) : undefined,
        concluidaPor: concluida ? prof : undefined,
        orientacaoFinal: concluida ? 'Paciente e acompanhante acolhidos em casa de apoio até a alta.' : undefined,
      }, 20);
      instrumento(s, d, 'encaminhamento_casa_apoio', 'Encaminhamento para hospedagem durante a permanência.', prof, n, casa);
    } else if (cenario === 15 || cenario === 16) {
      // Concluídas: Serviço Social realizado ao longo do processo.
      const prof = pos % 2 === 0 ? ana.nome : rosangela.nome;
      const d = nova(s, n, {
        setorOrigem: pos % 2 === 0 ? 'ajuda_custo' : 'passagens', encaminhadoPor: 'Thiago Mendes', situacao: 'concluida',
        motivo: 'Avaliação socioeconômica para definição de ajuda de custo e hospedagem.',
        profissionalResponsavel: prof,
        dataConclusao: depois(s.dataCriacao, 18),
        concluidaPor: prof,
        orientacaoFinal: 'Família orientada sobre direitos e documentação; ajuda de custo e hospedagem garantidas.',
      }, 8);
      instrumento(s, d, pos % 2 === 0 ? 'declaracao_tfd_ma' : 'encaminhamento_casa_apoio', 'Documento emitido pelo Serviço Social para o processo de TFD.', prof, n, pos % 2 === 0 ? undefined : casa);
    } else if (cenario === 18 && pos === 0) {
      nova(s, n, {
        setorOrigem: 'dados_basicos', encaminhadoPor: 'Luiz Cutrim', situacao: 'cancelada',
        motivo: 'Avaliar condições para viagem do paciente.',
        motivoCancelamento: 'Solicitação cancelada por desistência do paciente.',
      }, 2);
    }
  }

  if (demandas.length === 0) return false;
  state = { ...state, demandas: [...state.demandas, ...demandas], instrumentos: [...state.instrumentos, ...instrumentos] };
  emit();
  return true;
}
