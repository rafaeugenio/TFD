-- ============================================================
-- TFD — Migration 035: Tabela de Adicionais (PA1–PA4)
-- Task #5 — Permanência/Adicionais unificados
-- ============================================================
-- Registra custos extras solicitados durante o TFD que não se
-- encaixam no fluxo padrão de passagens + ajuda de custo.
-- Categorias: PASSAGEM_EXTRA, AJUDA_CUSTO_EXTRA, BAGAGEM,
-- TRANSFER, OUTRO (campo livre).
-- Cada adicional exige documento comprobatório e aprovação
-- da coordenação ou médico.
-- ============================================================

CREATE TABLE IF NOT EXISTS adicionais (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitacao_id          UUID NOT NULL REFERENCES solicitacoes(id),
    categoria               TEXT NOT NULL CHECK (categoria IN (
                                'PASSAGEM_EXTRA',
                                'AJUDA_CUSTO_EXTRA',
                                'BAGAGEM',
                                'TRANSFER',
                                'OUTRO'
                            )),
    descricao               TEXT NOT NULL,
    valor                   DECIMAL(12,2) NOT NULL,
    data_ocorrencia         DATE NOT NULL,
    documento_id            UUID REFERENCES documentos(id),
    status                  TEXT NOT NULL DEFAULT 'PENDENTE_APROVACAO' CHECK (status IN (
                                'PENDENTE_APROVACAO',
                                'APROVADO',
                                'INDEFERIDO',
                                'PAGO'
                            )),
    justificativa_solicitacao   TEXT,
    aprovado_por            UUID REFERENCES usuarios(id),
    aprovado_em             TIMESTAMPTZ,
    justificativa_decisao   TEXT,
    incluido_faturamento_em DATE, -- PA4: data em que entrou no relatório mensal
    numero_relatorio        TEXT, -- referência do relatório de faturamento
    criado_por              UUID REFERENCES usuarios(id),
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_adicionais_solicitacao_id ON adicionais (solicitacao_id);
CREATE INDEX idx_adicionais_status ON adicionais (status);
CREATE INDEX idx_adicionais_categoria ON adicionais (categoria);
CREATE INDEX idx_adicionais_aprovado_por ON adicionais (aprovado_por);
CREATE INDEX idx_adicionais_incluido_faturamento_em ON adicionais (incluido_faturamento_em);

-- Gatilho de updated_at (reutiliza função global set_updated_at)
CREATE TRIGGER trg_adicionais_updated_at
    BEFORE UPDATE ON adicionais
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE adicionais IS 'PA1–PA4: custos adicionais não-padrão durante o TFD. Exige documento e aprovação.';
COMMENT ON COLUMN adicionais.categoria IS 'PA2: tipo do custo extra';
COMMENT ON COLUMN adicionais.documento_id IS 'PA3: comprovante obrigatório';
COMMENT ON COLUMN adicionais.aprovado_por IS 'PA3: coordenação ou médico';
COMMENT ON COLUMN adicionais.incluido_faturamento_em IS 'PA4: marca inclusão no relatório mensal';
