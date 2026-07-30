/**
 * Converte inputs e patches do front v2 (shape do mock) em DTOs do banco.
 *
 * Cobre as operações mais comuns:
 *  - createSolicitacao (NewSolicitacaoInput → Insert<'solicitacoes'>)
 *  - addParecer / editarParecer
 *  - setCarimbo (CarimboRegulacao → rotas_regulacao)
 *  - addTentativa / editarTentativa
 *  - addViagem, addAjudaCusto, addAdicional
 *  - encerrar
 *  - addObservacao
 *  - devolução / envio entre setores
 *
 * Não chama o banco — apenas formata payloads. As chamadas Supabase
 * ficam no Provider (Fase 3).
 */

import type {
  ParecerMock,
  CarimboRegulacao,
  CarimboOutrosInfo,
  TentativaUnidadeMock,
  ViagemMock,
  AjudaCustoMock,
  AdicionalMock,
  DespesaFunerariaMock,
  EncerramentoMock,
} from '@/core/mocks/fluxo-v2-v3-seed';
import { entryStatusForSetor, type SetorDb, type StatusDb } from './statusMapping';

/* ------------------------------------------------------------------ */
/*  Solicitação (create)                                               */
/* ------------------------------------------------------------------ */

export interface NewSolicitacaoSupabase {
  paciente_id: string;
  numero_processo: string;
  numero_protocolo?: string;
  url_sei?: string;
  data_laudo?: string;
  origem_laudo_unidade_id?: string;
  status: StatusDb;
  setor_atual: SetorDb;
  /** PBI 13218 — a distinção de tipo de solicitação foi removida; toda
   *  solicitação nova é 'NORMAL'. Mantido só pela coluna legada no banco. */
  tipo_solicitacao: 'NORMAL';
}

export function buildNewSolicitacao(input: {
  pacienteId: string;
  numeroProcesso: string;
  numeroSEI: string;
  seiUrl: string;
  dataLaudo?: string;
  origemLaudoUnidadeId?: string;
}): NewSolicitacaoSupabase {
  return {
    paciente_id: input.pacienteId,
    numero_processo: input.numeroProcesso,
    numero_protocolo: input.numeroSEI,
    url_sei: input.seiUrl,
    data_laudo: input.dataLaudo,
    origem_laudo_unidade_id: input.origemLaudoUnidadeId,
    status: 'NOVO',
    setor_atual: 'dados_basicos',
    tipo_solicitacao: 'NORMAL',
  };
}

/* ------------------------------------------------------------------ */
/*  Pareceres                                                          */
/* ------------------------------------------------------------------ */

export interface ParecerDb {
  solicitacao_id: string;
  medico_auditor_id: string | null;
  decisao: 'DEFERIDO' | 'INDEFERIDO';
  tipo?: string;
  cid_principal?: string;
  cid_principal_nome?: string;
  cid_secundario?: string;
  cid_secundario_nome?: string;
  versao_cid?: '10' | '11';
  justificativa?: string;
}

export function buildParecer(
  solicitacaoId: string,
  p: Omit<ParecerMock, 'id' | 'data'>,
  medicoAuditorId: string | null,
): ParecerDb {
  return {
    solicitacao_id: solicitacaoId,
    medico_auditor_id: medicoAuditorId,
    decisao: p.decisao === 'indeferido' ? 'INDEFERIDO' : 'DEFERIDO',
    tipo: p.tipo,
    cid_principal: p.cidPrincipal,
    cid_principal_nome: p.cidPrincipalNome,
    cid_secundario: p.cidSecundario,
    cid_secundario_nome: p.cidSecundarioNome,
    versao_cid: p.versaoCID ?? '10',
    justificativa: p.observacao,
  };
}

/* ------------------------------------------------------------------ */
/*  Rotas de regulação (Carimbo)                                       */
/* ------------------------------------------------------------------ */

const TIPO_ROTA_FROM_CARIMBO: Record<CarimboRegulacao, string> = {
  APROVADO_DIRETO: 'APROVADO_DIRETO',
  CNRAC: 'CNRAC',
  CET: 'SETI',
  SAAS: 'SAAS',
  AGENDAMENTO: 'RESPOSTA_EXTERNA',
};

export interface RotaRegulacaoDb {
  solicitacao_id: string;
  responsavel_id: string | null;
  tipo_rota: string;
  justificativa?: string;
  outros_unidade_orgao?: string;
  outros_forma_contato?: string;
  outros_observacao?: string;
}

export function buildRotaRegulacao(
  solicitacaoId: string,
  carimbo: CarimboRegulacao,
  responsavelId: string | null,
  observacao?: string,
  outrosInfo?: CarimboOutrosInfo,
): RotaRegulacaoDb {
  return {
    solicitacao_id: solicitacaoId,
    responsavel_id: responsavelId,
    tipo_rota: TIPO_ROTA_FROM_CARIMBO[carimbo],
    justificativa: observacao,
    outros_unidade_orgao: outrosInfo?.unidadeOrgao,
    outros_forma_contato: outrosInfo?.formaContato,
    outros_observacao: outrosInfo?.observacao,
  };
}

/* ------------------------------------------------------------------ */
/*  Tentativas de agendamento                                          */
/* ------------------------------------------------------------------ */

const DESFECHO_TO_DB: Record<string, string> = {
  negou: 'NEGOU',
  aceitou: 'ACEITOU',
  pediu_documento: 'PEDIU_DOCUMENTACAO',
  sem_resposta: 'AGUARDANDO',
  pendente: 'AGUARDANDO',
  agendamento_confirmado: 'AGENDAMENTO_CONFIRMADO',
};

const TIPO_PROC_TO_DB: Record<string, string> = {
  consulta: 'CONSULTA',
  cirurgia: 'CIRURGIA',
  exame: 'EXAME',
  tratamento_continuo: 'TRATAMENTO',
};

export interface TentativaDb {
  solicitacao_id: string;
  unidade_id: string | null;
  unidade_nome: string;
  data_contato: string;
  resultado: string;
  observacao?: string;
  registrado_por: string | null;
  contato_unidade?: string;
  data_agendamento?: string;
  hora_agendamento?: string;
  tipo_procedimento?: string;
  observacoes_chegada?: string;
}

export function buildTentativa(
  solicitacaoId: string,
  t: Omit<TentativaUnidadeMock, 'id'>,
  unidadeDestinoId: string | null,
  registradoPorId: string | null,
): TentativaDb {
  const confirmada = t.desfecho === 'agendamento_confirmado';
  return {
    solicitacao_id: solicitacaoId,
    unidade_id: unidadeDestinoId,
    unidade_nome: t.unidade,
    data_contato: t.data,
    resultado: DESFECHO_TO_DB[t.desfecho] ?? 'AGUARDANDO',
    observacao: t.observacao,
    registrado_por: registradoPorId,
    // Contato (telefone/email) é registrado em qualquer desfecho.
    contato_unidade: t.contatoUnidade,
    data_agendamento: confirmada ? t.dataAgendamento : undefined,
    hora_agendamento: confirmada ? t.hora : undefined,
    tipo_procedimento: confirmada && t.tipoProcedimento
      ? TIPO_PROC_TO_DB[t.tipoProcedimento]
      : undefined,
    observacoes_chegada: confirmada ? t.observacoesChegada : undefined,
  };
}

/* ------------------------------------------------------------------ */
/*  Viagens                                                            */
/* ------------------------------------------------------------------ */

const MODAL_TO_DB: Record<string, string> = {
  aereo: 'AEREO',
  terrestre: 'TERRESTRE',
  fluvial: 'FLUVIAL',
};

const TIPO_VIAGEM_TO_DB: Record<string, string> = {
  ida: 'IDA',
  volta: 'RETORNO',
  transfer: 'IDA',
};

const STATUS_VIAGEM_TO_DB: Record<string, string> = {
  agendada: 'EMITIDA',
  confirmada: 'UTILIZADA',
  remarcada: 'REMARCADA',
  nao_compareceu: 'NO_SHOW',
  cancelada: 'CANCELADA',
  reembolso: 'CANCELADA',
};

export interface ViagemDb {
  solicitacao_id: string;
  tipo: string;
  modal: string;
  origem_cidade: string;
  origem_uf: string;
  destino_cidade: string;
  destino_uf: string;
  data_embarque_prevista?: string;
  situacao: string;
  embarcou: boolean;
  valor: number;
  numero_bilhete?: string;
  distancia_valor?: number;
  distancia_unidade?: 'km' | 'milhas' | 'milhas_nauticas';
  valor_ajuda_custo_paciente?: number;
  valor_ajuda_custo_acompanhante?: number;
  valor_reembolso?: number | null;
  data_reembolso?: string | null;
  ativa?: boolean;
  data_cancelamento?: string | null;
  motivo_cancelamento_texto?: string | null;
}

function splitCidadeUf(s: string): { cidade: string; uf: string } {
  const m = s.match(/^(.*?)\s*-\s*([A-Z]{2})$/);
  return m ? { cidade: m[1].trim(), uf: m[2] } : { cidade: s, uf: 'MA' };
}

export function buildViagem(
  solicitacaoId: string,
  v: Omit<ViagemMock, 'id'>,
): ViagemDb {
  // Prefere os campos estruturados (origemCidade/origemUf) quando presentes;
  // cai pra split do `origem` (formato "Cidade - UF") como fallback de compat.
  const o = v.origemCidade && v.origemUf
    ? { cidade: v.origemCidade, uf: v.origemUf }
    : splitCidadeUf(v.origem);
  const d = v.destinoCidade && v.destinoUf
    ? { cidade: v.destinoCidade, uf: v.destinoUf }
    : splitCidadeUf(v.destino);
  return {
    solicitacao_id: solicitacaoId,
    tipo: TIPO_VIAGEM_TO_DB[v.tipo] ?? 'IDA',
    modal: MODAL_TO_DB[v.modal] ?? 'AEREO',
    origem_cidade: o.cidade,
    origem_uf: o.uf,
    destino_cidade: d.cidade,
    destino_uf: d.uf,
    data_embarque_prevista: v.data,
    situacao: STATUS_VIAGEM_TO_DB[v.status] ?? 'EMITIDA',
    embarcou: v.status === 'confirmada',
    valor: v.valor,
    numero_bilhete: v.bilheteUrl,
    distancia_valor: v.distanciaValor,
    distancia_unidade: v.distanciaUnidade,
    valor_ajuda_custo_paciente: v.valorAjudaCustoPaciente,
    valor_ajuda_custo_acompanhante: v.valorAjudaCustoAcompanhante,
    valor_reembolso: v.valorReembolso ?? null,
    data_reembolso: v.dataReembolso ?? null,
    ativa: v.ativa ?? true,
    data_cancelamento: v.dataCancelamento ?? null,
    motivo_cancelamento_texto: v.motivoCancelamentoTexto ?? null,
  };
}

/* ------------------------------------------------------------------ */
/*  Ajuda de custo                                                     */
/* ------------------------------------------------------------------ */

const STATUS_AJUDA_TO_DB: Record<string, string> = {
  emitido: 'EMITIDO',
  concluido: 'CONCLUIDO',
  glosada: 'GLOSADA',
};

export interface AjudaDb {
  solicitacao_id: string;
  tipo: 'PACIENTE' | 'ACOMPANHANTE';
  data_inicio: string;
  data_fim: string;
  status: string;
  concluido_em?: string | null;
  valor_diaria: number;
  valor_total?: number;
  observacoes?: string;
  valor_reembolso?: number | null;
  data_reembolso?: string | null;
  ativa?: boolean;
  data_cancelamento?: string | null;
  motivo_cancelamento_texto?: string | null;
  /** PBI 13218 — processo próprio da ajuda no SEI. */
  numero_sei?: string | null;
  link_processo?: string | null;
}

export function buildAjudaCusto(
  solicitacaoId: string,
  a: Omit<AjudaCustoMock, 'id'>,
): AjudaDb {
  return {
    solicitacao_id: solicitacaoId,
    tipo: a.beneficiarioTipo === 'acompanhante' ? 'ACOMPANHANTE' : 'PACIENTE',
    data_inicio: a.dataInicio,
    data_fim: a.dataFim,
    status: STATUS_AJUDA_TO_DB[a.status] ?? 'EMITIDO',
    concluido_em: a.dataConclusao ?? null,
    valor_diaria: 0,
    observacoes: a.observacao,
    valor_reembolso: a.valorReembolso ?? null,
    data_reembolso: a.dataReembolso ?? null,
    ativa: a.ativa ?? true,
    data_cancelamento: a.dataCancelamento ?? null,
    motivo_cancelamento_texto: a.motivoCancelamentoTexto ?? null,
    numero_sei: a.numeroSEI?.trim() || null,
    link_processo: a.linkProcesso?.trim() || null,
  };
}

/* ------------------------------------------------------------------ */
/*  Adicionais                                                         */
/* ------------------------------------------------------------------ */

const CAT_ADICIONAL_TO_DB: Record<string, string> = {
  passagem_extra: 'PASSAGEM_EXTRA',
  ajuda_extra: 'AJUDA_EXTRA',
  bagagem: 'BAGAGEM',
  transfer: 'TRANSFER',
  outro: 'OUTRO',
};

const STATUS_ADICIONAL_TO_DB: Record<string, string> = {
  pendente_aprovacao: 'PENDENTE_APROVACAO',
  aprovado: 'APROVADO',
  indeferido: 'INDEFERIDO',
  pago: 'PAGO',
};

export interface AdicionalDb {
  solicitacao_id: string;
  categoria: string;
  descricao: string;
  data_ocorrencia: string;
  valor: number;
  status: string;
  beneficiario_tipo: 'PACIENTE' | 'ACOMPANHANTE';
  beneficiario_id: string | null;
  viagem_id: string | null;
}

export function buildAdicional(
  solicitacaoId: string,
  a: Omit<AdicionalMock, 'id'>,
): AdicionalDb {
  const bTipo = a.beneficiarioTipo === 'acompanhante' ? 'ACOMPANHANTE' : 'PACIENTE';
  return {
    solicitacao_id: solicitacaoId,
    categoria: CAT_ADICIONAL_TO_DB[a.categoria] ?? 'OUTRO',
    descricao: a.descricao,
    data_ocorrencia: a.data,
    valor: a.valor,
    status: STATUS_ADICIONAL_TO_DB[a.status] ?? 'PENDENTE_APROVACAO',
    beneficiario_tipo: bTipo,
    beneficiario_id: bTipo === 'ACOMPANHANTE' ? (a.beneficiarioId ?? null) : null,
    viagem_id: a.viagemId ?? null,
  };
}

/* ------------------------------------------------------------------ */
/*  Despesas de funerária                                              */
/* ------------------------------------------------------------------ */

export interface DespesaFunerariaDb {
  solicitacao_id: string;
  descricao: string;
  valor: number;
  data_gasto: string;
}

export function buildDespesaFuneraria(
  solicitacaoId: string,
  d: Omit<DespesaFunerariaMock, 'id'>,
): DespesaFunerariaDb {
  return {
    solicitacao_id: solicitacaoId,
    descricao: d.descricao,
    valor: d.valor,
    data_gasto: d.data,
  };
}

/* ------------------------------------------------------------------ */
/*  Encerramento                                                       */
/* ------------------------------------------------------------------ */

const MOTIVO_ENC_TO_DB: Record<string, string> = {
  alta_medica: 'ALTA_MEDICA',
  transferencia: 'TRANSFERENCIA',
  desistencia: 'DESISTENCIA',
  abandono: 'ABANDONO',
  obito: 'OBITO',
};

export interface EncerramentoDb {
  solicitacao_id: string;
  motivo: string;
  data_encerramento: string;
  observacoes?: string;
  registrado_por: string | null;
}

export function buildEncerramento(
  solicitacaoId: string,
  e: EncerramentoMock,
  registradoPorId: string | null,
): EncerramentoDb {
  return {
    solicitacao_id: solicitacaoId,
    motivo: MOTIVO_ENC_TO_DB[e.motivo] ?? 'ALTA_MEDICA',
    data_encerramento: e.data,
    observacoes: e.observacao,
    registrado_por: registradoPorId,
  };
}

/* ------------------------------------------------------------------ */
/*  Observação (chat)                                                  */
/* ------------------------------------------------------------------ */

export interface ObservacaoDb {
  solicitacao_id: string;
  autor_id: string;
  perfil_autor: string;
  setor_destinatario?: string;
  conteudo: string;
}

export function buildObservacao(
  solicitacaoId: string,
  texto: string,
  autorId: string,
  perfilAutor: string,
  setorDestinatario?: 'REGULACAO' | 'PASSAGENS' | 'FINANCEIRO' | 'COORDENACAO' | 'TODOS',
): ObservacaoDb {
  return {
    solicitacao_id: solicitacaoId,
    autor_id: autorId,
    perfil_autor: perfilAutor,
    setor_destinatario: setorDestinatario,
    conteudo: texto,
  };
}

/* ------------------------------------------------------------------ */
/*  Tramitação entre setores → patch da solicitação                    */
/* ------------------------------------------------------------------ */

/**
 * Quando o front faz `enviarParaSetor(id, destino)`, traduzimos para um
 * UPDATE em solicitacoes mudando status + setor_atual. O trigger
 * trg_sync_setor_atual no banco também atualiza setor_atual quando status
 * muda — aqui setamos os dois explicitamente para deixar claro.
 *
 * Quando o destino é `'aprovacao'`, grava também o setor de onde a
 * solicitação saiu e a observação (motivo do pedido) — únicos dados que a
 * fila de Aprovações precisa exibir e que não sobreviveriam a um reload sem
 * persistência própria. Ao sair da Aprovação para qualquer outro setor, os
 * dois campos são limpos.
 */
export function buildEnvioSetor(
  setor: 'dados_basicos' | 'regulacao' | 'passagens' | 'ajuda_custo' | 'acompanhamento' | 'aprovacao',
  aprovacao?: {
    setorOrigem: 'dados_basicos' | 'regulacao' | 'passagens' | 'ajuda_custo' | 'acompanhamento';
    observacao?: string;
  },
): {
  status: StatusDb;
  setor_atual: SetorDb;
  setor_origem_aprovacao: string | null;
  observacao_aprovacao: string | null;
} {
  return {
    status: entryStatusForSetor(setor),
    setor_atual: setor,
    setor_origem_aprovacao: setor === 'aprovacao' ? aprovacao?.setorOrigem ?? null : null,
    observacao_aprovacao: setor === 'aprovacao' ? aprovacao?.observacao?.trim() || null : null,
  };
}

/* ------------------------------------------------------------------ */
/*  Devolução                                                          */
/* ------------------------------------------------------------------ */

export interface DevolucaoDb {
  solicitacao_id: string;
  setor_origem: string;
  setor_destino: string;
  motivo: string;
  devolvido_por: string;
}

export function buildDevolucao(
  solicitacaoId: string,
  origem: 'passagens' | 'ajuda_custo' | 'acompanhamento' | 'regulacao' | 'dados_basicos',
  destino: 'regulacao' | 'dados_basicos' | 'passagens' | 'ajuda_custo',
  motivo: string,
  devolvidoPorId: string,
): DevolucaoDb {
  return {
    solicitacao_id: solicitacaoId,
    setor_origem: origem,
    setor_destino: destino,
    motivo,
    devolvido_por: devolvidoPorId,
  };
}
