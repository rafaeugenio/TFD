-- Renomeia o carimbo 'SAIS_DUTRA' (introduzido na 00049) para 'SAAS' —
-- o nome real do serviço é apenas "SAAS", sem "Dutra". Atualiza linhas
-- existentes e ajusta a CHECK constraint.

UPDATE rotas_regulacao SET tipo_rota = 'SAAS' WHERE tipo_rota = 'SAIS_DUTRA';

ALTER TABLE rotas_regulacao DROP CONSTRAINT IF EXISTS rotas_regulacao_tipo_rota_check;

ALTER TABLE rotas_regulacao ADD CONSTRAINT rotas_regulacao_tipo_rota_check
  CHECK (tipo_rota IN (
    'APROVADO_DIRETO',
    'CNRAC',
    'SETI',
    'RESPOSTA_EXTERNA',
    'SERVICO_SOCIAL',
    'SAAS',
    'REPROVADO_PRORROGACAO',
    'APROVADO_PRORROGACAO'
  ));
