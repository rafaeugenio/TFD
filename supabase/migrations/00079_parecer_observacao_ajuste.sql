-- ============================================================
-- TFD — Migration 079: observação de ajuste no parecer médico
-- ============================================================
-- Pedido do Rafael (18/08/2026) — a enfermeira da Regulação revisa os
-- pareceres emitidos pelo médico e, quando encontra um erro, hoje devolve
-- fora do sistema (fonte de retrabalho). Passa a registrar uma observação
-- de ajuste diretamente no parecer.
--
-- A coluna é o próprio indicador do estado "ajuste": presença de valor
-- significa parecer em ajuste, independentemente do que estiver em
-- `decisao` (que continua sempre a decisão do médico, não muda com o
-- ajuste). O médico lê a observação, corrige o parecer e a remove ao
-- salvar — o UPDATE que grava a correção também zera esta coluna,
-- finalizando o ajuste. Nullable: nenhum parecer nasce em ajuste.
-- ============================================================

ALTER TABLE pareceres
  ADD COLUMN IF NOT EXISTS observacao_ajuste TEXT;
