-- ============================================================
-- TFD — Migration 055: doador é por SOLICITAÇÃO, não por pessoa
-- Move o flag `doador` de `acompanhantes` para
-- `solicitacao_acompanhantes`. Um mesmo acompanhante pode ser
-- doador em uma solicitação e não-doador em outra.
-- ============================================================

ALTER TABLE solicitacao_acompanhantes
  ADD COLUMN IF NOT EXISTS doador BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN solicitacao_acompanhantes.doador IS
  'Indica que ESTE acompanhante é doador (órgão/tecido) NESTA solicitação. Para BPA, conta como paciente.';

-- Backfill: se algum registro foi gravado com doador=true na coluna
-- antiga (migration 054), propaga para todas as solicitações ativas.
UPDATE solicitacao_acompanhantes sa
SET doador = true
FROM acompanhantes a
WHERE sa.acompanhante_id = a.id
  AND a.doador = true;

-- Remove a coluna antiga (não é mais usada).
ALTER TABLE acompanhantes
  DROP COLUMN IF EXISTS doador;
