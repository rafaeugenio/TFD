import 'server-only';

/**
 * Catálogo fechado de relatórios que o assistente sabe responder. A IA só
 * escolhe um destes ids e preenche parâmetros dentro das listas abaixo; a
 * consulta de cada um está em `consultas.ts` e nunca é escrita pela IA.
 */

export type RelatorioId =
  | 'gasto_passagens'
  | 'passagens_por_modal'
  | 'custo_por_destino'
  | 'gasto_diarias'
  | 'solicitacoes_por_status'
  | 'custo_total';

export type Agrupamento = 'nenhum' | 'mes' | 'modal' | 'destino' | 'origem' | 'beneficiario' | 'status' | 'categoria';

export const MODAIS = ['AEREO', 'TERRESTRE', 'FLUVIAL', 'TRANSFER'] as const;
export type Modal = (typeof MODAIS)[number];
export const MODAL_ROTULO: Record<Modal, string> = { AEREO: 'Aéreo', TERRESTRE: 'Terrestre', FLUVIAL: 'Fluvial', TRANSFER: 'Transfer' };

export const BENEFICIARIOS = ['PACIENTE', 'ACOMPANHANTE'] as const;
export type Beneficiario = (typeof BENEFICIARIOS)[number];
export const BENEFICIARIO_ROTULO: Record<Beneficiario, string> = { PACIENTE: 'Paciente', ACOMPANHANTE: 'Acompanhante' };

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

export const AGRUPAMENTO_ROTULO: Record<Agrupamento, string> = {
  nenhum: 'Sem agrupamento', mes: 'Mês', modal: 'Modal de transporte', destino: 'Cidade de destino',
  origem: 'Cidade de origem', beneficiario: 'Beneficiário', status: 'Situação', categoria: 'Categoria de custo',
};

export interface Filtros {
  modal?: Modal[];
  beneficiario?: Beneficiario[];
  status?: StatusSolicitacao[];
}

export interface DefinicaoRelatorio {
  id: RelatorioId;
  titulo: string;
  /** Descrição usada pelo JEV para escolher o relatório (em linguagem do usuário). */
  descricao: string;
  agrupamentos: Agrupamento[];
  agrupamentoPadrao: Agrupamento;
  filtros: (keyof Filtros)[];
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
    filtros: ['modal'],
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
  solicitacoes_por_status: {
    id: 'solicitacoes_por_status',
    titulo: 'Solicitações por situação',
    descricao: 'Quantas solicitações de TFD foram abertas ou existem em um período, separadas pela situação atual (em análise, aprovada, concluída, cancelada etc.).',
    agrupamentos: ['status', 'mes'],
    agrupamentoPadrao: 'status',
    filtros: ['status'],
    campoData: 'data de abertura da solicitação',
    premissa:
      'Conta as solicitações abertas no período, pela situação em que estão hoje. O sistema não guarda a data de aprovação, então "aprovadas neste mês" mostra as abertas no mês com a situação atual de cada uma.',
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
};

export const IDS_RELATORIO = Object.keys(CATALOGO) as RelatorioId[];
