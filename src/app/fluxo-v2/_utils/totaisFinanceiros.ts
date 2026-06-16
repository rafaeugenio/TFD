/**
 * Totais financeiros do Fluxo v2 — distingue **realizado** (oficializado) de
 * **a confirmar** (planejado), com base no status de cada item.
 *
 * Regras (Ata 7 + convenções do TFD):
 *
 * Viagens (`StatusViagem`):
 *  - Realizado:    confirmada · remarcada · nao_compareceu  (custo oficializado)
 *  - A confirmar:  agendada                                  (planejado)
 *  - Sem custo:    cancelada · reembolso                     (saiu do plano / recuperado)
 *
 * Ajudas de custo (`StatusAjuda`):
 *  - Realizado:    concluida — usa `valorPago` se preenchido, senão `calcularValorAjuda`
 *  - A confirmar:  em_analise · aprovada · em_pagamento — usa `calcularValorAjuda`
 *  - Sem custo:    glosada
 *
 * Adicionais (`StatusAdicional`):
 *  - Realizado:    pago
 *  - A confirmar:  pendente_aprovacao · aprovado
 *  - Sem custo:    indeferido
 */

import {
  calcularValorAjuda,
  type SolicitacaoMock,
} from '@/core/mocks/fluxo-v2-v3-seed';

export interface TotaisCategoria {
  /** Já oficializado — valor "real" do custo. */
  realizado: number;
  /** Pendente de oficialização — ainda pode mudar/ser cancelado. */
  aConfirmar: number;
  /** Cancelado, reembolsado, glosado ou indeferido — não impacta o orçamento. */
  semCusto: number;
  /** realizado + aConfirmar (visão "tudo que provavelmente vai sair"). */
  totalGeral: number;
}

export interface TotaisFinanceiros {
  passagens: TotaisCategoria;
  ajudas: TotaisCategoria;
  adicionais: TotaisCategoria;
  realizadoTotal: number;
  aConfirmarTotal: number;
  /** realizadoTotal + aConfirmarTotal (não inclui semCusto). */
  totalGeral: number;
}

const ZERO: TotaisCategoria = {
  realizado: 0,
  aConfirmar: 0,
  semCusto: 0,
  totalGeral: 0,
};

function finalize(c: TotaisCategoria): TotaisCategoria {
  return {
    realizado: round2(c.realizado),
    aConfirmar: round2(c.aConfirmar),
    semCusto: round2(c.semCusto),
    totalGeral: round2(c.realizado + c.aConfirmar),
  };
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export function totaisFinanceiros(s: SolicitacaoMock): TotaisFinanceiros {
  const passagens: TotaisCategoria = { ...ZERO };
  for (const v of s.viagens) {
    if (v.ativa === false) continue; // passagem inativada não conta
    const liquido = v.valor - (v.valorReembolso ?? 0);
    switch (v.status) {
      case 'confirmada':
      case 'remarcada':
      case 'nao_compareceu':
      case 'reembolso':
        // Reembolso entra pelo valor líquido (custo real menos o reembolsado).
        passagens.realizado += liquido;
        break;
      case 'agendada':
        passagens.aConfirmar += v.valor;
        break;
      case 'cancelada':
        passagens.semCusto += v.valor;
        break;
    }
  }

  const ajudas: TotaisCategoria = { ...ZERO };
  for (const a of s.ajudasCusto) {
    const calc = calcularValorAjuda(a.dataInicio, a.dataFim, a.pernoiteRetorno).valor;
    const liquido = calc - (a.valorReembolso ?? 0);
    switch (a.status) {
      case 'concluido':
        ajudas.realizado += liquido;
        break;
      case 'emitido':
        ajudas.aConfirmar += liquido;
        break;
      case 'glosada':
        ajudas.semCusto += calc;
        break;
    }
  }

  const adicionais: TotaisCategoria = { ...ZERO };
  for (const a of s.adicionais) {
    switch (a.status) {
      case 'pago':
        adicionais.realizado += a.valor;
        break;
      case 'pendente_aprovacao':
      case 'aprovado':
        adicionais.aConfirmar += a.valor;
        break;
      case 'indeferido':
        adicionais.semCusto += a.valor;
        break;
    }
  }

  const passagensF = finalize(passagens);
  const ajudasF = finalize(ajudas);
  const adicionaisF = finalize(adicionais);

  const realizadoTotal = round2(
    passagensF.realizado + ajudasF.realizado + adicionaisF.realizado,
  );
  const aConfirmarTotal = round2(
    passagensF.aConfirmar + ajudasF.aConfirmar + adicionaisF.aConfirmar,
  );

  return {
    passagens: passagensF,
    ajudas: ajudasF,
    adicionais: adicionaisF,
    realizadoTotal,
    aConfirmarTotal,
    totalGeral: round2(realizadoTotal + aConfirmarTotal),
  };
}
