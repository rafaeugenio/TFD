/**
 * Corpo padrão do despacho financeiro (4 parágrafos), como texto puro.
 *
 * Função pura, sem dependência de mock ou de banco, para ser usada nos dois
 * lados: no cliente (drawer, a partir do mock da solicitação) e no servidor
 * (página `/despacho/[id]`, a partir dos dados já carregados do banco). Assim
 * o mesmo modelo alimenta tanto a criação quanto a edição.
 *
 * O "por extenso" do valor fica como lacuna, porque depende de digitação.
 */
export function montarCorpoDespachoTemplate(args: {
  /** Nome do paciente (já em maiúsculas). */
  nome: string;
  /** Número do processo SEI (ou outro identificador disponível). */
  processo: string;
  /** Valor a pagar já formatado (ex.: "R$ 1.234,56") ou a lacuna "R$ ______". */
  valor: string;
}): string {
  const { nome, processo, valor } = args;
  return [
    `Encaminhamos a V. Sª o processo ${processo}, de solicitação de ajuda de custo do paciente ${nome}, cadastrado no Programa do Tratamento Fora do Domicílio – TFD.`,
    `Segue anexo o Recibo de Pagamento a Beneficiário – RPB, discriminando o tempo de permanência do paciente fora do domicílio conforme comprovantes.`,
    `O valor a ser pago é de ${valor} (____________________).`,
    `Expostas as informações pertinentes, encaminham-se os autos ao ordenador de despesas da Secretaria Adjunta de Assistência à Saúde – SAAS para as providências cabíveis.`,
  ].join('\n\n');
}
