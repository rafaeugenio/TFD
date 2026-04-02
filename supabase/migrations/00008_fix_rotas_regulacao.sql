-- Make responsavel_id nullable (no auth system yet, placeholder users don't exist)
ALTER TABLE rotas_regulacao ALTER COLUMN responsavel_id DROP NOT NULL;

-- Add CANCELADO to solicitacoes status check constraint
ALTER TABLE solicitacoes DROP CONSTRAINT IF EXISTS solicitacoes_status_check;
ALTER TABLE solicitacoes ADD CONSTRAINT solicitacoes_status_check CHECK (status IN (
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
