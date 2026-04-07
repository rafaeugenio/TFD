-- =============================================================================
-- Migration 012: Separar acompanhantes de solicitacoes
-- e permitir documentos vinculados diretamente ao paciente.
--
-- 1. Adiciona paciente_id em documentos (documento pode ser
--    do paciente OU da solicitacao).
-- 2. Cria tabela-ponte solicitacao_acompanhantes (N:N).
-- 3. Migra dados existentes de solicitacoes.acompanhante_id.
-- 4. Remove coluna acompanhante_id de solicitacoes.
-- 5. Habilita RLS na nova tabela seguindo o padrao existente.
-- =============================================================================

-- =============================================================================
-- 1. DOCUMENTOS: adicionar paciente_id e tornar solicitacao_id nullable
-- =============================================================================

ALTER TABLE documentos ADD COLUMN paciente_id UUID REFERENCES pacientes(id);

ALTER TABLE documentos ALTER COLUMN solicitacao_id DROP NOT NULL;

CREATE INDEX idx_documentos_paciente ON documentos (paciente_id);

-- =============================================================================
-- 2. TABELA-PONTE: solicitacao_acompanhantes
-- =============================================================================

CREATE TABLE solicitacao_acompanhantes (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    solicitacao_id    UUID NOT NULL REFERENCES solicitacoes(id) ON DELETE CASCADE,
    acompanhante_id   UUID NOT NULL REFERENCES acompanhantes(id),
    principal         BOOLEAN DEFAULT FALSE,
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(solicitacao_id, acompanhante_id)
);

CREATE INDEX idx_sol_acomp_solicitacao   ON solicitacao_acompanhantes (solicitacao_id);
CREATE INDEX idx_sol_acomp_acompanhante  ON solicitacao_acompanhantes (acompanhante_id);

-- =============================================================================
-- 3. MIGRAR DADOS EXISTENTES
-- =============================================================================

INSERT INTO solicitacao_acompanhantes (solicitacao_id, acompanhante_id, principal)
SELECT id, acompanhante_id, TRUE
FROM solicitacoes
WHERE acompanhante_id IS NOT NULL;

-- =============================================================================
-- 4. REMOVER COLUNA LEGADA
-- =============================================================================

DROP INDEX IF EXISTS idx_solicitacoes_acompanhante_id;

ALTER TABLE solicitacoes DROP COLUMN acompanhante_id;

-- =============================================================================
-- 5. RLS — mesmo padrao das demais tabelas
-- =============================================================================

ALTER TABLE solicitacao_acompanhantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_solicitacao_acompanhantes"
    ON solicitacao_acompanhantes FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_solicitacao_acompanhantes"
    ON solicitacao_acompanhantes FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_update_solicitacao_acompanhantes"
    ON solicitacao_acompanhantes FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon_delete_solicitacao_acompanhantes"
    ON solicitacao_acompanhantes FOR DELETE TO anon USING (true);
