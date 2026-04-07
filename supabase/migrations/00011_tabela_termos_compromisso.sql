-- =============================================================================
-- Migration 011: Tabela termos_compromisso
-- Digitalização do Termo de Compromisso (Gap C3)
-- Relação 1:1 com solicitações — obrigatório para avançar fluxo
-- =============================================================================

CREATE TABLE termos_compromisso (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id  UUID NOT NULL UNIQUE REFERENCES solicitacoes(id) ON DELETE CASCADE,
  numero_processo TEXT NOT NULL,

  -- Snapshot do paciente no momento do registro
  paciente_nome      TEXT NOT NULL,
  paciente_cpf       TEXT NOT NULL,
  paciente_rg        TEXT,
  paciente_cns       TEXT,
  paciente_endereco  TEXT,
  paciente_municipio TEXT,

  -- Aceite
  status             TEXT NOT NULL DEFAULT 'REGISTRADO'
                     CHECK (status IN ('PENDENTE', 'REGISTRADO')),
  modalidade_aceite  TEXT NOT NULL
                     CHECK (modalidade_aceite IN (
                       'ACEITE_PRESENCIAL',
                       'UPLOAD_ASSINADO',
                       'ASSINATURA_DIGITAL'
                     )),

  -- Responsável legal (menor de idade ou incapaz)
  responsavel_nome       VARCHAR(150),
  responsavel_cpf        VARCHAR(14),
  responsavel_parentesco TEXT
                         CHECK (responsavel_parentesco IS NULL OR responsavel_parentesco IN (
                           'PAI_MAE', 'CONJUGE', 'FILHO', 'IRMAO', 'TUTOR_LEGAL', 'OUTRO'
                         )),

  -- Upload de documento assinado
  arquivo_url  TEXT,
  arquivo_nome TEXT,

  -- Aceite presencial
  confirmacao_leitura BOOLEAN DEFAULT false,

  -- Metadata
  local_registro TEXT,
  data_registro  DATE NOT NULL DEFAULT CURRENT_DATE,
  registrado_por UUID REFERENCES usuarios(id),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_termos_compromisso_status
  ON termos_compromisso(status);

CREATE INDEX idx_termos_compromisso_data_registro
  ON termos_compromisso(data_registro);

-- RLS: acesso anônimo temporário (mesma política das demais tabelas — migration 005)
ALTER TABLE termos_compromisso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_termos_compromisso"
  ON termos_compromisso FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_termos_compromisso"
  ON termos_compromisso FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_update_termos_compromisso"
  ON termos_compromisso FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_delete_termos_compromisso"
  ON termos_compromisso FOR DELETE TO anon USING (true);
