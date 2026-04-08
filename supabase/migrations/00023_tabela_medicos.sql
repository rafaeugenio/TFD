-- ============================================================
-- TFD — Migration 023: Tabela Médicos
-- Cadastro de médicos referenciados nos pareceres e laudos
-- ============================================================

CREATE TABLE medicos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_completo TEXT NOT NULL,
  crm VARCHAR(20) NOT NULL,
  crm_uf VARCHAR(2) NOT NULL,
  cpf VARCHAR(14),
  especialidade TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(crm, crm_uf)
);

CREATE INDEX idx_medicos_crm ON medicos(crm, crm_uf);
CREATE INDEX idx_medicos_nome ON medicos USING gin(to_tsvector('portuguese', nome_completo));

-- Trigger updated_at
CREATE TRIGGER set_medicos_updated_at
  BEFORE UPDATE ON medicos
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE medicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read medicos"
  ON medicos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage medicos"
  ON medicos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon read medicos" ON medicos FOR SELECT TO anon USING (true);
CREATE POLICY "anon write medicos" ON medicos FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update medicos" ON medicos FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon delete medicos" ON medicos FOR DELETE TO anon USING (true);
