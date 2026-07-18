-- ============================================================
-- TFD — Migration 062: Despesas de funerária
-- ============================================================
-- Quando uma solicitação é encerrada por ÓBITO, o município
-- pode arcar com custos de funerária (transporte do corpo,
-- urna, translado, etc.). Cada despesa entra como gasto da
-- solicitação e pode ter um comprovante anexado.
-- Espelha o estilo da tabela `adicionais` (migration 035).
-- ============================================================

CREATE TABLE IF NOT EXISTS despesas_funerarias (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitacao_id          UUID NOT NULL REFERENCES solicitacoes(id),
    descricao               TEXT NOT NULL,
    valor                   DECIMAL(12,2) NOT NULL,
    data_gasto              DATE NOT NULL,
    documento_id            UUID REFERENCES documentos(id),
    registrado_por          UUID REFERENCES usuarios(id),
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_despesas_funerarias_solicitacao_id ON despesas_funerarias (solicitacao_id);
CREATE INDEX idx_despesas_funerarias_documento_id ON despesas_funerarias (documento_id);
CREATE INDEX idx_despesas_funerarias_registrado_por ON despesas_funerarias (registrado_por);

COMMENT ON TABLE despesas_funerarias IS 'Custos de funerária para solicitações encerradas por óbito. Conta como gasto da solicitação.';
COMMENT ON COLUMN despesas_funerarias.descricao IS 'Item da despesa (ex.: Transporte, Urna, Translado).';
COMMENT ON COLUMN despesas_funerarias.documento_id IS 'Comprovante/anexo opcional.';
COMMENT ON COLUMN despesas_funerarias.registrado_por IS 'Usuário que registrou a despesa.';
