-- ============================================================
-- TFD — Migration 059: representantes do despacho financeiro
--
-- Guarda os assinantes (representantes) escolhidos ao gerar o despacho.
-- Cada item: { usuario_id, nome, cargo, id_funcional }. Nome vem do usuário
-- selecionado; cargo e id_funcional são preenchidos à mão no drawer enquanto
-- não viram atributos do cadastro de usuário (a validar com o cliente).
--
-- Documentos antigos ficam com representantes = NULL e a página renderiza os
-- assinantes padrão (REPRESENTANTES_PADRAO) como fallback.
-- ============================================================

ALTER TABLE despachos_financeiros
  ADD COLUMN IF NOT EXISTS representantes JSONB;
