-- ============================================================
-- TFD — Migration 022: Tabela SIGTAP Procedimentos
-- Códigos de procedimento do TFD conforme Portaria SAS/MS 55/1999
-- ============================================================

CREATE TABLE sigtap_procedimentos (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(15) NOT NULL UNIQUE,
  descricao TEXT NOT NULL,
  tipo VARCHAR(30) NOT NULL,
  subtipo VARCHAR(30),
  beneficiario VARCHAR(20) NOT NULL,
  valor_unitario DECIMAL(10,2) NOT NULL,
  unidade_medida VARCHAR(50),
  cnrac BOOLEAN DEFAULT false,
  portaria_referencia TEXT,
  data_vigencia DATE,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger updated_at
CREATE TRIGGER set_sigtap_procedimentos_updated_at
  BEFORE UPDATE ON sigtap_procedimentos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE sigtap_procedimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read sigtap_procedimentos"
  ON sigtap_procedimentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage sigtap_procedimentos"
  ON sigtap_procedimentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon read sigtap_procedimentos" ON sigtap_procedimentos FOR SELECT TO anon USING (true);
CREATE POLICY "anon write sigtap_procedimentos" ON sigtap_procedimentos FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update sigtap_procedimentos" ON sigtap_procedimentos FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon delete sigtap_procedimentos" ON sigtap_procedimentos FOR DELETE TO anon USING (true);

-- ─── SEED: 14 códigos SIGTAP vigentes ──────────────────────────
INSERT INTO sigtap_procedimentos (codigo, descricao, tipo, subtipo, beneficiario, valor_unitario, unidade_medida, cnrac, portaria_referencia) VALUES
('08.03.01.001-0', 'Ajuda de custo p/ alimentação/pernoite de paciente', 'ajuda_custo', NULL, 'paciente', 24.75, 'dia', false, 'Portaria SAS/MS n. 55/1999'),
('08.03.01.002-8', 'Ajuda de custo p/ alimentação de paciente s/ pernoite', 'ajuda_custo', NULL, 'paciente', 8.40, 'dia', false, 'Portaria SAS/MS n. 55/1999'),
('08.03.01.003-6', 'Ajuda de custo p/ alimentação/pernoite de paciente (CNRAC)', 'ajuda_custo', NULL, 'paciente', 24.75, 'dia', true, 'Portaria SAS/MS n. 55/1999'),
('08.03.01.004-4', 'Ajuda de custo p/ alimentação/pernoite de acompanhante', 'ajuda_custo', NULL, 'acompanhante', 24.75, 'dia', false, 'Portaria SAS/MS n. 55/1999'),
('08.03.01.005-2', 'Ajuda de custo p/ alimentação de acompanhante s/ pernoite', 'ajuda_custo', NULL, 'acompanhante', 8.40, 'dia', false, 'Portaria SAS/MS n. 55/1999'),
('08.03.01.006-0', 'Ajuda de custo p/ alimentação/pernoite de acompanhante (CNRAC)', 'ajuda_custo', NULL, 'acompanhante', 24.75, 'dia', true, 'Portaria SAS/MS n. 55/1999'),
('08.03.01.007-9', 'Deslocamento de acompanhante por transporte aéreo (cada 200 milhas)', 'deslocamento', 'aereo', 'acompanhante', 181.50, '200 milhas', false, 'Portaria SAS/MS n. 55/1999'),
('08.03.01.008-7', 'Deslocamento de paciente por transporte aéreo (cada 200 milhas)', 'deslocamento', 'aereo', 'paciente', 181.50, '200 milhas', false, 'Portaria SAS/MS n. 55/1999'),
('08.03.01.009-5', 'Deslocamento de acompanhante por transporte fluvial (cada 27 milhas náuticas)', 'deslocamento', 'fluvial', 'acompanhante', 3.70, '27 milhas nauticas', false, 'Portaria SAS/MS n. 55/1999'),
('08.03.01.010-9', 'Deslocamento de acompanhante por transporte terrestre (cada 50 km)', 'deslocamento', 'terrestre', 'acompanhante', 4.95, '50 km', false, 'Portaria SAS/MS n. 55/1999'),
('08.03.01.011-7', 'Deslocamento de paciente por transporte fluvial (cada 27 milhas náuticas)', 'deslocamento', 'fluvial', 'paciente', 3.70, '27 milhas nauticas', false, 'Portaria SAS/MS n. 55/1999'),
('08.03.01.012-5', 'Deslocamento de paciente por transporte terrestre (cada 50 km)', 'deslocamento', 'terrestre', 'paciente', 4.95, '50 km', false, 'Portaria SAS/MS n. 55/1999'),
('08.03.01.013-3', 'Deslocamento interestadual de acompanhante por transporte aéreo (CNRAC)', 'deslocamento', 'aereo', 'acompanhante', 181.50, '200 milhas', true, 'Portaria SAS/MS n. 55/1999'),
('08.03.01.014-1', 'Deslocamento interestadual de paciente por transporte aéreo (CNRAC)', 'deslocamento', 'aereo', 'paciente', 181.50, '200 milhas', true, 'Portaria SAS/MS n. 55/1999');
