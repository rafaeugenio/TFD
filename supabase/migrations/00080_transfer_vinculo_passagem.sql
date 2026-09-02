-- ============================================================
-- TFD — Migration 080: vínculo do transfer com a passagem
-- ============================================================
-- Pedido do Rafael (26/08/2026) — o setor de Passagens vinha cadastrando
-- transfer como se fosse passagem terrestre. São coisas diferentes: o
-- modal TRANSFER já existe em `viagens.modal` desde a migration 00036,
-- mas nunca ganhou um jeito de amarrar o transfer à passagem com a qual
-- ele é comprado junto.
--
-- Esta coluna guarda esse vínculo (self-reference em `viagens`). Fica
-- nula pra aéreo/terrestre/fluvial e é obrigatória, na regra do front, só
-- para modal = TRANSFER. No BPA o transfer continua contando igual à
-- passagem terrestre (sem mudança). Um relatório financeiro futuro vai
-- diferenciar os dois — transfer não entra como bilhete, terrestre entra
-- — mas esse relatório ainda não existe.
-- ============================================================

ALTER TABLE viagens
  ADD COLUMN IF NOT EXISTS viagem_vinculada_id UUID REFERENCES viagens(id);

CREATE INDEX IF NOT EXISTS idx_viagens_viagem_vinculada_id ON viagens (viagem_vinculada_id);

COMMENT ON COLUMN viagens.viagem_vinculada_id IS
  'Preenchida só quando modal = TRANSFER: id da passagem (outra linha de viagens) à qual o transfer está vinculado, por ser comprado junto com ela.';
