-- ============================================================
-- TFD — Migration 002: Tabelas Auxiliares (Lookup Tables)
-- Todas as opções de dropdown gerenciáveis pelo usuário
-- ============================================================

-- ─── TABELA GENÉRICA DE LOOKUPS ──────────────────────────────
-- Armazena opções de dropdown simples (chave-valor) por categoria.
-- Cada categoria alimenta um ou mais selects no sistema.

CREATE TABLE IF NOT EXISTS tabelas_auxiliares (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria  TEXT NOT NULL,
  codigo     TEXT NOT NULL,
  nome       TEXT NOT NULL,
  descricao  TEXT,
  ativo      BOOLEAN DEFAULT TRUE,
  ordem      INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(categoria, codigo)
);

CREATE INDEX idx_tabaux_categoria ON tabelas_auxiliares(categoria);
CREATE INDEX idx_tabaux_categoria_ativo ON tabelas_auxiliares(categoria, ativo);

-- Trigger updated_at
CREATE TRIGGER set_tabelas_auxiliares_updated_at
  BEFORE UPDATE ON tabelas_auxiliares
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE tabelas_auxiliares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read tabelas_auxiliares"
  ON tabelas_auxiliares FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage tabelas_auxiliares"
  ON tabelas_auxiliares FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── TABELA: UNIDADES DE DESTINO ─────────────────────────────
-- Hospitais e clínicas de referência (estrutura mais complexa)

CREATE TABLE IF NOT EXISTS unidades_destino (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome             TEXT NOT NULL,
  cnes             TEXT,
  cidade           TEXT NOT NULL,
  uf               TEXT NOT NULL,
  tipo             TEXT,
  contato_nome     TEXT,
  contato_telefone TEXT,
  contato_email    TEXT,
  endereco         TEXT,
  ativo            BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_unidades_destino_ativo ON unidades_destino(ativo);
CREATE INDEX idx_unidades_destino_uf ON unidades_destino(uf);

CREATE TRIGGER set_unidades_destino_updated_at
  BEFORE UPDATE ON unidades_destino
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE unidades_destino ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read unidades_destino"
  ON unidades_destino FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage unidades_destino"
  ON unidades_destino FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── TABELA: COMPANHIAS DE TRANSPORTE ────────────────────────

CREATE TABLE IF NOT EXISTS companhias_transporte (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  tipo_modal  TEXT NOT NULL CHECK (tipo_modal IN ('AEREO','TERRESTRE','FLUVIAL')),
  cnpj        TEXT,
  contato     TEXT,
  ativo       BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_companhias_ativo ON companhias_transporte(ativo);

CREATE TRIGGER set_companhias_transporte_updated_at
  BEFORE UPDATE ON companhias_transporte
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE companhias_transporte ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read companhias_transporte"
  ON companhias_transporte FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can manage companhias_transporte"
  ON companhias_transporte FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ============================================================
-- SEED DATA — Opções iniciais por categoria
-- ============================================================

-- ─── ESPECIALIDADES MÉDICAS ──────────────────────────────────
INSERT INTO tabelas_auxiliares (categoria, codigo, nome, ordem) VALUES
  ('especialidade', 'CARDIOLOGIA', 'Cardiologia', 1),
  ('especialidade', 'NEUROLOGIA', 'Neurologia', 2),
  ('especialidade', 'ONCOLOGIA', 'Oncologia', 3),
  ('especialidade', 'ORTOPEDIA', 'Ortopedia', 4),
  ('especialidade', 'OFTALMOLOGIA', 'Oftalmologia', 5),
  ('especialidade', 'NEFROLOGIA', 'Nefrologia', 6),
  ('especialidade', 'UROLOGIA', 'Urologia', 7),
  ('especialidade', 'PNEUMOLOGIA', 'Pneumologia', 8),
  ('especialidade', 'GASTROENTEROLOGIA', 'Gastroenterologia', 9),
  ('especialidade', 'CIRURGIA_GERAL', 'Cirurgia Geral', 10),
  ('especialidade', 'TRANSPLANTE', 'Transplante', 11),
  ('especialidade', 'OUTROS', 'Outros', 99);

-- ─── TIPOS DE PROCEDIMENTO ───────────────────────────────────
INSERT INTO tabelas_auxiliares (categoria, codigo, nome, ordem) VALUES
  ('tipo_procedimento', 'CONSULTA', 'Consulta', 1),
  ('tipo_procedimento', 'CIRURGIA', 'Cirurgia', 2),
  ('tipo_procedimento', 'EXAME', 'Exame', 3),
  ('tipo_procedimento', 'TRATAMENTO_CONTINUO', 'Tratamento Contínuo', 4),
  ('tipo_procedimento', 'QUIMIOTERAPIA', 'Quimioterapia', 5),
  ('tipo_procedimento', 'RADIOTERAPIA', 'Radioterapia', 6),
  ('tipo_procedimento', 'HEMODIALISE', 'Hemodiálise', 7),
  ('tipo_procedimento', 'REABILITACAO', 'Reabilitação', 8),
  ('tipo_procedimento', 'OUTROS', 'Outros', 99);

-- ─── CIDs FREQUENTES ─────────────────────────────────────────
INSERT INTO tabelas_auxiliares (categoria, codigo, nome, descricao, ordem) VALUES
  ('cid10', 'G40.0', 'G40.0', 'Epilepsia e síndromes epilépticas idiopáticas', 1),
  ('cid10', 'C50', 'C50', 'Neoplasia maligna da mama', 2),
  ('cid10', 'I25.1', 'I25.1', 'Doença aterosclerótica do coração', 3),
  ('cid10', 'N18.0', 'N18.0', 'Doença renal em estágio final', 4),
  ('cid10', 'C61', 'C61', 'Neoplasia maligna da próstata', 5),
  ('cid10', 'M17.1', 'M17.1', 'Gonartrose primária bilateral', 6),
  ('cid10', 'H25.0', 'H25.0', 'Catarata senil incipiente', 7),
  ('cid10', 'C34.9', 'C34.9', 'Neoplasia maligna do brônquio ou pulmão', 8),
  ('cid10', 'I35.0', 'I35.0', 'Estenose aórtica', 9),
  ('cid10', 'Z94.0', 'Z94.0', 'Rim transplantado', 10);

-- ─── VÍNCULOS DE ACOMPANHANTE ────────────────────────────────
INSERT INTO tabelas_auxiliares (categoria, codigo, nome, ordem) VALUES
  ('vinculo_acompanhante', 'CONJUGE', 'Cônjuge', 1),
  ('vinculo_acompanhante', 'FILHO', 'Filho(a)', 2),
  ('vinculo_acompanhante', 'PAI_MAE', 'Pai/Mãe', 3),
  ('vinculo_acompanhante', 'RESPONSAVEL_LEGAL', 'Responsável Legal', 4),
  ('vinculo_acompanhante', 'IRMAO', 'Irmão(ã)', 5),
  ('vinculo_acompanhante', 'OUTRO', 'Outro', 99);

-- ─── MOTIVOS DE PERMANÊNCIA ──────────────────────────────────
INSERT INTO tabelas_auxiliares (categoria, codigo, nome, ordem) VALUES
  ('motivo_permanencia', 'INTERNACAO', 'Internação', 1),
  ('motivo_permanencia', 'CONTINUIDADE_TRATAMENTO', 'Continuidade de Tratamento', 2),
  ('motivo_permanencia', 'AGUARDANDO_CIRURGIA', 'Aguardando Cirurgia', 3),
  ('motivo_permanencia', 'AGUARDANDO_RESULTADO', 'Aguardando Resultado de Exame', 4),
  ('motivo_permanencia', 'COMPLICACAO', 'Complicação Pós-Procedimento', 5),
  ('motivo_permanencia', 'OUTROS', 'Outros', 99);

-- ─── MOTIVOS DE ENCERRAMENTO ─────────────────────────────────
INSERT INTO tabelas_auxiliares (categoria, codigo, nome, ordem) VALUES
  ('motivo_encerramento', 'ALTA_MEDICA', 'Alta Médica', 1),
  ('motivo_encerramento', 'TRANSFERENCIA', 'Transferência para Rede Local', 2),
  ('motivo_encerramento', 'DESISTENCIA', 'Desistência do Paciente', 3),
  ('motivo_encerramento', 'ABANDONO', 'Abandono de Tratamento', 4),
  ('motivo_encerramento', 'OBITO', 'Óbito', 5);

-- ─── CANAIS DE COMUNICAÇÃO ───────────────────────────────────
INSERT INTO tabelas_auxiliares (categoria, codigo, nome, ordem) VALUES
  ('canal_comunicacao', 'EMAIL', 'E-mail', 1),
  ('canal_comunicacao', 'SMS', 'SMS', 2),
  ('canal_comunicacao', 'WHATSAPP', 'WhatsApp', 3),
  ('canal_comunicacao', 'SISTEMA', 'Sistema', 4),
  ('canal_comunicacao', 'TELEFONE', 'Telefone', 5);

-- ─── MODAIS DE TRANSPORTE ────────────────────────────────────
INSERT INTO tabelas_auxiliares (categoria, codigo, nome, ordem) VALUES
  ('modal_transporte', 'AEREO', 'Aéreo', 1),
  ('modal_transporte', 'TERRESTRE', 'Terrestre', 2),
  ('modal_transporte', 'FLUVIAL', 'Fluvial', 3);

-- ─── ORIGENS DE AGENDAMENTO ──────────────────────────────────
INSERT INTO tabelas_auxiliares (categoria, codigo, nome, ordem) VALUES
  ('origem_agendamento', 'CNRAC', 'CNRAC', 1),
  ('origem_agendamento', 'CENTRAL_TRANSPLANTES', 'Central de Transplantes', 2),
  ('origem_agendamento', 'CONTATO_DIRETO', 'Contato Direto', 3),
  ('origem_agendamento', 'EMAIL', 'E-mail', 4);

-- ─── PERFIS DE USUÁRIO ───────────────────────────────────────
INSERT INTO tabelas_auxiliares (categoria, codigo, nome, descricao, ordem) VALUES
  ('perfil_usuario', 'ATENDENTE_MUNICIPAL', 'Atendente Municipal', 'Vê apenas processos do seu município', 1),
  ('perfil_usuario', 'ATENDENTE_REGIONAL', 'Atendente Regional', 'Vê processos de toda a regional', 2),
  ('perfil_usuario', 'COORDENACAO_ESTADUAL', 'Coordenação Estadual', 'Acesso a todos os módulos', 3),
  ('perfil_usuario', 'MEDICO_AUDITOR', 'Médico Auditor', 'Análise clínica e parecer médico', 4),
  ('perfil_usuario', 'SETOR_REGULACAO', 'Setor de Regulação', 'Roteamento e cobranças externas', 5),
  ('perfil_usuario', 'SETOR_PASSAGENS', 'Setor de Passagens', 'Emissão e controle de viagens', 6),
  ('perfil_usuario', 'FINANCEIRO', 'Financeiro', 'Ajuda de custo e relatórios financeiros', 7),
  ('perfil_usuario', 'ASSISTENTE_SOCIAL', 'Assistente Social', 'Acompanhamento e Serviço Social', 8),
  ('perfil_usuario', 'CONTROLE_INTERNO', 'Controle Interno', 'Relatórios e auditoria (somente leitura)', 9),
  ('perfil_usuario', 'ADMINISTRADOR', 'Administrador', 'Todos os módulos + configurações', 10);

-- ─── REGIONAIS ───────────────────────────────────────────────
INSERT INTO tabelas_auxiliares (categoria, codigo, nome, ordem) VALUES
  ('regional', 'SAO_LUIS', 'São Luís', 1),
  ('regional', 'IMPERATRIZ', 'Imperatriz', 2),
  ('regional', 'CAXIAS', 'Caxias', 3),
  ('regional', 'CODO', 'Codó', 4),
  ('regional', 'BACABAL', 'Bacabal', 5),
  ('regional', 'BALSAS', 'Balsas', 6),
  ('regional', 'SANTA_INES', 'Santa Inês', 7),
  ('regional', 'BARRA_DO_CORDA', 'Barra do Corda', 8),
  ('regional', 'PINHEIRO', 'Pinheiro', 9),
  ('regional', 'PRESIDENTE_DUTRA', 'Presidente Dutra', 10);

-- ─── SEED: UNIDADES DE DESTINO ───────────────────────────────
INSERT INTO unidades_destino (nome, cnes, cidade, uf, tipo) VALUES
  ('Hospital Sírio-Libanês', '2077485', 'São Paulo', 'SP', 'Hospital'),
  ('Hospital Albert Einstein', '2077396', 'São Paulo', 'SP', 'Hospital'),
  ('Hospital das Clínicas da FMUSP', '2077361', 'São Paulo', 'SP', 'Hospital Universitário'),
  ('Hospital de Base do DF', '0010480', 'Brasília', 'DF', 'Hospital'),
  ('Hospital Universitário de Brasília', '0010499', 'Brasília', 'DF', 'Hospital Universitário'),
  ('Instituto Nacional de Cardiologia', '2295386', 'Rio de Janeiro', 'RJ', 'Instituto'),
  ('INCA — Instituto Nacional de Câncer', '2273454', 'Rio de Janeiro', 'RJ', 'Instituto'),
  ('Hospital Oftalmológico de Brasília', '0010510', 'Brasília', 'DF', 'Clínica'),
  ('Hospital de Câncer de Barretos', '2712547', 'Barretos', 'SP', 'Hospital'),
  ('Hospital Universitário Walter Cantídio', '0001155', 'Fortaleza', 'CE', 'Hospital Universitário');

-- ─── SEED: COMPANHIAS DE TRANSPORTE ──────────────────────────
INSERT INTO companhias_transporte (nome, tipo_modal) VALUES
  ('LATAM Airlines', 'AEREO'),
  ('GOL Linhas Aéreas', 'AEREO'),
  ('Azul Linhas Aéreas', 'AEREO'),
  ('VoePass', 'AEREO'),
  ('Viação São Luís', 'TERRESTRE'),
  ('Expresso Guanabara', 'TERRESTRE'),
  ('Real Maia', 'TERRESTRE'),
  ('Navegação São Francisco', 'FLUVIAL');
