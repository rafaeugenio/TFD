/* -------------------------------------------------------------------------- */
/*  Saldo histórico de ajuda de custo (Ata 7 §4.4.8)                          */
/*                                                                            */
/*  Registra a diferença acumulada entre valor calculado e valor pago em      */
/*  ajudas de custo já concluídas. Usado pra mostrar "acerto de débito" em    */
/*  solicitações futuras do mesmo paciente.                                   */
/*                                                                            */
/*  Convenção:                                                                */
/*  - saldo POSITIVO  → paciente recebeu A MAIS (deve compensar no próximo)   */
/*  - saldo NEGATIVO  → paciente recebeu A MENOS (TFD deve compensar)         */
/*  - saldo ZERO      → tudo certo                                            */
/* -------------------------------------------------------------------------- */

import {
  calcularValorAjuda,
  type SolicitacaoMock,
  type AjudaCustoMock,
} from '@/core/mocks/fluxo-v2-v3-seed';

export interface DiferencaAjuda {
  ajudaId: string;
  solicitacaoNumero: string;
  calculado: number;
  pago: number;
  diferenca: number; // pago - calculado
}

/**
 * Diferença de UMA ajuda específica entre calculado e pago.
 * Retorna null se a ajuda ainda não está paga (sem `valorPago`).
 */
export function diferencaAjuda(a: AjudaCustoMock): { calculado: number; pago: number; diferenca: number } | null {
  if (a.valorPago === undefined) return null;
  const calculado = calcularValorAjuda(a.dataInicio, a.dataFim, a.pernoiteRetorno).valor;
  return { calculado, pago: a.valorPago, diferenca: a.valorPago - calculado };
}

/**
 * Saldo acumulado do paciente, considerando todas as ajudas de custo
 * concluídas (status='concluida' com valorPago) DE TODAS AS SOLICITAÇÕES dele
 * — exceto a solicitação corrente (passada como `excluirSolicitacaoId`),
 * porque essas ajudas ainda estão sendo planejadas.
 *
 * Soma das diferenças (pago - calculado) — positivo significa que o paciente
 * recebeu a mais; negativo significa que o paciente recebeu a menos.
 */
export function saldoAjudaPaciente(
  pacienteId: string,
  todas: SolicitacaoMock[],
  excluirSolicitacaoId?: string,
): { saldo: number; diferencas: DiferencaAjuda[] } {
  const diferencas: DiferencaAjuda[] = [];

  for (const s of todas) {
    if (s.paciente.id !== pacienteId) continue;
    if (s.id === excluirSolicitacaoId) continue;

    for (const a of s.ajudasCusto) {
      const diff = diferencaAjuda(a);
      if (!diff) continue;
      if (Math.abs(diff.diferenca) < 0.005) continue; // ignora flutuação centavo
      diferencas.push({
        ajudaId: a.id,
        solicitacaoNumero: s.numero,
        calculado: diff.calculado,
        pago: diff.pago,
        diferenca: diff.diferenca,
      });
    }
  }

  const saldo = diferencas.reduce((acc, d) => acc + d.diferenca, 0);
  return { saldo, diferencas };
}

export const formatBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
