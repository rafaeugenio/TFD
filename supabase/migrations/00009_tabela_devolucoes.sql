-- ============================================================
-- TFD — Migration 009: Tabela de devoluções entre setores
-- Permite que qualquer setor downstream devolva uma solicitação
-- para um setor upstream (retorno não-linear no fluxo TFD).
-- ============================================================

-- ---------------------------------------------------------------------------
-- Tabela: devolucoes
-- ---------------------------------------------------------------------------
CREATE TABLE devolucoes (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitacao_id        UUID NOT NULL REFERENCES solicitacoes(id) ON DELETE CASCADE,

    setor_origem          TEXT NOT NULL CHECK (setor_origem IN (
                              'SOLICITACOES', 'DIAGNOSTICO_CLINICO', 'PARECER_MEDICO',
                              'REGULACAO', 'AGENDAMENTO', 'PASSAGENS',
                              'AJUDA_CUSTO', 'PERMANENCIA', 'ENCERRAMENTO'
                          )),
    setor_destino         TEXT NOT NULL CHECK (setor_destino IN (
                              'SOLICITACOES', 'DIAGNOSTICO_CLINICO', 'PARECER_MEDICO',
                              'REGULACAO', 'AGENDAMENTO', 'PASSAGENS',
                              'AJUDA_CUSTO', 'PERMANENCIA', 'ENCERRAMENTO'
                          )),

    motivo                TEXT NOT NULL,

    urgencia              TEXT NOT NULL DEFAULT 'NORMAL' CHECK (urgencia IN ('NORMAL', 'URGENTE')),

    status_devolucao      TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status_devolucao IN (
                              'PENDENTE', 'RECEBIDA', 'RESOLVIDA'
                          )),

    -- Status da solicitação no momento da devolução.
    -- Quando a devolução for resolvida, a solicitação volta para esse status.
    status_retorno        TEXT NOT NULL CHECK (status_retorno IN (
                              'PENDENTE_DIAGNOSTICO', 'NOVO', 'EM_ANALISE', 'EXIGENCIA',
                              'AGUARDANDO_REGULACAO', 'AGUARDANDO_CNRAC', 'AGUARDANDO_SETI',
                              'AGUARDANDO_RESPOSTA_EXTERNA', 'ENCAMINHADO_SERVICO_SOCIAL',
                              'AGUARDANDO_AGENDAMENTO', 'AGUARDANDO_EMISSAO', 'EMITIDA',
                              'EM_VIAGEM', 'EM_PERMANENCIA', 'REMARCACAO', 'EM_PAGAMENTO',
                              'CONCLUIDO', 'INDEFERIDO', 'CANCELADO'
                          )),

    devolvido_por         UUID REFERENCES usuarios(id),
    recebido_por          UUID REFERENCES usuarios(id),
    resolvido_por         UUID REFERENCES usuarios(id),
    resolvido_em          TIMESTAMPTZ,
    observacao_resolucao  TEXT,

    created_at            TIMESTAMPTZ DEFAULT NOW(),
    updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_devolucoes_solicitacao_id ON devolucoes (solicitacao_id);
CREATE INDEX idx_devolucoes_setor_destino ON devolucoes (setor_destino);
CREATE INDEX idx_devolucoes_status ON devolucoes (status_devolucao);
CREATE INDEX idx_devolucoes_setor_status ON devolucoes (setor_destino, status_devolucao);

-- Trigger para updated_at
CREATE TRIGGER trg_devolucoes_updated_at
    BEFORE UPDATE ON devolucoes
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE devolucoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon all devolucoes" ON devolucoes FOR ALL TO anon USING (true) WITH CHECK (true);
