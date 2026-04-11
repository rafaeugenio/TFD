-- ============================================================
-- TFD — Migration 036: Modal TRANSFER (P3)
-- Task #4 — Passagens
-- ============================================================
-- Adiciona TRANSFER como opcao de modal_transporte.
-- Usado quando o deslocamento e feito porta-a-porta (van, carro,
-- ambulancia), seja como trecho principal (deslocamento curto
-- intermunicipal) ou como complemento (ex.: hospital -> aeroporto).
-- ============================================================

-- 1) Atualiza CHECK da tabela viagens.modal
ALTER TABLE viagens
    DROP CONSTRAINT IF EXISTS viagens_modal_check;

ALTER TABLE viagens
    ADD CONSTRAINT viagens_modal_check
    CHECK (modal IN ('AEREO', 'TERRESTRE', 'FLUVIAL', 'TRANSFER'));

-- 2) Atualiza CHECK da tabela solicitacoes.tipo_transporte_sugerido
ALTER TABLE solicitacoes
    DROP CONSTRAINT IF EXISTS solicitacoes_tipo_transporte_sugerido_check;

ALTER TABLE solicitacoes
    ADD CONSTRAINT solicitacoes_tipo_transporte_sugerido_check
    CHECK (tipo_transporte_sugerido IN ('AEREO', 'TERRESTRE', 'FLUVIAL', 'TRANSFER'));

-- 3) Atualiza CHECK da tabela companhias_transporte.tipo_modal
ALTER TABLE companhias_transporte
    DROP CONSTRAINT IF EXISTS companhias_transporte_tipo_modal_check;

ALTER TABLE companhias_transporte
    ADD CONSTRAINT companhias_transporte_tipo_modal_check
    CHECK (tipo_modal IN ('AEREO', 'TERRESTRE', 'FLUVIAL', 'TRANSFER'));

-- 4) Registra TRANSFER no dicionario de dominios (tabelas_auxiliares)
INSERT INTO tabelas_auxiliares (categoria, codigo, nome, ordem)
VALUES ('modal_transporte', 'TRANSFER', 'Transfer (porta-a-porta)', 4)
ON CONFLICT (categoria, codigo) DO NOTHING;

COMMENT ON CONSTRAINT viagens_modal_check ON viagens IS
    'P3: inclui TRANSFER para deslocamentos porta-a-porta (van/carro/ambulancia).';
