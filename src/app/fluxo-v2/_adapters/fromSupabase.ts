/**
 * Converte uma row do Supabase (com relations) em SolicitacaoMock —
 * a estrutura usada por todo o front v2 como view model.
 */

import type {
  SolicitacaoMock,
  PacienteMock,
  AcompanhanteMock,
  ParecerMock,
  TentativaUnidadeMock,
  AgendamentoMock,
  ViagemMock,
  AjudaCustoMock,
  AdicionalMock,
  EncerramentoMock,
  AnexoMock,
  ObservacaoChat,
  DevolucaoFinanceiroParaRegulacao,
  CarimboRegulacao,
  CarimboOutrosInfo,
  DecisaoParecer,
  TipoParecer,
  DesfechoTentativa,
  TipoProcedimento,
  ModalViagem,
  TipoViagem,
  StatusViagem,
  StatusAjuda,
  CategoriaAdicional,
  StatusAdicional,
  MotivoEncerramento,
  ZonaRegional,
} from '@/core/mocks/fluxo-v2-v3-seed';
import { setorToStatusGlobal, type SetorDb } from './statusMapping';

/* ------------------------------------------------------------------ */
/*  Helpers de tipagem mínima das rows                                 */
/* ------------------------------------------------------------------ */

type Row = Record<string, unknown>;

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const opt = (v: unknown): string | undefined =>
  typeof v === 'string' && v.length > 0 ? v : undefined;
const num = (v: unknown): number => (typeof v === 'number' ? v : 0);
const arr = (v: unknown): Row[] => (Array.isArray(v) ? (v as Row[]) : []);
const obj = (v: unknown): Row | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Row) : null;

/* ------------------------------------------------------------------ */
/*  Pacientes                                                          */
/* ------------------------------------------------------------------ */

function pacienteFromRow(p: Row | null): PacienteMock {
  if (!p) return emptyPaciente();

  const mun = obj(p.municipios);
  const municipioNome = str(mun?.nome) || str(p.municipio) || '';
  const uf = str(mun?.uf) || str(p.uf) || 'MA';

  return {
    id: str(p.id),
    nome: str(p.nome_completo),
    cpf: str(p.cpf),
    cns: opt(p.cns),
    dataNascimento: str(p.data_nascimento),
    sexo: str(p.sexo) === 'FEMININO' ? 'F' : 'M',
    nomeMae: opt(p.nome_mae),
    telefone: str(p.telefone_celular) || str(p.telefone_fixo),
    email: opt(p.email),
    municipio: municipioNome ? `${municipioNome} - ${uf}` : '',
    regional: '', // populado por enrichers (regional via municipio_residencia_id → regional_saude_municipios)
    zonaRegional: (str(p.zona_regional) || 'Centro') as ZonaRegional,
    endereco: {
      logradouro: str(p.logradouro),
      numero: str(p.numero),
      bairro: str(p.bairro),
      cep: str(p.cep),
    },
  };
}

function emptyPaciente(): PacienteMock {
  return {
    id: '',
    nome: '',
    cpf: '',
    dataNascimento: '',
    sexo: 'M',
    telefone: '',
    municipio: '',
    regional: '',
    zonaRegional: 'Centro',
    endereco: { logradouro: '', numero: '', bairro: '', cep: '' },
  };
}

/* ------------------------------------------------------------------ */
/*  Acompanhantes                                                      */
/* ------------------------------------------------------------------ */

function acompanhantesFromRows(rows: Row[]): AcompanhanteMock[] {
  return rows
    .map((r) => {
      const acomp = obj(r.acompanhantes);
      if (!acomp) return null;
      return {
        id: str(acomp.id),
        nome: str(acomp.nome_completo),
        cpf: str(acomp.cpf),
        dataNascimento: str(acomp.data_nascimento),
        vinculo: str(acomp.vinculo) || 'Outro',
        // `doador` agora vive na junção (solicitacao_acompanhantes), não no
        // cadastro do acompanhante — é por solicitação.
        doador: Boolean(r.doador),
      } as AcompanhanteMock;
    })
    .filter((a): a is AcompanhanteMock => a !== null);
}

/* ------------------------------------------------------------------ */
/*  Pareceres                                                          */
/* ------------------------------------------------------------------ */

function parecerFromRow(r: Row): ParecerMock {
  const auditor = obj(r.usuarios);
  return {
    id: str(r.id),
    data: str(r.created_at),
    decisao: (str(r.decisao) === 'INDEFERIDO' ? 'indeferido' : 'deferido') as DecisaoParecer,
    tipo: opt(r.tipo) as TipoParecer | undefined,
    cidPrincipal: opt(r.cid_principal),
    cidPrincipalNome: opt(r.cid_principal_nome),
    cidSecundario: opt(r.cid_secundario),
    cidSecundarioNome: opt(r.cid_secundario_nome),
    versaoCID: (opt(r.versao_cid) as '10' | '11' | undefined) ?? '10',
    observacao: opt(r.justificativa),
    medico: str(auditor?.nome_completo),
    medicoCrm: opt(auditor?.crm),
    medicoCrmUf: opt(auditor?.crm_uf),
    medicoEspecialidade: opt(auditor?.especialidade_medica),
  };
}

/* ------------------------------------------------------------------ */
/*  Rotas de regulação → carimbo                                       */
/* ------------------------------------------------------------------ */

function carimboFromRotas(rotas: Row[]): {
  carimboRegulacao?: CarimboRegulacao;
  carimboObservacao?: string;
  carimboOutrosInfo?: CarimboOutrosInfo;
} {
  if (rotas.length === 0) return {};

  // Pega a rota mais recente
  const latest = [...rotas].sort((a, b) => {
    const da = str(a.created_at);
    const db = str(b.created_at);
    return db.localeCompare(da);
  })[0];

  const tipo = str(latest.tipo_rota);
  let carimbo: CarimboRegulacao | undefined;
  if (tipo === 'APROVADO_DIRETO') carimbo = 'APROVADO_DIRETO';
  else if (tipo === 'CNRAC') carimbo = 'CNRAC';
  else if (tipo === 'SETI') carimbo = 'CET';
  else if (tipo === 'SAAS') carimbo = 'SAAS';
  else if (tipo === 'RESPOSTA_EXTERNA' || tipo === 'ENCAMINHADO_SERVICO_SOCIAL') carimbo = 'AGENDAMENTO';

  const formaContato = str(latest.outros_forma_contato);
  const outrosInfo: CarimboOutrosInfo | undefined =
    carimbo === 'AGENDAMENTO' && str(latest.outros_unidade_orgao)
      ? {
          unidadeOrgao: str(latest.outros_unidade_orgao),
          formaContato: (formaContato || 'telefone') as CarimboOutrosInfo['formaContato'],
          observacao: opt(latest.outros_observacao),
        }
      : undefined;

  return {
    carimboRegulacao: carimbo,
    carimboObservacao: opt(latest.justificativa),
    carimboOutrosInfo: outrosInfo,
  };
}

/* ------------------------------------------------------------------ */
/*  Tentativas de agendamento                                          */
/* ------------------------------------------------------------------ */

const DESFECHO_FROM_DB: Record<string, DesfechoTentativa> = {
  NEGOU: 'negou',
  ACEITOU: 'aceitou',
  PEDIU_DOCUMENTACAO: 'pediu_documento',
  AGUARDANDO: 'sem_resposta',
  AGENDAMENTO_CONFIRMADO: 'agendamento_confirmado',
};

const TIPO_PROC_FROM_DB: Record<string, TipoProcedimento> = {
  CONSULTA: 'consulta',
  CIRURGIA: 'cirurgia',
  EXAME: 'exame',
  TRATAMENTO: 'tratamento_continuo',
};

function tentativasFromRows(rows: Row[]): TentativaUnidadeMock[] {
  return rows
    .map((r) => {
      const desfechoDb = str(r.resultado);
      const desfecho: DesfechoTentativa = DESFECHO_FROM_DB[desfechoDb] ?? 'pendente';
      const isConfirmada = desfecho === 'agendamento_confirmado';
      const dataConfirmada = str(r.data_agendamento);
      const dataContato = str(r.data_contato) || str(r.created_at);

      return {
        id: str(r.id),
        unidade: str(r.unidade_nome) || str(obj(r.unidades_destino)?.nome),
        data: dataContato,
        desfecho,
        observacao: opt(r.observacao),
        dataAgendamento: isConfirmada && dataConfirmada ? dataConfirmada : undefined,
        hora: isConfirmada ? opt(r.hora_agendamento) : undefined,
        tipoProcedimento: isConfirmada
          ? TIPO_PROC_FROM_DB[str(r.tipo_procedimento)]
          : undefined,
        // Contato (telefone/email) é registrado em qualquer desfecho — não só no confirmado.
        contatoUnidade: opt(r.contato_unidade),
        observacoesChegada: isConfirmada ? opt(r.observacoes_chegada) : undefined,
      };
    })
    .sort((a, b) => a.data.localeCompare(b.data));
}

function agendamentoFromTentativas(
  tentativas: TentativaUnidadeMock[],
  hasAnyTentativa: boolean,
): AgendamentoMock | undefined {
  if (!hasAnyTentativa) return undefined;
  return {
    id: 'agendamento-derived',
    origem: 'criacao',
    tentativas,
  };
}

/* ------------------------------------------------------------------ */
/*  Viagens                                                            */
/* ------------------------------------------------------------------ */

const MODAL_FROM_DB: Record<string, ModalViagem> = {
  AEREO: 'aereo',
  TERRESTRE: 'terrestre',
  FLUVIAL: 'fluvial',
};

const TIPO_VIAGEM_FROM_DB: Record<string, TipoViagem> = {
  IDA: 'ida',
  RETORNO: 'volta',
  IDA_E_VOLTA: 'ida',
};

function statusViagemFromDb(situacao: string, embarcou: boolean): StatusViagem {
  if (embarcou) return 'confirmada';
  switch (situacao) {
    case 'EMITIDA': return 'agendada';
    case 'REMARCADA': return 'remarcada';
    case 'NO_SHOW': return 'nao_compareceu';
    case 'CANCELADA': return 'cancelada';
    case 'UTILIZADA': return 'confirmada';
    default: return 'agendada';
  }
}

function viagensFromRows(rows: Row[]): ViagemMock[] {
  return rows.map((r) => ({
    id: str(r.id),
    origem: `${str(r.origem_cidade)} - ${str(r.origem_uf)}`,
    destino: `${str(r.destino_cidade)} - ${str(r.destino_uf)}`,
    data: str(r.data_embarque_real) || str(r.data_embarque_prevista),
    modal: MODAL_FROM_DB[str(r.modal)] ?? 'aereo',
    tipo: TIPO_VIAGEM_FROM_DB[str(r.tipo)] ?? 'ida',
    status: statusViagemFromDb(str(r.situacao), Boolean(r.embarcou)),
    valor: num(r.valor),
    dataCriacao: str(r.created_at),
    bilheteUrl: opt(r.numero_bilhete),
    beneficiarioTipo: 'paciente',
  }));
}

/* ------------------------------------------------------------------ */
/*  Ajudas de custo                                                    */
/* ------------------------------------------------------------------ */

// Status novo (3 valores) + mapeamento dos legados do banco para eles.
const STATUS_AJUDA_FROM_DB: Record<string, StatusAjuda> = {
  EMITIDO: 'emitido',
  EM_ANALISE: 'emitido',
  APROVADA: 'emitido',
  EM_PAGAMENTO: 'emitido',
  PAGO_PARCIALMENTE: 'emitido',
  CONCLUIDO: 'concluido',
  CONCLUIDA: 'concluido',
  GLOSADA: 'glosada',
};

function ajudasFromRows(rows: Row[]): AjudaCustoMock[] {
  return rows.map((r) => ({
    id: str(r.id),
    beneficiarioTipo: (str(r.tipo) === 'ACOMPANHANTE' ? 'acompanhante' : 'paciente'),
    dataInicio: str(r.data_inicio),
    dataFim: str(r.data_fim),
    status: STATUS_AJUDA_FROM_DB[str(r.status)] ?? 'emitido',
    dataConclusao: opt(r.concluido_em),
    observacao: opt(r.observacoes),
  }));
}

/* ------------------------------------------------------------------ */
/*  Adicionais                                                         */
/* ------------------------------------------------------------------ */

const CAT_ADICIONAL_FROM_DB: Record<string, CategoriaAdicional> = {
  PASSAGEM_EXTRA: 'passagem_extra',
  AJUDA_EXTRA: 'ajuda_extra',
  BAGAGEM: 'bagagem',
  TRANSFER: 'transfer',
  OUTRO: 'outro',
};

const STATUS_ADICIONAL_FROM_DB: Record<string, StatusAdicional> = {
  PENDENTE_APROVACAO: 'pendente_aprovacao',
  APROVADO: 'aprovado',
  INDEFERIDO: 'indeferido',
  PAGO: 'pago',
};

function adicionaisFromRows(rows: Row[]): AdicionalMock[] {
  return rows.map((r) => ({
    id: str(r.id),
    categoria: CAT_ADICIONAL_FROM_DB[str(r.categoria)] ?? 'outro',
    descricao: str(r.descricao),
    data: str(r.data_ocorrencia) || str(r.created_at),
    valor: num(r.valor),
    status: STATUS_ADICIONAL_FROM_DB[str(r.status)] ?? 'pendente_aprovacao',
    beneficiarioTipo: str(r.beneficiario_tipo) === 'ACOMPANHANTE' ? 'acompanhante' : 'paciente',
    beneficiarioId: opt(r.beneficiario_id),
    viagemId: opt(r.viagem_id),
  }));
}

/* ------------------------------------------------------------------ */
/*  Encerramento                                                       */
/* ------------------------------------------------------------------ */

const MOTIVO_ENC_FROM_DB: Record<string, MotivoEncerramento> = {
  ALTA_MEDICA: 'alta_medica',
  TRANSFERENCIA: 'transferencia',
  DESISTENCIA: 'desistencia',
  ABANDONO: 'abandono',
  OBITO: 'obito',
};

function encerramentoFromRows(rows: Row[]): EncerramentoMock | undefined {
  const latest = rows[0];
  if (!latest) return undefined;
  return {
    data: str(latest.data_encerramento),
    motivo: MOTIVO_ENC_FROM_DB[str(latest.motivo)] ?? 'alta_medica',
    observacao: opt(latest.observacoes),
  };
}

/* ------------------------------------------------------------------ */
/*  Observações + Devoluções                                           */
/* ------------------------------------------------------------------ */

function observacoesFromRows(rows: Row[]): ObservacaoChat[] {
  return rows
    .map((r) => ({
      id: str(r.id),
      autor: str(obj(r.usuarios)?.nome_completo) || 'Sistema',
      perfilAutor: str(r.perfil_autor) || 'Sistema',
      texto: str(r.conteudo),
      data: str(r.created_at),
    }))
    .sort((a, b) => a.data.localeCompare(b.data));
}

function devolucoesFromRows(rows: Row[]): DevolucaoFinanceiroParaRegulacao[] {
  return rows
    .filter((r) => str(r.setor_destino) === 'regulacao')
    .map((r) => ({
      id: str(r.id),
      motivo: str(r.motivo),
      data: str(r.created_at),
      autor: str(obj(r.usuarios)?.nome_completo) || 'Sistema',
      perfilAutor: str(obj(r.usuarios)?.perfil) || 'Financeiro',
      resolvida: Boolean(r.resolvido_em),
    }))
    .sort((a, b) => b.data.localeCompare(a.data));
}

/* ------------------------------------------------------------------ */
/*  Anexos (documentos)                                                */
/* ------------------------------------------------------------------ */

function anexosFromRows(rows: Row[]): AnexoMock[] {
  return rows.map((r) => ({
    id: str(r.id),
    nome: str(r.nome_arquivo),
    tipo: str(r.tipo) || 'OUTROS',
    tamanhoKB: typeof r.tamanho_bytes === 'number' ? Math.round((r.tamanho_bytes as number) / 1024) : undefined,
  }));
}

/* ------------------------------------------------------------------ */
/*  Solicitação                                                        */
/* ------------------------------------------------------------------ */

export function solicitacaoFromSupabase(row: Row): SolicitacaoMock {
  const paciente = pacienteFromRow(obj(row.pacientes));
  const acompanhantes = acompanhantesFromRows(arr(row.solicitacao_acompanhantes));
  const pareceres = arr(row.pareceres).map(parecerFromRow);
  const rotas = arr(row.rotas_regulacao);
  const carimbo = carimboFromRotas(rotas);
  const tentativas = tentativasFromRows(arr(row.tentativas_agendamento));
  const agendamento = agendamentoFromTentativas(tentativas, tentativas.length > 0);
  const viagens = viagensFromRows(arr(row.viagens));
  const ajudasCusto = ajudasFromRows(arr(row.ajudas_custo));
  const adicionais = adicionaisFromRows(arr(row.adicionais));
  const encerramento = encerramentoFromRows(arr(row.encerramentos));
  const observacoes = observacoesFromRows(arr(row.observacoes_processo));
  const devolucoes = devolucoesFromRows(arr(row.devolucoes));
  const anexos = anexosFromRows(arr(row.documentos));

  const setor = (str(row.setor_atual) || 'dados_basicos') as SetorDb;

  return {
    id: str(row.id),
    numero: str(row.numero_processo),
    status: setorToStatusGlobal(setor),
    tipoSolicitacao: str(row.tipo_solicitacao) === 'AJUDA_CUSTO' ? 'ajuda_custo' : 'normal',
    dataCriacao: str(row.created_at),
    dataLaudo: opt(row.data_laudo),
    paciente,
    acompanhantes,
    anexos,
    pareceres,
    ...carimbo,
    agendamento,
    viagens,
    ajudasCusto,
    adicionais,
    encerramento,
    observacoes,
    devolucoes,
    numeroSEI: opt(row.numero_protocolo),
    seiUrl: opt(row.url_sei),
  };
}

export function solicitacoesFromSupabase(rows: Row[]): SolicitacaoMock[] {
  return rows.map(solicitacaoFromSupabase);
}
