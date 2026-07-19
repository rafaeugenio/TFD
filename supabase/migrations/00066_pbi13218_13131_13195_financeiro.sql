-- ============================================================
-- TFD — Migration 065: PBI 13218 / 13131 / 13195 — Fase 2 Financeiro
-- ============================================================
-- Três mudanças aditivas, sem impacto em dados existentes:
--
-- 1. PBI 13218 — cada ajuda de custo abre um processo próprio no SEI
--    (distinto do processo da solicitação). Adiciona `numero_sei` e
--    `link_processo` em `ajudas_custo`. Colunas ficam NULLABLE no banco
--    (registros antigos não têm o dado); a obrigatoriedade é validada no
--    formulário do front para toda ajuda de custo criada/editada a partir
--    de agora.
--
-- 2. PBI 13131 — sinalização de "Passagens concluídas": o time de
--    Passagens marca quando terminou de lançar todas as passagens da
--    solicitação, e o time de Ajuda de Custo enxerga essa marcação.
--    Adiciona `passagens_concluidas` em `solicitacoes` (default false).
--
-- 3. PBI 13195 — o despacho financeiro passa a referenciar uma ajuda de
--    custo específica da solicitação (pelo processo SEI próprio dela).
--    Adiciona `ajuda_custo_id` em `despachos_financeiros`, FK opcional
--    para `ajudas_custo`.
-- ============================================================

ALTER TABLE ajudas_custo
  ADD COLUMN IF NOT EXISTS numero_sei TEXT,
  ADD COLUMN IF NOT EXISTS link_processo TEXT;

ALTER TABLE solicitacoes
  ADD COLUMN IF NOT EXISTS passagens_concluidas BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE despachos_financeiros
  ADD COLUMN IF NOT EXISTS ajuda_custo_id UUID REFERENCES ajudas_custo(id);
