-- ============================================================
-- TFD — Migration 019: Perfil do Usuário — Campos extras
-- Adiciona campos de contato, descrição, foto e dados médicos
-- ============================================================

-- ─── CAMPOS DE PERFIL ──────────────────────────────────────
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefones TEXT[] DEFAULT '{}';

-- ─── DADOS MÉDICOS (para perfil MEDICO_AUDITOR) ────────────
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS crm TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS crm_uf TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS especialidade_medica TEXT;
