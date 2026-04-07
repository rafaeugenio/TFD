-- ============================================================
-- TFD — Migration 017: Ajuda de Custo — Pago Parcialmente
-- Adiciona valor_pago, status PAGO_PARCIALMENTE, remove EM_PAGAMENTO
-- ============================================================

-- ─── NOVA COLUNA valor_pago ────────────────────────────────
ALTER TABLE ajudas_custo ADD COLUMN IF NOT EXISTS valor_pago DECIMAL(12,2);

-- ─── MIGRAR EM_PAGAMENTO → APROVADA (antes de atualizar constraint) ─
UPDATE ajudas_custo SET status = 'APROVADA' WHERE status = 'EM_PAGAMENTO';

-- ─── ATUALIZAR CHECK CONSTRAINT DO STATUS ──────────────────
ALTER TABLE ajudas_custo DROP CONSTRAINT IF EXISTS ajudas_custo_status_check;
ALTER TABLE ajudas_custo ADD CONSTRAINT ajudas_custo_status_check
  CHECK (status IN ('EM_ANALISE', 'APROVADA', 'CONCLUIDA', 'PAGO_PARCIALMENTE', 'GLOSADA'));
