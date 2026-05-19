-- ============================================================
-- TFD — Migration 052: acompanhantes — sexo (obrigatório) e email (opcional)
-- Campos necessários para o relatório RPB (BPA) e cadastro padronizado
-- ============================================================

ALTER TABLE acompanhantes
  ADD COLUMN IF NOT EXISTS sexo TEXT
    CHECK (sexo IN ('MASCULINO', 'FEMININO', 'OUTRO')),
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill seguro para registros existentes (placeholder neutro)
UPDATE acompanhantes SET sexo = 'OUTRO' WHERE sexo IS NULL;

-- Torna obrigatório a partir de agora
ALTER TABLE acompanhantes
  ALTER COLUMN sexo SET NOT NULL;
