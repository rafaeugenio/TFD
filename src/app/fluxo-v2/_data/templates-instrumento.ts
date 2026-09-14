/* -------------------------------------------------------------------------- */
/*  Templates dos instrumentos do Serviço Social (spec de 14/09/2026)         */
/*                                                                            */
/*  Mesma convenção dos templates de parecer médico:                         */
/*  - Campos AUTO-PREENCHIDOS com os dados já existentes da solicitação, do   */
/*    paciente e do acompanhante são resolvidos ao escolher o tipo.           */
/*  - Campos que a profissional preenche aparecem em CAIXA ALTA entre         */
/*    colchetes, para ficar visível o que falta.                              */
/*                                                                            */
/*  As linhas de assinatura existem apenas como referência visual do          */
/*  documento. O protótipo não faz assinatura eletrônica nem envio ao SEI.    */
/* -------------------------------------------------------------------------- */

import {
  STATUS_LABEL,
  type SolicitacaoMock,
} from '@/core/mocks/fluxo-v2-v3-seed';
import type { CasaApoioMock, TipoInstrumento } from '@/core/mocks/servico-social-seed';

/* ── Helpers de formatação ──────────────────────────────────────────────── */

function dataBR(iso: string | undefined): string {
  if (!iso) return '';
  const somenteData = iso.slice(0, 10);
  const [y, m, d] = somenteData.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function hojeBR(): string {
  return new Date().toLocaleDateString('pt-BR');
}

function horaAgora(): string {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Unidade de referência do atendimento: a unidade do agendamento confirmado
 *  quando existe, senão a unidade que emitiu o laudo. */
function unidadeReferencia(s: SolicitacaoMock): string {
  const tentativas = s.agendamento?.tentativas ?? [];
  const confirmada = tentativas.find((t) => t.desfecho === 'agendamento_confirmado');
  if (confirmada?.unidade) return confirmada.unidade;
  if (s.laudoOrigemUnidade) return s.laudoOrigemUnidade;
  return '[UNIDADE DE REFERÊNCIA]';
}

function dataDoAtendimento(s: SolicitacaoMock): string {
  const tentativas = s.agendamento?.tentativas ?? [];
  const confirmada = tentativas
    .filter((t) => t.desfecho === 'agendamento_confirmado' && t.dataAgendamento)
    .sort((a, b) => (a.dataAgendamento ?? '').localeCompare(b.dataAgendamento ?? ''))[0];
  if (confirmada?.dataAgendamento) return dataBR(confirmada.dataAgendamento);
  return '[DATA DO ATENDIMENTO]';
}

/** Primeira viagem de ida ativa — base do embarque na Declaração TFD-MA. */
function viagemIda(s: SolicitacaoMock) {
  return s.viagens
    .filter((v) => v.ativa !== false && v.tipo === 'ida')
    .sort((a, b) => a.data.localeCompare(b.data))[0];
}

function viagemVolta(s: SolicitacaoMock) {
  return s.viagens
    .filter((v) => v.ativa !== false && v.tipo === 'volta')
    .sort((a, b) => a.data.localeCompare(b.data))[0];
}

function textoAcompanhantes(s: SolicitacaoMock): string {
  if (s.acompanhantes.length === 0) return 'Sem acompanhante indicado';
  return s.acompanhantes
    .map((a) => `${a.nome} (${a.vinculo}, CPF ${a.cpf})`)
    .join('; ');
}

function periodoAtendimento(s: SolicitacaoMock): string {
  const ida = viagemIda(s);
  const volta = viagemVolta(s);
  if (ida && volta) return `${dataBR(ida.data)} a ${dataBR(volta.data)}`;
  if (ida) return `a partir de ${dataBR(ida.data)}, sem data de retorno definida`;
  return '[PERÍODO DO ATENDIMENTO]';
}

function enderecoCompleto(s: SolicitacaoMock): string {
  const e = s.paciente.endereco;
  if (!e) return '[ENDEREÇO]';
  const partes = [
    [e.logradouro, e.numero].filter(Boolean).join(', '),
    e.bairro,
    e.cep,
  ].filter(Boolean);
  return partes.join(' - ') || '[ENDEREÇO]';
}

/* ── Geração dos templates ──────────────────────────────────────────────── */

export interface ContextoInstrumento {
  s: SolicitacaoMock;
  /** Nome da assistente social que está criando o documento. */
  profissional: string;
  /** Só no encaminhamento — quando a profissional já escolheu a casa. */
  casa?: CasaApoioMock;
}

const LINHA = '________________________________________';

function assinaturas(profissional: string, comAcompanhante: boolean): string {
  const blocos = [
    `${LINHA}\nAssinatura do paciente`,
    comAcompanhante ? `${LINHA}\nAssinatura do acompanhante` : null,
    `${LINHA}\n${profissional}\nAssistente Social - SES/MA`,
  ].filter(Boolean);
  return blocos.join('\n\n');
}

function parecerSocial({ s, profissional }: ContextoInstrumento): string {
  const p = s.paciente;
  return [
    'PARECER SOCIAL',
    '',
    'IDENTIFICAÇÃO DO PACIENTE',
    `Nome: ${p.nome}`,
    `CPF: ${p.cpf}`,
    `Cartão SUS: ${p.cns ?? '[CARTÃO SUS]'}`,
    `Data de nascimento: ${dataBR(p.dataNascimento)}`,
    `Município de origem: ${p.municipio}`,
    `Endereço: ${enderecoCompleto(s)}`,
    '',
    'CONTATOS',
    `Telefone: ${p.telefone}`,
    `E-mail: ${p.email ?? 'Não informado'}`,
    `Acompanhante: ${textoAcompanhantes(s)}`,
    '',
    'DADOS DA SOLICITAÇÃO',
    `Número da solicitação: ${s.numero}`,
    `Situação atual: ${STATUS_LABEL[s.status]}`,
    `Unidade de referência: ${unidadeReferencia(s)}`,
    'Diagnóstico: [DIAGNÓSTICO]',
    '',
    'ATENDIMENTO',
    `Data do atendimento: ${hojeBR()}`,
    `Horário do atendimento: ${horaAgora()}`,
    '',
    'ANÁLISE SOCIAL',
    '[DESCREVER A SITUAÇÃO SOCIOECONÔMICA, A REDE DE APOIO E OS ASPECTOS RELEVANTES OBSERVADOS NO ATENDIMENTO]',
    '',
    'CONCLUSÃO E ORIENTAÇÃO',
    '[REGISTRAR A CONCLUSÃO DA ANÁLISE E A ORIENTAÇÃO À EQUIPE E À FAMÍLIA]',
    '',
    `São Luís - MA, ${hojeBR()}.`,
    '',
    assinaturas(profissional, s.acompanhantes.length > 0),
  ].join('\n');
}

function encaminhamentoCasaApoio({ s, profissional, casa }: ContextoInstrumento): string {
  const p = s.paciente;
  const casaLinhas = casa
    ? [
        `Casa de apoio: ${casa.nome}`,
        `Endereço: ${casa.endereco}${casa.cidadeUf ? ` - ${casa.cidadeUf}` : ''}`,
        `Contato: ${casa.contato}`,
        `Responsável: ${casa.responsavel}`,
      ]
    : ['Casa de apoio: [SELECIONE A CASA DE APOIO OU DEIXE EM BRANCO]'];

  return [
    'ENCAMINHAMENTO PARA CASA DE APOIO',
    '',
    'IDENTIFICAÇÃO DO PACIENTE',
    `Nome: ${p.nome}`,
    `Data de nascimento: ${dataBR(p.dataNascimento)}`,
    `CPF: ${p.cpf}`,
    `Cartão SUS: ${p.cns ?? '[CARTÃO SUS]'}`,
    `Município de origem: ${p.municipio}`,
    `Telefone: ${p.telefone}`,
    '',
    'ATENDIMENTO',
    `Número da solicitação: ${s.numero}`,
    `Unidade de referência: ${unidadeReferencia(s)}`,
    `Período do atendimento: ${periodoAtendimento(s)}`,
    `Acompanhante: ${textoAcompanhantes(s)}`,
    '',
    'DESTINO',
    ...casaLinhas,
    '',
    'JUSTIFICATIVA SOCIAL',
    '[DESCREVER A JUSTIFICATIVA SOCIAL QUE FUNDAMENTA O ENCAMINHAMENTO]',
    '',
    'OBSERVAÇÕES',
    '[REGISTRAR ORIENTAÇÕES, RESTRIÇÕES OU INFORMAÇÕES QUE A CASA DE APOIO PRECISE SABER]',
    '',
    `São Luís - MA, ${hojeBR()}.`,
    '',
    assinaturas(profissional, s.acompanhantes.length > 0),
  ].join('\n');
}

function declaracaoTfdMa({ s, profissional }: ContextoInstrumento): string {
  const p = s.paciente;
  const ida = viagemIda(s);
  const volta = viagemVolta(s);
  const temAcompanhante = s.acompanhantes.length > 0;

  return [
    'DECLARAÇÃO TFD-MA',
    '',
    'IDENTIFICAÇÃO DO PACIENTE',
    `Nome: ${p.nome}`,
    `CPF: ${p.cpf}`,
    `Cartão SUS: ${p.cns ?? '[CARTÃO SUS]'}`,
    `Município de origem: ${p.municipio}`,
    '',
    'ATENDIMENTO',
    `Número da solicitação: ${s.numero}`,
    `Unidade de referência: ${unidadeReferencia(s)}`,
    `Data do atendimento: ${dataDoAtendimento(s)}`,
    temAcompanhante ? `Acompanhante: ${textoAcompanhantes(s)}` : 'Acompanhante: Sem acompanhante indicado',
    '',
    'DESLOCAMENTO',
    `Data prevista de embarque: ${ida ? dataBR(ida.data) : '[DATA PREVISTA DE EMBARQUE]'}`,
    `Local de embarque: ${ida?.origem ?? '[LOCAL DE EMBARQUE]'}`,
    `Destino: ${ida?.destino ?? '[DESTINO]'}`,
    `Data prevista de retorno: ${volta ? dataBR(volta.data) : '[DATA PREVISTA DE RETORNO]'}`,
    '',
    'DECLARAÇÃO',
    `Declaro para os devidos fins que o(a) paciente acima identificado(a) encontra-se em Tratamento Fora do Domicílio (TFD) pelo Estado do Maranhão, com atendimento na unidade de referência indicada${temAcompanhante ? ', acompanhado(a) pela pessoa relacionada nesta declaração' : ''}.`,
    '',
    '[ACRESCENTAR OBSERVAÇÕES, QUANDO NECESSÁRIO]',
    '',
    `São Luís - MA, ${hojeBR()}.`,
    '',
    assinaturas(profissional, temAcompanhante),
  ].join('\n');
}

/**
 * Monta o conteúdo inicial do instrumento com os dados já existentes da
 * solicitação, do paciente e do acompanhante. O texto volta editável: a
 * profissional ajusta o que for necessário antes de salvar.
 */
export function montarTemplateInstrumento(
  tipo: TipoInstrumento,
  ctx: ContextoInstrumento,
): string {
  switch (tipo) {
    case 'parecer_social':
      return parecerSocial(ctx);
    case 'encaminhamento_casa_apoio':
      return encaminhamentoCasaApoio(ctx);
    case 'declaracao_tfd_ma':
      return declaracaoTfdMa(ctx);
    default:
      return '';
  }
}

/** Só o encaminhamento oferece a escolha de casa de apoio. */
export function tipoUsaCasaApoio(tipo: TipoInstrumento): boolean {
  return tipo === 'encaminhamento_casa_apoio';
}
