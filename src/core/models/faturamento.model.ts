/* ============================================================
   Faturamento — Models (E1)
   ============================================================ */

export type StatusFatura =
  | 'RASCUNHO'
  | 'EM_ANALISE'
  | 'APROVADA'
  | 'EXPORTADA'
  | 'CANCELADA';

export type TipoItemFatura = 'PASSAGEM' | 'DIARIA';

export type TipoAjusteFatura = 'REEMBOLSO' | 'CREDITO';

export type StatusAjusteFatura = 'PENDENTE' | 'APROVADO' | 'REJEITADO';

export interface Fatura {
  id: string;
  numero: string;
  periodo: string; // AAAA-MM
  municipioId: string;
  municipio: string;
  status: StatusFatura;
  totalPassagens: number;
  totalDiarias: number;
  totalReembolsos: number;
  totalCreditos: number;
  totalGeral: number;
  criadoPor: string;
  criadoEm: string;
  aprovadoPor?: string;
  aprovadoEm?: string;
  exportadoEm?: string;
  canceladoJustificativa?: string;
}

export interface ItemFatura {
  id: string;
  faturaId: string;
  tipo: TipoItemFatura;
  referencia: string; // Nº Processo
  paciente: string;
  descricao: string;
  codigoSigtap: string;
  valor: number;
  dataReferencia: string;
}

export interface AjusteFatura {
  id: string;
  faturaId: string;
  tipo: TipoAjusteFatura;
  descricao: string;
  valor: number;
  justificativa: string;
  status: StatusAjusteFatura;
  processoVinculado?: string;
}

export interface HistoricoFatura {
  id: string;
  faturaId: string;
  acao: string;
  usuario: string;
  dataHora: string;
  descricao: string;
}
