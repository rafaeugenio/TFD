-- ============================================================
-- TFD — Migration 061: status da ajuda de custo simplificado
--
-- O status da ajuda de custo passa a ser apenas controle interno, sem ciclo
-- de aprovação: EMITIDO, CONCLUIDO, GLOSADA. Adiciona `concluido_em` (data em
-- que a ajuda foi concluída), usada no KPI "Total em diárias mês".
--
-- Mapeamento dos status legados:
--   EM_ANALISE / APROVADA / EM_PAGAMENTO / PAGO_PARCIALMENTE -> EMITIDO
--   CONCLUIDA -> CONCLUIDO
--   GLOSADA   -> GLOSADA
-- ============================================================

-- 1. Remove qualquer CHECK de status (nome variou entre migrations).
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'ajudas_custo'::regclass AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE 'ALTER TABLE ajudas_custo DROP CONSTRAINT ' || quote_ident(c.conname);
  END LOOP;
END $$;

-- 2. Coluna de data de conclusão.
ALTER TABLE ajudas_custo ADD COLUMN IF NOT EXISTS concluido_em DATE;

-- 3. Migra os dados (sem o CHECK antigo no caminho).
UPDATE ajudas_custo SET concluido_em = data_fim
  WHERE status = 'CONCLUIDA' AND concluido_em IS NULL;
UPDATE ajudas_custo SET status = 'EMITIDO'
  WHERE status IN ('EM_ANALISE', 'APROVADA', 'EM_PAGAMENTO', 'PAGO_PARCIALMENTE');
UPDATE ajudas_custo SET status = 'CONCLUIDO' WHERE status = 'CONCLUIDA';

-- 4. Novo CHECK + default.
ALTER TABLE ajudas_custo
  ADD CONSTRAINT ajudas_custo_status_check CHECK (status IN ('EMITIDO', 'CONCLUIDO', 'GLOSADA'));
ALTER TABLE ajudas_custo ALTER COLUMN status SET DEFAULT 'EMITIDO';
