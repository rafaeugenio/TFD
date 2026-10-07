/**
 * Contrato do Assistente de Relatórios entre a tela e o endpoint
 * `POST /api/relatorios/assistente`. Só tipos e textos públicos: nada de
 * chave, consulta ou regra de servidor aqui, porque este arquivo vai para o
 * navegador.
 */

export interface PerguntaAssistente {
  pergunta: string;
  /** Últimas perguntas da conversa, para resolver "e no mês passado?". Só texto, sem resultados. */
  historico?: { pergunta: string; interpretacao?: string }[];
}

export type Unidade = 'BRL' | 'quantidade' | 'dias';

export type StatusResposta =
  | 'ok'            // resultado calculado
  | 'esclarecimento' // pergunta entendida em parte; falta período ou o relatório ficou ambíguo
  | 'nao_suportado'  // fora do catálogo de relatórios
  | 'bloqueado'      // pede dado pessoal ou individualizado
  | 'sem_resultado'  // período sem registros
  | 'configuracao'   // chaves das APIs ausentes no servidor
  | 'erro';          // falha de serviço, limite ou validação

export interface ItemValor {
  rotulo: string;
  valor: number;
  /** Quantidade de registros que compõem o valor, quando faz sentido. */
  quantidade?: number;
}

export interface RespostaAssistente {
  status: StatusResposta;
  /** Texto curto para a tela quando não há resultado (esclarecimento, bloqueio, erro). */
  mensagem?: string;
  /** Perguntas prontas para o usuário tentar (esclarecimento e não suportado). */
  sugestoes?: string[];

  relatorio?: string;
  perguntaInterpretada?: string;
  periodo?: { inicio: string; fim: string; descricao: string; campoData: string };
  filtros?: { rotulo: string; valor: string }[];
  resultado?: {
    rotulo: string;
    valor: number;
    unidade: Unidade;
    /** Legenda curta abaixo do número (ex.: "em 16 passagens"). */
    legenda?: string;
    /** Parcelas que somam o valor principal (ex.: passagens + adicionais). */
    composicao?: ItemValor[];
  };
  grupos?: { titulo: string; unidade: Unidade; itens: ItemValor[]; omitidos: number };
  resumo?: string;
  /** Como o número foi calculado, para o usuário saber o que está lendo. */
  premissa?: string;
  /** O que ficou de fora do cálculo por limitação do banco do ambiente. */
  avisos?: string[];
  /** Como a resposta foi montada: Gemini interpretou, JEV escolheu, banco calculou. */
  etapas?: { rotulo: string; valor: string }[];
  confianca?: number;
  fonte?: string;
  geradoEm?: string;
}

export const LIMITE_PERGUNTA = 300;

export const SUGESTOES_INICIAIS = [
  'Quanto foi gasto em passagens nos últimos 3 meses?',
  'Quantas solicitações estão em andamento agora, por setor?',
  'Qual especialidade teve mais solicitações este ano?',
  'Quantos pareceres foram deferidos e indeferidos este ano?',
  'Quais cidades mais receberam agendamentos este ano?',
  'Qual o tempo médio até concluir uma solicitação este ano?',
  'Qual foi o custo total do TFD no último trimestre?',
];
