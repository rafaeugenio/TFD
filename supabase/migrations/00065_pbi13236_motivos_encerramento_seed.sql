-- ============================================================
-- TFD — Migration 065: PBI 13236 — completa seed de Motivos de
-- Encerramento e reorganiza grupos de Tabelas Auxiliares
-- ============================================================
-- No Dev (Angular/Spring), a tabela auxiliar "Motivos de Encerramento"
-- está ausente (bug 12813). O protótipo já tinha a categoria
-- 'motivo_encerramento' seedada desde a migration 002, mas faltavam
-- motivos plausíveis citados na PBI (Alta Definitiva, Tratamento
-- Concluído). Esta migration só adiciona os itens faltantes —
-- idempotente via ON CONFLICT (categoria, codigo) do UNIQUE existente.
--
-- A reorganização dos grupos na tela de Configurações (Motivos de
-- Encerramento → "Sistema e Acesso", Tipos de Despesa → "Passagens",
-- "Financeiro e Permanência" renomeado para "Ajuda de Custo") é só
-- de front-end e não exige mudança de schema.

INSERT INTO tabelas_auxiliares (categoria, codigo, nome, ordem) VALUES
  ('motivo_encerramento', 'ALTA_DEFINITIVA', 'Alta Definitiva', 6),
  ('motivo_encerramento', 'TRATAMENTO_CONCLUIDO', 'Tratamento Concluído', 7)
ON CONFLICT (categoria, codigo) DO NOTHING;
