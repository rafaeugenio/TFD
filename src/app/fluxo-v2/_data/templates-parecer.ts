/* -------------------------------------------------------------------------- */
/*  Templates de parecer médico — Fluxo v2                                    */
/*  Mock-only. Inseríveis no drawer/bloco de parecer. O médico pode editar.   */
/*                                                                            */
/*  Modelos baseados no Word oficial do médico regulador. Suportam            */
/*  placeholders auto-preenchidos com dados da solicitação.                   */
/*                                                                            */
/*  Convenção:                                                                */
/*  - Campos AUTO-PREENCHIDOS usam a sintaxe {{paciente.x}} ou {{solicitacao  */
/*    .x}} e são substituídos pelos dados reais ao inserir o template.        */
/*  - Campos EDITÁVEIS PELO MÉDICO usam labels em CAIXA ALTA entre colchetes  */
/*    (ex.: [NOME DO HOSPITAL]) — facilita identificar visualmente o que      */
/*    precisa ser preenchido.                                                 */
/*                                                                            */
/*  Cobertura: 2 templates por tipo (1 deferido + 1 indeferido) — total 12.   */
/* -------------------------------------------------------------------------- */

import type { DecisaoParecer, TipoParecer, SolicitacaoMock } from '@/core/mocks/fluxo-v2-v3-seed';
import { agendamentoConfirmado, dataDoAgendamento } from '../_utils/agendamento';

export interface TemplateParecer {
  id: string;
  tipo: TipoParecer;
  decisao: DecisaoParecer;
  titulo: string;
  texto: string;
}

/**
 * Variante de texto sobre disponibilidade de serviço no Estado do Maranhão.
 * Aplicada em templates deferidos de TFD completo e Ajuda de custo —
 * substitui o placeholder `{{servico_ma}}` no texto inserido.
 */
export type VarianteServicoMA = 'sem_servico_ma' | 'com_servico_ma';

export const VARIANTE_SERVICO_MA_LABEL: Record<VarianteServicoMA, string> = {
  sem_servico_ma: 'Maranhão NÃO dispõe de unidade habilitada',
  com_servico_ma: 'Maranhão dispõe, mas há justificativa para deslocamento',
};

/** Texto inserido no parecer para cada variante. Versões específicas por
 *  tipo (TFD completo vs Ajuda de custo) — extraídas do template oficial. */
export const VARIANTES_SERVICO_MA: Record<TipoParecer, Partial<Record<VarianteServicoMA, string>>> = {
  tfd_completo: {
    sem_servico_ma:
      'Ressalta-se que o Estado do Maranhão não dispõe de unidade habilitada para o acompanhamento do paciente na condição descrita, inviabilizando a realização do tratamento na rede estadual.',
    com_servico_ma:
      'Embora o Estado do Maranhão disponha de unidade habilitada para o acompanhamento da referida condição, observa-se a existência de vínculo assistencial previamente estabelecido do paciente com o serviço de destino, sendo recomendada a manutenção do seguimento naquele local, a fim de evitar prejuízo à continuidade do cuidado.',
  },
  apenas_ajuda: {
    sem_servico_ma:
      'Ressalta-se que o Estado do Maranhão não dispõe de unidade habilitada para o tratamento da condição apresentada no âmbito do SUS, inviabilizando a assistência na rede estadual.',
    com_servico_ma:
      'Ressalta-se que o Estado do Maranhão dispõe de unidade habilitada; contudo, observa-se a existência de vínculo assistencial previamente estabelecido com serviço localizado em outro estado, sendo recomendada a manutenção do seguimento fora do domicílio, a fim de evitar prejuízo à continuidade do cuidado.',
  },
  sem_agendamento: {},
  apenas_passagem: {},
  prorrogacao: {},
  medife: {},
};

/** Variante "serviço no MA" só faz sentido em pareceres deferidos.
 *  Indeferidos têm template único, sem opção. */
export function templateExigeVarianteServicoMA(
  _tipo: TipoParecer | undefined,
  decisao: DecisaoParecer,
): boolean {
  return decisao === 'deferido';
}

export const templatesParecer: TemplateParecer[] = [
  /* Apenas 2 templates oficiais — um deferido (com variante de serviço no MA)
   * e um indeferido. O campo `tipo` é mantido por compatibilidade com seeds
   * antigas, mas a UI não usa mais select de tipo. */

  {
    id: 'tpl-deferido',
    tipo: 'tfd_completo',
    decisao: 'deferido',
    titulo: 'Parecer deferido',
    texto:
`Processo contendo solicitação de concessão de passagens e ajuda de custo no âmbito do Tratamento Fora do Domicílio (TFD) para {{paciente.nome}}, sexo {{paciente.sexo}}, nascido em {{paciente.dataNascimento}}, residente no município de {{paciente.municipio}}.

Conforme Laudo Médico emitido em {{solicitacao.dataLaudo}}, por profissional especialista de unidade habilitada, o paciente apresenta diagnóstico de [DIAGNÓSTICO], com indicação de [PROCEDIMENTO/ACOMPANHAMENTO ESPECÍFICO].

A presente solicitação destina-se à realização de acompanhamento ambulatorial no dia {{agendamento.data}}, no serviço {{agendamento.unidade}}, visando a adequada condução terapêutica do caso.

{{servico_ma}}

Considerando a indicação por especialista, a necessidade clínica do paciente e a garantia da integralidade da assistência à saúde, o caso preenche os critérios para concessão de TFD.

Diante do exposto, defere-se a solicitação de passagens e ajuda de custo, {{solicitacao.acompanhantes}}, encaminhando-se ao setor administrativo competente para adoção das providências cabíveis.`,
  },

  {
    id: 'tpl-indeferido',
    tipo: 'tfd_completo',
    decisao: 'indeferido',
    titulo: 'Parecer indeferido',
    texto:
`Processo contendo solicitação no âmbito do Tratamento Fora do Domicílio (TFD) para {{paciente.nome}}, sexo {{paciente.sexo}}, nascido em {{paciente.dataNascimento}}, residente no município de {{paciente.municipio}}.

Conforme Laudo Médico emitido em {{solicitacao.dataLaudo}}, o paciente apresenta diagnóstico de [DIAGNÓSTICO].

Considerando que [JUSTIFICATIVA DO INDEFERIMENTO — ex.: o Estado do Maranhão possui unidade habilitada para o tratamento, podendo o atendimento ser realizado na rede local; documentação insuficiente; ausência de indicação clínica para encaminhamento extra-domiciliar].

Diante do exposto, indefere-se o presente pedido, encaminhando-se ao setor administrativo competente para comunicação ao paciente.`,
  },
];


/* -------------------------------------------------------------------------- */
/*  Auto-preenchimento de placeholders                                        */
/* -------------------------------------------------------------------------- */

const TIPO_SOLICITACAO_LABEL: Record<TipoParecer, string> = {
  tfd_completo: 'passagem e ajuda de custo',
  sem_agendamento: 'TFD sem agendamento',
  apenas_ajuda: 'ajuda de custo',
  apenas_passagem: 'passagem',
  prorrogacao: 'prorrogação de TFD',
  medife: 'Medife',
};

function formatarDataBR(iso?: string): string {
  if (!iso) return '___/___/_____';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function sexoExtenso(sexo?: 'M' | 'F'): string {
  if (sexo === 'M') return 'masculino';
  if (sexo === 'F') return 'feminino';
  return '[SEXO]';
}

/**
 * Data e unidade do agendamento — puxadas da tentativa confirmada da própria
 * solicitação (`agendamentoConfirmado`). Quando ainda não há agendamento
 * registrado, o template não pode sugerir um dado inexistente: entra um
 * marcador em CAIXA ALTA entre colchetes, no mesmo padrão dos demais campos
 * editáveis, para o médico completar manualmente.
 */
function textoAgendamentoData(s?: SolicitacaoMock): string {
  const ag = s ? agendamentoConfirmado(s) : undefined;
  if (!ag) return '[SEM AGENDAMENTO REGISTRADO — INFORME A DATA]';
  return formatarDataBR(dataDoAgendamento(ag).slice(0, 10));
}

function textoAgendamentoUnidade(s?: SolicitacaoMock): string {
  const ag = s ? agendamentoConfirmado(s) : undefined;
  if (!ag || !ag.unidade.trim()) return '[SEM AGENDAMENTO REGISTRADO — INFORME A UNIDADE DE SAÚDE DE DESTINO]';
  return ag.unidade;
}

const NUMERO_EXTENSO_ACOMPANHANTES = [
  'zero', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez',
];

function formatarQuantidadeAcompanhantes(n: number): string {
  const extenso = NUMERO_EXTENSO_ACOMPANHANTES[n] ?? String(n);
  return `${String(n).padStart(2, '0')} (${extenso})`;
}

/** Une nomes em lista com "e" antes do último item, no padrão do português. */
function listarNomes(nomes: string[]): string {
  if (nomes.length <= 1) return nomes[0] ?? '';
  return `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}`;
}

/**
 * Texto sobre acompanhantes reflete o cadastro real da solicitação — trata
 * os três casos (nenhum, um, mais de um) com a concordância de número
 * correta e cita os nomes cadastrados.
 */
function textoAcompanhantes(s?: SolicitacaoMock): string {
  const acompanhantes = s?.acompanhantes ?? [];
  if (acompanhantes.length === 0) return 'sem acompanhante autorizado';
  const nomes = listarNomes(acompanhantes.map((a) => a.nome));
  if (acompanhantes.length === 1) {
    return `com autorização de 01 (um) acompanhante (${nomes})`;
  }
  return `com autorização de ${formatarQuantidadeAcompanhantes(acompanhantes.length)} acompanhantes (${nomes})`;
}

/**
 * Substitui os placeholders `{{...}}` do texto pelo valor real da solicitação.
 * Os campos auto-preenchidos NÃO viram labels — entram como texto comum,
 * porque o médico não precisa editá-los. Os campos editáveis já vêm como
 * `[LABEL EM CAIXA ALTA]` no template e permanecem como tal para o médico
 * identificar visualmente.
 */
export interface MedicoContextoTemplate {
  nome?: string;
  crm?: string;
  crmUf?: string;
  especialidade?: string;
}

export function aplicarPlaceholders(
  texto: string,
  s?: SolicitacaoMock,
  tipo?: TipoParecer,
  medico?: MedicoContextoTemplate,
  varianteServicoMA?: VarianteServicoMA,
): string {
  const p = s?.paciente;
  const crmLinha =
    medico?.crm && medico?.crmUf
      ? `CRM ${medico.crm}/${medico.crmUf}`
      : medico?.crm
        ? `CRM ${medico.crm}`
        : '[CRM]';
  const map: Record<string, string> = {
    '{{paciente.nome}}': p?.nome ?? '[NOME DO PACIENTE]',
    '{{paciente.sexo}}': sexoExtenso(p?.sexo),
    '{{paciente.dataNascimento}}': formatarDataBR(p?.dataNascimento),
    '{{paciente.municipio}}': p?.municipio ?? '[MUNICÍPIO]',
    '{{solicitacao.dataLaudo}}': formatarDataBR(s?.dataLaudo),
    '{{solicitacao.diagnostico}}': '[DIAGNÓSTICO]',
    '{{solicitacao.tipoSolicitacao}}': tipo ? TIPO_SOLICITACAO_LABEL[tipo] : '[TIPO DE SOLICITAÇÃO]',
    '{{medico.nome}}': medico?.nome?.trim() ? medico.nome : '[NOME DO MÉDICO]',
    '{{medico.crm}}': crmLinha,
    '{{medico.especialidade}}': medico?.especialidade?.trim() ? medico.especialidade : '[ESPECIALIDADE]',
    '{{agendamento.data}}': textoAgendamentoData(s),
    '{{agendamento.unidade}}': textoAgendamentoUnidade(s),
    '{{solicitacao.acompanhantes}}': textoAcompanhantes(s),
    '{{servico_ma}}':
      (tipo && varianteServicoMA && VARIANTES_SERVICO_MA[tipo]?.[varianteServicoMA]) ??
      '[SELECIONE A SITUAÇÃO DO SERVIÇO NO MA]',
  };
  return Object.entries(map).reduce(
    (acc, [k, v]) => acc.split(k).join(v),
    texto,
  );
}
