export type StatusAgendamento = 'AGUARDANDO' | 'AGENDADO' | 'CONFIRMADO';

export type TipoAtendimento = 'CONSULTA' | 'CIRURGIA' | 'EXAME' | 'TRATAMENTO_CONTINUO';

export type OrigemAgendamento = 'CNRAC' | 'SETI' | 'CONTATO_DIRETO' | 'EMAIL';

export interface AgendamentoItem {
  id: string;
  solicitacaoId: string;
  numeroProcesso: string;
  pacienteNome: string;
  unidadeDestino: string;
  cidadeDestino: string;
  ufDestino: string;
  tipoAtendimento: TipoAtendimento;
  origemAgendamento: OrigemAgendamento;
  dataAgendamento: string;
  status: StatusAgendamento;
  temComprovante: boolean;
  numeroCnrac?: string;
  contatoUnidade?: string;
  alertaSla: boolean;
  observacoes?: string;
}
