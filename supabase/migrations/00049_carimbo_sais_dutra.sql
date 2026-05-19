-- Adiciona SAIS_DUTRA como novo tipo de carimbo de regulação.
-- Pedido da Manu (TFD) — caso de exceção via SAIS/Hospital Dutra.
-- O carimbo "AGENDAMENTO" (renomeado de "OUTROS" no front) continua mapeando
-- para RESPOSTA_EXTERNA — nenhum dado existente precisa migrar.

ALTER TABLE rotas_regulacao DROP CONSTRAINT IF EXISTS rotas_regulacao_tipo_rota_check;

ALTER TABLE rotas_regulacao ADD CONSTRAINT rotas_regulacao_tipo_rota_check
  CHECK (tipo_rota IN (
    'APROVADO_DIRETO',
    'CNRAC',
    'SETI',
    'RESPOSTA_EXTERNA',
    'SERVICO_SOCIAL',
    'SAIS_DUTRA',
    'REPROVADO_PRORROGACAO',
    'APROVADO_PRORROGACAO'
  ));
