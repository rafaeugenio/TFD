/**
 * Select string compartilhado para carregar uma solicitação com TODAS
 * as relações necessárias para hidratar um SolicitacaoMock.
 *
 * Mantém em um único lugar para evitar drift entre list e detail queries.
 *
 * IMPORTANTE: o PostgREST valida a árvore de relações do embed inteira antes
 * de executar — se uma única relação embutida referenciar uma tabela/FK que
 * ainda não existe no banco (migration aditiva pendente), a query INTEIRA
 * falha e nenhuma solicitação é retornada. Por isso `despesas_funerarias`
 * (migration 00062) é buscada à parte, com fallback próprio, em vez de
 * embutida aqui — a listagem não pode depender de toda migration aditiva
 * já ter sido aplicada no ambiente para exibir dados existentes.
 */

export const SOLICITACAO_V2_SELECT = `
  *,
  setor_atual,
  responsavel:responsavel_atual_id (id, nome_completo),
  pacientes (
    *,
    municipios:municipio_residencia_id (id, nome, uf)
  ),
  origem_laudo_unidade:unidades_destino!solicitacoes_origem_laudo_unidade_id_fkey (id, nome, cnes),
  solicitacao_acompanhantes (
    *,
    acompanhantes (*)
  ),
  pareceres (
    *,
    usuarios:medico_auditor_id (id, nome_completo)
  ),
  rotas_regulacao (
    *,
    cobrancas_externas (*)
  ),
  tentativas_agendamento (
    *,
    unidades_destino:unidade_id (id, nome, cnes, cidade, uf)
  ),
  agendamentos (*),
  viagens (*),
  ajudas_custo (*),
  adicionais (*),
  encerramentos (*),
  observacoes_processo (
    *,
    usuarios:autor_id (id, nome_completo, perfil)
  ),
  devolucoes (
    *,
    usuarios:devolvido_por (id, nome_completo, perfil)
  ),
  documentos (*)
`.trim();
