-- Permite medico_auditor_id ser nullable até implementação de autenticação.
-- Outros campos de usuário (atendente_criador_id, registrado_por, etc.) já são nullable.
ALTER TABLE pareceres ALTER COLUMN medico_auditor_id DROP NOT NULL;
