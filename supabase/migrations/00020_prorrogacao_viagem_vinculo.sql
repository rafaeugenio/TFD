-- ============================================================
-- TFD — Migration 020: Prorrogação — Vínculo com viagem
-- Adiciona FK para viagem de retorno da prorrogação
-- ============================================================

ALTER TABLE prorrogacoes ADD COLUMN IF NOT EXISTS viagem_prorrogacao_id UUID REFERENCES viagens(id);
