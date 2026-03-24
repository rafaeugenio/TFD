-- ============================================================
-- TFD — Migration 004: Módulo SISTEMA — RBAC, Telas, Convites
-- ============================================================

-- ─── TELAS DO SISTEMA (registro de todas as telas) ───────────

CREATE TABLE IF NOT EXISTS telas_sistema (
  id     TEXT PRIMARY KEY,
  nome   TEXT NOT NULL,
  modulo TEXT NOT NULL,
  rota   TEXT NOT NULL,
  ordem  INTEGER DEFAULT 0
);

INSERT INTO telas_sistema (id, nome, modulo, rota, ordem) VALUES
  -- Operacional
  ('painel',              'Painel',                'Operacional',  '/dashboard',            1),
  ('solicitacoes',        'Solicitações',          'Operacional',  '/solicitacoes',         2),
  ('regulacao',           'Regulação',             'Operacional',  '/regulacao',            3),
  ('agendamentos',        'Agendamentos',          'Operacional',  '/atendimento-destino',  4),
  ('viagens',             'Viagens e Passagens',   'Operacional',  '/viagens',              5),
  ('ajuda_custo',         'Ajuda de Custo',        'Operacional',  '/ajuda-custo',          6),
  ('permanencia',         'Permanência',           'Operacional',  '/permanencia',          7),
  ('alta_encerramento',   'Altas e Encerramentos', 'Operacional',  '/alta-encerramento',    8),
  -- Gestão
  ('relatorios',          'Relatórios',            'Gestão',       '/relatorios',           1),
  -- Sistema
  ('sys_configuracoes',   'Configurações',         'Sistema',      '/sistema/configuracoes',1),
  ('sys_permissoes',      'Permissões',            'Sistema',      '/sistema/papeis',       2),
  ('sys_usuarios',        'Usuários',              'Sistema',      '/sistema/usuarios',     3),
  ('sys_logs',            'Logs e Auditoria',      'Sistema',      '/sistema/logs',         4);

-- ─── PAPÉIS (RBAC roles) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS papeis (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  descricao   TEXT,
  cor         TEXT DEFAULT '#3B82F6',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER set_papeis_updated_at
  BEFORE UPDATE ON papeis
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE papeis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read papeis" ON papeis FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage papeis" ON papeis FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── PAPEL ↔ TELAS (junction) ───────────────────────────────

CREATE TABLE IF NOT EXISTS papel_telas (
  papel_id UUID NOT NULL REFERENCES papeis(id) ON DELETE CASCADE,
  tela_id  TEXT NOT NULL REFERENCES telas_sistema(id) ON DELETE CASCADE,
  PRIMARY KEY (papel_id, tela_id)
);

ALTER TABLE papel_telas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read papel_telas" ON papel_telas FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage papel_telas" ON papel_telas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── ATUALIZAR USUARIOS — adicionar papel_id e is_admin ─────

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS papel_id UUID REFERENCES papeis(id),
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- ─── CÓDIGOS DE CONVITE ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS codigos_convite (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo     TEXT NOT NULL UNIQUE,
  ativo      BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE codigos_convite ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read codigos_convite" ON codigos_convite FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth manage codigos_convite" ON codigos_convite FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── SEED: PAPÉIS PADRÃO DO TFD ─────────────────────────────

INSERT INTO papeis (id, nome, descricao, cor) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Atendente Municipal', 'Inicia processos e acompanha solicitações do seu município', '#3B82F6'),
  ('00000000-0000-0000-0000-000000000002', 'Atendente Regional', 'Acompanha solicitações de toda a regional', '#0891B2'),
  ('00000000-0000-0000-0000-000000000003', 'Coordenação Estadual', 'Gestão completa do fluxo TFD', '#7C3AED'),
  ('00000000-0000-0000-0000-000000000004', 'Médico Auditor', 'Análise clínica e emissão de parecer técnico', '#16A34A'),
  ('00000000-0000-0000-0000-000000000005', 'Setor de Regulação', 'Roteamento, cobranças externas e validação RPB', '#0E7490'),
  ('00000000-0000-0000-0000-000000000006', 'Setor de Passagens', 'Emissão, controle de embarque e rastreio', '#EA580C'),
  ('00000000-0000-0000-0000-000000000007', 'Financeiro', 'Ajuda de custo, aprovação e pagamento de diárias', '#92400E'),
  ('00000000-0000-0000-0000-000000000008', 'Assistente Social', 'Avaliação de elegibilidade de acompanhante', '#BE185D'),
  ('00000000-0000-0000-0000-000000000009', 'Controle Interno', 'Relatórios e auditoria (somente leitura)', '#64748B');

-- Seed: telas por papel
-- Atendente Municipal: painel, solicitacoes
INSERT INTO papel_telas (papel_id, tela_id) VALUES
  ('00000000-0000-0000-0000-000000000001', 'painel'),
  ('00000000-0000-0000-0000-000000000001', 'solicitacoes');
-- Atendente Regional: painel, solicitacoes
INSERT INTO papel_telas (papel_id, tela_id) VALUES
  ('00000000-0000-0000-0000-000000000002', 'painel'),
  ('00000000-0000-0000-0000-000000000002', 'solicitacoes');
-- Coordenação Estadual: tudo operacional + gestão
INSERT INTO papel_telas (papel_id, tela_id) VALUES
  ('00000000-0000-0000-0000-000000000003', 'painel'),
  ('00000000-0000-0000-0000-000000000003', 'solicitacoes'),
  ('00000000-0000-0000-0000-000000000003', 'regulacao'),
  ('00000000-0000-0000-0000-000000000003', 'agendamentos'),
  ('00000000-0000-0000-0000-000000000003', 'viagens'),
  ('00000000-0000-0000-0000-000000000003', 'ajuda_custo'),
  ('00000000-0000-0000-0000-000000000003', 'permanencia'),
  ('00000000-0000-0000-0000-000000000003', 'alta_encerramento'),
  ('00000000-0000-0000-0000-000000000003', 'relatorios');
-- Médico Auditor: painel, solicitacoes (leitura), regulacao
INSERT INTO papel_telas (papel_id, tela_id) VALUES
  ('00000000-0000-0000-0000-000000000004', 'painel'),
  ('00000000-0000-0000-0000-000000000004', 'solicitacoes'),
  ('00000000-0000-0000-0000-000000000004', 'regulacao');
-- Setor Regulação: painel, solicitacoes, regulacao, agendamentos
INSERT INTO papel_telas (papel_id, tela_id) VALUES
  ('00000000-0000-0000-0000-000000000005', 'painel'),
  ('00000000-0000-0000-0000-000000000005', 'solicitacoes'),
  ('00000000-0000-0000-0000-000000000005', 'regulacao'),
  ('00000000-0000-0000-0000-000000000005', 'agendamentos');
-- Setor Passagens: painel, solicitacoes, viagens, agendamentos
INSERT INTO papel_telas (papel_id, tela_id) VALUES
  ('00000000-0000-0000-0000-000000000006', 'painel'),
  ('00000000-0000-0000-0000-000000000006', 'solicitacoes'),
  ('00000000-0000-0000-0000-000000000006', 'viagens'),
  ('00000000-0000-0000-0000-000000000006', 'agendamentos');
-- Financeiro: painel, ajuda_custo, relatorios
INSERT INTO papel_telas (papel_id, tela_id) VALUES
  ('00000000-0000-0000-0000-000000000007', 'painel'),
  ('00000000-0000-0000-0000-000000000007', 'ajuda_custo'),
  ('00000000-0000-0000-0000-000000000007', 'relatorios');
-- Assistente Social: painel, solicitacoes
INSERT INTO papel_telas (papel_id, tela_id) VALUES
  ('00000000-0000-0000-0000-000000000008', 'painel'),
  ('00000000-0000-0000-0000-000000000008', 'solicitacoes');
-- Controle Interno: painel, relatorios, sys_logs
INSERT INTO papel_telas (papel_id, tela_id) VALUES
  ('00000000-0000-0000-0000-000000000009', 'painel'),
  ('00000000-0000-0000-0000-000000000009', 'relatorios'),
  ('00000000-0000-0000-0000-000000000009', 'sys_logs');

-- ─── SEED: CÓDIGO DE CONVITE INICIAL ─────────────────────────
INSERT INTO codigos_convite (codigo, ativo) VALUES ('TFD26-SES001', true);
