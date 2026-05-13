/**
 * Formatador único de datas para pt-BR (dd/mm/aaaa).
 * Aceita:
 *  - `YYYY-MM-DD` (date) — converte sem usar Date para evitar deslocamento de timezone.
 *  - ISO datetime — usa toLocaleDateString.
 *  - null/undefined/'' — devolve '—'.
 *  - Qualquer outra string — devolve a string original (graceful fallback).
 */
export function fmtDataBR(iso: string | null | undefined): string {
  if (!iso) return '—';
  // YYYY-MM-DD (sem horário) — split direto evita o bug clássico de timezone
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('pt-BR');
}

/** Versão data + hora curta (dd/mm/aaaa HH:mm). */
export function fmtDataHoraBR(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}
