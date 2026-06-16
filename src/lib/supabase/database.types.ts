// =============================================================================
// Database Types — TFD Supabase Integration
// Generated from Back-end specs: solicitacoes, pacientes, regulacao, passagens,
// ajuda-de-custo, permanencia, encerramento, agendamento, usuarios, auditoria,
// notificacoes.
// =============================================================================

// ─── Enums ───────────────────────────────────────────────────────────────────

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
  | 'PASSAGEM_IDA'
  | 'PASSAGEM_VOLTA'
  | 'OUTROS';

export type TipoSistemaViagem =
  | 'PENDENTE'
  | 'EMITIDA'
  | 'CONFIRMADA'
  | 'NO_SHOW'
  | 'REMARCADA'
  | 'CANCELADA';

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

export type ModalTransporte = 'AEREO' | 'TERRESTRE' | 'FLUVIAL' | 'TRANSFER';

export type StatusRemarcacao = 'PENDENTE' | 'APROVADA' | 'REJEITADA';

export type TipoBeneficiario = 'PACIENTE' | 'ACOMPANHANTE';

export type TipoConta = 'CORRENTE' | 'POUPANCA';

export type StatusAjudaCusto =
  | 'EM_ANALISE'
  | 'APROVADA'
  | 'CONCLUIDA'
  | 'PAGO_PARCIALMENTE'
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

// Task #5 — Adicionais (custos extras durante o TFD)
export type CategoriaAdicional =
  | 'PASSAGEM_EXTRA'
  | 'AJUDA_CUSTO_EXTRA'
  | 'BAGAGEM'
  | 'TRANSFER'
  | 'OUTRO';

export type StatusAdicional =
  | 'PENDENTE_APROVACAO'
  | 'APROVADO'
  | 'INDEFERIDO'
  | 'PAGO';

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
  | 'TRATAMENTO_CONTINUO'
  | 'QUIMIOTERAPIA'
  | 'RADIOTERAPIA'
  | 'HEMODIALISE'
  | 'REABILITACAO'
  | 'OUTROS';

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
  | 'COBRANCA_ENVIADA'
  | 'PROCESSO_CANCELADO'
  | 'DEVOLUCAO_CRIADA'
  | 'DEVOLUCAO_RESOLVIDA'
  | 'PAPEL_ATRIBUIDO';

export type SetorTFD =
  | 'SOLICITACOES'
  | 'DIAGNOSTICO_CLINICO'
  | 'PARECER_MEDICO'
  | 'REGULACAO'
  | 'AGENDAMENTO'
  | 'PASSAGENS'
  | 'AJUDA_CUSTO'
  | 'PERMANENCIA'
  | 'ENCERRAMENTO';

export type StatusDevolucao = 'PENDENTE' | 'RECEBIDA' | 'RESOLVIDA';

export type UrgenciaDevolucao = 'NORMAL' | 'URGENTE';

export type StatusTermo = 'PENDENTE' | 'REGISTRADO';

export type ModalidadeAceite =
  | 'ACEITE_PRESENCIAL'
  | 'UPLOAD_ASSINADO'
  | 'ASSINATURA_DIGITAL';

export type GrauParentesco =
  | 'PAI_MAE'
  | 'CONJUGE'
  | 'FILHO'
  | 'IRMAO'
  | 'TUTOR_LEGAL'
  | 'OUTRO';

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
          descricao: string | null;
          foto_url: string | null;
          telefones: string[];
          crm: string | null;
          crm_uf: string | null;
          especialidade_medica: string | null;
          matricula: string | null;
          cargo: string | null;
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
          descricao?: string | null;
          foto_url?: string | null;
          telefones?: string[];
          crm?: string | null;
          crm_uf?: string | null;
          especialidade_medica?: string | null;
          matricula?: string | null;
          cargo?: string | null;
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
          descricao?: string | null;
          foto_url?: string | null;
          telefones?: string[];
          crm?: string | null;
          crm_uf?: string | null;
          especialidade_medica?: string | null;
          matricula?: string | null;
          cargo?: string | null;
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
          data_nascimento: string | null;
          vinculo: VinculoAcompanhante;
          telefone: string;
          sexo: Sexo;
          email: string | null;
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
          data_nascimento?: string | null;
          vinculo: VinculoAcompanhante;
          telefone: string;
          sexo: Sexo;
          email?: string | null;
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
          data_nascimento?: string | null;
          vinculo?: VinculoAcompanhante;
          telefone?: string;
          sexo?: Sexo;
          email?: string | null;
          necessidade_especial?: boolean;
          descricao_necessidade?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      bpa_lancamentos: {
        Row: {
          id: string;
          tipo: 'ajuda_custo' | 'passagem';
          origem_id: string;
          trecho: 'ida' | 'volta' | null;
          lancado_em: string;
          lancado_por: string | null;
        };
        Insert: {
          id?: string;
          tipo: 'ajuda_custo' | 'passagem';
          origem_id: string;
          trecho?: 'ida' | 'volta' | null;
          lancado_em?: string;
          lancado_por?: string | null;
        };
        Update: {
          id?: string;
          tipo?: 'ajuda_custo' | 'passagem';
          origem_id?: string;
          trecho?: 'ida' | 'volta' | null;
          lancado_em?: string;
          lancado_por?: string | null;
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
          municipio_origem_id: string;
          regional_origem_id: string;
          modalidade: Modalidade;
          status: StatusSolicitacao;
          cid10_principal: string;
          cid10_secundario: string | null;
          tipo_procedimento: string;
          especialidade: string | null;
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
          url_sei: string | null;
          origem_laudo_unidade_id: string | null;
          data_laudo: string | null;
          dados_bancarios_id: string | null;
          snapshot_banco: string | null;
          snapshot_agencia: string | null;
          snapshot_conta: string | null;
          snapshot_tipo_conta: TipoConta | null;
          snapshot_nome_titular: string | null;
          snapshot_cpf_titular: string | null;
          snapshot_titular_vinculo: string | null;
          snapshot_pix_tipo: 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA' | null;
          snapshot_pix_chave: string | null;
          snapshot_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          numero_processo?: string;
          numero_protocolo?: string | null;
          paciente_id: string;
          municipio_origem_id: string;
          regional_origem_id: string;
          modalidade: Modalidade;
          status?: StatusSolicitacao;
          cid10_principal: string;
          cid10_secundario?: string | null;
          tipo_procedimento: string;
          especialidade?: string | null;
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
          url_sei?: string | null;
          origem_laudo_unidade_id?: string | null;
          data_laudo?: string | null;
          dados_bancarios_id?: string | null;
          snapshot_banco?: string | null;
          snapshot_agencia?: string | null;
          snapshot_conta?: string | null;
          snapshot_tipo_conta?: TipoConta | null;
          snapshot_nome_titular?: string | null;
          snapshot_cpf_titular?: string | null;
          snapshot_titular_vinculo?: string | null;
          snapshot_pix_tipo?: 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA' | null;
          snapshot_pix_chave?: string | null;
          snapshot_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          numero_processo?: string;
          numero_protocolo?: string | null;
          paciente_id?: string;
          municipio_origem_id?: string;
          regional_origem_id?: string;
          modalidade?: Modalidade;
          status?: StatusSolicitacao;
          cid10_principal?: string;
          cid10_secundario?: string | null;
          tipo_procedimento?: string;
          especialidade?: string | null;
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
          url_sei?: string | null;
          origem_laudo_unidade_id?: string | null;
          data_laudo?: string | null;
          dados_bancarios_id?: string | null;
          snapshot_banco?: string | null;
          snapshot_agencia?: string | null;
          snapshot_conta?: string | null;
          snapshot_tipo_conta?: TipoConta | null;
          snapshot_nome_titular?: string | null;
          snapshot_cpf_titular?: string | null;
          snapshot_titular_vinculo?: string | null;
          snapshot_pix_tipo?: 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA' | null;
          snapshot_pix_chave?: string | null;
          snapshot_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── Documentos ────────────────────────────────────────
      documentos: {
        Row: {
          id: string;
          solicitacao_id: string | null;
          paciente_id: string | null;
          tipo: TipoDocumento;
          nome_arquivo: string;
          url_arquivo: string;
          status: StatusDocumento;
          upload_por: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          solicitacao_id?: string | null;
          paciente_id?: string | null;
          tipo: TipoDocumento;
          nome_arquivo: string;
          url_arquivo: string;
          status?: StatusDocumento;
          upload_por?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          solicitacao_id?: string | null;
          paciente_id?: string | null;
          tipo?: TipoDocumento;
          nome_arquivo?: string;
          url_arquivo?: string;
          status?: StatusDocumento;
          upload_por?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      // ── Solicitacao Acompanhantes ─────────────────────────
      solicitacao_acompanhantes: {
        Row: {
          id: string;
          solicitacao_id: string;
          acompanhante_id: string;
          principal: boolean;
          doador: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          solicitacao_id: string;
          acompanhante_id: string;
          principal?: boolean;
          doador?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          solicitacao_id?: string;
          acompanhante_id?: string;
          principal?: boolean;
          doador?: boolean;
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
          responsavel_id: string | null;
          tipo_rota: TipoRota;
          justificativa: string | null;
          lembrete: string | null;
          data_retorno_previsto: string | null;
          status_espera: StatusEspera | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          solicitacao_id: string;
          responsavel_id?: string;
          tipo_rota: TipoRota;
          justificativa?: string | null;
          lembrete?: string | null;
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
          contato_canal: string | null;
          data_envio: string;
          conteudo_envio: string | null;
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
          contato_canal?: string | null;
          data_envio?: string;
          conteudo_envio?: string | null;
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
          contato_canal?: string | null;
          data_envio?: string;
          conteudo_envio?: string | null;
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
          viagem_anterior_id: string | null;
          prorrogacao_id: string | null;
          motivo_cancelamento: string | null;
          numero_sequencial: number;
          distancia_valor: number | null;
          distancia_unidade: 'km' | 'milhas' | 'milhas_nauticas' | null;
          valor_ajuda_custo_paciente: number | null;
          valor_ajuda_custo_acompanhante: number | null;
          valor_reembolso: number | null;
          data_reembolso: string | null;
          ativa: boolean;
          data_cancelamento: string | null;
          motivo_cancelamento_texto: string | null;
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
          viagem_anterior_id?: string | null;
          prorrogacao_id?: string | null;
          motivo_cancelamento?: string | null;
          numero_sequencial?: number;
          distancia_valor?: number | null;
          distancia_unidade?: 'km' | 'milhas' | 'milhas_nauticas' | null;
          valor_ajuda_custo_paciente?: number | null;
          valor_ajuda_custo_acompanhante?: number | null;
          valor_reembolso?: number | null;
          data_reembolso?: string | null;
          ativa?: boolean;
          data_cancelamento?: string | null;
          motivo_cancelamento_texto?: string | null;
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
          viagem_anterior_id?: string | null;
          prorrogacao_id?: string | null;
          motivo_cancelamento?: string | null;
          numero_sequencial?: number;
          distancia_valor?: number | null;
          distancia_unidade?: 'km' | 'milhas' | 'milhas_nauticas' | null;
          valor_ajuda_custo_paciente?: number | null;
          valor_ajuda_custo_acompanhante?: number | null;
          valor_reembolso?: number | null;
          data_reembolso?: string | null;
          ativa?: boolean;
          data_cancelamento?: string | null;
          motivo_cancelamento_texto?: string | null;
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
          banco: string | null;
          agencia: string | null;
          conta: string | null;
          tipo_conta: TipoConta | null;
          nome_titular: string;
          cpf_titular: string;
          titular_vinculo: string | null;
          pix_tipo: 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA' | null;
          pix_chave: string | null;
          ativo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          paciente_id: string;
          banco?: string | null;
          agencia?: string | null;
          conta?: string | null;
          tipo_conta?: TipoConta | null;
          nome_titular: string;
          cpf_titular: string;
          titular_vinculo?: string | null;
          pix_tipo?: 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA' | null;
          pix_chave?: string | null;
          ativo?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          paciente_id?: string;
          banco?: string | null;
          agencia?: string | null;
          conta?: string | null;
          tipo_conta?: TipoConta | null;
          nome_titular?: string;
          cpf_titular?: string;
          titular_vinculo?: string | null;
          pix_tipo?: 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA' | null;
          pix_chave?: string | null;
          ativo?: boolean;
          created_at?: string;
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
          valor_pago: number | null;
          status: StatusAjudaCusto;
          dados_bancarios_id: string | null;
          aprovado_por: string | null;
          aprovado_em: string | null;
          pago_por: string | null;
          pago_em: string | null;
          observacoes: string | null;
          valor_reembolso: number | null;
          data_reembolso: string | null;
          ativa: boolean;
          data_cancelamento: string | null;
          motivo_cancelamento_texto: string | null;
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
          valor_pago?: number | null;
          status?: StatusAjudaCusto;
          dados_bancarios_id?: string | null;
          aprovado_por?: string | null;
          aprovado_em?: string | null;
          pago_por?: string | null;
          pago_em?: string | null;
          observacoes?: string | null;
          valor_reembolso?: number | null;
          data_reembolso?: string | null;
          ativa?: boolean;
          data_cancelamento?: string | null;
          motivo_cancelamento_texto?: string | null;
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
          valor_pago?: number | null;
          status?: StatusAjudaCusto;
          dados_bancarios_id?: string | null;
          aprovado_por?: string | null;
          aprovado_em?: string | null;
          pago_por?: string | null;
          pago_em?: string | null;
          observacoes?: string | null;
          valor_reembolso?: number | null;
          data_reembolso?: string | null;
          ativa?: boolean;
          data_cancelamento?: string | null;
          motivo_cancelamento_texto?: string | null;
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
          data_comunicacao: string | null;
          comunicado_por: ComunicadoPor | null;
          motivo: MotivoPermanencia | null;
          motivo_descricao: string | null;
          nova_data_retorno_prevista: string | null;
          registrado_por: string | null;
          registrado_em: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          solicitacao_id: string;
          data_comunicacao?: string | null;
          comunicado_por?: ComunicadoPor | null;
          motivo?: MotivoPermanencia | null;
          motivo_descricao?: string | null;
          nova_data_retorno_prevista?: string | null;
          registrado_por?: string | null;
          registrado_em?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          solicitacao_id?: string;
          data_comunicacao?: string | null;
          comunicado_por?: ComunicadoPor | null;
          motivo?: MotivoPermanencia | null;
          motivo_descricao?: string | null;
          nova_data_retorno_prevista?: string | null;
          registrado_por?: string | null;
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
          documento_justificativa_id: string | null;
          dias_adicionais_solicitados: number;
          nova_data_retorno: string;
          impacto_diarias_valor: number | null;
          nova_passagem_necessaria: boolean | null;
          decisao: DecisaoProrrogacao;
          decisao_por: string | null;
          decisao_em: string | null;
          justificativa_decisao: string | null;
          complemento_ajuda_id: string | null;
          viagem_prorrogacao_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          permanencia_id: string;
          justificativa_medica: string;
          documento_justificativa_id?: string | null;
          dias_adicionais_solicitados: number;
          nova_data_retorno: string;
          impacto_diarias_valor?: number | null;
          nova_passagem_necessaria?: boolean | null;
          decisao?: DecisaoProrrogacao;
          decisao_por?: string | null;
          decisao_em?: string | null;
          justificativa_decisao?: string | null;
          complemento_ajuda_id?: string | null;
          viagem_prorrogacao_id?: string | null;
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
          viagem_prorrogacao_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── Despachos Financeiros (00045) ─────────────────────
      despachos_financeiros: {
        Row: {
          id: string;
          solicitacao_id: string;
          gerado_por: string | null;
          numero_sei: string | null;
          texto_despacho: string | null;
          observacoes: string | null;
          representantes:
            | { usuario_id: string | null; nome: string; cargo: string; id_funcional: string }[]
            | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          solicitacao_id: string;
          gerado_por?: string | null;
          numero_sei?: string | null;
          texto_despacho?: string | null;
          observacoes?: string | null;
          representantes?:
            | { usuario_id: string | null; nome: string; cargo: string; id_funcional: string }[]
            | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          solicitacao_id?: string;
          gerado_por?: string | null;
          numero_sei?: string | null;
          texto_despacho?: string | null;
          observacoes?: string | null;
          representantes?:
            | { usuario_id: string | null; nome: string; cargo: string; id_funcional: string }[]
            | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── Adicionais (Task #5 — PA1–PA4) ────────────────────
      adicionais: {
        Row: {
          id: string;
          solicitacao_id: string;
          categoria: CategoriaAdicional;
          descricao: string;
          valor: number;
          data_ocorrencia: string;
          documento_id: string | null;
          status: StatusAdicional;
          justificativa_solicitacao: string | null;
          aprovado_por: string | null;
          aprovado_em: string | null;
          justificativa_decisao: string | null;
          criado_por: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          solicitacao_id: string;
          categoria: CategoriaAdicional;
          descricao: string;
          valor: number;
          data_ocorrencia: string;
          documento_id?: string | null;
          status?: StatusAdicional;
          justificativa_solicitacao?: string | null;
          aprovado_por?: string | null;
          aprovado_em?: string | null;
          justificativa_decisao?: string | null;
          criado_por?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          solicitacao_id?: string;
          categoria?: CategoriaAdicional;
          descricao?: string;
          valor?: number;
          data_ocorrencia?: string;
          documento_id?: string | null;
          status?: StatusAdicional;
          justificativa_solicitacao?: string | null;
          aprovado_por?: string | null;
          aprovado_em?: string | null;
          justificativa_decisao?: string | null;
          criado_por?: string | null;
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
          cep: string | null;
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
          cep?: string | null;
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
          cep?: string | null;
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
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── RBAC (Migration 004) ──────────────────────────────
      telas_sistema: {
        Row: { id: string; nome: string; modulo: string; rota: string; ordem: number; acoes_disponiveis: string[] };
        Insert: { id: string; nome: string; modulo: string; rota: string; ordem?: number; acoes_disponiveis?: string[] };
        Update: { id?: string; nome?: string; modulo?: string; rota?: string; ordem?: number; acoes_disponiveis?: string[] };
        Relationships: [];
      };

      papeis: {
        Row: { id: string; nome: string; descricao: string | null; cor: string; created_at: string; updated_at: string };
        Insert: { id?: string; nome: string; descricao?: string | null; cor?: string; created_at?: string; updated_at?: string };
        Update: { id?: string; nome?: string; descricao?: string | null; cor?: string; created_at?: string; updated_at?: string };
        Relationships: [];
      };

      papel_tela_acoes: {
        Row: { papel_id: string; tela_id: string; acao: string };
        Insert: { papel_id: string; tela_id: string; acao: string };
        Update: { papel_id?: string; tela_id?: string; acao?: string };
        Relationships: [];
      };

      codigos_convite: {
        Row: { id: string; codigo: string; ativo: boolean; created_at: string };
        Insert: { id?: string; codigo: string; ativo?: boolean; created_at?: string };
        Update: { id?: string; codigo?: string; ativo?: boolean; created_at?: string };
        Relationships: [];
      };

      // ── Devoluções (retorno não-linear entre setores) ────
      devolucoes: {
        Row: {
          id: string;
          solicitacao_id: string;
          setor_origem: SetorTFD;
          setor_destino: SetorTFD;
          motivo: string;
          urgencia: UrgenciaDevolucao;
          status_devolucao: StatusDevolucao;
          devolvido_por: string | null;
          recebido_por: string | null;
          resolvido_por: string | null;
          resolvido_em: string | null;
          observacao_resolucao: string | null;
          /** Status da solicitação no momento da devolução — usado para retorno direto */
          status_retorno: StatusSolicitacao;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          solicitacao_id: string;
          setor_origem: SetorTFD;
          setor_destino: SetorTFD;
          motivo: string;
          urgencia?: UrgenciaDevolucao;
          status_devolucao?: StatusDevolucao;
          devolvido_por?: string | null;
          recebido_por?: string | null;
          resolvido_por?: string | null;
          resolvido_em?: string | null;
          observacao_resolucao?: string | null;
          status_retorno: StatusSolicitacao;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          solicitacao_id?: string;
          setor_origem?: SetorTFD;
          setor_destino?: SetorTFD;
          motivo?: string;
          urgencia?: UrgenciaDevolucao;
          status_devolucao?: StatusDevolucao;
          devolvido_por?: string | null;
          recebido_por?: string | null;
          resolvido_por?: string | null;
          resolvido_em?: string | null;
          observacao_resolucao?: string | null;
          status_retorno?: StatusSolicitacao;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── Termos de Compromisso ─────────────────────────────
      termos_compromisso: {
        Row: {
          id: string;
          solicitacao_id: string;
          numero_processo: string;
          paciente_nome: string;
          paciente_cpf: string;
          paciente_rg: string | null;
          paciente_cns: string | null;
          paciente_endereco: string | null;
          paciente_municipio: string | null;
          status: StatusTermo;
          modalidade_aceite: ModalidadeAceite;
          responsavel_nome: string | null;
          responsavel_cpf: string | null;
          responsavel_parentesco: GrauParentesco | null;
          arquivo_url: string | null;
          arquivo_nome: string | null;
          confirmacao_leitura: boolean;
          local_registro: string | null;
          data_registro: string;
          registrado_por: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          solicitacao_id: string;
          numero_processo: string;
          paciente_nome: string;
          paciente_cpf: string;
          paciente_rg?: string | null;
          paciente_cns?: string | null;
          paciente_endereco?: string | null;
          paciente_municipio?: string | null;
          status?: StatusTermo;
          modalidade_aceite: ModalidadeAceite;
          responsavel_nome?: string | null;
          responsavel_cpf?: string | null;
          responsavel_parentesco?: GrauParentesco | null;
          arquivo_url?: string | null;
          arquivo_nome?: string | null;
          confirmacao_leitura?: boolean;
          local_registro?: string | null;
          data_registro?: string;
          registrado_por?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          solicitacao_id?: string;
          numero_processo?: string;
          paciente_nome?: string;
          paciente_cpf?: string;
          paciente_rg?: string | null;
          paciente_cns?: string | null;
          paciente_endereco?: string | null;
          paciente_municipio?: string | null;
          status?: StatusTermo;
          modalidade_aceite?: ModalidadeAceite;
          responsavel_nome?: string | null;
          responsavel_cpf?: string | null;
          responsavel_parentesco?: GrauParentesco | null;
          arquivo_url?: string | null;
          arquivo_nome?: string | null;
          confirmacao_leitura?: boolean;
          local_registro?: string | null;
          data_registro?: string;
          registrado_por?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── CID-10 ──────────────────────────────────────────────
      cid10: {
        Row: {
          id: number;
          codigo: string;
          descricao: string;
        };
        Insert: {
          id?: number;
          codigo: string;
          descricao: string;
        };
        Update: {
          id?: number;
          codigo?: string;
          descricao?: string;
        };
        Relationships: [];
      };

      // ── CID-11 ──────────────────────────────────────────────
      cid11: {
        Row: {
          id: number;
          codigo: string;
          descricao: string;
        };
        Insert: {
          id?: number;
          codigo: string;
          descricao: string;
        };
        Update: {
          id?: number;
          codigo?: string;
          descricao?: string;
        };
        Relationships: [];
      };

      // ── SIGTAP Procedimentos ────────────────────────────────
      sigtap_procedimentos: {
        Row: {
          id: number;
          codigo: string;
          descricao: string;
          tipo: string;
          subtipo: string | null;
          beneficiario: string;
          valor_unitario: number;
          unidade_medida: string | null;
          cnrac: boolean;
          portaria_referencia: string | null;
          data_vigencia: string | null;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          codigo: string;
          descricao: string;
          tipo: string;
          subtipo?: string | null;
          beneficiario: string;
          valor_unitario: number;
          unidade_medida?: string | null;
          cnrac?: boolean;
          portaria_referencia?: string | null;
          data_vigencia?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          codigo?: string;
          descricao?: string;
          tipo?: string;
          subtipo?: string | null;
          beneficiario?: string;
          valor_unitario?: number;
          unidade_medida?: string | null;
          cnrac?: boolean;
          portaria_referencia?: string | null;
          data_vigencia?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // ── Médicos ─────────────────────────────────────────────
      medicos: {
        Row: {
          id: string;
          nome_completo: string;
          crm: string;
          crm_uf: string;
          cpf: string | null;
          especialidade: string | null;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome_completo: string;
          crm: string;
          crm_uf: string;
          cpf?: string | null;
          especialidade?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome_completo?: string;
          crm?: string;
          crm_uf?: string;
          cpf?: string | null;
          especialidade?: string | null;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      // Tabela rotas_deslocamento removida na migration 00041 — substituída
      // pelo cálculo automático de distância via coordenadas IBGE.

      // ── Regiões (agrupamento das URS) ───────────────────────
      regioes: {
        Row: {
          id: string;
          nome: string;
          ordem: number;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome: string;
          ordem?: number;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          ordem?: number;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };

    Views: Record<string, never>;
    Functions: Record<string, never>;

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
      setor_tfd: SetorTFD;
      status_devolucao: StatusDevolucao;
      urgencia_devolucao: UrgenciaDevolucao;
      status_termo: StatusTermo;
      modalidade_aceite: ModalidadeAceite;
      grau_parentesco: GrauParentesco;
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
