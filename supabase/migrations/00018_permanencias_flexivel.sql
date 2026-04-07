-- ============================================================
-- TFD — Migration 018: Permanências — Campos flexíveis
-- Permite auto-criação de permanência ao adicionar prorrogação
-- ============================================================

-- ─── PERMANÊNCIAS: tornar campos opcionais ─────────────────
ALTER TABLE permanencias ALTER COLUMN data_comunicacao DROP NOT NULL;
ALTER TABLE permanencias ALTER COLUMN motivo DROP NOT NULL;
ALTER TABLE permanencias ALTER COLUMN nova_data_retorno_prevista DROP NOT NULL;

-- ─── PRORROGAÇÕES: documento não obrigatório ───────────────
ALTER TABLE prorrogacoes ALTER COLUMN documento_justificativa_id DROP NOT NULL;

-- ─── PRORROGAÇÕES: adicionar updated_at se não existir ─────
ALTER TABLE prorrogacoes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
