-- ============================================================
-- TFD — Migration 078: múltiplos agendamentos confirmados por solicitação
-- ============================================================
-- Pedido do Rafael (18/08/2026) — unificação do cadastro de agendamento da
-- Regulação com o padrão já usado na criação da solicitação: o paciente pode
-- ter vários procedimentos agendados, cada um com sua própria unidade de
-- destino, todos confirmados ao mesmo tempo (a criação já fazia isso; a
-- Regulação ficava travada em 1 só pelo índice único abaixo).
--
-- Sem esse índice, `tentativas_agendamento` passa a aceitar mais de uma linha
-- com `resultado = 'AGENDAMENTO_CONFIRMADO'` por solicitação — cada uma é um
-- agendamento confirmado independente (unidade + tipo de procedimento +
-- data), exibido como item próprio na aba de Regulação.
-- ============================================================

DROP INDEX IF EXISTS uq_tentativa_confirmada_por_solicitacao;
