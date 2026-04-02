/**
 * Relatório de Atendimento — Model
 * C2: Relatório preenchido pelo médico do hospital de destino,
 * registrado no sistema pela Coordenação ou Setor de Permanência.
 */

export type StatusRelatorioAtendimento =
  | 'RASCUNHO'
  | 'CONCLUIDO';

export interface RelatorioAtendimento {
  id: string;
  solicitacaoId: string;
  sequencial: number; // auto-incremento por solicitação: 1, 2, 3...

  /* Dados do paciente (auto-preenchidos) */
  pacienteNome: string;
  pacienteCNS?: string;

  /* Campos do formulário legado */
  hospitalAtendimento: string;
  diagnostico: string;

  /* Período de atendimento (obrigatório) */
  periodoAtendimentoInicio: string;
  periodoAtendimentoFim: string;

  /* Período de internação (opcional) */
  periodoInternacaoInicio?: string;
  periodoInternacaoFim?: string;

  estadoDoencaAtual: string;
  definicaoTratamento: string;

  necessidadeRetorno: boolean | null; // null = não preenchido
  procedimentosRetorno?: string; // obrigatório se retorno = true
  retornoPrevistoPara?: string; // obrigatório se retorno = true

  necessidadeAcompanhante: string;
  tempoEstimadoForaDomicilio: string;

  /* Médico responsável */
  medicoNome: string;
  medicoCRM: string;

  /* Metadados */
  status: StatusRelatorioAtendimento;
  dataRegistro: string;
  criadoPor?: string;
}
