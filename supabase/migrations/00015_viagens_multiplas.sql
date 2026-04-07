-- 00015_viagens_multiplas.sql
-- Suporte a multiplas viagens por solicitacao (historico de remarcacoes, NO-SHOW, prorrogacoes).
-- Campos aditivos e nullable — seguro para aplicar com dados existentes.

ALTER TABLE viagens
  ADD COLUMN IF NOT EXISTS viagem_anterior_id UUID REFERENCES viagens(id),
  ADD COLUMN IF NOT EXISTS prorrogacao_id UUID REFERENCES prorrogacoes(id),
  ADD COLUMN IF NOT EXISTS motivo_cancelamento TEXT,
  ADD COLUMN IF NOT EXISTS numero_sequencial INTEGER DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_viagens_anterior ON viagens(viagem_anterior_id);
CREATE INDEX IF NOT EXISTS idx_viagens_prorrogacao ON viagens(prorrogacao_id);
