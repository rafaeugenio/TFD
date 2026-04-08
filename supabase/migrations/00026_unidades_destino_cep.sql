-- ============================================================
-- TFD — Migration 026: Adicionar CEP e índice CNES em unidades_destino
-- Colunas cnes, tipo, endereco e updated_at já existem (migration 002)
-- ============================================================

ALTER TABLE unidades_destino ADD COLUMN IF NOT EXISTS cep VARCHAR(10);

CREATE INDEX IF NOT EXISTS idx_unidades_cnes ON unidades_destino(cnes);
