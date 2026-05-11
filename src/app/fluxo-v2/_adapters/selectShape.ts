/**
 * Select string compartilhado para carregar uma solicitação com TODAS
 * as relações necessárias para hidratar um SolicitacaoMock.
 *
 * Mantém em um único lugar para evitar drift entre list e detail queries.
 */

export const SOLICITACAO_V2_SELECT = `
  *,
  setor_atual,
  pacientes (
    *,
    municipios:municipio_residencia_id (id, nome, uf)
  ),
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
