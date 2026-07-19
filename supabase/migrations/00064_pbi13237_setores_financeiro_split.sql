-- ============================================================
-- TFD — Migration 064: PBI 13237 — novos status/setores gerais
-- ============================================================
-- O antigo setor único "financeiro" é dividido em dois setores/times
-- distintos — "passagens" e "ajuda_custo" — e entra um estágio
-- pós-financeiro "acompanhamento" (acompanhamento da viagem/tratamento)
-- antes do "encerramento" (substitui o antigo rótulo "encerrada").
--
-- Migration aditiva: amplia o CHECK de setor_atual para os 6 valores
-- novos, mantendo 'financeiro' e 'encerrada' aceitos por compatibilidade
-- (linhas antigas não seriam mais gravadas com esses valores, mas o
-- CHECK antigo não é removido de forma destrutiva). Atualiza a função
-- setor_atual_from_status() (usada pelo trigger trg_sync_setor_atual)
-- para a nova granularidade e faz um backfill não destrutivo das linhas
-- existentes.
--
-- Mapeamento status detalhado → novo setor:
--   NOVO, EM_ANALISE, EXIGENCIA                              → dados_basicos
--   AGUARDANDO_REGULACAO, AGUARDANDO_CNRAC, AGUARDANDO_SETI,
--   AGUARDANDO_RESPOSTA_EXTERNA, ENCAMINHADO_SERVICO_SOCIAL,
--   AGUARDANDO_AGENDAMENTO                                   → regulacao
--   AGUARDANDO_EMISSAO, EMITIDA, REMARCACAO                  → passagens
--   EM_PAGAMENTO                                             → ajuda_custo
--   EM_VIAGEM, EM_PERMANENCIA                                → acompanhamento
--   CONCLUIDO, INDEFERIDO                                    → encerramento
-- ============================================================

-- 1. Amplia o CHECK de setor_atual (aditivo — mantém os valores legados).
ALTER TABLE solicitacoes DROP CONSTRAINT IF EXISTS solicitacoes_setor_atual_check;
ALTER TABLE solicitacoes
  ADD CONSTRAINT solicitacoes_setor_atual_check
  CHECK (setor_atual IN (
    'dados_basicos', 'regulacao', 'passagens', 'ajuda_custo', 'acompanhamento', 'encerramento',
    -- legados — mantidos apenas para não quebrar linhas antigas não migradas
    'financeiro', 'encerrada'
  ));

-- 2. Nova função de derivação setor_atual ← status.
CREATE OR REPLACE FUNCTION setor_atual_from_status(status_in TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE
    WHEN status_in IN ('NOVO', 'EM_ANALISE', 'EXIGENCIA')
      THEN 'dados_basicos'
    WHEN status_in IN (
      'AGUARDANDO_REGULACAO',
      'AGUARDANDO_CNRAC',
      'AGUARDANDO_SETI',
      'AGUARDANDO_RESPOSTA_EXTERNA',
      'ENCAMINHADO_SERVICO_SOCIAL',
      'AGUARDANDO_AGENDAMENTO'
    )
      THEN 'regulacao'
    WHEN status_in IN ('AGUARDANDO_EMISSAO', 'EMITIDA', 'REMARCACAO')
      THEN 'passagens'
    WHEN status_in = 'EM_PAGAMENTO'
      THEN 'ajuda_custo'
    WHEN status_in IN ('EM_VIAGEM', 'EM_PERMANENCIA')
      THEN 'acompanhamento'
    WHEN status_in IN ('CONCLUIDO', 'INDEFERIDO')
      THEN 'encerramento'
    ELSE 'dados_basicos'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 3. Backfill não destrutivo: recalcula setor_atual de TODAS as linhas com
--    a nova granularidade (a função antiga colapsava passagens/ajuda_custo/
--    acompanhamento em 'financeiro' e encerramento em 'encerrada').
UPDATE solicitacoes
SET setor_atual = setor_atual_from_status(status);

-- trg_sync_setor_atual (definido na migration 037) continua válido — ele só
-- reinvoca setor_atual_from_status() quando o status muda, então já usa a
-- nova granularidade automaticamente.
