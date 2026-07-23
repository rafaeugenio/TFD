-- ============================================================
-- TFD — Migration 071: permissões, meio-termo entre o DEV e o protótipo
-- ============================================================
-- O sistema de desenvolvimento granulou demais (112 permissões, com
-- "Acessar tela", "Visualizar detalhes" e "Detalhe" soltos por tela). O
-- protótipo estava enxuto (59), porém faltavam algumas ações reais do
-- sistema. Este é o meio-termo pedido pelo cliente: manter o modelo
-- enxuto por tela (sem permissão de detalhe, ação de listagem e de
-- detalhe unificadas) e trazer as ações que faltavam, mantendo todas as
-- capacidades reais do sistema.
--
-- Adições por tela:
--   Regulação      : aplicar carimbo, registrar/editar/excluir tentativa
--                    (a tentativa de contato deixa de ser confundida com o
--                    agendamento, como no DEV)
--   Passagens      : alterar status da passagem
--   Ajuda de Custo : alterar status da ajuda; o antigo "Gerar documentos"
--                    vira dois, "Emitir despacho" e "Gerar recibo (SEI)",
--                    para separar os dois documentos; despesa de funerária
--   Usuários       : aprovar usuário
-- ============================================================

-- 1. Regulação ------------------------------------------------------------
INSERT INTO public.permissoes (id, familia, nome, descricao, grupo, tela_id, ordem_tela, rotulo_curto) VALUES
  ('regulacao.aplicar_carimbo', 'acao', 'Aplicar carimbo',      'Aplicar e editar o carimbo da regulação.',            'Operacional', 'regulacao', 6, 'Aplicar carimbo'),
  ('tentativa.criar',           'item', 'Registrar tentativa',  'Registrar tentativa de contato ou agendamento.',      'Operacional', 'regulacao', 7, 'Registrar tentativa'),
  ('tentativa.editar',          'item', 'Editar tentativa',     'Editar uma tentativa registrada.',                    'Operacional', 'regulacao', 8, 'Editar tentativa'),
  ('tentativa.excluir',         'item', 'Excluir tentativa',    'Excluir uma tentativa registrada.',                   'Operacional', 'regulacao', 9, 'Excluir tentativa')
ON CONFLICT (id) DO UPDATE SET tela_id = EXCLUDED.tela_id, ordem_tela = EXCLUDED.ordem_tela, rotulo_curto = EXCLUDED.rotulo_curto, nome = EXCLUDED.nome, descricao = EXCLUDED.descricao, grupo = EXCLUDED.grupo;

-- 2. Passagens ------------------------------------------------------------
INSERT INTO public.permissoes (id, familia, nome, descricao, grupo, tela_id, ordem_tela, rotulo_curto, tambem_em) VALUES
  ('passagem.alterar_status', 'item', 'Alterar status da passagem', 'Atualizar a situação da passagem (confirmada, cancelada, reembolsada, retorno).', 'Operacional', 'passagens', 8, 'Alterar status da passagem', ARRAY['acompanhamento'])
ON CONFLICT (id) DO UPDATE SET tela_id = EXCLUDED.tela_id, ordem_tela = EXCLUDED.ordem_tela, rotulo_curto = EXCLUDED.rotulo_curto, nome = EXCLUDED.nome, descricao = EXCLUDED.descricao, grupo = EXCLUDED.grupo, tambem_em = EXCLUDED.tambem_em;

-- 3. Ajuda de Custo -------------------------------------------------------
-- 3a. Substitui "Gerar documentos" por dois documentos distintos.
INSERT INTO public.permissoes (id, familia, nome, descricao, grupo, tela_id, ordem_tela, rotulo_curto, tambem_em) VALUES
  ('acao.emitir_despacho', 'acao', 'Emitir despacho',           'Emitir o despacho financeiro da solicitação.',                      'Operacional', 'ajuda_custo', 5, 'Emitir despacho', ARRAY['solicitacoes']),
  ('acao.gerar_recibo',    'acao', 'Gerar recibo (SEI)',        'Gerar o recibo de ajuda de custo para envio e anexação no SEI.',    'Operacional', 'ajuda_custo', 6, 'Gerar recibo (SEI)', ARRAY[]::text[]),
  ('ajuda_custo.alterar_status', 'item', 'Alterar status da ajuda', 'Atualizar a situação da ajuda de custo (emitida, paga, glosada, cancelada).', 'Operacional', 'ajuda_custo', 7, 'Alterar status da ajuda', ARRAY['acompanhamento']),
  ('despesa_funeraria.criar',  'item', 'Adicionar despesa de funerária', 'Lançar despesa de funerária na solicitação.', 'Operacional', 'ajuda_custo', 12, 'Adicionar despesa de funerária', ARRAY[]::text[]),
  ('despesa_funeraria.excluir','item', 'Excluir despesa de funerária',   'Remover despesa de funerária lançada.',       'Operacional', 'ajuda_custo', 13, 'Excluir despesa de funerária', ARRAY[]::text[])
ON CONFLICT (id) DO UPDATE SET tela_id = EXCLUDED.tela_id, ordem_tela = EXCLUDED.ordem_tela, rotulo_curto = EXCLUDED.rotulo_curto, nome = EXCLUDED.nome, descricao = EXCLUDED.descricao, grupo = EXCLUDED.grupo, tambem_em = EXCLUDED.tambem_em;

-- 3b. Migra quem tinha "Gerar documentos" para os dois novos, e remove o antigo.
INSERT INTO public.papel_permissoes (papel_id, permissao_id)
SELECT papel_id, 'acao.emitir_despacho' FROM public.papel_permissoes WHERE permissao_id = 'acao.gerar_documentos'
ON CONFLICT DO NOTHING;
INSERT INTO public.papel_permissoes (papel_id, permissao_id)
SELECT papel_id, 'acao.gerar_recibo' FROM public.papel_permissoes WHERE permissao_id = 'acao.gerar_documentos'
ON CONFLICT DO NOTHING;
DELETE FROM public.papel_permissoes WHERE permissao_id = 'acao.gerar_documentos';
DELETE FROM public.permissoes WHERE id = 'acao.gerar_documentos';

-- 4. Usuários -------------------------------------------------------------
INSERT INTO public.permissoes (id, familia, nome, descricao, grupo, tela_id, ordem_tela, rotulo_curto) VALUES
  ('usuario.aprovar', 'item', 'Aprovar usuário', 'Aprovar o cadastro de um novo usuário.', 'Sistema', 'sys_usuarios', 5, 'Aprovar usuário')
ON CONFLICT (id) DO UPDATE SET tela_id = EXCLUDED.tela_id, ordem_tela = EXCLUDED.ordem_tela, rotulo_curto = EXCLUDED.rotulo_curto, nome = EXCLUDED.nome, descricao = EXCLUDED.descricao, grupo = EXCLUDED.grupo;

-- 5. Administrador Master recebe todas as permissões novas ----------------
INSERT INTO public.papel_permissoes (papel_id, permissao_id)
SELECT p.id, perm.id
FROM public.papeis p CROSS JOIN public.permissoes perm
WHERE p.nome = 'Administrador Master'
ON CONFLICT DO NOTHING;

-- 6. Conferência ----------------------------------------------------------
DO $$
DECLARE orfas integer; sem_rotulo integer;
BEGIN
  SELECT count(*) INTO orfas FROM public.permissoes WHERE tela_id IS NULL;
  SELECT count(*) INTO sem_rotulo FROM public.permissoes WHERE rotulo_curto IS NULL;
  IF orfas > 0 OR sem_rotulo > 0 THEN
    RAISE EXCEPTION 'Permissões sem tela (%) ou sem rótulo (%)', orfas, sem_rotulo;
  END IF;
END $$;
