-- Corrige solicitações de ajuda de custo (sem viagens) que ficaram em
-- AGUARDANDO_EMISSAO por engano. Como não há passagem para emitir, o
-- status correto é EM_PAGAMENTO (entry point do financeiro pra ajuda).
--
-- O trigger trg_sync_setor_atual já mantém setor_atual='financeiro' nesse
-- caso, então só precisamos do UPDATE de status.

UPDATE public.solicitacoes
   SET status = 'EM_PAGAMENTO'
 WHERE tipo_solicitacao = 'AJUDA_CUSTO'
   AND status = 'AGUARDANDO_EMISSAO';
