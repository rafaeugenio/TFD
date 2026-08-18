-- ============================================================
-- TFD — Migration 077: responsável pela solicitação em cada setor
-- ============================================================
-- Pedido do time do TFD (18/08/2026) — hoje o sistema só registra em qual
-- setor a solicitação está, nunca quem é a pessoa responsável por ela ali
-- dentro. A partir da primeira tramitação (saída de Dados Básicos), quem
-- envia para outro setor passa a escolher também a pessoa responsável.
--
-- O responsável muda a cada tramitação — a coluna guarda sempre a pessoa
-- ATUAL, sobrescrita no mesmo update que já troca `setor_atual`. Nullable:
-- solicitações que ainda não passaram por nenhuma tramitação ficam sem
-- responsável (estado neutro na UI, não erro).
-- ============================================================

ALTER TABLE solicitacoes
  ADD COLUMN IF NOT EXISTS responsavel_atual_id UUID REFERENCES usuarios(id);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_responsavel_atual_id
  ON solicitacoes (responsavel_atual_id);
