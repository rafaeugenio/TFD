/* -------------------------------------------------------------------------- */
/*  Fluxo v2/v3 — In-memory seed for the Fluxo v2 experiment                  */
/*                                                                            */
/*  This file is the SINGLE source of truth for the /fluxo-v2 prototype.      */
/*  No Supabase calls. No services. Pure typed mocks consumed by the          */
/*  React Context in `src/app/fluxo-v2/_state/FluxoV2Provider.tsx`.            */
/* -------------------------------------------------------------------------- */

export const VALOR_DIARIA_PERNOITE = 24.75;
export const VALOR_DIARIA_RETORNO = 8.4;

/* ── Status global ─────────────────────────────────────────────────────── */

/**
 * PBI 13237 — ciclo de status geral da solicitação. O antigo setor
 * "Financeiro" foi dividido em dois times/status distintos, Passagens e
 * Ajuda de Custo, e o fluxo ganhou um estágio pós-financeiro de
 * Acompanhamento (da viagem/tratamento) antes do Encerramento.
 */
export type StatusGlobalV2 =
  | 'em_dados_basicos'
  | 'em_regulacao'
  | 'em_passagens'
  | 'em_ajuda_custo'
  | 'em_acompanhamento'
  | 'em_encerramento';

/**
 * Setor responsável pela próxima ação. Quando a solicitação está num setor X,
 * apenas aquele setor pode editar — os outros veem em modo locked. O setor
 * "encerramento" trava tudo.
 */
export type SetorAtivo =
  | 'dados_basicos'
  | 'regulacao'
  | 'passagens'
  | 'ajuda_custo'
  | 'acompanhamento'
  | 'encerramento';

/* ── Entidades ─────────────────────────────────────────────────────────── */

export type ZonaRegional = 'Norte' | 'Sul' | 'Leste' | 'Oeste' | 'Centro';

export interface EnderecoPaciente {
  logradouro: string;
  numero: string;
  bairro: string;
  cep: string; // formato XXXXX-XXX
}

export interface PacienteMock {
  id: string;
  nome: string;
  cpf: string;
  cns?: string;              // Cartão SUS (opcional — Ata 7)
  dataNascimento: string;    // ISO
  sexo: 'M' | 'F';
  nomeMae?: string;          // padrão SUS
  telefone: string;          // formato (XX) XXXXX-XXXX
  email?: string;
  municipio: string;         // ex.: 'São Luís - MA'
  regional: string;          // nome da regional (ex.: 'Açailândia')
  regionalCodigo?: string;   // código da URS (ex.: 'URS XIV')
  regionalSede?: string;     // cidade-sede da regional
  zonaRegional: ZonaRegional;
  endereco: EnderecoPaciente;
}

export interface AcompanhanteMock {
  id: string;
  nome: string;
  cpf: string;
  dataNascimento: string;
  vinculo: string;
  doador?: boolean;
}

export type DecisaoParecer = 'deferido' | 'indeferido';

/**
 * Tipo de parecer médico — categoriza o tipo de decisão tomada pelo médico
 * regulador. Cada tipo corresponde a um modelo de texto oficial mantido pela
 * equipe médica (originalmente em Word).
 */
export type TipoParecer =
  | 'tfd_completo'      // TFD (passagem + ajuda de custo)
  | 'sem_agendamento'   // Processo sem agendamento — encaminha à CET
  | 'apenas_ajuda'      // Apenas ajuda de custo
  | 'apenas_passagem'   // Apenas passagem
  | 'prorrogacao'       // Prorrogação de TFD
  | 'medife';           // Autorização Medife (Ata 8 §4.8)

export const TIPO_PARECER_LABEL: Record<TipoParecer, string> = {
  tfd_completo: 'TFD completo (passagem + ajuda de custo)',
  sem_agendamento: 'Processo sem agendamento',
  apenas_ajuda: 'Apenas ajuda de custo',
  apenas_passagem: 'Apenas passagem',
  prorrogacao: 'Prorrogação de TFD',
  medife: 'Autorização Medife',
};

export interface ParecerMock {
  id: string;
  data: string; // ISO datetime
  decisao: DecisaoParecer;
  /** Tipo de parecer — opcional para retrocompat com seeds antigas. */
  tipo?: TipoParecer;
  cidPrincipal?: string;
  /** Descrição do CID principal (preservada junto ao código para exibição). */
  cidPrincipalNome?: string;
  cidSecundario?: string;
  /** Descrição do CID secundário. */
  cidSecundarioNome?: string;
  /** T2.AI — Versão da CID usada (default '10' quando ausente). */
  versaoCID?: '10' | '11';
  observacao?: string;
  medico: string;
  /** Snapshot do CRM do médico no momento da emissão (vem do perfil). */
  medicoCrm?: string;
  /** UF do CRM. */
  medicoCrmUf?: string;
  /** Especialidade médica do auditor (vem do perfil). */
  medicoEspecialidade?: string;
}

export type CarimboRegulacao =
  | 'APROVADO_DIRETO'
  | 'CNRAC'
  | 'CET'
  | 'SAAS'
  | 'AGENDAMENTO';

/**
 * Quando `carimboRegulacao === 'AGENDAMENTO'` (antigo "OUTROS"), a regulação
 * agora faz o contato manual via Agendamentos & tentativas — os detalhes vivem
 * nas tentativas. Esta interface segue exposta para compatibilidade com dados
 * legados persistidos antes do rename.
 */
export interface CarimboOutrosInfo {
  /** Nome da unidade ou órgão contatado (ex.: 'SAAS', 'Hospital Universitário'). */
  unidadeOrgao: string;
  /** Forma pela qual o contato foi feito. */
  formaContato: 'email' | 'telefone' | 'sistema' | 'presencial';
  /** Observação livre sobre o contato (opcional). */
  observacao?: string;
}

export const FORMA_CONTATO_LABEL: Record<CarimboOutrosInfo['formaContato'], string> = {
  email: 'Email',
  telefone: 'Telefone',
  sistema: 'Sistema',
  presencial: 'Presencial',
};

/**
 * T2.AM — Desfechos possíveis de uma tentativa. Quando `'agendamento_confirmado'`,
 * a tentativa funciona como o agendamento confirmado da solicitação (não há
 * mais campo `unidade`/`data`/`hora` no objeto AgendamentoMock — eles vêm da
 * tentativa confirmada).
 */
export type DesfechoTentativa =
  | 'pendente'
  | 'negou'
  | 'pediu_documento'
  | 'aceitou'
  | 'sem_resposta'
  | 'agendamento_confirmado';

export interface TentativaUnidadeMock {
  id: string;
  unidade: string;
  /** Data em que a regulação entrou em contato com a unidade (controle interno). */
  data: string;
  desfecho: DesfechoTentativa;
  observacao?: string;
  /**
   * Data efetiva do agendamento do paciente na unidade — só preenchida quando
   * `desfecho === 'agendamento_confirmado'`. Diferente de `data`, que é a data
   * em que o contato foi feito.
   */
  dataAgendamento?: string;
  /** Hora do agendamento — só preenchido quando `desfecho === 'agendamento_confirmado'`. */
  hora?: string;
  /** Tipo do procedimento — só usado quando `desfecho === 'agendamento_confirmado'`. */
  tipoProcedimento?: TipoProcedimento;
  /** Telefone/e-mail da unidade — registrado em qualquer desfecho. */
  contatoUnidade?: string;
  /** Observações de chegada — só usado quando `desfecho === 'agendamento_confirmado'`. */
  observacoesChegada?: string;
}

export const DESFECHO_TENTATIVA_LABEL: Record<DesfechoTentativa, string> = {
  pendente: 'Pendente',
  negou: 'Negou',
  pediu_documento: 'Pediu documento',
  aceitou: 'Aceitou',
  sem_resposta: 'Sem resposta',
  agendamento_confirmado: 'Agendamento confirmado',
};

/** T2.AJ — Tipo de procedimento que será realizado na unidade de destino.
 *  Fonte de verdade: tabela auxiliar `tipo_procedimento` (lookup dinâmico).
 *  Os 4 literais abaixo são apenas autocompletar para os códigos legados —
 *  o `(string & {})` permite qualquer outro código vindo da lookup (ex.
 *  'hemodialise', 'odontologia', 'quimioterapia', 'radioterapia', ...). */
export type TipoProcedimento =
  | 'consulta'
  | 'cirurgia'
  | 'exame'
  | 'tratamento_continuo'
  | (string & {});

/** @deprecated Fallback estático. Use `useTiposProcedimento().getLabel(codigo)`
 *  para resolver rótulos dinamicamente a partir da tabela auxiliar. */
export const TIPO_PROCEDIMENTO_LABEL: Record<string, string> = {
  consulta: 'Consulta',
  cirurgia: 'Cirurgia',
  exame: 'Exame',
  tratamento_continuo: 'Tratamento contínuo',
};

/**
 * T2.AM — Agendamento agora é apenas o "container" da lista de tentativas.
 * Os dados do agendamento (unidade/data/hora/tipo/contato/chegada) vivem na
 * tentativa cujo desfecho é `'agendamento_confirmado'`. Use o helper
 * `agendamentoConfirmado(s)` em `_utils/agendamento.ts` para acessá-la.
 */
export interface AgendamentoMock {
  id: string;
  origem: 'criacao' | 'excecao_cnrac' | 'excecao_cet';
  tentativas: TentativaUnidadeMock[];
  segundoDeferimento?: { data: string; medico: string };
}

export type ModalViagem = 'aereo' | 'terrestre' | 'fluvial';
/** Status operacional da passagem. `cancelada` e `reembolso` saíram do fluxo
 *  oficial em mai/2026 — viraram, respectivamente, `ativa=false` e o par
 *  (`valorReembolso`, `dataReembolso`). Os 2 valores foram mantidos no enum
 *  apenas pra compat de dados antigos. Não usar em registros novos. */
export type StatusViagem =
  | 'agendada'
  | 'confirmada'
  | 'remarcada'
  | 'nao_compareceu'
  /** @deprecated Use `ativa = false` em vez disso. */
  | 'cancelada'
  /** @deprecated Use os campos `valorReembolso` + `dataReembolso`. */
  | 'reembolso';

/**
 * Tipo de viagem persistido no mock. Note que o drawer aceita um tipo virtual
 * `'ida_e_volta'` (T2.X) que NÃO persiste — o provider expande em duas
 * ViagemMock independentes (ida + volta), permitindo edições/remarcações
 * separadas no fluxo real.
 */
/**
 * Tipos de passagem persistidos. `'transfer'` foi descontinuado em 2026 —
 * agora é categoria de Adicional. Mantemos o literal só para tipagem de
 * dados antigos vindos do banco; novos registros usam apenas ida/volta.
 * @see CategoriaAdicional['transfer']
 */
export type TipoViagem = 'ida' | 'volta' | 'transfer';

export interface ViagemMock {
  id: string;
  origem: string;
  destino: string;
  /** Cidade e UF separados — usados pelo form de cadastro e pelo cálculo de
   *  distância/ajuda de custo. `origem`/`destino` derivados são mantidos para
   *  compatibilidade com listagens existentes. */
  origemCidade?: string;
  origemUf?: string;
  destinoCidade?: string;
  destinoUf?: string;
  /** IATA do aeroporto de origem — só preenchido quando `modal === 'aereo'`. */
  origemAeroporto?: string;
  /** IATA do aeroporto de destino — só preenchido quando `modal === 'aereo'`. */
  destinoAeroporto?: string;
  data: string;
  modal: ModalViagem;
  tipo: TipoViagem;
  status: StatusViagem;
  valor: number;
  /** Data de criação/emissão da passagem (ISO). Usada no KPI "Total emitido no mês". */
  dataCriacao?: string;
  bilheteUrl?: string;
  /** Nome da companhia de transporte (vinculada à `companhias_transporte`). */
  companhia?: string;
  /**
   * T2.AF — Indica para quem é a passagem. Quando 'acompanhante',
   * `beneficiarioId` aponta para o id do acompanhante na solicitação.
   */
  beneficiarioTipo: 'paciente' | 'acompanhante';
  beneficiarioId?: string;
  /** Distância em linha reta calculada via coordenadas IBGE. */
  distanciaValor?: number;
  distanciaUnidade?: 'km' | 'milhas' | 'milhas_nauticas';
  /** Valor calculado de ajuda de custo (SIGTAP) — paciente e acompanhante. */
  valorAjudaCustoPaciente?: number;
  valorAjudaCustoAcompanhante?: number;
  /** Reembolso parcial ou integral. Subtrai do valor cheio nos KPIs/relatórios. */
  valorReembolso?: number;
  dataReembolso?: string;
  /** `false` = passagem inativada (substitui o antigo status 'cancelada').
   *  Inativas não entram nos KPIs nem relatórios. Default = true. */
  ativa?: boolean;
  dataCancelamento?: string;
  motivoCancelamentoTexto?: string;
}

/**
 * Status da ajuda de custo — apenas controle interno, sem ciclo de aprovação.
 *  - emitido:  ajuda registrada/lançada (estado inicial).
 *  - concluido: ajuda paga/finalizada (guarda `dataConclusao`).
 *  - glosada:  ajuda recusada/cortada, sem custo.
 */
export type StatusAjuda = 'emitido' | 'concluido' | 'glosada';

export interface AjudaCustoMock {
  id: string;
  /**
   * T2.AQ — Beneficiário da ajuda de custo. Quando `'acompanhante'`,
   * `beneficiarioId` aponta para o id do acompanhante na solicitação.
   * Apenas 1 beneficiário por período (se a ajuda for para mais de um, criam-se
   * múltiplos períodos).
   */
  beneficiarioTipo: 'paciente' | 'acompanhante';
  beneficiarioId?: string;
  dataInicio: string;
  dataFim: string;
  status: StatusAjuda;
  /** Data em que a ajuda foi concluída (ISO). Preenchida ao mudar status para
   *  'concluido'. Usada no KPI "Total em diárias mês". */
  dataConclusao?: string;
  observacao?: string;
  /**
   * T2.Y — Pernoite no retorno (paciente chegou ao destino após meia-noite no
   * dia final). Quando true, soma uma diária extra de R$24,75 (regra Ata 7).
   */
  pernoiteRetorno?: boolean;
  /** Reembolso parcial ou integral. Subtrai do valor calculado nos KPIs/relatórios. */
  valorReembolso?: number;
  dataReembolso?: string;
  /** `false` = ajuda inativada (cancelada). Não entra nos KPIs nem relatórios. */
  ativa?: boolean;
  dataCancelamento?: string;
  motivoCancelamentoTexto?: string;
  /** PBI 13218 — no SEI, cada ajuda de custo abre um processo próprio
   *  (distinto do processo da solicitação). Obrigatório no cadastro. */
  numeroSEI?: string;
  /** PBI 13218 — URL completa para o processo próprio da ajuda no SEI. */
  linkProcesso?: string;
}

export type CategoriaAdicional =
  | 'passagem_extra'
  | 'ajuda_extra'
  | 'bagagem'
  | 'transfer'
  | 'outro';

export type StatusAdicional = 'pendente_aprovacao' | 'aprovado' | 'indeferido' | 'pago';

export interface AdicionalMock {
  id: string;
  categoria: CategoriaAdicional;
  descricao: string;
  data: string;
  valor: number;
  status: StatusAdicional;
  documentoUrl?: string;
  prorrogacaoDias?: number; // for ajuda_extra (prorrogação)
  /** Código do tipo de despesa vindo da tabela auxiliar `tipo_despesa`. */
  tipoDespesa?: string;
  /** Beneficiário do adicional (alinhado com viagens/ajudas). Default 'paciente'. */
  beneficiarioTipo?: 'paciente' | 'acompanhante';
  /** Quando ACOMPANHANTE, aponta para o id do acompanhante. */
  beneficiarioId?: string;
  /** Vínculo opcional com uma passagem da solicitação. Quando presente,
   *  o valor do adicional é agregado à passagem nos relatórios. */
  viagemId?: string;
}

/**
 * Despesa de funerária — só faz sentido em solicitações encerradas por óbito.
 * Cada item (transporte, urna, translado, etc.) conta como gasto da solicitação.
 */
export interface DespesaFunerariaMock {
  id: string;
  descricao: string;
  valor: number;
  /** Data do gasto (ISO yyyy-mm-dd). */
  data: string;
  /** Nome do comprovante anexado (opcional). */
  anexoNome?: string;
}

/** Tipo da solicitação. NORMAL cobre o fluxo completo (viagens + adicionais + ajuda).
 *  AJUDA_CUSTO é para quando o paciente já está no destino do procedimento e
 *  só recebe diárias — sem viagens nem adicionais. */
export type TipoSolicitacao = 'normal' | 'ajuda_custo';

/** @deprecated Mantido pra compat com dados antigos. Use o código (string)
 *  vindo da tabela auxiliar `motivo_encerramento`. */
export type MotivoEncerramento = string;

export interface EncerramentoMock {
  data: string;
  /** Código vindo da tabela auxiliar `motivo_encerramento` (ex: 'ALTA_MEDICA'). */
  motivo: string;
  observacao?: string;
}

export interface AnexoMock {
  id: string;
  nome: string;
  /** MIME type do arquivo (ex.: application/pdf). */
  tipo: string;
  tamanhoKB?: number;
  /** Categoria do documento (vem da tabela auxiliar `tipo_documento`). */
  tipoDocumento?: string;
  /**
   * De qual ponto do fluxo o anexo veio (abertura, parecer, passagem,
   * agendamento, etc.). Quando ausente, assumimos 'abertura' por
   * compatibilidade com seeds antigos. Renderiza o badge "Origem" na aba
   * Anexos.
   */
  origem?:
    | 'abertura'
    | 'edicao'
    | 'adicional'
    | 'passagem'
    | 'parecer'
    | 'despacho'
    | 'agendamento'
    | 'tentativa'
    | 'ajuda_custo'
    | 'carimbo';
  /** ISO datetime — quando o anexo foi adicionado (para ordenação por data). */
  data?: string;
}

export interface ObservacaoChat {
  id: string;
  autor: string;        // nome do usuário que escreveu
  perfilAutor: string;  // ex.: "Coordenação Estadual", "Regulação", "Financeiro"
  texto: string;
  data: string;         // ISO datetime
}

/** Tramitação Financeiro → Regulação. Permite "devolver" com motivo. */
export interface DevolucaoFinanceiroParaRegulacao {
  id: string;
  motivo: string;
  data: string;          // ISO datetime
  autor: string;
  perfilAutor: string;
  /** Quando a regulação reencaminha pro financeiro, marcamos como resolvida. */
  resolvida?: boolean;
}

/**
 * Última movimentação Regulação ↔ Financeiro. Usado pra pintar a linha da
 * tabela do setor de destino quando a tramitação foi recente (< 24h) e abrir
 * popover com a observação completa em hover.
 */
export interface UltimaTramitacao {
  /** Direção do movimento — `destino` diz para qual setor. */
  tipo: 'envio' | 'devolucao';
  destino: 'dados_basicos' | 'regulacao' | 'passagens' | 'ajuda_custo' | 'acompanhamento';
  data: string;          // ISO datetime
  autor: string;
  perfilAutor: string;
  observacao?: string;
}

export interface SolicitacaoMock {
  id: string;
  numero: string;
  status: StatusGlobalV2;
  /** Tipo do fluxo: 'normal' (com viagens) ou 'ajuda_custo' (só diárias). Default 'normal'. */
  tipoSolicitacao?: TipoSolicitacao;
  dataCriacao: string; // ISO datetime
  dataLaudo?: string;
  paciente: PacienteMock;
  acompanhantes: AcompanhanteMock[];
  anexos: AnexoMock[];
  pareceres: ParecerMock[];
  carimboRegulacao?: CarimboRegulacao;
  carimboObservacao?: string;
  /** Legado — preenchido em registros antigos quando o carimbo era 'OUTROS'. */
  carimboOutrosInfo?: CarimboOutrosInfo;
  agendamento?: AgendamentoMock;
  viagens: ViagemMock[];
  ajudasCusto: AjudaCustoMock[];
  adicionais: AdicionalMock[];
  /** Despesas de funerária — preenchido quando encerrada por óbito. */
  despesasFunerarias: DespesaFunerariaMock[];
  encerramento?: EncerramentoMock;
  observacoes: ObservacaoChat[];
  /** Histórico de devoluções Financeiro → Regulação (com motivo). */
  devolucoes?: DevolucaoFinanceiroParaRegulacao[];
  /** Última tramitação entre Regulação e Financeiro (alimenta destaque de linha + popover). */
  ultimaTramitacao?: UltimaTramitacao;
  /** T2.AG — Número do processo SEI (formato XXXXX.XXXXXX/AAAA-DD). */
  numeroSEI?: string;
  /** T2.AG — URL completa para o processo no SEI. */
  seiUrl?: string;
  /** PBI 13131 — marcada pelo time de Passagens ao terminar de lançar todas
   *  as passagens da solicitação. Sinaliza para o time de Ajuda de Custo que
   *  o fluxo pode seguir. */
  passagensConcluidas?: boolean;
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

export const cloneSolicitacao = (s: SolicitacaoMock): SolicitacaoMock =>
  structuredClone(s);

/**
 * Calcula o valor de uma ajuda de custo (Ata 7).
 * - Base sem pernoite: `(dias − 1) × 24,75 + 8,40`
 * - Com pernoite no retorno (chegou após meia-noite no dia final): base + 24,75
 */
export function calcularValorAjuda(
  dataInicio: string,
  dataFim: string,
  pernoiteRetorno?: boolean,
): {
  dias: number;
  valor: number;
  base: number;
  pernoiteRetornoExtra: 0 | 24.75;
} {
  const ini = new Date(dataInicio);
  const fim = new Date(dataFim);
  const ms = fim.getTime() - ini.getTime();
  const dias = Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
  const base = (dias - 1) * VALOR_DIARIA_PERNOITE + VALOR_DIARIA_RETORNO;
  const pernoiteRetornoExtra: 0 | 24.75 = pernoiteRetorno ? VALOR_DIARIA_PERNOITE : 0;
  const valor = base + pernoiteRetornoExtra;
  return {
    dias,
    valor: Math.round(valor * 100) / 100,
    base: Math.round(base * 100) / 100,
    pernoiteRetornoExtra,
  };
}

/* ── Pacientes mock pool (selecionáveis) ──────────────────────────────── */

export const pacientesPool: PacienteMock[] = [
  {
    id: 'p1',
    nome: 'Maria Aparecida Silva',
    cpf: '123.456.789-00',
    cns: '700 0000 0000 0001',
    dataNascimento: '1968-04-12',
    sexo: 'F',
    nomeMae: 'Joana Aparecida Silva',
    telefone: '(98) 98765-4321',
    email: 'maria.silva@email.com',
    municipio: 'São Luís - MA',
    regional: 'Regional de São Luís',
    zonaRegional: 'Norte',
    endereco: {
      logradouro: 'Rua dos Pássaros',
      numero: '120',
      bairro: 'Cohama',
      cep: '65060-150',
    },
  },
  {
    id: 'p2',
    nome: 'José Ribeiro Santos',
    cpf: '234.567.890-11',
    cns: '702 1034 5678 0012',
    dataNascimento: '1955-08-30',
    sexo: 'M',
    nomeMae: 'Antônia Ribeiro Santos',
    telefone: '(99) 98123-7766',
    email: 'jose.ribeiro@gmail.com',
    municipio: 'Imperatriz - MA',
    regional: 'Regional de Imperatriz',
    zonaRegional: 'Oeste',
    endereco: {
      logradouro: 'Avenida Getúlio Vargas',
      numero: '845',
      bairro: 'Centro',
      cep: '65900-450',
    },
  },
  {
    id: 'p3',
    nome: 'Lucas Pereira Lima',
    cpf: '345.678.901-22',
    cns: '708 2233 4455 0023',
    dataNascimento: '2014-02-05',
    sexo: 'M',
    nomeMae: 'Patrícia Lima Pereira',
    telefone: '(98) 99221-4408',
    municipio: 'Caxias - MA',
    regional: 'Regional de Caxias',
    zonaRegional: 'Leste',
    endereco: {
      logradouro: 'Rua João Pessoa',
      numero: '57',
      bairro: 'Trezidela',
      cep: '65604-070',
    },
  },
  {
    id: 'p4',
    nome: 'Ana Beatriz Costa',
    cpf: '456.789.012-33',
    cns: '703 4455 6677 0034',
    dataNascimento: '1982-11-19',
    sexo: 'F',
    nomeMae: 'Eliete Costa Ferreira',
    telefone: '(99) 99654-2018',
    email: 'ana.costa82@hotmail.com',
    municipio: 'Bacabal - MA',
    regional: 'Regional de Bacabal',
    zonaRegional: 'Centro',
    endereco: {
      logradouro: 'Travessa Castelo Branco',
      numero: '212',
      bairro: 'Areal',
      cep: '65700-130',
    },
  },
  {
    id: 'p5',
    nome: 'Roberto Gomes Almeida',
    cpf: '567.890.123-44',
    dataNascimento: '1949-01-22',
    sexo: 'M',
    nomeMae: 'Maria Gomes Almeida',
    telefone: '(99) 98477-1190',
    municipio: 'Codó - MA',
    regional: 'Regional de Codó',
    zonaRegional: 'Leste',
    endereco: {
      logradouro: 'Rua Coelho Neto',
      numero: '309',
      bairro: 'São Benedito',
      cep: '65400-085',
    },
  },
  {
    id: 'p6',
    nome: 'Helena Souza Martins',
    cpf: '678.901.234-55',
    cns: '704 7788 9900 0045',
    dataNascimento: '1971-09-03',
    sexo: 'F',
    nomeMae: 'Cleuza Souza Martins',
    telefone: '(99) 99012-3344',
    email: 'helena.martins@email.com',
    municipio: 'Timon - MA',
    regional: 'Regional de Timon',
    zonaRegional: 'Norte',
    endereco: {
      logradouro: 'Avenida Piauí',
      numero: '1442',
      bairro: 'Parque Piauí',
      cep: '65631-200',
    },
  },
  {
    id: 'p7',
    nome: 'Paulo Henrique Rocha',
    cpf: '789.012.345-66',
    cns: '705 9911 2233 0056',
    dataNascimento: '1990-06-14',
    sexo: 'M',
    telefone: '(99) 98890-6677',
    email: 'paulo.rocha@gmail.com',
    municipio: 'Açailândia - MA',
    regional: 'Regional de Açailândia',
    zonaRegional: 'Oeste',
    endereco: {
      logradouro: 'Rua das Mangueiras',
      numero: '78',
      bairro: 'Vila Ildemar',
      cep: '65930-310',
    },
  },
];

export const acompanhantesPool: AcompanhanteMock[] = [
  { id: 'a1', nome: 'Carlos Eduardo Silva', cpf: '111.222.333-44', dataNascimento: '1965-03-10', vinculo: 'Cônjuge' },
  { id: 'a2', nome: 'Marta Santos Ribeiro', cpf: '222.333.444-55', dataNascimento: '1958-07-22', vinculo: 'Cônjuge' },
  { id: 'a3', nome: 'Patrícia Lima Pereira',cpf: '333.444.555-66', dataNascimento: '1985-12-01', vinculo: 'Mãe' },
  { id: 'a4', nome: 'Fernando Costa',       cpf: '444.555.666-77', dataNascimento: '1980-05-18', vinculo: 'Irmão' },
  { id: 'a5', nome: 'Júlia Almeida',        cpf: '555.666.777-88', dataNascimento: '1978-09-25', vinculo: 'Filha' },
];

/* ── Builders helpers ─────────────────────────────────────────────────── */

const today = '2025-06-15';
const isoAt = (date: string, h = 9, m = 0) => `${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
/** Gera ISO datetime relativo ao "agora" do navegador — útil pra simular tramitações recentes
 *  que precisam aparecer destacadas (< 24h) na demo independente da data atual. */
const hoursAgoIso = (h: number) => new Date(Date.now() - h * 60 * 60 * 1000).toISOString();

/* ── Seed: 7 casos ─────────────────────────────────────────────────────── */

export const seedFluxoV2: SolicitacaoMock[] = [
  /* ── 1. Simples — adulto, deferido, viagem ida+volta, ajuda 5 dias, alta médica ── */
  {
    id: 's1',
    numero: '2025/000123',
    status: 'em_encerramento',
    dataCriacao: isoAt('2025-05-02'),
    dataLaudo: '2025-05-01',
    paciente: pacientesPool[0],
    acompanhantes: [acompanhantesPool[0]],
    anexos: [{ id: 'an1', nome: 'laudo.pdf', tipo: 'application/pdf' }],
    pareceres: [
      { id: 'pa1', data: isoAt('2025-05-05', 10, 30), decisao: 'deferido', tipo: 'tfd_completo', cidPrincipal: 'C50.9', observacao: 'Paciente apta', medico: 'Dr. Ricardo Mello' },
    ],
    carimboRegulacao: 'APROVADO_DIRETO',
    agendamento: {
      id: 'ag1',
      origem: 'criacao',
      tentativas: [
        {
          id: 't1-conf',
          unidade: 'Hospital A.C. Camargo - SP',
          data: '2025-05-20',
          desfecho: 'agendamento_confirmado',
          hora: '08:00',
          tipoProcedimento: 'cirurgia',
          contatoUnidade: '(11) 2189-5000',
          observacoesChegada: 'Comparecer 1h antes em jejum de 8h. Trazer exames pré-operatórios e ficha do convênio SUS-TFD.',
        },
      ],
    },
    viagens: [
      { id: 'v1', origem: 'São Luís - MA', destino: 'São Paulo - SP', data: '2025-05-19', modal: 'aereo', tipo: 'ida',   status: 'confirmada', valor: 1280, beneficiarioTipo: 'paciente' },
      { id: 'v2', origem: 'São Paulo - SP', destino: 'São Luís - MA', data: '2025-05-25', modal: 'aereo', tipo: 'volta', status: 'confirmada', valor: 1320, beneficiarioTipo: 'paciente' },
    ],
    ajudasCusto: [
      { id: 'ac1', beneficiarioTipo: 'paciente', dataInicio: '2025-05-19', dataFim: '2025-05-23', status: 'concluido', dataConclusao: '2025-05-23' },
    ],
    adicionais: [],
    despesasFunerarias: [],
    encerramento: { data: '2025-05-26', motivo: 'alta_medica', observacao: 'Paciente recebeu alta após procedimento.' },
    numeroSEI: '00100.000456/2025-12',
    seiUrl: 'https://sei.ses.ma.gov.br/processo/00100.000456-2025-12',
    observacoes: [
      { id: 'obs1a', autor: 'Maria Silva',     perfilAutor: 'Coordenação Estadual', texto: 'Conversei com a paciente por WhatsApp. Ela prefere voo direto pela manhã, alega ansiedade em voos longos. Pedi para o financeiro priorizar opção sem conexão.', data: '2025-05-04T09:15:00' },
      { id: 'obs1b', autor: 'João Pereira',    perfilAutor: 'Financeiro',           texto: 'Conseguimos GRU-CGH direto às 06:40, sem conexão. Bilhete emitido.', data: '2025-05-12T16:42:00' },
      { id: 'obs1c', autor: 'Maria Silva',     perfilAutor: 'Coordenação Estadual', texto: 'Paciente confirmou alta hoje. Vai retornar amanhã pela manhã. Encerramento previsto para terça.', data: '2025-05-25T18:05:00' },
    ],
  },

  /* ── 2. Múltiplos pareceres — paciente com 3 pareceres (2 ind. exigência → deferido) ── */
  {
    id: 's2',
    numero: '2025/000124',
    status: 'em_acompanhamento',
    dataCriacao: isoAt('2025-05-08'),
    dataLaudo: '2025-05-07',
    paciente: pacientesPool[2], // menor
    acompanhantes: [acompanhantesPool[2]], // mãe (adulta)
    anexos: [{ id: 'an2', nome: 'laudo-pediatrico.pdf', tipo: 'application/pdf' }],
    pareceres: [
      { id: 'pa2a', data: isoAt('2025-05-10', 9),  decisao: 'indeferido',  observacao: 'Faltam exames laboratoriais — necessário complementar antes de nova análise.', medico: 'Dra. Beatriz Andrade' },
      { id: 'pa2b', data: isoAt('2025-05-14', 11), decisao: 'indeferido',  observacao: 'Necessário relatório do oncologista — pendência de documentação.', medico: 'Dra. Beatriz Andrade' },
      { id: 'pa2c', data: isoAt('2025-05-18', 14), decisao: 'deferido', cidPrincipal: 'C71.9', observacao: 'Documentação completa.', medico: 'Dra. Beatriz Andrade' },
    ],
    carimboRegulacao: 'APROVADO_DIRETO',
    agendamento: {
      id: 'ag2',
      origem: 'criacao',
      tentativas: [
        {
          id: 't2-conf',
          unidade: 'Hospital Pequeno Príncipe - PR',
          data: '2025-06-02',
          desfecho: 'agendamento_confirmado',
          hora: '07:30',
        },
      ],
    },
    viagens: [
      { id: 'v3', origem: 'Caxias - MA', destino: 'Curitiba - PR', data: '2025-06-01', modal: 'aereo', tipo: 'ida', status: 'confirmada', valor: 1450, beneficiarioTipo: 'paciente' },
    ],
    ajudasCusto: [
      { id: 'ac2', beneficiarioTipo: 'paciente', dataInicio: '2025-06-01', dataFim: '2025-06-10', status: 'emitido' },
    ],
    adicionais: [],
    despesasFunerarias: [],
    observacoes: [],
  },

  /* ── 3. Agendamento de exceção (CNRAC) — sem agendamento, 3 unidades consultadas ── */
  {
    id: 's3',
    numero: '2025/000125',
    status: 'em_passagens',
    dataCriacao: isoAt('2025-05-20'),
    dataLaudo: '2025-05-18',
    paciente: pacientesPool[1],
    acompanhantes: [acompanhantesPool[1]],
    anexos: [{ id: 'an3', nome: 'laudo-cardio.pdf', tipo: 'application/pdf' }],
    pareceres: [
      { id: 'pa3', data: isoAt('2025-05-22', 10), decisao: 'deferido', tipo: 'sem_agendamento', cidPrincipal: 'I25.1', observacao: 'Caso urgente', medico: 'Dr. Augusto Vasconcelos' },
    ],
    carimboRegulacao: 'CNRAC',
    carimboObservacao: 'Encaminhamento via CNRAC por se tratar de procedimento cardiovascular de alta complexidade não disponível no estado.',
    agendamento: {
      id: 'ag3',
      origem: 'excecao_cnrac',
      tentativas: [
        { id: 't1', unidade: 'HC-SP', data: isoAt('2025-06-03', 9),  desfecho: 'negou',         observacao: 'Sem vagas até agosto.' },
        { id: 't2', unidade: 'Hospital Walter Cantídio - CE', data: isoAt('2025-06-05', 14), desfecho: 'pediu_documento', observacao: 'Solicitou laudo complementar.' },
        {
          id: 't3',
          unidade: 'HC-RP - Ribeirão Preto',
          data: '2025-06-25',
          desfecho: 'agendamento_confirmado',
          observacao: 'Confirmado.',
          hora: '09:00',
          tipoProcedimento: 'cirurgia',
          contatoUnidade: '(16) 3602-2000',
          observacoesChegada: 'Comparecer 2h antes para checkin pré-cirúrgico. Jejum absoluto desde a meia-noite.',
        },
      ],
      segundoDeferimento: { data: isoAt('2025-06-09', 15), medico: 'Dr. Augusto Vasconcelos' },
    },
    viagens: [],
    ajudasCusto: [],
    adicionais: [],
    despesasFunerarias: [],
    numeroSEI: '00100.001789/2025-04',
    seiUrl: 'https://sei.ses.ma.gov.br/processo/00100.001789-2025-04',
    observacoes: [
      { id: 'obs3a', autor: 'Ana Carolina Mendes', perfilAutor: 'Regulação',           texto: 'HC-SP retornou negativa por agenda cheia até agosto. Vou abrir tentativa em Walter Cantídio (CE) e HC-RP em paralelo.', data: '2025-06-03T11:20:00' },
      { id: 'obs3b', autor: 'Maria Silva',         perfilAutor: 'Coordenação Estadual', texto: 'Paciente está internado, família muito ansiosa. Ligaram pedindo previsão. Expliquei que estamos em tentativa CNRAC e que a 2ª deferência sai assim que a unidade aceitar.', data: '2025-06-06T08:45:00' },
      { id: 'obs3c', autor: 'Ana Carolina Mendes', perfilAutor: 'Regulação',           texto: 'HC-RP confirmou! Vaga para 25/06. Já registrei a aceitação e encaminhei para 2º deferimento médico.', data: '2025-06-08T11:30:00' },
    ],
    ultimaTramitacao: {
      tipo: 'envio',
      destino: 'passagens',
      data: hoursAgoIso(4),
      autor: 'Ana Carolina Mendes',
      perfilAutor: 'Regulação',
      observacao: 'Paciente urgente, internado. Família muito ansiosa — agilizar emissão de passagem aérea, preferência por voo até 6h da manhã pra chegar a tempo do procedimento.',
    },
  },

  /* ── 4. 20 ajudas de custo — prorrogação longa ── */
  (() => {
    const ajudas: AjudaCustoMock[] = [];
    let cursor = new Date('2025-01-10');
    for (let i = 0; i < 20; i++) {
      const ini = new Date(cursor);
      const fim = new Date(cursor);
      fim.setDate(fim.getDate() + 29);
      ajudas.push({
        id: `ac4-${i}`,
        beneficiarioTipo: 'paciente',
        dataInicio: ini.toISOString().slice(0, 10),
        dataFim: fim.toISOString().slice(0, 10),
        status: i < 18 ? 'concluido' : 'emitido',
        dataConclusao: i < 18 ? fim.toISOString().slice(0, 10) : undefined,
      });
      cursor = new Date(fim);
      cursor.setDate(cursor.getDate() + 1);
    }
    return {
      id: 's4',
      numero: '2025/000126',
      status: 'em_ajuda_custo' as StatusGlobalV2,
      dataCriacao: isoAt('2025-01-05'),
      dataLaudo: '2025-01-04',
      paciente: pacientesPool[4],
      acompanhantes: [acompanhantesPool[3]],
      anexos: [],
      pareceres: [
        { id: 'pa4', data: isoAt('2025-01-08', 10), decisao: 'deferido' as DecisaoParecer, cidPrincipal: 'N18.6', medico: 'Dr. Augusto Vasconcelos' },
      ],
      carimboRegulacao: 'APROVADO_DIRETO' as CarimboRegulacao,
      agendamento: {
        id: 'ag4',
        origem: 'criacao' as const,
        tentativas: [
          {
            id: 't4-conf',
            unidade: 'Hospital do Rim - SP',
            data: '2025-01-12',
            desfecho: 'agendamento_confirmado' as const,
            hora: '07:00',
          },
        ],
      },
      viagens: [
        { id: 'v4a', origem: 'Codó - MA', destino: 'São Paulo - SP', data: '2025-01-11', modal: 'aereo' as ModalViagem, tipo: 'ida' as const, status: 'confirmada' as StatusViagem, valor: 1380, beneficiarioTipo: 'paciente' as const },
      ],
      ajudasCusto: ajudas,
      adicionais: [],
    despesasFunerarias: [],
      observacoes: [],
    };
  })(),

  /* ── 5. 4 passagens + 2 transfers ── */
  {
    id: 's5',
    numero: '2025/000127',
    status: 'em_acompanhamento',
    dataCriacao: isoAt('2025-04-15'),
    dataLaudo: '2025-04-14',
    paciente: pacientesPool[3],
    acompanhantes: [acompanhantesPool[4]],
    anexos: [],
    pareceres: [
      { id: 'pa5', data: isoAt('2025-04-18', 10), decisao: 'deferido', cidPrincipal: 'C34.9', medico: 'Dr. Ricardo Mello' },
    ],
    carimboRegulacao: 'APROVADO_DIRETO',
    agendamento: {
      id: 'ag5',
      origem: 'criacao',
      tentativas: [
        {
          id: 't5-conf',
          unidade: 'INCA - Rio de Janeiro',
          data: '2025-05-05',
          desfecho: 'agendamento_confirmado',
          hora: '08:00',
          tipoProcedimento: 'tratamento_continuo',
          contatoUnidade: '(21) 3207-1000',
          observacoesChegada: 'Apresentar-se na recepção 30min antes. Sessões de quimioterapia podem durar até 4h.',
        },
      ],
    },
    viagens: [
      { id: 'v5a', origem: 'Bacabal - MA',   destino: 'Rio de Janeiro - RJ', data: '2025-05-04', modal: 'aereo',     tipo: 'ida',      status: 'confirmada',     valor: 1480, beneficiarioTipo: 'paciente' },
      { id: 'v5b', origem: 'Rio de Janeiro - RJ', destino: 'Bacabal - MA',  data: '2025-05-12', modal: 'aereo',     tipo: 'volta',    status: 'confirmada',     valor: 1520, beneficiarioTipo: 'paciente' },
      { id: 'v5c', origem: 'Bacabal - MA',   destino: 'Rio de Janeiro - RJ', data: '2025-05-22', modal: 'aereo',     tipo: 'ida',      status: 'remarcada',      valor: 1480, beneficiarioTipo: 'acompanhante', beneficiarioId: 'a5' },
      { id: 'v5d', origem: 'Rio de Janeiro - RJ', destino: 'Bacabal - MA',  data: '2025-05-30', modal: 'aereo',     tipo: 'volta',    status: 'agendada',       valor: 1520, beneficiarioTipo: 'acompanhante', beneficiarioId: 'a5' },
    ],
    ajudasCusto: [
      { id: 'ac5', beneficiarioTipo: 'acompanhante', beneficiarioId: 'a5', dataInicio: '2025-05-04', dataFim: '2025-05-12', status: 'emitido' },
    ],
    adicionais: [
      { id: 'ad5a', categoria: 'transfer', descricao: 'Transfer Aeroporto GIG → INCA', data: '2025-05-04', valor: 180, status: 'pago',     beneficiarioTipo: 'paciente' },
      { id: 'ad5b', categoria: 'transfer', descricao: 'Transfer INCA → Aeroporto GIG', data: '2025-05-12', valor: 180, status: 'pago',     beneficiarioTipo: 'paciente' },
    ],
    despesasFunerarias: [],
    numeroSEI: '00100.002345/2025-09',
    seiUrl: 'https://sei.ses.ma.gov.br/processo/00100.002345-2025-09',
    observacoes: [
      { id: 'obs5a', autor: 'João Pereira', perfilAutor: 'Financeiro',           texto: 'Voo de 22/05 remarcado a pedido do INCA — paciente fez exame extra e a equipe pediu pra esticar 3 dias. Ajuste já feito na passagem.', data: '2025-05-21T15:10:00' },
      { id: 'obs5b', autor: 'Maria Silva',  perfilAutor: 'Coordenação Estadual', texto: 'Acompanhante (filha) ligou avisando que o transfer GIG→INCA chegou no horário. Tudo correndo bem.', data: '2025-05-04T10:30:00' },
    ],
  },

  /* ── 6. Encerrada por óbito ── */
  {
    id: 's6',
    numero: '2025/000128',
    status: 'em_encerramento',
    dataCriacao: isoAt('2025-03-10'),
    dataLaudo: '2025-03-08',
    paciente: pacientesPool[5],
    acompanhantes: [],
    anexos: [],
    pareceres: [
      { id: 'pa6', data: isoAt('2025-03-12', 10), decisao: 'deferido', cidPrincipal: 'C25.9', medico: 'Dr. Augusto Vasconcelos' },
    ],
    carimboRegulacao: 'APROVADO_DIRETO',
    agendamento: {
      id: 'ag6',
      origem: 'criacao',
      tentativas: [
        {
          id: 't6-conf',
          unidade: 'Hospital Sírio-Libanês - SP',
          data: '2025-03-22',
          desfecho: 'agendamento_confirmado',
          hora: '08:00',
        },
      ],
    },
    viagens: [
      { id: 'v6a', origem: 'Timon - MA', destino: 'São Paulo - SP', data: '2025-03-21', modal: 'aereo', tipo: 'ida', status: 'confirmada', valor: 1290, beneficiarioTipo: 'paciente' },
    ],
    ajudasCusto: [
      { id: 'ac6', beneficiarioTipo: 'paciente', dataInicio: '2025-03-21', dataFim: '2025-04-02', status: 'concluido', dataConclusao: '2025-04-02' },
    ],
    adicionais: [],
    despesasFunerarias: [],
    encerramento: { data: '2025-04-03', motivo: 'obito', observacao: 'Paciente faleceu durante o tratamento.' },
    observacoes: [],
  },

  /* ── 7. Com adicional pendente ── */
  {
    id: 's7',
    numero: '2025/000129',
    status: 'em_ajuda_custo',
    dataCriacao: isoAt('2025-05-22'),
    dataLaudo: '2025-05-21',
    paciente: pacientesPool[6],
    acompanhantes: [],
    anexos: [],
    pareceres: [
      { id: 'pa7', data: isoAt('2025-05-23', 10), decisao: 'deferido', cidPrincipal: 'M16.5', medico: 'Dr. Ricardo Mello' },
    ],
    carimboRegulacao: 'APROVADO_DIRETO',
    agendamento: {
      id: 'ag7',
      origem: 'criacao',
      tentativas: [
        {
          id: 't7-conf',
          unidade: 'Hospital Albert Einstein - SP',
          data: '2025-06-10',
          desfecho: 'agendamento_confirmado',
          hora: '08:00',
        },
      ],
    },
    viagens: [
      { id: 'v7a', origem: 'Açailândia - MA', destino: 'São Paulo - SP', data: '2025-06-09', modal: 'aereo', tipo: 'ida', status: 'confirmada', valor: 1340, beneficiarioTipo: 'paciente' },
    ],
    ajudasCusto: [
      { id: 'ac7', beneficiarioTipo: 'paciente', dataInicio: '2025-06-09', dataFim: '2025-06-15', status: 'emitido' },
    ],
    adicionais: [
      { id: 'ad7a', categoria: 'bagagem',         descricao: 'Bagagem extra (cadeira de rodas)',    data: '2025-06-09', valor: 90,  status: 'aprovado' },
      { id: 'ad7b', categoria: 'passagem_extra',  descricao: 'Passagem volta extra para acompanhante', data: '2025-06-16', valor: 1480, status: 'pendente_aprovacao' },
    ],
    despesasFunerarias: [],
    observacoes: [
      { id: 'obs7a', autor: 'João Pereira', perfilAutor: 'Financeiro', texto: 'Adicional de bagagem (cadeira de rodas) aprovado direto — comprovante já anexado.', data: '2025-06-08T14:00:00' },
    ],
  },
  /* ── Caso 8 — Aguardando agendamento de exceção (CNRAC, sem agendamento ainda) ── */
  {
    id: 's8',
    numero: 'TFD-2025-0008',
    status: 'em_regulacao',
    dataCriacao: isoAt('2025-06-20'),
    dataLaudo: '2025-06-18',
    paciente: pacientesPool[1],
    acompanhantes: [acompanhantesPool[1]],
    anexos: [{ id: 'an8a', nome: 'laudo.pdf', tipo: 'LAUDO_MEDICO', tamanhoKB: 380 }],
    numeroSEI: '00100.003120/2025-77',
    seiUrl: 'https://sei.ses.ma.gov.br/processo/00100.003120-2025-77',
    pareceres: [
      { id: 'pa8', data: isoAt('2025-06-21', 10), decisao: 'deferido', cidPrincipal: 'C50.9', medico: 'Dr. Marcos Lima', observacao: 'Encaminhar via CNRAC para hospital habilitado em oncologia.' },
    ],
    carimboRegulacao: 'CNRAC',
    carimboObservacao: 'Paciente oncológico — buscar vaga em hospital habilitado em oncologia clínica e cirúrgica.',
    agendamento: undefined,
    viagens: [],
    ajudasCusto: [],
    adicionais: [],
    despesasFunerarias: [],
    observacoes: [],
  },

  /* ── Caso 9 — Devolvida do Financeiro pra Regulação (banner amber) ─────── */
  {
    id: 's9',
    numero: 'TFD-2025-0009',
    status: 'em_regulacao',
    dataCriacao: isoAt('2025-06-10'),
    dataLaudo: '2025-06-08',
    paciente: pacientesPool[3],
    acompanhantes: [acompanhantesPool[4]],
    anexos: [{ id: 'an9a', nome: 'laudo.pdf', tipo: 'application/pdf', tamanhoKB: 320 }],
    numeroSEI: '00100.003488/2025-21',
    seiUrl: 'https://sei.ses.ma.gov.br/processo/00100.003488-2025-21',
    pareceres: [
      { id: 'pa9', data: isoAt('2025-06-11', 9, 30), decisao: 'deferido', cidPrincipal: 'C34.9', versaoCID: '11', observacao: 'Aprovado para tratamento oncológico.', medico: 'Dr. Ricardo Mello' },
    ],
    carimboRegulacao: 'APROVADO_DIRETO',
    agendamento: {
      id: 'ag9',
      origem: 'criacao',
      tentativas: [
        {
          id: 't9-conf',
          unidade: 'Hospital Sírio-Libanês - SP',
          data: '2025-07-02',
          desfecho: 'agendamento_confirmado',
          hora: '08:30',
        },
      ],
    },
    viagens: [],
    ajudasCusto: [],
    adicionais: [],
    despesasFunerarias: [],
    observacoes: [
      { id: 'obs9a', autor: 'João Pereira', perfilAutor: 'Financeiro', texto: 'Devolvi pra regulação — laudo está sem CID secundário e o convênio do hospital pediu pra reforçar a indicação cirúrgica antes de eu liberar a passagem.', data: '2025-06-14T15:20:00' },
    ],
    devolucoes: [
      {
        id: 'dev9a',
        motivo: 'Laudo sem CID secundário e indicação cirúrgica precisa ser reforçada — o hospital de destino exige isso pra liberar a vaga. Por favor, complementem o parecer e devolvam.',
        data: '2025-06-14T15:20:00',
        autor: 'João Pereira',
        perfilAutor: 'Financeiro',
        resolvida: false,
      },
    ],
    ultimaTramitacao: {
      tipo: 'devolucao',
      destino: 'regulacao',
      data: hoursAgoIso(6),
      autor: 'João Pereira',
      perfilAutor: 'Financeiro',
      observacao: 'Laudo sem CID secundário e indicação cirúrgica precisa ser reforçada — o hospital de destino exige isso pra liberar a vaga. Por favor, complementem o parecer e devolvam.',
    },
  },
];

/* ── Labels (para uso na UI) ───────────────────────────────────────────── */

export const STATUS_LABEL: Record<StatusGlobalV2, string> = {
  em_dados_basicos:   'Dados Básicos',
  em_regulacao:       'Regulação',
  em_passagens:       'Passagens',
  em_ajuda_custo:     'Ajuda de Custo',
  em_acompanhamento:  'Acompanhamento',
  em_encerramento:    'Encerramento',
};

export const STATUS_BADGE_COLOR: Record<StatusGlobalV2, { bg: string; fg: string }> = {
  em_dados_basicos:  { bg: '#F1F5F9', fg: '#475569' }, // cinza
  em_regulacao:      { bg: '#EDE9FE', fg: '#6D28D9' }, // roxo
  em_passagens:      { bg: '#FEF3C7', fg: '#92400E' }, // âmbar
  em_ajuda_custo:    { bg: '#FFEDD5', fg: '#C2410C' }, // laranja
  em_acompanhamento: { bg: '#DBEAFE', fg: '#1D4ED8' }, // azul
  em_encerramento:   { bg: '#DCFCE7', fg: '#166534' }, // verde escuro
};

/** @deprecated alias retrocompat — use STATUS_BADGE_COLOR */
export const STATUS_COLOR = STATUS_BADGE_COLOR;

export const MOTIVO_ENCERRAMENTO_LABEL: Record<MotivoEncerramento, string> = {
  alta_medica: 'Alta médica',
  transferencia: 'Transferência',
  obito: 'Óbito',
  abandono: 'Abandono',
  desistencia: 'Desistência',
};

export const CATEGORIA_ADICIONAL_LABEL: Record<CategoriaAdicional, string> = {
  passagem_extra: 'Passagem extra',
  ajuda_extra: 'Ajuda extra (prorrogação)',
  bagagem: 'Bagagem',
  transfer: 'Transfer',
  outro: 'Outro',
};

export const STATUS_VIAGEM_LABEL: Record<StatusViagem, string> = {
  agendada: 'Agendada',
  confirmada: 'Confirmada',
  remarcada: 'Remarcada',
  nao_compareceu: 'Não compareceu',
  cancelada: 'Cancelada',
  reembolso: 'Reembolso',
};

export const STATUS_AJUDA_LABEL: Record<StatusAjuda, string> = {
  emitido: 'Emitido',
  concluido: 'Concluído',
  glosada: 'Glosada',
};

export const STATUS_ADICIONAL_LABEL: Record<StatusAdicional, string> = {
  pendente_aprovacao: 'Pendente aprovação',
  aprovado: 'Aprovado',
  indeferido: 'Indeferido',
  pago: 'Pago',
};

export const TODAY_REFERENCE = today;
