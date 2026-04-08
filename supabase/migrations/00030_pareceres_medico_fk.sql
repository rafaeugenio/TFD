-- ============================================================
-- TFD — Migration 030: FK medico_id em pareceres
-- Vincula pareceres a medicos cadastrados
-- ============================================================

ALTER TABLE pareceres ADD COLUMN IF NOT EXISTS medico_id UUID REFERENCES medicos(id);

CREATE INDEX IF NOT EXISTS idx_pareceres_medico_id ON pareceres(medico_id);
