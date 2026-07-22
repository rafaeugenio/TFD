-- ============================================================
-- TFD — Migration 069: PBI 13230 — permissões agrupadas por tela
-- ============================================================
-- Ajuste pedido pelo cliente em 22/07/2026: manter o modelo simplificado
-- de permissões (migration 00068), porém agrupadas POR TELA, como no
-- sistema de desenvolvimento e de homologação, em vez de separadas por
-- família (acesso, cadastros, ações). Cada tela do menu passa a reunir
-- todas as permissões que dizem respeito a ela.
--
-- Uma permissão continua sendo única e global: quando o mesmo cadastro
-- aparece em mais de uma tela, ela é listada na tela dona e o campo
-- `tambem_em` registra os outros lugares onde a mesma permissão vale,
-- para a tela de Permissões deixar isso explícito ao usuário.
-- ============================================================

ALTER TABLE public.permissoes ADD COLUMN IF NOT EXISTS tela_id   text;
ALTER TABLE public.permissoes ADD COLUMN IF NOT EXISTS tambem_em text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.permissoes ADD COLUMN IF NOT EXISTS ordem_tela integer NOT NULL DEFAULT 0;

-- 1. Tela dona de cada permissão ------------------------------------------

UPDATE public.permissoes SET tela_id = dados.tela, ordem_tela = dados.ordem
FROM (VALUES
  -- Painel
  ('tela.painel.visualizar',            'painel',            1),
  -- Solicitações
  ('tela.solicitacoes.visualizar',      'solicitacoes',      1),
  ('solicitacao.criar',                 'solicitacoes',      2),
  ('solicitacao.editar',                'solicitacoes',      3),
  ('solicitacao.excluir',               'solicitacoes',      4),
  ('acao.tramitar',                     'solicitacoes',      5),
  ('acao.encerrar',                     'solicitacoes',      6),
  ('acao.reabrir',                      'solicitacoes',      7),
  -- Regulação
  ('tela.regulacao.visualizar',         'regulacao',         1),
  ('acao.emitir_parecer',               'regulacao',         2),
  ('agendamento.criar',                 'regulacao',         3),
  ('agendamento.editar',                'regulacao',         4),
  ('agendamento.excluir',               'regulacao',         5),
  -- Passagens
  ('tela.passagens.visualizar',         'passagens',         1),
  ('passagem.criar',                    'passagens',         2),
  ('passagem.editar',                   'passagens',         3),
  ('passagem.excluir',                  'passagens',         4),
  ('adicional.criar',                   'passagens',         5),
  ('adicional.editar',                  'passagens',         6),
  ('adicional.excluir',                 'passagens',         7),
  -- Ajuda de Custo
  ('tela.ajuda_custo.visualizar',       'ajuda_custo',       1),
  ('ajuda_custo.criar',                 'ajuda_custo',       2),
  ('ajuda_custo.editar',                'ajuda_custo',       3),
  ('ajuda_custo.excluir',               'ajuda_custo',       4),
  ('acao.gerar_documentos',             'ajuda_custo',       5),
  ('dados_bancarios.criar',             'ajuda_custo',       6),
  ('dados_bancarios.editar',            'ajuda_custo',       7),
  ('dados_bancarios.excluir',           'ajuda_custo',       8),
  -- Acompanhamento
  ('tela.acompanhamento.visualizar',    'acompanhamento',    1),
  -- Pacientes
  ('tela.pacientes.visualizar',         'pacientes',         1),
  ('paciente.criar',                    'pacientes',         2),
  ('paciente.editar',                   'pacientes',         3),
  ('paciente.excluir',                  'pacientes',         4),
  ('acompanhante.criar',                'pacientes',         5),
  ('acompanhante.editar',               'pacientes',         6),
  ('acompanhante.excluir',              'pacientes',         7),
  -- Unidades de Saúde
  ('tela.unidades_saude.visualizar',    'unidades_saude',    1),
  ('unidade_saude.criar',               'unidades_saude',    2),
  ('unidade_saude.editar',              'unidades_saude',    3),
  ('unidade_saude.excluir',             'unidades_saude',    4),
  -- Regionais de Saúde
  ('tela.regionais_saude.visualizar',   'regionais_saude',   1),
  ('regional.criar',                    'regionais_saude',   2),
  ('regional.editar',                   'regionais_saude',   3),
  ('regional.excluir',                  'regionais_saude',   4),
  -- Relatórios
  ('tela.relatorios.visualizar',        'relatorios',        1),
  ('acao.exportar',                     'relatorios',        2),
  -- Configurações
  ('tela.sys_configuracoes.visualizar', 'sys_configuracoes', 1),
  ('tabela_auxiliar.criar',             'sys_configuracoes', 2),
  ('tabela_auxiliar.editar',            'sys_configuracoes', 3),
  ('tabela_auxiliar.excluir',           'sys_configuracoes', 4),
  -- Permissões
  ('tela.sys_papeis.visualizar',        'sys_papeis',        1),
  ('papel.criar',                       'sys_papeis',        2),
  ('papel.editar',                      'sys_papeis',        3),
  ('papel.excluir',                     'sys_papeis',        4),
  -- Usuários
  ('tela.sys_usuarios.visualizar',      'sys_usuarios',      1),
  ('usuario.criar',                     'sys_usuarios',      2),
  ('usuario.editar',                    'sys_usuarios',      3),
  ('usuario.excluir',                   'sys_usuarios',      4),
  -- Logs e Auditoria
  ('tela.sys_logs.visualizar',          'sys_logs',          1)
) AS dados(permissao, tela, ordem)
WHERE public.permissoes.id = dados.permissao;

-- 2. Onde a mesma permissão também vale -----------------------------------
-- A permissão continua sendo uma só; isto apenas informa ao usuário que ela
-- libera a ação em mais de uma tela.

UPDATE public.permissoes SET tambem_em = dados.telas
FROM (VALUES
  ('dados_bancarios.criar',  ARRAY['pacientes']),
  ('dados_bancarios.editar', ARRAY['pacientes']),
  ('dados_bancarios.excluir',ARRAY['pacientes']),
  ('paciente.criar',         ARRAY['solicitacoes']),
  ('acompanhante.criar',     ARRAY['solicitacoes']),
  ('acompanhante.editar',    ARRAY['solicitacoes']),
  ('solicitacao.editar',     ARRAY['regulacao','passagens','ajuda_custo']),
  ('passagem.criar',         ARRAY['solicitacoes']),
  ('passagem.editar',        ARRAY['solicitacoes','acompanhamento']),
  ('adicional.criar',        ARRAY['solicitacoes']),
  ('ajuda_custo.criar',      ARRAY['solicitacoes']),
  ('ajuda_custo.editar',     ARRAY['solicitacoes','acompanhamento']),
  ('agendamento.criar',      ARRAY['solicitacoes']),
  ('acao.tramitar',          ARRAY['regulacao','passagens','ajuda_custo','acompanhamento']),
  ('acao.encerrar',          ARRAY['acompanhamento']),
  ('acao.gerar_documentos',  ARRAY['solicitacoes']),
  ('acao.exportar',          ARRAY['pacientes','solicitacoes'])
) AS dados(permissao, telas)
WHERE public.permissoes.id = dados.permissao;

-- 3. Conferência ----------------------------------------------------------
-- Nenhuma permissão pode ficar órfã de tela, senão some da tela de Permissões.

DO $$
DECLARE orfas integer;
BEGIN
  SELECT count(*) INTO orfas FROM public.permissoes WHERE tela_id IS NULL;
  IF orfas > 0 THEN
    RAISE EXCEPTION 'Existem % permissões sem tela definida', orfas;
  END IF;
END $$;
