import type { UltimaTramitacao } from '@/core/mocks/fluxo-v2-v3-seed';

/**
 * T2.Z — Helpers para destaque visual de tramitação recente Regulação ↔ Financeiro.
 *
 * `horasDesdeTramitacao` retorna a quantidade inteira de horas desde a
 * última movimentação registrada, ou `null` se não houver. Útil para
 * formatar o badge "Chegou há Xh" e para condicionar destaques na linha
 * da tabela.
 *
 * `isTramitacaoRecente` é o predicado de destaque visual: a linha só fica
 * pintada nas primeiras 24 horas — depois disso a tramitação volta ao
 * comportamento neutro pra não poluir a fila.
 */
export function horasDesdeTramitacao(t?: UltimaTramitacao): number | null {
  if (!t) return null;
  const ms = Date.now() - new Date(t.data).getTime();
  if (ms < 0) return 0;
  return Math.floor(ms / (1000 * 60 * 60));
}

export function isTramitacaoRecente(t?: UltimaTramitacao): boolean {
  const h = horasDesdeTramitacao(t);
  return h !== null && h < 24;
}

/** Formata "há Xh" / "há Xmin" para tooltips e badges. */
export function formatarTempoDesdeTramitacao(t?: UltimaTramitacao): string {
  if (!t) return '';
  const ms = Date.now() - new Date(t.data).getTime();
  const min = Math.max(0, Math.floor(ms / (1000 * 60)));
  if (min < 60) return `há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}
