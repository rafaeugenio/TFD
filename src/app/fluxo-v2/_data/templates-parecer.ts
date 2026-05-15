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

export interface TemplateParecer {
  id: string;
  tipo: TipoParecer;
  decisao: DecisaoParecer;
  titulo: string;
  texto: string;
}

export const templatesParecer: TemplateParecer[] = [
  /* ============================== DEFERIDOS ============================== */

  {
    id: 'tpl-tfd-completo-def',
    tipo: 'tfd_completo',
    decisao: 'deferido',
    titulo: 'TFD (passagem + ajuda de custo) — Deferido',
    texto:
`Processo contendo solicitação de passagem e ajuda de custo para {{paciente.nome}}, {{paciente.sexo}}, nascido em {{paciente.dataNascimento}}, procedente de {{paciente.municipio}}. Segundo Laudo Médico emitido em {{solicitacao.dataLaudo}}, usuário tem diagnóstico de [DIAGNÓSTICO]. Solicitação de [TIPO DE ATENDIMENTO].

Processo para realização de acompanhamento ambulatorial em [CIDADE/ESTADO DESTINO] no Hospital [NOME DO HOSPITAL].

Considerando que o Estado do Maranhão possui unidade habilitada para acompanhamento de paciente em [ESPECIFICAR ESPECIALIDADE].

Considerando que o laudo foi emitido por especialista de unidade habilitada e para não prejudicar o paciente, o processo de passagem e ajuda de custo é deferido. Libero 01 (um) acompanhante.

Encaminho ao serviço administrativo do TFD para providências cabíveis.`,
  },

  {
    id: 'tpl-sem-agendamento-def',
    tipo: 'sem_agendamento',
    decisao: 'deferido',
    titulo: 'Processo sem agendamento — Deferido',
    texto:
`Processo contendo solicitação de Tratamento fora do domicílio (TFD) para {{paciente.nome}}, {{paciente.sexo}}, nascido em {{paciente.dataNascimento}}, procedente de {{paciente.municipio}}. Segundo Laudo Médico emitido em {{solicitacao.dataLaudo}}, usuário tem diagnóstico de [DIAGNÓSTICO]. Solicitação de [TIPO DE ATENDIMENTO].

Processo sem agendamento.

Considerando que o Estado do Maranhão não possui unidade habilitada para realização de [ESPECIFICAR PROCEDIMENTO].

Considerando que o laudo foi emitido por especialista.

Processo de TFD deferido.

Encaminho ao serviço administrativo da CET para providências cabíveis.`,
  },

  {
    id: 'tpl-apenas-ajuda-def',
    tipo: 'apenas_ajuda',
    decisao: 'deferido',
    titulo: 'Apenas ajuda de custo — Deferido',
    texto:
`Processo contendo solicitação de ajuda de custo para {{paciente.nome}}, {{paciente.sexo}}, nascido em {{paciente.dataNascimento}}, procedente de {{paciente.municipio}}. Segundo Laudo Médico emitido em {{solicitacao.dataLaudo}}, usuário tem diagnóstico de [DIAGNÓSTICO]. Solicitação de [TIPO DE ATENDIMENTO].

Processo para liberação de ajuda de custo referente ao período de [DATA DE INÍCIO] a [DATA DE FIM], paciente segue em acompanhamento ambulatorial no Hospital [NOME DO HOSPITAL].

Considerando que o Estado do Maranhão possui unidade habilitada para acompanhamento de pacientes submetidos a [ESPECIFICAR TRATAMENTO], o Hospital [NOME DA UNIDADE HABILITADA].

Considerando que o laudo foi emitido por especialista, porém de unidade não habilitada.

Considerando o vínculo do paciente com serviço de outro estado.

Para não prejudicar o paciente, o processo de ajuda de custo é deferido. Libero 01 (um) acompanhante.

Encaminho ao serviço administrativo do TFD para providências cabíveis.`,
  },

  {
    id: 'tpl-apenas-passagem-def',
    tipo: 'apenas_passagem',
    decisao: 'deferido',
    titulo: 'Apenas passagem — Deferido',
    texto:
`Processo contendo solicitação de passagem para {{paciente.nome}}, {{paciente.sexo}}, nascido em {{paciente.dataNascimento}}, procedente de {{paciente.municipio}}. Segundo Laudo Médico emitido em {{solicitacao.dataLaudo}}, usuário tem diagnóstico de [DIAGNÓSTICO].

Processo para realização de [ESPECIFICAR PROCEDIMENTO] em [NOME DO HOSPITAL].

Considerando que o Estado do Maranhão não dispõe de [ESPECIFICAR ESPECIALIDADE] no município de origem do paciente, e considerando que o laudo foi emitido por especialista, o processo de passagem é deferido. Libero 01 (um) acompanhante.

Encaminho ao serviço administrativo do TFD para providências cabíveis.`,
  },

  {
    id: 'tpl-prorrogacao-def',
    tipo: 'prorrogacao',
    decisao: 'deferido',
    titulo: 'Prorrogação — Deferido',
    texto:
`Processo contendo solicitação de prorrogação de TFD para {{paciente.nome}}, {{paciente.sexo}}, nascido em {{paciente.dataNascimento}}, procedente de {{paciente.municipio}}.

Considerando o relatório médico atualizado anexado e a continuidade do acompanhamento ambulatorial em [NOME DO HOSPITAL], a prorrogação do período de [DATA DE INÍCIO] a [DATA DE FIM] é deferida.

Libero 01 (um) acompanhante.

Encaminho ao serviço administrativo do TFD para providências cabíveis.`,
  },

  {
    id: 'tpl-medife-def',
    tipo: 'medife',
    decisao: 'deferido',
    titulo: 'Medife — Autorizado',
    texto:
`Autorização de transporte aéreo médico (Medife) para {{paciente.nome}}, {{paciente.sexo}}, nascido em {{paciente.dataNascimento}}, procedente de {{paciente.municipio}}.

Considerando o quadro clínico descrito pelo médico assistente, com diagnóstico de [DIAGNÓSTICO], e a necessidade de transporte com assistência médica em razão de [JUSTIFICATIVA CLÍNICA], autorizo o uso do Medife.

Encaminho ao serviço administrativo do TFD para providências cabíveis com a companhia aérea.`,
  },

  /* ============================== INDEFERIDOS ============================ */

  {
    id: 'tpl-tfd-completo-ind',
    tipo: 'tfd_completo',
    decisao: 'indeferido',
    titulo: 'TFD (passagem + ajuda de custo) — Indeferido',
    texto:
`Processo contendo solicitação de passagem e ajuda de custo para {{paciente.nome}}, {{paciente.sexo}}, nascido em {{paciente.dataNascimento}}, procedente de {{paciente.municipio}}. Segundo Laudo Médico emitido em {{solicitacao.dataLaudo}}, usuário tem diagnóstico de [DIAGNÓSTICO].

Considerando que o Estado do Maranhão possui unidade habilitada para [ESPECIFICAR ESPECIALIDADE/PROCEDIMENTO], podendo o atendimento ser realizado na rede local.

Considerando [JUSTIFICATIVA DO INDEFERIMENTO].

Indefiro o presente pedido. Não há indicação de encaminhamento extra-domiciliar no momento.

Encaminho ao serviço administrativo do TFD para comunicação ao paciente.`,
  },

  {
    id: 'tpl-sem-agendamento-ind',
    tipo: 'sem_agendamento',
    decisao: 'indeferido',
    titulo: 'Processo sem agendamento — Indeferido',
    texto:
`Processo contendo solicitação de TFD sem agendamento para {{paciente.nome}}, {{paciente.sexo}}, nascido em {{paciente.dataNascimento}}, procedente de {{paciente.municipio}}.

Considerando que o Estado do Maranhão possui unidade habilitada para realização de [ESPECIFICAR PROCEDIMENTO], dispensando encaminhamento extra-estadual.

Considerando [JUSTIFICATIVA DO INDEFERIMENTO].

Indefiro o presente pedido. Recomendo encaminhamento à rede de [ESPECIFICAR REDE/UNIDADE LOCAL].

Encaminho ao serviço administrativo do TFD para comunicação ao paciente.`,
  },

  {
    id: 'tpl-apenas-ajuda-ind',
    tipo: 'apenas_ajuda',
    decisao: 'indeferido',
    titulo: 'Apenas ajuda de custo — Indeferido',
    texto:
`Processo contendo solicitação de ajuda de custo para {{paciente.nome}}, {{paciente.sexo}}, nascido em {{paciente.dataNascimento}}, procedente de {{paciente.municipio}}.

Considerando que [JUSTIFICATIVA DO INDEFERIMENTO — ex.: tratamento já disponível na rede do MA, paciente sem vínculo com serviço de referência, documentação insuficiente].

Indefiro o presente pedido de ajuda de custo.

Encaminho ao serviço administrativo do TFD para comunicação ao paciente.`,
  },

  {
    id: 'tpl-apenas-passagem-ind',
    tipo: 'apenas_passagem',
    decisao: 'indeferido',
    titulo: 'Apenas passagem — Indeferido',
    texto:
`Processo contendo solicitação de passagem para {{paciente.nome}}, {{paciente.sexo}}, nascido em {{paciente.dataNascimento}}, procedente de {{paciente.municipio}}. Segundo Laudo Médico emitido em {{solicitacao.dataLaudo}}, usuário tem diagnóstico de [DIAGNÓSTICO].

Considerando que [JUSTIFICATIVA DO INDEFERIMENTO — ex.: existência de unidade habilitada no Estado, ausência de indicação clínica para encaminhamento, laudo fora dos requisitos].

Indefiro o presente pedido de passagem.

Encaminho ao serviço administrativo do TFD para comunicação ao paciente.`,
  },

  {
    id: 'tpl-prorrogacao-ind',
    tipo: 'prorrogacao',
    decisao: 'indeferido',
    titulo: 'Prorrogação — Indeferido',
    texto:
`Processo contendo solicitação de prorrogação de TFD para {{paciente.nome}}, {{paciente.sexo}}, nascido em {{paciente.dataNascimento}}, procedente de {{paciente.municipio}}.

Considerando que [JUSTIFICATIVA DO INDEFERIMENTO — ex.: relatório médico não justifica continuidade, tratamento concluído, ausência de plano terapêutico atualizado].

Indefiro o presente pedido de prorrogação.

Recomendo retorno do paciente ao município de origem e acompanhamento na rede local.

Encaminho ao serviço administrativo do TFD para comunicação ao paciente.`,
  },

  {
    id: 'tpl-medife-ind',
    tipo: 'medife',
    decisao: 'indeferido',
    titulo: 'Medife — Indeferido',
    texto:
`Pedido de autorização de transporte aéreo médico (Medife) para {{paciente.nome}}, {{paciente.sexo}}, nascido em {{paciente.dataNascimento}}, procedente de {{paciente.municipio}}.

Considerando que [JUSTIFICATIVA DO INDEFERIMENTO — ex.: quadro clínico estável, ausência de necessidade de assistência médica em voo, documentação insuficiente].

Indefiro o presente pedido. O paciente pode realizar o deslocamento por transporte aéreo regular sem necessidade de Medife.

Encaminho ao serviço administrativo do TFD para providências cabíveis.`,
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
  };
  return Object.entries(map).reduce(
    (acc, [k, v]) => acc.split(k).join(v),
    texto,
  );
}
