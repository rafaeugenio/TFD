import { Paciente, Acompanhante } from './paciente.model';
import { Viagem } from './viagem.model';
import { AjudaDeCusto, Permanencia } from './ajuda-custo.model';
import { Parecer, Regulacao, Agendamento } from './regulacao.model';

export type StatusSolicitacao =
  | 'NOVO'
  | 'EM_ANALISE'
  | 'EXIGENCIA'
  | 'AGUARDANDO_REGULACAO'
  | 'AGUARDANDO_AGENDAMENTO'
  | 'AGUARDANDO_EMISSAO'
  | 'EMITIDA'
  | 'EM_VIAGEM'
  | 'EM_PERMANENCIA'
  | 'CONCLUIDO'
  | 'INDEFERIDO'
  | 'CANCELADO';

export interface SolicitacaoTFD {
  id: string;
  numero: string; // e.g., "TFD-2026-001234"
  status: StatusSolicitacao;
  paciente: Paciente;
  acompanhante?: Acompanhante;
  diagnostico: Diagnostico;
  documentos: Documento[];
  parecer?: Parecer;
  regulacao?: Regulacao;
  agendamento?: Agendamento;
  viagens: Viagem[];
  ajudaDeCusto?: AjudaDeCusto;
  permanencia?: Permanencia;
  dataCriacao: string;
  dataAtualizacao: string;
  criadoPor: string;
  observacoes?: string;
}

export interface Diagnostico {
  cid: string;
  descricao: string;
  especialidade: string;
  justificativa: string;
  procedimentoSolicitado: string;
}

export interface Documento {
  id: string;
  tipo: TipoDocumento;
  nome: string;
  url: string;
  dataUpload: string;
}

export type TipoDocumento =
  | 'LAUDO_MEDICO'
  | 'EXAME'
  | 'DOCUMENTO_PESSOAL'
  | 'COMPROVANTE_RESIDENCIA'
  | 'CARTAO_SUS'
  | 'ENCAMINHAMENTO'
  | 'OUTROS';
