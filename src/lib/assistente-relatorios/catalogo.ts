import 'server-only';

/**
 * Catálogo fechado de consultas que o assistente sabe responder. A IA só
 * escolhe um destes ids e parâmetros dentro das listas abaixo; a consulta de
 * cada um está em `consultas.ts` e nunca é escrita pela IA. Tudo é agregado:
 * nenhuma consulta devolve dado de pessoa.
 */

export type RelatorioId =
  | 'gasto_passagens'
  | 'passagens_por_modal'
  | 'custo_por_destino'
  | 'gasto_diarias'
  | 'custo_total'
  | 'solicitacoes_por_status'
  | 'solicitacoes_em_andamento'
  | 'pareceres_regulacao'
  | 'agendamentos'
  | 'pacientes_cadastrados'
  | 'tempo_medio_conclusao'
  | 'bpa_sigtap'
  | 'deslocamentos'
  | 'registro_extremo';

export const AGRUPAMENTOS = [
  'nenhum', 'mes', 'modal', 'destino', 'origem', 'beneficiario', 'status', 'categoria',
  'setor', 'municipio', 'regional', 'especialidade', 'prioridade', 'decisao', 'sexo', 'procedimento', 'cid',
] as const;
export type Agrupamento = (typeof AGRUPAMENTOS)[number];

export const MODAIS = ['AEREO', 'TERRESTRE', 'FLUVIAL', 'TRANSFER'] as const;
export type Modal = (typeof MODAIS)[number];
export const MODAL_ROTULO: Record<Modal, string> = { AEREO: 'Aéreo', TERRESTRE: 'Terrestre', FLUVIAL: 'Fluvial', TRANSFER: 'Transfer' };

export const BENEFICIARIOS = ['PACIENTE', 'ACOMPANHANTE'] as const;
export type Beneficiario = (typeof BENEFICIARIOS)[number];
export const BENEFICIARIO_ROTULO: Record<Beneficiario, string> = { PACIENTE: 'Paciente', ACOMPANHANTE: 'Acompanhante' };

export const PRIORIDADES = ['URGENTE', 'NORMAL'] as const;
export type Prioridade = (typeof PRIORIDADES)[number];
export const PRIORIDADE_ROTULO: Record<Prioridade, string> = { URGENTE: 'Urgente', NORMAL: 'Normal' };

/** Status da solicitação no banco (CHECK da migration 00073). */
export const STATUS_SOLICITACAO = [
  'PENDENTE_DIAGNOSTICO', 'NOVO', 'EM_ANALISE', 'EXIGENCIA', 'AGUARDANDO_REGULACAO', 'AGUARDANDO_CNRAC',
  'AGUARDANDO_SETI', 'AGUARDANDO_RESPOSTA_EXTERNA', 'ENCAMINHADO_SERVICO_SOCIAL', 'AGUARDANDO_AGENDAMENTO',
  'AGUARDANDO_EMISSAO', 'EMITIDA', 'EM_VIAGEM', 'EM_PERMANENCIA', 'REMARCACAO', 'EM_PAGAMENTO', 'EM_APROVACAO',
  'CONCLUIDO', 'INDEFERIDO', 'CANCELADO',
] as const;
export type StatusSolicitacao = (typeof STATUS_SOLICITACAO)[number];
export const STATUS_ROTULO: Record<StatusSolicitacao, string> = {
  PENDENTE_DIAGNOSTICO: 'Pendente de diagnóstico', NOVO: 'Nova', EM_ANALISE: 'Em análise', EXIGENCIA: 'Em exigência',
  AGUARDANDO_REGULACAO: 'Aguardando regulação', AGUARDANDO_CNRAC: 'Aguardando CNRAC', AGUARDANDO_SETI: 'Aguardando SETI',
  AGUARDANDO_RESPOSTA_EXTERNA: 'Aguardando resposta externa', ENCAMINHADO_SERVICO_SOCIAL: 'Encaminhada ao Serviço Social',
  AGUARDANDO_AGENDAMENTO: 'Aguardando agendamento', AGUARDANDO_EMISSAO: 'Aguardando emissão', EMITIDA: 'Passagem emitida',
  EM_VIAGEM: 'Em viagem', EM_PERMANENCIA: 'Em permanência', REMARCACAO: 'Em remarcação', EM_PAGAMENTO: 'Em pagamento',
  EM_APROVACAO: 'Em aprovação', CONCLUIDO: 'Concluída', INDEFERIDO: 'Indeferida', CANCELADO: 'Cancelada',
};
/** Situações em que a solicitação já saiu do fluxo. */
export const STATUS_ENCERRADOS: StatusSolicitacao[] = ['CONCLUIDO', 'INDEFERIDO', 'CANCELADO'];

/** Setor atual (derivado do status por gatilho no banco). */
export const SETOR_ROTULO: Record<string, string> = {
  dados_basicos: 'Dados básicos', regulacao: 'Regulação', passagens: 'Passagens', ajuda_custo: 'Ajuda de custo',
  acompanhamento: 'Acompanhamento', aprovacao: 'Aprovação', encerramento: 'Encerramento', servico_social: 'Serviço Social',
};

export const AGRUPAMENTO_ROTULO: Record<Agrupamento, string> = {
  nenhum: 'Sem agrupamento', mes: 'Mês', modal: 'Modal de transporte', destino: 'Cidade de destino',
  origem: 'Cidade de origem', beneficiario: 'Beneficiário', status: 'Situação', categoria: 'Categoria de custo',
  setor: 'Setor', municipio: 'Município', regional: 'Regional de saúde', especialidade: 'Especialidade',
  prioridade: 'Prioridade', decisao: 'Decisão do parecer', sexo: 'Sexo', procedimento: 'Procedimento SIGTAP', cid: 'CID',
};

/** Descrição de cada agrupamento para o JEV escolher (em linguagem do usuário). */
export const AGRUPAMENTO_CRITERIO: Record<Agrupamento, string> = {
  nenhum: 'Só o total, sem separar em grupos.',
  mes: 'Separado por mês, evolução ao longo do tempo.',
  modal: 'Separado por meio de transporte (aéreo, terrestre, fluvial, transfer).',
  destino: 'Separado por cidade de destino.',
  origem: 'Separado por cidade de origem ou saída.',
  beneficiario: 'Separado entre paciente e acompanhante.',
  status: 'Separado pela situação ou status da solicitação.',
  categoria: 'Separado por tipo de custo (passagens, adicionais, diárias).',
  setor: 'Separado pelo setor ou etapa do fluxo em que está (regulação, passagens, ajuda de custo...).',
  municipio: 'Separado pelo município do paciente ou de origem da solicitação.',
  regional: 'Separado pela regional de saúde.',
  especialidade: 'Separado pela especialidade médica (oncologia, cardiologia...).',
  prioridade: 'Separado entre urgente e normal.',
  decisao: 'Separado pela decisão do parecer (deferido ou indeferido).',
  sexo: 'Separado por sexo.',
  procedimento: 'Separado por procedimento SIGTAP do BPA (ajuda de custo e deslocamento).',
  cid: 'Separado por CID (código da doença ou diagnóstico principal): quais CIDs mais aparecem.',
};

/** Registros que a consulta de extremos sabe achar (maior, menor, mais recente, mais antigo). */
export const ENTIDADES_EXTREMO = {
  passagem: 'Uma passagem ou bilhete (valor, rota, modal, data de emissão).',
  ajuda_custo: 'Uma ajuda de custo ou diária (valor, período).',
  adicional: 'Um adicional de passagem (bagagem, passagem extra, transfer).',
  solicitacao: 'Uma solicitação ou processo de TFD (data de abertura, setor, especialidade).',
  parecer: 'Um parecer da regulação (data, decisão).',
  agendamento: 'Um agendamento de atendimento (data, cidade de destino).',
  encerramento: 'Um encerramento de processo (data, motivo).',
  fechamento_faturamento: 'Um fechamento de competência do Faturamento no módulo Financeiro (data do fechamento).',
  fechamento_bpa: 'Um fechamento de competência do BPA no módulo Financeiro (data do fechamento).',
  qualquer_registro: 'Qualquer dado do sistema, o primeiro ou o último registro de todos.',
} as const;
export type EntidadeExtremo = keyof typeof ENTIDADES_EXTREMO;

export const CRITERIOS_EXTREMO = {
  maior_valor: 'O de maior valor, o mais caro.',
  menor_valor: 'O de menor valor, o mais barato.',
  mais_recente: 'O mais recente, o último, a última data.',
  mais_antigo: 'O mais antigo, o primeiro, a primeira data.',
} as const;
export type CriterioExtremo = keyof typeof CRITERIOS_EXTREMO;

export interface Filtros {
  modal?: Modal[];
  beneficiario?: Beneficiario[];
  status?: StatusSolicitacao[];
  prioridade?: Prioridade[];
  /** Filtros de texto livre, já conferidos contra valores que existem no banco. */
  municipio?: { ids: string[]; nome: string };
  especialidade?: string;
  cid?: string;
  destino?: string;
}

export interface DefinicaoRelatorio {
  id: RelatorioId;
  titulo: string;
  /** Descrição usada pelo JEV para escolher a consulta (em linguagem do usuário). */
  descricao: string;
  agrupamentos: Agrupamento[];
  agrupamentoPadrao: Agrupamento;
  filtros: (keyof Filtros)[];
  /** Sem período informado, a consulta olha o momento atual em vez de pedir período. */
  periodoOpcional?: boolean;
  /** Data que define o período, como aparece para o usuário. */
  campoData: string;
  /** Regra de cálculo explicada na resposta. */
  premissa: string;
}

const PREMISSA_PASSAGENS =
  'Valor líquido das passagens ativas (valor da passagem menos reembolso), pela data de cadastro da passagem, mais os adicionais ligados a uma passagem que não foram indeferidos. Taxas não entram. Mesma regra do indicador "Total emitido" do Painel.';

export const CATALOGO: Record<RelatorioId, DefinicaoRelatorio> = {
  gasto_passagens: {
    id: 'gasto_passagens',
    titulo: 'Gasto com passagens',
    descricao: 'Quanto dinheiro foi gasto ou emitido em passagens (bilhetes de transporte) em um período, no total ou separado por mês.',
    agrupamentos: ['nenhum', 'mes', 'modal', 'destino', 'origem'],
    agrupamentoPadrao: 'nenhum',
    filtros: ['modal', 'destino'],
    campoData: 'data de cadastro da passagem',
    premissa: PREMISSA_PASSAGENS,
  },
  passagens_por_modal: {
    id: 'passagens_por_modal',
    titulo: 'Passagens por modal de transporte',
    descricao: 'Comparar passagens entre modais de transporte (aéreo, terrestre, fluvial, transfer): qual modal custou mais ou teve mais passagens.',
    agrupamentos: ['modal'],
    agrupamentoPadrao: 'modal',
    filtros: ['modal'],
    campoData: 'data de cadastro da passagem',
    premissa: PREMISSA_PASSAGENS,
  },
  custo_por_destino: {
    id: 'custo_por_destino',
    titulo: 'Gasto com passagens por cidade',
    descricao: 'Gasto com passagens separado por cidade de destino, cidade de origem ou rota: quais destinos ou municípios custaram mais.',
    agrupamentos: ['destino', 'origem'],
    agrupamentoPadrao: 'destino',
    filtros: ['modal'],
    campoData: 'data de cadastro da passagem',
    premissa: PREMISSA_PASSAGENS,
  },
  gasto_diarias: {
    id: 'gasto_diarias',
    titulo: 'Gasto com diárias (ajuda de custo)',
    descricao: 'Quanto foi pago em diárias ou ajuda de custo para pacientes e acompanhantes em um período.',
    agrupamentos: ['nenhum', 'mes', 'beneficiario'],
    agrupamentoPadrao: 'nenhum',
    filtros: ['beneficiario'],
    campoData: 'data de conclusão da ajuda de custo',
    premissa:
      'Ajudas de custo ativas e concluídas, pela data de conclusão. Valor calculado pelas diárias do período (R$ 24,75 por pernoite e R$ 8,40 na diária de retorno) menos reembolso. Ajudas de cálculo aditivo ou subtrativo ficam fora, porque viram saldo do paciente. Mesma regra do indicador "Total em diárias" do Painel.',
  },
  custo_total: {
    id: 'custo_total',
    titulo: 'Custo total do TFD',
    descricao: 'Custo total do TFD somando passagens, adicionais de passagem e diárias em um período, no total, por mês ou por categoria de custo.',
    agrupamentos: ['nenhum', 'mes', 'categoria'],
    agrupamentoPadrao: 'categoria',
    filtros: [],
    campoData: 'data de cadastro da passagem e data de conclusão da ajuda de custo',
    premissa:
      'Soma do gasto com passagens (valor líquido das passagens ativas, mais adicionais ligados a passagem não indeferidos) com o gasto com diárias (ajudas concluídas, sem aditivas e subtrativas). Cada parte usa a mesma regra dos indicadores do Painel. Despesas funerárias e outros custos ainda não entram.',
  },
  solicitacoes_por_status: {
    id: 'solicitacoes_por_status',
    titulo: 'Solicitações abertas no período',
    descricao: 'Quantas solicitações de TFD foram abertas, criadas ou recebidas, separadas pela situação atual, especialidade, CID (doença), município, regional, setor ou prioridade; também quais CIDs ou especialidades mais aparecem em um município.',
    agrupamentos: ['status', 'mes', 'setor', 'especialidade', 'municipio', 'regional', 'prioridade', 'cid'],
    agrupamentoPadrao: 'status',
    filtros: ['status', 'prioridade', 'municipio', 'especialidade', 'cid'],
    campoData: 'data de abertura da solicitação',
    premissa:
      'Conta as solicitações abertas no período, pela situação em que estão hoje. O sistema não guarda a data de aprovação, então "aprovadas neste mês" mostra as abertas no mês com a situação atual de cada uma.',
  },
  solicitacoes_em_andamento: {
    id: 'solicitacoes_em_andamento',
    titulo: 'Solicitações em andamento',
    descricao: 'Quantas solicitações estão em andamento agora, na fila ou paradas em cada setor ou etapa do fluxo (dados básicos, regulação, passagens, ajuda de custo, aprovação, acompanhamento), por situação, especialidade, município ou prioridade.',
    agrupamentos: ['setor', 'status', 'especialidade', 'municipio', 'regional', 'prioridade', 'cid'],
    agrupamentoPadrao: 'setor',
    filtros: ['status', 'prioridade', 'municipio', 'especialidade', 'cid'],
    periodoOpcional: true,
    campoData: 'data de abertura da solicitação',
    premissa:
      'Conta as solicitações que ainda não foram concluídas, indeferidas ou canceladas, no setor e na situação em que estão agora. Com período informado, considera só as abertas nesse período.',
  },
  pareceres_regulacao: {
    id: 'pareceres_regulacao',
    titulo: 'Pareceres da regulação',
    descricao: 'Quantos pareceres médicos da regulação foram emitidos, quantos deferidos e quantos indeferidos, taxa de deferimento ou indeferimento em um período.',
    agrupamentos: ['decisao', 'mes'],
    agrupamentoPadrao: 'decisao',
    filtros: [],
    campoData: 'data do parecer',
    premissa: 'Conta os pareceres registrados no período pela decisão do médico regulador. Uma solicitação pode ter mais de um parecer.',
  },
  agendamentos: {
    id: 'agendamentos',
    titulo: 'Agendamentos de atendimento',
    descricao: 'Quantos agendamentos de consulta ou atendimento fora do domicílio foram marcados em um período, por cidade de destino ou por mês.',
    agrupamentos: ['destino', 'mes', 'status'],
    agrupamentoPadrao: 'destino',
    filtros: [],
    campoData: 'data e hora do agendamento',
    premissa: 'Conta os agendamentos pela data marcada para o atendimento.',
  },
  pacientes_cadastrados: {
    id: 'pacientes_cadastrados',
    titulo: 'Pacientes cadastrados',
    descricao: 'Quantos pacientes estão cadastrados no TFD, por município, sexo ou mês de cadastro, ou quantos foram cadastrados em um período.',
    agrupamentos: ['nenhum', 'municipio', 'sexo', 'mes'],
    agrupamentoPadrao: 'nenhum',
    filtros: [],
    periodoOpcional: true,
    campoData: 'data de cadastro do paciente',
    premissa: 'Conta os pacientes ativos no cadastro. Com período informado, considera só os cadastrados nesse período.',
  },
  tempo_medio_conclusao: {
    id: 'tempo_medio_conclusao',
    titulo: 'Tempo médio até a conclusão',
    descricao: 'Quanto tempo, em média, uma solicitação leva desde a abertura até ser concluída ou encerrada, demora média do processo, por especialidade ou mês.',
    agrupamentos: ['nenhum', 'especialidade', 'mes', 'prioridade'],
    agrupamentoPadrao: 'nenhum',
    filtros: ['prioridade'],
    campoData: 'data de encerramento da solicitação',
    premissa: 'Média de dias entre a abertura e o encerramento das solicitações concluídas, pela data de encerramento.',
  },
  bpa_sigtap: {
    id: 'bpa_sigtap',
    titulo: 'Valor SIGTAP (BPA)',
    descricao: 'Valor pela tabela SIGTAP do SUS, o que vai no BPA (boletim de produção ambulatorial, faturamento SUS): ajudas de custo (diárias) e deslocamentos valorados pelos códigos 08.03.01, por procedimento, mês, modal ou beneficiário. Não é o valor real pago.',
    agrupamentos: ['nenhum', 'procedimento', 'mes', 'modal', 'beneficiario'],
    agrupamentoPadrao: 'procedimento',
    filtros: ['modal', 'beneficiario'],
    campoData: 'data de início da ajuda e data de embarque do deslocamento',
    premissa:
      'Mesma regra do BPA do módulo Financeiro: cada ajuda de custo vale os dias elegíveis pelo código de pernoite mais uma diária sem pernoite; cada trecho de viagem ativo vale o código de deslocamento do modal vezes a distância dividida pela unidade SIGTAP (50 km terrestre, 200 milhas aéreo, 27 milhas náuticas fluvial). Trecho sem distância informada fica com valor zero. Valores unitários da tabela SIGTAP cadastrada.',
  },
  deslocamentos: {
    id: 'deslocamentos',
    titulo: 'Deslocamentos',
    descricao: 'Quantos deslocamentos (trechos de viagem de ida ou volta) foram feitos ou marcados, e a distância percorrida em km ou milhas, por meio de transporte, destino, origem ou mês. Conta trechos, não soma valor em reais.',
    agrupamentos: ['modal', 'destino', 'origem', 'mes'],
    agrupamentoPadrao: 'modal',
    filtros: ['modal'],
    campoData: 'data de embarque prevista do trecho',
    premissa: 'Conta os trechos de viagem ativos (ida e volta contam separado; transfer conta como trecho) pela data de embarque prevista. A distância soma o que está informado em cada trecho.',
  },
  registro_extremo: {
    id: 'registro_extremo',
    titulo: 'Registro em destaque',
    descricao: 'Um registro só: o maior ou menor valor (passagem mais cara, maior ajuda de custo) ou o mais recente ou mais antigo (última solicitação aberta, primeiro dado do sistema, última emissão, último fechamento de faturamento ou BPA, último encerramento). Pergunta por "qual o/a mais...", "último", "primeiro", "quando foi".',
    agrupamentos: ['nenhum'],
    agrupamentoPadrao: 'nenhum',
    filtros: ['modal', 'municipio', 'especialidade', 'destino'],
    periodoOpcional: true,
    campoData: 'data do registro',
    premissa: 'Mostra um registro só, sem dados pessoais: valor, data e atributos como rota, modal, setor e especialidade. Fechamentos de competência vêm do módulo Financeiro (no protótipo, guardados neste navegador).',
  },
};

export const IDS_RELATORIO = Object.keys(CATALOGO) as RelatorioId[];
