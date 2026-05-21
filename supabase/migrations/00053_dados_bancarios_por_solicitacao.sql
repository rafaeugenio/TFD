-- Move dados_bancarios do escopo "1 por paciente" para "1 por solicitação".
--
-- Motivação operacional (Ajuda de Custo / SES-MA):
--   Pacientes podem usar contas bancárias diferentes em ciclos diferentes
--   (ex.: menor de idade usa a conta dos pais e, quando atinge a maioridade,
--   passa a usar a própria). Manter uma conta única no paciente força a
--   sobrescrita destrutiva entre ciclos e perde histórico.
--
-- Mudanças neste arquivo:
--   1. Adiciona `solicitacao_id` em `dados_bancarios` (FK opcional).
--   2. Adiciona `titular_vinculo` para qualificar o titular (PROPRIO, PAI,
--      MAE, CONJUGE, RESPONSAVEL_LEGAL, OUTRO).
--   3. Backfill: para cada registro atual escopado em paciente, replica em
--      TODAS as solicitações daquele paciente, preservando todos os campos.
--      Os registros originais (sem solicitacao_id) são removidos ao final.
--
-- Após esta migration:
--   - 1 linha em `dados_bancarios` por (paciente, solicitação).
--   - `paciente_id` continua NOT NULL (todo registro pertence a um paciente).
--   - `solicitacao_id` é o vínculo operacional principal a partir de agora.

BEGIN;

-- 1. Novas colunas
ALTER TABLE dados_bancarios
    ADD COLUMN solicitacao_id   UUID REFERENCES solicitacoes(id) ON DELETE CASCADE,
    ADD COLUMN titular_vinculo  TEXT CHECK (titular_vinculo IN (
        'PROPRIO', 'PAI', 'MAE', 'CONJUGE', 'RESPONSAVEL_LEGAL', 'OUTRO'
    ));

CREATE INDEX idx_dados_bancarios_solicitacao_id ON dados_bancarios (solicitacao_id);

-- 2. Backfill: replicar dados bancários do paciente em cada solicitação
INSERT INTO dados_bancarios (
    paciente_id, solicitacao_id, banco, agencia, conta, tipo_conta,
    nome_titular, cpf_titular, pix_tipo, pix_chave, titular_vinculo
)
SELECT
    db.paciente_id,
    s.id AS solicitacao_id,
    db.banco, db.agencia, db.conta, db.tipo_conta,
    db.nome_titular, db.cpf_titular, db.pix_tipo, db.pix_chave,
    -- Inferência conservadora: se o CPF do titular bate com o do paciente,
    -- vínculo = 'PROPRIO'; caso contrário deixa NULL para o setor preencher.
    CASE
        WHEN db.cpf_titular = p.cpf THEN 'PROPRIO'
        ELSE NULL
    END AS titular_vinculo
FROM dados_bancarios db
JOIN pacientes  p ON p.id = db.paciente_id
JOIN solicitacoes s ON s.paciente_id = db.paciente_id
WHERE db.solicitacao_id IS NULL;

-- 3. Remove os registros antigos (escopo paciente, sem solicitacao_id)
DELETE FROM dados_bancarios WHERE solicitacao_id IS NULL;

-- 4. A partir de agora todo dado bancário pertence a uma solicitação
ALTER TABLE dados_bancarios
    ALTER COLUMN solicitacao_id SET NOT NULL;

-- 5. Garante apenas 1 dado bancário ativo por solicitação (regra do produto:
--    cada solicitação tem exatamente uma conta de recebimento de ajuda de
--    custo). Pode ser relaxado depois se houver demanda para múltiplos.
ALTER TABLE dados_bancarios
    ADD CONSTRAINT uq_dados_bancarios_solicitacao UNIQUE (solicitacao_id);

COMMIT;
