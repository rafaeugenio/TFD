-- ============================================================
-- TFD — Migration 037: Complementos para o Fluxo v2
-- ============================================================
-- Objetivo: cobrir as lacunas entre o mock SolicitacaoMock e o
-- schema atual do Supabase, permitindo que o FluxoV2Provider
-- passe a ler/escrever dados reais.
--
-- Mudanças:
--   1. solicitacoes.setor_atual           (workflow de setor)
--   2. pareceres: tipo, cid_principal,
--      cid_secundario, versao_cid          (tipo de parecer + CIDs)
--   3. rotas_regulacao: outros_*           (carimbo "OUTROS")
--   4. pacientes: nome_mae, zona_regional  (padrão SUS)
--   5. tentativas_agendamento: colunas para tentativa confirmada
-- ============================================================

-- 1. SOLICITAÇÕES — setor_atual
ALTER TABLE solicitacoes
  ADD COLUMN IF NOT EXISTS setor_atual TEXT
    DEFAULT 'dados_basicos'
    CHECK (setor_atual IN ('dados_basicos', 'regulacao', 'financeiro', 'encerrada'));

CREATE INDEX IF NOT EXISTS idx_solicitacoes_setor_atual ON solicitacoes(setor_atual);

CREATE OR REPLACE FUNCTION setor_atual_from_status(status_in TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE
    WHEN status_in IN ('NOVO', 'EM_ANALISE', 'EXIGENCIA')
      THEN 'dados_basicos'
    WHEN status_in IN (
      'AGUARDANDO_REGULACAO',
      'AGUARDANDO_CNRAC',
      'AGUARDANDO_SETI',
      'AGUARDANDO_RESPOSTA_EXTERNA',
      'ENCAMINHADO_SERVICO_SOCIAL',
      'AGUARDANDO_AGENDAMENTO'
    )
      THEN 'regulacao'
    WHEN status_in IN (
      'AGUARDANDO_EMISSAO',
      'EMITIDA',
      'EM_VIAGEM',
      'EM_PERMANENCIA',
      'REMARCACAO',
      'EM_PAGAMENTO'
    )
      THEN 'financeiro'
    WHEN status_in IN ('CONCLUIDO', 'INDEFERIDO')
      THEN 'encerrada'
    ELSE 'dados_basicos'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

UPDATE solicitacoes
SET setor_atual = setor_atual_from_status(status)
WHERE setor_atual IS NULL OR setor_atual = 'dados_basicos';

CREATE OR REPLACE FUNCTION sync_setor_atual_from_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status
     AND NEW.setor_atual IS NOT DISTINCT FROM OLD.setor_atual
  THEN
    NEW.setor_atual := setor_atual_from_status(NEW.status);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_setor_atual ON solicitacoes;
CREATE TRIGGER trg_sync_setor_atual
  BEFORE UPDATE ON solicitacoes
  FOR EACH ROW EXECUTE FUNCTION sync_setor_atual_from_status();

-- 2. PARECERES — tipo + CIDs versionados
ALTER TABLE pareceres
  ADD COLUMN IF NOT EXISTS tipo TEXT
    CHECK (tipo IN (
      'tfd_completo',
      'sem_agendamento',
      'apenas_ajuda',
      'apenas_passagem',
      'prorrogacao',
      'medife'
    ));

ALTER TABLE pareceres
  ADD COLUMN IF NOT EXISTS cid_principal     TEXT,
  ADD COLUMN IF NOT EXISTS cid_secundario    TEXT,
  ADD COLUMN IF NOT EXISTS versao_cid        TEXT DEFAULT '10'
    CHECK (versao_cid IN ('10', '11'));

CREATE INDEX IF NOT EXISTS idx_pareceres_tipo ON pareceres(tipo);

-- 3. ROTAS_REGULACAO — CarimboOutrosInfo
ALTER TABLE rotas_regulacao
  ADD COLUMN IF NOT EXISTS outros_unidade_orgao TEXT,
  ADD COLUMN IF NOT EXISTS outros_forma_contato TEXT
    CHECK (outros_forma_contato IN ('email', 'telefone', 'sistema', 'presencial')),
  ADD COLUMN IF NOT EXISTS outros_observacao    TEXT;

-- 4. PACIENTES — nome_mae + zona_regional
ALTER TABLE pacientes
  ADD COLUMN IF NOT EXISTS nome_mae       TEXT,
  ADD COLUMN IF NOT EXISTS zona_regional  TEXT
    CHECK (zona_regional IN ('Norte', 'Sul', 'Leste', 'Oeste', 'Centro'));

-- 5. TENTATIVAS DE AGENDAMENTO — adicionar colunas para tentativas confirmadas
-- (tabela já existia com: id, solicitacao_id, unidade_nome, unidade_id,
--  data_contato, resultado, observacao, registrado_por, created_at)
ALTER TABLE tentativas_agendamento
  ADD COLUMN IF NOT EXISTS contato_unidade     TEXT,
  ADD COLUMN IF NOT EXISTS data_agendamento    DATE,
  ADD COLUMN IF NOT EXISTS hora_agendamento    TIME,
  ADD COLUMN IF NOT EXISTS tipo_procedimento   TEXT,
  ADD COLUMN IF NOT EXISTS observacoes_chegada TEXT;

ALTER TABLE tentativas_agendamento
  DROP CONSTRAINT IF EXISTS tentativas_agendamento_resultado_check;
ALTER TABLE tentativas_agendamento
  ADD CONSTRAINT tentativas_agendamento_resultado_check
  CHECK (resultado IN ('NEGOU', 'PEDIU_DOCUMENTACAO', 'ACEITOU', 'AGUARDANDO', 'AGENDAMENTO_CONFIRMADO'));

ALTER TABLE tentativas_agendamento
  DROP CONSTRAINT IF EXISTS tentativas_agendamento_tipo_procedimento_check;
ALTER TABLE tentativas_agendamento
  ADD CONSTRAINT tentativas_agendamento_tipo_procedimento_check
  CHECK (tipo_procedimento IS NULL OR tipo_procedimento IN (
    'CONSULTA', 'CIRURGIA', 'EXAME', 'TRATAMENTO', 'OUTRO'
  ));

-- Apenas UMA tentativa confirmada por solicitação (agendamento ativo)
CREATE UNIQUE INDEX IF NOT EXISTS uq_tentativa_confirmada_por_solicitacao
  ON tentativas_agendamento(solicitacao_id)
  WHERE resultado = 'AGENDAMENTO_CONFIRMADO';
