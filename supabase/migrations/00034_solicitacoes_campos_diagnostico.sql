-- Adiciona colunas de diagnóstico clínico à tabela solicitacoes
-- Estas colunas são preenchidas no módulo de Diagnóstico Clínico

ALTER TABLE solicitacoes ADD COLUMN IF NOT EXISTS origem_laudo TEXT;
ALTER TABLE solicitacoes ADD COLUMN IF NOT EXISTS data_laudo DATE;
ALTER TABLE solicitacoes ADD COLUMN IF NOT EXISTS data_validade_laudo DATE;
ALTER TABLE solicitacoes ADD COLUMN IF NOT EXISTS medico_solicitante_nome TEXT;
ALTER TABLE solicitacoes ADD COLUMN IF NOT EXISTS medico_solicitante_crm TEXT;
ALTER TABLE solicitacoes ADD COLUMN IF NOT EXISTS medico_solicitante_uf TEXT;
ALTER TABLE solicitacoes ADD COLUMN IF NOT EXISTS carater_atendimento TEXT;
