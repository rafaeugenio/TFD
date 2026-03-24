export type SituacaoViagem =
  | 'AGUARDANDO_EMISSAO'
  | 'EMITIDA'
  | 'REMARCADA'
  | 'CANCELADA'
  | 'NO_SHOW'
  | 'UTILIZADA';

export type TipoViagem = 'IDA' | 'VOLTA';

export interface Viagem {
  id: string;
  solicitacaoId: string;
  tipo: TipoViagem;
  situacao: SituacaoViagem;
  origem: string;
  destino: string;
  dataEmbarquePrevista: string;
  dataEmbarqueReal?: string;
  companhiaTransporte?: string;
  localizador?: string;
  valorPassagem?: number;
  observacoes?: string;
}
