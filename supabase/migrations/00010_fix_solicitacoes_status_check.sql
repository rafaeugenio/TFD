-- ============================================================
-- TFD — Migration 010: Adicionar PENDENTE_DIAGNOSTICO e CANCELADO
-- ao CHECK constraint de status da tabela solicitacoes.
-- O código do front-end usa esses status mas o constraint original
-- não os incluía.
-- ============================================================

ALTER TABLE solicitacoes DROP CONSTRAINT solicitacoes_status_check;
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
    'CONCLUIDO',
    'INDEFERIDO',
    'CANCELADO'
));
