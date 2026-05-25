-- ============================================================
-- TFD — Remap de permissões refletindo o estado do protótipo
-- (commits 4c04ae4 a 002f684).
--
-- Adiciona:
--   - Telas /backlog e /design-system (módulo Documentação)
--   - Catálogo `acoes_catalogo` (criação idempotente) com nome humano +
--     descrição + ordem por ação, usado pela UI de /sistema/papeis
--   - Atualiza `acoes_disponiveis` das telas existentes pra refletir as
--     ações reais que cada tela suporta hoje (dados bancários pool,
--     anexos por contexto, relatório de gestão, etc.)
--   - Concede automaticamente todas as ações ao perfil
--     "Administrador Master" pra ele não ficar bloqueado.
--
-- IDs das telas usam os existentes no banco: pacientes, unidades_saude,
-- regionais_saude, painel, solicitacoes, regulacao, financeiro,
-- acompanhamento, tramitacao, relatorios, sys_configuracoes, sys_papeis,
-- sys_usuarios, sys_logs (não os antigos `cadastro_*` / `parecer_medico`
-- / `viagens` / etc.).
-- ============================================================

BEGIN;

-- ─── 1. Tabela acoes_catalogo (idempotente) ─────────────────────────
CREATE TABLE IF NOT EXISTS acoes_catalogo (
  tela_id     TEXT NOT NULL REFERENCES telas_sistema(id) ON DELETE CASCADE,
  acao        TEXT NOT NULL,
  nome_humano TEXT NOT NULL,
  descricao   TEXT,
  ordem       INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (tela_id, acao)
);

ALTER TABLE acoes_catalogo ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "auth read acoes_catalogo" ON acoes_catalogo
    FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE POLICY "auth manage acoes_catalogo" ON acoes_catalogo
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── 2. Telas novas do protótipo ───────────────────────────────────
INSERT INTO telas_sistema (id, nome, modulo, rota, ordem, acoes_disponiveis) VALUES
  ('backlog',       'Backlog do Sistema', 'Documentação', '/backlog',       1, ARRAY['visualizar']),
  ('design_system', 'Design System',      'Documentação', '/design-system', 2, ARRAY['visualizar'])
ON CONFLICT (id) DO UPDATE
  SET nome = EXCLUDED.nome, modulo = EXCLUDED.modulo, rota = EXCLUDED.rota;

-- ─── 3. Atualiza acoes_disponiveis das telas existentes ────────────
UPDATE telas_sistema SET acoes_disponiveis = ARRAY['visualizar']
  WHERE id = 'painel';

UPDATE telas_sistema SET acoes_disponiveis =
  ARRAY['visualizar','criar','editar','excluir','enviar_setor','encerrar','devolver_regulacao','reabrir']
  WHERE id = 'solicitacoes';

UPDATE telas_sistema SET acoes_disponiveis =
  ARRAY['visualizar','emitir_parecer','editar_parecer','aplicar_carimbo','registrar_tentativa','registrar_agendamento','anexar']
  WHERE id = 'regulacao';

UPDATE telas_sistema SET acoes_disponiveis =
  ARRAY['visualizar','registrar_passagem','editar_passagem','cancelar_passagem','reembolsar_passagem','registrar_ajuda_custo','editar_ajuda_custo','aprovar_ajuda_custo','registrar_adicional','selecionar_conta_bancaria','criar_conta_bancaria_inline','encaminhar_financeiro','anexar']
  WHERE id = 'financeiro';

UPDATE telas_sistema SET acoes_disponiveis = ARRAY['visualizar']
  WHERE id = 'acompanhamento';

UPDATE telas_sistema SET acoes_disponiveis =
  ARRAY['visualizar','enviar_setor','encaminhar_financeiro','devolver_regulacao','marcar_resolvida']
  WHERE id = 'tramitacao';

UPDATE telas_sistema SET acoes_disponiveis =
  ARRAY['visualizar','criar','editar','excluir','gerenciar_dados_bancarios','gerenciar_acompanhantes','exportar_prontuario']
  WHERE id = 'pacientes';

UPDATE telas_sistema SET acoes_disponiveis =
  ARRAY['visualizar','criar','editar','inativar','ver_solicitacoes_vinculadas']
  WHERE id = 'unidades_saude';

UPDATE telas_sistema SET acoes_disponiveis =
  ARRAY['visualizar','criar','editar','inativar','gerenciar_municipios']
  WHERE id = 'regionais_saude';

UPDATE telas_sistema SET acoes_disponiveis =
  ARRAY['visualizar','exportar','imprimir','ver_financeiro','ver_faturamento','ver_bpa','ver_gestao']
  WHERE id = 'relatorios';

UPDATE telas_sistema SET acoes_disponiveis =
  ARRAY['visualizar','editar','gerenciar_tabelas_auxiliares','gerenciar_vinculo','gerenciar_bancos']
  WHERE id = 'sys_configuracoes';

UPDATE telas_sistema SET acoes_disponiveis =
  ARRAY['visualizar','criar','editar','excluir']
  WHERE id = 'sys_papeis';

UPDATE telas_sistema SET acoes_disponiveis =
  ARRAY['visualizar','criar','editar','excluir','ativar_desativar']
  WHERE id = 'sys_usuarios';

UPDATE telas_sistema SET acoes_disponiveis = ARRAY['visualizar']
  WHERE id = 'sys_logs';

-- ─── 4. Popula acoes_catalogo com nome humano + descrição ──────────
INSERT INTO acoes_catalogo (tela_id, acao, nome_humano, descricao, ordem) VALUES
  -- Documentação
  ('backlog',         'visualizar',                       'Visualizar',                          'Ver o backlog do sistema (épicos, features, US).', 1),
  ('design_system',   'visualizar',                       'Visualizar',                          'Ver referência de tokens e componentes.',          1),

  -- Painel
  ('painel',          'visualizar',                       'Visualizar',                          'Acessar o painel inicial com KPIs e atividades.',  1),

  -- Solicitações
  ('solicitacoes',    'visualizar',                       'Visualizar',                          'Listar e abrir detalhe de solicitações.',          1),
  ('solicitacoes',    'criar',                            'Criar solicitação',                   'Abrir nova solicitação via drawer.',               2),
  ('solicitacoes',    'editar',                           'Editar solicitação',                  'Alterar dados de solicitação existente.',          3),
  ('solicitacoes',    'excluir',                          'Excluir solicitação',                 'Remover solicitação do sistema.',                  4),
  ('solicitacoes',    'enviar_setor',                     'Enviar para setor',                   'Movimentar a solicitação entre setores.',          5),
  ('solicitacoes',    'encerrar',                         'Encerrar solicitação',                'Encerrar a solicitação (concluído/cancelado).',    6),
  ('solicitacoes',    'devolver_regulacao',               'Devolver à Regulação',                'Devolver solicitação do financeiro para regulação.', 7),
  ('solicitacoes',    'reabrir',                          'Reabrir',                             'Reabrir solicitação encerrada.',                   8),

  -- Regulação (parecer + carimbo + tentativas + agendamento)
  ('regulacao',       'visualizar',                       'Visualizar',                          'Ver dados de regulação da solicitação.',           1),
  ('regulacao',       'emitir_parecer',                   'Emitir parecer médico',               'Registrar parecer (deferido/indeferido).',         2),
  ('regulacao',       'editar_parecer',                   'Editar parecer',                      'Alterar parecer existente.',                       3),
  ('regulacao',       'aplicar_carimbo',                  'Aplicar carimbo',                     'Definir encaminhamento (APR/CNRAC/CET/SAAS/etc.).', 4),
  ('regulacao',       'registrar_tentativa',              'Registrar tentativa de contato',      'Documentar contato com unidade.',                  5),
  ('regulacao',       'registrar_agendamento',            'Registrar agendamento',               'Confirmar agendamento em unidade de destino.',     6),
  ('regulacao',       'anexar',                           'Anexar documentos',                   'Anexar arquivos durante a regulação.',             7),

  -- Financeiro (passagens + ajuda de custo + adicionais)
  ('financeiro',      'visualizar',                       'Visualizar',                          'Ver dados financeiros da solicitação.',            1),
  ('financeiro',      'registrar_passagem',               'Registrar passagem',                  'Cadastrar nova passagem (aérea/terrestre/fluvial).', 2),
  ('financeiro',      'editar_passagem',                  'Editar passagem',                     'Alterar passagem existente.',                      3),
  ('financeiro',      'cancelar_passagem',                'Cancelar passagem',                   'Cancelar passagem cadastrada.',                    4),
  ('financeiro',      'reembolsar_passagem',              'Reembolsar passagem',                 'Marcar passagem como reembolsada.',                5),
  ('financeiro',      'registrar_ajuda_custo',            'Registrar ajuda de custo',            'Cadastrar período de ajuda de custo.',             6),
  ('financeiro',      'editar_ajuda_custo',               'Editar ajuda de custo',               'Alterar período existente.',                       7),
  ('financeiro',      'aprovar_ajuda_custo',              'Aprovar pagamento',                   'Confirmar e aprovar pagamento da ajuda.',          8),
  ('financeiro',      'registrar_adicional',              'Registrar adicional',                 'Lançar despesa adicional (transfer, bagagem, etc.).', 9),
  ('financeiro',      'selecionar_conta_bancaria',        'Selecionar conta bancária',           'Vincular conta do pool do paciente à solicitação.', 10),
  ('financeiro',      'criar_conta_bancaria_inline',      'Criar conta bancária inline',         'Cadastrar nova conta direto da tela de Ajuda de Custo.', 11),
  ('financeiro',      'encaminhar_financeiro',            'Encaminhar para Financeiro',          'Mover solicitação para o setor financeiro.',       12),
  ('financeiro',      'anexar',                           'Anexar documentos',                   'Anexar comprovantes e documentos financeiros.',    13),

  -- Acompanhamento
  ('acompanhamento',  'visualizar',                       'Visualizar',                          'Ver acompanhamento das solicitações.',             1),

  -- Tramitação
  ('tramitacao',      'visualizar',                       'Visualizar',                          'Ver fluxo de tramitação entre setores.',           1),
  ('tramitacao',      'enviar_setor',                     'Enviar para setor',                   'Movimentar entre setores.',                        2),
  ('tramitacao',      'encaminhar_financeiro',            'Encaminhar para Financeiro',          'Enviar para o financeiro.',                        3),
  ('tramitacao',      'devolver_regulacao',               'Devolver à Regulação',                'Devolver do financeiro para regulação.',           4),
  ('tramitacao',      'marcar_resolvida',                 'Marcar devolução resolvida',          'Marcar devolução como resolvida.',                 5),

  -- Pacientes
  ('pacientes',       'visualizar',                       'Visualizar',                          'Listar pacientes e abrir detalhe.',                1),
  ('pacientes',       'criar',                            'Criar paciente',                      'Cadastrar novo paciente via drawer.',              2),
  ('pacientes',       'editar',                           'Editar paciente',                     'Alterar dados de paciente existente.',             3),
  ('pacientes',       'excluir',                          'Excluir paciente',                    'Remover paciente do sistema.',                     4),
  ('pacientes',       'gerenciar_dados_bancarios',        'Gerenciar dados bancários',           'CRUD do pool de contas bancárias do paciente.',    5),
  ('pacientes',       'gerenciar_acompanhantes',          'Gerenciar acompanhantes',             'CRUD de acompanhantes do paciente.',               6),
  ('pacientes',       'exportar_prontuario',              'Exportar prontuário',                 'Gerar PDF do prontuário do paciente.',             7),

  -- Unidades de Saúde
  ('unidades_saude',  'visualizar',                       'Visualizar',                          'Listar unidades e abrir detalhe.',                 1),
  ('unidades_saude',  'criar',                            'Criar unidade',                       'Cadastrar nova unidade de saúde.',                 2),
  ('unidades_saude',  'editar',                           'Editar unidade',                      'Alterar dados de unidade existente.',              3),
  ('unidades_saude',  'inativar',                         'Inativar unidade',                    'Marcar unidade como inativa (soft delete).',       4),
  ('unidades_saude',  'ver_solicitacoes_vinculadas',      'Ver solicitações vinculadas',         'Histórico de solicitações da unidade (laudo + agendamento) com badges.', 5),

  -- Regionais de Saúde
  ('regionais_saude', 'visualizar',                       'Visualizar',                          'Listar regionais.',                                1),
  ('regionais_saude', 'criar',                            'Criar regional',                      'Cadastrar nova regional.',                         2),
  ('regionais_saude', 'editar',                           'Editar regional',                     'Alterar dados de regional existente.',             3),
  ('regionais_saude', 'inativar',                         'Inativar regional',                   'Marcar regional como inativa.',                    4),
  ('regionais_saude', 'gerenciar_municipios',             'Vincular municípios',                 'Adicionar/remover municípios da regional.',        5),

  -- Relatórios
  ('relatorios',      'visualizar',                       'Visualizar',                          'Acessar relatórios disponíveis.',                  1),
  ('relatorios',      'exportar',                         'Exportar',                            'Exportar relatório em CSV/Excel.',                 2),
  ('relatorios',      'imprimir',                         'Imprimir / PDF',                      'Imprimir ou gerar PDF do relatório.',              3),
  ('relatorios',      'ver_financeiro',                   'Ver Relatório Financeiro',            'Acessar a aba Financeiro.',                        4),
  ('relatorios',      'ver_faturamento',                  'Ver Relatório de Faturamento',        'Acessar a aba Faturamento (passagens).',           5),
  ('relatorios',      'ver_bpa',                          'Ver Relatório BPA',                   'Acessar a aba BPA.',                               6),
  ('relatorios',      'ver_gestao',                       'Ver Relatório de Gestão',             'Acessar a aba Gestão consolidada por solicitação.', 7),

  -- Sistema / Configurações
  ('sys_configuracoes','visualizar',                      'Visualizar',                          'Ver as configurações do sistema.',                 1),
  ('sys_configuracoes','editar',                          'Editar',                              'Alterar configurações gerais.',                    2),
  ('sys_configuracoes','gerenciar_tabelas_auxiliares',    'Gerenciar tabelas auxiliares',        'CRUD em todas as categorias auxiliares.',          3),
  ('sys_configuracoes','gerenciar_vinculo',               'Gerenciar Vínculo',                   'Tipos de vínculo (acompanhante e titular bancário) — unificados.', 4),
  ('sys_configuracoes','gerenciar_bancos',                'Gerenciar Bancos',                    'Lista de bancos disponíveis para dados bancários.', 5),

  -- Sistema / Papéis
  ('sys_papeis',      'visualizar',                       'Visualizar',                          'Ver papéis e suas permissões.',                    1),
  ('sys_papeis',      'criar',                            'Criar papel',                         'Cadastrar novo papel customizado.',                2),
  ('sys_papeis',      'editar',                           'Editar papel',                        'Editar matriz de permissões de um papel.',         3),
  ('sys_papeis',      'excluir',                          'Excluir papel',                       'Remover papel customizado.',                       4),

  -- Sistema / Usuários
  ('sys_usuarios',    'visualizar',                       'Visualizar',                          'Listar usuários e abrir detalhe.',                 1),
  ('sys_usuarios',    'criar',                            'Criar usuário',                       'Cadastrar novo usuário.',                          2),
  ('sys_usuarios',    'editar',                           'Editar usuário',                      'Alterar dados de usuário.',                        3),
  ('sys_usuarios',    'excluir',                          'Excluir usuário',                     'Remover usuário do sistema.',                      4),
  ('sys_usuarios',    'ativar_desativar',                 'Ativar/Desativar',                    'Bloquear ou reativar acesso de um usuário.',       5),

  -- Sistema / Logs
  ('sys_logs',        'visualizar',                       'Visualizar',                          'Ver logs de auditoria do sistema.',                1)
ON CONFLICT (tela_id, acao) DO UPDATE
  SET nome_humano = EXCLUDED.nome_humano,
      descricao   = EXCLUDED.descricao,
      ordem       = EXCLUDED.ordem;

-- ─── 5. Concede todas as ações ao Administrador Master ─────────────
INSERT INTO papel_tela_acoes (papel_id, tela_id, acao)
SELECT p.id, ac.tela_id, ac.acao
  FROM papeis p
 CROSS JOIN acoes_catalogo ac
 WHERE LOWER(p.nome) = 'administrador master'
ON CONFLICT DO NOTHING;

COMMIT;
