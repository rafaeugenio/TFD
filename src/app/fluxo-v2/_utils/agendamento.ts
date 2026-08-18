/**
 * T2.AM — Helpers para o modelo unificado tentativa + agendamento.
 *
 * No novo modelo, o agendamento confirmado é simplesmente a tentativa cujo
 * desfecho é `'agendamento_confirmado'`. Toda a UI deve consultar esses
 * helpers em vez de acessar `s.agendamento?.unidade` etc. (campos removidos
 * do `AgendamentoMock`).
 *
 * A partir da unificação com o cadastro da criação, uma solicitação pode ter
 * VÁRIOS agendamentos confirmados simultâneos (um por procedimento/unidade).
 * Use `agendamentosConfirmados(s)` para a lista completa;
 * `agendamentoConfirmado(s)` (singular) segue disponível só para os poucos
 * lugares que ainda tratam agendamento como algo único (ex.: fluxo de
 * remarcação do carimbo de exceção).
 */
import type {
  SolicitacaoMock,
  TentativaUnidadeMock,
} from '@/core/mocks/fluxo-v2-v3-seed';

/** Todas as tentativas confirmadas (agendamentos ativos) da solicitação. */
export function agendamentosConfirmados(
  s: SolicitacaoMock,
): TentativaUnidadeMock[] {
  return (s.agendamento?.tentativas ?? []).filter(
    (t) => t.desfecho === 'agendamento_confirmado',
  );
}

/** Primeira tentativa confirmada — uso pontual onde só um item faz sentido. */
export function agendamentoConfirmado(
  s: SolicitacaoMock,
): TentativaUnidadeMock | undefined {
  return agendamentosConfirmados(s)[0];
}

export function temAgendamentoConfirmado(s: SolicitacaoMock): boolean {
  return agendamentosConfirmados(s).length > 0;
}

/**
 * Data efetiva do agendamento do paciente. Quando a tentativa foi registrada
 * com o campo `dataAgendamento` (modelo novo), usamos ele; caso contrário cai
 * no `data` (legado, onde os dois conceitos eram unificados).
 */
export function dataDoAgendamento(t: TentativaUnidadeMock): string {
  return t.dataAgendamento ?? t.data;
}

/** Tentativas que NÃO são o agendamento confirmado (histórico). */
export function tentativasHistoricas(
  s: SolicitacaoMock,
): TentativaUnidadeMock[] {
  return (s.agendamento?.tentativas ?? []).filter(
    (t) => t.desfecho !== 'agendamento_confirmado',
  );
}
