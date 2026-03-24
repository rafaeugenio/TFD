-- ============================================================
-- TFD — Migration 003: Parâmetros do Sistema
-- Tabela genérica para parâmetros configuráveis pelo admin
-- ============================================================

CREATE TABLE IF NOT EXISTS parametros_sistema (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo      TEXT NOT NULL,
  chave      TEXT NOT NULL UNIQUE,
  valor      TEXT NOT NULL,
  tipo       TEXT NOT NULL DEFAULT 'texto' CHECK (tipo IN ('texto', 'numero', 'moeda', 'booleano', 'dias', 'horas', 'km')),
  label      TEXT NOT NULL,
  descricao  TEXT,
  editavel   BOOLEAN DEFAULT TRUE,
  ordem      INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_parametros_grupo ON parametros_sistema(grupo);
CREATE INDEX idx_parametros_chave ON parametros_sistema(chave);

CREATE TRIGGER set_parametros_sistema_updated_at
  BEFORE UPDATE ON parametros_sistema
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE parametros_sistema ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read parametros_sistema"
  ON parametros_sistema FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage parametros_sistema"
  ON parametros_sistema FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- SEED — Parâmetros iniciais
-- ============================================================

-- ─── Diárias e Ajuda de Custo ────────────────────────────────
INSERT INTO parametros_sistema (grupo, chave, valor, tipo, label, descricao, ordem) VALUES
  ('diarias', 'diaria_valor_completa', '24.75', 'moeda', 'Valor diária completa', 'Valor pago por dia completo de permanência', 1),
  ('diarias', 'diaria_valor_retorno', '8.40', 'moeda', 'Valor dia de retorno', 'Valor pago no último dia (retorno)', 2),
  ('diarias', 'diaria_paciente_internado', 'false', 'booleano', 'Paciente internado recebe diária', 'Se false, paciente durante internação não recebe diária', 3),
  ('diarias', 'diaria_acompanhante_sempre', 'true', 'booleano', 'Acompanhante sempre elegível', 'Se true, acompanhante recebe diária em todas as situações', 4),
  ('diarias', 'diaria_referencia_legal', 'Portaria GM/MS nº 55/1999 - Anexo III', 'texto', 'Referência legal', 'Portaria ou legislação vigente para cálculo de diárias', 5);

-- ─── Transporte ──────────────────────────────────────────────
INSERT INTO parametros_sistema (grupo, chave, valor, tipo, label, descricao, ordem) VALUES
  ('transporte', 'distancia_minima_aereo', '320', 'km', 'Distância mínima aéreo', 'Transporte aéreo somente acima deste limite (km)', 1),
  ('transporte', 'medif_prazo_minimo', '48', 'horas', 'MEDIF — prazo mínimo', 'Solicitação MEDIF deve ser feita com antecedência mínima (horas)', 2),
  ('transporte', 'remarcacao_prazo_limite', '24', 'horas', 'Remarcação — prazo limite', 'Solicitação de remarcação deve ter antecedência mínima (horas)', 3);

-- ─── Prazos e SLA ────────────────────────────────────────────
INSERT INTO parametros_sistema (grupo, chave, valor, tipo, label, descricao, ordem) VALUES
  ('sla', 'sla_parecer_medico', '5', 'dias', 'Parecer médico', 'Prazo máximo para emissão de parecer após recebimento', 1),
  ('sla', 'sla_exigencia_prazo', '10', 'dias', 'Exigência — prazo', 'Prazo para o solicitante complementar a documentação', 2),
  ('sla', 'sla_cobranca_externa', '15', 'dias', 'Cobrança externa', 'Alerta após X dias sem resposta de CNRAC/SETI', 3),
  ('sla', 'sla_embarque_confirmacao', '3', 'dias', 'Embarque sem confirmação', 'Alerta se passagem emitida sem confirmação após X dias', 4),
  ('sla', 'sla_permanencia_movimentacao', '7', 'dias', 'Permanência sem movimentação', 'Alerta se paciente em permanência sem atualização', 5);
