-- ============================================================
-- TFD — Migration 054: acompanhantes — flag "doador"
-- Quando true, o acompanhante é doador de órgão/tecido e deve
-- ser tratado como PACIENTE no cálculo SIGTAP do relatório BPA.
-- Visualmente, segue exibido como "Acompanhante Doador" na
-- solicitação.
-- ============================================================

ALTER TABLE acompanhantes
  ADD COLUMN IF NOT EXISTS doador BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN acompanhantes.doador IS
  'Indica acompanhante que também é doador (órgão/tecido). Para BPA, conta como paciente.';
