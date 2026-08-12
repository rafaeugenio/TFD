'use client';

/* -------------------------------------------------------------------------- */
/*  Saldo de ajuda de custo entre ciclos (PBI 07/08/2026, sinal corrigido em  */
/*  11/08/2026, chave corrigida para CPF em 11/08/2026)                      */
/*                                                                            */
/*  Store em memória, independente do FluxoV2Provider. O saldo é do          */
/*  PACIENTE e precisa ser lido tanto em telas dentro de /fluxo-v2 (que têm   */
/*  o Provider) quanto em /pacientes/[id] (que NÃO tem — usa outro stack de  */
/*  serviços ligados ao Supabase real). Por isso vive num store module-level  */
/*  com `useSyncExternalStore`, consultável de qualquer árvore de componentes */
/*  sem depender de um Context em comum.                                     */
/*                                                                            */
/*  Chave de agrupamento (correção 11/08/2026): o fluxo-v2 usa o id do        */
/*  paciente do seed mock (ex.: 'p1'), enquanto /pacientes/[id] usa o id da   */
/*  base real (Supabase). São espaços de identificador diferentes, então o   */
/*  saldo passou a ser agrupado pelo CPF do paciente, que existe nos dois     */
/*  mundos e é estável entre solicitações. O CPF é normalizado (só dígitos)  */
/*  tanto na gravação quanto na leitura, para que "052.231.973-48" e         */
/*  "05223197348" caiam no mesmo lugar. O id do paciente é mantido como      */
/*  informação adicional de rastreio quando disponível, mas nunca é a chave. */
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

/** Normaliza um CPF para só dígitos, a chave real de agrupamento do saldo.
 *  "052.231.973-48" e "05223197348" resultam no mesmo valor. */
export function normalizarCpf(cpf: string | undefined | null): string {
  return (cpf ?? '').replace(/\D/g, '');
}

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
export function saldoDoPaciente(pacienteCpf: string): number {
  const cpf = normalizarCpf(pacienteCpf);
  return movimentacoes
    .filter((m) => normalizarCpf(m.pacienteCpf) === cpf)
    .reduce((acc, m) => acc + (m.tipo === 'CREDITO' ? m.valor : -m.valor), 0);
}

export function extratoDoPaciente(pacienteCpf: string): MovimentacaoSaldoMock[] {
  const cpf = normalizarCpf(pacienteCpf);
  return movimentacoes
    .filter((m) => normalizarCpf(m.pacienteCpf) === cpf)
    .sort((a, b) => b.data.localeCompare(a.data));
}

/**
 * Agregado de saldo de todos os pacientes — usado no painel geral, não no
 * extrato de um paciente específico. Cada paciente tem um saldo líquido
 * (créditos menos débitos); esta função soma separadamente os saldos
 * líquidos positivos (total a pagar) e os negativos (total a descontar nos
 * próximos ciclos), sem misturar os dois sinais num único número.
 */
export function saldoAgregadoTodosPacientes(): { positivo: number; negativo: number } {
  const porPaciente = new Map<string, number>();
  for (const m of movimentacoes) {
    const cpf = normalizarCpf(m.pacienteCpf);
    const delta = m.tipo === 'CREDITO' ? m.valor : -m.valor;
    porPaciente.set(cpf, (porPaciente.get(cpf) ?? 0) + delta);
  }
  let positivo = 0;
  let negativo = 0;
  for (const saldo of porPaciente.values()) {
    if (saldo > 0) positivo += saldo;
    else if (saldo < 0) negativo += saldo;
  }
  return { positivo, negativo };
}

/** Hook reativo — agregado de saldo de todos os pacientes, atualiza quando
 *  qualquer movimentação é criada em outra parte do app. */
export function useSaldoAgregadoTodosPacientes(): { positivo: number; negativo: number } {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return saldoAgregadoTodosPacientes();
}

interface NovaMovimentacaoInput {
  /** Chave real de agrupamento do saldo — atravessa qualquer solicitação do
   *  mesmo paciente, inclusive entre o fluxo-v2 e a base real. */
  pacienteCpf: string;
  /** Id do paciente na origem do lançamento, guardado só para rastreio. */
  pacienteId?: string;
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
    pacienteCpf: normalizarCpf(input.pacienteCpf),
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
    pacienteCpf: normalizarCpf(input.pacienteCpf),
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
 *  quando uma movimentação é criada em outra parte do app. Recebe o CPF do
 *  paciente, a chave que atravessa fluxo-v2 e /pacientes/[id]. */
export function useSaldoPaciente(pacienteCpf: string | undefined): {
  saldo: number;
  extrato: MovimentacaoSaldoMock[];
} {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const cpf = normalizarCpf(pacienteCpf);
  if (!cpf) return { saldo: 0, extrato: [] };
  return { saldo: saldoDoPaciente(cpf), extrato: extratoDoPaciente(cpf) };
}
