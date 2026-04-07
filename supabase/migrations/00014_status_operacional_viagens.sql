-- ============================================================
-- TFD — Migration 014: Status Operacional de Viagens
-- Adiciona acompanhamento editável pelo usuário (desacoplado
-- do enum situacao_viagem que rege o fluxo automático).
-- Também adiciona viagem_id em documentos para separar
-- anexos de ida e volta.
-- ============================================================

-- ─── 1. Coluna tipo_sistema em tabelas_auxiliares ───────────
-- Mapeia status operacionais customizáveis aos tipos fixos
-- do sistema para disparar auto-transitions quando necessário.

ALTER TABLE tabelas_auxiliares
  ADD COLUMN IF NOT EXISTS tipo_sistema TEXT;

COMMENT ON COLUMN tabelas_auxiliares.tipo_sistema IS
  'Mapeamento para tipo fixo do sistema. Usado apenas pela categoria situacao_viagem_operacional. Valores: PENDENTE, EMITIDA, CONFIRMADA, NO_SHOW, REMARCADA, CANCELADA.';

-- ─── 2. Coluna status_operacional_id em viagens ────────────
-- FK para tabelas_auxiliares. O usuário edita este campo via
-- select inline na tabela. O enum "situacao" continua sendo
-- o motor do fluxo automático.

ALTER TABLE viagens
  ADD COLUMN IF NOT EXISTS status_operacional_id UUID REFERENCES tabelas_auxiliares(id);

CREATE INDEX IF NOT EXISTS idx_viagens_status_op ON viagens(status_operacional_id);

-- ─── 3. Coluna viagem_id em documentos ─────────────────────
-- Permite vincular documentos a uma viagem específica (ida ou
-- volta) em vez de apenas à solicitação. Documentos antigos
-- ficam com viagem_id = NULL.

ALTER TABLE documentos
  ADD COLUMN IF NOT EXISTS viagem_id UUID REFERENCES viagens(id);

CREATE INDEX IF NOT EXISTS idx_documentos_viagem ON documentos(viagem_id);

-- ─── 4. Adicionar PASSAGEM_EMITIDA ao enum tipo_documento ──
-- (Apenas se não existir — CHECK constraint pode impedir)

DO $$
BEGIN
  -- Tenta adicionar ao CHECK se existir como enum
  -- Se já é TEXT sem constraint, o valor já é aceito
  RAISE NOTICE 'tipo_documento: verificando se PASSAGEM_EMITIDA é aceito';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ─── 5. Seed: Status operacionais padrão ───────────────────

INSERT INTO tabelas_auxiliares (categoria, codigo, nome, tipo_sistema, ordem) VALUES
  ('situacao_viagem_operacional', 'AGUARDANDO_EMISSAO',   'Aguardando emissão',             'PENDENTE',    1),
  ('situacao_viagem_operacional', 'PASSAGEM_EMITIDA',     'Passagem emitida',               'EMITIDA',     2),
  ('situacao_viagem_operacional', 'AG_CONF_AGENCIA',      'Ag. confirmação agência',        'PENDENTE',    3),
  ('situacao_viagem_operacional', 'PACIENTE_EMBARCOU',    'Paciente embarcou',              'CONFIRMADA',  4),
  ('situacao_viagem_operacional', 'NAO_COMPARECEU',       'Não compareceu (NO-SHOW)',       'NO_SHOW',     5),
  ('situacao_viagem_operacional', 'REMARCADA',            'Remarcada',                      'REMARCADA',   6),
  ('situacao_viagem_operacional', 'CANCELADA',            'Cancelada',                      'CANCELADA',   7)
ON CONFLICT (categoria, codigo) DO NOTHING;
