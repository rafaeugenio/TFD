export type TipoRota =
  | 'CNRAC'
  | 'SETI'
  | 'SAAS_DUTRA'
  | 'SERVICO_SOCIAL'
  | 'APROVADO_DIRETO';

export type StatusParecer = 'DEFERIDO' | 'INDEFERIDO' | 'EXIGENCIA';

export interface Parecer {
  id: string;
  solicitacaoId: string;
  medicoId: string;
  medicoNome: string;
  status: StatusParecer;
  observacoes: string;
  dataParecer: string;
}

export interface Regulacao {
  id: string;
  solicitacaoId: string;
  tipoRota: TipoRota;
  responsavel?: string;
  dataEncaminhamento: string;
  dataResposta?: string;
  observacoes?: string;
  cobrancasExternas: CobrancaExterna[];
}

export interface CobrancaExterna {
  id: string;
  destinatario: string;
  dataEnvio: string;
  dataResposta?: string;
  respondido: boolean;
  observacoes?: string;
}

export interface Agendamento {
  id: string;
  solicitacaoId: string;
  unidadeDestino: string;
  medicoDestino?: string;
  dataAgendamento: string;
  horaAgendamento?: string;
  confirmado: boolean;
  comprovanteUrl?: string;
  observacoes?: string;
}
