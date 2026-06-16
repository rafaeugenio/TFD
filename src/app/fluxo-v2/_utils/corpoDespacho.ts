/**
 * Monta o corpo padrão do despacho financeiro a partir da solicitação.
 *
 * Espelha o modelo oficial do TFD/SES, já preenchido com os dados da
 * solicitação: nome do paciente (em maiúsculas), número do processo SEI e o
 * valor total calculado do financeiro (ajuda de custo + passagens + adicionais).
 * O "por extenso" do valor fica como lacuna, porque depende de digitação. O
 * texto é só para o operador confirmar e seguir; editável antes de gerar.
 *
 * Assunto, "DESPACHO Nº" e o destinatário NÃO entram aqui: são cabeçalho do
 * documento, renderizados automaticamente em `/despacho/[id]` a partir dos
 * dados, para não duplicar com o corpo editável.
 */

import { totaisFinanceiros } from './totaisFinanceiros';
import type { SolicitacaoMock } from '@/core/mocks/fluxo-v2-v3-seed';

function formatarBRL(valor: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
}

export function montarCorpoDespacho(s: SolicitacaoMock): string {
  const nome = (s.paciente?.nome ?? '[NOME DO PACIENTE]').toUpperCase();
  const processo = s.numeroSEI?.trim() || s.numero || '____';
  const total = totaisFinanceiros(s).totalGeral;
  const valor = total > 0 ? formatarBRL(total) : 'R$ ______';

  return [
    `Encaminhamos a V. Sª o processo ${processo}, de solicitação de ajuda de custo do paciente ${nome}, cadastrado no Programa do Tratamento Fora do Domicílio – TFD.`,
    `Segue anexo o Recibo de Pagamento a Beneficiário – RPB, discriminando o tempo de permanência do paciente fora do domicílio conforme comprovantes.`,
    `O valor a ser pago é de ${valor} (____________________).`,
    `Expostas as informações pertinentes, encaminham-se os autos ao ordenador de despesas da Secretaria Adjunta de Assistência à Saúde – SAAS para as providências cabíveis.`,
  ].join('\n\n');
}
