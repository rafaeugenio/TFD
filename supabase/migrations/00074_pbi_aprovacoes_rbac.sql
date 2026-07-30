-- ============================================================
-- TFD — Migration 074: RBAC da tela Aprovações
-- ============================================================
-- Registra a permissão de acesso à nova tela/rota /fluxo-v2/aprovacoes no
-- modelo atual de permissões (migration 00068+). As ações de tramitar e
-- encerrar já são globais (acao.tramitar / acao.encerrar, migration 00069)
-- e não precisam de nova entrada — só a visualização da tela é nova.
--
-- Quem já enxerga Acompanhamento (fila mais próxima na cadeia — item de
-- menu logo acima) recebe a nova permissão automaticamente, para não
-- deixar nenhum papel sem acesso a um setor que já usa a tramitação. O
-- Administrador Master recebe todas as permissões, como de costume.
-- ============================================================

INSERT INTO public.permissoes (id, familia, nome, descricao, grupo, tela_id, ordem_tela, rotulo_curto) VALUES
  ('tela.aprovacoes.visualizar', 'tela', 'Aprovações', 'Acessar a fila de Aprovações e os detalhes.', 'Operacional', 'aprovacoes', 1, 'Visualizar')
ON CONFLICT (id) DO UPDATE
  SET nome = EXCLUDED.nome, descricao = EXCLUDED.descricao, grupo = EXCLUDED.grupo,
      tela_id = EXCLUDED.tela_id, ordem_tela = EXCLUDED.ordem_tela, rotulo_curto = EXCLUDED.rotulo_curto;

-- acao.tramitar e acao.encerrar passam a valer também nesta tela.
UPDATE public.permissoes SET tambem_em = array_append(tambem_em, 'aprovacoes')
WHERE id IN ('acao.tramitar', 'acao.encerrar')
  AND NOT ('aprovacoes' = ANY(tambem_em));

-- Todo papel que já vê Acompanhamento passa a ver Aprovações também.
INSERT INTO public.papel_permissoes (papel_id, permissao_id)
SELECT papel_id, 'tela.aprovacoes.visualizar'
FROM public.papel_permissoes
WHERE permissao_id = 'tela.acompanhamento.visualizar'
ON CONFLICT DO NOTHING;

-- Administrador Master recebe a permissão nova.
INSERT INTO public.papel_permissoes (papel_id, permissao_id)
SELECT p.id, perm.id
FROM public.papeis p CROSS JOIN public.permissoes perm
WHERE p.nome = 'Administrador Master' AND perm.id = 'tela.aprovacoes.visualizar'
ON CONFLICT DO NOTHING;

-- Conferência ----------------------------------------------------------
DO $$
DECLARE orfas integer;
BEGIN
  SELECT count(*) INTO orfas FROM public.permissoes WHERE tela_id IS NULL OR rotulo_curto IS NULL;
  IF orfas > 0 THEN
    RAISE EXCEPTION 'Existem % permissões sem tela ou sem rótulo', orfas;
  END IF;
END $$;
