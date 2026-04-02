import { Documento } from './solicitacao.model';

// Corrigido: alinhado com DB CHECK constraint
export type StatusAjudaCusto =
  | 'EM_ANALISE'
  | 'APROVADA'
  | 'EM_PAGAMENTO'
  | 'CONCLUIDA'
  | 'GLOSADA';

// B17 (Onda 1) — preservado aqui para completude
export type TipoAjudaCusto = 'COM_PERNOITE' | 'SEM_PERNOITE';

export interface AjudaDeCusto {
  id: string;
  solicitacaoId: string;
  tipo: 'PACIENTE' | 'ACOMPANHANTE';
  tipoAjudaCusto: TipoAjudaCusto;
  status: StatusAjudaCusto;
  dataInicio: string;
  dataFim?: string;
  diasInternacao: number;
  diasElegiveis: number; // calculado: (dataFim - dataInicio) - diasInternacao
  valorDiaria: number; // valor da portaria vigente
  valorTotal: number; // calculado: diasElegiveis × valorDiaria
  sacador?: Sacador; // B18
  comprovantes: Documento[];
  observacoes?: string;
}

// B18 — Pessoa que recebe pagamento em nome do paciente
export type VinculoSacador =
  | 'CONJUGE'
  | 'FILHO'
  | 'PAI_MAE'
  | 'RESPONSAVEL_LEGAL'
  | 'PROCURADOR'
  | 'OUTRO';

export interface Sacador {
  id: string;
  ajudaCustoId: string;
  nome: string;
  cpf: string;
  rg?: string;
  vinculo: VinculoSacador;
  vinculoDescricao?: string; // obrigatório quando vinculo = OUTRO
  telefone?: string;
  documentoAutorizacao?: string; // URL do documento de autorização
}

// B19 — Movimentação financeira entre ciclos (estorno/crédito)
export type TipoMovimentacao = 'CREDITO' | 'DEBITO' | 'ESTORNO';
export type StatusMovimentacao = 'PENDENTE' | 'APLICADO' | 'CANCELADO';

export interface MovimentacaoFinanceira {
  id: string;
  solicitacaoOrigemId: string;
  solicitacaoDestinoId?: string;
  tipo: TipoMovimentacao;
  valor: number;
  motivo: string;
  status: StatusMovimentacao;
  referenciaAjudaCustoId?: string;
  criadoPor: string;
  dataCriacao: string;
  aplicadoPor?: string;
  aplicadoEm?: string;
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
