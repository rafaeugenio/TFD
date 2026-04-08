-- ============================================================
-- TFD — Migration 028: Evolucao da tabela unidades_destino
-- Adiciona campos granulares de endereco, contato e regional
-- ============================================================

ALTER TABLE unidades_destino ADD COLUMN IF NOT EXISTS regional_id UUID REFERENCES tabelas_auxiliares(id);
ALTER TABLE unidades_destino ADD COLUMN IF NOT EXISTS logradouro TEXT;
ALTER TABLE unidades_destino ADD COLUMN IF NOT EXISTS numero TEXT;
ALTER TABLE unidades_destino ADD COLUMN IF NOT EXISTS bairro TEXT;
ALTER TABLE unidades_destino ADD COLUMN IF NOT EXISTS municipio TEXT;
ALTER TABLE unidades_destino ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE unidades_destino ADD COLUMN IF NOT EXISTS responsavel TEXT;
ALTER TABLE unidades_destino ADD COLUMN IF NOT EXISTS telefone TEXT;

CREATE INDEX IF NOT EXISTS idx_unidades_destino_regional ON unidades_destino(regional_id);
