import { Documento } from './solicitacao.model';

export type StatusAjudaCusto = 'PENDENTE' | 'APROVADO' | 'PAGO' | 'CANCELADO';

export interface AjudaDeCusto {
  id: string;
  solicitacaoId: string;
  status: StatusAjudaCusto;
  dataInicio: string;
  dataFim: string;
  diasCompletos: number;
  diaRetorno: boolean; // ultimo dia = valor reduzido
  valorDiariaCompleta: number; // R$ 24,75
  valorDiariaRetorno: number; // R$ 8,40
  valorTotal: number;
  comprovantes: Documento[];
  observacoes?: string;
}

export interface Permanencia {
  id: string;
  solicitacaoId: string;
  dataInicio: string;
  dataFimPrevista: string;
  dataFimReal?: string;
  prorrogacoes: Prorrogacao[];
  motivoAlta?: MotivoAlta;
  observacoes?: string;
}

export type MotivoAlta =
  | 'ALTA_MEDICA'
  | 'OBITO'
  | 'DESISTENCIA'
  | 'ABANDONO'
  | 'TRANSFERENCIA';

export interface Prorrogacao {
  id: string;
  dataInicio: string;
  dataFim: string;
  justificativa: string;
  aprovadoPor?: string;
  dataAprovacao?: string;
}
