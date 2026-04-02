/**
 * Recibo de Pagamento — Model
 * E2: Recibo imprimível com valores de ajuda de custo (paciente + acompanhante),
 * memória de cálculo, dados do sacador e assinaturas.
 */

export type StatusRecibo =
  | 'NAO_GERADO'
  | 'GERADO'
  | 'IMPRESSO'
  | 'ENVIADO';

export interface ReciboPagamento {
  id: string;
  numeroRecibo: string; // REC-AAAA-NNNNN
  solicitacaoId: string;
  numeroProcesso: string;
  versao: number;
  status: StatusRecibo;

  /* Dados do paciente */
  pacienteNome: string;
  pacienteCNS: string;
  pacienteDataNascimento: string;
  pacienteEndereco: string;
  localTratamento: string;
  procedimento: string;

  /* Valores — Paciente */
  itensPaciente: ReciboItem[];
  subtotalPaciente: number;

  /* Valores — Acompanhante */
  itensAcompanhante: ReciboItem[];
  subtotalAcompanhante: number;

  /* Totais */
  valorLiquido: number;

  /* Memória de cálculo */
  memoriaCalculo: MemoriaCalculo[];

  /* Sacador */
  sacadorEPaciente: boolean;
  sacadorNome?: string;
  sacadorCPF?: string;
  sacadorVinculo?: string;

  /* Dados bancários */
  banco?: string;
  agencia?: string;
  conta?: string;
  tipoConta?: string;
  titularConta?: string;
  cpfTitular?: string;

  /* Responsável pelo pagamento */
  responsavelNome: string;
  responsavelCargo: string;

  dataGeracao: string;
  geradoPor?: string;
}

export interface ReciboItem {
  beneficiario: string; // 'Paciente' ou 'Acompanhante'
  periodo: string;
  dias: number;
  valorUnitario: number;
  total: number;
  descricao?: string; // ex.: "(-) Internação"
}

export interface MemoriaCalculo {
  tipo: 'PACIENTE' | 'ACOMPANHANTE';
  periodoTotal: string;
  diasTotais: number;
  diasInternacao: number;
  diasElegiveis: number;
  formula: string; // ex.: "(11 - 1) x R$ 24,75 + R$ 8,40 = R$ 256,90"
  resultado: number;
}
