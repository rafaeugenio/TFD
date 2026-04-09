-- ============================================================
-- TFD — Migration 032: Regionais de Saúde como entidade completa
-- Cria tabela regionais_saude, junction de municípios,
-- popula com dados oficiais do site da SES-MA e
-- adiciona FK em unidades_destino
-- ============================================================

-- ============================================================
-- 1. TABELA PRINCIPAL: regionais_saude
-- ============================================================

CREATE TABLE regionais_saude (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo          TEXT NOT NULL UNIQUE,      -- 'URS I', 'URS III', ...
  nome            TEXT NOT NULL,             -- 'Rosário', 'Itapecuru-Mirim', ...
  municipio_sede  TEXT,                      -- Município-sede da regional
  logradouro      TEXT,
  bairro          TEXT,
  municipio       TEXT,                      -- Município onde fica o escritório
  uf              TEXT NOT NULL DEFAULT 'MA',
  telefone        TEXT,
  telefone2       TEXT,
  email           TEXT,                      -- Email oficial .gov.br
  email2          TEXT,                      -- Email secundário
  ativo           BOOLEAN NOT NULL DEFAULT TRUE,
  ordem           INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_regionais_saude_ativo  ON regionais_saude (ativo);
CREATE INDEX idx_regionais_saude_codigo ON regionais_saude (codigo);
CREATE INDEX idx_regionais_saude_ordem  ON regionais_saude (ordem);

CREATE TRIGGER trg_regionais_saude_updated_at
  BEFORE UPDATE ON regionais_saude
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- 2. TABELA JUNCTION: regionais_saude_municipios
-- ============================================================

CREATE TABLE regionais_saude_municipios (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regional_saude_id UUID NOT NULL REFERENCES regionais_saude(id) ON DELETE CASCADE,
  municipio_nome    TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (regional_saude_id, municipio_nome)
);

CREATE INDEX idx_rsm_regional ON regionais_saude_municipios (regional_saude_id);
CREATE INDEX idx_rsm_municipio ON regionais_saude_municipios (municipio_nome);

-- ============================================================
-- 3. NOVA FK EM UNIDADES_DESTINO
-- ============================================================

ALTER TABLE unidades_destino
  ADD COLUMN IF NOT EXISTS regional_saude_id UUID REFERENCES regionais_saude(id);

CREATE INDEX IF NOT EXISTS idx_unidades_destino_regional_saude
  ON unidades_destino (regional_saude_id);

-- ============================================================
-- 4. SEED: 18 UNIDADES REGIONAIS DE SAÚDE (dados do site SES-MA)
-- ============================================================

INSERT INTO regionais_saude
  (codigo, nome, municipio_sede, logradouro, bairro, municipio, uf, telefone, telefone2, email, email2, ordem)
VALUES
  ('URS I',    'Rosário',           'Rosário',           'Rua General Lott S/N',              'Vila Bacural',  'Rosário',            'MA', '9833452120', NULL,         'urs.rosario@saude.ma.gov.br',      'urs.rosario@hotmail.com',               1),
  ('URS III',  'Itapecuru-Mirim',   'Itapecuru-Mirim',   'Rua Santo Antonio S/N',             NULL,            'Itapecuru-Mirim',    'MA', '9834631332', NULL,         'urs.itapecuru@saude.ma.gov.br',    'urs.itapecuru2018@gmail.com',           2),
  ('URS IV',   'Chapadinha',        'Chapadinha',        'Rua Ananias Albuquerque, 495',       'Centro',        'Chapadinha',         'MA', '9834711066', NULL,         'urs.chapadinha@saude.ma.gov.br',   'urs.chapadinha@gmail.com',              3),
  ('URS VI',   'Codó',              'Codó',              'Av. 1º de Maio, 1879-A',             'Centro',        'Codó',               'MA', '9936613070', '9936412801', 'urs.codo@saude.ma.gov.br',         'regional.codo2@gmail.com',              4),
  ('URS VII',  'Pinheiro',          'Pinheiro',          'Rua Mª Pinheiro Paiva, 1055',        'Santa Luzia',   'Pinheiro',           'MA', '9833811762', '9833881413', 'urs.pinheiro@saude.ma.gov.br',     'urs.pinheirosaudema2018@gmail.com',     5),
  ('URS IX',   'Viana',             'Viana',             'Rua Profa. Amélia Carvalho S/N',     'Centro',        'Viana',              'MA', '9833511292', NULL,         'urs.viana@saude.ma.gov.br',        NULL,                                    6),
  ('URS X',    'Timon',             'Timon',             'Avenida Viana Vaz, 186',             'Centro',        'Timon',              'MA', '9932122963', NULL,         'urs.timon@saude.ma.gov.br',        'ursmedioparnaiba@hotmail.com',          7),
  ('URS XI',   'Santa Inês',        'Pindaré-Mirim',     'Praça Leão Maluf, 08',               'Centro',        'Pindaré-Mirim',      'MA', '9836542141', '9836542061', 'urs.santaines@saude.ma.gov.br',    'urs.santaines@gmail.com',               8),
  ('URS XII',  'Zé Doca',           'Zé Doca',           'Praça Osvaldo Cruz, 65',             'Vila Barroso',  'Zé Doca',            'MA', '9836554446', '9836554572', 'urs.zedoca@saude.ma.gov.br',       'urs.zedoca@gmail.com',                  9),
  ('URS XIV',  'Açailândia',        'Açailândia',        'Rua Anita Garibaldi, 905-A',         'Centro',        'Açailândia',         'MA', '9935381423', NULL,         'urs.acailandia@saude.ma.gov.br',   'urs.acailandia@gmail.com',              10),
  ('URS XV',   'Imperatriz',        'Imperatriz',        'Rua Cariolano Milhomem, 271',        'Centro',        'Imperatriz',         'MA', '9935231136', '9935250824', 'urs.imperatriz@saude.ma.gov.br',   'urs.tocantins@gmail.com',               11),
  ('URS XVII', 'Balsas',            'Balsas',            'Av. Cel. Fonseca S/N',               'Centro',        'Balsas',             'MA', '9935415428', NULL,         'urs.balsas@saude.ma.gov.br',       'diretoriadesaude@hotmail.com',          12),
  ('URS XVIII','São João dos Patos', 'São João dos Patos','Rua Sá Sobrinho, 230',              'Centro',        'São João dos Patos', 'MA', '9935512719', '9935512310', 'urs.sjpatos@saude.ma.gov.br',      'urssjpatos2018@gmail.com',              13),
  ('URS XX',   'Presidente Dutra',  'Presidente Dutra',  'Praça São Sebastião S/N',            'Centro',        'Presidente Dutra',   'MA', '9936633948', NULL,         'urs.pdutra@saude.ma.gov.br',       'urspd.ma@gmail.com',                    14),
  ('URS XXIII','Pedreiras',         'Pedreiras',         'Praça Cinqüentenário, 01',           'Centro',        'Pedreiras',          'MA', '9936421739', NULL,         'urs.pedreiras@saude.ma.gov.br',    'urs.pedreiras@gmail.com',               15),
  ('URS XXIV', 'Barra do Corda',    'Barra do Corda',    'Rua Frederico Figueira S/N',         'Centro',        'Barra do Corda',     'MA', '9936432658', NULL,         'urs.barradocorda@saude.ma.gov.br', 'urs.ma.barradocorda@gmail.com',         16),
  ('URS XXV',  'Bacabal',           'Bacabal',           'BR 316, km 351',                     'COHAB II',      'Bacabal',            'MA', '9936211795', NULL,         'urs.bacabal@saude.ma.gov.br',      'ugrs.bacabal@gmail.com',                17),
  ('URS XXVI', 'Caxias',            'Caxias',            'Rua Bom Pastor, 371',                'Centro',        'Caxias',             'MA', '9935210799', NULL,         'urs.caxias@saude.ma.gov.br',       'urscaxias@gmail.com',                   18);

-- ============================================================
-- 5. SEED: MUNICÍPIOS POR REGIONAL
-- ============================================================

-- URS I — Rosário
INSERT INTO regionais_saude_municipios (regional_saude_id, municipio_nome)
SELECT id, unnest(ARRAY[
  'Axixá', 'Bacabeira', 'Barreirinhas', 'Cachoeira Grande',
  'Humberto de Campos', 'Icatu', 'Morros', 'Presidente Juscelino',
  'Primeira Cruz', 'Rosário', 'Santa Rita', 'Santo Amaro do Maranhão'
]) FROM regionais_saude WHERE codigo = 'URS I';

-- URS III — Itapecuru-Mirim
INSERT INTO regionais_saude_municipios (regional_saude_id, municipio_nome)
SELECT id, unnest(ARRAY[
  'Anajatuba', 'Arari', 'Belágua', 'Cantanhede',
  'Itapecuru-Mirim', 'Matões do Norte', 'Miranda do Norte', 'Nina Rodrigues',
  'Pirapemas', 'Presidente Vargas', 'São Benedito do Rio Preto',
  'Urbano Santos', 'Vargem Grande', 'Vitória do Mearim'
]) FROM regionais_saude WHERE codigo = 'URS III';

-- URS IV — Chapadinha
INSERT INTO regionais_saude_municipios (regional_saude_id, municipio_nome)
SELECT id, unnest(ARRAY[
  'Água Doce do Maranhão', 'Anapurus', 'Araioses', 'Brejo',
  'Chapadinha', 'Magalhães de Almeida', 'Mata Roma',
  'Milagres do Maranhão', 'Paulino Neves', 'Santa Quitéria do Maranhão',
  'Santana do Maranhão', 'São Bernardo', 'Tutóia'
]) FROM regionais_saude WHERE codigo = 'URS IV';

-- URS VI — Codó
INSERT INTO regionais_saude_municipios (regional_saude_id, municipio_nome)
SELECT id, unnest(ARRAY[
  'Alto Alegre do Maranhão', 'Codó', 'Coroatá',
  'Peritoró', 'São Mateus do Maranhão', 'Timbiras'
]) FROM regionais_saude WHERE codigo = 'URS VI';

-- URS VII — Pinheiro
INSERT INTO regionais_saude_municipios (regional_saude_id, municipio_nome)
SELECT id, unnest(ARRAY[
  'Apicum-Açu', 'Bacuri', 'Bequimão', 'Cedral',
  'Central do Maranhão', 'Cururupu', 'Guimarães', 'Mirinzal',
  'Pedro do Rosário', 'Peri Mirim', 'Pinheiro', 'Porto Rico do Maranhão',
  'Presidente Sarney', 'Santa Helena', 'Serrano do Maranhão',
  'Turiaçu', 'Turilândia'
]) FROM regionais_saude WHERE codigo = 'URS VII';

-- URS IX — Viana
INSERT INTO regionais_saude_municipios (regional_saude_id, municipio_nome)
SELECT id, unnest(ARRAY[
  'Bacurituba', 'Cajapió', 'Cajari', 'Matinha',
  'Olinda Nova do Maranhão', 'Palmeirândia', 'Penalva',
  'São Bento', 'São João Batista', 'São Vicente Ferrer', 'Viana'
]) FROM regionais_saude WHERE codigo = 'URS IX';

-- URS X — Timon
INSERT INTO regionais_saude_municipios (regional_saude_id, municipio_nome)
SELECT id, unnest(ARRAY[
  'Matões', 'Parnarama', 'São Francisco do Maranhão', 'Timon'
]) FROM regionais_saude WHERE codigo = 'URS X';

-- URS XI — Santa Inês (escritório em Pindaré-Mirim)
INSERT INTO regionais_saude_municipios (regional_saude_id, municipio_nome)
SELECT id, unnest(ARRAY[
  'Alto Alegre do Pindaré', 'Bela Vista do Maranhão', 'Bom Jardim',
  'Governador Newton Bello', 'Igarapé do Meio', 'Monção',
  'Pindaré-Mirim', 'Pio XII', 'Santa Inês', 'Santa Luzia',
  'São João do Carú', 'Satubinha', 'Tufilândia'
]) FROM regionais_saude WHERE codigo = 'URS XI';

-- URS XII — Zé Doca
INSERT INTO regionais_saude_municipios (regional_saude_id, municipio_nome)
SELECT id, unnest(ARRAY[
  'Amapá do Maranhão', 'Araguanã', 'Boa Vista do Gurupi',
  'Cândido Mendes', 'Carutapera', 'Centro do Guilherme',
  'Centro Novo do Maranhão', 'Godofredo Viana', 'Governador Nunes Freire',
  'Junco do Maranhão', 'Luís Domingues', 'Maracaçumé',
  'Maranhãozinho', 'Nova Olinda do Maranhão', 'Presidente Médici',
  'Santa Luzia do Paruá', 'Zé Doca'
]) FROM regionais_saude WHERE codigo = 'URS XII';

-- URS XIV — Açailândia
INSERT INTO regionais_saude_municipios (regional_saude_id, municipio_nome)
SELECT id, unnest(ARRAY[
  'Açailândia', 'Bom Jesus das Selvas', 'Buriticupu',
  'Cidelândia', 'Itinga do Maranhão', 'São Francisco do Brejão',
  'São Pedro da Água Branca', 'Vila Nova dos Martírios'
]) FROM regionais_saude WHERE codigo = 'URS XIV';

-- URS XV — Imperatriz
INSERT INTO regionais_saude_municipios (regional_saude_id, municipio_nome)
SELECT id, unnest(ARRAY[
  'Amarante do Maranhão', 'Buritirana', 'Campestre do Maranhão',
  'Davinópolis', 'Estreito', 'Governador Edson Lobão',
  'Imperatriz', 'João Lisboa', 'Lajeado Novo', 'Montes Altos',
  'Porto Franco', 'Ribamar Fiquene', 'São João do Paraíso',
  'Senador La Roque', 'Sítio Novo', 'Carolina'
]) FROM regionais_saude WHERE codigo = 'URS XV';

-- URS XVII — Balsas
INSERT INTO regionais_saude_municipios (regional_saude_id, municipio_nome)
SELECT id, unnest(ARRAY[
  'Alto Parnaíba', 'Balsas', 'Feira Nova do Maranhão',
  'Formosa da Serra Negra', 'Fortaleza dos Nogueiras', 'Loreto',
  'Nova Colinas', 'Riachão', 'Sambaíba', 'São Félix de Balsas',
  'São Pedro dos Crentes', 'São Raimundo das Mangabeiras', 'Tasso Fragoso'
]) FROM regionais_saude WHERE codigo = 'URS XVII';

-- URS XVIII — São João dos Patos
INSERT INTO regionais_saude_municipios (regional_saude_id, municipio_nome)
SELECT id, unnest(ARRAY[
  'Barão de Grajaú', 'Benedito Leite', 'Buriti Bravo', 'Colinas',
  'Jatobá', 'Lagoa do Mato', 'Mirador', 'Nova Iorque',
  'Paraibano', 'Passagem Franca', 'Pastos Bons',
  'São Domingos do Azeitão', 'São João dos Patos',
  'Sucupira do Norte', 'Sucupira do Riachão'
]) FROM regionais_saude WHERE codigo = 'URS XVIII';

-- URS XX — Presidente Dutra
INSERT INTO regionais_saude_municipios (regional_saude_id, municipio_nome)
SELECT id, unnest(ARRAY[
  'Capinzal do Norte', 'Dom Pedro', 'Fortuna', 'Gonçalves Dias',
  'Governador Archer', 'Governador Eugênio Barros', 'Governador Luís Rocha',
  'Graça Aranha', 'Joselândia', 'Presidente Dutra',
  'Santa Filomena do Maranhão', 'Santo Antônio dos Lopes',
  'São Domingos do Maranhão', 'São José dos Basílios',
  'Senador Alexandre Costa', 'Tuntum'
]) FROM regionais_saude WHERE codigo = 'URS XX';

-- URS XXIII — Pedreiras
INSERT INTO regionais_saude_municipios (regional_saude_id, municipio_nome)
SELECT id, unnest(ARRAY[
  'Bernardo do Mearim', 'Esperantinópolis', 'Igarapé Grande',
  'Lago da Pedra', 'Lago do Junco', 'Lago dos Rodrigues',
  'Lagoa Grande do Maranhão', 'Lima Campos', 'Pedreiras',
  'Poção de Pedras', 'São Raimundo do Doca Bezerra',
  'São Roberto', 'Trizidela do Vale'
]) FROM regionais_saude WHERE codigo = 'URS XXIII';

-- URS XXIV — Barra do Corda
INSERT INTO regionais_saude_municipios (regional_saude_id, municipio_nome)
SELECT id, unnest(ARRAY[
  'Arame', 'Barra do Corda', 'Fernando Falcão',
  'Grajaú', 'Itaipava do Grajaú', 'Jenipapo dos Vieiras'
]) FROM regionais_saude WHERE codigo = 'URS XXIV';

-- URS XXV — Bacabal
INSERT INTO regionais_saude_municipios (regional_saude_id, municipio_nome)
SELECT id, unnest(ARRAY[
  'Altamira do Maranhão', 'Bacabal', 'Bom Lugar', 'Brejo de Areia',
  'Conceição do Lago-Açu', 'Lago Verde', 'Marajá do Sena',
  'Olho d''Água das Cunhãs', 'Paulo Ramos',
  'São Luís Gonzaga do Maranhão', 'Vitorino Freire'
]) FROM regionais_saude WHERE codigo = 'URS XXV';

-- URS XXVI — Caxias
INSERT INTO regionais_saude_municipios (regional_saude_id, municipio_nome)
SELECT id, unnest(ARRAY[
  'Afonso Cunha', 'Aldeias Altas', 'Buriti',
  'Caxias', 'Coelho Neto', 'Duque Bacelar', 'São João do Sóter'
]) FROM regionais_saude WHERE codigo = 'URS XXVI';
