-- ============================================================
-- TFD — Migration 025: Regionais de Saúde completas (PDR-MA)
-- Atualiza de 10 para 19 regiões oficiais
-- ============================================================

-- Limpar regionais existentes e reinserir as 19 oficiais
DELETE FROM tabelas_auxiliares WHERE categoria = 'regional';

INSERT INTO tabelas_auxiliares (categoria, codigo, nome, descricao, ativo, ordem) VALUES
('regional', 'REG01', 'Presidente Dutra', 'Região de Saúde 01 — Sede: Presidente Dutra', true, 1),
('regional', 'REG02', 'Barra do Corda', 'Região de Saúde 02 — Sede: Barra do Corda', true, 2),
('regional', 'REG03', 'São João dos Patos', 'Região de Saúde 03 — Sede: São João dos Patos', true, 3),
('regional', 'REG04', 'Pedreiras', 'Região de Saúde 04 — Sede: Pedreiras', true, 4),
('regional', 'REG05', 'Caxias', 'Região de Saúde 05 — Sede: Caxias', true, 5),
('regional', 'REG06', 'Codó', 'Região de Saúde 06 — Sede: Codó', true, 6),
('regional', 'REG07', 'Itapecuru-Mirim', 'Região de Saúde 07 — Sede: Itapecuru-Mirim', true, 7),
('regional', 'REG08', 'São Luís', 'Região de Saúde 08 — Sede: São Luís', true, 8),
('regional', 'REG09', 'Chapadinha', 'Região de Saúde 09 — Sede: Chapadinha', true, 9),
('regional', 'REG10', 'Viana', 'Região de Saúde 10 — Sede: Viana', true, 10),
('regional', 'REG11', 'Pinheiro', 'Região de Saúde 11 — Sede: Pinheiro', true, 11),
('regional', 'REG12', 'Santa Inês', 'Região de Saúde 12 — Sede: Santa Inês', true, 12),
('regional', 'REG13', 'Bacabal', 'Região de Saúde 13 — Sede: Bacabal', true, 13),
('regional', 'REG14', 'Imperatriz', 'Região de Saúde 14 — Sede: Imperatriz', true, 14),
('regional', 'REG15', 'Açailândia', 'Região de Saúde 15 — Sede: Açailândia', true, 15),
('regional', 'REG16', 'Balsas', 'Região de Saúde 16 — Sede: Balsas', true, 16),
('regional', 'REG17', 'São Mateus do Maranhão', 'Região de Saúde 17 — Sede: São Mateus do Maranhão', true, 17),
('regional', 'REG18', 'Timon', 'Região de Saúde 18 — Sede: Timon', true, 18),
('regional', 'REG19', 'Zé Doca', 'Região de Saúde 19 — Sede: Zé Doca', true, 19);
