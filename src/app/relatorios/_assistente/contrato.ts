/**
 * Contrato do Assistente de Relatórios entre a tela e o endpoint
 * `POST /api/relatorios/assistente`. Só tipos e textos públicos: nada de
 * chave, consulta ou regra de servidor aqui, porque este arquivo vai para o
 * navegador.
 */

export interface PerguntaAssistente {
  pergunta: string;
}

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
    unidade: 'BRL' | 'quantidade';
    /** Parcelas que somam o valor principal (ex.: passagens + adicionais). */
    composicao?: ItemValor[];
  };
  grupos?: { titulo: string; unidade: 'BRL' | 'quantidade'; itens: ItemValor[]; omitidos: number };
  resumo?: string;
  /** Como o número foi calculado, para o usuário saber o que está lendo. */
  premissa?: string;
  /** O que ficou de fora do cálculo por limitação do banco do ambiente. */
  avisos?: string[];
  confianca?: number;
  fonte?: string;
  geradoEm?: string;
}

export const LIMITE_PERGUNTA = 300;

export const SUGESTOES_INICIAIS = [
  'Quanto foi gasto em passagens nos últimos 3 meses?',
  'Quanto foi pago em diárias neste ano?',
  'Qual modal de transporte gerou mais despesas este ano?',
  'Quantas solicitações foram abertas neste mês, por situação?',
  'Qual foi o custo total do TFD no último trimestre?',
  'Quais destinos tiveram maior gasto com passagens este ano?',
];
