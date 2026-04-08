-- ============================================================
-- TFD — Migration 021: Tabela CID-10 (dedicada)
-- Tabela completa com ~14.400 códigos CID-10 para autocomplete
-- ============================================================

CREATE TABLE cid10 (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(10) NOT NULL UNIQUE,
  descricao TEXT NOT NULL,
  capitulo VARCHAR(5),
  grupo VARCHAR(20),
  categoria VARCHAR(5),
  subcategoria VARCHAR(10),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cid10_codigo ON cid10(codigo);
CREATE INDEX idx_cid10_descricao ON cid10 USING gin(to_tsvector('portuguese', descricao));
CREATE INDEX idx_cid10_categoria ON cid10(categoria);

-- RLS (mesmo padrão da migration 005)
ALTER TABLE cid10 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read cid10"
  ON cid10 FOR SELECT TO authenticated USING (true);

CREATE POLICY "anon read cid10" ON cid10 FOR SELECT TO anon USING (true);
CREATE POLICY "anon write cid10" ON cid10 FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update cid10" ON cid10 FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon delete cid10" ON cid10 FOR DELETE TO anon USING (true);
