-- ============================================================
-- TFD — Migration 033: Permissões Granulares por Ação
-- ============================================================

-- ─── 1. Adicionar coluna acoes_disponiveis em telas_sistema ──
ALTER TABLE telas_sistema
  ADD COLUMN IF NOT EXISTS acoes_disponiveis TEXT[] DEFAULT '{}';

-- ─── 2. Reordenar telas operacionais (acomodar novas) ────────
UPDATE telas_sistema SET ordem = 5  WHERE id = 'regulacao';
UPDATE telas_sistema SET ordem = 6  WHERE id = 'agendamentos';
UPDATE telas_sistema SET ordem = 7  WHERE id = 'viagens';
UPDATE telas_sistema SET ordem = 8  WHERE id = 'ajuda_custo';
UPDATE telas_sistema SET ordem = 9  WHERE id = 'permanencia';
UPDATE telas_sistema SET ordem = 10 WHERE id = 'alta_encerramento';

-- ─── 3. Definir ações disponíveis por tela ───────────────────
UPDATE telas_sistema SET acoes_disponiveis = ARRAY['visualizar']
  WHERE id = 'painel';
UPDATE telas_sistema SET acoes_disponiveis = ARRAY['visualizar','criar','excluir']
  WHERE id = 'solicitacoes';
UPDATE telas_sistema SET acoes_disponiveis = ARRAY['visualizar','editar','encaminhar']
  WHERE id = 'diagnostico_clinico';
UPDATE telas_sistema SET acoes_disponiveis = ARRAY['visualizar','analisar','encaminhar_setor_anterior']
  WHERE id = 'parecer_medico';
UPDATE telas_sistema SET acoes_disponiveis = ARRAY['visualizar','editar','encaminhar_setor_anterior']
  WHERE id = 'regulacao';
UPDATE telas_sistema SET acoes_disponiveis = ARRAY['visualizar','editar','encaminhar_setor_anterior']
  WHERE id = 'agendamentos';
UPDATE telas_sistema SET acoes_disponiveis = ARRAY['visualizar','emitir','editar','gerenciar']
  WHERE id = 'viagens';
UPDATE telas_sistema SET acoes_disponiveis = ARRAY['visualizar','editar','encaminhar_setor_anterior','aprovar']
  WHERE id = 'ajuda_custo';
UPDATE telas_sistema SET acoes_disponiveis = ARRAY['visualizar','editar','aprovar','adicionar_ajuda_custo']
  WHERE id = 'permanencia';
UPDATE telas_sistema SET acoes_disponiveis = ARRAY['visualizar','encerrar']
  WHERE id = 'alta_encerramento';
UPDATE telas_sistema SET acoes_disponiveis = ARRAY['visualizar']
  WHERE id = 'relatorios';
UPDATE telas_sistema SET acoes_disponiveis = ARRAY['visualizar','criar','editar','excluir']
  WHERE id = 'sys_configuracoes';
UPDATE telas_sistema SET acoes_disponiveis = ARRAY['visualizar','criar','editar','excluir']
  WHERE id = 'sys_permissoes';
UPDATE telas_sistema SET acoes_disponiveis = ARRAY['visualizar','criar','editar','excluir']
  WHERE id = 'sys_usuarios';
UPDATE telas_sistema SET acoes_disponiveis = ARRAY['visualizar']
  WHERE id = 'sys_logs';

-- ─── 4. Inserir telas que faltavam ───────────────────────────
INSERT INTO telas_sistema (id, nome, modulo, rota, ordem, acoes_disponiveis) VALUES
  ('diagnostico_clinico', 'Diagnóstico Clínico', 'Operacional', '/diagnostico-clinico', 3,
   ARRAY['visualizar','editar','encaminhar']),
  ('parecer_medico',      'Parecer Médico',       'Operacional', '/parecer-medico',      4,
   ARRAY['visualizar','analisar','encaminhar_setor_anterior']),
  ('cadastro_pacientes',  'Pacientes',            'Cadastros',   '/pacientes',           1,
   ARRAY['visualizar','criar','editar']),
  ('cadastro_medicos',    'Médicos',              'Cadastros',   '/medicos',             2,
   ARRAY['visualizar','criar','editar']),
  ('cadastro_unidades',   'Unidades de Saúde',    'Cadastros',   '/unidades-saude',      3,
   ARRAY['visualizar','criar','editar']),
  ('cadastro_regionais',  'Regionais de Saúde',   'Cadastros',   '/regionais-saude',     4,
   ARRAY['visualizar','criar','editar'])
ON CONFLICT (id) DO NOTHING;

-- ─── 5. Criar tabela papel_tela_acoes ────────────────────────
CREATE TABLE IF NOT EXISTS papel_tela_acoes (
  papel_id UUID NOT NULL REFERENCES papeis(id) ON DELETE CASCADE,
  tela_id  TEXT NOT NULL REFERENCES telas_sistema(id) ON DELETE CASCADE,
  acao     TEXT NOT NULL,
  PRIMARY KEY (papel_id, tela_id, acao)
);

ALTER TABLE papel_tela_acoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read papel_tela_acoes"   ON papel_tela_acoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage papel_tela_acoes" ON papel_tela_acoes FOR ALL    TO authenticated USING (true) WITH CHECK (true);

-- ─── 6. Migrar dados de papel_telas → papel_tela_acoes ───────
-- Todos os acessos anteriores (binários) migram como 'visualizar'
INSERT INTO papel_tela_acoes (papel_id, tela_id, acao)
  SELECT papel_id, tela_id, 'visualizar'
  FROM papel_telas
  ON CONFLICT DO NOTHING;

-- ─── 7. Remover tabela antiga ─────────────────────────────────
DROP TABLE IF EXISTS papel_telas;
