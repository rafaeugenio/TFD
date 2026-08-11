-- ============================================================
-- TFD — Migration 076: Tipo de cálculo da ajuda de custo
-- ============================================================
-- Discovery com o setor de Ajuda de Custo (09/08/2026, refinado em
-- 11/08/2026) — quatro formas de lançar ajuda de custo, cada uma com regra
-- de cálculo própria. Espelha `AjudaCustoMock.tipoCalculo` /
-- `ajudaReferenciaId` (src/core/mocks/fluxo-v2-v3-seed.ts).
--
-- - PADRAO: diária completa em todos os dias, menos o último (diária de
--   retorno reduzida).
-- - INTEGRAL: todas as diárias completas.
-- - ADITIVA: dias a mais sobre uma ajuda já lançada na mesma solicitação
--   (`ajuda_referencia_id`).
-- - SUBTRATIVA: paciente ficou menos dias que o pago numa ajuda anterior
--   (`ajuda_referencia_id`); a diferença vira crédito, nunca é cobrada
--   nesta ajuda (`valor` fica implicitamente 0 no cálculo da aplicação).
--
-- `valor_diaria_final` guarda a diária escolhida para o último dia do
-- período (8,40 ou 24,75) — é essa escolha, e não mais só o tipo, que
-- decide o valor do último dia em qualquer um dos quatro tipos.
-- ============================================================

ALTER TABLE ajudas_custo
    ADD COLUMN IF NOT EXISTS tipo_calculo TEXT NOT NULL DEFAULT 'PADRAO'
        CHECK (tipo_calculo IN ('PADRAO', 'INTEGRAL', 'ADITIVA', 'SUBTRATIVA')),
    ADD COLUMN IF NOT EXISTS ajuda_referencia_id UUID REFERENCES ajudas_custo(id),
    ADD COLUMN IF NOT EXISTS valor_diaria_final DECIMAL(6,2);

CREATE INDEX IF NOT EXISTS idx_ajudas_custo_ajuda_referencia_id
    ON ajudas_custo (ajuda_referencia_id);

COMMENT ON COLUMN ajudas_custo.tipo_calculo IS
    'PADRAO (diária de retorno no último dia) · INTEGRAL (todas completas) · ADITIVA (complemento de dias) · SUBTRATIVA (correção de dias a menos, vira crédito).';
COMMENT ON COLUMN ajudas_custo.ajuda_referencia_id IS
    'Ajuda de custo anterior da mesma solicitação sendo complementada (ADITIVA) ou corrigida (SUBTRATIVA). Sempre aponta para um período base (PADRAO/INTEGRAL).';
COMMENT ON COLUMN ajudas_custo.valor_diaria_final IS
    'Diária escolhida para o último dia do período (8,40 = retorno, 24,75 = completa). Default por tipo quando ausente.';
