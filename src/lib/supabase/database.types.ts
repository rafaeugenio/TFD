// =============================================================================
// Database Types — TFD Supabase Integration
// Generated from Back-end specs: solicitacoes, pacientes, regulacao, passagens,
// ajuda-de-custo, permanencia, encerramento, agendamento, usuarios, auditoria,
// notificacoes.
// =============================================================================

// ─── Enums ───────────────────────────────────────────────────────────────────

export type StatusSolicitacao =
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
  | 'INDEFERIDO';

export type Prioridade = 'NORMAL' | 'URGENTE' | 'EMERGENCIAL';

export type Modalidade = 'INTRAESTADUAL' | 'INTERESTADUAL';

export type PerfilUsuario =
  | 'ATENDENTE_MUNICIPAL'
  | 'ATENDENTE_REGIONAL'
  | 'COORDENACAO_ESTADUAL'
  | 'MEDICO_AUDITOR'
  | 'SETOR_REGULACAO'
  | 'SETOR_PASSAGENS'
  | 'FINANCEIRO'
  | 'ASSISTENTE_SOCIAL'
  | 'CONTROLE_INTERNO'
  | 'ADMINISTRADOR';

export type Sexo = 'MASCULINO' | 'FEMININO' | 'OUTRO';

export type VinculoAcompanhante =
  | 'CONJUGE'
  | 'FILHO'
  | 'PAI_MAE'
  | 'RESPONSAVEL_LEGAL'
  | 'OUTRO';

export type TipoDocumento =
  | 'LAUDO_MEDICO'
  | 'RG'
  | 'CPF'
  | 'CNS'
  | 'COMPROVANTE_RESIDENCIA'
  | 'COMPROVANTE_AGENDAMENTO'
  | 'COMPROVANTE_AGENDAMENTO_APP'
  | 'RELATORIO_MEDICO_ACOMPANHAMENTO'
  | 'RELATORIO_ALTA'
  | 'DADOS_BANCARIOS'
  | 'CERTIDAO_OBITO'
  | 'OUTROS';

export type StatusDocumento = 'PENDENTE' | 'ENVIADO' | 'REJEITADO';

export type DecisaoParecer = 'DEFERIDO' | 'INDEFERIDO' | 'EXIGENCIA';

export type TipoExigencia =
  | 'LAUDO_COMPLEMENTAR'
  | 'EXAME'
  | 'COMPROVANTE_AGENDAMENTO'
  | 'OUTROS';

export type StatusExigencia = 'PENDENTE' | 'ATENDIDA' | 'VENCIDA';

export type TipoRota =
  | 'APROVADO_DIRETO'
  | 'CNRAC'
  | 'SETI'
  | 'RESPOSTA_EXTERNA'
  | 'SERVICO_SOCIAL'
  | 'REPROVADO_PRORROGACAO'
  | 'APROVADO_PRORROGACAO';

export type StatusEspera = 'AGUARDANDO' | 'RESPONDIDO' | 'ENCERRADO';

export type StatusCobranca = 'ENVIADA' | 'RESPONDIDA' | 'SEM_RESPOSTA';

export type CanalCobranca = 'EMAIL' | 'SISTEMA' | 'TELEFONE';

export type SituacaoViagem =
  | 'AGUARDANDO_EMISSAO'
  | 'EMITIDA'
  | 'REMARCADA'
  | 'CANCELADA'
  | 'NO_SHOW'
  | 'UTILIZADA';

export type TipoViagem = 'IDA' | 'RETORNO' | 'IDA_E_VOLTA';

export type ModalTransporte = 'AEREO' | 'TERRESTRE' | 'FLUVIAL';

export type StatusRemarcacao = 'PENDENTE' | 'APROVADA' | 'REJEITADA';

export type TipoBeneficiario = 'PACIENTE' | 'ACOMPANHANTE';

export type TipoConta = 'CORRENTE' | 'POUPANCA';

export type StatusAjudaCusto =
  | 'EM_ANALISE'
  | 'APROVADA'
  | 'EM_PAGAMENTO'
  | 'CONCLUIDA'
  | 'GLOSADA';

export type ComunicadoPor =
  | 'PACIENTE'
  | 'RESPONSAVEL'
  | 'UNIDADE_DESTINO'
  | 'REGIONAL';

export type MotivoPermanencia =
  | 'INTERNACAO'
  | 'CONTINUIDADE_TRATAMENTO'
  | 'AGUARDANDO_CIRURGIA'
  | 'OUTROS';

export type DecisaoProrrogacao = 'APROVADA' | 'INDEFERIDA' | 'PENDENTE';

export type MotivoEncerramento =
  | 'ALTA_MEDICA'
  | 'TRANSFERENCIA'
  | 'DESISTENCIA'
  | 'ABANDONO'
  | 'OBITO';

export type CanalNotificacao = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'SISTEMA';

export type StatusNotificacao = 'PENDENTE' | 'ENVIADO' | 'FALHOU';

export type DestinatarioTipo = 'USUARIO_SISTEMA' | 'PACIENTE' | 'RESPONSAVEL';

export type SetorDestinatario =
  | 'REGULACAO'
  | 'PASSAGENS'
  | 'FINANCEIRO'
  | 'COORDENACAO'
  | 'TODOS';

export type TipoAtendimento =
  | 'CONSULTA'
  | 'CIRURGIA'
  | 'EXAME'
  | 'TRATAMENTO_CONTINUO';

export type OrigemAgendamento =
  | 'CNRAC'
  | 'CENTRAL_TRANSPLANTES'
  | 'CONTATO_DIRETO'
  | 'EMAIL'
  | 'OUTRO';

export type StatusAgendamento = 'AGUARDANDO_CONFIRMACAO' | 'CONFIRMADO';

export type AcaoAuditoria =
  | 'SOLICITACAO_CRIADA'
  | 'STATUS_ALTERADO'
  | 'PARECER_EMITIDO'
  | 'PASSAGEM_EMITIDA'
  | 'EMBARQUE_CONFIRMADO'
  | 'NO_SHOW_REGISTRADO'
  | 'PASSAGEM_REMARCADA'
  | 'DIARIA_APROVADA'
  | 'DIARIA_PAGA'
  | 'DIARIA_GLOSADA'
  | 'PERMANENCIA_REGISTRADA'
  | 'PRORROGACAO_APROVADA'
  | 'PRORROGACAO_INDEFERIDA'
  | 'PROCESSO_ENCERRADO'
  | 'DOCUMENTO_ANEXADO'
  | 'USUARIO_CRIADO'
  | 'USUARIO_DESATIVADO'
  | 'PRIORIDADE_ALTERADA'
  | 'EXCECAO_SINALIZADA'
  | 'TRANSICAO_FORCADA'
  | 'OBSERVACAO_REGISTRADA'
  | 'ROTA_DEFINIDA'
  | 'COBRANCA_ENVIADA';

// ─── Database Definition ─────────────────────────────────────────────────────

export type Database = {
  public: {
    Tables: {
      // ── Municipios ────────────────────────────────────────
      municipios: {
        Row: {
          id: string;
          nome: string;
          codigo_ibge: string;
          uf: string;
          regional_id: string | null;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          codigo_ibge: string;
          uf: string;
          regional_id?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          codigo_ibge?: string;
          uf?: string;
          regional_id?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── Usuarios ──────────────────────────────────────────
      usuarios: {
        Row: {
          id: string;
          nome_completo: string;
          cpf: string;
          email: string;
          senha_hash: string;
          perfil: PerfilUsuario;
          regional_id: string | null;
          municipio_id: string | null;
          ativo: boolean;
          primeiro_acesso: boolean;
          ultimo_acesso: string | null;
          papel_id: string | null;
          is_admin: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome_completo: string;
          cpf: string;
          email: string;
          senha_hash: string;
          perfil: PerfilUsuario;
          regional_id?: string | null;
          municipio_id?: string | null;
          ativo?: boolean;
          primeiro_acesso?: boolean;
          ultimo_acesso?: string | null;
          papel_id?: string | null;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome_completo?: string;
          cpf?: string;
          email?: string;
          senha_hash?: string;
          perfil?: PerfilUsuario;
          regional_id?: string | null;
          municipio_id?: string | null;
          ativo?: boolean;
          primeiro_acesso?: boolean;
          ultimo_acesso?: string | null;
          papel_id?: string | null;
          is_admin?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── Pacientes ─────────────────────────────────────────
      pacientes: {
        Row: {
          id: string;
          cns: string;
          cpf: string;
          nome_completo: string;
          sexo: Sexo;
          data_nascimento: string;
          telefone_celular: string | null;
          telefone_fixo: string | null;
          email: string | null;
          logradouro: string;
          numero: string;
          bairro: string;
          cep: string;
          municipio: string;
          uf: string;
          municipio_residencia_id: string;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cns: string;
          cpf: string;
          nome_completo: string;
          sexo: Sexo;
          data_nascimento: string;
          telefone_celular?: string | null;
          telefone_fixo?: string | null;
          email?: string | null;
          logradouro: string;
          numero: string;
          bairro: string;
          cep: string;
          municipio: string;
          uf: string;
          municipio_residencia_id: string;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cns?: string;
          cpf?: string;
          nome_completo?: string;
          sexo?: Sexo;
          data_nascimento?: string;
          telefone_celular?: string | null;
          telefone_fixo?: string | null;
          email?: string | null;
          logradouro?: string;
          numero?: string;
          bairro?: string;
          cep?: string;
          municipio?: string;
          uf?: string;
          municipio_residencia_id?: string;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── Acompanhantes ─────────────────────────────────────
      acompanhantes: {
        Row: {
          id: string;
          paciente_id: string;
          nome_completo: string;
          cpf: string;
          cns: string | null;
          vinculo: VinculoAcompanhante;
          telefone: string;
          necessidade_especial: boolean;
          descricao_necessidade: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          paciente_id: string;
          nome_completo: string;
          cpf: string;
          cns?: string | null;
          vinculo: VinculoAcompanhante;
          telefone: string;
          necessidade_especial?: boolean;
          descricao_necessidade?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          paciente_id?: string;
          nome_completo?: string;
          cpf?: string;
          cns?: string | null;
          vinculo?: VinculoAcompanhante;
          telefone?: string;
          necessidade_especial?: boolean;
          descricao_necessidade?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── Solicitacoes ──────────────────────────────────────
      solicitacoes: {
        Row: {
          id: string;
          numero_processo: string;
          numero_protocolo: string | null;
          paciente_id: string;
          acompanhante_id: string | null;
          municipio_origem_id: string;
          regional_origem_id: string;
          modalidade: Modalidade;
          status: StatusSolicitacao;
          cid10_principal: string;
          cid10_secundario: string | null;
          tipo_procedimento: string;
          descricao_diagnostico: string;
          justificativa_tfd: string;
          necessidade_acompanhante: boolean;
          tipo_transporte_sugerido: ModalTransporte;
          atendente_criador_id: string;
          analista_responsavel_id: string | null;
          prioridade: Prioridade;
          flag_excecao: boolean;
          descricao_excecao: string | null;
          data_encerramento: string | null;
          motivo_encerramento: MotivoEncerramento | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          numero_processo?: string;
          numero_protocolo?: string | null;
          paciente_id: string;
          acompanhante_id?: string | null;
          municipio_origem_id: string;
          regional_origem_id: string;
          modalidade: Modalidade;
          status?: StatusSolicitacao;
          cid10_principal: string;
          cid10_secundario?: string | null;
          tipo_procedimento: string;
          descricao_diagnostico: string;
          justificativa_tfd: string;
          necessidade_acompanhante: boolean;
          tipo_transporte_sugerido: ModalTransporte;
          atendente_criador_id: string;
          analista_responsavel_id?: string | null;
          prioridade?: Prioridade;
          flag_excecao?: boolean;
          descricao_excecao?: string | null;
          data_encerramento?: string | null;
          motivo_encerramento?: MotivoEncerramento | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          numero_processo?: string;
          numero_protocolo?: string | null;
          paciente_id?: string;
          acompanhante_id?: string | null;
          municipio_origem_id?: string;
          regional_origem_id?: string;
          modalidade?: Modalidade;
          status?: StatusSolicitacao;
          cid10_principal?: string;
          cid10_secundario?: string | null;
          tipo_procedimento?: string;
          descricao_diagnostico?: string;
          justificativa_tfd?: string;
          necessidade_acompanhante?: boolean;
          tipo_transporte_sugerido?: ModalTransporte;
          atendente_criador_id?: string;
          analista_responsavel_id?: string | null;
          prioridade?: Prioridade;
          flag_excecao?: boolean;
          descricao_excecao?: string | null;
          data_encerramento?: string | null;
          motivo_encerramento?: MotivoEncerramento | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── Documentos ────────────────────────────────────────
      documentos: {
        Row: {
          id: string;
          solicitacao_id: string;
          tipo: TipoDocumento;
          nome_arquivo: string;
          url_arquivo: string;
          status: StatusDocumento;
          upload_por: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          solicitacao_id: string;
          tipo: TipoDocumento;
          nome_arquivo: string;
          url_arquivo: string;
          status?: StatusDocumento;
          upload_por: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          solicitacao_id?: string;
          tipo?: TipoDocumento;
          nome_arquivo?: string;
          url_arquivo?: string;
          status?: StatusDocumento;
          upload_por?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      // ── Pareceres ─────────────────────────────────────────
      pareceres: {
        Row: {
          id: string;
          solicitacao_id: string;
          medico_auditor_id: string;
          decisao: DecisaoParecer;
          justificativa: string | null;
          data_hora_parecer: string;
          checklist_elegibilidade: Record<string, unknown>;
          autoriza_acompanhante: boolean;
          observacoes_medicas: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          solicitacao_id: string;
          medico_auditor_id: string;
          decisao: DecisaoParecer;
          justificativa?: string | null;
          data_hora_parecer?: string;
          checklist_elegibilidade: Record<string, unknown>;
          autoriza_acompanhante: boolean;
          observacoes_medicas?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          solicitacao_id?: string;
          medico_auditor_id?: string;
          decisao?: DecisaoParecer;
          justificativa?: string | null;
          data_hora_parecer?: string;
          checklist_elegibilidade?: Record<string, unknown>;
          autoriza_acompanhante?: boolean;
          observacoes_medicas?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      // ── Exigencias ────────────────────────────────────────
      exigencias: {
        Row: {
          id: string;
          parecer_id: string;
          tipo: TipoExigencia;
          descricao: string;
          prazo_resposta: string;
          status_resposta: StatusExigencia;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          parecer_id: string;
          tipo: TipoExigencia;
          descricao: string;
          prazo_resposta: string;
          status_resposta?: StatusExigencia;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          parecer_id?: string;
          tipo?: TipoExigencia;
          descricao?: string;
          prazo_resposta?: string;
          status_resposta?: StatusExigencia;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── Rotas de Regulacao ────────────────────────────────
      rotas_regulacao: {
        Row: {
          id: string;
          solicitacao_id: string;
          responsavel_id: string;
          tipo_rota: TipoRota;
          justificativa: string | null;
          lembrete: string | null;
          data_hora_rota: string;
          data_retorno_previsto: string | null;
          status_espera: StatusEspera | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          solicitacao_id: string;
          responsavel_id: string;
          tipo_rota: TipoRota;
          justificativa?: string | null;
          lembrete?: string | null;
          data_hora_rota?: string;
          data_retorno_previsto?: string | null;
          status_espera?: StatusEspera | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          solicitacao_id?: string;
          responsavel_id?: string;
          tipo_rota?: TipoRota;
          justificativa?: string | null;
          lembrete?: string | null;
          data_hora_rota?: string;
          data_retorno_previsto?: string | null;
          status_espera?: StatusEspera | null;
          created_at?: string;
        };
        Relationships: [];
      };

      // ── Cobrancas Externas ────────────────────────────────
      cobrancas_externas: {
        Row: {
          id: string;
          rota_regulacao_id: string;
          destinatario: string;
          canal: CanalCobranca;
          data_envio: string;
          data_resposta: string | null;
          conteudo_resposta: string | null;
          status_cobranca: StatusCobranca;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          rota_regulacao_id: string;
          destinatario: string;
          canal: CanalCobranca;
          data_envio?: string;
          data_resposta?: string | null;
          conteudo_resposta?: string | null;
          status_cobranca?: StatusCobranca;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          rota_regulacao_id?: string;
          destinatario?: string;
          canal?: CanalCobranca;
          data_envio?: string;
          data_resposta?: string | null;
          conteudo_resposta?: string | null;
          status_cobranca?: StatusCobranca;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── Validacoes RPB ────────────────────────────────────
      validacoes_rpb: {
        Row: {
          id: string;
          rota_regulacao_id: string;
          periodo_parecer_inicio: string;
          periodo_parecer_fim: string;
          periodo_agendamento_inicio: string;
          periodo_agendamento_fim: string;
          consistente: boolean;
          observacoes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          rota_regulacao_id: string;
          periodo_parecer_inicio: string;
          periodo_parecer_fim: string;
          periodo_agendamento_inicio: string;
          periodo_agendamento_fim: string;
          consistente: boolean;
          observacoes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          rota_regulacao_id?: string;
          periodo_parecer_inicio?: string;
          periodo_parecer_fim?: string;
          periodo_agendamento_inicio?: string;
          periodo_agendamento_fim?: string;
          consistente?: boolean;
          observacoes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      // ── Agendamentos ──────────────────────────────────────
      agendamentos: {
        Row: {
          id: string;
          solicitacao_id: string;
          unidade_executante: string;
          cnes: string | null;
          cidade_destino: string;
          uf_destino: string;
          tipo_atendimento: TipoAtendimento;
          data_hora_agendamento: string;
          origem_agendamento: OrigemAgendamento;
          numero_cnrac: string | null;
          contato_unidade: string | null;
          comprovante_doc_id: string | null;
          status: StatusAgendamento;
          confirmed_at: string | null;
          confirmed_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          solicitacao_id: string;
          unidade_executante: string;
          cnes?: string | null;
          cidade_destino: string;
          uf_destino: string;
          tipo_atendimento: TipoAtendimento;
          data_hora_agendamento: string;
          origem_agendamento: OrigemAgendamento;
          numero_cnrac?: string | null;
          contato_unidade?: string | null;
          comprovante_doc_id?: string | null;
          status?: StatusAgendamento;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          solicitacao_id?: string;
          unidade_executante?: string;
          cnes?: string | null;
          cidade_destino?: string;
          uf_destino?: string;
          tipo_atendimento?: TipoAtendimento;
          data_hora_agendamento?: string;
          origem_agendamento?: OrigemAgendamento;
          numero_cnrac?: string | null;
          contato_unidade?: string | null;
          comprovante_doc_id?: string | null;
          status?: StatusAgendamento;
          confirmed_at?: string | null;
          confirmed_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── Viagens ───────────────────────────────────────────
      viagens: {
        Row: {
          id: string;
          solicitacao_id: string;
          tipo: TipoViagem;
          modal: ModalTransporte;
          origem_cidade: string;
          origem_uf: string;
          destino_cidade: string;
          destino_uf: string;
          com_pernoite: boolean;
          data_embarque_prevista: string;
          data_embarque_real: string | null;
          situacao: SituacaoViagem;
          embarcou: boolean | null;
          embarcou_registrado_por: string | null;
          embarcou_registrado_em: string | null;
          medif_necessario: boolean;
          medif_descricao: string | null;
          valor: number | null;
          taxas: number | null;
          companhia: string | null;
          numero_bilhete: string | null;
          emissor_id: string | null;
          emitido_em: string | null;
          observacoes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          solicitacao_id: string;
          tipo: TipoViagem;
          modal: ModalTransporte;
          origem_cidade: string;
          origem_uf: string;
          destino_cidade: string;
          destino_uf: string;
          com_pernoite: boolean;
          data_embarque_prevista: string;
          data_embarque_real?: string | null;
          situacao?: SituacaoViagem;
          embarcou?: boolean | null;
          embarcou_registrado_por?: string | null;
          embarcou_registrado_em?: string | null;
          medif_necessario: boolean;
          medif_descricao?: string | null;
          valor?: number | null;
          taxas?: number | null;
          companhia?: string | null;
          numero_bilhete?: string | null;
          emissor_id?: string | null;
          emitido_em?: string | null;
          observacoes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          solicitacao_id?: string;
          tipo?: TipoViagem;
          modal?: ModalTransporte;
          origem_cidade?: string;
          origem_uf?: string;
          destino_cidade?: string;
          destino_uf?: string;
          com_pernoite?: boolean;
          data_embarque_prevista?: string;
          data_embarque_real?: string | null;
          situacao?: SituacaoViagem;
          embarcou?: boolean | null;
          embarcou_registrado_por?: string | null;
          embarcou_registrado_em?: string | null;
          medif_necessario?: boolean;
          medif_descricao?: string | null;
          valor?: number | null;
          taxas?: number | null;
          companhia?: string | null;
          numero_bilhete?: string | null;
          emissor_id?: string | null;
          emitido_em?: string | null;
          observacoes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── Remarcacoes ───────────────────────────────────────
      remarcacoes: {
        Row: {
          id: string;
          viagem_id: string;
          motivo_remarcacao: string;
          nova_data_embarque: string;
          impacto_nas_diarias: number | null;
          solicitada_por: string;
          solicitada_em: string;
          aprovada_por: string | null;
          status: StatusRemarcacao;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          viagem_id: string;
          motivo_remarcacao: string;
          nova_data_embarque: string;
          impacto_nas_diarias?: number | null;
          solicitada_por: string;
          solicitada_em?: string;
          aprovada_por?: string | null;
          status?: StatusRemarcacao;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          viagem_id?: string;
          motivo_remarcacao?: string;
          nova_data_embarque?: string;
          impacto_nas_diarias?: number | null;
          solicitada_por?: string;
          solicitada_em?: string;
          aprovada_por?: string | null;
          status?: StatusRemarcacao;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── Dados Bancarios ───────────────────────────────────
      dados_bancarios: {
        Row: {
          id: string;
          paciente_id: string;
          banco: string;
          agencia: string;
          conta: string;
          tipo_conta: TipoConta;
          nome_titular: string;
          cpf_titular: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          paciente_id: string;
          banco: string;
          agencia: string;
          conta: string;
          tipo_conta: TipoConta;
          nome_titular: string;
          cpf_titular: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          paciente_id?: string;
          banco?: string;
          agencia?: string;
          conta?: string;
          tipo_conta?: TipoConta;
          nome_titular?: string;
          cpf_titular?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── Tabela Diarias ────────────────────────────────────
      tabela_diarias: {
        Row: {
          id: string;
          tipo_beneficiario: TipoBeneficiario;
          valor_diaria: number;
          data_vigencia_inicio: string;
          data_vigencia_fim: string | null;
          referencia_legal: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tipo_beneficiario: TipoBeneficiario;
          valor_diaria: number;
          data_vigencia_inicio: string;
          data_vigencia_fim?: string | null;
          referencia_legal: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          tipo_beneficiario?: TipoBeneficiario;
          valor_diaria?: number;
          data_vigencia_inicio?: string;
          data_vigencia_fim?: string | null;
          referencia_legal?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      // ── Ajudas de Custo ───────────────────────────────────
      ajudas_custo: {
        Row: {
          id: string;
          solicitacao_id: string;
          tipo: TipoBeneficiario;
          data_inicio: string;
          data_fim: string | null;
          dias_internacao: number | null;
          dias_elegiveis: number | null;
          valor_diaria: number;
          valor_total: number | null;
          status: StatusAjudaCusto;
          dados_bancarios_id: string;
          aprovado_por: string | null;
          aprovado_em: string | null;
          pago_por: string | null;
          pago_em: string | null;
          observacoes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          solicitacao_id: string;
          tipo: TipoBeneficiario;
          data_inicio: string;
          data_fim?: string | null;
          dias_internacao?: number | null;
          dias_elegiveis?: number | null;
          valor_diaria: number;
          valor_total?: number | null;
          status?: StatusAjudaCusto;
          dados_bancarios_id: string;
          aprovado_por?: string | null;
          aprovado_em?: string | null;
          pago_por?: string | null;
          pago_em?: string | null;
          observacoes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          solicitacao_id?: string;
          tipo?: TipoBeneficiario;
          data_inicio?: string;
          data_fim?: string | null;
          dias_internacao?: number | null;
          dias_elegiveis?: number | null;
          valor_diaria?: number;
          valor_total?: number | null;
          status?: StatusAjudaCusto;
          dados_bancarios_id?: string;
          aprovado_por?: string | null;
          aprovado_em?: string | null;
          pago_por?: string | null;
          pago_em?: string | null;
          observacoes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── Permanencias ──────────────────────────────────────
      permanencias: {
        Row: {
          id: string;
          solicitacao_id: string;
          data_comunicacao: string;
          comunicado_por: ComunicadoPor;
          motivo: MotivoPermanencia;
          motivo_descricao: string | null;
          nova_data_retorno_prevista: string;
          registrado_por: string;
          registrado_em: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          solicitacao_id: string;
          data_comunicacao: string;
          comunicado_por: ComunicadoPor;
          motivo: MotivoPermanencia;
          motivo_descricao?: string | null;
          nova_data_retorno_prevista: string;
          registrado_por: string;
          registrado_em?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          solicitacao_id?: string;
          data_comunicacao?: string;
          comunicado_por?: ComunicadoPor;
          motivo?: MotivoPermanencia;
          motivo_descricao?: string | null;
          nova_data_retorno_prevista?: string;
          registrado_por?: string;
          registrado_em?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      // ── Prorrogacoes ──────────────────────────────────────
      prorrogacoes: {
        Row: {
          id: string;
          permanencia_id: string;
          justificativa_medica: string;
          documento_justificativa_id: string;
          dias_adicionais_solicitados: number;
          nova_data_retorno: string;
          impacto_diarias_valor: number | null;
          nova_passagem_necessaria: boolean | null;
          decisao: DecisaoProrrogacao;
          decisao_por: string | null;
          decisao_em: string | null;
          justificativa_decisao: string | null;
          complemento_ajuda_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          permanencia_id: string;
          justificativa_medica: string;
          documento_justificativa_id: string;
          dias_adicionais_solicitados: number;
          nova_data_retorno: string;
          impacto_diarias_valor?: number | null;
          nova_passagem_necessaria?: boolean | null;
          decisao?: DecisaoProrrogacao;
          decisao_por?: string | null;
          decisao_em?: string | null;
          justificativa_decisao?: string | null;
          complemento_ajuda_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          permanencia_id?: string;
          justificativa_medica?: string;
          documento_justificativa_id?: string;
          dias_adicionais_solicitados?: number;
          nova_data_retorno?: string;
          impacto_diarias_valor?: number | null;
          nova_passagem_necessaria?: boolean | null;
          decisao?: DecisaoProrrogacao;
          decisao_por?: string | null;
          decisao_em?: string | null;
          justificativa_decisao?: string | null;
          complemento_ajuda_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── Encerramentos ─────────────────────────────────────
      encerramentos: {
        Row: {
          id: string;
          solicitacao_id: string;
          motivo: MotivoEncerramento;
          data_encerramento: string;
          relatorio_alta_doc_id: string | null;
          observacoes: string | null;
          registrado_por: string;
          registrado_em: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          solicitacao_id: string;
          motivo: MotivoEncerramento;
          data_encerramento: string;
          relatorio_alta_doc_id?: string | null;
          observacoes?: string | null;
          registrado_por: string;
          registrado_em?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          solicitacao_id?: string;
          motivo?: MotivoEncerramento;
          data_encerramento?: string;
          relatorio_alta_doc_id?: string | null;
          observacoes?: string | null;
          registrado_por?: string;
          registrado_em?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      // ── Notificacoes ──────────────────────────────────────
      notificacoes: {
        Row: {
          id: string;
          solicitacao_id: string;
          tipo: string;
          canal: CanalNotificacao;
          destinatario: string;
          destinatario_tipo: DestinatarioTipo;
          conteudo: string;
          status: StatusNotificacao;
          tentativas: number;
          enviado_em: string | null;
          erro: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          solicitacao_id: string;
          tipo: string;
          canal: CanalNotificacao;
          destinatario: string;
          destinatario_tipo: DestinatarioTipo;
          conteudo: string;
          status?: StatusNotificacao;
          tentativas?: number;
          enviado_em?: string | null;
          erro?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          solicitacao_id?: string;
          tipo?: string;
          canal?: CanalNotificacao;
          destinatario?: string;
          destinatario_tipo?: DestinatarioTipo;
          conteudo?: string;
          status?: StatusNotificacao;
          tentativas?: number;
          enviado_em?: string | null;
          erro?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      // ── Observacoes Processo ──────────────────────────────
      observacoes_processo: {
        Row: {
          id: string;
          solicitacao_id: string;
          autor_id: string;
          perfil_autor: PerfilUsuario;
          setor_destinatario: SetorDestinatario;
          conteudo: string;
          lida: boolean;
          lida_em: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          solicitacao_id: string;
          autor_id: string;
          perfil_autor: PerfilUsuario;
          setor_destinatario: SetorDestinatario;
          conteudo: string;
          lida?: boolean;
          lida_em?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          solicitacao_id?: string;
          autor_id?: string;
          perfil_autor?: PerfilUsuario;
          setor_destinatario?: SetorDestinatario;
          conteudo?: string;
          lida?: boolean;
          lida_em?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      // ── Log Auditoria ────────────────────────────────────
      log_auditoria: {
        Row: {
          id: string;
          solicitacao_id: string | null;
          usuario_id: string;
          perfil_usuario: PerfilUsuario;
          acao: AcaoAuditoria;
          entidade_alterada: string;
          entidade_id: string;
          campo_alterado: string | null;
          valor_anterior: string | null;
          valor_novo: string | null;
          ip: string | null;
          user_agent: string | null;
          documentos_gerados: string[] | null;
          timestamp: string;
        };
        Insert: {
          id?: string;
          solicitacao_id?: string | null;
          usuario_id: string;
          perfil_usuario: PerfilUsuario;
          acao: AcaoAuditoria;
          entidade_alterada: string;
          entidade_id: string;
          campo_alterado?: string | null;
          valor_anterior?: string | null;
          valor_novo?: string | null;
          ip?: string | null;
          user_agent?: string | null;
          documentos_gerados?: string[] | null;
          timestamp?: string;
        };
        Update: {
          id?: string;
          solicitacao_id?: string | null;
          usuario_id?: string;
          perfil_usuario?: PerfilUsuario;
          acao?: AcaoAuditoria;
          entidade_alterada?: string;
          entidade_id?: string;
          campo_alterado?: string | null;
          valor_anterior?: string | null;
          valor_novo?: string | null;
          ip?: string | null;
          user_agent?: string | null;
          documentos_gerados?: string[] | null;
          timestamp?: string;
        };
        Relationships: [];
      };

      // ── Tabelas Auxiliares (Migration 002) ───────────────────
      tabelas_auxiliares: {
        Row: {
          id: string;
          categoria: string;
          codigo: string;
          nome: string;
          descricao: string | null;
          ativo: boolean;
          ordem: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          categoria: string;
          codigo: string;
          nome: string;
          descricao?: string | null;
          ativo?: boolean;
          ordem?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          categoria?: string;
          codigo?: string;
          nome?: string;
          descricao?: string | null;
          ativo?: boolean;
          ordem?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      unidades_destino: {
        Row: {
          id: string;
          nome: string;
          cnes: string | null;
          cidade: string;
          uf: string;
          tipo: string | null;
          contato_nome: string | null;
          contato_telefone: string | null;
          contato_email: string | null;
          endereco: string | null;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          cnes?: string | null;
          cidade: string;
          uf: string;
          tipo?: string | null;
          contato_nome?: string | null;
          contato_telefone?: string | null;
          contato_email?: string | null;
          endereco?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          cnes?: string | null;
          cidade?: string;
          uf?: string;
          tipo?: string | null;
          contato_nome?: string | null;
          contato_telefone?: string | null;
          contato_email?: string | null;
          endereco?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      parametros_sistema: {
        Row: {
          id: string;
          grupo: string;
          chave: string;
          valor: string;
          tipo: string;
          label: string;
          descricao: string | null;
          editavel: boolean;
          ordem: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          grupo: string;
          chave: string;
          valor: string;
          tipo?: string;
          label: string;
          descricao?: string | null;
          editavel?: boolean;
          ordem?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          grupo?: string;
          chave?: string;
          valor?: string;
          tipo?: string;
          label?: string;
          descricao?: string | null;
          editavel?: boolean;
          ordem?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      companhias_transporte: {
        Row: {
          id: string;
          nome: string;
          tipo_modal: ModalTransporte;
          cnpj: string | null;
          contato: string | null;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          tipo_modal: ModalTransporte;
          cnpj?: string | null;
          contato?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          tipo_modal?: ModalTransporte;
          cnpj?: string | null;
          contato?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };

    Views: Record<string, never>;

    Functions: Record<string, never>;

      // ── RBAC (Migration 004) ──────────────────────────────
      telas_sistema: {
        Row: { id: string; nome: string; modulo: string; rota: string; ordem: number };
        Insert: { id: string; nome: string; modulo: string; rota: string; ordem?: number };
        Update: { id?: string; nome?: string; modulo?: string; rota?: string; ordem?: number };
        Relationships: [];
      };

      papeis: {
        Row: { id: string; nome: string; descricao: string | null; cor: string; created_at: string; updated_at: string };
        Insert: { id?: string; nome: string; descricao?: string | null; cor?: string; created_at?: string; updated_at?: string };
        Update: { id?: string; nome?: string; descricao?: string | null; cor?: string; created_at?: string; updated_at?: string };
        Relationships: [];
      };

      papel_telas: {
        Row: { papel_id: string; tela_id: string };
        Insert: { papel_id: string; tela_id: string };
        Update: { papel_id?: string; tela_id?: string };
        Relationships: [];
      };

      codigos_convite: {
        Row: { id: string; codigo: string; ativo: boolean; created_at: string };
        Insert: { id?: string; codigo: string; ativo?: boolean; created_at?: string };
        Update: { id?: string; codigo?: string; ativo?: boolean; created_at?: string };
        Relationships: [];
      };
    };

    Enums: {
      status_solicitacao: StatusSolicitacao;
      prioridade: Prioridade;
      modalidade: Modalidade;
      perfil_usuario: PerfilUsuario;
      sexo: Sexo;
      vinculo_acompanhante: VinculoAcompanhante;
      tipo_documento: TipoDocumento;
      status_documento: StatusDocumento;
      decisao_parecer: DecisaoParecer;
      tipo_exigencia: TipoExigencia;
      status_exigencia: StatusExigencia;
      tipo_rota: TipoRota;
      status_espera: StatusEspera;
      status_cobranca: StatusCobranca;
      canal_cobranca: CanalCobranca;
      situacao_viagem: SituacaoViagem;
      tipo_viagem: TipoViagem;
      modal_transporte: ModalTransporte;
      status_remarcacao: StatusRemarcacao;
      tipo_beneficiario: TipoBeneficiario;
      tipo_conta: TipoConta;
      status_ajuda_custo: StatusAjudaCusto;
      comunicado_por: ComunicadoPor;
      motivo_permanencia: MotivoPermanencia;
      decisao_prorrogacao: DecisaoProrrogacao;
      motivo_encerramento: MotivoEncerramento;
      canal_notificacao: CanalNotificacao;
      status_notificacao: StatusNotificacao;
      destinatario_tipo: DestinatarioTipo;
      setor_destinatario: SetorDestinatario;
      tipo_atendimento: TipoAtendimento;
      origem_agendamento: OrigemAgendamento;
      status_agendamento: StatusAgendamento;
      acao_auditoria: AcaoAuditoria;
    };
  };
};

// ─── Convenience Aliases ─────────────────────────────────────────────────────

/** Row type for a given table (the full select shape). */
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

/** Insert DTO — required fields are non-optional, generated fields are optional. */
export type InsertDTO<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert'];

/** Update DTO — all fields optional for partial updates. */
export type UpdateDTO<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update'];
