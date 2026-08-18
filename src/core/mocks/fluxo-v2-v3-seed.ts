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
  | 'em_aprovacao'
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
  | 'aprovacao'
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
  /** Id da unidade de saúde de destino (FK para `unidades_destino`) — usado
   *  para resolver dados atualizados da unidade e para persistir o vínculo
   *  no banco. Pode ficar ausente em registros legados que só guardaram o
   *  nome em texto livre. */
  unidadeId?: string;
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
 * Os dados do agendamento (unidade/data/hora/tipo/contato/chegada) vivem nas
 * tentativas cujo desfecho é `'agendamento_confirmado'` — pode haver mais de
 * uma (um paciente costuma ter vários procedimentos agendados, cada um na
 * sua unidade de destino). Use o helper `agendamentosConfirmados(s)` em
 * `_utils/agendamento.ts` para acessá-las.
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
  /**
   * Discovery com o setor de Ajuda de Custo (09/08/2026, refinado em
   * 11/08/2026) — quatro classificações de cálculo, mas o operador nunca
   * escolhe: o sistema DEDUZ a partir da diária final e da ajuda de
   * referência informadas no drawer.
   * - padrao: lançamento novo, sem referência, diária final de R$8,40.
   * - integral: lançamento novo, sem referência, diária final de R$24,75.
   * - aditiva: com referência, o valor do novo período supera o da
   *   referência; o lançamento cobra só a diferença (dias a mais), que
   *   também vira saldo POSITIVO do paciente (ele ainda não recebeu esse
   *   valor — correção de regra 11/08/2026).
   * - subtrativa: com referência, o valor do novo período é menor que o da
   *   referência; o paciente recebeu a mais na referência, então a
   *   diferença vira saldo NEGATIVO dele, descontado do próximo pagamento,
   *   nunca devolução em dinheiro (correção de regra 11/08/2026).
   * Default 'padrao' — cobre os registros antigos, lançados antes do
   * discovery, que só conheciam a regra com diária de retorno.
   */
  tipoCalculo?: TipoCalculoAjuda;
  /**
   * Ajuda de custo de referência da MESMA solicitação, escolhida pelo
   * operador para o sistema deduzir se o lançamento é aditivo ou subtrativo
   * (ver `tipoCalculo`). Opcional — ausente quando o lançamento é novo, sem
   * relação com um período já pago. Só referencia períodos base
   * ('padrao'/'integral') — não há suporte a encadear um ajuste sobre outro.
   */
  ajudaReferenciaId?: string;
  /**
   * Refinamento do discovery (11/08/2026) — o ponto que separa 'padrao' de
   * 'integral' é só qual é a diária do ÚLTIMO dia do período: R$8,40
   * (retorno) ou R$24,75 (completa). Essa escolha ficou explícita e
   * editável em qualquer tipo, em vez de fixa por tipo. Quando ausente,
   * usa o default do tipo (ver `DEFAULT_VALOR_DIARIA_FINAL`).
   */
  valorDiariaFinal?: number;
}

/** T2.AQ — os quatro tipos de cálculo de ajuda de custo (ver `AjudaCustoMock.tipoCalculo`). */
export type TipoCalculoAjuda = 'padrao' | 'integral' | 'aditiva' | 'subtrativa';

export const TIPO_CALCULO_AJUDA_LABEL: Record<TipoCalculoAjuda, string> = {
  padrao: 'Padrão',
  integral: 'Integral',
  aditiva: 'Aditiva',
  subtrativa: 'Subtrativa',
};

/**
 * Refinamento (11/08/2026) — diária default do ÚLTIMO dia por tipo, usada
 * quando `AjudaCustoMock.valorDiariaFinal` está ausente. O operador sempre
 * pode trocar no drawer; 'subtrativa' na prática herda da ajuda referenciada
 * (resolvido em `calcularAjudaCustoTipo`, não aqui).
 */
export const DEFAULT_VALOR_DIARIA_FINAL: Record<TipoCalculoAjuda, number> = {
  padrao: VALOR_DIARIA_RETORNO,
  integral: VALOR_DIARIA_PERNOITE,
  aditiva: VALOR_DIARIA_PERNOITE,
  subtrativa: VALOR_DIARIA_RETORNO,
};

/** As duas únicas diárias válidas para o último dia do período. */
export const OPCOES_VALOR_DIARIA_FINAL: { valor: number; label: string }[] = [
  { valor: VALOR_DIARIA_RETORNO, label: `Diária de retorno (${VALOR_DIARIA_RETORNO.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})` },
  { valor: VALOR_DIARIA_PERNOITE, label: `Diária completa (${VALOR_DIARIA_PERNOITE.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})` },
];

/** Explicação curta de quando usar cada tipo — exibida no seletor do drawer. */
export const TIPO_CALCULO_AJUDA_DESCRICAO: Record<TipoCalculoAjuda, string> = {
  padrao: 'Diárias completas mais uma diária de retorno reduzida. Uso padrão da maioria dos lançamentos.',
  integral: 'Todas as diárias completas, sem diária de retorno reduzida.',
  aditiva: 'Complementa dias a mais sobre uma ajuda já lançada nesta solicitação.',
  subtrativa: 'Corrige uma ajuda já paga quando o paciente ficou menos dias do que o previsto.',
};

/**
 * PBI — Saldo de ajuda de custo entre ciclos (07/08/2026, sinal corrigido em
 * 11/08/2026). O saldo tem sinal:
 * - CREDITO → saldo POSITIVO: o paciente tem valor a receber (ex.: ajuda
 *   aditiva lançada, cuja diferença ainda não foi paga a ele).
 * - DEBITO  → saldo NEGATIVO: o paciente recebeu a mais do que devia (ex.:
 *   ajuda subtrativa ou volta antecipada) e a diferença NUNCA é devolvida
 *   por ele em dinheiro — é descontada do próximo pagamento de ajuda de
 *   custo dele (em qualquer solicitação, não só a que originou o débito).
 * O saldo é sempre derivado da soma dos créditos menos os débitos — nunca
 * um valor materializado, podendo ser positivo, negativo ou zero.
 */
export type TipoMovimentacaoSaldo = 'CREDITO' | 'DEBITO';

export interface MovimentacaoSaldoMock {
  id: string;
  /** Chave real de agrupamento do saldo — CPF do paciente, só dígitos.
   *  O saldo é do paciente e atravessa qualquer solicitação dele, inclusive
   *  entre o fluxo-v2 (ids de seed como 'p1') e a base real (ids Supabase). */
  pacienteCpf: string;
  /** Id do paciente na solicitação de origem do lançamento — mantido só
   *  para rastreio, nunca usado para agrupar o saldo. */
  pacienteId?: string;
  tipo: TipoMovimentacaoSaldo;
  valor: number;
  motivo: string;
  /** Número da solicitação onde o crédito foi gerado (volta antecipada). */
  solicitacaoOrigemNumero?: string;
  /** Número da solicitação onde o débito foi aplicado (abatimento no pagamento). */
  solicitacaoDestinoNumero?: string;
  data: string; // ISO datetime
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
  destino: 'dados_basicos' | 'regulacao' | 'passagens' | 'ajuda_custo' | 'acompanhamento' | 'aprovacao';
  data: string;          // ISO datetime
  autor: string;
  perfilAutor: string;
  observacao?: string;
}

/**
 * Pessoa responsável pela solicitação dentro do setor atual. Escolhida a
 * cada tramitação (a partir da primeira, na saída de Dados Básicos) —
 * diferente do setor, que é fixo por etapa, o responsável é quem responde
 * pela solicitação enquanto ela estiver ali. Guarda o nome junto ao id para
 * a tabela exibir o avatar sem precisar de uma consulta extra.
 */
export interface ResponsavelSolicitacao {
  id: string;
  nome: string;
}

export interface SolicitacaoMock {
  id: string;
  numero: string;
  status: StatusGlobalV2;
  /** Tipo do fluxo: 'normal' (com viagens) ou 'ajuda_custo' (só diárias). Default 'normal'. */
  tipoSolicitacao?: TipoSolicitacao;
  dataCriacao: string; // ISO datetime
  dataLaudo?: string;
  /** Unidade de saúde que emitiu o laudo (nome + CNES quando disponível).
   *  Vem de `solicitacoes.origem_laudo_unidade_id` — mesmo dado exibido na
   *  tela de detalhe do paciente. Ausente em registros antigos sem vínculo. */
  laudoOrigemUnidade?: string;
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
  /** Pessoa responsável pela solicitação no setor atual — ausente antes da
   *  primeira tramitação (estado neutro, não erro). */
  responsavelAtual?: ResponsavelSolicitacao;
  /** T2.AG — Número do processo SEI (formato XXXXX.XXXXXX/AAAA-DD). */
  numeroSEI?: string;
  /** T2.AG — URL completa para o processo no SEI. */
  seiUrl?: string;
  /** Setor em que a solicitação estava no momento em que foi enviada para
   *  Aprovação — preenchido junto com `observacaoAprovacao` e limpo quando a
   *  solicitação sai do setor Aprovação. */
  setorOrigemAprovacao?: 'dados_basicos' | 'regulacao' | 'passagens' | 'ajuda_custo' | 'acompanhamento';
  /** Motivo do pedido de aprovação — obrigatório ao enviar para Aprovação. */
  observacaoAprovacao?: string;
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

export const cloneSolicitacao = (s: SolicitacaoMock): SolicitacaoMock =>
  structuredClone(s);

/**
 * Calcula o valor de uma ajuda de custo (Ata 7, corrigido em 11/08/2026).
 * A diária do último dia do período é a de retorno (R$8,40); o pernoite no
 * retorno (chegada após meia-noite no dia final) SUBSTITUI essa diária pela
 * diária completa (R$24,75), não soma uma diária extra por cima.
 * - Sem pernoite: `(dias − 1) × 24,75 + 8,40`
 * - Com pernoite no retorno: `dias × 24,75`
 */
export function calcularValorAjuda(
  dataInicio: string,
  dataFim: string,
  pernoiteRetorno?: boolean,
): {
  dias: number;
  valor: number;
} {
  const ini = new Date(dataInicio);
  const fim = new Date(dataFim);
  const ms = fim.getTime() - ini.getTime();
  const dias = Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
  const diariaFinal = pernoiteRetorno ? VALOR_DIARIA_PERNOITE : VALOR_DIARIA_RETORNO;
  const valor = (dias - 1) * VALOR_DIARIA_PERNOITE + diariaFinal;
  return {
    dias,
    valor: Math.round(valor * 100) / 100,
  };
}

/** Quantidade de dias de um período (início e fim contam como dias cheios,
 *  mesma convenção de `calcularValorAjuda`). */
function diasPeriodo(dataInicio: string, dataFim: string): number {
  const ini = new Date(dataInicio);
  const fim = new Date(dataFim);
  const ms = fim.getTime() - ini.getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
}

const fmtBRLSeed = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export interface CalculoAjudaCustoResultado {
  dias: number;
  valor: number;
  /** Memória de cálculo já formatada em BRL, pronta para exibir na UI. */
  memoria: string;
  /** Só preenchido para 'subtrativa' — diferença (pago − devido) que vira
   *  saldo NEGATIVO do paciente (ele recebeu a mais). Nunca é o `valor`
   *  desta ajuda, que fica em 0 (correção de regra 11/08/2026). */
  diferencaGerada?: number;
  /** Só preenchido para 'subtrativa' — valor originalmente pago pela ajuda
   *  de referência, para exibir o resumo pago × devido na UI. */
  valorPago?: number;
  /** Só preenchido para 'subtrativa' — valor devido pelos dias reais. */
  valorDevido?: number;
}

/** dias × 24,75, com o último dia trocado pela diária escolhida — a base
 *  matemática comum aos quatro tipos (Ata 7, refinada em 11/08/2026: o que
 *  antes separava 'padrao' de 'integral' virou uma escolha explícita). */
function valorPeriodoBase(dias: number, valorDiariaFinal: number): number {
  return Math.round(((dias - 1) * VALOR_DIARIA_PERNOITE + valorDiariaFinal) * 100) / 100;
}

/**
 * Calcula uma ajuda de custo considerando os quatro tipos do discovery com o
 * setor de Ajuda de Custo (09/08/2026, refinado em 11/08/2026 e novamente em
 * 11/08/2026 para dedução automática do tipo). O tipo 'padrao' com diária
 * final default (R$8,40) reproduz exatamente `calcularValorAjuda` (Ata 7) —
 * mantida intocada porque outras telas ainda a chamam diretamente (ex.:
 * recálculo pela volta real).
 *
 * Em 'aditiva'/'subtrativa', `dataInicio`/`dataFim` são o período REAL
 * informado pelo operador (não mais um período derivado do fim da
 * referência) — o resultado compara o valor desse período inteiro com o
 * valor já calculado da ajuda de referência.
 */
export function calcularAjudaCustoTipo(input: {
  tipoCalculo: TipoCalculoAjuda;
  dataInicio: string;
  dataFim: string;
  /** Diária do último dia do período (8,40 ou 24,75). Ausente = derivada de
   *  `pernoiteRetorno` (sem pernoite = retorno, com pernoite = completa); em
   *  'subtrativa', o default é herdado da ajuda de referência. */
  valorDiariaFinal?: number;
  /**
   * Chegada após meia-noite no dia final do período. Substitui a diária de
   * retorno do último dia pela diária completa — não soma uma diária extra
   * por cima (correção de 11/08/2026, Ata 7).
   */
  pernoiteRetorno?: boolean;
  /**
   * Ajuda de custo de referência da MESMA solicitação — presente apenas
   * quando o operador escolheu uma no drawer. `dataInicio`/`dataFim` são
   * sempre o período REAL informado para este lançamento; a função compara o
   * valor desse período com o valor já pago na referência para deduzir se é
   * 'aditiva' ou 'subtrativa'. Deve ser sempre um período base
   * ('padrao'/'integral') — não há suporte a encadear um ajuste sobre outro.
   */
  ajudaReferencia?: AjudaCustoMock;
}): CalculoAjudaCustoResultado {
  const { tipoCalculo, dataInicio, dataFim, pernoiteRetorno, ajudaReferencia } = input;

  if (tipoCalculo === 'padrao' || tipoCalculo === 'integral') {
    const diariaFinal = input.valorDiariaFinal ?? (pernoiteRetorno ? VALOR_DIARIA_PERNOITE : VALOR_DIARIA_RETORNO);
    const dias = diasPeriodo(dataInicio, dataFim);
    const valor = valorPeriodoBase(dias, diariaFinal);
    const memoria = `(${dias}−1) × ${fmtBRLSeed(VALOR_DIARIA_PERNOITE)} + ${fmtBRLSeed(diariaFinal)}` +
      (pernoiteRetorno ? ' (pernoite no retorno)' : '') +
      ` = ${fmtBRLSeed(valor)}`;
    return { dias, valor, memoria };
  }

  // aditiva/subtrativa — dedução automática (refinamento 11/08/2026): compara
  // o valor do período REAL informado com o valor já pago na referência. Sem
  // referência, não há como deduzir; o chamador (drawer) só entra aqui depois
  // de o operador escolher uma.
  if (!ajudaReferencia) {
    return { dias: 0, valor: 0, memoria: 'Selecione a ajuda de custo de referência.' };
  }
  const dias = diasPeriodo(dataInicio, dataFim);
  const diariaFinal = input.valorDiariaFinal ?? (pernoiteRetorno ? VALOR_DIARIA_PERNOITE : VALOR_DIARIA_RETORNO);
  const valorNovo = valorPeriodoBase(dias, diariaFinal);

  const tipoRef = ajudaReferencia.tipoCalculo ?? 'padrao';
  const diariaFinalRef = ajudaReferencia.valorDiariaFinal ?? (ajudaReferencia.pernoiteRetorno ? VALOR_DIARIA_PERNOITE : VALOR_DIARIA_RETORNO);
  const refCalc = calcularAjudaCustoTipo({
    // A referência é sempre um período base — nunca um ajuste encadeado.
    tipoCalculo: tipoRef === 'aditiva' || tipoRef === 'subtrativa' ? 'padrao' : tipoRef,
    dataInicio: ajudaReferencia.dataInicio,
    dataFim: ajudaReferencia.dataFim,
    valorDiariaFinal: diariaFinalRef,
    pernoiteRetorno: ajudaReferencia.pernoiteRetorno,
  });
  const diferenca = Math.round((valorNovo - refCalc.valor) * 100) / 100;
  const refPeriodo = `${fmtDataBRSeed(ajudaReferencia.dataInicio)}→${fmtDataBRSeed(ajudaReferencia.dataFim)}`;

  if (tipoCalculo === 'aditiva') {
    const valor = Math.max(diferenca, 0);
    return {
      dias,
      valor,
      memoria: `Novo período ${fmtDataBRSeed(dataInicio)}→${fmtDataBRSeed(dataFim)} (${dias} dia(s)): ${fmtBRLSeed(valorNovo)}. Ajuda de referência ${refPeriodo}: ${fmtBRLSeed(refCalc.valor)}. Diferença a lançar: ${fmtBRLSeed(valor)}.`,
    };
  }

  // subtrativa — o paciente recebeu a mais na referência; a diferença nunca
  // é devolvida em dinheiro, vira saldo NEGATIVO dele, descontado do próximo
  // pagamento (correção de regra 11/08/2026).
  const diferencaGerada = Math.max(-diferenca, 0);
  return {
    dias,
    valor: 0,
    memoria: `Valor pago na referência ${refPeriodo}: ${fmtBRLSeed(refCalc.valor)}. Valor devido pelo período real ${fmtDataBRSeed(dataInicio)}→${fmtDataBRSeed(dataFim)} (${dias} dia(s)): ${fmtBRLSeed(valorNovo)}. Diferença de ${fmtBRLSeed(diferencaGerada)} vira saldo negativo do paciente, descontada do próximo pagamento, sem devolução em dinheiro.`,
    diferencaGerada,
    valorPago: refCalc.valor,
    valorDevido: valorNovo,
  };
}

const fmtDataBRSeed = (iso: string) => {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
};

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
      { id: 'ac2', beneficiarioTipo: 'paciente', dataInicio: '2025-06-01', dataFim: '2025-06-10', status: 'concluido', dataConclusao: '2025-06-10', tipoCalculo: 'padrao' },
      // Exemplo de COMPLEMENTO (tipo deduzido ADITIVA) — tratamento se estendeu; no
      // drawer, o operador só escolheu a ac2 como referência e informou o novo
      // período (2025-06-01→2025-06-15), maior que o pago; o sistema deduziu a
      // diferença de dias a lançar.
      { id: 'ac2b', beneficiarioTipo: 'paciente', dataInicio: '2025-06-01', dataFim: '2025-06-15', status: 'emitido', tipoCalculo: 'aditiva', ajudaReferenciaId: 'ac2', observacao: 'Complemento por prorrogação do tratamento pediátrico.' },
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
    responsavelAtual: { id: 'usr-joao-pereira', nome: 'João Pereira' },
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
      responsavelAtual: { id: 'usr-carla-nogueira', nome: 'Carla Nogueira' },
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
    responsavelAtual: { id: 'usr-patricia-gomes', nome: 'Patrícia Gomes' },
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
      // Exemplo de LANÇAMENTO NOVO sem referência (tipo deduzido INTEGRAL) — no
      // drawer, o operador não escolheu referência e marcou a diária final
      // completa (R$24,75); todas as diárias saem completas, sem retorno reduzido.
      { id: 'ac5', beneficiarioTipo: 'acompanhante', beneficiarioId: 'a5', dataInicio: '2025-05-04', dataFim: '2025-05-12', status: 'emitido', tipoCalculo: 'integral' },
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
    responsavelAtual: { id: 'usr-carla-nogueira', nome: 'Carla Nogueira' },
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
      { id: 'ac7', beneficiarioTipo: 'paciente', dataInicio: '2025-06-09', dataFim: '2025-06-15', status: 'concluido', dataConclusao: '2025-06-15', tipoCalculo: 'padrao' },
      // Exemplo de ACERTO (tipo deduzido SUBTRATIVA) — paciente recebeu alta e
      // voltou antes do previsto (4 dias em vez de 7); no drawer, o operador
      // escolheu a ac7 como referência e informou o período real, menor que o
      // pago, e o sistema deduziu o crédito. A diferença (R$74,25) vira
      // crédito do paciente via saldoAjudaCustoStore, nunca devolução.
      { id: 'ac7b', beneficiarioTipo: 'paciente', dataInicio: '2025-06-09', dataFim: '2025-06-12', status: 'concluido', dataConclusao: '2025-06-12', tipoCalculo: 'subtrativa', ajudaReferenciaId: 'ac7', observacao: 'Paciente recebeu alta antecipada, ficou 4 dias em vez dos 7 pagos.' },
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
    responsavelAtual: { id: 'usr-ana-carolina-mendes', nome: 'Ana Carolina Mendes' },
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

  /* ── Caso 10 — Segundo ciclo de Ana Beatriz Costa, sem ajuda de custo ainda
   * (demonstra o saldo atravessando solicitações, correção 11/08/2026). O
   * débito de R$ 49,50 gerado na volta antecipada de 2025/000127 (ms1, ver
   * seedMovimentacoesSaldo abaixo) precisa aparecer aqui quando o operador
   * abrir "Novo período de ajuda": o saldo negativo do paciente entra na
   * conta do primeiro lançamento desta solicitação, mesmo ela nunca tendo
   * tido ajuda de custo própria. ── */
  {
    id: 's10',
    numero: '2025/000130',
    status: 'em_ajuda_custo',
    dataCriacao: isoAt('2025-06-25'),
    dataLaudo: '2025-06-24',
    paciente: pacientesPool[3], // Ana Beatriz Costa — mesmo paciente de s5 (2025/000127)
    acompanhantes: [acompanhantesPool[4]],
    anexos: [],
    pareceres: [
      { id: 'pa10', data: isoAt('2025-06-26', 10), decisao: 'deferido', cidPrincipal: 'C34.9', medico: 'Dr. Ricardo Mello' },
    ],
    carimboRegulacao: 'APROVADO_DIRETO',
    agendamento: {
      id: 'ag10',
      origem: 'criacao',
      tentativas: [
        {
          id: 't10-conf',
          unidade: 'INCA - Rio de Janeiro',
          data: '2025-07-07',
          desfecho: 'agendamento_confirmado',
          hora: '08:00',
        },
      ],
    },
    viagens: [
      { id: 'v10a', origem: 'Bacabal - MA', destino: 'Rio de Janeiro - RJ', data: '2025-07-06', modal: 'aereo', tipo: 'ida', status: 'confirmada', valor: 1490, beneficiarioTipo: 'paciente' },
    ],
    ajudasCusto: [],
    adicionais: [],
    despesasFunerarias: [],
    observacoes: [],
  },
];

/* ── Saldo de ajuda de custo — movimentações-exemplo ─────────────────────
 * Correção de regra (11/08/2026): saldo tem sinal. CREDITO = saldo positivo
 * (paciente a receber, ex.: ajuda aditiva ainda não paga). DEBITO = saldo
 * negativo (paciente recebeu a mais, ex.: ajuda subtrativa ou volta
 * antecipada), descontado do próximo pagamento, nunca devolvido em dinheiro.
 * Pacientes com mais de um ciclo na seed ganham histórico de exemplo para a
 * tela nascer com dado visível — um caso de saldo POSITIVO (Lucas Pereira
 * Lima, pacientesPool[2]) e três de saldo NEGATIVO.
 *
 * Correção de regra (11/08/2026): a chave de agrupamento passou a ser o CPF
 * do paciente (`pacienteCpf`, normalizado — só dígitos), não mais o id do
 * seed. O `pacienteId` é mantido em cada registro só para rastreio da
 * origem. Exemplo de saldo atravessando solicitações: Ana Beatriz Costa
 * (pacientesPool[3]) tem o débito ms1 gerado em 2025/000127 (s5) e uma
 * segunda solicitação, 2025/000130 (s10), em Ajuda de Custo e sem nenhum
 * período lançado ainda — abrir "Novo período de ajuda" nela mostra o saldo
 * negativo de -R$ 49,50 e o consome no primeiro pagamento. */

export const seedMovimentacoesSaldo: MovimentacaoSaldoMock[] = [
  {
    id: 'ms1',
    pacienteCpf: pacientesPool[3].cpf, // Ana Beatriz Costa — ciclos s5 → s10
    pacienteId: pacientesPool[3].id,
    tipo: 'DEBITO',
    valor: 49.5,
    motivo: 'Volta antecipada em 22/05/2025: pago R$ 132,75 para 6 dias, devido R$ 83,25 para 4 dias. Diferença de R$ 49,50 vira saldo negativo, descontada do próximo pagamento.',
    solicitacaoOrigemNumero: '2025/000127',
    data: isoAt('2025-05-23', 10, 0),
  },
  {
    id: 'ms2',
    pacienteCpf: pacientesPool[1].cpf, // José Ribeiro Santos — ciclos s3 → s8
    pacienteId: pacientesPool[1].id,
    tipo: 'DEBITO',
    valor: 33.15,
    motivo: 'Volta antecipada em 08/06/2025: pago R$ 157,80 para 7 dias, devido R$ 124,65 para 6 dias. Diferença de R$ 33,15 vira saldo negativo, descontada do próximo pagamento.',
    solicitacaoOrigemNumero: '2025/000125',
    data: isoAt('2025-06-09', 9, 30),
  },
  {
    id: 'ms3',
    pacienteCpf: pacientesPool[1].cpf,
    pacienteId: pacientesPool[1].id,
    tipo: 'CREDITO',
    valor: 20,
    motivo: 'Saldo negativo parcialmente descontado no pagamento da ajuda de custo da solicitação TFD-2025-0008.',
    solicitacaoDestinoNumero: 'TFD-2025-0008',
    data: isoAt('2025-06-21', 14, 0),
  },
  {
    id: 'ms4',
    pacienteCpf: pacientesPool[6].cpf, // Paulo Henrique Rocha — ac7b, ajuda subtrativa (2025/000129)
    pacienteId: pacientesPool[6].id,
    tipo: 'DEBITO',
    valor: 74.25,
    motivo: 'Ajuda subtrativa: pago R$ 156,90 para 7 dias, devido R$ 82,65 para 4 dias. Diferença de R$ 74,25 vira saldo negativo, descontada do próximo pagamento.',
    solicitacaoOrigemNumero: '2025/000129',
    data: isoAt('2025-06-16', 9, 0),
  },
  {
    id: 'ms5',
    pacienteCpf: pacientesPool[2].cpf, // Lucas Pereira Lima — ac2b, ajuda aditiva (2025/000124)
    pacienteId: pacientesPool[2].id,
    tipo: 'CREDITO',
    valor: 123.75,
    motivo: 'Ajuda aditiva: complemento de R$ 123,75 por prorrogação do tratamento pediátrico, ainda não pago ao paciente. Vira saldo positivo, a receber no próximo pagamento.',
    solicitacaoOrigemNumero: '2025/000124',
    data: isoAt('2025-06-01', 9, 0),
  },
];

/* ── Labels (para uso na UI) ───────────────────────────────────────────── */

export const STATUS_LABEL: Record<StatusGlobalV2, string> = {
  em_dados_basicos:   'Dados Básicos',
  em_regulacao:       'Regulação',
  em_passagens:       'Passagens',
  em_ajuda_custo:     'Ajuda de Custo',
  em_acompanhamento:  'Acompanhamento',
  em_aprovacao:       'Aprovação',
  em_encerramento:    'Encerramento',
};

export const STATUS_BADGE_COLOR: Record<StatusGlobalV2, { bg: string; fg: string }> = {
  em_dados_basicos:  { bg: '#F1F5F9', fg: '#475569' }, // cinza
  em_regulacao:      { bg: '#EDE9FE', fg: '#6D28D9' }, // roxo
  em_passagens:      { bg: '#FEF3C7', fg: '#92400E' }, // âmbar
  em_ajuda_custo:    { bg: '#FFEDD5', fg: '#C2410C' }, // laranja
  em_acompanhamento: { bg: '#DBEAFE', fg: '#1D4ED8' }, // azul
  em_aprovacao:      { bg: '#FCE7F3', fg: '#BE185D' }, // rosa
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
