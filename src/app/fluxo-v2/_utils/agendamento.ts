/**
 * T2.AM — Helpers para o modelo unificado tentativa + agendamento.
 *
 * No novo modelo, o agendamento confirmado é simplesmente a tentativa cujo
 * desfecho é `'agendamento_confirmado'`. Toda a UI deve consultar esses
 * helpers em vez de acessar `s.agendamento?.unidade` etc. (campos removidos
 * do `AgendamentoMock`).
 */
import type {
  SolicitacaoMock,
  TentativaUnidadeMock,
} from '@/core/mocks/fluxo-v2-v3-seed';

export function agendamentoConfirmado(
  s: SolicitacaoMock,
): TentativaUnidadeMock | undefined {
  return s.agendamento?.tentativas.find(
    (t) => t.desfecho === 'agendamento_confirmado',
  );
}

export function temAgendamentoConfirmado(s: SolicitacaoMock): boolean {
  return !!agendamentoConfirmado(s);
}

/** Tentativas que NÃO são o agendamento confirmado (histórico). */
export function tentativasHistoricas(
  s: SolicitacaoMock,
): TentativaUnidadeMock[] {
  return (s.agendamento?.tentativas ?? []).filter(
    (t) => t.desfecho !== 'agendamento_confirmado',
  );
}
