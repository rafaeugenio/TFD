-- ============================================================
-- TFD — Migration 013: Status Gerencial para Ajuda de Custo
-- Adiciona campo de controle interno do setor (não afeta fluxo)
-- ============================================================

-- ─── NOVA COLUNA ────────────────────────────────────────────
-- status_gerencial: controle livre do setor financeiro.
-- Não interfere no campo 'status' que controla o fluxo de trabalho.
ALTER TABLE ajudas_custo
  ADD COLUMN IF NOT EXISTS status_gerencial TEXT;

-- ─── SEEDS: STATUS GERENCIAL PARA AJUDA DE CUSTO ───────────
INSERT INTO tabelas_auxiliares (categoria, codigo, nome, descricao, ordem) VALUES
  ('status_ajuda_custo', 'PENDENTE',              'Pendente',              'Aguardando análise ou providência', 1),
  ('status_ajuda_custo', 'DOCUMENTACAO_PENDENTE',  'Documentação Pendente', 'Faltam documentos para prosseguir', 2),
  ('status_ajuda_custo', 'AGUARDANDO_PAGAMENTO',   'Aguardando Pagamento',  'Aprovada e aguardando liberação financeira', 3),
  ('status_ajuda_custo', 'PAGO',                   'Pago',                  'Pagamento efetuado ao beneficiário', 4),
  ('status_ajuda_custo', 'NAO_PAGO',               'Não Pago',              'Pagamento não realizado ou recusado', 5),
  ('status_ajuda_custo', 'CANCELADO',              'Cancelado',             'Ajuda de custo cancelada', 6)
ON CONFLICT (categoria, codigo) DO NOTHING;
