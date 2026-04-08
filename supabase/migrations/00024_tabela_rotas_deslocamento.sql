-- ============================================================
-- TFD — Migration 024: Tabela Rotas de Deslocamento
-- Distâncias pré-cadastradas para cálculo automático de
-- procedimentos SIGTAP (aéreo/terrestre/fluvial)
-- ============================================================

CREATE TABLE rotas_deslocamento (
  id SERIAL PRIMARY KEY,
  cidade_origem TEXT NOT NULL,
  uf_origem VARCHAR(2) NOT NULL,
  cidade_destino TEXT NOT NULL,
  uf_destino VARCHAR(2) NOT NULL,
  distancia_milhas DECIMAL(10,2),
  distancia_km DECIMAL(10,2),
  distancia_milhas_nauticas DECIMAL(10,2),
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cidade_origem, uf_origem, cidade_destino, uf_destino)
);

CREATE INDEX idx_rotas_origem ON rotas_deslocamento(cidade_origem, uf_origem);
CREATE INDEX idx_rotas_destino ON rotas_deslocamento(cidade_destino, uf_destino);

-- Trigger updated_at
CREATE TRIGGER set_rotas_deslocamento_updated_at
  BEFORE UPDATE ON rotas_deslocamento
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE rotas_deslocamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read rotas_deslocamento"
  ON rotas_deslocamento FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage rotas_deslocamento"
  ON rotas_deslocamento FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon read rotas_deslocamento" ON rotas_deslocamento FOR SELECT TO anon USING (true);
CREATE POLICY "anon write rotas_deslocamento" ON rotas_deslocamento FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update rotas_deslocamento" ON rotas_deslocamento FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon delete rotas_deslocamento" ON rotas_deslocamento FOR DELETE TO anon USING (true);

-- ─── SEED: Rotas mais frequentes ────────────────────────────────
INSERT INTO rotas_deslocamento (cidade_origem, uf_origem, cidade_destino, uf_destino, distancia_milhas, distancia_km) VALUES
('São Luís', 'MA', 'São Paulo', 'SP', 1456, 2980),
('São Luís', 'MA', 'Brasília', 'DF', 1130, 2157),
('São Luís', 'MA', 'Fortaleza', 'CE', 530, 1070),
('São Luís', 'MA', 'Teresina', 'PI', 260, 446),
('São Luís', 'MA', 'Rio de Janeiro', 'RJ', 1550, 3100),
('São Luís', 'MA', 'Recife', 'PE', 870, 1650),
('Imperatriz', 'MA', 'São Paulo', 'SP', 1200, 2400),
('Imperatriz', 'MA', 'Brasília', 'DF', 800, 1600),
('Imperatriz', 'MA', 'Goiânia', 'GO', 700, 1400),
('Caxias', 'MA', 'Teresina', 'PI', 180, 360),
('Caxias', 'MA', 'São Paulo', 'SP', 1400, 2800),
('Timon', 'MA', 'Teresina', 'PI', 5, 10),
('Timon', 'MA', 'São Paulo', 'SP', 1350, 2700),
('Bacabal', 'MA', 'São Luís', 'MA', 140, 260),
('Santa Inês', 'MA', 'São Luís', 'MA', 150, 270),
('Balsas', 'MA', 'Brasília', 'DF', 500, 950),
('Balsas', 'MA', 'São Paulo', 'SP', 1100, 2200),
('Pinheiro', 'MA', 'São Luís', 'MA', 100, 200),
('Codó', 'MA', 'São Luís', 'MA', 170, 310),
('Chapadinha', 'MA', 'São Luís', 'MA', 160, 300);
