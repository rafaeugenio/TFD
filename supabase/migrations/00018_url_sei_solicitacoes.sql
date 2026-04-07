-- Add optional SEI URL field to solicitacoes for external system linking
ALTER TABLE solicitacoes ADD COLUMN IF NOT EXISTS url_sei TEXT;
