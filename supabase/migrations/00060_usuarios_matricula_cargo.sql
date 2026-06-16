-- ============================================================
-- TFD — Migration 060: matrícula e cargo do usuário
--
-- Todo usuário passa a ter:
--   - matricula: identificador funcional, só números (validado no app).
--   - cargo:     texto livre com o cargo interno no TFD.
--
-- Esses dois campos alimentam o auto-preenchimento de "ID" e "Cargo" dos
-- representantes no despacho financeiro. Ficam nulos por ora (o app exige no
-- cadastro novo); abaixo fazemos um backfill fictício nos usuários já
-- existentes apenas para teste/uso no protótipo.
-- ============================================================

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS matricula TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cargo TEXT;

-- ── Backfill: matrícula sequencial fictícia (8 dígitos) ──────────────
WITH numerados AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at, id) AS rn
  FROM usuarios
  WHERE matricula IS NULL OR matricula = ''
)
UPDATE usuarios u
SET matricula = LPAD((300000 + n.rn)::text, 8, '0')
FROM numerados n
WHERE u.id = n.id;

-- ── Backfill: cargo derivado do perfil (fictício para o protótipo) ───
UPDATE usuarios
SET cargo = CASE perfil
  WHEN 'ADMINISTRADOR'        THEN 'Administrador do Sistema'
  WHEN 'COORDENACAO_ESTADUAL' THEN 'Coordenação Estadual do TFD'
  WHEN 'MEDICO_AUDITOR'       THEN 'Médico Auditor'
  WHEN 'SETOR_REGULACAO'      THEN 'Analista de Regulação'
  WHEN 'SETOR_PASSAGENS'      THEN 'Analista de Passagens'
  WHEN 'FINANCEIRO'           THEN 'Analista Financeiro'
  WHEN 'ASSISTENTE_SOCIAL'    THEN 'Assistente Social'
  WHEN 'CONTROLE_INTERNO'     THEN 'Analista de Controle Interno'
  WHEN 'ATENDENTE_REGIONAL'   THEN 'Atendente Regional'
  WHEN 'ATENDENTE_MUNICIPAL'  THEN 'Atendente Municipal'
  ELSE 'Servidor do TFD'
END
WHERE cargo IS NULL OR cargo = '';
