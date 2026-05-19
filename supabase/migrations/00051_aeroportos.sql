-- Tabela de aeroportos brasileiros para cálculo de distância aérea no TFD.
-- Substitui o uso do centroide de cidade (via municípios IBGE) quando o modal
-- da passagem é 'aereo' — passa a usar coordenadas reais do aeroporto.
-- Fonte das coordenadas: dados públicos do OurAirports + ANAC.

CREATE TABLE IF NOT EXISTS aeroportos (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    iata        TEXT NOT NULL UNIQUE,
    icao        TEXT,
    nome        TEXT NOT NULL,
    cidade      TEXT NOT NULL,
    uf          TEXT NOT NULL CHECK (length(uf) = 2),
    latitude    DOUBLE PRECISION NOT NULL,
    longitude   DOUBLE PRECISION NOT NULL,
    ativo       BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aeroportos_uf ON aeroportos (uf);
CREATE INDEX IF NOT EXISTS idx_aeroportos_iata ON aeroportos (iata);

ALTER TABLE aeroportos ENABLE ROW LEVEL SECURITY;

-- Leitura aberta a qualquer usuário autenticado (lookup).
CREATE POLICY aeroportos_select_authenticated ON aeroportos
    FOR SELECT TO authenticated
    USING (true);

-- Escrita restrita ao serviço (via service_role) por enquanto.
CREATE POLICY aeroportos_admin_all ON aeroportos
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- Seed: principais aeroportos comerciais brasileiros usados em TFD.
INSERT INTO aeroportos (iata, icao, nome, cidade, uf, latitude, longitude) VALUES
  -- Norte
  ('MAO', 'SBEG', 'Aeroporto Internacional Eduardo Gomes',                 'Manaus',           'AM', -3.038889,  -60.049722),
  ('BEL', 'SBBE', 'Aeroporto Internacional Val de Cans',                   'Belém',            'PA',  -1.379472, -48.476250),
  ('PVH', 'SBPV', 'Aeroporto Internacional de Porto Velho',                'Porto Velho',      'RO',  -8.709306, -63.902361),
  ('BVB', 'SBBV', 'Aeroporto Internacional de Boa Vista',                  'Boa Vista',        'RR',  2.846806,  -60.690944),
  ('PMW', 'SBPJ', 'Aeroporto de Palmas',                                   'Palmas',           'TO', -10.291500, -48.357000),
  ('RBR', 'SBRB', 'Aeroporto Internacional Plácido de Castro',             'Rio Branco',       'AC',  -9.868889, -67.898139),
  ('MCP', 'SBMQ', 'Aeroporto Internacional de Macapá',                     'Macapá',           'AP',   0.050664, -51.072200),

  -- Nordeste
  ('SLZ', 'SBSL', 'Aeroporto Internacional Marechal Cunha Machado',        'São Luís',         'MA',  -2.585361, -44.236389),
  ('IMP', 'SBIZ', 'Aeroporto de Imperatriz',                               'Imperatriz',       'MA',  -5.531118, -47.460047),
  ('THE', 'SBTE', 'Aeroporto de Teresina',                                 'Teresina',         'PI',  -5.059750, -42.823611),
  ('FOR', 'SBFZ', 'Aeroporto Internacional Pinto Martins',                 'Fortaleza',        'CE',  -3.776278, -38.532500),
  ('NAT', 'SBSG', 'Aeroporto Internacional Aluízio Alves',                 'Natal',            'RN',  -5.768056, -35.376111),
  ('JPA', 'SBJP', 'Aeroporto Internacional Castro Pinto',                  'João Pessoa',      'PB',  -7.145833, -34.948889),
  ('REC', 'SBRF', 'Aeroporto Internacional do Recife',                     'Recife',           'PE',  -8.126889, -34.923611),
  ('MCZ', 'SBMO', 'Aeroporto Internacional Zumbi dos Palmares',            'Maceió',           'AL',  -9.510806, -35.791667),
  ('AJU', 'SBAR', 'Aeroporto Internacional Santa Maria',                   'Aracaju',          'SE', -10.984000, -37.070333),
  ('SSA', 'SBSV', 'Aeroporto Internacional Deputado Luís Eduardo Magalhães','Salvador',        'BA', -12.910833, -38.331111),

  -- Centro-Oeste
  ('BSB', 'SBBR', 'Aeroporto Internacional Juscelino Kubitschek',          'Brasília',         'DF', -15.871111, -47.918611),
  ('GYN', 'SBGO', 'Aeroporto de Goiânia',                                  'Goiânia',          'GO', -16.632000, -49.220667),
  ('CGB', 'SBCY', 'Aeroporto Internacional Marechal Rondon',               'Cuiabá',           'MT', -15.652933, -56.116694),
  ('CGR', 'SBCG', 'Aeroporto Internacional de Campo Grande',               'Campo Grande',     'MS', -20.468667, -54.672500),

  -- Sudeste
  ('GRU', 'SBGR', 'Aeroporto Internacional de São Paulo / Guarulhos',      'Guarulhos',        'SP', -23.435556, -46.473056),
  ('CGH', 'SBSP', 'Aeroporto de São Paulo / Congonhas',                    'São Paulo',        'SP', -23.626111, -46.655556),
  ('VCP', 'SBKP', 'Aeroporto Internacional de Viracopos',                  'Campinas',         'SP', -23.006667, -47.134444),
  ('GIG', 'SBGL', 'Aeroporto Internacional Tom Jobim / Galeão',            'Rio de Janeiro',   'RJ', -22.808889, -43.243611),
  ('SDU', 'SBRJ', 'Aeroporto Santos Dumont',                               'Rio de Janeiro',   'RJ', -22.910461, -43.163133),
  ('CNF', 'SBCF', 'Aeroporto Internacional Tancredo Neves / Confins',      'Belo Horizonte',   'MG', -19.624444, -43.971944),
  ('PLU', 'SBBH', 'Aeroporto de Belo Horizonte / Pampulha',                'Belo Horizonte',   'MG', -19.851944, -43.950611),
  ('VIX', 'SBVT', 'Aeroporto de Vitória',                                  'Vitória',          'ES', -20.258056, -40.286389),
  ('SJP', 'SBSR', 'Aeroporto de São José do Rio Preto',                    'São José do Rio Preto', 'SP', -20.816556, -49.406528),
  ('UDI', 'SBUL', 'Aeroporto de Uberlândia',                               'Uberlândia',       'MG', -18.882778, -48.225556),
  ('RAO', 'SBRP', 'Aeroporto de Ribeirão Preto',                           'Ribeirão Preto',   'SP', -21.134167, -47.774167),
  ('IPN', 'SBIP', 'Aeroporto de Ipatinga / Usiminas',                      'Ipatinga',         'MG', -19.470722, -42.487583),

  -- Sul
  ('CWB', 'SBCT', 'Aeroporto Internacional Afonso Pena',                   'São José dos Pinhais', 'PR', -25.531445, -49.175836),
  ('FLN', 'SBFL', 'Aeroporto Internacional Hercílio Luz',                  'Florianópolis',    'SC', -27.670490, -48.547210),
  ('JOI', 'SBJV', 'Aeroporto de Joinville',                                'Joinville',        'SC', -26.224500, -48.797389),
  ('NVT', 'SBNF', 'Aeroporto de Navegantes',                               'Navegantes',       'SC', -26.879889, -48.651389),
  ('POA', 'SBPA', 'Aeroporto Internacional Salgado Filho',                 'Porto Alegre',     'RS', -29.994444, -51.171389),
  ('IGU', 'SBFI', 'Aeroporto Internacional de Foz do Iguaçu',              'Foz do Iguaçu',    'PR', -25.600278, -54.485000),
  ('LDB', 'SBLO', 'Aeroporto de Londrina',                                 'Londrina',         'PR', -23.336056, -51.130100),
  ('MGF', 'SBMG', 'Aeroporto de Maringá',                                  'Maringá',          'PR', -23.479444, -52.016083),
  ('CXJ', 'SBCX', 'Aeroporto de Caxias do Sul',                            'Caxias do Sul',    'RS', -29.197139, -51.187528),
  ('PFB', 'SBPF', 'Aeroporto Lauro Kortz',                                 'Passo Fundo',      'RS', -28.243933, -52.326589),

  -- Bahia interior / outros polos regionais
  ('IOS', 'SBIL', 'Aeroporto de Ilhéus',                                   'Ilhéus',           'BA', -14.815833, -39.033333),
  ('LEC', 'SBLE', 'Aeroporto de Lençóis',                                  'Lençóis',          'BA', -12.482500, -41.277000),
  ('PMG', 'SBPP', 'Aeroporto de Ponta Porã',                               'Ponta Porã',       'MS', -22.549611, -55.702611),
  ('CKS', 'SBCJ', 'Aeroporto de Carajás',                                  'Parauapebas',      'PA',  -6.115278, -50.003333),
  ('STM', 'SBSN', 'Aeroporto de Santarém',                                 'Santarém',         'PA',  -2.424722, -54.785833),
  ('JDO', 'SBJU', 'Aeroporto de Juazeiro do Norte',                        'Juazeiro do Norte','CE',  -7.218889, -39.270000),
  ('PHB', 'SBPB', 'Aeroporto de Parnaíba',                                 'Parnaíba',         'PI',  -2.893750, -41.731944),
  ('BPS', 'SBPS', 'Aeroporto de Porto Seguro',                             'Porto Seguro',     'BA', -16.438611, -39.080833)
ON CONFLICT (iata) DO NOTHING;
