-- ============================================================
-- TFD — Migration 063: flag "usuário é médico"
--
-- Um usuário pode ser marcado como médico no cadastro. Quando médico,
-- preenche CRM + UF do CRM (colunas já criadas na migration 00019), que
-- aparecem no parecer que ele emitir e no próprio perfil.
--
-- A flag is_medico desacopla "ser médico" do perfil de acesso: hoje só o
-- perfil MEDICO_AUDITOR exibia os dados médicos; agora qualquer usuário
-- marcado como médico passa a tê-los.
-- ============================================================

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS is_medico BOOLEAN DEFAULT FALSE;

-- Backfill: quem já é MEDICO_AUDITOR passa a ter a flag ligada.
UPDATE usuarios SET is_medico = TRUE WHERE perfil = 'MEDICO_AUDITOR';
