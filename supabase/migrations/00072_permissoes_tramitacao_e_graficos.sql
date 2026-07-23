-- ============================================================
-- TFD — Migration 072: aba própria de Tramitação e Encerramento +
-- permissão de visualização por gráfico do Painel
-- ============================================================
-- Pedidos do cliente (22/07/2026):
-- 1. Encerramento e tramitação são ações feitas em várias telas, então
--    ganham uma aba de permissão própria, separada de Solicitações, mas
--    ainda dentro do módulo Fluxo do Processo.
-- 2. O Painel passa a ter uma permissão de visualização por gráfico, pois,
--    dependendo do setor, alguns gráficos não devem ser visíveis.
-- ============================================================

-- 1. Aba própria "Tramitação e Encerramento" ------------------------------
-- Reaproveita a tela 'tramitacao' já existente no catálogo (sem uso no
-- modelo novo até aqui). Não tem rota navegável, então não vira item de
-- menu; serve apenas para agrupar essas ações na tela de Permissões.
UPDATE public.telas_sistema
   SET nome = 'Tramitação e Encerramento', modulo = 'Operacional', ordem = 6, rota = ''
 WHERE id = 'tramitacao';

-- Move as três ações de fluxo de Solicitações para a aba própria.
UPDATE public.permissoes SET tela_id = 'tramitacao', ordem_tela = v.o, grupo = 'Operacional'
FROM (VALUES ('acao.tramitar',1), ('acao.encerrar',2), ('acao.reabrir',3)) AS v(id,o)
WHERE public.permissoes.id = v.id;

-- Solicitações fica só com o cadastro da solicitação.
UPDATE public.permissoes SET ordem_tela = v.o
FROM (VALUES
  ('tela.solicitacoes.visualizar',1), ('solicitacao.criar',2),
  ('solicitacao.editar',3), ('solicitacao.excluir',4)
) AS v(id,o)
WHERE public.permissoes.id = v.id;

-- 2. Permissão de visualização por gráfico do Painel ----------------------
INSERT INTO public.permissoes (id, familia, nome, descricao, grupo, tela_id, ordem_tela, rotulo_curto) VALUES
  ('painel.graf_indicadores',     'item', 'Ver indicadores gerais',       'Ver os indicadores do topo do painel (novas, encerradas, taxa de aprovação).', 'Operacional', 'painel', 2, 'Indicadores gerais'),
  ('painel.graf_solicitacao',     'item', 'Ver gráfico de solicitações',  'Ver o gráfico de solicitações por situação.',                                 'Operacional', 'painel', 3, 'Gráfico de Solicitações'),
  ('painel.graf_regulacao',       'item', 'Ver gráfico de regulação',     'Ver o gráfico da regulação (pareceres, agendamentos, deferimentos).',         'Operacional', 'painel', 4, 'Gráfico de Regulação'),
  ('painel.graf_financeiro',      'item', 'Ver gráfico financeiro',       'Ver o gráfico de passagens e ajuda de custo.',                                'Operacional', 'painel', 5, 'Gráfico Financeiro'),
  ('painel.graf_visao_setor',     'item', 'Ver visão por setor',          'Ver o painel de visão por setor do fluxo TFD.',                               'Operacional', 'painel', 6, 'Visão por setor'),
  ('painel.graf_top_regioes',     'item', 'Ver top regiões',              'Ver o ranking de regiões de origem dos pacientes.',                           'Operacional', 'painel', 7, 'Top regiões'),
  ('painel.graf_top_regionais',   'item', 'Ver top regionais',            'Ver o ranking de regionais de saúde.',                                        'Operacional', 'painel', 8, 'Top regionais'),
  ('painel.graf_top_municipios',  'item', 'Ver top municípios',           'Ver o ranking de municípios de origem dos pacientes.',                        'Operacional', 'painel', 9, 'Top municípios')
ON CONFLICT (id) DO UPDATE SET tela_id = EXCLUDED.tela_id, ordem_tela = EXCLUDED.ordem_tela, rotulo_curto = EXCLUDED.rotulo_curto, nome = EXCLUDED.nome, descricao = EXCLUDED.descricao, grupo = EXCLUDED.grupo;

-- 3. Administrador Master recebe as novas permissões ----------------------
INSERT INTO public.papel_permissoes (papel_id, permissao_id)
SELECT p.id, perm.id
FROM public.papeis p CROSS JOIN public.permissoes perm
WHERE p.nome = 'Administrador Master'
ON CONFLICT DO NOTHING;

-- 4. Conferência ----------------------------------------------------------
DO $$
DECLARE orfas integer;
BEGIN
  SELECT count(*) INTO orfas FROM public.permissoes WHERE tela_id IS NULL OR rotulo_curto IS NULL;
  IF orfas > 0 THEN
    RAISE EXCEPTION 'Existem % permissões sem tela ou sem rótulo', orfas;
  END IF;
END $$;
