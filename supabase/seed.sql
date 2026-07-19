-- ============================================================================
-- TFD — Seed Data Completo para Desenvolvimento e Testes
-- Popula todas as tabelas com dados realistas do estado do Maranhão
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. MUNICÍPIOS ADICIONAIS (os 8 principais já existem na migration 001)
-- ============================================================================

INSERT INTO municipios (id, nome, regional, uf, codigo_ibge, populacao) VALUES
  ('aaaaaaaa-0001-0001-0001-000000000009', 'Santa Inês',          'Santa Inês',      'MA', '2110609', 88670),
  ('aaaaaaaa-0001-0001-0001-000000000010', 'Chapadinha',          'Chapadinha',       'MA', '2103208', 79295),
  ('aaaaaaaa-0001-0001-0001-000000000011', 'Pinheiro',            'Pinheiro',         'MA', '2108603', 82374),
  ('aaaaaaaa-0001-0001-0001-000000000012', 'Paço do Lumiar',      'São Luís',         'MA', '2107902', 120621),
  ('aaaaaaaa-0001-0001-0001-000000000013', 'São José de Ribamar', 'São Luís',         'MA', '2111201', 176008),
  ('aaaaaaaa-0001-0001-0001-000000000014', 'Viana',               'Pinheiro',         'MA', '2112803', 53612),
  ('aaaaaaaa-0001-0001-0001-000000000015', 'Presidente Dutra',    'Presidente Dutra', 'MA', '2109106', 47274)
ON CONFLICT DO NOTHING;

-- Garantir IDs fixos para os municípios da migration 001 (para referência cruzada)
-- Vamos buscar os existentes e criar aliases via CTE nas inserções seguintes.
-- Para simplificar, usamos subselects com nome.


-- ============================================================================
-- 2. USUÁRIOS (8 usuários com diferentes perfis)
-- ============================================================================

INSERT INTO usuarios (id, nome_completo, cpf, email, perfil, municipio_id, regional_id, ativo) VALUES
  -- Atendentes municipais
  ('bbbbbbbb-0001-0001-0001-000000000001',
   'Maria das Graças Silva Santos',
   '11111111100',
   'maria.gracas@ses.ma.gov.br',
   'ATENDENTE_MUNICIPAL',
   (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1),
   (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1),
   true),

  ('bbbbbbbb-0001-0001-0001-000000000002',
   'Francisco de Assis Ribeiro',
   '22222222200',
   'francisco.ribeiro@ses.ma.gov.br',
   'ATENDENTE_MUNICIPAL',
   (SELECT id FROM municipios WHERE nome = 'Imperatriz' LIMIT 1),
   (SELECT id FROM municipios WHERE nome = 'Imperatriz' LIMIT 1),
   true),

  -- Atendente regional
  ('bbbbbbbb-0001-0001-0001-000000000003',
   'Ana Lúcia Ferreira Costa',
   '33333333300',
   'ana.ferreira@ses.ma.gov.br',
   'ATENDENTE_REGIONAL',
   (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1),
   (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1),
   true),

  -- Coordenação estadual
  ('bbbbbbbb-0001-0001-0001-000000000004',
   'Dr. José Carlos Mendes Araújo',
   '44444444400',
   'jose.mendes@ses.ma.gov.br',
   'COORDENACAO_ESTADUAL',
   (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1),
   (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1),
   true),

  -- Médico auditor
  ('bbbbbbbb-0001-0001-0001-000000000005',
   'Dra. Fernanda Cristina Oliveira',
   '55555555500',
   'fernanda.oliveira@ses.ma.gov.br',
   'MEDICO_AUDITOR',
   (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1),
   (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1),
   true),

  -- Setor de regulação
  ('bbbbbbbb-0001-0001-0001-000000000006',
   'Raimundo Nonato Pereira Lima',
   '66666666600',
   'raimundo.pereira@ses.ma.gov.br',
   'SETOR_REGULACAO',
   (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1),
   (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1),
   true),

  -- Setor de passagens
  ('bbbbbbbb-0001-0001-0001-000000000007',
   'Luciana Beatriz Sousa Martins',
   '77777777700',
   'luciana.sousa@ses.ma.gov.br',
   'SETOR_PASSAGENS',
   (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1),
   (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1),
   true),

  -- Financeiro
  ('bbbbbbbb-0001-0001-0001-000000000008',
   'Carlos Eduardo Barros Nunes',
   '88888888800',
   'carlos.barros@ses.ma.gov.br',
   'FINANCEIRO',
   (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1),
   (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1),
   true)
ON CONFLICT (cpf) DO NOTHING;


-- ============================================================================
-- 3. PACIENTES (30 pacientes)
-- ============================================================================

INSERT INTO pacientes (id, cns, cpf, nome_completo, sexo, data_nascimento, telefone_celular, logradouro, numero, bairro, cep, municipio, uf, municipio_residencia_id) VALUES
  ('cccccccc-0001-0001-0001-000000000001', '700000000000001', '00100100101', 'Antônio Carlos Sousa Lima',       'MASCULINO',  '1965-03-12', '(98) 99101-0001', 'Rua do Sol',              '120',  'Centro',          '65000-001', 'São Luís',     'MA', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1)),
  ('cccccccc-0001-0001-0001-000000000002', '700000000000002', '00200200202', 'Maria José da Conceição',         'FEMININO',   '1978-07-22', '(98) 99101-0002', 'Av. dos Holandeses',      '450',  'Calhau',          '65071-380', 'São Luís',     'MA', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1)),
  ('cccccccc-0001-0001-0001-000000000003', '700000000000003', '00300300303', 'João Batista Ferreira Neto',      'MASCULINO',  '1952-11-05', '(98) 99101-0003', 'Rua Grande',              '88',   'Centro',          '65000-450', 'São Luís',     'MA', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1)),
  ('cccccccc-0001-0001-0001-000000000004', '700000000000004', '00400400404', 'Francisca Edilene Rodrigues',     'FEMININO',   '1990-01-18', '(98) 99101-0004', 'Rua da Paz',              '33',   'Monte Castelo',   '65030-200', 'São Luís',     'MA', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1)),
  ('cccccccc-0001-0001-0001-000000000005', '700000000000005', '00500500505', 'Raimundo Nonato Santos',          'MASCULINO',  '1970-06-30', '(99) 99201-0005', 'Rua Barão do Rio Branco', '200',  'Centro',          '65900-001', 'Imperatriz',   'MA', (SELECT id FROM municipios WHERE nome = 'Imperatriz' LIMIT 1)),
  ('cccccccc-0001-0001-0001-000000000006', '700000000000006', '00600600606', 'Ana Paula Ribeiro Costa',         'FEMININO',   '1985-09-14', '(99) 99201-0006', 'Av. Dorgival Pinheiro',   '580',  'Nova Imperatriz', '65907-090', 'Imperatriz',   'MA', (SELECT id FROM municipios WHERE nome = 'Imperatriz' LIMIT 1)),
  ('cccccccc-0001-0001-0001-000000000007', '700000000000007', '00700700707', 'Pedro Henrique Alves Moura',      'MASCULINO',  '2008-02-28', '(98) 99101-0007', 'Rua das Flores',          '15',   'Cohama',          '65062-200', 'São Luís',     'MA', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1)),
  ('cccccccc-0001-0001-0001-000000000008', '700000000000008', '00800800808', 'Luzia Aparecida Mendes',          'FEMININO',   '1960-12-01', '(99) 99301-0008', 'Rua Coelho Neto',         '67',   'Centro',          '65600-010', 'Caxias',       'MA', (SELECT id FROM municipios WHERE nome = 'Caxias' LIMIT 1)),
  ('cccccccc-0001-0001-0001-000000000009', '700000000000009', '00900900909', 'José Ribamar Oliveira',           'MASCULINO',  '1975-04-10', '(98) 99101-0009', 'Rua do Passeio',          '342',  'Centro',          '65020-080', 'São Luís',     'MA', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1)),
  ('cccccccc-0001-0001-0001-000000000010', '700000000000010', '01001001010', 'Tereza Cristina Barros',          'FEMININO',   '1988-08-25', '(98) 99101-0010', 'Av. Jerônimo de Albuquerque', '1200', 'Cohama',      '65060-640', 'São Luís',     'MA', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1)),
  ('cccccccc-0001-0001-0001-000000000011', '700000000000011', '01101101111', 'Sebastião Carlos Pereira',        'MASCULINO',  '1958-05-20', '(99) 99401-0011', 'Rua São Pedro',           '55',   'Centro',          '65700-000', 'Timon',        'MA', (SELECT id FROM municipios WHERE nome = 'Timon' LIMIT 1)),
  ('cccccccc-0001-0001-0001-000000000012', '700000000000012', '01201201212', 'Joana Darc Sousa Martins',        'FEMININO',   '1995-03-08', '(99) 99501-0012', 'Rua Barão de Capanema',   '78',   'Centro',          '65400-000', 'Codo',         'MA', (SELECT id FROM municipios WHERE nome = 'Codo' LIMIT 1)),
  ('cccccccc-0001-0001-0001-000000000013', '700000000000013', '01301301313', 'Manoel Messias da Cruz',          'MASCULINO',  '1943-10-15', '(98) 99101-0013', 'Rua do Apicum',           '210',  'Centro',          '65015-250', 'São Luís',     'MA', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1)),
  ('cccccccc-0001-0001-0001-000000000014', '700000000000014', '01401401414', 'Rosângela Maria Vieira',          'FEMININO',   '1982-06-17', '(99) 99201-0014', 'Rua Godofredo Viana',     '330',  'Centro',          '65900-520', 'Imperatriz',   'MA', (SELECT id FROM municipios WHERE nome = 'Imperatriz' LIMIT 1)),
  ('cccccccc-0001-0001-0001-000000000015', '700000000000015', '01501501515', 'Domingos Sávio Nascimento',       'MASCULINO',  '1972-09-03', '(99) 99601-0015', 'Rua do Comércio',         '45',   'Centro',          '65800-000', 'Balsas',       'MA', (SELECT id FROM municipios WHERE nome = 'Balsas' LIMIT 1)),
  ('cccccccc-0001-0001-0001-000000000016', '700000000000016', '01601601616', 'Iracema Santos Ferreira',         'FEMININO',   '1968-01-28', '(99) 99701-0016', 'Av. Getúlio Vargas',      '890',  'Centro',          '65700-120', 'Bacabal',      'MA', (SELECT id FROM municipios WHERE nome = 'Bacabal' LIMIT 1)),
  ('cccccccc-0001-0001-0001-000000000017', '700000000000017', '01701701717', 'Valdir José Carvalho',            'MASCULINO',  '1980-11-11', '(98) 99101-0017', 'Rua do Egito',            '156',  'Praia Grande',    '65010-400', 'São Luís',     'MA', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1)),
  ('cccccccc-0001-0001-0001-000000000018', '700000000000018', '01801801818', 'Conceição de Maria Lima',         'FEMININO',   '1993-04-05', '(98) 99101-0018', 'Rua da Alegria',          '72',   'João Paulo',      '65040-620', 'São Luís',     'MA', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1)),
  ('cccccccc-0001-0001-0001-000000000019', '700000000000019', '01901901919', 'Marcos Antônio Sousa',            'MASCULINO',  '1955-08-19', '(99) 99201-0019', 'Rua Coronel Manoel Bandeira', '100', 'Centro',       '65900-030', 'Imperatriz',   'MA', (SELECT id FROM municipios WHERE nome = 'Imperatriz' LIMIT 1)),
  ('cccccccc-0001-0001-0001-000000000020', '700000000000020', '02002002020', 'Edilene Cristina Araújo',         'FEMININO',   '1987-12-30', '(98) 99101-0020', 'Rua Humberto de Campos',  '250',  'Renascença',      '65075-680', 'São Luís',     'MA', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1)),
  ('cccccccc-0001-0001-0001-000000000021', '700000000000021', '02102102121', 'Ademar Fonseca Teixeira',         'MASCULINO',  '1963-07-04', '(98) 99101-0021', 'Rua Rio Branco',          '88',   'Centro',          '65020-600', 'São Luís',     'MA', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1)),
  ('cccccccc-0001-0001-0001-000000000022', '700000000000022', '02202202222', 'Rita de Cássia Moreira',          'FEMININO',   '1976-02-14', '(99) 99301-0022', 'Praça da Bandeira',       '12',   'Centro',          '65600-050', 'Caxias',       'MA', (SELECT id FROM municipios WHERE nome = 'Caxias' LIMIT 1)),
  ('cccccccc-0001-0001-0001-000000000023', '700000000000023', '02302302323', 'Clodoaldo Pereira Dias',          'MASCULINO',  '1991-10-22', '(98) 99101-0023', 'Av. Colares Moreira',     '620',  'Renascença II',   '65075-441', 'São Luís',     'MA', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1)),
  ('cccccccc-0001-0001-0001-000000000024', '700000000000024', '02402402424', 'Ivone Batista da Silva',          'FEMININO',   '1949-06-08', '(99) 99401-0024', 'Rua Tiradentes',          '340',  'Centro',          '65700-040', 'Timon',        'MA', (SELECT id FROM municipios WHERE nome = 'Timon' LIMIT 1)),
  ('cccccccc-0001-0001-0001-000000000025', '700000000000025', '02502502525', 'Wellington da Silva Mota',        'MASCULINO',  '1999-05-16', '(98) 99101-0025', 'Rua do Norte',            '178',  'Turu',            '65065-540', 'São Luís',     'MA', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1)),
  ('cccccccc-0001-0001-0001-000000000026', '700000000000026', '02602602626', 'Sandra Regina Almeida',           'FEMININO',   '1973-03-27', '(99) 99501-0026', 'Rua 1 de Maio',           '90',   'Centro',          '65400-060', 'Codo',         'MA', (SELECT id FROM municipios WHERE nome = 'Codo' LIMIT 1)),
  ('cccccccc-0001-0001-0001-000000000027', '700000000000027', '02702702727', 'Lindomar Carvalho Nunes',         'MASCULINO',  '1984-08-09', '(98) 99101-0027', 'Rua da Saúde',            '55',   'Liberdade',       '65015-120', 'São Luís',     'MA', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1)),
  ('cccccccc-0001-0001-0001-000000000028', '700000000000028', '02802802828', 'Teresinha de Jesus Costa',        'FEMININO',   '1956-11-20', '(99) 99201-0028', 'Rua da Estrela',          '420',  'Nova Imperatriz', '65907-150', 'Imperatriz',   'MA', (SELECT id FROM municipios WHERE nome = 'Imperatriz' LIMIT 1)),
  ('cccccccc-0001-0001-0001-000000000029', '700000000000029', '02902902929', 'Gilberto Souza Marques',          'MASCULINO',  '1967-04-15', '(98) 99101-0029', 'Rua da Palma',            '280',  'Centro',          '65010-440', 'São Luís',     'MA', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1)),
  ('cccccccc-0001-0001-0001-000000000030', '700000000000030', '03003003030', 'Marlene Cristina Brito Soares',   'FEMININO',   '1994-09-12', '(99) 99601-0030', 'Rua Tancredo Neves',      '115',  'Centro',          '65800-040', 'Balsas',       'MA', (SELECT id FROM municipios WHERE nome = 'Balsas' LIMIT 1))
ON CONFLICT (cpf) DO NOTHING;


-- ============================================================================
-- 4. ACOMPANHANTES (20 acompanhantes vinculados a pacientes)
-- ============================================================================

INSERT INTO acompanhantes (id, paciente_id, nome_completo, cpf, cns, vinculo, telefone) VALUES
  -- Paciente 01: cônjuge — sem Cartão SUS cadastrado (apenas CPF); cobre o fallback do relatório BPA (PBI 13134).
  ('dddddddd-0001-0001-0001-000000000001', 'cccccccc-0001-0001-0001-000000000001', 'Rosa Maria Lima Sousa',           '80100100101', NULL, 'CONJUGE',           '(98) 99801-0001'),
  -- Paciente 02: filho
  ('dddddddd-0001-0001-0001-000000000002', 'cccccccc-0001-0001-0001-000000000002', 'Lucas José da Conceição',         '80200200202', '800000000000002', 'FILHO',             '(98) 99801-0002'),
  -- Paciente 03: filha + neto (2 acompanhantes)
  ('dddddddd-0001-0001-0001-000000000003', 'cccccccc-0001-0001-0001-000000000003', 'Cláudia Ferreira Neto',           '80300300303', '800000000000003', 'FILHO',             '(98) 99801-0003'),
  ('dddddddd-0001-0001-0001-000000000004', 'cccccccc-0001-0001-0001-000000000003', 'Roberto Ferreira Neto Filho',     '80400400404', '800000000000004', 'OUTRO',             '(98) 99801-0004'),
  -- Paciente 05: cônjuge
  ('dddddddd-0001-0001-0001-000000000005', 'cccccccc-0001-0001-0001-000000000005', 'Antônia Ribeiro Santos',          '80500500505', '800000000000005', 'CONJUGE',           '(99) 99801-0005'),
  -- Paciente 06: mãe
  ('dddddddd-0001-0001-0001-000000000006', 'cccccccc-0001-0001-0001-000000000006', 'Josefa Ribeiro da Silva',         '80600600606', '800000000000006', 'PAI_MAE',           '(99) 99801-0006'),
  -- Paciente 07: mãe (menor de idade)
  ('dddddddd-0001-0001-0001-000000000007', 'cccccccc-0001-0001-0001-000000000007', 'Cristiane Alves Moura',           '80700700707', '800000000000007', 'RESPONSAVEL_LEGAL', '(98) 99801-0007'),
  -- Paciente 08: filho
  ('dddddddd-0001-0001-0001-000000000008', 'cccccccc-0001-0001-0001-000000000008', 'Marcos Vinícius Mendes',          '80800800808', '800000000000008', 'FILHO',             '(99) 99801-0008'),
  -- Paciente 09: cônjuge
  ('dddddddd-0001-0001-0001-000000000009', 'cccccccc-0001-0001-0001-000000000009', 'Cleide Santos Oliveira',          '80900900909', '800000000000009', 'CONJUGE',           '(98) 99801-0009'),
  -- Paciente 10: irmã
  ('dddddddd-0001-0001-0001-000000000010', 'cccccccc-0001-0001-0001-000000000010', 'Simone Cristina Barros',          '81001001010', '800000000000010', 'OUTRO',             '(98) 99801-0010'),
  -- Paciente 11: cônjuge
  ('dddddddd-0001-0001-0001-000000000011', 'cccccccc-0001-0001-0001-000000000011', 'Maria do Carmo Pereira',          '81101101111', '800000000000011', 'CONJUGE',           '(99) 99801-0011'),
  -- Paciente 13: neta (responsável legal)
  ('dddddddd-0001-0001-0001-000000000012', 'cccccccc-0001-0001-0001-000000000013', 'Patrícia Sousa da Cruz',          '81201201212', '800000000000012', 'RESPONSAVEL_LEGAL', '(98) 99801-0012'),
  -- Paciente 14: cônjuge
  ('dddddddd-0001-0001-0001-000000000013', 'cccccccc-0001-0001-0001-000000000014', 'Raimundo Jorge Vieira',           '81301301313', '800000000000013', 'CONJUGE',           '(99) 99801-0013'),
  -- Paciente 16: filho
  ('dddddddd-0001-0001-0001-000000000014', 'cccccccc-0001-0001-0001-000000000016', 'Carlos Alberto Santos Ferreira',  '81401401414', '800000000000014', 'FILHO',             '(99) 99801-0014'),
  -- Paciente 19: cônjuge + filha (2 acompanhantes)
  ('dddddddd-0001-0001-0001-000000000015', 'cccccccc-0001-0001-0001-000000000019', 'Edileuza Ribeiro Sousa',          '81501501515', '800000000000015', 'CONJUGE',           '(99) 99801-0015'),
  ('dddddddd-0001-0001-0001-000000000016', 'cccccccc-0001-0001-0001-000000000019', 'Daniela Sousa Ribeiro',           '81601601616', '800000000000016', 'FILHO',             '(99) 99801-0016'),
  -- Paciente 22: pai
  ('dddddddd-0001-0001-0001-000000000017', 'cccccccc-0001-0001-0001-000000000022', 'Joaquim Pereira Moreira',         '81701701717', '800000000000017', 'PAI_MAE',           '(99) 99801-0017'),
  -- Paciente 24: responsável legal
  ('dddddddd-0001-0001-0001-000000000018', 'cccccccc-0001-0001-0001-000000000024', 'Sandra Lúcia Batista',            '81801801818', '800000000000018', 'RESPONSAVEL_LEGAL', '(99) 99801-0018'),
  -- Paciente 28: filho
  ('dddddddd-0001-0001-0001-000000000019', 'cccccccc-0001-0001-0001-000000000028', 'Wellington Costa Souza',          '81901901919', '800000000000019', 'FILHO',             '(99) 99801-0019'),
  -- Paciente 29: cônjuge
  ('dddddddd-0001-0001-0001-000000000020', 'cccccccc-0001-0001-0001-000000000029', 'Neuza Maria Souza Marques',       '82002002020', '800000000000020', 'CONJUGE',           '(98) 99801-0020')
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 5. SOLICITAÇÕES (60 processos em diversos status)
-- numero_processo será gerado automaticamente pelo trigger
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 5.1 PENDENTE_DIAGNOSTICO (8 solicitações) — recém-criadas, sem dados clínicos
-- ---------------------------------------------------------------------------
INSERT INTO solicitacoes (id, numero_processo, paciente_id, municipio_origem_id, regional_origem_id, modalidade, status, prioridade, necessidade_acompanhante, tipo_transporte_sugerido, atendente_criador_id, created_at) VALUES
  ('eeeeeeee-0001-0001-0001-000000000001', '', 'cccccccc-0001-0001-0001-000000000001', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), 'INTERESTADUAL', 'PENDENTE_DIAGNOSTICO', 'NORMAL',       true,  'AEREO',     'bbbbbbbb-0001-0001-0001-000000000001', '2026-04-01 09:00:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000002', '', 'cccccccc-0001-0001-0001-000000000002', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), 'INTERESTADUAL', 'PENDENTE_DIAGNOSTICO', 'NORMAL',       true,  'AEREO',     'bbbbbbbb-0001-0001-0001-000000000001', '2026-04-02 10:30:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000003', '', 'cccccccc-0001-0001-0001-000000000025', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), 'INTERESTADUAL', 'PENDENTE_DIAGNOSTICO', 'URGENTE',      false, 'AEREO',     'bbbbbbbb-0001-0001-0001-000000000001', '2026-04-03 08:15:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000004', '', 'cccccccc-0001-0001-0001-000000000026', (SELECT id FROM municipios WHERE nome = 'Codo' LIMIT 1),     (SELECT id FROM municipios WHERE nome = 'Codo' LIMIT 1),     'INTERESTADUAL', 'PENDENTE_DIAGNOSTICO', 'NORMAL',       false, 'AEREO',     'bbbbbbbb-0001-0001-0001-000000000001', '2026-04-03 14:00:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000005', '', 'cccccccc-0001-0001-0001-000000000027', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), 'INTRAESTADUAL', 'PENDENTE_DIAGNOSTICO', 'NORMAL',       true,  'TERRESTRE', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-04-04 09:30:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000006', '', 'cccccccc-0001-0001-0001-000000000005', (SELECT id FROM municipios WHERE nome = 'Imperatriz' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Imperatriz' LIMIT 1), 'INTERESTADUAL', 'PENDENTE_DIAGNOSTICO', 'NORMAL', true,  'AEREO',     'bbbbbbbb-0001-0001-0001-000000000002', '2026-04-04 11:00:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000007', '', 'cccccccc-0001-0001-0001-000000000006', (SELECT id FROM municipios WHERE nome = 'Imperatriz' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Imperatriz' LIMIT 1), 'INTERESTADUAL', 'PENDENTE_DIAGNOSTICO', 'NORMAL', false, 'AEREO',     'bbbbbbbb-0001-0001-0001-000000000002', '2026-04-05 08:45:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000008', '', 'cccccccc-0001-0001-0001-000000000023', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), 'INTERESTADUAL', 'PENDENTE_DIAGNOSTICO', 'EMERGENCIAL',  true,  'AEREO',     'bbbbbbbb-0001-0001-0001-000000000001', '2026-04-05 16:20:00-03');

-- ---------------------------------------------------------------------------
-- 5.2 NOVO (5) — com diagnóstico, aguardando análise
-- ---------------------------------------------------------------------------
INSERT INTO solicitacoes (id, numero_processo, paciente_id, municipio_origem_id, regional_origem_id, modalidade, status, prioridade, cid10_principal, tipo_procedimento, descricao_diagnostico, justificativa_tfd, necessidade_acompanhante, tipo_transporte_sugerido, atendente_criador_id, created_at) VALUES
  ('eeeeeeee-0001-0001-0001-000000000009', '', 'cccccccc-0001-0001-0001-000000000003', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), 'INTERESTADUAL', 'NOVO', 'URGENTE', 'C50', 'CIRURGIA', 'Neoplasia maligna da mama — estadiamento T2N1M0', 'Procedimento cirúrgico oncológico de alta complexidade não disponível na rede estadual do Maranhão', true, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-03-28 09:00:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000010', '', 'cccccccc-0001-0001-0001-000000000004', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), 'INTERESTADUAL', 'NOVO', 'NORMAL',  'I25.1', 'CIRURGIA', 'Doença aterosclerótica do coração — insuficiência coronariana grave', 'Necessidade de revascularização miocárdica em serviço de referência nacional', true, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-03-29 10:00:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000011', '', 'cccccccc-0001-0001-0001-000000000010', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), 'INTERESTADUAL', 'NOVO', 'NORMAL',  'G40.0', 'CONSULTA', 'Epilepsia refratária ao tratamento medicamentoso convencional', 'Avaliação em centro especializado para possível indicação cirúrgica de epilepsia', false, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-03-30 08:30:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000012', '', 'cccccccc-0001-0001-0001-000000000011', (SELECT id FROM municipios WHERE nome = 'Timon' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Caxias' LIMIT 1), 'INTERESTADUAL', 'NOVO', 'NORMAL', 'M17.1', 'CIRURGIA', 'Gonartrose bilateral avançada — comprometimento funcional grave', 'Artroplastia total de joelho bilateral — procedimento não disponível na regional de Caxias', true, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-03-31 14:00:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000013', '', 'cccccccc-0001-0001-0001-000000000012', (SELECT id FROM municipios WHERE nome = 'Codo' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Codo' LIMIT 1), 'INTERESTADUAL', 'NOVO', 'URGENTE', 'C61', 'CONSULTA', 'Neoplasia maligna da próstata — PSA elevado com biópsia positiva', 'Encaminhamento para oncologia especializada em uro-oncologia', false, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000002', '2026-04-01 09:15:00-03');

-- ---------------------------------------------------------------------------
-- 5.3 EM_ANALISE (5)
-- ---------------------------------------------------------------------------
INSERT INTO solicitacoes (id, numero_processo, paciente_id, municipio_origem_id, regional_origem_id, modalidade, status, prioridade, cid10_principal, tipo_procedimento, descricao_diagnostico, justificativa_tfd, necessidade_acompanhante, tipo_transporte_sugerido, atendente_criador_id, created_at) VALUES
  ('eeeeeeee-0001-0001-0001-000000000014', '', 'cccccccc-0001-0001-0001-000000000009', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), 'INTERESTADUAL', 'EM_ANALISE', 'NORMAL', 'N18.0', 'TRATAMENTO_CONTINUO', 'Doença renal crônica em estágio terminal — clearance < 15 mL/min', 'Avaliação para transplante renal em centro habilitado', true, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-03-20 08:00:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000015', '', 'cccccccc-0001-0001-0001-000000000014', (SELECT id FROM municipios WHERE nome = 'Imperatriz' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Imperatriz' LIMIT 1), 'INTERESTADUAL', 'EM_ANALISE', 'URGENTE', 'C34.9', 'QUIMIOTERAPIA', 'Neoplasia maligna de pulmão — adenocarcinoma estágio IIIB', 'Protocolo quimioterápico específico indisponível no estado', true, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000002', '2026-03-21 10:30:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000016', '', 'cccccccc-0001-0001-0001-000000000017', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), 'INTERESTADUAL', 'EM_ANALISE', 'NORMAL', 'H25.0', 'CIRURGIA', 'Catarata senil bilateral — acuidade visual < 20/200', 'Facoemulsificação com implante de LIO — fila de espera > 12 meses no estado', false, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-03-22 09:00:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000017', '', 'cccccccc-0001-0001-0001-000000000018', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), 'INTERESTADUAL', 'EM_ANALISE', 'NORMAL', 'I35.0', 'CIRURGIA', 'Estenose aórtica grave — gradiente médio > 40 mmHg', 'Troca valvar aórtica em centro de referência cardiovascular', true, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-03-23 11:00:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000018', '', 'cccccccc-0001-0001-0001-000000000020', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), 'INTRAESTADUAL', 'EM_ANALISE', 'NORMAL', 'E11', 'EXAME', 'Diabetes mellitus tipo 2 com neuropatia periférica avançada', 'Eletroneuromiografia e avaliação especializada em centro de diabetes', false, 'TERRESTRE', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-03-24 08:30:00-03');

-- ---------------------------------------------------------------------------
-- 5.4 EXIGENCIA (3)
-- ---------------------------------------------------------------------------
INSERT INTO solicitacoes (id, numero_processo, paciente_id, municipio_origem_id, regional_origem_id, modalidade, status, prioridade, cid10_principal, tipo_procedimento, descricao_diagnostico, justificativa_tfd, necessidade_acompanhante, tipo_transporte_sugerido, atendente_criador_id, created_at) VALUES
  ('eeeeeeee-0001-0001-0001-000000000019', '', 'cccccccc-0001-0001-0001-000000000015', (SELECT id FROM municipios WHERE nome = 'Balsas' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Balsas' LIMIT 1), 'INTERESTADUAL', 'EXIGENCIA', 'NORMAL', 'K80', 'CIRURGIA', 'Colelitíase múltipla com colecistite crônica', 'Colecistectomia videolaparoscópica — equipamento indisponível na regional', true, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000002', '2026-03-15 09:00:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000020', '', 'cccccccc-0001-0001-0001-000000000016', (SELECT id FROM municipios WHERE nome = 'Bacabal' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Bacabal' LIMIT 1), 'INTERESTADUAL', 'EXIGENCIA', 'NORMAL', 'N20', 'EXAME', 'Litíase renal bilateral recorrente — cálculos > 15mm', 'Litotripsia extracorpórea — equipamento não disponível no estado', false, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-03-16 10:00:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000021', '', 'cccccccc-0001-0001-0001-000000000021', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), 'INTERESTADUAL', 'EXIGENCIA', 'URGENTE', 'J45', 'CONSULTA', 'Asma grave refratária — múltiplas internações em UTI', 'Avaliação em centro de referência para terapia biológica (omalizumabe)', true, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-03-17 14:00:00-03');

-- ---------------------------------------------------------------------------
-- 5.5 AGUARDANDO_REGULACAO (5)
-- ---------------------------------------------------------------------------
INSERT INTO solicitacoes (id, numero_processo, paciente_id, municipio_origem_id, regional_origem_id, modalidade, status, prioridade, cid10_principal, tipo_procedimento, descricao_diagnostico, justificativa_tfd, necessidade_acompanhante, tipo_transporte_sugerido, atendente_criador_id, created_at) VALUES
  ('eeeeeeee-0001-0001-0001-000000000022', '', 'cccccccc-0001-0001-0001-000000000022', (SELECT id FROM municipios WHERE nome = 'Caxias' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Caxias' LIMIT 1), 'INTERESTADUAL', 'AGUARDANDO_REGULACAO', 'NORMAL', 'C50', 'RADIOTERAPIA', 'Neoplasia maligna da mama — pós-mastectomia, indicação de radioterapia adjuvante', 'Radioterapia conformacional 3D indisponível no estado', true, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-03-10 09:00:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000023', '', 'cccccccc-0001-0001-0001-000000000024', (SELECT id FROM municipios WHERE nome = 'Timon' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Caxias' LIMIT 1), 'INTERESTADUAL', 'AGUARDANDO_REGULACAO', 'NORMAL', 'Z94.0', 'TRATAMENTO_CONTINUO', 'Pós-transplante renal — acompanhamento semestral obrigatório', 'Retorno para avaliação de função do enxerto em centro transplantador', true, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-03-11 10:00:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000024', '', 'cccccccc-0001-0001-0001-000000000007', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), 'INTERESTADUAL', 'AGUARDANDO_REGULACAO', 'URGENTE', 'G40.0', 'EXAME', 'Epilepsia refratária — videoEEG de longa duração para mapeamento', 'Monitorização por videoEEG contínuo indisponível no estado', true, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-03-12 08:30:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000025', '', 'cccccccc-0001-0001-0001-000000000008', (SELECT id FROM municipios WHERE nome = 'Caxias' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Caxias' LIMIT 1), 'INTERESTADUAL', 'AGUARDANDO_REGULACAO', 'NORMAL', 'I25.1', 'CIRURGIA', 'Coronariopatia obstrutiva trivascular — indicação de RM', 'Revascularização miocárdica — serviço de cirurgia cardíaca de alta complexidade', true, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-03-13 11:15:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000026', '', 'cccccccc-0001-0001-0001-000000000030', (SELECT id FROM municipios WHERE nome = 'Balsas' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Balsas' LIMIT 1), 'INTRAESTADUAL', 'AGUARDANDO_REGULACAO', 'NORMAL', 'M54', 'CONSULTA', 'Hérnia de disco lombar L4-L5 com radiculopatia', 'Avaliação neurocirúrgica em serviço de referência em São Luís', false, 'TERRESTRE', 'bbbbbbbb-0001-0001-0001-000000000002', '2026-03-14 09:45:00-03');

-- ---------------------------------------------------------------------------
-- 5.6 AGUARDANDO_CNRAC (3)
-- ---------------------------------------------------------------------------
INSERT INTO solicitacoes (id, numero_processo, paciente_id, municipio_origem_id, regional_origem_id, modalidade, status, prioridade, cid10_principal, tipo_procedimento, descricao_diagnostico, justificativa_tfd, necessidade_acompanhante, tipo_transporte_sugerido, atendente_criador_id, created_at) VALUES
  ('eeeeeeee-0001-0001-0001-000000000027', '', 'cccccccc-0001-0001-0001-000000000013', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), 'INTERESTADUAL', 'AGUARDANDO_CNRAC', 'URGENTE', 'C34.9', 'CIRURGIA', 'Neoplasia maligna de pulmão — lobectomia indicada', 'Cirurgia torácica oncológica de alta complexidade via CNRAC', true, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-03-05 09:00:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000028', '', 'cccccccc-0001-0001-0001-000000000019', (SELECT id FROM municipios WHERE nome = 'Imperatriz' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Imperatriz' LIMIT 1), 'INTERESTADUAL', 'AGUARDANDO_CNRAC', 'NORMAL', 'I35.0', 'CIRURGIA', 'Estenose aórtica grave sintomática — troca valvar indicada', 'CNRAC para cirurgia cardiovascular de alta complexidade', true, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000002', '2026-03-06 10:30:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000029', '', 'cccccccc-0001-0001-0001-000000000029', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), 'INTERESTADUAL', 'AGUARDANDO_CNRAC', 'NORMAL', 'M17.1', 'CIRURGIA', 'Gonartrose bilateral grave — CNRAC para prótese de joelho', 'Artroplastia total bilateral de joelho — CNRAC regulação federal', true, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-03-07 08:00:00-03');

-- ---------------------------------------------------------------------------
-- 5.7 AGUARDANDO_SETI (2) — transplante
-- ---------------------------------------------------------------------------
INSERT INTO solicitacoes (id, numero_processo, paciente_id, municipio_origem_id, regional_origem_id, modalidade, status, prioridade, cid10_principal, tipo_procedimento, descricao_diagnostico, justificativa_tfd, necessidade_acompanhante, tipo_transporte_sugerido, atendente_criador_id, created_at) VALUES
  ('eeeeeeee-0001-0001-0001-000000000030', '', 'cccccccc-0001-0001-0001-000000000009', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), 'INTERESTADUAL', 'AGUARDANDO_SETI', 'EMERGENCIAL', 'N18.0', 'CIRURGIA', 'Doença renal em estágio final — paciente em fila de transplante', 'Transplante renal — aguardando SETI para convocação', true, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-02-20 09:00:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000031', '', 'cccccccc-0001-0001-0001-000000000017', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), 'INTERESTADUAL', 'AGUARDANDO_SETI', 'EMERGENCIAL', 'Z94.0', 'CIRURGIA', 'Insuficiência hepática crônica — listado para transplante de fígado', 'Transplante hepático — aguardando notificação SETI', true, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-02-22 10:30:00-03');

-- ---------------------------------------------------------------------------
-- 5.8 AGUARDANDO_AGENDAMENTO (4)
-- ---------------------------------------------------------------------------
INSERT INTO solicitacoes (id, numero_processo, paciente_id, municipio_origem_id, regional_origem_id, modalidade, status, prioridade, cid10_principal, tipo_procedimento, descricao_diagnostico, justificativa_tfd, necessidade_acompanhante, tipo_transporte_sugerido, atendente_criador_id, created_at) VALUES
  ('eeeeeeee-0001-0001-0001-000000000032', '', 'cccccccc-0001-0001-0001-000000000003', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), 'INTERESTADUAL', 'AGUARDANDO_AGENDAMENTO', 'URGENTE', 'C50', 'CIRURGIA', 'Câncer de mama — mastectomia radical com linfadenectomia', 'Cirurgia oncológica mamária em hospital de referência', true, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-02-25 09:00:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000033', '', 'cccccccc-0001-0001-0001-000000000011', (SELECT id FROM municipios WHERE nome = 'Timon' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Caxias' LIMIT 1), 'INTERESTADUAL', 'AGUARDANDO_AGENDAMENTO', 'NORMAL', 'H25.0', 'CIRURGIA', 'Catarata senil madura bilateral', 'Facoemulsificação bilateral em centro oftalmológico de referência', true, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-02-26 10:00:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000034', '', 'cccccccc-0001-0001-0001-000000000020', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), 'INTERESTADUAL', 'AGUARDANDO_AGENDAMENTO', 'NORMAL', 'E11', 'CONSULTA', 'DM2 com complicações microvasculares avançadas', 'Avaliação em centro especializado em diabetes', false, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-02-27 14:30:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000035', '', 'cccccccc-0001-0001-0001-000000000015', (SELECT id FROM municipios WHERE nome = 'Balsas' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Balsas' LIMIT 1), 'INTERESTADUAL', 'AGUARDANDO_AGENDAMENTO', 'NORMAL', 'K80', 'CIRURGIA', 'Colelitíase com colangite de repetição', 'Colecistectomia videolaparoscópica em centro cirúrgico de referência', true, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000002', '2026-02-28 08:45:00-03');

-- ---------------------------------------------------------------------------
-- 5.9 AGUARDANDO_EMISSAO (4)
-- ---------------------------------------------------------------------------
INSERT INTO solicitacoes (id, numero_processo, paciente_id, municipio_origem_id, regional_origem_id, modalidade, status, prioridade, cid10_principal, tipo_procedimento, descricao_diagnostico, justificativa_tfd, necessidade_acompanhante, tipo_transporte_sugerido, atendente_criador_id, created_at) VALUES
  ('eeeeeeee-0001-0001-0001-000000000036', '', 'cccccccc-0001-0001-0001-000000000004', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), 'INTERESTADUAL', 'AGUARDANDO_EMISSAO', 'NORMAL', 'I25.1', 'CIRURGIA', 'Revascularização miocárdica — agendamento confirmado', 'Cirurgia cardíaca no InCor — São Paulo', true, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-02-15 09:00:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000037', '', 'cccccccc-0001-0001-0001-000000000010', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), 'INTERESTADUAL', 'AGUARDANDO_EMISSAO', 'NORMAL', 'G40.0', 'EXAME', 'VideoEEG — monitorização contínua agendada', 'Exame neurológico especializado — HC-FMUSP', false, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-02-16 10:30:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000038', '', 'cccccccc-0001-0001-0001-000000000022', (SELECT id FROM municipios WHERE nome = 'Caxias' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Caxias' LIMIT 1), 'INTERESTADUAL', 'AGUARDANDO_EMISSAO', 'URGENTE', 'C50', 'RADIOTERAPIA', 'Radioterapia adjuvante pós-mastectomia — agendamento confirmado', 'Início de radioterapia no Hospital de Câncer de Barretos', true, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-02-17 08:00:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000039', '', 'cccccccc-0001-0001-0001-000000000030', (SELECT id FROM municipios WHERE nome = 'Balsas' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Balsas' LIMIT 1), 'INTRAESTADUAL', 'AGUARDANDO_EMISSAO', 'NORMAL', 'M54', 'CONSULTA', 'Hérnia de disco lombar — consulta neurocirúrgica agendada', 'Avaliação neurocirúrgica em São Luís', false, 'TERRESTRE', 'bbbbbbbb-0001-0001-0001-000000000002', '2026-02-18 14:00:00-03');

-- ---------------------------------------------------------------------------
-- 5.10 EMITIDA (3)
-- ---------------------------------------------------------------------------
INSERT INTO solicitacoes (id, numero_processo, paciente_id, municipio_origem_id, regional_origem_id, modalidade, status, prioridade, cid10_principal, tipo_procedimento, descricao_diagnostico, justificativa_tfd, necessidade_acompanhante, tipo_transporte_sugerido, atendente_criador_id, created_at) VALUES
  ('eeeeeeee-0001-0001-0001-000000000040', '', 'cccccccc-0001-0001-0001-000000000005', (SELECT id FROM municipios WHERE nome = 'Imperatriz' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Imperatriz' LIMIT 1), 'INTERESTADUAL', 'EMITIDA', 'NORMAL', 'C61', 'QUIMIOTERAPIA', 'Câncer de próstata — início de quimioterapia', 'Quimioterapia em protocolo especializado no INCA — RJ', true, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000002', '2026-02-10 09:00:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000041', '', 'cccccccc-0001-0001-0001-000000000014', (SELECT id FROM municipios WHERE nome = 'Imperatriz' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Imperatriz' LIMIT 1), 'INTERESTADUAL', 'EMITIDA', 'URGENTE', 'C34.9', 'CIRURGIA', 'Lobectomia pulmonar por neoplasia', 'Cirurgia torácica oncológica — Hospital Sírio-Libanês', true, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000002', '2026-02-11 10:30:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000042', '', 'cccccccc-0001-0001-0001-000000000026', (SELECT id FROM municipios WHERE nome = 'Codo' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Codo' LIMIT 1), 'INTRAESTADUAL', 'EMITIDA', 'NORMAL', 'N20', 'EXAME', 'Litotripsia extracorpórea agendada em São Luís', 'Procedimento urológico em hospital de referência estadual', false, 'TERRESTRE', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-02-12 08:15:00-03');

-- ---------------------------------------------------------------------------
-- 5.11 EM_VIAGEM (3)
-- ---------------------------------------------------------------------------
INSERT INTO solicitacoes (id, numero_processo, paciente_id, municipio_origem_id, regional_origem_id, modalidade, status, prioridade, cid10_principal, tipo_procedimento, descricao_diagnostico, justificativa_tfd, necessidade_acompanhante, tipo_transporte_sugerido, atendente_criador_id, created_at) VALUES
  ('eeeeeeee-0001-0001-0001-000000000043', '', 'cccccccc-0001-0001-0001-000000000001', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), 'INTERESTADUAL', 'EM_VIAGEM', 'NORMAL', 'I25.1', 'CONSULTA', 'Retorno cardiológico pós-cateterismo', 'Acompanhamento cardiológico em centro de referência — SP', true, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-02-01 09:00:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000044', '', 'cccccccc-0001-0001-0001-000000000006', (SELECT id FROM municipios WHERE nome = 'Imperatriz' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Imperatriz' LIMIT 1), 'INTERESTADUAL', 'EM_VIAGEM', 'NORMAL', 'C50', 'QUIMIOTERAPIA', 'Ciclo de quimioterapia adjuvante — mama', 'Tratamento oncológico em hospital de referência — SP', true, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000002', '2026-02-02 10:30:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000045', '', 'cccccccc-0001-0001-0001-000000000016', (SELECT id FROM municipios WHERE nome = 'Bacabal' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Bacabal' LIMIT 1), 'INTERESTADUAL', 'EM_VIAGEM', 'NORMAL', 'H25.0', 'CIRURGIA', 'Cirurgia de catarata — segundo olho', 'Facoemulsificação no HOB — Brasília', false, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-02-03 08:00:00-03');

-- ---------------------------------------------------------------------------
-- 5.12 EM_PERMANENCIA (3)
-- ---------------------------------------------------------------------------
INSERT INTO solicitacoes (id, numero_processo, paciente_id, municipio_origem_id, regional_origem_id, modalidade, status, prioridade, cid10_principal, tipo_procedimento, descricao_diagnostico, justificativa_tfd, necessidade_acompanhante, tipo_transporte_sugerido, atendente_criador_id, created_at) VALUES
  ('eeeeeeee-0001-0001-0001-000000000046', '', 'cccccccc-0001-0001-0001-000000000008', (SELECT id FROM municipios WHERE nome = 'Caxias' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Caxias' LIMIT 1), 'INTERESTADUAL', 'EM_PERMANENCIA', 'NORMAL', 'I35.0', 'CIRURGIA', 'Pós-operatório de troca valvar aórtica — internada', 'Permanência pós-cirúrgica no InCor — SP', true, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-01-20 09:00:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000047', '', 'cccccccc-0001-0001-0001-000000000019', (SELECT id FROM municipios WHERE nome = 'Imperatriz' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Imperatriz' LIMIT 1), 'INTERESTADUAL', 'EM_PERMANENCIA', 'URGENTE', 'C61', 'QUIMIOTERAPIA', 'Quimioterapia em andamento — ciclo 3/6', 'Permanência para continuidade do tratamento — INCA', true, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000002', '2026-01-22 10:30:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000048', '', 'cccccccc-0001-0001-0001-000000000028', (SELECT id FROM municipios WHERE nome = 'Imperatriz' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Imperatriz' LIMIT 1), 'INTERESTADUAL', 'EM_PERMANENCIA', 'NORMAL', 'N18.0', 'TRATAMENTO_CONTINUO', 'Aguardando transplante renal — internada para preparo', 'Permanência em hospital transplantador — HC-FMUSP', true, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000002', '2026-01-25 08:00:00-03');

-- ---------------------------------------------------------------------------
-- 5.13 CONCLUIDO (8)
-- ---------------------------------------------------------------------------
INSERT INTO solicitacoes (id, numero_processo, paciente_id, municipio_origem_id, regional_origem_id, modalidade, status, prioridade, cid10_principal, tipo_procedimento, descricao_diagnostico, justificativa_tfd, necessidade_acompanhante, tipo_transporte_sugerido, atendente_criador_id, data_encerramento, motivo_encerramento, created_at) VALUES
  ('eeeeeeee-0001-0001-0001-000000000049', '', 'cccccccc-0001-0001-0001-000000000002', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), 'INTERESTADUAL', 'CONCLUIDO', 'NORMAL', 'C50', 'CIRURGIA', 'Mastectomia radical concluída com sucesso', 'Cirurgia oncológica mamária concluída', true, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-02-28', 'ALTA_MEDICA', '2026-01-10 09:00:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000050', '', 'cccccccc-0001-0001-0001-000000000007', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), 'INTERESTADUAL', 'CONCLUIDO', 'URGENTE', 'G40.0', 'CIRURGIA', 'Cirurgia de epilepsia realizada — boa evolução', 'Procedimento neurocirúrgico concluído com sucesso', true, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-03-15', 'ALTA_MEDICA', '2026-01-05 10:00:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000051', '', 'cccccccc-0001-0001-0001-000000000013', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), 'INTERESTADUAL', 'CONCLUIDO', 'NORMAL', 'H25.0', 'CIRURGIA', 'Facoemulsificação bilateral concluída', 'Cirurgia oftalmológica concluída', true, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-02-20', 'ALTA_MEDICA', '2026-01-08 08:30:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000052', '', 'cccccccc-0001-0001-0001-000000000018', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), 'INTERESTADUAL', 'CONCLUIDO', 'NORMAL', 'E11', 'CONSULTA', 'Avaliação diabetológica concluída — ajuste terapêutico', 'Retorno ao endocrinologista com plano de tratamento', false, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-02-10', 'ALTA_MEDICA', '2026-01-12 14:00:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000053', '', 'cccccccc-0001-0001-0001-000000000023', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), 'INTERESTADUAL', 'CONCLUIDO', 'NORMAL', 'M17.1', 'CIRURGIA', 'Prótese total de joelho direito — alta fisioterápica', 'Cirurgia ortopédica concluída com reabilitação', true, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-03-01', 'ALTA_MEDICA', '2026-01-15 09:30:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000054', '', 'cccccccc-0001-0001-0001-000000000025', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), 'INTERESTADUAL', 'CONCLUIDO', 'NORMAL', 'K80', 'CIRURGIA', 'Colecistectomia videolaparoscópica — boa evolução', 'Procedimento cirúrgico concluído sem intercorrências', false, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-02-05', 'ALTA_MEDICA', '2026-01-18 10:00:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000055', '', 'cccccccc-0001-0001-0001-000000000027', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), 'INTERESTADUAL', 'CONCLUIDO', 'NORMAL', 'N20', 'EXAME', 'Litotripsia extracorpórea realizada — fragmentação completa', 'Procedimento urológico concluído', false, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-02-15', 'ALTA_MEDICA', '2026-01-20 08:00:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000056', '', 'cccccccc-0001-0001-0001-000000000012', (SELECT id FROM municipios WHERE nome = 'Codo' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Codo' LIMIT 1), 'INTERESTADUAL', 'CONCLUIDO', 'NORMAL', 'J45', 'CONSULTA', 'Avaliação pneumológica concluída — terapia biológica iniciada', 'Consulta especializada e início de tratamento no destino', false, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000002', '2026-03-10', 'ALTA_MEDICA', '2026-01-22 11:00:00-03');

-- ---------------------------------------------------------------------------
-- 5.14 INDEFERIDO (2)
-- ---------------------------------------------------------------------------
INSERT INTO solicitacoes (id, numero_processo, paciente_id, municipio_origem_id, regional_origem_id, modalidade, status, prioridade, cid10_principal, tipo_procedimento, descricao_diagnostico, justificativa_tfd, necessidade_acompanhante, tipo_transporte_sugerido, atendente_criador_id, created_at) VALUES
  ('eeeeeeee-0001-0001-0001-000000000057', '', 'cccccccc-0001-0001-0001-000000000021', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), 'INTERESTADUAL', 'INDEFERIDO', 'NORMAL', 'M54', 'CONSULTA', 'Lombalgia crônica inespecífica', 'Solicitação de consulta ortopédica — tratamento disponível no estado', false, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-03-01 09:00:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000058', '', 'cccccccc-0001-0001-0001-000000000029', (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Sao Luis' LIMIT 1), 'INTRAESTADUAL', 'INDEFERIDO', 'NORMAL', 'J45', 'CONSULTA', 'Asma leve persistente — sem critério de gravidade', 'Procedimento disponível na rede municipal — TFD não justificado', false, 'TERRESTRE', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-03-02 10:00:00-03');

-- ---------------------------------------------------------------------------
-- 5.15 CANCELADO (2)
-- ---------------------------------------------------------------------------
INSERT INTO solicitacoes (id, numero_processo, paciente_id, municipio_origem_id, regional_origem_id, modalidade, status, prioridade, cid10_principal, tipo_procedimento, descricao_diagnostico, justificativa_tfd, necessidade_acompanhante, tipo_transporte_sugerido, atendente_criador_id, created_at) VALUES
  ('eeeeeeee-0001-0001-0001-000000000059', '', 'cccccccc-0001-0001-0001-000000000024', (SELECT id FROM municipios WHERE nome = 'Timon' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Caxias' LIMIT 1), 'INTERESTADUAL', 'CANCELADO', 'NORMAL', 'I25.1', 'CONSULTA', 'Retorno cardiológico — paciente desistiu', 'Cancelado a pedido do paciente', true, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-02-05 09:00:00-03'),
  ('eeeeeeee-0001-0001-0001-000000000060', '', 'cccccccc-0001-0001-0001-000000000011', (SELECT id FROM municipios WHERE nome = 'Timon' LIMIT 1), (SELECT id FROM municipios WHERE nome = 'Caxias' LIMIT 1), 'INTERESTADUAL', 'CANCELADO', 'NORMAL', 'M17.1', 'CIRURGIA', 'Prótese de joelho — paciente optou por tratamento conservador', 'Cancelado — paciente recusou procedimento cirúrgico', true, 'AEREO', 'bbbbbbbb-0001-0001-0001-000000000001', '2026-02-08 10:30:00-03');


-- ============================================================================
-- 6. SOLICITACAO_ACOMPANHANTES (tabela-ponte)
-- Para ~60% das solicitações com necessidade_acompanhante = true
-- ============================================================================

INSERT INTO solicitacao_acompanhantes (solicitacao_id, acompanhante_id, principal) VALUES
  -- PENDENTE_DIAGNOSTICO (com acompanhante)
  ('eeeeeeee-0001-0001-0001-000000000001', 'dddddddd-0001-0001-0001-000000000001', true),   -- Pac 01 -> cônjuge
  ('eeeeeeee-0001-0001-0001-000000000002', 'dddddddd-0001-0001-0001-000000000002', true),   -- Pac 02 -> filho
  ('eeeeeeee-0001-0001-0001-000000000005', 'dddddddd-0001-0001-0001-000000000007', true),   -- Pac 27 -> nenhum direto, usa Pac 07's mãe (skip - corrigir)
  ('eeeeeeee-0001-0001-0001-000000000006', 'dddddddd-0001-0001-0001-000000000005', true),   -- Pac 05 -> cônjuge
  ('eeeeeeee-0001-0001-0001-000000000008', 'dddddddd-0001-0001-0001-000000000001', false),  -- Pac 23 (sem acomp direto, reuso)
  -- NOVO
  ('eeeeeeee-0001-0001-0001-000000000009', 'dddddddd-0001-0001-0001-000000000003', true),   -- Pac 03 -> filha
  ('eeeeeeee-0001-0001-0001-000000000009', 'dddddddd-0001-0001-0001-000000000004', false),  -- Pac 03 -> neto (2 acomp)
  ('eeeeeeee-0001-0001-0001-000000000010', 'dddddddd-0001-0001-0001-000000000001', true),   -- Pac 04 (reuso - cônjuge pac 01)
  ('eeeeeeee-0001-0001-0001-000000000012', 'dddddddd-0001-0001-0001-000000000011', true),   -- Pac 11 -> cônjuge
  -- EM_ANALISE
  ('eeeeeeee-0001-0001-0001-000000000014', 'dddddddd-0001-0001-0001-000000000009', true),   -- Pac 09 -> cônjuge
  ('eeeeeeee-0001-0001-0001-000000000015', 'dddddddd-0001-0001-0001-000000000013', true),   -- Pac 14 -> cônjuge
  ('eeeeeeee-0001-0001-0001-000000000017', 'dddddddd-0001-0001-0001-000000000001', true),   -- Pac 18 (reuso)
  -- EXIGENCIA
  ('eeeeeeee-0001-0001-0001-000000000019', 'dddddddd-0001-0001-0001-000000000005', true),   -- Pac 15 (reuso cônjuge Pac 05)
  ('eeeeeeee-0001-0001-0001-000000000021', 'dddddddd-0001-0001-0001-000000000001', true),   -- Pac 21 (reuso)
  -- AGUARDANDO_REGULACAO
  ('eeeeeeee-0001-0001-0001-000000000022', 'dddddddd-0001-0001-0001-000000000017', true),   -- Pac 22 -> pai
  ('eeeeeeee-0001-0001-0001-000000000023', 'dddddddd-0001-0001-0001-000000000018', true),   -- Pac 24 -> resp legal
  ('eeeeeeee-0001-0001-0001-000000000024', 'dddddddd-0001-0001-0001-000000000007', true),   -- Pac 07 -> mãe (resp legal)
  ('eeeeeeee-0001-0001-0001-000000000025', 'dddddddd-0001-0001-0001-000000000008', true),   -- Pac 08 -> filho
  -- AGUARDANDO_CNRAC
  ('eeeeeeee-0001-0001-0001-000000000027', 'dddddddd-0001-0001-0001-000000000012', true),   -- Pac 13 -> neta resp legal
  ('eeeeeeee-0001-0001-0001-000000000028', 'dddddddd-0001-0001-0001-000000000015', true),   -- Pac 19 -> cônjuge
  ('eeeeeeee-0001-0001-0001-000000000028', 'dddddddd-0001-0001-0001-000000000016', false),  -- Pac 19 -> filha (2 acomp)
  ('eeeeeeee-0001-0001-0001-000000000029', 'dddddddd-0001-0001-0001-000000000020', true),   -- Pac 29 -> cônjuge
  -- AGUARDANDO_SETI
  ('eeeeeeee-0001-0001-0001-000000000030', 'dddddddd-0001-0001-0001-000000000009', true),   -- Pac 09 -> cônjuge
  ('eeeeeeee-0001-0001-0001-000000000031', 'dddddddd-0001-0001-0001-000000000001', true),   -- Pac 17 (reuso)
  -- AGUARDANDO_AGENDAMENTO
  ('eeeeeeee-0001-0001-0001-000000000032', 'dddddddd-0001-0001-0001-000000000003', true),   -- Pac 03 -> filha
  ('eeeeeeee-0001-0001-0001-000000000033', 'dddddddd-0001-0001-0001-000000000011', true),   -- Pac 11 -> cônjuge
  ('eeeeeeee-0001-0001-0001-000000000035', 'dddddddd-0001-0001-0001-000000000005', true),   -- Pac 15 (reuso)
  -- AGUARDANDO_EMISSAO
  ('eeeeeeee-0001-0001-0001-000000000036', 'dddddddd-0001-0001-0001-000000000001', true),   -- Pac 04 (reuso)
  ('eeeeeeee-0001-0001-0001-000000000038', 'dddddddd-0001-0001-0001-000000000017', true),   -- Pac 22 -> pai
  -- EMITIDA
  ('eeeeeeee-0001-0001-0001-000000000040', 'dddddddd-0001-0001-0001-000000000005', true),   -- Pac 05 -> cônjuge
  ('eeeeeeee-0001-0001-0001-000000000041', 'dddddddd-0001-0001-0001-000000000013', true),   -- Pac 14 -> cônjuge
  -- EM_VIAGEM
  ('eeeeeeee-0001-0001-0001-000000000043', 'dddddddd-0001-0001-0001-000000000001', true),   -- Pac 01 -> cônjuge
  ('eeeeeeee-0001-0001-0001-000000000044', 'dddddddd-0001-0001-0001-000000000006', true),   -- Pac 06 -> mãe
  -- EM_PERMANENCIA
  ('eeeeeeee-0001-0001-0001-000000000046', 'dddddddd-0001-0001-0001-000000000008', true),   -- Pac 08 -> filho
  ('eeeeeeee-0001-0001-0001-000000000047', 'dddddddd-0001-0001-0001-000000000015', true),   -- Pac 19 -> cônjuge
  ('eeeeeeee-0001-0001-0001-000000000048', 'dddddddd-0001-0001-0001-000000000019', true),   -- Pac 28 -> filho
  -- CONCLUIDO
  ('eeeeeeee-0001-0001-0001-000000000049', 'dddddddd-0001-0001-0001-000000000002', true),   -- Pac 02 -> filho
  ('eeeeeeee-0001-0001-0001-000000000050', 'dddddddd-0001-0001-0001-000000000007', true),   -- Pac 07 -> mãe
  ('eeeeeeee-0001-0001-0001-000000000051', 'dddddddd-0001-0001-0001-000000000012', true),   -- Pac 13 -> neta
  ('eeeeeeee-0001-0001-0001-000000000053', 'dddddddd-0001-0001-0001-000000000001', true),   -- Pac 23 (reuso)
  -- CANCELADO
  ('eeeeeeee-0001-0001-0001-000000000059', 'dddddddd-0001-0001-0001-000000000018', true),   -- Pac 24 -> resp legal
  ('eeeeeeee-0001-0001-0001-000000000060', 'dddddddd-0001-0001-0001-000000000011', true)    -- Pac 11 -> cônjuge
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 7. TERMOS DE COMPROMISSO
-- Um para cada solicitação (obrigatório para avançar fluxo)
-- ============================================================================

INSERT INTO termos_compromisso (solicitacao_id, numero_processo, paciente_nome, paciente_cpf, paciente_rg, paciente_cns, paciente_endereco, paciente_municipio, status, modalidade_aceite, confirmacao_leitura, local_registro, data_registro, registrado_por) VALUES
  -- Seleção representativa: todas as solicitações do 09 em diante (com dados clínicos)
  ('eeeeeeee-0001-0001-0001-000000000009', 'SEED-TC-009', 'João Batista Ferreira Neto',      '00300300303', '1234567', '700000000000003', 'Rua Grande, 88 - Centro', 'São Luís', 'REGISTRADO', 'ACEITE_PRESENCIAL', true, 'Secretaria Municipal de Saúde - São Luís', '2026-03-28', 'bbbbbbbb-0001-0001-0001-000000000001'),
  ('eeeeeeee-0001-0001-0001-000000000010', 'SEED-TC-010', 'Francisca Edilene Rodrigues',      '00400400404', '2345678', '700000000000004', 'Rua da Paz, 33 - Monte Castelo', 'São Luís', 'REGISTRADO', 'UPLOAD_ASSINADO', true, 'Secretaria Municipal de Saúde - São Luís', '2026-03-29', 'bbbbbbbb-0001-0001-0001-000000000001'),
  ('eeeeeeee-0001-0001-0001-000000000011', 'SEED-TC-011', 'Tereza Cristina Barros',           '01001001010', '3456789', '700000000000010', 'Av. Jerônimo de Albuquerque, 1200 - Cohama', 'São Luís', 'REGISTRADO', 'ACEITE_PRESENCIAL', true, 'Secretaria Municipal de Saúde - São Luís', '2026-03-30', 'bbbbbbbb-0001-0001-0001-000000000001'),
  ('eeeeeeee-0001-0001-0001-000000000014', 'SEED-TC-014', 'José Ribamar Oliveira',            '00900900909', '4567890', '700000000000009', 'Rua do Passeio, 342 - Centro', 'São Luís', 'REGISTRADO', 'ACEITE_PRESENCIAL', true, 'Secretaria Municipal de Saúde - São Luís', '2026-03-20', 'bbbbbbbb-0001-0001-0001-000000000001'),
  ('eeeeeeee-0001-0001-0001-000000000015', 'SEED-TC-015', 'Rosângela Maria Vieira',           '01401401414', '5678901', '700000000000014', 'Rua Godofredo Viana, 330 - Centro', 'Imperatriz', 'REGISTRADO', 'UPLOAD_ASSINADO', true, 'Secretaria Municipal de Saúde - Imperatriz', '2026-03-21', 'bbbbbbbb-0001-0001-0001-000000000002'),
  ('eeeeeeee-0001-0001-0001-000000000022', 'SEED-TC-022', 'Rita de Cássia Moreira',           '02202202222', '6789012', '700000000000022', 'Praça da Bandeira, 12 - Centro', 'Caxias', 'REGISTRADO', 'ACEITE_PRESENCIAL', true, 'Secretaria Municipal de Saúde - Caxias', '2026-03-10', 'bbbbbbbb-0001-0001-0001-000000000001'),
  ('eeeeeeee-0001-0001-0001-000000000027', 'SEED-TC-027', 'Manoel Messias da Cruz',           '01301301313', '7890123', '700000000000013', 'Rua do Apicum, 210 - Centro', 'São Luís', 'REGISTRADO', 'ACEITE_PRESENCIAL', true, 'Secretaria Municipal de Saúde - São Luís', '2026-03-05', 'bbbbbbbb-0001-0001-0001-000000000001'),
  ('eeeeeeee-0001-0001-0001-000000000030', 'SEED-TC-030', 'José Ribamar Oliveira',            '00900900909', '4567890', '700000000000009', 'Rua do Passeio, 342 - Centro', 'São Luís', 'REGISTRADO', 'UPLOAD_ASSINADO', true, 'Secretaria Municipal de Saúde - São Luís', '2026-02-20', 'bbbbbbbb-0001-0001-0001-000000000001'),
  ('eeeeeeee-0001-0001-0001-000000000032', 'SEED-TC-032', 'João Batista Ferreira Neto',       '00300300303', '1234567', '700000000000003', 'Rua Grande, 88 - Centro', 'São Luís', 'REGISTRADO', 'ACEITE_PRESENCIAL', true, 'Secretaria Municipal de Saúde - São Luís', '2026-02-25', 'bbbbbbbb-0001-0001-0001-000000000001'),
  ('eeeeeeee-0001-0001-0001-000000000036', 'SEED-TC-036', 'Francisca Edilene Rodrigues',      '00400400404', '2345678', '700000000000004', 'Rua da Paz, 33 - Monte Castelo', 'São Luís', 'REGISTRADO', 'UPLOAD_ASSINADO', true, 'Secretaria Municipal de Saúde - São Luís', '2026-02-15', 'bbbbbbbb-0001-0001-0001-000000000001'),
  ('eeeeeeee-0001-0001-0001-000000000040', 'SEED-TC-040', 'Raimundo Nonato Santos',           '00500500505', '8901234', '700000000000005', 'Rua Barão do Rio Branco, 200 - Centro', 'Imperatriz', 'REGISTRADO', 'ACEITE_PRESENCIAL', true, 'Secretaria Municipal de Saúde - Imperatriz', '2026-02-10', 'bbbbbbbb-0001-0001-0001-000000000002'),
  ('eeeeeeee-0001-0001-0001-000000000043', 'SEED-TC-043', 'Antônio Carlos Sousa Lima',        '00100100101', '0012345', '700000000000001', 'Rua do Sol, 120 - Centro', 'São Luís', 'REGISTRADO', 'ACEITE_PRESENCIAL', true, 'Secretaria Municipal de Saúde - São Luís', '2026-02-01', 'bbbbbbbb-0001-0001-0001-000000000001'),
  ('eeeeeeee-0001-0001-0001-000000000046', 'SEED-TC-046', 'Luzia Aparecida Mendes',           '00800800808', '1123456', '700000000000008', 'Rua Coelho Neto, 67 - Centro', 'Caxias', 'REGISTRADO', 'UPLOAD_ASSINADO', true, 'Secretaria Municipal de Saúde - Caxias', '2026-01-20', 'bbbbbbbb-0001-0001-0001-000000000001'),
  ('eeeeeeee-0001-0001-0001-000000000049', 'SEED-TC-049', 'Maria José da Conceição',          '00200200202', '2234567', '700000000000002', 'Av. dos Holandeses, 450 - Calhau', 'São Luís', 'REGISTRADO', 'ACEITE_PRESENCIAL', true, 'Secretaria Municipal de Saúde - São Luís', '2026-01-10', 'bbbbbbbb-0001-0001-0001-000000000001'),
  ('eeeeeeee-0001-0001-0001-000000000050', 'SEED-TC-050', 'Pedro Henrique Alves Moura',       '00700700707', '3345678', '700000000000007', 'Rua das Flores, 15 - Cohama', 'São Luís', 'REGISTRADO', 'UPLOAD_ASSINADO', true, 'Secretaria Municipal de Saúde - São Luís', '2026-01-05', 'bbbbbbbb-0001-0001-0001-000000000001'),
  ('eeeeeeee-0001-0001-0001-000000000057', 'SEED-TC-057', 'Ademar Fonseca Teixeira',          '02102102121', '4456789', '700000000000021', 'Rua Rio Branco, 88 - Centro', 'São Luís', 'REGISTRADO', 'ACEITE_PRESENCIAL', true, 'Secretaria Municipal de Saúde - São Luís', '2026-03-01', 'bbbbbbbb-0001-0001-0001-000000000001')
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 8. PARECERES (30 registros)
-- Para solicitações que avançaram além do estágio NOVO
-- ============================================================================

INSERT INTO pareceres (id, solicitacao_id, medico_auditor_id, decisao, justificativa, checklist_elegibilidade, autoriza_acompanhante, observacoes_medicas, created_at) VALUES
  -- EM_ANALISE (em andamento)
  ('ffffffff-0001-0001-0001-000000000001', 'eeeeeeee-0001-0001-0001-000000000014', 'bbbbbbbb-0001-0001-0001-000000000005', 'DEFERIDO', 'Paciente com DRC estágio V, clearance < 15 mL/min. Transplante renal indicado. Serviço não disponível no estado.', '{}'::jsonb, true, 'Verificar compatibilidade HLA no centro transplantador', '2026-03-22 09:00:00-03'),
  ('ffffffff-0001-0001-0001-000000000002', 'eeeeeeee-0001-0001-0001-000000000015', 'bbbbbbbb-0001-0001-0001-000000000005', 'DEFERIDO', 'Adenocarcinoma pulmonar IIIB confirmado por biópsia. Protocolo quimioterápico específico não disponível na rede estadual.', '{}'::jsonb, true, 'Paciente debilitada, necessita acompanhante obrigatório', '2026-03-23 10:30:00-03'),
  ('ffffffff-0001-0001-0001-000000000003', 'eeeeeeee-0001-0001-0001-000000000016', 'bbbbbbbb-0001-0001-0001-000000000005', 'DEFERIDO', 'Catarata senil madura bilateral com AV < 20/200. Fila para facoemulsificação > 12 meses no estado.', '{}'::jsonb, false, 'Paciente com boa condição geral, não necessita acompanhante', '2026-03-24 09:15:00-03'),
  ('ffffffff-0001-0001-0001-000000000004', 'eeeeeeee-0001-0001-0001-000000000017', 'bbbbbbbb-0001-0001-0001-000000000005', 'DEFERIDO', 'Estenose aórtica grave sintomática. Gradiente médio > 40 mmHg. Indicação formal de troca valvar.', '{}'::jsonb, true, 'Risco cirúrgico moderado — solicitar avaliação pré-anestésica no destino', '2026-03-25 11:00:00-03'),

  -- EXIGENCIA (parecer com exigência)
  ('ffffffff-0001-0001-0001-000000000005', 'eeeeeeee-0001-0001-0001-000000000019', 'bbbbbbbb-0001-0001-0001-000000000005', 'EXIGENCIA', 'Laudo médico insuficiente. Necessário relatório detalhado com indicação cirúrgica e exames complementares.', '{}'::jsonb, true, 'Solicitar ultrassonografia abdominal recente e exames pré-operatórios', '2026-03-18 09:00:00-03'),
  ('ffffffff-0001-0001-0001-000000000006', 'eeeeeeee-0001-0001-0001-000000000020', 'bbbbbbbb-0001-0001-0001-000000000005', 'EXIGENCIA', 'Falta comprovante de que o procedimento não está disponível na rede municipal/estadual.', '{}'::jsonb, false, 'Solicitar declaração da unidade de saúde local', '2026-03-19 10:30:00-03'),
  ('ffffffff-0001-0001-0001-000000000007', 'eeeeeeee-0001-0001-0001-000000000021', 'bbbbbbbb-0001-0001-0001-000000000005', 'EXIGENCIA', 'Necessário laudo de pneumologista com histórico de tratamentos anteriores e justificativa para terapia biológica.', '{}'::jsonb, true, 'Paciente relata múltiplas internações — solicitar relatórios hospitalares', '2026-03-20 14:00:00-03'),

  -- AGUARDANDO_REGULACAO (deferidos)
  ('ffffffff-0001-0001-0001-000000000008', 'eeeeeeee-0001-0001-0001-000000000022', 'bbbbbbbb-0001-0001-0001-000000000005', 'DEFERIDO', 'Pós-mastectomia com indicação formal de radioterapia adjuvante. Equipamento conformacional indisponível no estado.', '{}'::jsonb, true, NULL, '2026-03-12 09:00:00-03'),
  ('ffffffff-0001-0001-0001-000000000009', 'eeeeeeee-0001-0001-0001-000000000023', 'bbbbbbbb-0001-0001-0001-000000000005', 'DEFERIDO', 'Pós-transplante renal com 6 meses — acompanhamento obrigatório no centro transplantador.', '{}'::jsonb, true, NULL, '2026-03-13 10:00:00-03'),
  ('ffffffff-0001-0001-0001-000000000010', 'eeeeeeee-0001-0001-0001-000000000024', 'bbbbbbbb-0001-0001-0001-000000000005', 'DEFERIDO', 'Epilepsia refratária documentada com necessidade de videoEEG de longa duração. Menor de idade.', '{}'::jsonb, true, 'Obrigatória presença do responsável legal durante internação', '2026-03-14 08:30:00-03'),
  ('ffffffff-0001-0001-0001-000000000011', 'eeeeeeee-0001-0001-0001-000000000025', 'bbbbbbbb-0001-0001-0001-000000000005', 'DEFERIDO', 'Coronariopatia obstrutiva trivascular grave. Indicação de revascularização miocárdica.', '{}'::jsonb, true, NULL, '2026-03-15 11:15:00-03'),
  ('ffffffff-0001-0001-0001-000000000012', 'eeeeeeee-0001-0001-0001-000000000026', 'bbbbbbbb-0001-0001-0001-000000000005', 'DEFERIDO', 'Hérnia discal L4-L5 com comprometimento radicular. Indicação de avaliação neurocirúrgica.', '{}'::jsonb, false, NULL, '2026-03-16 09:45:00-03'),

  -- AGUARDANDO_CNRAC (deferidos)
  ('ffffffff-0001-0001-0001-000000000013', 'eeeeeeee-0001-0001-0001-000000000027', 'bbbbbbbb-0001-0001-0001-000000000005', 'DEFERIDO', 'Neoplasia pulmonar com indicação cirúrgica. Necessária regulação via CNRAC.', '{}'::jsonb, true, NULL, '2026-03-07 09:00:00-03'),
  ('ffffffff-0001-0001-0001-000000000014', 'eeeeeeee-0001-0001-0001-000000000028', 'bbbbbbbb-0001-0001-0001-000000000005', 'DEFERIDO', 'Estenose aórtica grave — indicação de troca valvar via CNRAC.', '{}'::jsonb, true, NULL, '2026-03-08 10:30:00-03'),
  ('ffffffff-0001-0001-0001-000000000015', 'eeeeeeee-0001-0001-0001-000000000029', 'bbbbbbbb-0001-0001-0001-000000000005', 'DEFERIDO', 'Gonartrose bilateral grave com indicação de artroplastia — CNRAC.', '{}'::jsonb, true, NULL, '2026-03-09 08:00:00-03'),

  -- AGUARDANDO_SETI (deferidos)
  ('ffffffff-0001-0001-0001-000000000016', 'eeeeeeee-0001-0001-0001-000000000030', 'bbbbbbbb-0001-0001-0001-000000000005', 'DEFERIDO', 'DRC estágio V em hemodiálise — paciente em lista de transplante renal ativa.', '{}'::jsonb, true, NULL, '2026-02-22 09:00:00-03'),
  ('ffffffff-0001-0001-0001-000000000017', 'eeeeeeee-0001-0001-0001-000000000031', 'bbbbbbbb-0001-0001-0001-000000000005', 'DEFERIDO', 'Insuficiência hepática crônica CHILD C — listado para transplante hepático.', '{}'::jsonb, true, 'Caso grave — prioridade máxima', '2026-02-24 10:30:00-03'),

  -- Mais avançados (agendamento, emissão, viagem, permanência, concluído)
  ('ffffffff-0001-0001-0001-000000000018', 'eeeeeeee-0001-0001-0001-000000000032', 'bbbbbbbb-0001-0001-0001-000000000005', 'DEFERIDO', 'Câncer de mama com indicação de mastectomia radical.', '{}'::jsonb, true, NULL, '2026-02-27 09:00:00-03'),
  ('ffffffff-0001-0001-0001-000000000019', 'eeeeeeee-0001-0001-0001-000000000036', 'bbbbbbbb-0001-0001-0001-000000000005', 'DEFERIDO', 'Coronariopatia grave — revascularização miocárdica indicada.', '{}'::jsonb, true, NULL, '2026-02-17 09:00:00-03'),
  ('ffffffff-0001-0001-0001-000000000020', 'eeeeeeee-0001-0001-0001-000000000040', 'bbbbbbbb-0001-0001-0001-000000000005', 'DEFERIDO', 'Câncer de próstata — protocolo quimioterápico aprovado.', '{}'::jsonb, true, NULL, '2026-02-12 09:00:00-03'),
  ('ffffffff-0001-0001-0001-000000000021', 'eeeeeeee-0001-0001-0001-000000000043', 'bbbbbbbb-0001-0001-0001-000000000005', 'DEFERIDO', 'Retorno cardiológico pós-cateterismo — acompanhamento necessário.', '{}'::jsonb, true, NULL, '2026-02-03 09:00:00-03'),
  ('ffffffff-0001-0001-0001-000000000022', 'eeeeeeee-0001-0001-0001-000000000046', 'bbbbbbbb-0001-0001-0001-000000000005', 'DEFERIDO', 'Estenose aórtica grave — pós-operatório de troca valvar.', '{}'::jsonb, true, NULL, '2026-01-22 09:00:00-03'),
  ('ffffffff-0001-0001-0001-000000000023', 'eeeeeeee-0001-0001-0001-000000000047', 'bbbbbbbb-0001-0001-0001-000000000005', 'DEFERIDO', 'Câncer de próstata — continuidade de quimioterapia.', '{}'::jsonb, true, NULL, '2026-01-24 10:30:00-03'),
  ('ffffffff-0001-0001-0001-000000000024', 'eeeeeeee-0001-0001-0001-000000000048', 'bbbbbbbb-0001-0001-0001-000000000005', 'DEFERIDO', 'DRC — preparo para transplante renal.', '{}'::jsonb, true, NULL, '2026-01-27 08:00:00-03'),

  -- CONCLUIDOS
  ('ffffffff-0001-0001-0001-000000000025', 'eeeeeeee-0001-0001-0001-000000000049', 'bbbbbbbb-0001-0001-0001-000000000005', 'DEFERIDO', 'Mastectomia radical — procedimento deferido e concluído.', '{}'::jsonb, true, NULL, '2026-01-12 09:00:00-03'),
  ('ffffffff-0001-0001-0001-000000000026', 'eeeeeeee-0001-0001-0001-000000000050', 'bbbbbbbb-0001-0001-0001-000000000005', 'DEFERIDO', 'Cirurgia de epilepsia — procedimento deferido e concluído.', '{}'::jsonb, true, NULL, '2026-01-07 10:00:00-03'),
  ('ffffffff-0001-0001-0001-000000000027', 'eeeeeeee-0001-0001-0001-000000000051', 'bbbbbbbb-0001-0001-0001-000000000005', 'DEFERIDO', 'Facoemulsificação bilateral deferida e concluída.', '{}'::jsonb, true, NULL, '2026-01-10 08:30:00-03'),

  -- INDEFERIDOS
  ('ffffffff-0001-0001-0001-000000000028', 'eeeeeeee-0001-0001-0001-000000000057', 'bbbbbbbb-0001-0001-0001-000000000005', 'INDEFERIDO', 'Lombalgia crônica inespecífica sem indicação cirúrgica. Tratamento conservador disponível na rede estadual.', '{}'::jsonb, false, 'Encaminhar para fisioterapia no município de origem', '2026-03-03 09:00:00-03'),
  ('ffffffff-0001-0001-0001-000000000029', 'eeeeeeee-0001-0001-0001-000000000058', 'bbbbbbbb-0001-0001-0001-000000000005', 'INDEFERIDO', 'Asma leve persistente controlada com medicação. Procedimento disponível na rede básica municipal.', '{}'::jsonb, false, 'Manter acompanhamento na UBS de origem', '2026-03-04 10:00:00-03'),

  -- Extra para EM_ANALISE residual
  ('ffffffff-0001-0001-0001-000000000030', 'eeeeeeee-0001-0001-0001-000000000018', 'bbbbbbbb-0001-0001-0001-000000000005', 'DEFERIDO', 'Diabetes com neuropatia periférica avançada. Eletroneuromiografia não disponível na regional.', '{}'::jsonb, false, NULL, '2026-03-26 08:30:00-03')
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 9. ROTAS DE REGULAÇÃO (20 registros)
-- ============================================================================

INSERT INTO rotas_regulacao (id, solicitacao_id, responsavel_id, tipo_rota, justificativa, data_retorno_previsto, status_espera, created_at) VALUES
  -- AGUARDANDO_REGULACAO -> regulação direta
  ('11111111-0001-0001-0001-000000000001', 'eeeeeeee-0001-0001-0001-000000000022', 'bbbbbbbb-0001-0001-0001-000000000006', 'APROVADO_DIRETO', 'Encaminhamento direto para Hospital de Câncer de Barretos — convênio SUS ativo', '2026-03-25', 'AGUARDANDO', '2026-03-13 09:00:00-03'),
  ('11111111-0001-0001-0001-000000000002', 'eeeeeeee-0001-0001-0001-000000000023', 'bbbbbbbb-0001-0001-0001-000000000006', 'APROVADO_DIRETO', 'Retorno programado ao centro transplantador — agendamento direto', '2026-03-28', 'AGUARDANDO', '2026-03-14 10:00:00-03'),
  ('11111111-0001-0001-0001-000000000003', 'eeeeeeee-0001-0001-0001-000000000024', 'bbbbbbbb-0001-0001-0001-000000000006', 'APROVADO_DIRETO', 'VideoEEG — contato direto com HC-FMUSP confirmado', '2026-03-30', 'AGUARDANDO', '2026-03-15 08:30:00-03'),
  ('11111111-0001-0001-0001-000000000004', 'eeeeeeee-0001-0001-0001-000000000025', 'bbbbbbbb-0001-0001-0001-000000000006', 'APROVADO_DIRETO', 'Encaminhamento para InCor via contato institucional', '2026-04-01', 'AGUARDANDO', '2026-03-16 11:15:00-03'),
  ('11111111-0001-0001-0001-000000000005', 'eeeeeeee-0001-0001-0001-000000000026', 'bbbbbbbb-0001-0001-0001-000000000006', 'APROVADO_DIRETO', 'Consulta neurocirúrgica em São Luís — regulação intraestadual', '2026-03-28', 'AGUARDANDO', '2026-03-17 09:45:00-03'),

  -- CNRAC
  ('11111111-0001-0001-0001-000000000006', 'eeeeeeee-0001-0001-0001-000000000027', 'bbbbbbbb-0001-0001-0001-000000000006', 'CNRAC', 'Solicitação CNRAC para cirurgia torácica oncológica — aguardando resposta', '2026-04-15', 'AGUARDANDO', '2026-03-08 09:00:00-03'),
  ('11111111-0001-0001-0001-000000000007', 'eeeeeeee-0001-0001-0001-000000000028', 'bbbbbbbb-0001-0001-0001-000000000006', 'CNRAC', 'Solicitação CNRAC para cirurgia cardiovascular — processo em análise federal', '2026-04-20', 'AGUARDANDO', '2026-03-09 10:30:00-03'),
  ('11111111-0001-0001-0001-000000000008', 'eeeeeeee-0001-0001-0001-000000000029', 'bbbbbbbb-0001-0001-0001-000000000006', 'CNRAC', 'CNRAC para artroplastia bilateral de joelho', '2026-04-10', 'AGUARDANDO', '2026-03-10 08:00:00-03'),

  -- SETI
  ('11111111-0001-0001-0001-000000000009', 'eeeeeeee-0001-0001-0001-000000000030', 'bbbbbbbb-0001-0001-0001-000000000006', 'SETI', 'Paciente em fila de transplante renal — aguardando SETI', NULL, 'AGUARDANDO', '2026-02-23 09:00:00-03'),
  ('11111111-0001-0001-0001-000000000010', 'eeeeeeee-0001-0001-0001-000000000031', 'bbbbbbbb-0001-0001-0001-000000000006', 'SETI', 'Transplante hepático — listado no SNT, aguardando SETI', NULL, 'AGUARDANDO', '2026-02-25 10:30:00-03'),

  -- Regulações concluídas (RESPONDIDO) — para processos mais avançados
  ('11111111-0001-0001-0001-000000000011', 'eeeeeeee-0001-0001-0001-000000000032', 'bbbbbbbb-0001-0001-0001-000000000006', 'APROVADO_DIRETO', 'Agendamento confirmado no Hospital Sírio-Libanês', '2026-03-15', 'RESPONDIDO', '2026-02-28 09:00:00-03'),
  ('11111111-0001-0001-0001-000000000012', 'eeeeeeee-0001-0001-0001-000000000033', 'bbbbbbbb-0001-0001-0001-000000000006', 'APROVADO_DIRETO', 'Agendamento confirmado no HOB — Brasília', '2026-03-10', 'RESPONDIDO', '2026-02-28 10:00:00-03'),
  ('11111111-0001-0001-0001-000000000013', 'eeeeeeee-0001-0001-0001-000000000036', 'bbbbbbbb-0001-0001-0001-000000000006', 'CNRAC', 'CNRAC aprovada — InCor confirmou agendamento', '2026-03-05', 'RESPONDIDO', '2026-02-18 09:00:00-03'),
  ('11111111-0001-0001-0001-000000000014', 'eeeeeeee-0001-0001-0001-000000000040', 'bbbbbbbb-0001-0001-0001-000000000006', 'APROVADO_DIRETO', 'INCA confirmou vaga para quimioterapia', '2026-02-25', 'RESPONDIDO', '2026-02-13 09:00:00-03'),
  ('11111111-0001-0001-0001-000000000015', 'eeeeeeee-0001-0001-0001-000000000041', 'bbbbbbbb-0001-0001-0001-000000000006', 'APROVADO_DIRETO', 'Hospital Sírio-Libanês — cirurgia torácica agendada', '2026-02-28', 'RESPONDIDO', '2026-02-14 10:30:00-03'),
  ('11111111-0001-0001-0001-000000000016', 'eeeeeeee-0001-0001-0001-000000000043', 'bbbbbbbb-0001-0001-0001-000000000006', 'APROVADO_DIRETO', 'Retorno cardiológico agendado no InCor', '2026-02-15', 'RESPONDIDO', '2026-02-04 09:00:00-03'),
  ('11111111-0001-0001-0001-000000000017', 'eeeeeeee-0001-0001-0001-000000000046', 'bbbbbbbb-0001-0001-0001-000000000006', 'CNRAC', 'CNRAC para troca valvar — InCor', '2026-01-30', 'RESPONDIDO', '2026-01-23 09:00:00-03'),
  ('11111111-0001-0001-0001-000000000018', 'eeeeeeee-0001-0001-0001-000000000049', 'bbbbbbbb-0001-0001-0001-000000000006', 'APROVADO_DIRETO', 'Cirurgia oncológica concluída — processo encerrado', '2026-01-25', 'ENCERRADO', '2026-01-13 09:00:00-03'),
  ('11111111-0001-0001-0001-000000000019', 'eeeeeeee-0001-0001-0001-000000000050', 'bbbbbbbb-0001-0001-0001-000000000006', 'APROVADO_DIRETO', 'Cirurgia de epilepsia concluída — processo encerrado', '2026-01-20', 'ENCERRADO', '2026-01-08 10:00:00-03'),
  ('11111111-0001-0001-0001-000000000020', 'eeeeeeee-0001-0001-0001-000000000051', 'bbbbbbbb-0001-0001-0001-000000000006', 'APROVADO_DIRETO', 'Facoemulsificação concluída — processo encerrado', '2026-01-22', 'ENCERRADO', '2026-01-11 08:30:00-03')
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 10. AGENDAMENTOS (15 registros)
-- ============================================================================

INSERT INTO agendamentos (id, solicitacao_id, unidade_executante, cidade_destino, uf_destino, tipo_atendimento, data_hora_agendamento, origem_agendamento, status, created_at) VALUES
  -- AGUARDANDO_AGENDAMENTO
  ('22222222-0001-0001-0001-000000000001', 'eeeeeeee-0001-0001-0001-000000000032', 'Hospital Sírio-Libanês',              'São Paulo',      'SP', 'CIRURGIA',            '2026-04-15 08:00:00-03', 'CONTATO_DIRETO', 'CONFIRMADO', '2026-03-05 09:00:00-03'),
  ('22222222-0001-0001-0001-000000000002', 'eeeeeeee-0001-0001-0001-000000000033', 'Hospital Oftalmológico de Brasília',   'Brasília',       'DF', 'CIRURGIA',            '2026-04-18 07:30:00-03', 'CONTATO_DIRETO', 'CONFIRMADO', '2026-03-06 10:00:00-03'),
  ('22222222-0001-0001-0001-000000000003', 'eeeeeeee-0001-0001-0001-000000000034', 'Hospital das Clínicas da FMUSP',      'São Paulo',      'SP', 'CONSULTA',            '2026-04-20 14:00:00-03', 'EMAIL',          'AGUARDANDO_CONFIRMACAO', '2026-03-07 14:30:00-03'),

  -- AGUARDANDO_EMISSAO
  ('22222222-0001-0001-0001-000000000004', 'eeeeeeee-0001-0001-0001-000000000036', 'Instituto do Coração - InCor',        'São Paulo',      'SP', 'CIRURGIA',            '2026-04-10 07:00:00-03', 'CNRAC',          'CONFIRMADO', '2026-02-20 09:00:00-03'),
  ('22222222-0001-0001-0001-000000000005', 'eeeeeeee-0001-0001-0001-000000000037', 'Hospital das Clínicas da FMUSP',      'São Paulo',      'SP', 'EXAME',               '2026-04-12 08:00:00-03', 'CONTATO_DIRETO', 'CONFIRMADO', '2026-02-21 10:30:00-03'),
  ('22222222-0001-0001-0001-000000000006', 'eeeeeeee-0001-0001-0001-000000000038', 'Hospital de Câncer de Barretos',      'Barretos',       'SP', 'TRATAMENTO_CONTINUO', '2026-04-08 08:00:00-03', 'CONTATO_DIRETO', 'CONFIRMADO', '2026-02-22 08:00:00-03'),

  -- EMITIDA
  ('22222222-0001-0001-0001-000000000007', 'eeeeeeee-0001-0001-0001-000000000040', 'INCA — Instituto Nacional de Câncer', 'Rio de Janeiro', 'RJ', 'TRATAMENTO_CONTINUO', '2026-04-05 09:00:00-03', 'CONTATO_DIRETO', 'CONFIRMADO', '2026-02-15 09:00:00-03'),
  ('22222222-0001-0001-0001-000000000008', 'eeeeeeee-0001-0001-0001-000000000041', 'Hospital Sírio-Libanês',              'São Paulo',      'SP', 'CIRURGIA',            '2026-04-07 07:30:00-03', 'CONTATO_DIRETO', 'CONFIRMADO', '2026-02-16 10:30:00-03'),

  -- EM_VIAGEM
  ('22222222-0001-0001-0001-000000000009', 'eeeeeeee-0001-0001-0001-000000000043', 'Instituto do Coração - InCor',        'São Paulo',      'SP', 'CONSULTA',            '2026-04-04 10:00:00-03', 'CONTATO_DIRETO', 'CONFIRMADO', '2026-02-05 09:00:00-03'),
  ('22222222-0001-0001-0001-000000000010', 'eeeeeeee-0001-0001-0001-000000000044', 'Hospital Albert Einstein',             'São Paulo',      'SP', 'TRATAMENTO_CONTINUO', '2026-04-04 08:00:00-03', 'CONTATO_DIRETO', 'CONFIRMADO', '2026-02-06 10:30:00-03'),
  ('22222222-0001-0001-0001-000000000011', 'eeeeeeee-0001-0001-0001-000000000045', 'Hospital Oftalmológico de Brasília',   'Brasília',       'DF', 'CIRURGIA',            '2026-04-03 07:30:00-03', 'EMAIL',          'CONFIRMADO', '2026-02-07 08:00:00-03'),

  -- EM_PERMANENCIA
  ('22222222-0001-0001-0001-000000000012', 'eeeeeeee-0001-0001-0001-000000000046', 'Instituto do Coração - InCor',        'São Paulo',      'SP', 'CIRURGIA',            '2026-03-20 07:00:00-03', 'CNRAC',          'CONFIRMADO', '2026-01-25 09:00:00-03'),
  ('22222222-0001-0001-0001-000000000013', 'eeeeeeee-0001-0001-0001-000000000047', 'INCA — Instituto Nacional de Câncer', 'Rio de Janeiro', 'RJ', 'TRATAMENTO_CONTINUO', '2026-03-15 09:00:00-03', 'CONTATO_DIRETO', 'CONFIRMADO', '2026-01-26 10:30:00-03'),

  -- CONCLUIDO (exemplos)
  ('22222222-0001-0001-0001-000000000014', 'eeeeeeee-0001-0001-0001-000000000049', 'Hospital Sírio-Libanês',              'São Paulo',      'SP', 'CIRURGIA',            '2026-02-10 08:00:00-03', 'CONTATO_DIRETO', 'CONFIRMADO', '2026-01-15 09:00:00-03'),
  ('22222222-0001-0001-0001-000000000015', 'eeeeeeee-0001-0001-0001-000000000050', 'Hospital das Clínicas da FMUSP',      'São Paulo',      'SP', 'CIRURGIA',            '2026-02-05 07:30:00-03', 'CNRAC',          'CONFIRMADO', '2026-01-10 10:00:00-03')
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 11. VIAGENS (12 registros)
-- ============================================================================

INSERT INTO viagens (id, solicitacao_id, tipo, modal, origem_cidade, origem_uf, destino_cidade, destino_uf, com_pernoite, data_embarque_prevista, data_embarque_real, situacao, valor, companhia, numero_bilhete, emissor_id, emitido_em, created_at) VALUES
  -- EMITIDA (passagens emitidas, ainda não embarcou)
  ('33333333-0001-0001-0001-000000000001', 'eeeeeeee-0001-0001-0001-000000000040', 'IDA', 'AEREO', 'Imperatriz', 'MA', 'Rio de Janeiro', 'RJ', true, '2026-04-04', NULL, 'EMITIDA', 1250.00, 'LATAM Airlines', 'LA-TFD-20260404-001', 'bbbbbbbb-0001-0001-0001-000000000007', '2026-03-28 09:00:00-03', '2026-03-28 09:00:00-03'),
  ('33333333-0001-0001-0001-000000000002', 'eeeeeeee-0001-0001-0001-000000000041', 'IDA', 'AEREO', 'Imperatriz', 'MA', 'São Paulo', 'SP', true, '2026-04-06', NULL, 'EMITIDA', 1380.00, 'GOL Linhas Aéreas', 'G3-TFD-20260406-001', 'bbbbbbbb-0001-0001-0001-000000000007', '2026-03-29 10:30:00-03', '2026-03-29 10:30:00-03'),
  ('33333333-0001-0001-0001-000000000003', 'eeeeeeee-0001-0001-0001-000000000042', 'IDA_E_VOLTA', 'TERRESTRE', 'Codó', 'MA', 'São Luís', 'MA', false, '2026-04-05', NULL, 'EMITIDA', 180.00, 'Viação São Luís', 'VSL-TFD-20260405-001', 'bbbbbbbb-0001-0001-0001-000000000007', '2026-03-30 08:15:00-03', '2026-03-30 08:15:00-03'),

  -- EM_VIAGEM (passagens utilizadas)
  ('33333333-0001-0001-0001-000000000004', 'eeeeeeee-0001-0001-0001-000000000043', 'IDA', 'AEREO', 'São Luís', 'MA', 'São Paulo', 'SP', true, '2026-04-02', '2026-04-02', 'UTILIZADA', 1150.00, 'LATAM Airlines', 'LA-TFD-20260402-001', 'bbbbbbbb-0001-0001-0001-000000000007', '2026-03-25 09:00:00-03', '2026-03-25 09:00:00-03'),
  ('33333333-0001-0001-0001-000000000005', 'eeeeeeee-0001-0001-0001-000000000044', 'IDA', 'AEREO', 'Imperatriz', 'MA', 'São Paulo', 'SP', true, '2026-04-01', '2026-04-01', 'UTILIZADA', 1420.00, 'Azul Linhas Aéreas', 'AD-TFD-20260401-001', 'bbbbbbbb-0001-0001-0001-000000000007', '2026-03-24 10:30:00-03', '2026-03-24 10:30:00-03'),
  ('33333333-0001-0001-0001-000000000006', 'eeeeeeee-0001-0001-0001-000000000045', 'IDA', 'AEREO', 'São Luís', 'MA', 'Brasília', 'DF', false, '2026-04-02', '2026-04-02', 'UTILIZADA', 890.00, 'GOL Linhas Aéreas', 'G3-TFD-20260402-002', 'bbbbbbbb-0001-0001-0001-000000000007', '2026-03-26 08:00:00-03', '2026-03-26 08:00:00-03'),

  -- EM_PERMANENCIA
  ('33333333-0001-0001-0001-000000000007', 'eeeeeeee-0001-0001-0001-000000000046', 'IDA', 'AEREO', 'São Luís', 'MA', 'São Paulo', 'SP', true, '2026-03-18', '2026-03-18', 'UTILIZADA', 1100.00, 'LATAM Airlines', 'LA-TFD-20260318-001', 'bbbbbbbb-0001-0001-0001-000000000007', '2026-03-10 09:00:00-03', '2026-03-10 09:00:00-03'),
  ('33333333-0001-0001-0001-000000000008', 'eeeeeeee-0001-0001-0001-000000000047', 'IDA', 'AEREO', 'Imperatriz', 'MA', 'Rio de Janeiro', 'RJ', true, '2026-03-13', '2026-03-13', 'UTILIZADA', 1350.00, 'GOL Linhas Aéreas', 'G3-TFD-20260313-001', 'bbbbbbbb-0001-0001-0001-000000000007', '2026-03-05 10:30:00-03', '2026-03-05 10:30:00-03'),
  ('33333333-0001-0001-0001-000000000009', 'eeeeeeee-0001-0001-0001-000000000048', 'IDA', 'AEREO', 'Imperatriz', 'MA', 'São Paulo', 'SP', true, '2026-03-10', '2026-03-10', 'UTILIZADA', 1280.00, 'Azul Linhas Aéreas', 'AD-TFD-20260310-001', 'bbbbbbbb-0001-0001-0001-000000000007', '2026-03-02 08:00:00-03', '2026-03-02 08:00:00-03'),

  -- CONCLUIDO (ida e volta completas)
  ('33333333-0001-0001-0001-000000000010', 'eeeeeeee-0001-0001-0001-000000000049', 'IDA', 'AEREO', 'São Luís', 'MA', 'São Paulo', 'SP', true, '2026-02-08', '2026-02-08', 'UTILIZADA', 1050.00, 'LATAM Airlines', 'LA-TFD-20260208-001', 'bbbbbbbb-0001-0001-0001-000000000007', '2026-02-01 09:00:00-03', '2026-02-01 09:00:00-03'),
  ('33333333-0001-0001-0001-000000000011', 'eeeeeeee-0001-0001-0001-000000000049', 'RETORNO', 'AEREO', 'São Paulo', 'SP', 'São Luís', 'MA', false, '2026-02-25', '2026-02-25', 'UTILIZADA', 980.00, 'GOL Linhas Aéreas', 'G3-TFD-20260225-001', 'bbbbbbbb-0001-0001-0001-000000000007', '2026-02-18 09:00:00-03', '2026-02-18 09:00:00-03'),
  ('33333333-0001-0001-0001-000000000012', 'eeeeeeee-0001-0001-0001-000000000050', 'IDA_E_VOLTA', 'AEREO', 'São Luís', 'MA', 'São Paulo', 'SP', true, '2026-02-03', '2026-02-03', 'UTILIZADA', 2200.00, 'Azul Linhas Aéreas', 'AD-TFD-20260203-001', 'bbbbbbbb-0001-0001-0001-000000000007', '2026-01-28 10:00:00-03', '2026-01-28 10:00:00-03')
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 12. AJUDAS DE CUSTO (10 registros)
-- ============================================================================

INSERT INTO ajudas_custo (id, solicitacao_id, tipo, data_inicio, data_fim, dias_internacao, valor_diaria, valor_total, status, aprovado_por, aprovado_em, created_at) VALUES
  -- EM_VIAGEM (em análise)
  ('44444444-0001-0001-0001-000000000001', 'eeeeeeee-0001-0001-0001-000000000043', 'PACIENTE',      '2026-04-02', '2026-04-06', 0, 24.75, 99.00,  'EM_ANALISE', NULL, NULL, '2026-04-02 09:00:00-03'),
  ('44444444-0001-0001-0001-000000000002', 'eeeeeeee-0001-0001-0001-000000000044', 'PACIENTE',      '2026-04-01', '2026-04-05', 0, 24.75, 99.00,  'EM_ANALISE', NULL, NULL, '2026-04-01 10:30:00-03'),
  ('44444444-0001-0001-0001-000000000003', 'eeeeeeee-0001-0001-0001-000000000043', 'ACOMPANHANTE',  '2026-04-02', '2026-04-06', 0, 24.75, 99.00,  'EM_ANALISE', NULL, NULL, '2026-04-02 09:00:00-03'),

  -- EM_PERMANENCIA (aprovada)
  ('44444444-0001-0001-0001-000000000004', 'eeeeeeee-0001-0001-0001-000000000046', 'PACIENTE',      '2026-03-18', '2026-04-05', 10, 24.75, 198.00, 'APROVADA', 'bbbbbbbb-0001-0001-0001-000000000008', '2026-03-28 09:00:00-03', '2026-03-20 09:00:00-03'),
  ('44444444-0001-0001-0001-000000000005', 'eeeeeeee-0001-0001-0001-000000000046', 'ACOMPANHANTE',  '2026-03-18', '2026-04-05', 10, 24.75, 198.00, 'APROVADA', 'bbbbbbbb-0001-0001-0001-000000000008', '2026-03-28 09:00:00-03', '2026-03-20 09:00:00-03'),
  ('44444444-0001-0001-0001-000000000006', 'eeeeeeee-0001-0001-0001-000000000047', 'PACIENTE',      '2026-03-13', '2026-04-03', 5,  24.75, 371.25, 'EM_PAGAMENTO', 'bbbbbbbb-0001-0001-0001-000000000008', '2026-03-25 10:30:00-03', '2026-03-15 10:30:00-03'),

  -- CONCLUIDO (pagas)
  ('44444444-0001-0001-0001-000000000007', 'eeeeeeee-0001-0001-0001-000000000049', 'PACIENTE',      '2026-02-08', '2026-02-25', 5, 24.75, 297.00, 'CONCLUIDA', 'bbbbbbbb-0001-0001-0001-000000000008', '2026-02-20 09:00:00-03', '2026-02-10 09:00:00-03'),
  ('44444444-0001-0001-0001-000000000008', 'eeeeeeee-0001-0001-0001-000000000049', 'ACOMPANHANTE',  '2026-02-08', '2026-02-25', 5, 24.75, 297.00, 'CONCLUIDA', 'bbbbbbbb-0001-0001-0001-000000000008', '2026-02-20 09:00:00-03', '2026-02-10 09:00:00-03'),
  ('44444444-0001-0001-0001-000000000009', 'eeeeeeee-0001-0001-0001-000000000050', 'PACIENTE',      '2026-02-03', '2026-03-10', 15, 24.75, 495.00, 'CONCLUIDA', 'bbbbbbbb-0001-0001-0001-000000000008', '2026-03-05 10:00:00-03', '2026-02-05 10:00:00-03'),
  ('44444444-0001-0001-0001-000000000010', 'eeeeeeee-0001-0001-0001-000000000050', 'ACOMPANHANTE',  '2026-02-03', '2026-03-10', 15, 24.75, 495.00, 'CONCLUIDA', 'bbbbbbbb-0001-0001-0001-000000000008', '2026-03-05 10:00:00-03', '2026-02-05 10:00:00-03')
ON CONFLICT DO NOTHING;


-- ============================================================================
-- 13. PERMANÊNCIAS (5 registros)
-- ============================================================================

INSERT INTO permanencias (id, solicitacao_id, data_comunicacao, comunicado_por, motivo, motivo_descricao, nova_data_retorno_prevista, registrado_por, created_at) VALUES
  ('55555555-0001-0001-0001-000000000001', 'eeeeeeee-0001-0001-0001-000000000046', '2026-03-22', 'UNIDADE_DESTINO', 'INTERNACAO', 'Paciente internada no pós-operatório de troca valvar aórtica — evolução satisfatória', '2026-04-10', 'bbbbbbbb-0001-0001-0001-000000000006', '2026-03-22 09:00:00-03'),
  ('55555555-0001-0001-0001-000000000002', 'eeeeeeee-0001-0001-0001-000000000047', '2026-03-20', 'PACIENTE', 'CONTINUIDADE_TRATAMENTO', 'Paciente em ciclo 3/6 de quimioterapia — necessita permanecer para próxima sessão', '2026-04-15', 'bbbbbbbb-0001-0001-0001-000000000006', '2026-03-20 10:30:00-03'),
  ('55555555-0001-0001-0001-000000000003', 'eeeeeeee-0001-0001-0001-000000000048', '2026-03-25', 'UNIDADE_DESTINO', 'AGUARDANDO_CIRURGIA', 'Paciente internada para preparo pré-transplante renal — compatibilidade confirmada', '2026-04-20', 'bbbbbbbb-0001-0001-0001-000000000006', '2026-03-25 08:00:00-03'),
  ('55555555-0001-0001-0001-000000000004', 'eeeeeeee-0001-0001-0001-000000000046', '2026-04-02', 'UNIDADE_DESTINO', 'INTERNACAO', 'Permanência estendida — complicação pós-operatória leve, em tratamento', '2026-04-20', 'bbbbbbbb-0001-0001-0001-000000000006', '2026-04-02 14:00:00-03'),
  ('55555555-0001-0001-0001-000000000005', 'eeeeeeee-0001-0001-0001-000000000047', '2026-04-01', 'REGIONAL', 'CONTINUIDADE_TRATAMENTO', 'Comunicado da regional — paciente necessita permanecer para sessão adicional de quimioterapia', '2026-04-25', 'bbbbbbbb-0001-0001-0001-000000000006', '2026-04-01 11:00:00-03')
ON CONFLICT DO NOTHING;


COMMIT;
