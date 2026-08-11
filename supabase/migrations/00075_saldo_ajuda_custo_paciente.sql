-- ============================================================
-- TFD — Migration 075: Saldo de ajuda de custo por paciente
-- ============================================================
-- Discovery com o setor de Ajuda de Custo (09/08/2026, refinado em
-- 11/08/2026, corrigido quanto ao sinal do saldo em 11/08/2026 e corrigido
-- novamente em 11/08/2026 quanto à chave de agrupamento).
--
-- O saldo tem sinal:
-- - CREDITO → saldo POSITIVO: o paciente tem valor a receber (ex.: ajuda
--   aditiva lançada, cuja diferença ainda não foi paga a ele).
-- - DEBITO  → saldo NEGATIVO: o paciente recebeu a mais do que devia (ex.:
--   ajuda subtrativa, ou volta antecipada de uma ajuda já paga) e essa
--   diferença é descontada do próximo pagamento de ajuda de custo dele
--   (qualquer solicitação, não só a que originou o débito) — NUNCA
--   devolvida em dinheiro pelo paciente.
--
-- Chave de agrupamento (correção 11/08/2026): o saldo é agrupado por
-- `paciente_cpf`, não por `paciente_id`. O fluxo-v2 (mock, sem Supabase)
-- gera solicitações com ids de outro espaço de identificadores, distintos
-- do id real do paciente nesta tabela; o CPF é o único dado estável nos
-- dois mundos. `paciente_cpf` guarda só dígitos (normalizado na gravação e
-- na leitura). `paciente_id` é mantido como referência opcional, só para
-- rastreio da origem do lançamento, nunca usado para agrupar o saldo.
--
-- Espelha `MovimentacaoSaldoMock` (src/core/mocks/fluxo-v2-v3-seed.ts) e é
-- lido/gravado via src/app/fluxo-v2/_state/saldoAjudaCustoStore.ts, no
-- mesmo padrão fire-and-forget de src/app/fluxo-v2/_state/persist.ts.
--
-- O saldo do paciente é sempre DERIVADO — soma de créditos menos débitos
-- desta tabela — nunca um valor materializado numa coluna própria. Pode ser
-- positivo, negativo ou zero.
-- ============================================================

CREATE TABLE IF NOT EXISTS movimentacoes_saldo_ajuda_custo (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Chave real de agrupamento do saldo. Só dígitos (11 para CPF), sem
    -- máscara, para que o mesmo paciente nunca se fragmente por formatação.
    paciente_cpf                TEXT NOT NULL CHECK (paciente_cpf ~ '^[0-9]{11}$'),
    -- Referência opcional ao paciente na origem do lançamento — rastreio,
    -- nunca chave de agrupamento (o fluxo-v2 pode gerar lançamentos sem um
    -- id real de paciente ainda vinculado).
    paciente_id                 UUID REFERENCES pacientes(id),
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

CREATE INDEX idx_mov_saldo_ajuda_custo_paciente_cpf
    ON movimentacoes_saldo_ajuda_custo (paciente_cpf);
CREATE INDEX idx_mov_saldo_ajuda_custo_paciente_cpf_created
    ON movimentacoes_saldo_ajuda_custo (paciente_cpf, created_at);

COMMENT ON TABLE movimentacoes_saldo_ajuda_custo IS
    'Créditos/débitos de saldo de ajuda de custo entre ciclos do paciente, agrupados por CPF. Saldo = SUM(CREDITO) − SUM(DEBITO), sempre derivado, nunca materializado, podendo ser negativo.';
COMMENT ON COLUMN movimentacoes_saldo_ajuda_custo.paciente_cpf IS
    'Chave real de agrupamento do saldo — CPF do paciente, só dígitos. Atravessa qualquer solicitação dele, inclusive entre o fluxo-v2 e a base real.';
COMMENT ON COLUMN movimentacoes_saldo_ajuda_custo.paciente_id IS
    'Referência opcional ao paciente na solicitação de origem, só para rastreio. Nunca é usada para agrupar o saldo.';
COMMENT ON COLUMN movimentacoes_saldo_ajuda_custo.tipo IS
    'CREDITO: saldo positivo, paciente tem valor a receber (ex.: ajuda aditiva ainda não paga). DEBITO: saldo negativo, paciente recebeu a mais (ex.: ajuda subtrativa ou volta antecipada) e a diferença é descontada do próximo pagamento.';
COMMENT ON COLUMN movimentacoes_saldo_ajuda_custo.solicitacao_origem_numero IS
    'Número da solicitação onde o crédito foi gerado.';
COMMENT ON COLUMN movimentacoes_saldo_ajuda_custo.solicitacao_destino_numero IS
    'Número da solicitação onde o débito foi aplicado.';
