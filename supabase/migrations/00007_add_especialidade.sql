-- Add especialidade column to solicitacoes
ALTER TABLE solicitacoes ADD COLUMN IF NOT EXISTS especialidade TEXT;
