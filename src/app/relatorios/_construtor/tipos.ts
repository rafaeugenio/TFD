/* -------------------------------------------------------------------------- */
/*  Construtor de relatórios personalizáveis — tipos                          */
/*                                                                            */
/*  Estes tipos descrevem o relatório em linguagem de NEGÓCIO, não o banco.   */
/*  Nenhum id daqui corresponde a tabela ou coluna real do sistema: são       */
/*  chaves internas do protótipo, e o que o usuário lê são sempre os          */
/*  `label`s.                                                                 */
/* -------------------------------------------------------------------------- */

import type { LucideIcon } from 'lucide-react';

/** Valor de uma célula. Datas sempre em ISO (AAAA-MM-DD). */
export type Valor = string | number | null;

/** Uma linha do resultado, já no formato de negócio. */
export type Linha = Record<string, Valor>;

export type TipoCampo = 'texto' | 'data' | 'moeda' | 'numero' | 'categoria';

export interface Campo {
  id: string;
  label: string;
  tipo: TipoCampo;
  /** Frase curta que explica o que é a informação e de onde vem. */
  ajuda?: string;
  /** Pode ser usado como filtro. Campos de categoria viram lista de opções;
   *  campos de texto viram busca; números e valores viram faixa. */
  filtravel?: boolean;
  /** Pode ser usado para montar o resumo agrupado. */
  agrupavel?: boolean;
  /** Entra como soma no resumo agrupado e no rodapé (valores e contagens).
   *  Saldo e distância, por exemplo, não somam. */
  somavel?: boolean;
}

export interface GrupoCampos {
  id: string;
  label: string;
  /** Explica por que esse grupo aparece junto do assunto. */
  ajuda?: string;
  campos: Campo[];
}

/**
 * Referência de data. Cada assunto tem mais de uma data e cada uma produz um
 * resultado diferente, então o usuário sempre escolhe explicitamente qual
 * está usando.
 */
export interface ReferenciaData {
  id: string;
  label: string;
  ajuda: string;
  /** 'dia' testa se a data cai no período; 'intervalo' testa se o intervalo
   *  [inicio, fim] cruza o período (ex.: solicitação que atravessa dois
   *  quadrimestres aparece nos dois). */
  modo: 'dia' | 'intervalo';
  campoInicio: string;
  campoFim?: string;
}

export interface Totalizador {
  id: string;
  label: string;
  ajuda: string;
  formato: 'numero' | 'moeda';
  calcular: (linhas: Linha[]) => number;
  /** Totais que só fazem sentido quando uma coluna específica está na tabela
   *  ficam escondidos até ela ser escolhida. */
  exigeCampo?: string;
}

export type AssuntoId =
  | 'passagens'
  | 'ajudas'
  | 'solicitacoes'
  | 'pacientes'
  | 'regulacao'
  | 'agendamentos'
  | 'tramitacao'
  | 'obitos'
  | 'servico_social'
  | 'casas_apoio'
  | 'financeiro';

export interface Assunto {
  id: AssuntoId;
  label: string;
  /** Pergunta que o usuário faz a si mesmo ao escolher o assunto. */
  pergunta: string;
  /** "Cada linha da tabela é ..." — o conceito mais importante da tela. */
  cadaLinha: string;
  icone: LucideIcon;
  datas: ReferenciaData[];
  grupos: GrupoCampos[];
  colunasPadrao: string[];
  totais: Totalizador[];
  /** Aviso fixo sobre uma regra de negócio que afeta os números. */
  aviso?: string;
  /** Como contar as linhas: [singular, plural]. Padrão: registro(s). */
  contagem?: [string, string];
}

/* ── Período ─────────────────────────────────────────────────────────────── */

export type PeriodoTipo =
  | 'hoje'
  | 'ultimos_7_dias'
  | 'ultimos_30_dias'
  | 'este_mes'
  | 'mes_passado'
  | 'este_quadrimestre'
  | 'quadrimestre_passado'
  | 'este_ano'
  | 'mes'
  | 'quadrimestre'
  | 'ano'
  | 'personalizado';

export interface Periodo {
  tipo: PeriodoTipo;
  ano?: number;
  /** 1 a 12 */
  mes?: number;
  quadrimestre?: 1 | 2 | 3;
  inicio?: string;
  fim?: string;
}

/* ── Filtros ─────────────────────────────────────────────────────────────── */

export interface FiltroAplicado {
  campoId: string;
  /** Para categoria: valores escolhidos. Para texto: termo buscado.
   *  Para número/moeda: [mínimo, máximo] em texto. */
  valores: string[];
}

/* ── Configuração completa (o que é salvo) ───────────────────────────────── */

export interface ConfigRelatorio {
  assunto: AssuntoId;
  periodo: Periodo;
  referenciaData: string;
  colunas: string[];
  filtros: FiltroAplicado[];
  /** Vazio = lista completa. Senão, id do campo usado para resumir. */
  agruparPor: string;
  ordenarPor?: { campoId: string; direcao: 'asc' | 'desc' };
  /** Meta anual de procedimentos SIGTAP. VALOR INFORMADO pelo usuário, nunca
   *  calculado. Usado só nos indicadores financeiros. */
  metaAnualSigtap?: number;
}

/**
 * Um relatório pode juntar vários assuntos (ex.: passagens e ajudas de custo).
 * Cada assunto é uma SEÇÃO com a própria tabela, porque "cada linha é..."
 * muda de um assunto para outro e misturar as linhas quebraria os totais.
 * O período é o mesmo em todas as seções.
 */
export interface RelatorioSalvo {
  id: string;
  nome: string;
  secoes: ConfigRelatorio[];
  criadoEm: string;
  atualizadoEm: string;
  /** Id do usuário que criou. Relatórios são privados. Salvos antes dessa
   *  regra não têm dono e continuam visíveis para não perder dados. */
  donoId?: string;
}
