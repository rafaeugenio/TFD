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
  | 'declaracao_tfd_ma';

export const TIPO_INSTRUMENTO_LABEL: Record<TipoInstrumento, string> = {
  parecer_social: 'Parecer Social',
  encaminhamento_casa_apoio: 'Encaminhamento para Casa de Apoio',
  declaracao_tfd_ma: 'Declaração TFD-MA',
};

export const TIPOS_INSTRUMENTO: TipoInstrumento[] = [
  'parecer_social',
  'encaminhamento_casa_apoio',
  'declaracao_tfd_ma',
];

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
}

export const seedCasasApoio: CasaApoioMock[] = [
  {
    id: 'casa-1',
    nome: 'Casa de Apoio Nossa Senhora da Vitória',
    endereco: 'Rua das Acácias, 145, Bairro Vila Mariana',
    cidadeUf: 'São Paulo - SP',
    contato: '(11) 3456-7890',
    responsavel: 'Irmã Terezinha Alves',
  },
  {
    id: 'casa-2',
    nome: 'Casa do Maranhense em Brasília',
    endereco: 'SHIS QI 15, Conjunto 4, Lago Sul',
    cidadeUf: 'Brasília - DF',
    contato: '(61) 3244-1180',
    responsavel: 'Marcos Vinícius Pereira',
  },
  {
    id: 'casa-3',
    nome: 'Abrigo Esperança Viva',
    endereco: 'Avenida Beira Mar, 2300, Praia de Iracema',
    cidadeUf: 'Fortaleza - CE',
    contato: '(85) 3222-4477',
    responsavel: 'Luciana Sampaio',
  },
  {
    id: 'casa-4',
    nome: 'Casa de Apoio São Lázaro',
    endereco: 'Rua Grande, 812, Centro',
    cidadeUf: 'São Luís - MA',
    contato: '(98) 3232-7788',
    responsavel: 'Antônio Carlos Ribeiro',
  },
];

/* ── Profissionais autorizadas ao conteúdo sigiloso ──────────────────────── */

/**
 * Conteúdo sigiloso é restrito às profissionais do Serviço Social. A direção
 * do TFD e os administradores enxergam que o instrumento existe (tipo, data,
 * autora e o selo), mas não abrem nem baixam o conteúdo. O protótipo não cria
 * fluxo digital de acesso excepcional: em demanda de auditoria, ouvidoria ou
 * pedido judicial, a solicitação continua sendo feita presencialmente à
 * equipe social, como ocorre hoje.
 */
export interface ProfissionalSocial {
  id: string;
  nome: string;
}

export const PROFISSIONAIS_SERVICO_SOCIAL: ProfissionalSocial[] = [
  { id: 'ss-1', nome: 'Ana Cláudia Mendes' },
  { id: 'ss-2', nome: 'Rosângela Barros Lima' },
];

/** CPFs e e-mails das duas profissionais autorizadas. No sistema real isso
 *  vira papel/permissão; no protótipo fica explícito para a validação. */
export const EMAILS_SERVICO_SOCIAL: string[] = [
  'ana.mendes@ses.ma.gov.br',
  'rosangela.lima@ses.ma.gov.br',
];

/**
 * Quem pode abrir o conteúdo de um instrumento sigiloso. Diferente do resto
 * do sistema, ser administrador NÃO libera: o sigilo é do documento, não do
 * nível de acesso.
 */
export function podeVerConteudoSigiloso(user: {
  email?: string | null;
  perfil?: string | null;
} | null | undefined): boolean {
  if (!user) return false;
  const email = (user.email ?? '').trim().toLowerCase();
  if (EMAILS_SERVICO_SOCIAL.includes(email)) return true;
  const perfil = (user.perfil ?? '').trim().toLowerCase();
  return perfil.includes('serviço social') || perfil.includes('servico social');
}
