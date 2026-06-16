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
import { montarCorpoDespachoTemplate } from '@/core/despacho/corpoTemplate';
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

  return montarCorpoDespachoTemplate({ nome, processo, valor });
}
