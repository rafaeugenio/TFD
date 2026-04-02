/* ============================================================
   Teto Financeiro — Models (E8)
   ============================================================ */

export type StatusTeto = 'NORMAL' | 'ALERTA' | 'CRITICO' | 'ESTOURADO';

export interface TetoFinanceiro {
  id: string;
  exercicio: number;
  municipioId: string;
  municipio: string;
  regional: string;
  tetoAlocado: number;
  gastoAcumulado: number;
  saldo: number;
  percentualUtilizacao: number;
  status: StatusTeto;
  quantidadeFaturas: number;
}

export interface ResumoTetoEstadual {
  tetoTotal: number;
  gastoAcumulado: number;
  saldoDisponivel: number;
  percentualUtilizacao: number;
}

export interface AlertaTeto {
  id: string;
  municipio: string;
  nivel: 'ALERTA' | 'CRITICO' | 'ESTOURADO';
  percentualUtilizacao: number;
  gasto: number;
  teto: number;
  dataAlerta: string;
  acaoTomada?: string;
}
