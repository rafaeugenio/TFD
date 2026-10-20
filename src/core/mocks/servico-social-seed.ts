/* -------------------------------------------------------------------------- */
/*  Serviço Social — tipos e dados do protótipo (spec de 14/09/2026)          */
/*                                                                            */
/*  Demanda paralela: abrir um pedido ao Serviço Social NÃO muda o setor     */
/*  nem a etapa da solicitação de TFD, e nada é bloqueado automaticamente.   */
/*  Uma solicitação pode ter várias demandas sociais, inclusive em momentos  */
/*  distintos. O status exibido na fila é o setor em que a solicitação está. */
/*                                                                            */
/*  Sem tabela no Supabase — igual ao saldo de ajuda de custo, vive em store */
/*  de memória enquanto a regra é validada presencialmente com a equipe.     */
/* -------------------------------------------------------------------------- */

/* ── Demanda ─────────────────────────────────────────────────────────────── */

export type SituacaoDemandaSocial =
  | 'pendente'
  | 'em_atendimento'
  | 'concluida'
  | 'cancelada';

export const SITUACAO_DEMANDA_LABEL: Record<SituacaoDemandaSocial, string> = {
  pendente: 'Pendente',
  em_atendimento: 'Em atendimento',
  concluida: 'Concluída',
  cancelada: 'Cancelada',
};

/** Situações que contam como demanda aberta — base da flag na solicitação
 *  e do filtro inicial da fila. */
export const SITUACOES_ABERTAS: SituacaoDemandaSocial[] = ['pendente', 'em_atendimento'];

export function demandaEstaAberta(d: DemandaSocialMock): boolean {
  return SITUACOES_ABERTAS.includes(d.situacao);
}

/** Setor de onde partiu o pedido. Qualquer pessoa com acesso à solicitação
 *  pode abrir uma demanda, então a lista cobre todos os setores. */
export type SetorOrigemDemanda =
  | 'dados_basicos'
  | 'regulacao'
  | 'passagens'
  | 'ajuda_custo'
  | 'acompanhamento'
  | 'aprovacao';

export const SETOR_ORIGEM_LABEL: Record<SetorOrigemDemanda, string> = {
  dados_basicos: 'Dados Básicos',
  regulacao: 'Regulação',
  passagens: 'Passagens',
  ajuda_custo: 'Ajuda de Custo',
  acompanhamento: 'Acompanhamento',
  aprovacao: 'Aprovação',
};

export interface DemandaSocialMock {
  id: string;
  /** Vínculo com a solicitação de origem — a demanda nunca existe sozinha. */
  solicitacaoId: string;
  /** Cópia do número para a fila não depender de carregar a solicitação. */
  solicitacaoNumero: string;
  pacienteNome: string;
  pacienteCpf: string;
  dataEncaminhamento: string; // ISO datetime
  encaminhadoPor: string;
  setorOrigem: SetorOrigemDemanda;
  /** O que precisa ser avaliado — obrigatório na abertura. */
  motivo: string;
  situacao: SituacaoDemandaSocial;
  /** Profissional do Serviço Social que assumiu a demanda. Definida no
   *  momento de assumir: quem pega a demanda escolhe quem responde por ela. */
  profissionalResponsavel?: string;
  /** Preenchidos na conclusão. */
  dataConclusao?: string;
  concluidaPor?: string;
  orientacaoFinal?: string;
  /** Preenchido no cancelamento. */
  motivoCancelamento?: string;
}

/* ── Instrumento ─────────────────────────────────────────────────────────── */

export type TipoInstrumento =
  | 'parecer_social'
  | 'encaminhamento_casa_apoio'
  | 'declaracao_tfd_ma'
  | 'outros';

export const TIPO_INSTRUMENTO_LABEL: Record<TipoInstrumento, string> = {
  parecer_social: 'Parecer Social',
  encaminhamento_casa_apoio: 'Encaminhamento para Casa de Apoio',
  declaracao_tfd_ma: 'Declaração TFD-MA',
  outros: 'Outros',
};

export const TIPOS_INSTRUMENTO: TipoInstrumento[] = [
  'parecer_social',
  'encaminhamento_casa_apoio',
  'declaracao_tfd_ma',
  'outros',
];

/** Documento assinado anexado ao instrumento. No protótipo o arquivo fica
 *  só no navegador (URL temporária); no sistema real vai para o armazenamento
 *  de anexos, como os demais anexos da solicitação. */
export interface AnexoInstrumentoMock {
  nome: string;
  tamanho: number;
  mime: string;
  url: string;
  enviadoPor: string;
  enviadoEm: string; // ISO datetime
}

export interface InstrumentoSocialMock {
  id: string;
  /** Ausente quando o instrumento é avulso: a profissional pode produzir um
   *  documento sem que exista uma demanda por trás. */
  demandaId?: string;
  solicitacaoId: string;
  tipo: TipoInstrumento;
  /** Texto final do documento, já com os dados da solicitação aplicados e
   *  editado pela profissional. */
  conteudo: string;
  /** Decidido caso a caso pela assistente social, nunca automático por tipo
   *  ou por solicitação. */
  sigiloso: boolean;
  autora: string;
  autoraId?: string;
  dataCriacao: string; // ISO datetime
  /** Só no encaminhamento para casa de apoio, e mesmo lá é opcional. */
  casaApoioId?: string;
  /** Cópias da solicitação e do paciente, para o detalhe da casa de apoio
   *  listar o encaminhamento mesmo quando ele é avulso (sem demanda). */
  solicitacaoNumero?: string;
  pacienteNome?: string;
  pacienteCpf?: string;
  /** Título do documento. Obrigatório no tipo "Outros"; nos demais o título
   *  é o nome do tipo. */
  titulo?: string;
  /** Cópia assinada do documento, quando existir. */
  anexoAssinado?: AnexoInstrumentoMock;
}

/* ── Casa de apoio ───────────────────────────────────────────────────────── */

export interface CasaApoioMock {
  id: string;
  nome: string;
  endereco: string;
  contato: string;
  responsavel: string;
  /** Vínculo opcional com uma unidade de saúde já cadastrada. */
  unidadeVinculadaId?: string;
  unidadeVinculadaNome?: string;
  /** Cidade/UF em texto livre, usada na listagem. */
  cidadeUf?: string;
  /** Texto livre sobre a casa: quem ela acolhe (só crianças, só adultos,
   *  moradores de um estado), regras e o que mais a equipe precisar saber.
   *  Preenchido à mão, porque as variáveis são muitas demais para virar campos. */
  descricao?: string;
}

export const seedCasasApoio: CasaApoioMock[] = [
  {
    id: 'casa-1',
    nome: 'Casa de Apoio Nossa Senhora da Vitória',
    endereco: 'Rua das Acácias, 145, Bairro Vila Mariana',
    cidadeUf: 'São Paulo - SP',
    contato: '(11) 3456-7890',
    responsavel: 'Irmã Terezinha Alves',
    descricao: 'Acolhe adultos e idosos em tratamento oncológico, com um acompanhante. Não recebe menores de idade desacompanhados. Café da manhã e jantar inclusos; levar documento com foto e o encaminhamento do TFD.',
  },
  {
    id: 'casa-2',
    nome: 'Casa do Maranhense em Brasília',
    endereco: 'SHIS QI 15, Conjunto 4, Lago Sul',
    cidadeUf: 'Brasília - DF',
    contato: '(61) 3244-1180',
    responsavel: 'Marcos Vinícius Pereira',
    descricao: 'Recebe pacientes e acompanhantes do Maranhão em tratamento em Brasília, de qualquer idade. Reserva por telefone com 48 horas de antecedência. Não aceita pacientes em isolamento.',
  },
  {
    id: 'casa-3',
    nome: 'Abrigo Esperança Viva',
    endereco: 'Avenida Beira Mar, 2300, Praia de Iracema',
    cidadeUf: 'Fortaleza - CE',
    contato: '(85) 3222-4477',
    responsavel: 'Luciana Sampaio',
    descricao: 'Atende somente crianças e adolescentes de até 17 anos, com um responsável adulto. Sem restrição de estado de origem.',
  },
  {
    id: 'casa-4',
    nome: 'Casa de Apoio São Lázaro',
    endereco: 'Rua Grande, 812, Centro',
    cidadeUf: 'São Luís - MA',
    contato: '(98) 3232-7788',
    responsavel: 'Antônio Carlos Ribeiro',
    descricao: 'Casa de passagem em São Luís para pacientes do interior do Maranhão que aguardam transporte ou consulta. Até 3 diárias por solicitação.',
  },
  // Casas fictícias da massa de teste dos últimos 3 meses (scripts/seed-demo).
  {
    id: 'casa-5',
    nome: 'Casa de Apoio Rosa dos Ventos',
    endereco: 'Rua Coelho Rodrigues, 1450, Centro',
    cidadeUf: 'Teresina - PI',
    contato: '(86) 3221-4010',
    responsavel: 'Margarida Souza Leal',
    unidadeVinculadaId: 'd3a00003-0000-4000-8000-000000000001',
    unidadeVinculadaNome: 'Hospital de Oncologia de Teresina',
  },
  {
    id: 'casa-6',
    nome: 'Lar Coração Acolhedor',
    endereco: 'Rua Barão de Aracati, 980, Aldeota',
    cidadeUf: 'Fortaleza - CE',
    contato: '(85) 3261-7720',
    responsavel: 'Francisco Holanda Neto',
    unidadeVinculadaId: 'd3a00003-0000-4000-8000-000000000002',
    unidadeVinculadaNome: 'Instituto Cardiológico do Ceará',
  },
  {
    id: 'casa-7',
    nome: 'Casa de Apoio Mãos Unidas',
    endereco: 'Rua da Aurora, 320, Boa Vista',
    cidadeUf: 'Recife - PE',
    contato: '(81) 3423-5566',
    responsavel: 'Irmã Graça Cavalcanti',
  },
  {
    id: 'casa-8',
    nome: 'Pousada Solidária Santa Clara',
    endereco: 'Travessa Quintino Bocaiúva, 77, Nazaré',
    cidadeUf: 'Belém - PA',
    contato: '(91) 3241-9081',
    responsavel: 'Raimunda Pantoja',
  },
  {
    id: 'casa-9',
    nome: 'Casa do Paciente Maranhense em Goiânia',
    endereco: 'Rua 24, 410, Setor Central',
    cidadeUf: 'Goiânia - GO',
    contato: '(62) 3215-3302',
    responsavel: 'Domingos Araújo Lima',
  },
  {
    id: 'casa-10',
    nome: 'Casa de Apoio Esperança Imperatriz',
    endereco: 'Rua Simplício Moreira, 1180, Centro',
    cidadeUf: 'Imperatriz - MA',
    contato: '(99) 3523-6644',
    responsavel: 'Valdirene Costa Brito',
  },
];

/* ── Profissionais do Serviço Social (fallback de demonstração) ────────── */

/**
 * As profissionais são os usuários com o perfil "Serviço Social" (PBI 16409,
 * RN09), lidos da tabela `usuarios` pelo hook `useProfissionaisServicoSocial`.
 * Esta lista só entra quando o banco ainda não tem nenhum usuário ativo com
 * esse perfil, para o seletor de "Assumir demanda" não ficar vazio na
 * demonstração. Não é cadastro nem regra: some sozinha assim que existir
 * usuário com o perfil.
 *
 * O acesso ao conteúdo sigiloso vem da permissão `acao.servico_social.sigilo`
 * (e nunca do administrador), conferida direto na aba Serviço Social.
 */
export interface ProfissionalSocial {
  id: string;
  nome: string;
}

export const PROFISSIONAIS_SERVICO_SOCIAL_DEMO: ProfissionalSocial[] = [
  { id: 'ss-demo-1', nome: 'Ana Cláudia Mendes' },
  { id: 'ss-demo-2', nome: 'Rosângela Barros Lima' },
];
