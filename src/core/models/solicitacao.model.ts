import { Paciente, Acompanhante } from './paciente.model';
import { Viagem } from './viagem.model';
import { AjudaDeCusto, Permanencia } from './ajuda-custo.model';
import { Parecer, Regulacao, Agendamento } from './regulacao.model';

export type StatusSolicitacao =
  | 'PENDENTE_DIAGNOSTICO'
  | 'NOVO'
  | 'EM_ANALISE'
  | 'EXIGENCIA'
  | 'AGUARDANDO_REGULACAO'
  | 'AGUARDANDO_CNRAC'
  | 'AGUARDANDO_SETI'
  | 'AGUARDANDO_RESPOSTA_EXTERNA'
  | 'ENCAMINHADO_SERVICO_SOCIAL'
  | 'AGUARDANDO_AGENDAMENTO'
  | 'AGUARDANDO_EMISSAO'
  | 'EMITIDA'
  | 'EM_VIAGEM'
  | 'EM_PERMANENCIA'
  | 'REMARCACAO'
  | 'EM_PAGAMENTO'
  | 'CONCLUIDO'
  | 'INDEFERIDO'
  | 'CANCELADO';

// B2 — Tipo de Solicitação
export type TipoSolicitacao =
  | 'PRIMEIRO_ATENDIMENTO'
  | 'CONTINUIDADE'
  | 'SOMENTE_AJUDA_CUSTO';

export interface SolicitacaoTFD {
  id: string;
  numero: string; // e.g., "TFD-2026-001234"
  numeroProtocolo: string; // e.g., "TFD-PAC-0567" — único por paciente, agrupa todos os ciclos
  numeroCiclo: number; // B1 — sequencial por paciente (1, 2, 3...)
  tipoSolicitacao: TipoSolicitacao; // B2
  status: StatusSolicitacao;
  paciente: Paciente;
  acompanhante?: Acompanhante; // legado — compatibilidade com acompanhante principal
  acompanhantesElegiveis: AcompanhanteElegivel[]; // B6 — múltiplos acompanhantes elegíveis
  diagnostico?: Diagnostico;
  diagnosticoPreenchidoPor?: string;
  diagnosticoPreenchidoEm?: string;
  documentos: Documento[];
  parecer?: Parecer;
  regulacao?: Regulacao;
  agendamento?: Agendamento;
  viagens: Viagem[];
  procedimentos: Procedimento[]; // B26
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
  origemLaudo?: 'ESTADUAL' | 'MUNICIPAL';
  dataLaudo?: string;
  dataValidadeLaudo?: string; // calculada: dataLaudo + 12 meses
  medicoSolicitanteNome?: string;
  medicoSolicitanteCRM?: string;
  medicoSolicitanteUF?: string;
  codigoProcedimentoSUS?: string;
  caracterAtendimento?: 'HOSPITALAR' | 'AMBULATORIAL';
}

// B6 — Acompanhante elegível por solicitação (variável por viagem)
export interface AcompanhanteElegivel {
  id: string;
  solicitacaoId: string;
  nome: string;
  cpf: string;
  dataNascimento: string;
  parentesco: 'CONJUGE' | 'FILHO' | 'PAI_MAE' | 'RESPONSAVEL_LEGAL' | 'OUTRO';
  telefone: string;
  justificativa?: string;
  principal: boolean;
  ativo: boolean;
}

// B26 — Procedimento realizado em um ciclo
export type TipoProcedimento =
  | 'CONSULTA'
  | 'INTERNACAO'
  | 'EXAME'
  | 'CIRURGIA'
  | 'TRATAMENTO_CONTINUO';

export interface Procedimento {
  id: string;
  solicitacaoId: string;
  tipo: TipoProcedimento;
  descricao: string;
  codigoProcedimentoSUS?: string;
  dataProcedimento: string;
  dataBaseAjudaCusto?: string;
  unidadeDestino?: string;
  medicoResponsavel?: string;
  observacoes?: string;
}

export interface Documento {
  id: string;
  tipo: TipoDocumento;
  etapa?: EtapaDocumento;
  nome: string;
  url: string;
  dataUpload: string;
}

export type EtapaDocumento =
  | 'CADASTRO_PACIENTE'
  | 'DIAGNOSTICO_CLINICO'
  | 'PARECER_MEDICO'
  | 'REGULACAO'
  | 'AGENDAMENTO'
  | 'VIAGENS'
  | 'AJUDA_CUSTO'
  | 'PERMANENCIA'
  | 'ENCERRAMENTO'
  | 'GERAL';

export type TipoDocumento =
  | 'RG'
  | 'CPF'
  | 'CNS'
  | 'COMPROVANTE_RESIDENCIA'
  | 'DECLARACAO_RESIDENCIA'
  | 'DOCUMENTO_ACOMPANHANTE'
  | 'TERMO_COMPROMISSO'
  | 'DECLARACAO_RENDIMENTOS'
  | 'LAUDO_MEDICO'
  | 'EXAME_COMPLEMENTAR'
  | 'RELATORIO_TRATAMENTO_ANTERIOR'
  | 'DOCUMENTO_ENCAMINHAMENTO'
  | 'RELATORIO_MEDICO_ACOMPANHAMENTO'
  | 'PARECER_ASSINADO'
  | 'DOCUMENTO_REGULACAO'
  | 'RESPOSTA_CNRAC'
  | 'RESPOSTA_SETI'
  | 'COMPROVANTE_AGENDAMENTO'
  | 'COMPROVANTE_AGENDAMENTO_APP'
  | 'PASSAGEM_EMITIDA'
  | 'COTACAO_PASSAGEM'
  | 'COMPROVANTE_EMBARQUE'
  | 'MEDIF'
  | 'DADOS_BANCARIOS'
  | 'AUTORIZACAO_CONTA_TERCEIROS'
  | 'COMPROVANTE_PAGAMENTO'
  | 'COMUNICADO_PERMANENCIA'
  | 'RELATORIO_PERMANENCIA'
  | 'RELATORIO_ALTA'
  | 'CERTIDAO_OBITO'
  | 'OUTROS';
