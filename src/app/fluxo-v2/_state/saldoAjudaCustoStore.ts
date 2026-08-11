'use client';

/* -------------------------------------------------------------------------- */
/*  Saldo de ajuda de custo entre ciclos (PBI 07/08/2026, sinal corrigido em  */
/*  11/08/2026)                                                              */
/*                                                                            */
/*  Store em memória, independente do FluxoV2Provider. O saldo é do          */
/*  PACIENTE e precisa ser lido tanto em telas dentro de /fluxo-v2 (que têm   */
/*  o Provider) quanto em /pacientes/[id] (que NÃO tem — usa outro stack de  */
/*  serviços ligados ao Supabase real). Por isso vive num store module-level  */
/*  com `useSyncExternalStore`, consultável de qualquer árvore de componentes */
/*  sem depender de um Context em comum.                                     */
/*                                                                            */
/*  Sinal do saldo (correção de regra 11/08/2026):                           */
/*  - CREDITO → saldo POSITIVO. O paciente tem valor a receber (ex.: ajuda    */
/*    aditiva lançada, cuja diferença ainda não foi paga a ele).             */
/*  - DEBITO  → saldo NEGATIVO. O paciente recebeu a mais do que devia (ex.:  */
/*    ajuda subtrativa ou volta antecipada) e essa diferença é descontada do  */
/*    próximo pagamento. Saldo negativo é um estado válido — nunca é         */
/*    devolvido em dinheiro pelo paciente, só compensado nos próximos ciclos. */
/*                                                                            */
/*  Sem tabela própria no Supabase ainda — puramente mock, como o restante   */
/*  do fluxo-v2. Persistência real fica para quando a regra for validada.     */
/* -------------------------------------------------------------------------- */

import { useSyncExternalStore } from 'react';
import {
  seedMovimentacoesSaldo,
  type MovimentacaoSaldoMock,
} from '@/core/mocks/fluxo-v2-v3-seed';

let movimentacoes: MovimentacaoSaldoMock[] = [...seedMovimentacoesSaldo];
const listeners = new Set<() => void>();

const uid = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): MovimentacaoSaldoMock[] {
  return movimentacoes;
}

/** Soma de créditos menos débitos — nunca um valor materializado.
 *  Pode ser negativo (paciente recebeu a mais em algum ciclo anterior). */
export function saldoDoPaciente(pacienteId: string): number {
  return movimentacoes
    .filter((m) => m.pacienteId === pacienteId)
    .reduce((acc, m) => acc + (m.tipo === 'CREDITO' ? m.valor : -m.valor), 0);
}

export function extratoDoPaciente(pacienteId: string): MovimentacaoSaldoMock[] {
  return movimentacoes
    .filter((m) => m.pacienteId === pacienteId)
    .sort((a, b) => b.data.localeCompare(a.data));
}

interface NovaMovimentacaoInput {
  pacienteId: string;
  valor: number;
  motivo: string;
  solicitacaoOrigemNumero?: string;
  solicitacaoDestinoNumero?: string;
  /** Default: agora. */
  data?: string;
}

/** Registra um crédito (volta antecipada — diferença fica para o próximo ciclo). */
export function criarCreditoSaldo(input: NovaMovimentacaoInput): MovimentacaoSaldoMock {
  const mov: MovimentacaoSaldoMock = {
    id: uid('ms'),
    pacienteId: input.pacienteId,
    tipo: 'CREDITO',
    valor: Math.round(input.valor * 100) / 100,
    motivo: input.motivo,
    solicitacaoOrigemNumero: input.solicitacaoOrigemNumero,
    solicitacaoDestinoNumero: input.solicitacaoDestinoNumero,
    data: input.data ?? new Date().toISOString(),
  };
  movimentacoes = [...movimentacoes, mov];
  emit();
  return mov;
}

/** Registra um débito (abatimento no pagamento de uma ajuda de custo futura,
 *  ou diferença de uma ajuda subtrativa). Correção de regra (11/08/2026):
 *  saldo negativo é um estado válido — o débito não fica mais limitado ao
 *  saldo disponível, porque agora ele é quem leva o saldo do paciente para
 *  negativo quando o paciente recebeu a mais. */
export function aplicarDebitoSaldo(input: NovaMovimentacaoInput): MovimentacaoSaldoMock {
  const mov: MovimentacaoSaldoMock = {
    id: uid('ms'),
    pacienteId: input.pacienteId,
    tipo: 'DEBITO',
    valor: Math.round(input.valor * 100) / 100,
    motivo: input.motivo,
    solicitacaoOrigemNumero: input.solicitacaoOrigemNumero,
    solicitacaoDestinoNumero: input.solicitacaoDestinoNumero,
    data: input.data ?? new Date().toISOString(),
  };
  movimentacoes = [...movimentacoes, mov];
  emit();
  return mov;
}

/** Hook reativo — saldo + extrato de um paciente, atualiza em qualquer tela
 *  quando uma movimentação é criada em outra parte do app. */
export function useSaldoPaciente(pacienteId: string | undefined): {
  saldo: number;
  extrato: MovimentacaoSaldoMock[];
} {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  if (!pacienteId) return { saldo: 0, extrato: [] };
  return { saldo: saldoDoPaciente(pacienteId), extrato: extratoDoPaciente(pacienteId) };
}
