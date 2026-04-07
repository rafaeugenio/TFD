-- ============================================================
-- TFD — Migration 016: Ajuda de Custo — Múltiplos Períodos
-- Remove status_gerencial (controle manual) e ajusta schema
-- para suportar N períodos por solicitação.
-- ============================================================

-- ─── REMOVER STATUS GERENCIAL ──────────────────────────────
-- O controle agora é feito via status do fluxo (EM_ANALISE, APROVADA, etc.)
ALTER TABLE ajudas_custo DROP COLUMN IF EXISTS status_gerencial;

-- Remover seeds de tabela auxiliar do status_ajuda_custo
DELETE FROM tabelas_auxiliares WHERE categoria = 'status_ajuda_custo';

-- ─── TORNAR dados_bancarios_id OPCIONAL ────────────────────
-- Ajuda de custo pode ser criada antes de ter dados bancários vinculados
ALTER TABLE ajudas_custo ALTER COLUMN dados_bancarios_id DROP NOT NULL;
