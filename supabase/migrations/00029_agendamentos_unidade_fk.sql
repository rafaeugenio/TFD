-- ============================================================
-- TFD — Migration 029: FK unidade_destino_id em agendamentos
-- Permite vincular agendamentos a unidades pre-cadastradas
-- ============================================================

ALTER TABLE agendamentos ADD COLUMN IF NOT EXISTS unidade_destino_id UUID REFERENCES unidades_destino(id);

CREATE INDEX IF NOT EXISTS idx_agendamentos_unidade_destino ON agendamentos(unidade_destino_id);
