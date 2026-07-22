-- ============================================================
-- TFD — Migration 070: PBI 13230 — rótulos curtos das permissões
-- ============================================================
-- A tela de Permissões passa a seguir o desenho do sistema de
-- desenvolvimento e de homologação: módulo > tela > ações em pills.
-- As pills precisam de rótulo curto ("Visualizar", "Criar", "Encerrar"),
-- em vez do nome completo da permissão ("Criar ajuda de custo").
--
-- Quando a tela tem mais de um item cadastrável, o item principal usa o
-- rótulo curto e o secundário mantém o nome do item, para não haver duas
-- pills "Criar" na mesma tela.
-- ============================================================

ALTER TABLE public.permissoes ADD COLUMN IF NOT EXISTS rotulo_curto text;

-- Acesso à tela
UPDATE public.permissoes SET rotulo_curto = 'Visualizar' WHERE familia = 'tela';

-- Ações de fluxo
UPDATE public.permissoes SET rotulo_curto = v.rotulo
FROM (VALUES
  ('acao.tramitar',         'Tramitar'),
  ('acao.encerrar',         'Encerrar'),
  ('acao.reabrir',          'Reabrir'),
  ('acao.emitir_parecer',   'Emitir parecer'),
  ('acao.gerar_documentos', 'Gerar documentos'),
  ('acao.exportar',         'Exportar')
) AS v(id, rotulo)
WHERE public.permissoes.id = v.id;

-- Itens principais de cada tela: rótulo curto da ação
UPDATE public.permissoes SET rotulo_curto = initcap(split_part(id, '.', 2))
WHERE familia = 'item'
  AND split_part(id, '.', 1) IN (
    'solicitacao', 'passagem', 'ajuda_custo', 'paciente',
    'unidade_saude', 'regional', 'usuario', 'papel', 'tabela_auxiliar'
  );

-- Itens secundários: mantém o nome do item para diferenciar na mesma tela
UPDATE public.permissoes SET rotulo_curto = v.rotulo
FROM (VALUES
  ('acompanhante.criar',     'Criar acompanhante'),
  ('acompanhante.editar',    'Editar acompanhante'),
  ('acompanhante.excluir',   'Excluir acompanhante'),
  ('dados_bancarios.criar',  'Criar dados bancários'),
  ('dados_bancarios.editar', 'Editar dados bancários'),
  ('dados_bancarios.excluir','Excluir dados bancários'),
  ('adicional.criar',        'Criar adicional'),
  ('adicional.editar',       'Editar adicional'),
  ('adicional.excluir',      'Excluir adicional'),
  ('agendamento.criar',      'Criar agendamento'),
  ('agendamento.editar',     'Editar agendamento'),
  ('agendamento.excluir',    'Excluir agendamento')
) AS v(id, rotulo)
WHERE public.permissoes.id = v.id;

-- Conferência: nenhuma permissão pode ficar sem rótulo curto
DO $$
DECLARE sem_rotulo integer;
BEGIN
  SELECT count(*) INTO sem_rotulo FROM public.permissoes WHERE rotulo_curto IS NULL;
  IF sem_rotulo > 0 THEN
    RAISE EXCEPTION 'Existem % permissões sem rótulo curto', sem_rotulo;
  END IF;
END $$;
