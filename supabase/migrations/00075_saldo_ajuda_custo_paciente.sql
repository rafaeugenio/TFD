-- ============================================================
-- TFD — Migration 075: Saldo de ajuda de custo por paciente
-- ============================================================
-- Discovery com o setor de Ajuda de Custo (09/08/2026, refinado em
-- 11/08/2026). Quando a volta de uma ajuda de custo é antecipada, ou uma
-- ajuda subtrativa aponta que o paciente ficou menos dias do que o pago,
-- a diferença NUNCA é devolvida em dinheiro — vira crédito do paciente
-- para abater no pagamento de uma ajuda futura (qualquer solicitação,
-- não só a que originou o crédito).
--
-- Espelha `MovimentacaoSaldoMock` (src/core/mocks/fluxo-v2-v3-seed.ts) e é
-- lido/gravado via src/app/fluxo-v2/_state/saldoAjudaCustoStore.ts, no
-- mesmo padrão fire-and-forget de src/app/fluxo-v2/_state/persist.ts.
--
-- O saldo do paciente é sempre DERIVADO — soma de créditos menos débitos
-- desta tabela — nunca um valor materializado numa coluna própria.
-- ============================================================

CREATE TABLE IF NOT EXISTS movimentacoes_saldo_ajuda_custo (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paciente_id                 UUID NOT NULL REFERENCES pacientes(id),
    tipo                        TEXT NOT NULL CHECK (tipo IN ('CREDITO', 'DEBITO')),
    valor                       DECIMAL(12,2) NOT NULL CHECK (valor >= 0),
    motivo                      TEXT NOT NULL,
    -- Número da solicitação onde o crédito foi gerado (volta antecipada ou
    -- ajuda subtrativa).
    solicitacao_origem_numero   TEXT,
    -- Número da solicitação onde o débito foi aplicado (abatimento no
    -- pagamento de uma ajuda de custo futura).
    solicitacao_destino_numero  TEXT,
    registrado_por              UUID REFERENCES usuarios(id),
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mov_saldo_ajuda_custo_paciente_id
    ON movimentacoes_saldo_ajuda_custo (paciente_id);
CREATE INDEX idx_mov_saldo_ajuda_custo_paciente_created
    ON movimentacoes_saldo_ajuda_custo (paciente_id, created_at);

COMMENT ON TABLE movimentacoes_saldo_ajuda_custo IS
    'Créditos/débitos de saldo de ajuda de custo entre ciclos do paciente. Saldo = SUM(CREDITO) − SUM(DEBITO), sempre derivado, nunca materializado.';
COMMENT ON COLUMN movimentacoes_saldo_ajuda_custo.tipo IS
    'CREDITO: volta antecipada ou ajuda subtrativa gerou sobra a favor do paciente. DEBITO: saldo abatido no pagamento de uma ajuda de custo futura.';
COMMENT ON COLUMN movimentacoes_saldo_ajuda_custo.solicitacao_origem_numero IS
    'Número da solicitação onde o crédito foi gerado.';
COMMENT ON COLUMN movimentacoes_saldo_ajuda_custo.solicitacao_destino_numero IS
    'Número da solicitação onde o débito foi aplicado.';
