-- Registra a tela /fluxo-v2/acompanhamento no RBAC.
-- Herda visualizar de todos os papéis que já tinham 'financeiro.visualizar'.

INSERT INTO public.telas_sistema (id, nome, modulo, rota, ordem, acoes_disponiveis)
VALUES ('acompanhamento','Acompanhamento','Operacional','/fluxo-v2/acompanhamento',5,ARRAY[]::text[])
ON CONFLICT (id) DO UPDATE
  SET nome = EXCLUDED.nome,
      modulo = EXCLUDED.modulo,
      rota = EXCLUDED.rota,
      ordem = EXCLUDED.ordem;

INSERT INTO public.papel_tela_acoes (papel_id, tela_id, acao)
SELECT DISTINCT papel_id, 'acompanhamento', 'visualizar'
FROM public.papel_tela_acoes
WHERE tela_id = 'financeiro' AND acao = 'visualizar'
ON CONFLICT DO NOTHING;
