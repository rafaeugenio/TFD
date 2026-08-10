'use client';

/* -------------------------------------------------------------------------- */
/*  Saldo de ajuda de custo entre ciclos (PBI 07/08/2026)                     */
/*                                                                            */
/*  Store em memória, independente do FluxoV2Provider. O saldo é do          */
/*  PACIENTE e precisa ser lido tanto em telas dentro de /fluxo-v2 (que têm   */
/*  o Provider) quanto em /pacientes/[id] (que NÃO tem — usa outro stack de  */
/*  serviços ligados ao Supabase real). Por isso vive num store module-level  */
/*  com `useSyncExternalStore`, consultável de qualquer árvore de componentes */
/*  sem depender de um Context em comum.                                     */
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

/** Soma de créditos menos débitos — nunca um valor materializado. */
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

/** Registra um débito (abatimento no pagamento de uma ajuda de custo futura).
 *  Nunca deixa o saldo do paciente ficar negativo. */
export function aplicarDebitoSaldo(input: NovaMovimentacaoInput): MovimentacaoSaldoMock {
  const saldoAtual = saldoDoPaciente(input.pacienteId);
  if (input.valor > saldoAtual + 0.005) {
    throw new Error('O débito não pode exceder o saldo disponível do paciente.');
  }
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
