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

/** Estado de urgência do próximo agendamento, usado para orientar a leitura
 *  visual no cabeçalho da solicitação: quanto mais perto ou mais vencido,
 *  mais chama atenção. */
export type UrgenciaAgendamento = 'sem_agendamento' | 'futuro' | 'vencido';

export interface ProximoAgendamentoInfo {
  estado: UrgenciaAgendamento;
  /** Dias até o agendamento ('futuro') ou dias desde que passou ('vencido').
   *  Ausente quando 'sem_agendamento'. */
  dias?: number;
  /** Data ISO (AAAA-MM-DD) do agendamento de referência. */
  data?: string;
}

/**
 * Regra de negócio do TFD: quanto mais perto o agendamento, mais prioritário
 * o caso. Retorna o próximo agendamento confirmado (o mais próximo entre
 * todos), ou, se todos já passaram, o mais recente deles marcado como
 * vencido — em vez de simplesmente sumir com a informação.
 */
export function proximoAgendamento(s: SolicitacaoMock): ProximoAgendamentoInfo {
  const confirmados = agendamentosConfirmados(s);
  if (confirmados.length === 0) return { estado: 'sem_agendamento' };

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const datas = confirmados
    .map((t) => dataDoAgendamento(t))
    .filter((d): d is string => Boolean(d))
    .map((d) => new Date(`${d.slice(0, 10)}T00:00:00`))
    .filter((d) => !Number.isNaN(d.getTime()));

  if (datas.length === 0) return { estado: 'sem_agendamento' };

  const futuras = datas
    .filter((d) => d.getTime() >= hoje.getTime())
    .sort((a, b) => a.getTime() - b.getTime());

  if (futuras.length > 0) {
    const proxima = futuras[0];
    const dias = Math.round((proxima.getTime() - hoje.getTime()) / 86_400_000);
    return { estado: 'futuro', dias, data: proxima.toISOString().slice(0, 10) };
  }

  // Todos os agendamentos já passaram — sinaliza o mais recente como vencido.
  const ultima = [...datas].sort((a, b) => b.getTime() - a.getTime())[0];
  const dias = Math.round((hoje.getTime() - ultima.getTime()) / 86_400_000);
  return { estado: 'vencido', dias, data: ultima.toISOString().slice(0, 10) };
}
