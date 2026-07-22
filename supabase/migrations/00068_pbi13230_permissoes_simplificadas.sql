-- ============================================================
-- TFD — Migration 068: PBI 13230 — modelo simplificado de permissões
-- ============================================================
-- Substitui o modelo antigo (uma ação específica por tela, com até 121
-- combinações e permissão por aba de detalhe) por três famílias:
--
--   1. tela.<id>.visualizar   → acesso à tela, ao menu lateral e, a partir
--                               dela, ao detalhe da solicitação e todas as
--                               abas internas, sem permissão adicional.
--   2. <item>.criar|editar|excluir → cadastro por item, válido em TODOS os
--                               pontos de entrada daquele cadastro.
--   3. acao.<nome>            → ações de fluxo (tramitar, encerrar, reabrir,
--                               emitir parecer, gerar documentos, exportar).
--
-- Permissão e setor são camadas independentes: a permissão diz se a pessoa
-- pode fazer, o setor da solicitação diz se pode ser feito agora.
--
-- Aditiva: as tabelas antigas (telas_sistema, papel_tela_acoes) permanecem
-- intactas para rollback. A conversão abaixo garante que nenhum papel perca
-- acesso na virada.
-- ============================================================

-- 1. Catálogo de permissões -----------------------------------------------

CREATE TABLE IF NOT EXISTS public.permissoes (
  id          text PRIMARY KEY,
  familia     text NOT NULL CHECK (familia IN ('tela', 'item', 'acao')),
  nome        text NOT NULL,
  descricao   text,
  grupo       text,
  ordem       integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.papel_permissoes (
  papel_id     uuid NOT NULL REFERENCES public.papeis(id) ON DELETE CASCADE,
  permissao_id text NOT NULL REFERENCES public.permissoes(id) ON DELETE CASCADE,
  PRIMARY KEY (papel_id, permissao_id)
);

CREATE INDEX IF NOT EXISTS idx_papel_permissoes_papel ON public.papel_permissoes(papel_id);

ALTER TABLE public.permissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.papel_permissoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS permissoes_leitura ON public.permissoes;
CREATE POLICY permissoes_leitura ON public.permissoes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS papel_permissoes_leitura ON public.papel_permissoes;
CREATE POLICY papel_permissoes_leitura ON public.papel_permissoes FOR SELECT TO authenticated USING (true);

-- 2. Família 1: acesso às telas -------------------------------------------

INSERT INTO public.permissoes (id, familia, nome, descricao, grupo, ordem) VALUES
  ('tela.painel.visualizar',            'tela', 'Painel',              'Acessar o painel com os gráficos do setor.',                  'Operacional',   1),
  ('tela.solicitacoes.visualizar',      'tela', 'Solicitações',        'Acessar a fila de solicitações e os detalhes.',               'Operacional',   2),
  ('tela.regulacao.visualizar',         'tela', 'Regulação',           'Acessar a fila de regulação e os detalhes.',                  'Operacional',   3),
  ('tela.passagens.visualizar',         'tela', 'Passagens',           'Acessar a fila de passagens e os detalhes.',                  'Operacional',   4),
  ('tela.ajuda_custo.visualizar',       'tela', 'Ajuda de Custo',      'Acessar a fila de ajuda de custo e os detalhes.',             'Operacional',   5),
  ('tela.acompanhamento.visualizar',    'tela', 'Acompanhamento',      'Acessar a fila de acompanhamento e os detalhes.',             'Operacional',   6),
  ('tela.pacientes.visualizar',         'tela', 'Pacientes',           'Acessar o cadastro de pacientes.',                            'Cadastros',     7),
  ('tela.unidades_saude.visualizar',    'tela', 'Unidades de Saúde',   'Acessar o cadastro de unidades de saúde.',                    'Cadastros',     8),
  ('tela.regionais_saude.visualizar',   'tela', 'Regionais de Saúde',  'Acessar o cadastro de regionais de saúde.',                   'Cadastros',     9),
  ('tela.relatorios.visualizar',        'tela', 'Relatórios',          'Acessar os relatórios do sistema.',                           'Gestão',       10),
  ('tela.sys_configuracoes.visualizar', 'tela', 'Configurações',       'Acessar as configurações e tabelas auxiliares.',              'Sistema',      11),
  ('tela.sys_papeis.visualizar',        'tela', 'Permissões',          'Acessar a tela de papéis e permissões.',                      'Sistema',      12),
  ('tela.sys_usuarios.visualizar',      'tela', 'Usuários',            'Acessar o cadastro de usuários.',                             'Sistema',      13),
  ('tela.sys_logs.visualizar',          'tela', 'Logs e Auditoria',    'Acessar os registros de auditoria.',                          'Sistema',      14)
ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, descricao = EXCLUDED.descricao, grupo = EXCLUDED.grupo, ordem = EXCLUDED.ordem;

-- 3. Família 2: cadastros por item ----------------------------------------

INSERT INTO public.permissoes (id, familia, nome, descricao, grupo, ordem)
SELECT
  item.id || '.' || acao.chave,
  'item',
  acao.rotulo || ' ' || item.rotulo,
  acao.rotulo || ' ' || item.artigo || ' ' || item.rotulo || ' em qualquer tela onde a ação apareça.',
  item.grupo,
  item.ordem * 10 + acao.ordem
FROM (VALUES
  ('solicitacao',     'solicitação',        'a',  'Operacional', 1),
  ('paciente',        'paciente',           'o',  'Cadastros',   2),
  ('acompanhante',    'acompanhante',       'o',  'Cadastros',   3),
  ('dados_bancarios', 'dados bancários',    'os', 'Cadastros',   4),
  ('passagem',        'passagem',           'a',  'Operacional', 5),
  ('adicional',       'adicional',          'o',  'Operacional', 6),
  ('ajuda_custo',     'ajuda de custo',     'a',  'Operacional', 7),
  ('agendamento',     'agendamento',        'o',  'Operacional', 8),
  ('unidade_saude',   'unidade de saúde',   'a',  'Cadastros',   9),
  ('regional',        'regional de saúde',  'a',  'Cadastros',  10),
  ('usuario',         'usuário',            'o',  'Sistema',    11),
  ('papel',           'papel',              'o',  'Sistema',    12),
  ('tabela_auxiliar', 'tabela auxiliar',    'a',  'Sistema',    13)
) AS item(id, rotulo, artigo, grupo, ordem)
CROSS JOIN (VALUES
  ('criar',   'Criar',   1),
  ('editar',  'Editar',  2),
  ('excluir', 'Excluir', 3)
) AS acao(chave, rotulo, ordem)
ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, descricao = EXCLUDED.descricao, grupo = EXCLUDED.grupo, ordem = EXCLUDED.ordem;

-- 4. Família 3: ações de fluxo --------------------------------------------

INSERT INTO public.permissoes (id, familia, nome, descricao, grupo, ordem) VALUES
  ('acao.tramitar',          'acao', 'Tramitar solicitação',  'Enviar para setor e devolver, em qualquer direção entre os cinco setores.', 'Fluxo', 1),
  ('acao.encerrar',          'acao', 'Encerrar solicitação',  'Encerrar a solicitação informando o motivo.',                               'Fluxo', 2),
  ('acao.reabrir',           'acao', 'Reabrir solicitação',   'Reabrir uma solicitação já encerrada.',                                     'Fluxo', 3),
  ('acao.emitir_parecer',    'acao', 'Emitir parecer médico', 'Registrar e editar parecer médico e aplicar carimbo.',                      'Fluxo', 4),
  ('acao.gerar_documentos',  'acao', 'Gerar documentos',      'Emitir o despacho e o recibo de ajuda de custo para o SEI.',                'Fluxo', 5),
  ('acao.exportar',          'acao', 'Exportar e imprimir',   'Exportar e imprimir relatórios, listagens e prontuário.',                    'Fluxo', 6)
ON CONFLICT (id) DO UPDATE SET nome = EXCLUDED.nome, descricao = EXCLUDED.descricao, grupo = EXCLUDED.grupo, ordem = EXCLUDED.ordem;

-- 5. Conversão dos papéis existentes --------------------------------------
-- De-para do modelo antigo (tela_id + acao) para as chaves novas, para que
-- nenhum papel perca acesso na virada.

WITH de_para(tela_id, acao, permissao_id) AS (VALUES
  -- acesso às telas
  ('painel','visualizar','tela.painel.visualizar'),
  ('solicitacoes','visualizar','tela.solicitacoes.visualizar'),
  ('regulacao','visualizar','tela.regulacao.visualizar'),
  ('passagens','visualizar','tela.passagens.visualizar'),
  ('ajuda_custo','visualizar','tela.ajuda_custo.visualizar'),
  ('acompanhamento','visualizar','tela.acompanhamento.visualizar'),
  ('financeiro','visualizar','tela.passagens.visualizar'),
  ('financeiro','visualizar','tela.ajuda_custo.visualizar'),
  ('pacientes','visualizar','tela.pacientes.visualizar'),
  ('unidades_saude','visualizar','tela.unidades_saude.visualizar'),
  ('regionais_saude','visualizar','tela.regionais_saude.visualizar'),
  ('relatorios','visualizar','tela.relatorios.visualizar'),
  ('sys_configuracoes','visualizar','tela.sys_configuracoes.visualizar'),
  ('sys_papeis','visualizar','tela.sys_papeis.visualizar'),
  ('sys_usuarios','visualizar','tela.sys_usuarios.visualizar'),
  ('sys_logs','visualizar','tela.sys_logs.visualizar'),
  -- cadastros
  ('solicitacoes','criar','solicitacao.criar'),
  ('solicitacoes','editar','solicitacao.editar'),
  ('solicitacoes','excluir','solicitacao.excluir'),
  ('pacientes','criar','paciente.criar'),
  ('pacientes','editar','paciente.editar'),
  ('pacientes','excluir','paciente.excluir'),
  ('pacientes','gerenciar_dados_bancarios','dados_bancarios.criar'),
  ('pacientes','gerenciar_dados_bancarios','dados_bancarios.editar'),
  ('pacientes','gerenciar_dados_bancarios','dados_bancarios.excluir'),
  ('pacientes','gerenciar_acompanhantes','acompanhante.criar'),
  ('pacientes','gerenciar_acompanhantes','acompanhante.editar'),
  ('pacientes','gerenciar_acompanhantes','acompanhante.excluir'),
  ('financeiro','registrar_passagem','passagem.criar'),
  ('financeiro','editar_passagem','passagem.editar'),
  ('financeiro','cancelar_passagem','passagem.editar'),
  ('financeiro','reembolsar_passagem','passagem.editar'),
  ('financeiro','registrar_adicional','adicional.criar'),
  ('financeiro','registrar_ajuda_custo','ajuda_custo.criar'),
  ('financeiro','editar_ajuda_custo','ajuda_custo.editar'),
  ('financeiro','aprovar_ajuda_custo','ajuda_custo.editar'),
  ('financeiro','criar_conta_bancaria_inline','dados_bancarios.criar'),
  ('regulacao','registrar_tentativa','agendamento.criar'),
  ('regulacao','registrar_agendamento','agendamento.criar'),
  ('regulacao','registrar_agendamento','agendamento.editar'),
  ('unidades_saude','criar','unidade_saude.criar'),
  ('unidades_saude','editar','unidade_saude.editar'),
  ('unidades_saude','inativar','unidade_saude.editar'),
  ('regionais_saude','criar','regional.criar'),
  ('regionais_saude','editar','regional.editar'),
  ('regionais_saude','gerenciar_municipios','regional.editar'),
  ('sys_usuarios','criar','usuario.criar'),
  ('sys_usuarios','editar','usuario.editar'),
  ('sys_usuarios','ativar_desativar','usuario.editar'),
  ('sys_usuarios','excluir','usuario.excluir'),
  ('sys_papeis','criar','papel.criar'),
  ('sys_papeis','editar','papel.editar'),
  ('sys_papeis','excluir','papel.excluir'),
  ('sys_configuracoes','editar','tabela_auxiliar.editar'),
  ('sys_configuracoes','gerenciar_tabelas_auxiliares','tabela_auxiliar.criar'),
  ('sys_configuracoes','gerenciar_tabelas_auxiliares','tabela_auxiliar.editar'),
  ('sys_configuracoes','gerenciar_tabelas_auxiliares','tabela_auxiliar.excluir'),
  ('sys_configuracoes','gerenciar_bancos','tabela_auxiliar.editar'),
  -- ações de fluxo
  ('solicitacoes','enviar_setor','acao.tramitar'),
  ('solicitacoes','devolver_regulacao','acao.tramitar'),
  ('solicitacoes','encerrar','acao.encerrar'),
  ('solicitacoes','reabrir','acao.reabrir'),
  ('tramitacao','enviar_setor','acao.tramitar'),
  ('tramitacao','encaminhar_financeiro','acao.tramitar'),
  ('tramitacao','devolver_regulacao','acao.tramitar'),
  ('financeiro','encaminhar_financeiro','acao.tramitar'),
  ('regulacao','emitir_parecer','acao.emitir_parecer'),
  ('regulacao','editar_parecer','acao.emitir_parecer'),
  ('regulacao','aplicar_carimbo','acao.emitir_parecer'),
  ('relatorios','exportar','acao.exportar'),
  ('relatorios','imprimir','acao.exportar'),
  ('pacientes','exportar_prontuario','acao.exportar')
)
INSERT INTO public.papel_permissoes (papel_id, permissao_id)
SELECT DISTINCT pta.papel_id, dp.permissao_id
FROM public.papel_tela_acoes pta
JOIN de_para dp ON dp.tela_id = pta.tela_id AND dp.acao = pta.acao
ON CONFLICT DO NOTHING;

-- 6. Administrador Master recebe todas as permissões ----------------------

INSERT INTO public.papel_permissoes (papel_id, permissao_id)
SELECT p.id, perm.id
FROM public.papeis p
CROSS JOIN public.permissoes perm
WHERE p.nome = 'Administrador Master'
ON CONFLICT DO NOTHING;
