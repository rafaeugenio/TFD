/**
 * Mapeamento entre o status detalhado do banco (17 valores) e o
 * setor_atual usado pelo fluxo v2 (4 valores).
 *
 * IMPORTANTE: o banco tem o trigger `trg_sync_setor_atual` que mantém
 * setor_atual em sincronia quando status muda. Estas funções servem
 * para escrita inicial e para leitura quando precisamos do "status
 * tela" (v2) sem ler a coluna setor_atual.
 */

import type { StatusGlobalV2 } from '@/core/mocks/fluxo-v2-v3-seed';

export type StatusDb =
  | 'NOVO'
  | 'EM_ANALISE'
  | 'EXIGENCIA'
  | 'AGUARDANDO_REGULACAO'
  | 'AGUARDANDO_CNRAC'
  | 'AGUARDANDO_SETI'
  | 'AGUARDANDO_RESPOSTA_EXTERNA'
  | 'ENCAMINHADO_SERVICO_SOCIAL'
  | 'AGUARDANDO_AGENDAMENTO'
  | 'AGUARDANDO_EMISSAO'
  | 'EMITIDA'
  | 'EM_VIAGEM'
  | 'EM_PERMANENCIA'
  | 'REMARCACAO'
  | 'EM_PAGAMENTO'
  | 'CONCLUIDO'
  | 'INDEFERIDO';

export type SetorDb = 'dados_basicos' | 'regulacao' | 'financeiro' | 'encerrada';

/** setor_atual ← status detalhado (mesma lógica do trigger do banco). */
export function setorFromStatus(status: StatusDb): SetorDb {
  switch (status) {
    case 'NOVO':
    case 'EM_ANALISE':
    case 'EXIGENCIA':
      return 'dados_basicos';
    case 'AGUARDANDO_REGULACAO':
    case 'AGUARDANDO_CNRAC':
    case 'AGUARDANDO_SETI':
    case 'AGUARDANDO_RESPOSTA_EXTERNA':
    case 'ENCAMINHADO_SERVICO_SOCIAL':
    case 'AGUARDANDO_AGENDAMENTO':
      return 'regulacao';
    case 'AGUARDANDO_EMISSAO':
    case 'EMITIDA':
    case 'EM_VIAGEM':
    case 'EM_PERMANENCIA':
    case 'REMARCACAO':
    case 'EM_PAGAMENTO':
      return 'financeiro';
    case 'CONCLUIDO':
    case 'INDEFERIDO':
      return 'encerrada';
  }
}

/**
 * Quando o front (v2) quer mover a solicitação para um setor, traduzimos
 * para o status "canônico" daquele setor (entry point).
 *
 * `tipoSolicitacao` (opcional) ajusta o entry status do financeiro:
 *   - 'ajuda_custo' (sem viagens) → entra direto em EM_PAGAMENTO, porque
 *     não há passagem para emitir.
 *   - default (normal) → AGUARDANDO_EMISSAO de passagens.
 */
export function entryStatusForSetor(
  setor: SetorDb,
  tipoSolicitacao?: 'normal' | 'ajuda_custo',
): StatusDb {
  switch (setor) {
    case 'dados_basicos':
      return 'NOVO';
    case 'regulacao':
      return 'AGUARDANDO_REGULACAO';
    case 'financeiro':
      return tipoSolicitacao === 'ajuda_custo' ? 'EM_PAGAMENTO' : 'AGUARDANDO_EMISSAO';
    case 'encerrada':
      return 'CONCLUIDO';
  }
}

/**
 * StatusGlobalV2 (mock) usa prefixo `em_` enquanto setor_atual (DB) não.
 * Mapas dos dois lados.
 */
export function setorToStatusGlobal(s: SetorDb): StatusGlobalV2 {
  switch (s) {
    case 'dados_basicos': return 'em_dados_basicos';
    case 'regulacao':     return 'em_regulacao';
    case 'financeiro':    return 'em_financeiro';
    case 'encerrada':     return 'encerrada';
  }
}

export function statusGlobalToSetor(s: StatusGlobalV2): SetorDb {
  switch (s) {
    case 'em_dados_basicos': return 'dados_basicos';
    case 'em_regulacao':     return 'regulacao';
    case 'em_financeiro':    return 'financeiro';
    case 'encerrada':        return 'encerrada';
  }
}
