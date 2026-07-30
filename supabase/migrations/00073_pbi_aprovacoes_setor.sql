-- ============================================================
-- TFD — Migration 073: novo setor "Aprovações"
-- ============================================================
-- Aprovações é um destino de tramitação alcançável a partir de qualquer um
-- dos cinco setores operacionais (Dados Básicos, Regulação, Passagens,
-- Ajuda de Custo, Acompanhamento) — sem posição fixa na cadeia, diferente
-- dos demais. Reúne solicitações encaminhadas para análise e decisão de um
-- setor responsável, com o motivo do pedido registrado.
--
-- Migration aditiva: amplia os CHECKs de status/setor_atual sem remover
-- valores existentes, e adiciona as duas colunas que a fila de Aprovações
-- precisa exibir mesmo depois de um reload (o dado antes vivia só em
-- memória, em `ultimaTramitacao`, que é sobrescrito a cada nova
-- tramitação):
--   setor_origem_aprovacao — setor de onde a solicitação saiu ao ser
--                            enviada para Aprovação.
--   observacao_aprovacao   — motivo do pedido, obrigatório no front ao
--                            escolher Aprovação como destino.
-- Os dois ficam NULL fora do setor Aprovação (limpos pelo front ao sair).
-- ============================================================

-- 1. Amplia o CHECK de status com o novo status canônico do setor.
ALTER TABLE solicitacoes DROP CONSTRAINT IF EXISTS solicitacoes_status_check;
ALTER TABLE solicitacoes ADD CONSTRAINT solicitacoes_status_check CHECK (status IN (
    'PENDENTE_DIAGNOSTICO',
    'NOVO',
    'EM_ANALISE',
    'EXIGENCIA',
    'AGUARDANDO_REGULACAO',
    'AGUARDANDO_CNRAC',
    'AGUARDANDO_SETI',
    'AGUARDANDO_RESPOSTA_EXTERNA',
    'ENCAMINHADO_SERVICO_SOCIAL',
    'AGUARDANDO_AGENDAMENTO',
    'AGUARDANDO_EMISSAO',
    'EMITIDA',
    'EM_VIAGEM',
    'EM_PERMANENCIA',
    'REMARCACAO',
    'EM_PAGAMENTO',
    'EM_APROVACAO',
    'CONCLUIDO',
    'INDEFERIDO',
    'CANCELADO'
));

-- 2. Amplia o CHECK de setor_atual (aditivo — mantém os valores legados).
ALTER TABLE solicitacoes DROP CONSTRAINT IF EXISTS solicitacoes_setor_atual_check;
ALTER TABLE solicitacoes
  ADD CONSTRAINT solicitacoes_setor_atual_check
  CHECK (setor_atual IN (
    'dados_basicos', 'regulacao', 'passagens', 'ajuda_custo', 'acompanhamento', 'aprovacao', 'encerramento',
    -- legados — mantidos apenas para não quebrar linhas antigas não migradas
    'financeiro', 'encerrada'
  ));

-- 3. Atualiza a função de derivação setor_atual ← status para reconhecer
--    o novo status canônico de Aprovação.
CREATE OR REPLACE FUNCTION setor_atual_from_status(status_in TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE
    WHEN status_in IN ('NOVO', 'EM_ANALISE', 'EXIGENCIA')
      THEN 'dados_basicos'
    WHEN status_in IN (
      'AGUARDANDO_REGULACAO',
      'AGUARDANDO_CNRAC',
      'AGUARDANDO_SETI',
      'AGUARDANDO_RESPOSTA_EXTERNA',
      'ENCAMINHADO_SERVICO_SOCIAL',
      'AGUARDANDO_AGENDAMENTO'
    )
      THEN 'regulacao'
    WHEN status_in IN ('AGUARDANDO_EMISSAO', 'EMITIDA', 'REMARCACAO')
      THEN 'passagens'
    WHEN status_in = 'EM_PAGAMENTO'
      THEN 'ajuda_custo'
    WHEN status_in IN ('EM_VIAGEM', 'EM_PERMANENCIA')
      THEN 'acompanhamento'
    WHEN status_in = 'EM_APROVACAO'
      THEN 'aprovacao'
    WHEN status_in IN ('CONCLUIDO', 'INDEFERIDO')
      THEN 'encerramento'
    ELSE 'dados_basicos'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- trg_sync_setor_atual (migration 037) reinvoca a função acima sempre que o
-- status muda, então já passa a reconhecer 'EM_APROVACAO' automaticamente.

-- 4. Colunas que a fila de Aprovações precisa exibir de forma persistente.
ALTER TABLE solicitacoes ADD COLUMN IF NOT EXISTS setor_origem_aprovacao TEXT;
ALTER TABLE solicitacoes ADD COLUMN IF NOT EXISTS observacao_aprovacao TEXT;

ALTER TABLE solicitacoes DROP CONSTRAINT IF EXISTS solicitacoes_setor_origem_aprovacao_check;
ALTER TABLE solicitacoes
  ADD CONSTRAINT solicitacoes_setor_origem_aprovacao_check
  CHECK (setor_origem_aprovacao IS NULL OR setor_origem_aprovacao IN (
    'dados_basicos', 'regulacao', 'passagens', 'ajuda_custo', 'acompanhamento'
  ));
