-- dados_bancarios deixa de ser "1 por solicitação" e volta a ser POOL POR
-- PACIENTE — porém com semântica de seleção+snapshot na solicitação.
--
-- Motivação operacional (Ajuda de Custo / SES-MA):
--   O setor identificou múltiplos cenários reais que o modelo "1 por
--   solicitação" não cobria bem:
--     - Paciente menor: dados do pai E da mãe (mais de um destino possível).
--     - Paciente adulto que ora recebe na própria conta, ora pelo cônjuge.
--     - Acompanhante ou responsável que recebe em nome do paciente.
--   Forçar o operador a redigitar tudo a cada solicitação gerava erros e
--   retrabalho. Agora cada paciente tem um POOL de contas cadastradas e a
--   solicitação aponta para a conta escolhida + guarda SNAPSHOT dos campos
--   no momento da aprovação (auditoria financeira imutável).
--
-- Mudanças neste arquivo:
--   1. dados_bancarios ganha `ativo BOOLEAN` (soft-delete preserva histórico).
--   2. solicitacoes ganha `dados_bancarios_id` FK + colunas snapshot_*.
--   3. Backfill: para cada solicitação cuja conta atual aponta para
--      `dados_bancarios.solicitacao_id`, copia FK + snapshots em
--      `solicitacoes`. Em seguida desduplica o pool por (paciente, banco,
--      agência, conta, pix_chave) — mantendo o canônico mais antigo e
--      remapeando as FKs das solicitações para ele.
--   4. Remove a coluna `solicitacao_id` de dados_bancarios e o UNIQUE.
--
-- Após esta migration:
--   - dados_bancarios.paciente_id continua NOT NULL (sempre pertence a um
--     paciente).
--   - 1 paciente → N contas. 1 conta → N solicitações (via FK +
--     desduplicação).
--   - solicitacoes.dados_bancarios_id é a referência viva.
--   - solicitacoes.snapshot_* preserva o que foi pago, mesmo se a conta
--     for editada ou inativada depois.

BEGIN;

-- 1. Soft-delete no pool ----------------------------------------------------
ALTER TABLE dados_bancarios
    ADD COLUMN ativo BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX idx_dados_bancarios_paciente_ativo
    ON dados_bancarios (paciente_id, ativo);

-- 2. solicitacoes: FK + snapshot --------------------------------------------
ALTER TABLE solicitacoes
    ADD COLUMN dados_bancarios_id        UUID REFERENCES dados_bancarios(id) ON DELETE SET NULL,
    ADD COLUMN snapshot_banco            TEXT,
    ADD COLUMN snapshot_agencia          TEXT,
    ADD COLUMN snapshot_conta            TEXT,
    ADD COLUMN snapshot_tipo_conta       TEXT,
    ADD COLUMN snapshot_nome_titular     TEXT,
    ADD COLUMN snapshot_cpf_titular      TEXT,
    ADD COLUMN snapshot_titular_vinculo  TEXT,
    ADD COLUMN snapshot_pix_tipo         TEXT,
    ADD COLUMN snapshot_pix_chave        TEXT,
    ADD COLUMN snapshot_at               TIMESTAMPTZ;

CREATE INDEX idx_solicitacoes_dados_bancarios_id
    ON solicitacoes (dados_bancarios_id);

-- 3. Backfill: copia FK e snapshot a partir do vínculo atual ----------------
--    (dados_bancarios.solicitacao_id ainda existe nesta etapa)
UPDATE solicitacoes s
SET dados_bancarios_id       = db.id,
    snapshot_banco           = db.banco,
    snapshot_agencia         = db.agencia,
    snapshot_conta           = db.conta,
    snapshot_tipo_conta      = db.tipo_conta,
    snapshot_nome_titular    = db.nome_titular,
    snapshot_cpf_titular     = db.cpf_titular,
    snapshot_titular_vinculo = db.titular_vinculo,
    snapshot_pix_tipo        = db.pix_tipo,
    snapshot_pix_chave       = db.pix_chave,
    snapshot_at              = COALESCE(db.created_at, NOW())
FROM dados_bancarios db
WHERE db.solicitacao_id = s.id;

-- 4. Desduplicação do pool --------------------------------------------------
--    Para cada (paciente, banco, agência, conta, pix_chave) escolhemos a
--    conta mais antiga como canônica e remapeamos as FKs das solicitações.
WITH canonicos AS (
    SELECT
        MIN(created_at) AS first_created,
        paciente_id,
        COALESCE(banco, '')      AS k_banco,
        COALESCE(agencia, '')    AS k_agencia,
        COALESCE(conta, '')      AS k_conta,
        COALESCE(pix_chave, '')  AS k_pix
    FROM dados_bancarios
    GROUP BY paciente_id, k_banco, k_agencia, k_conta, k_pix
),
canonico_ids AS (
    SELECT db.id AS canonico_id, db.paciente_id, db.banco, db.agencia, db.conta, db.pix_chave
    FROM dados_bancarios db
    JOIN canonicos c
      ON c.paciente_id = db.paciente_id
     AND c.k_banco    = COALESCE(db.banco, '')
     AND c.k_agencia  = COALESCE(db.agencia, '')
     AND c.k_conta    = COALESCE(db.conta, '')
     AND c.k_pix      = COALESCE(db.pix_chave, '')
     AND c.first_created = db.created_at
),
remapeamento AS (
    SELECT db.id AS old_id, c.canonico_id AS new_id
    FROM dados_bancarios db
    JOIN canonico_ids c
      ON c.paciente_id = db.paciente_id
     AND COALESCE(c.banco, '')     = COALESCE(db.banco, '')
     AND COALESCE(c.agencia, '')   = COALESCE(db.agencia, '')
     AND COALESCE(c.conta, '')     = COALESCE(db.conta, '')
     AND COALESCE(c.pix_chave, '') = COALESCE(db.pix_chave, '')
    WHERE db.id <> c.canonico_id
)
UPDATE solicitacoes s
SET dados_bancarios_id = r.new_id
FROM remapeamento r
WHERE s.dados_bancarios_id = r.old_id;

-- Remove as duplicatas (que agora ninguém referencia)
DELETE FROM dados_bancarios db
WHERE NOT EXISTS (
    SELECT 1 FROM solicitacoes s WHERE s.dados_bancarios_id = db.id
)
AND EXISTS (
    SELECT 1 FROM dados_bancarios c
    WHERE c.paciente_id = db.paciente_id
      AND COALESCE(c.banco, '')     = COALESCE(db.banco, '')
      AND COALESCE(c.agencia, '')   = COALESCE(db.agencia, '')
      AND COALESCE(c.conta, '')     = COALESCE(db.conta, '')
      AND COALESCE(c.pix_chave, '') = COALESCE(db.pix_chave, '')
      AND c.created_at < db.created_at
);

-- 5. Remove solicitacao_id e UNIQUE -----------------------------------------
ALTER TABLE dados_bancarios DROP CONSTRAINT IF EXISTS uq_dados_bancarios_solicitacao;
DROP INDEX  IF EXISTS idx_dados_bancarios_solicitacao_id;
ALTER TABLE dados_bancarios DROP COLUMN IF EXISTS solicitacao_id;

COMMIT;
