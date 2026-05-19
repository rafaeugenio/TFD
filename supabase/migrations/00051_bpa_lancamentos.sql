-- ============================================================
-- TFD — Migration 051: bpa_lancamentos
-- Controle interno do que já foi lançado no sistema BPA
-- ============================================================

CREATE TABLE bpa_lancamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ajuda_custo', 'passagem')),
  origem_id UUID NOT NULL,
  trecho VARCHAR(10) CHECK (trecho IN ('ida', 'volta')),
  lancado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  lancado_por UUID REFERENCES usuarios(id),
  CONSTRAINT bpa_lancamentos_unique UNIQUE NULLS NOT DISTINCT (tipo, origem_id, trecho)
);

CREATE INDEX idx_bpa_lancamentos_tipo_origem ON bpa_lancamentos (tipo, origem_id);

ALTER TABLE bpa_lancamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth read bpa_lancamentos"
  ON bpa_lancamentos FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth write bpa_lancamentos"
  ON bpa_lancamentos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon read bpa_lancamentos"
  ON bpa_lancamentos FOR SELECT TO anon USING (true);
CREATE POLICY "anon write bpa_lancamentos"
  ON bpa_lancamentos FOR ALL TO anon USING (true) WITH CHECK (true);
