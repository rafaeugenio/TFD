/**
 * Cálculo de diárias — Portaria SAS/MS nº 55/1999
 *
 * Fórmula canônica: (dias - 1) × valorDiariaCompleta + valorDiariaRetorno
 *
 * O último dia do período é sempre "sem pernoite" (apenas ajuda de alimentação/
 * transporte local, hoje R$ 8,40), e os demais dias são "com pernoite" (hoje
 * R$ 24,75). Os dois valores vêm dos parâmetros do sistema (`diaria_valor_completa`
 * e `diaria_valor_retorno`) — nunca devem ser hardcoded nas telas.
 *
 * Exemplos:
 *  - 1 dia  →                  8,40 = R$   8,40  (só ida-e-volta no mesmo dia)
 *  - 2 dias → 1 × 24,75 +      8,40 = R$  33,15
 *  - 5 dias → 4 × 24,75 +      8,40 = R$ 107,40
 *  - 11 dias → 10 × 24,75 +    8,40 = R$ 255,90
 */

export interface CalcDiariasInput {
  /** Número total de dias elegíveis (inclui o dia de retorno sem pernoite). */
  dias: number;
  /** Valor da diária completa (com pernoite). Vem do parâmetro `diaria_valor_completa`. */
  valorDiariaCompleta: number;
  /** Valor da diária de retorno (sem pernoite). Vem do parâmetro `diaria_valor_retorno`. */
  valorDiariaRetorno: number;
}

export interface CalcDiariasResult {
  /** Total em reais do período. */
  valorTotal: number;
  /** Quantidade de dias com pernoite (dias - 1, nunca negativo). */
  diasComPernoite: number;
  /** Quantidade de dias sem pernoite (sempre 1, ou 0 se dias === 0). */
  diasSemPernoite: number;
  /** Fórmula legível — ex.: "(5 - 1) × R$ 24,75 + R$ 8,40 = R$ 107,40". */
  formula: string;
}

function fmtBRL(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
}

/**
 * Calcula o valor total de um período de diárias conforme Portaria SAS/MS 55/1999.
 *
 * Regra: `(dias - 1) × valorDiariaCompleta + valorDiariaRetorno`.
 * Casos-borda:
 *  - `dias <= 0` retorna zero e fórmula vazia.
 *  - `dias === 1` retorna apenas `valorDiariaRetorno` (único dia sem pernoite).
 */
export function calcularTotalDiarias({
  dias,
  valorDiariaCompleta,
  valorDiariaRetorno,
}: CalcDiariasInput): CalcDiariasResult {
  if (!Number.isFinite(dias) || dias <= 0) {
    return { valorTotal: 0, diasComPernoite: 0, diasSemPernoite: 0, formula: '' };
  }

  const diasComPernoite = Math.max(0, dias - 1);
  const diasSemPernoite = 1;
  const valorTotal =
    diasComPernoite * valorDiariaCompleta + diasSemPernoite * valorDiariaRetorno;

  const formula =
    diasComPernoite > 0
      ? `(${dias} - 1) × ${fmtBRL(valorDiariaCompleta)} + ${fmtBRL(valorDiariaRetorno)} = ${fmtBRL(valorTotal)}`
      : `${fmtBRL(valorDiariaRetorno)} = ${fmtBRL(valorTotal)}`;

  return { valorTotal, diasComPernoite, diasSemPernoite, formula };
}
