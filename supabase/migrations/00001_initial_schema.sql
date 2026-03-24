-- ============================================================================
-- TFD (Tratamento Fora de Domicilio) - Initial Schema
-- Sistema de Gestao de Viagens e Permanencia de Pacientes
-- SES-MA (Secretaria de Estado da Saude do Maranhao)
--
-- Supabase / PostgreSQL Migration
-- ============================================================================

-- ============================================================================
-- 0. EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. HELPER FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamp on row modification
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate numero_processo in format TFD-YYYY-NNNN
CREATE OR REPLACE FUNCTION gerar_numero_processo()
RETURNS TRIGGER AS $$
DECLARE
    ano TEXT;
    proximo_numero INTEGER;
BEGIN
    ano := TO_CHAR(NOW(), 'YYYY');

    SELECT COALESCE(MAX(
        CAST(SUBSTRING(numero_processo FROM 'TFD-' || ano || '-(\d+)') AS INTEGER)
    ), 0) + 1
    INTO proximo_numero
    FROM solicitacoes
    WHERE numero_processo LIKE 'TFD-' || ano || '-%';

    NEW.numero_processo := 'TFD-' || ano || '-' || LPAD(proximo_numero::TEXT, 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================================
-- 2. REFERENCE TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 2.1 municipios
-- ---------------------------------------------------------------------------
CREATE TABLE municipios (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome           TEXT NOT NULL,
    regional       TEXT NOT NULL,
    uf             TEXT NOT NULL DEFAULT 'MA',
    codigo_ibge    TEXT,
    populacao      INTEGER,
    ativo          BOOLEAN DEFAULT TRUE,
    created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_municipios_regional ON municipios (regional);
CREATE INDEX idx_municipios_uf ON municipios (uf);


-- ============================================================================
-- 3. CORE IDENTITY TABLES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 3.1 usuarios
-- ---------------------------------------------------------------------------
CREATE TABLE usuarios (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_completo   TEXT NOT NULL,
    cpf             TEXT NOT NULL UNIQUE,
    email           TEXT NOT NULL UNIQUE,
    perfil          TEXT NOT NULL CHECK (perfil IN (
                        'ATENDENTE_MUNICIPAL',
                        'ATENDENTE_REGIONAL',
                        'COORDENACAO_ESTADUAL',
                        'MEDICO_AUDITOR',
                        'SETOR_REGULACAO',
                        'SETOR_PASSAGENS',
                        'FINANCEIRO',
                        'ASSISTENTE_SOCIAL',
                        'CONTROLE_INTERNO',
                        'ADMINISTRADOR'
                    )),
    regional_id     UUID REFERENCES municipios(id),
    municipio_id    UUID REFERENCES municipios(id),
    ativo           BOOLEAN DEFAULT TRUE,
    primeiro_acesso BOOLEAN DEFAULT TRUE,
    ultimo_acesso   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usuarios_perfil ON usuarios (perfil);
CREATE INDEX idx_usuarios_regional_id ON usuarios (regional_id);
CREATE INDEX idx_usuarios_municipio_id ON usuarios (municipio_id);
CREATE INDEX idx_usuarios_cpf ON usuarios (cpf);

-- ---------------------------------------------------------------------------
-- 3.2 pacientes
-- ---------------------------------------------------------------------------
CREATE TABLE pacientes (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cns                     TEXT NOT NULL,
    cpf                     TEXT NOT NULL UNIQUE,
    nome_completo           TEXT NOT NULL,
    sexo                    TEXT CHECK (sexo IN ('MASCULINO', 'FEMININO', 'OUTRO')),
    data_nascimento         DATE NOT NULL,
    telefone_celular        TEXT,
    telefone_fixo           TEXT,
    email                   TEXT,
    logradouro              TEXT,
    numero                  TEXT,
    bairro                  TEXT,
    cep                     TEXT,
    municipio               TEXT,
    uf                      TEXT DEFAULT 'MA',
    municipio_residencia_id UUID REFERENCES municipios(id),
    ativo                   BOOLEAN DEFAULT TRUE,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pacientes_cpf ON pacientes (cpf);
CREATE INDEX idx_pacientes_cns ON pacientes (cns);
CREATE INDEX idx_pacientes_nome ON pacientes (nome_completo);
CREATE INDEX idx_pacientes_municipio_residencia_id ON pacientes (municipio_residencia_id);

-- ---------------------------------------------------------------------------
-- 3.3 acompanhantes
-- ---------------------------------------------------------------------------
CREATE TABLE acompanhantes (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id           UUID NOT NULL REFERENCES pacientes(id),
    nome_completo         TEXT NOT NULL,
    cpf                   TEXT NOT NULL,
    cns                   TEXT,
    vinculo               TEXT CHECK (vinculo IN (
                              'CONJUGE', 'FILHO', 'PAI_MAE',
                              'RESPONSAVEL_LEGAL', 'OUTRO'
                          )),
    telefone              TEXT,
    necessidade_especial  BOOLEAN DEFAULT FALSE,
    descricao_necessidade TEXT,
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_acompanhantes_paciente_id ON acompanhantes (paciente_id);
CREATE INDEX idx_acompanhantes_cpf ON acompanhantes (cpf);

-- ---------------------------------------------------------------------------
-- 3.4 dados_bancarios
-- ---------------------------------------------------------------------------
CREATE TABLE dados_bancarios (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id  UUID NOT NULL REFERENCES pacientes(id),
    banco        TEXT NOT NULL,
    agencia      TEXT NOT NULL,
    conta        TEXT NOT NULL,
    tipo_conta   TEXT CHECK (tipo_conta IN ('CORRENTE', 'POUPANCA')),
    nome_titular TEXT NOT NULL,
    cpf_titular  TEXT NOT NULL,
    created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dados_bancarios_paciente_id ON dados_bancarios (paciente_id);


-- ============================================================================
-- 4. PROCESS CORE
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 4.1 solicitacoes
-- ---------------------------------------------------------------------------
CREATE TABLE solicitacoes (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_processo           TEXT NOT NULL UNIQUE,
    numero_protocolo          TEXT,
    paciente_id               UUID NOT NULL REFERENCES pacientes(id),
    acompanhante_id           UUID REFERENCES acompanhantes(id),
    municipio_origem_id       UUID REFERENCES municipios(id),
    regional_origem_id        UUID REFERENCES municipios(id),
    modalidade                TEXT CHECK (modalidade IN ('INTRAESTADUAL', 'INTERESTADUAL')),
    status                    TEXT NOT NULL DEFAULT 'NOVO' CHECK (status IN (
                                  'NOVO',
                                  'EM_ANALISE',
                                  'EXIGENCIA',
                                  'AGUARDANDO_REGULACAO',
                                  'AGUARDANDO_CNRAC',
                                  'AGUARDANDO_SETI',
                                  'AGUARDANDO_RESPOSTA_EXTERNA',
                                  'ENCAMINHADO_SERVICO_SOCIAL',
                                  'AGUARDANDO_AGENDAMENTO',
                                  'AGUARDANDO_EMISSAO',
                                  'EMITIDA',
                                  'EM_VIAGEM',
                                  'EM_PERMANENCIA',
                                  'REMARCACAO',
                                  'EM_PAGAMENTO',
                                  'CONCLUIDO',
                                  'INDEFERIDO'
                              )),
    prioridade                TEXT DEFAULT 'NORMAL' CHECK (prioridade IN (
                                  'NORMAL', 'URGENTE', 'EMERGENCIAL'
                              )),
    flag_excecao              BOOLEAN DEFAULT FALSE,
    descricao_excecao         TEXT,
    cid10_principal           TEXT,
    cid10_secundario          TEXT,
    tipo_procedimento         TEXT,
    descricao_diagnostico     TEXT,
    justificativa_tfd         TEXT,
    necessidade_acompanhante  BOOLEAN DEFAULT FALSE,
    tipo_transporte_sugerido  TEXT CHECK (tipo_transporte_sugerido IN (
                                  'AEREO', 'TERRESTRE', 'FLUVIAL'
                              )),
    atendente_criador_id      UUID REFERENCES usuarios(id),
    analista_responsavel_id   UUID REFERENCES usuarios(id),
    data_encerramento         DATE,
    motivo_encerramento       TEXT CHECK (motivo_encerramento IN (
                                  'ALTA_MEDICA', 'TRANSFERENCIA',
                                  'DESISTENCIA', 'ABANDONO', 'OBITO'
                              )),
    created_at                TIMESTAMPTZ DEFAULT NOW(),
    updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_solicitacoes_numero_processo ON solicitacoes (numero_processo);
CREATE INDEX idx_solicitacoes_numero_protocolo ON solicitacoes (numero_protocolo);
CREATE INDEX idx_solicitacoes_paciente_id ON solicitacoes (paciente_id);
CREATE INDEX idx_solicitacoes_acompanhante_id ON solicitacoes (acompanhante_id);
CREATE INDEX idx_solicitacoes_municipio_origem_id ON solicitacoes (municipio_origem_id);
CREATE INDEX idx_solicitacoes_regional_origem_id ON solicitacoes (regional_origem_id);
CREATE INDEX idx_solicitacoes_status ON solicitacoes (status);
CREATE INDEX idx_solicitacoes_prioridade ON solicitacoes (prioridade);
CREATE INDEX idx_solicitacoes_atendente_criador_id ON solicitacoes (atendente_criador_id);
CREATE INDEX idx_solicitacoes_analista_responsavel_id ON solicitacoes (analista_responsavel_id);
CREATE INDEX idx_solicitacoes_created_at ON solicitacoes (created_at);
CREATE INDEX idx_solicitacoes_modalidade ON solicitacoes (modalidade);

-- Trigger: auto-generate numero_processo
CREATE TRIGGER trg_solicitacoes_numero_processo
    BEFORE INSERT ON solicitacoes
    FOR EACH ROW
    WHEN (NEW.numero_processo IS NULL OR NEW.numero_processo = '')
    EXECUTE FUNCTION gerar_numero_processo();

-- ---------------------------------------------------------------------------
-- 4.2 documentos
-- ---------------------------------------------------------------------------
CREATE TABLE documentos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitacao_id  UUID NOT NULL REFERENCES solicitacoes(id) ON DELETE CASCADE,
    tipo            TEXT NOT NULL CHECK (tipo IN (
                        'LAUDO_MEDICO',
                        'RG',
                        'CPF',
                        'CNS',
                        'COMPROVANTE_RESIDENCIA',
                        'COMPROVANTE_AGENDAMENTO',
                        'COMPROVANTE_AGENDAMENTO_APP',
                        'RELATORIO_MEDICO_ACOMPANHAMENTO',
                        'RELATORIO_ALTA',
                        'DADOS_BANCARIOS',
                        'CERTIDAO_OBITO',
                        'OUTROS'
                    )),
    nome_arquivo    TEXT NOT NULL,
    url_arquivo     TEXT NOT NULL,
    status          TEXT DEFAULT 'ENVIADO' CHECK (status IN (
                        'PENDENTE', 'ENVIADO', 'REJEITADO'
                    )),
    upload_por      UUID REFERENCES usuarios(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documentos_solicitacao_id ON documentos (solicitacao_id);
CREATE INDEX idx_documentos_tipo ON documentos (tipo);
CREATE INDEX idx_documentos_upload_por ON documentos (upload_por);


-- ============================================================================
-- 5. MEDICAL EVALUATION
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 5.1 pareceres
-- ---------------------------------------------------------------------------
CREATE TABLE pareceres (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitacao_id          UUID NOT NULL REFERENCES solicitacoes(id),
    medico_auditor_id       UUID NOT NULL REFERENCES usuarios(id),
    decisao                 TEXT NOT NULL CHECK (decisao IN (
                                'DEFERIDO', 'INDEFERIDO', 'EXIGENCIA'
                            )),
    justificativa           TEXT,
    checklist_elegibilidade JSONB,
    autoriza_acompanhante   BOOLEAN,
    observacoes_medicas     TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_pareceres_solicitacao_id ON pareceres (solicitacao_id);
CREATE INDEX idx_pareceres_medico_auditor_id ON pareceres (medico_auditor_id);
CREATE INDEX idx_pareceres_decisao ON pareceres (decisao);

-- ---------------------------------------------------------------------------
-- 5.2 exigencias
-- ---------------------------------------------------------------------------
CREATE TABLE exigencias (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parecer_id       UUID NOT NULL REFERENCES pareceres(id) ON DELETE CASCADE,
    tipo             TEXT CHECK (tipo IN (
                         'LAUDO_COMPLEMENTAR', 'EXAME',
                         'COMPROVANTE_AGENDAMENTO', 'OUTROS'
                     )),
    descricao        TEXT NOT NULL,
    prazo_resposta   DATE,
    status_resposta  TEXT DEFAULT 'PENDENTE' CHECK (status_resposta IN (
                         'PENDENTE', 'ATENDIDA', 'VENCIDA'
                     )),
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exigencias_parecer_id ON exigencias (parecer_id);
CREATE INDEX idx_exigencias_status_resposta ON exigencias (status_resposta);


-- ============================================================================
-- 6. REGULATION & ROUTING
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 6.1 rotas_regulacao
-- ---------------------------------------------------------------------------
CREATE TABLE rotas_regulacao (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitacao_id        UUID NOT NULL REFERENCES solicitacoes(id),
    responsavel_id        UUID NOT NULL REFERENCES usuarios(id),
    tipo_rota             TEXT NOT NULL CHECK (tipo_rota IN (
                              'APROVADO_DIRETO',
                              'CNRAC',
                              'SETI',
                              'RESPOSTA_EXTERNA',
                              'SERVICO_SOCIAL',
                              'REPROVADO_PRORROGACAO',
                              'APROVADO_PRORROGACAO'
                          )),
    justificativa         TEXT,
    lembrete              TEXT,
    data_retorno_previsto DATE,
    status_espera         TEXT CHECK (status_espera IN (
                              'AGUARDANDO', 'RESPONDIDO', 'ENCERRADO'
                          )),
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rotas_regulacao_solicitacao_id ON rotas_regulacao (solicitacao_id);
CREATE INDEX idx_rotas_regulacao_responsavel_id ON rotas_regulacao (responsavel_id);
CREATE INDEX idx_rotas_regulacao_tipo_rota ON rotas_regulacao (tipo_rota);
CREATE INDEX idx_rotas_regulacao_status_espera ON rotas_regulacao (status_espera);

-- ---------------------------------------------------------------------------
-- 6.2 cobrancas_externas
-- ---------------------------------------------------------------------------
CREATE TABLE cobrancas_externas (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rota_regulacao_id  UUID NOT NULL REFERENCES rotas_regulacao(id),
    destinatario       TEXT NOT NULL,
    canal              TEXT CHECK (canal IN ('EMAIL', 'SISTEMA', 'TELEFONE')),
    data_envio         TIMESTAMPTZ NOT NULL,
    data_resposta      TIMESTAMPTZ,
    conteudo_resposta  TEXT,
    status_cobranca    TEXT DEFAULT 'ENVIADA' CHECK (status_cobranca IN (
                           'ENVIADA', 'RESPONDIDA', 'SEM_RESPOSTA'
                       )),
    created_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cobrancas_externas_rota_regulacao_id ON cobrancas_externas (rota_regulacao_id);
CREATE INDEX idx_cobrancas_externas_status_cobranca ON cobrancas_externas (status_cobranca);

-- ---------------------------------------------------------------------------
-- 6.3 validacoes_rpb
-- ---------------------------------------------------------------------------
CREATE TABLE validacoes_rpb (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rota_regulacao_id         UUID NOT NULL REFERENCES rotas_regulacao(id),
    periodo_parecer_inicio    DATE,
    periodo_parecer_fim       DATE,
    periodo_agendamento_inicio DATE,
    periodo_agendamento_fim   DATE,
    consistente               BOOLEAN,
    observacoes               TEXT,
    created_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_validacoes_rpb_rota_regulacao_id ON validacoes_rpb (rota_regulacao_id);


-- ============================================================================
-- 7. SCHEDULING & TRAVEL
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 7.1 agendamentos
-- ---------------------------------------------------------------------------
CREATE TABLE agendamentos (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitacao_id        UUID NOT NULL REFERENCES solicitacoes(id),
    unidade_executante    TEXT NOT NULL,
    cnes                  TEXT,
    cidade_destino        TEXT NOT NULL,
    uf_destino            TEXT NOT NULL,
    tipo_atendimento      TEXT CHECK (tipo_atendimento IN (
                              'CONSULTA', 'CIRURGIA', 'EXAME',
                              'TRATAMENTO_CONTINUO'
                          )),
    data_hora_agendamento TIMESTAMPTZ NOT NULL,
    origem_agendamento    TEXT CHECK (origem_agendamento IN (
                              'CNRAC', 'CENTRAL_TRANSPLANTES',
                              'CONTATO_DIRETO', 'EMAIL', 'OUTRO'
                          )),
    numero_cnrac          TEXT,
    contato_unidade       TEXT,
    comprovante_doc_id    UUID REFERENCES documentos(id),
    status                TEXT DEFAULT 'AGUARDANDO_CONFIRMACAO' CHECK (status IN (
                              'AGUARDANDO_CONFIRMACAO', 'CONFIRMADO'
                          )),
    confirmed_at          TIMESTAMPTZ,
    confirmed_by          UUID REFERENCES usuarios(id),
    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_agendamentos_solicitacao_id ON agendamentos (solicitacao_id);
CREATE INDEX idx_agendamentos_status ON agendamentos (status);
CREATE INDEX idx_agendamentos_data_hora ON agendamentos (data_hora_agendamento);
CREATE INDEX idx_agendamentos_comprovante_doc_id ON agendamentos (comprovante_doc_id);
CREATE INDEX idx_agendamentos_confirmed_by ON agendamentos (confirmed_by);

-- ---------------------------------------------------------------------------
-- 7.2 viagens
-- ---------------------------------------------------------------------------
CREATE TABLE viagens (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitacao_id          UUID NOT NULL REFERENCES solicitacoes(id),
    tipo                    TEXT NOT NULL CHECK (tipo IN (
                                'IDA', 'RETORNO', 'IDA_E_VOLTA'
                            )),
    modal                   TEXT NOT NULL CHECK (modal IN (
                                'AEREO', 'TERRESTRE', 'FLUVIAL'
                            )),
    origem_cidade           TEXT NOT NULL,
    origem_uf               TEXT NOT NULL,
    destino_cidade          TEXT NOT NULL,
    destino_uf              TEXT NOT NULL,
    com_pernoite            BOOLEAN DEFAULT FALSE,
    data_embarque_prevista  DATE NOT NULL,
    data_embarque_real      DATE,
    situacao                TEXT DEFAULT 'AGUARDANDO_EMISSAO' CHECK (situacao IN (
                                'AGUARDANDO_EMISSAO', 'EMITIDA',
                                'REMARCADA', 'CANCELADA',
                                'NO_SHOW', 'UTILIZADA'
                            )),
    embarcou                BOOLEAN,
    embarcou_registrado_por UUID REFERENCES usuarios(id),
    embarcou_registrado_em  TIMESTAMPTZ,
    medif_necessario        BOOLEAN DEFAULT FALSE,
    medif_descricao         TEXT,
    valor                   DECIMAL(12,2),
    taxas                   DECIMAL(12,2),
    companhia               TEXT,
    numero_bilhete          TEXT,
    emissor_id              UUID REFERENCES usuarios(id),
    emitido_em              TIMESTAMPTZ,
    observacoes             TEXT,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_viagens_solicitacao_id ON viagens (solicitacao_id);
CREATE INDEX idx_viagens_situacao ON viagens (situacao);
CREATE INDEX idx_viagens_data_embarque_prevista ON viagens (data_embarque_prevista);
CREATE INDEX idx_viagens_emissor_id ON viagens (emissor_id);
CREATE INDEX idx_viagens_embarcou_registrado_por ON viagens (embarcou_registrado_por);

-- ---------------------------------------------------------------------------
-- 7.3 remarcacoes
-- ---------------------------------------------------------------------------
CREATE TABLE remarcacoes (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    viagem_id               UUID NOT NULL REFERENCES viagens(id),
    motivo_remarcacao       TEXT NOT NULL,
    nova_data_embarque      DATE NOT NULL,
    impacto_nas_diarias     DECIMAL(12,2),
    solicitada_por          UUID REFERENCES usuarios(id),
    solicitada_em           TIMESTAMPTZ DEFAULT NOW(),
    aprovada_por            UUID REFERENCES usuarios(id),
    status                  TEXT DEFAULT 'PENDENTE' CHECK (status IN (
                                'PENDENTE', 'APROVADA', 'REJEITADA'
                            ))
);

CREATE INDEX idx_remarcacoes_viagem_id ON remarcacoes (viagem_id);
CREATE INDEX idx_remarcacoes_status ON remarcacoes (status);
CREATE INDEX idx_remarcacoes_solicitada_por ON remarcacoes (solicitada_por);
CREATE INDEX idx_remarcacoes_aprovada_por ON remarcacoes (aprovada_por);


-- ============================================================================
-- 8. FINANCIAL
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 8.1 tabela_diarias
-- ---------------------------------------------------------------------------
CREATE TABLE tabela_diarias (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_beneficiario   TEXT CHECK (tipo_beneficiario IN ('PACIENTE', 'ACOMPANHANTE')),
    valor_diaria        DECIMAL(12,2) NOT NULL,
    data_vigencia_inicio DATE NOT NULL,
    data_vigencia_fim   DATE,
    referencia_legal    TEXT,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tabela_diarias_tipo_beneficiario ON tabela_diarias (tipo_beneficiario);
CREATE INDEX idx_tabela_diarias_vigencia ON tabela_diarias (data_vigencia_inicio, data_vigencia_fim);

-- ---------------------------------------------------------------------------
-- 8.2 ajudas_custo
-- ---------------------------------------------------------------------------
CREATE TABLE ajudas_custo (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitacao_id    UUID NOT NULL REFERENCES solicitacoes(id),
    tipo              TEXT NOT NULL CHECK (tipo IN ('PACIENTE', 'ACOMPANHANTE')),
    data_inicio       DATE NOT NULL,
    data_fim          DATE,
    dias_internacao   INTEGER DEFAULT 0,
    dias_elegiveis    INTEGER GENERATED ALWAYS AS (
                          GREATEST(0, COALESCE(data_fim - data_inicio, 0) - dias_internacao)
                      ) STORED,
    valor_diaria      DECIMAL(12,2) NOT NULL,
    valor_total       DECIMAL(12,2),
    status            TEXT DEFAULT 'EM_ANALISE' CHECK (status IN (
                          'EM_ANALISE', 'APROVADA', 'EM_PAGAMENTO',
                          'CONCLUIDA', 'GLOSADA'
                      )),
    dados_bancarios_id UUID REFERENCES dados_bancarios(id),
    aprovado_por      UUID REFERENCES usuarios(id),
    aprovado_em       TIMESTAMPTZ,
    pago_por          UUID REFERENCES usuarios(id),
    pago_em           TIMESTAMPTZ,
    observacoes       TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ajudas_custo_solicitacao_id ON ajudas_custo (solicitacao_id);
CREATE INDEX idx_ajudas_custo_status ON ajudas_custo (status);
CREATE INDEX idx_ajudas_custo_tipo ON ajudas_custo (tipo);
CREATE INDEX idx_ajudas_custo_dados_bancarios_id ON ajudas_custo (dados_bancarios_id);
CREATE INDEX idx_ajudas_custo_aprovado_por ON ajudas_custo (aprovado_por);
CREATE INDEX idx_ajudas_custo_pago_por ON ajudas_custo (pago_por);


-- ============================================================================
-- 9. STAY & EXTENSIONS
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 9.1 permanencias
-- ---------------------------------------------------------------------------
CREATE TABLE permanencias (
    id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitacao_id            UUID NOT NULL REFERENCES solicitacoes(id),
    data_comunicacao          DATE NOT NULL,
    comunicado_por            TEXT CHECK (comunicado_por IN (
                                  'PACIENTE', 'RESPONSAVEL',
                                  'UNIDADE_DESTINO', 'REGIONAL'
                              )),
    motivo                    TEXT NOT NULL,
    motivo_descricao          TEXT,
    nova_data_retorno_prevista DATE NOT NULL,
    registrado_por            UUID REFERENCES usuarios(id),
    created_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_permanencias_solicitacao_id ON permanencias (solicitacao_id);
CREATE INDEX idx_permanencias_registrado_por ON permanencias (registrado_por);

-- ---------------------------------------------------------------------------
-- 9.2 prorrogacoes
-- ---------------------------------------------------------------------------
CREATE TABLE prorrogacoes (
    id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permanencia_id                UUID NOT NULL REFERENCES permanencias(id),
    justificativa_medica          TEXT NOT NULL,
    documento_justificativa_id    UUID REFERENCES documentos(id),
    dias_adicionais_solicitados   INTEGER NOT NULL,
    nova_data_retorno             DATE NOT NULL,
    impacto_diarias_valor         DECIMAL(12,2),
    nova_passagem_necessaria      BOOLEAN DEFAULT FALSE,
    decisao                       TEXT DEFAULT 'PENDENTE' CHECK (decisao IN (
                                      'APROVADA', 'INDEFERIDA', 'PENDENTE'
                                  )),
    decisao_por                   UUID REFERENCES usuarios(id),
    decisao_em                    TIMESTAMPTZ,
    justificativa_decisao         TEXT,
    complemento_ajuda_id          UUID REFERENCES ajudas_custo(id),
    created_at                    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_prorrogacoes_permanencia_id ON prorrogacoes (permanencia_id);
CREATE INDEX idx_prorrogacoes_decisao ON prorrogacoes (decisao);
CREATE INDEX idx_prorrogacoes_documento_justificativa_id ON prorrogacoes (documento_justificativa_id);
CREATE INDEX idx_prorrogacoes_decisao_por ON prorrogacoes (decisao_por);
CREATE INDEX idx_prorrogacoes_complemento_ajuda_id ON prorrogacoes (complemento_ajuda_id);


-- ============================================================================
-- 10. CLOSURE
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 10.1 encerramentos
-- ---------------------------------------------------------------------------
CREATE TABLE encerramentos (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitacao_id        UUID NOT NULL REFERENCES solicitacoes(id),
    motivo                TEXT NOT NULL CHECK (motivo IN (
                              'ALTA_MEDICA', 'TRANSFERENCIA',
                              'DESISTENCIA', 'ABANDONO', 'OBITO'
                          )),
    data_encerramento     DATE NOT NULL,
    relatorio_alta_doc_id UUID REFERENCES documentos(id),
    observacoes           TEXT,
    registrado_por        UUID REFERENCES usuarios(id),
    created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_encerramentos_solicitacao_id ON encerramentos (solicitacao_id);
CREATE INDEX idx_encerramentos_motivo ON encerramentos (motivo);
CREATE INDEX idx_encerramentos_relatorio_alta_doc_id ON encerramentos (relatorio_alta_doc_id);
CREATE INDEX idx_encerramentos_registrado_por ON encerramentos (registrado_por);


-- ============================================================================
-- 11. COMMUNICATION & NOTES
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 11.1 notificacoes
-- ---------------------------------------------------------------------------
CREATE TABLE notificacoes (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitacao_id    UUID REFERENCES solicitacoes(id),
    tipo              TEXT NOT NULL,
    canal             TEXT CHECK (canal IN ('EMAIL', 'SMS', 'WHATSAPP', 'SISTEMA')),
    destinatario      TEXT,
    destinatario_tipo TEXT CHECK (destinatario_tipo IN (
                          'USUARIO_SISTEMA', 'PACIENTE', 'RESPONSAVEL'
                      )),
    conteudo          TEXT NOT NULL,
    status            TEXT DEFAULT 'PENDENTE' CHECK (status IN (
                          'PENDENTE', 'ENVIADO', 'FALHOU'
                      )),
    tentativas        INTEGER DEFAULT 0,
    enviado_em        TIMESTAMPTZ,
    erro              TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notificacoes_solicitacao_id ON notificacoes (solicitacao_id);
CREATE INDEX idx_notificacoes_status ON notificacoes (status);
CREATE INDEX idx_notificacoes_canal ON notificacoes (canal);
CREATE INDEX idx_notificacoes_destinatario_tipo ON notificacoes (destinatario_tipo);

-- ---------------------------------------------------------------------------
-- 11.2 observacoes_processo
-- ---------------------------------------------------------------------------
CREATE TABLE observacoes_processo (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitacao_id      UUID NOT NULL REFERENCES solicitacoes(id),
    autor_id            UUID NOT NULL REFERENCES usuarios(id),
    perfil_autor        TEXT NOT NULL,
    setor_destinatario  TEXT CHECK (setor_destinatario IN (
                            'REGULACAO', 'PASSAGENS', 'FINANCEIRO',
                            'COORDENACAO', 'TODOS'
                        )),
    conteudo            TEXT NOT NULL,
    lida                BOOLEAN DEFAULT FALSE,
    lida_em             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_observacoes_processo_solicitacao_id ON observacoes_processo (solicitacao_id);
CREATE INDEX idx_observacoes_processo_autor_id ON observacoes_processo (autor_id);
CREATE INDEX idx_observacoes_processo_setor_destinatario ON observacoes_processo (setor_destinatario);
CREATE INDEX idx_observacoes_processo_lida ON observacoes_processo (lida);


-- ============================================================================
-- 12. AUDIT LOG
-- ============================================================================

CREATE TABLE log_auditoria (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitacao_id    UUID REFERENCES solicitacoes(id),
    usuario_id        UUID REFERENCES usuarios(id),
    perfil_usuario    TEXT,
    acao              TEXT NOT NULL,
    entidade_alterada TEXT,
    entidade_id       UUID,
    campo_alterado    TEXT,
    valor_anterior    JSONB,
    valor_novo        JSONB,
    ip                TEXT,
    user_agent        TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_log_auditoria_solicitacao_id ON log_auditoria (solicitacao_id);
CREATE INDEX idx_log_auditoria_usuario_id ON log_auditoria (usuario_id);
CREATE INDEX idx_log_auditoria_acao ON log_auditoria (acao);
CREATE INDEX idx_log_auditoria_entidade_alterada ON log_auditoria (entidade_alterada);
CREATE INDEX idx_log_auditoria_created_at ON log_auditoria (created_at);


-- ============================================================================
-- 13. TRIGGERS: updated_at
-- ============================================================================

CREATE TRIGGER trg_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_pacientes_updated_at
    BEFORE UPDATE ON pacientes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_solicitacoes_updated_at
    BEFORE UPDATE ON solicitacoes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_agendamentos_updated_at
    BEFORE UPDATE ON agendamentos
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_viagens_updated_at
    BEFORE UPDATE ON viagens
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_ajudas_custo_updated_at
    BEFORE UPDATE ON ajudas_custo
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================================
-- 14. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE municipios           ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios             ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE acompanhantes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE dados_bancarios      ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitacoes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE pareceres            ENABLE ROW LEVEL SECURITY;
ALTER TABLE exigencias           ENABLE ROW LEVEL SECURITY;
ALTER TABLE rotas_regulacao      ENABLE ROW LEVEL SECURITY;
ALTER TABLE cobrancas_externas   ENABLE ROW LEVEL SECURITY;
ALTER TABLE validacoes_rpb       ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos         ENABLE ROW LEVEL SECURITY;
ALTER TABLE viagens              ENABLE ROW LEVEL SECURITY;
ALTER TABLE remarcacoes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tabela_diarias       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ajudas_custo         ENABLE ROW LEVEL SECURITY;
ALTER TABLE permanencias         ENABLE ROW LEVEL SECURITY;
ALTER TABLE prorrogacoes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE encerramentos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE observacoes_processo ENABLE ROW LEVEL SECURITY;
ALTER TABLE log_auditoria        ENABLE ROW LEVEL SECURITY;

-- Permissive policies for authenticated users (to be refined per role later)
CREATE POLICY "Authenticated users full access" ON municipios           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON usuarios             FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON pacientes            FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON acompanhantes        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON dados_bancarios      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON solicitacoes         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON documentos           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON pareceres            FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON exigencias           FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON rotas_regulacao      FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON cobrancas_externas   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON validacoes_rpb       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON agendamentos         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON viagens              FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON remarcacoes          FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON tabela_diarias       FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON ajudas_custo         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON permanencias         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON prorrogacoes         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON encerramentos        FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON notificacoes         FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON observacoes_processo FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users full access" ON log_auditoria        FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ============================================================================
-- 15. SEED DATA
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 15.1 Municipios do Maranhao (principais)
-- ---------------------------------------------------------------------------
INSERT INTO municipios (nome, regional, uf, codigo_ibge, populacao) VALUES
    ('Sao Luis',     'Sao Luis',     'MA', '2111300', 1108975),
    ('Imperatriz',   'Imperatriz',   'MA', '2105302', 259337),
    ('Caxias',       'Caxias',       'MA', '2103000', 165525),
    ('Timon',        'Caxias',       'MA', '2112209', 169107),
    ('Codo',         'Codo',         'MA', '2103307', 122597),
    ('Acailandia',   'Imperatriz',   'MA', '2100055', 113121),
    ('Bacabal',      'Bacabal',      'MA', '2101202', 104633),
    ('Balsas',       'Balsas',       'MA', '2101400', 97678);

-- ---------------------------------------------------------------------------
-- 15.2 Tabela de diarias vigente
-- ---------------------------------------------------------------------------
INSERT INTO tabela_diarias (tipo_beneficiario, valor_diaria, data_vigencia_inicio, referencia_legal) VALUES
    ('PACIENTE',      24.75, '2024-01-01', 'Portaria GM/MS n. 55/1999 - Anexo III'),
    ('ACOMPANHANTE',  24.75, '2024-01-01', 'Portaria GM/MS n. 55/1999 - Anexo III');


-- ============================================================================
-- FIM DO SCHEMA INICIAL
-- ============================================================================
