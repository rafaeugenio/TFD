export type SituacaoViagem =
  | 'AGUARDANDO_EMISSAO'
  | 'EMITIDA'
  | 'REMARCADA'
  | 'CANCELADA'
  | 'NO_SHOW'
  | 'UTILIZADA';

// B14 — Status financeiro do bilhete junto à companhia
export type SituacaoBilhete =
  | 'RESERVADO'
  | 'EMITIDO'
  | 'REEMBOLSADO'
  | 'CREDITO_COMPANHIA';

// B16 — Diferencia data de retorno prevista vs confirmada
export type SituacaoRetorno = 'PREVISTA' | 'CONFIRMADA';

// Corrigido: TipoViagem alinhado com DB (RETORNO em vez de VOLTA, + IDA_E_VOLTA)
export type TipoViagem = 'IDA' | 'RETORNO' | 'IDA_E_VOLTA';

export type ModalTransporte = 'AEREO' | 'TERRESTRE' | 'FLUVIAL';

export interface Viagem {
  id: string;
  solicitacaoId: string;
  tipo: TipoViagem;
  modal: ModalTransporte;
  situacao: SituacaoViagem;
  origem: string;
  origemUF: string;
  destino: string;
  destinoUF: string;
  comPernoite: boolean;
  dataEmbarquePrevista: string;
  dataEmbarqueReal?: string;
  companhiaTransporte?: string;
  numeroBilhete?: string;
  localizador?: string;
  valorPassagem?: number;
  taxas?: number;
  medifNecessario: boolean;
  medifDescricao?: string;
  dataSolicitacaoBilhete?: string;
  emissorId?: string;
  emitidoEm?: string;
  acompanhanteElegivelId?: string; // B6 — acompanhante selecionado para esta viagem
  situacaoBilhete?: SituacaoBilhete; // B14
  numeroRelatorio?: string; // B14 — relatório de faturamento
  dataFaturamento?: string; // B14
  viagemSeparada: boolean; // B16 — paciente e acompanhante em voos separados
  situacaoRetorno?: SituacaoRetorno; // B16 — apenas para tipo RETORNO
  complementos: ComplementoViagem[]; // B13
  observacoes?: string;
}

// B13 — Trecho terrestre complementar (aeroporto → hospital, etc.)
export interface ComplementoViagem {
  id: string;
  viagemId: string;
  trechoDescricao: string;
  origem: string;
  destino: string;
  modal: 'TERRESTRE' | 'FLUVIAL';
  valor?: number;
  dataPrevisao?: string;
  observacoes?: string;
}
