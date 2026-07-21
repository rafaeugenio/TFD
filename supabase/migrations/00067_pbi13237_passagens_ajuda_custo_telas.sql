-- ============================================================
-- TFD — Migration 067: PBI 13237 (reescrita) — telas próprias de
-- Passagens e Ajuda de Custo no RBAC
-- ============================================================
-- A fila única de Financeiro foi dividida em duas telas de listagem
-- próprias — Passagens e Ajuda de Custo — cada uma com KPIs e filtros
-- do seu setor. Registra as duas novas telas no RBAC, herdando
-- 'visualizar' de todos os papéis que já tinham 'financeiro.visualizar'
-- (mesmo padrão da migration 00040, que fez isso para Acompanhamento).
--
-- O Encerramento não entra como sexto status do ciclo geral — continua
-- existindo apenas como ação que finaliza a solicitação (RN06 da PBI
-- 13237), fora das cinco telas de listagem do fluxo.
-- ============================================================

INSERT INTO public.telas_sistema (id, nome, modulo, rota, ordem, acoes_disponiveis)
VALUES
  ('passagens',   'Passagens',      'Operacional', '/fluxo-v2/passagens',   3, ARRAY[]::text[]),
  ('ajuda_custo', 'Ajuda de Custo', 'Operacional', '/fluxo-v2/ajuda-custo', 4, ARRAY[]::text[])
ON CONFLICT (id) DO UPDATE
  SET nome = EXCLUDED.nome,
      modulo = EXCLUDED.modulo,
      rota = EXCLUDED.rota,
      ordem = EXCLUDED.ordem;

INSERT INTO public.papel_tela_acoes (papel_id, tela_id, acao)
SELECT DISTINCT papel_id, 'passagens', 'visualizar'
FROM public.papel_tela_acoes
WHERE tela_id = 'financeiro' AND acao = 'visualizar'
ON CONFLICT DO NOTHING;

INSERT INTO public.papel_tela_acoes (papel_id, tela_id, acao)
SELECT DISTINCT papel_id, 'ajuda_custo', 'visualizar'
FROM public.papel_tela_acoes
WHERE tela_id = 'financeiro' AND acao = 'visualizar'
ON CONFLICT DO NOTHING;
