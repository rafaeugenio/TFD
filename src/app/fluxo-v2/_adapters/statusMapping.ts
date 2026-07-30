/**
 * Mapeamento entre o status detalhado do banco (17 valores) e o
 * setor_atual usado pelo fluxo v2 (PBI 13237 — 6 setores).
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
  | 'EM_APROVACAO'
  | 'CONCLUIDO'
  | 'INDEFERIDO';

/**
 * PBI 13237 — o antigo setor "financeiro" virou dois setores/times
 * (Passagens e Ajuda de Custo), e entrou o estágio pós-financeiro
 * "Acompanhamento" antes do "Encerramento" (que substitui o antigo rótulo
 * "Encerrada").
 *
 * Compatibilidade: `'financeiro'` e `'encerrada'` continuam aceitos como
 * valores legados vindos do banco (linhas ainda não normalizadas pela
 * migration aditiva) — leitura trata os dois como sinônimos de
 * `'passagens'`/`'encerramento'` respectivamente via `normalizarSetorDb`.
 */
export type SetorDb =
  | 'dados_basicos'
  | 'regulacao'
  | 'passagens'
  | 'ajuda_custo'
  | 'acompanhamento'
  | 'aprovacao'
  | 'encerramento'
  /** @deprecated legado — trate como 'passagens' na leitura */
  | 'financeiro'
  /** @deprecated legado — trate como 'encerramento' na leitura */
  | 'encerrada';

/** Normaliza um setor_atual possivelmente legado para os setores atuais. */
export function normalizarSetorDb(setor: string): Exclude<SetorDb, 'financeiro' | 'encerrada'> {
  if (setor === 'financeiro') return 'passagens';
  if (setor === 'encerrada') return 'encerramento';
  if (
    setor === 'dados_basicos' ||
    setor === 'regulacao' ||
    setor === 'passagens' ||
    setor === 'ajuda_custo' ||
    setor === 'acompanhamento' ||
    setor === 'aprovacao' ||
    setor === 'encerramento'
  ) {
    return setor;
  }
  return 'dados_basicos';
}

/** setor_atual ← status detalhado (mesma lógica do trigger do banco). */
export function setorFromStatus(status: StatusDb): Exclude<SetorDb, 'financeiro' | 'encerrada'> {
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
    case 'REMARCACAO':
      return 'passagens';
    case 'EM_PAGAMENTO':
      return 'ajuda_custo';
    case 'EM_VIAGEM':
    case 'EM_PERMANENCIA':
      return 'acompanhamento';
    case 'EM_APROVACAO':
      return 'aprovacao';
    case 'CONCLUIDO':
    case 'INDEFERIDO':
      return 'encerramento';
  }
}

/**
 * Quando o front (v2) quer mover a solicitação para um setor, traduzimos
 * para o status "canônico" daquele setor (entry point).
 */
export function entryStatusForSetor(
  setor: Exclude<SetorDb, 'financeiro' | 'encerrada'>,
): StatusDb {
  switch (setor) {
    case 'dados_basicos':
      return 'NOVO';
    case 'regulacao':
      return 'AGUARDANDO_REGULACAO';
    case 'passagens':
      return 'AGUARDANDO_EMISSAO';
    case 'ajuda_custo':
      return 'EM_PAGAMENTO';
    case 'acompanhamento':
      return 'EM_VIAGEM';
    case 'aprovacao':
      return 'EM_APROVACAO';
    case 'encerramento':
      return 'CONCLUIDO';
  }
}

/**
 * StatusGlobalV2 (mock) usa prefixo `em_` enquanto setor_atual (DB) não.
 * Mapas dos dois lados. Aceita setores legados via `normalizarSetorDb`.
 */
export function setorToStatusGlobal(s: SetorDb): StatusGlobalV2 {
  switch (normalizarSetorDb(s)) {
    case 'dados_basicos':   return 'em_dados_basicos';
    case 'regulacao':       return 'em_regulacao';
    case 'passagens':       return 'em_passagens';
    case 'ajuda_custo':     return 'em_ajuda_custo';
    case 'acompanhamento':  return 'em_acompanhamento';
    case 'aprovacao':       return 'em_aprovacao';
    case 'encerramento':    return 'em_encerramento';
  }
}

export function statusGlobalToSetor(s: StatusGlobalV2): Exclude<SetorDb, 'financeiro' | 'encerrada'> {
  switch (s) {
    case 'em_dados_basicos':  return 'dados_basicos';
    case 'em_regulacao':      return 'regulacao';
    case 'em_passagens':      return 'passagens';
    case 'em_ajuda_custo':    return 'ajuda_custo';
    case 'em_acompanhamento': return 'acompanhamento';
    case 'em_aprovacao':      return 'aprovacao';
    case 'em_encerramento':   return 'encerramento';
  }
}
