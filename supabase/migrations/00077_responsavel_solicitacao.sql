-- ============================================================
-- TFD — Migration 077: responsáveis pela solicitação em cada setor
-- ============================================================
-- Pedido do time do TFD (18/08/2026) — hoje o sistema só registra em qual
-- setor a solicitação está, nunca quem é a pessoa responsável por ela ali
-- dentro. A partir da primeira tramitação (saída de Dados Básicos), quem
-- envia para outro setor passa a escolher também a(s) pessoa(s)
-- responsável(is).
--
-- Revisão de 18/08/2026 — o pedido original previa uma única pessoa por
-- solicitação (coluna `responsavel_atual_id` em `solicitacoes`). O time
-- pediu suporte a mais de uma pessoa respondendo pela mesma solicitação ao
-- mesmo tempo, então a modelagem virou N:N numa tabela de junção — como
-- esta migration ainda não tinha sido aplicada no banco, ela foi reescrita
-- no lugar em vez de empilhar uma segunda migration por cima.
--
-- O conjunto de responsáveis muda a cada tramitação — a cada envio para
-- outro setor, as linhas da solicitação são substituídas pelo conjunto
-- escolhido (delete + insert, feito pelo front). Sem histórico: a tabela
-- guarda só quem responde AGORA, não quem já respondeu no passado. Vazia é
-- estado neutro (solicitações que ainda não passaram por nenhuma
-- tramitação), não erro.
-- ============================================================

CREATE TABLE IF NOT EXISTS solicitacao_responsaveis (
  solicitacao_id UUID NOT NULL REFERENCES solicitacoes(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (solicitacao_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS idx_solicitacao_responsaveis_solicitacao_id
  ON solicitacao_responsaveis (solicitacao_id);

CREATE INDEX IF NOT EXISTS idx_solicitacao_responsaveis_usuario_id
  ON solicitacao_responsaveis (usuario_id);
