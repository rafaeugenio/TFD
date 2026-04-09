/**
 * SLA utility — thresholds: ≤3d verde · 4-6d amarelo · ≥7d vermelho
 */

export interface SlaStyle {
  backgroundColor: string;
  color: string;
}

/** Rótulo legível: "Agora", "5h", "3d" */
export function slaLabel(iso: string | null | undefined): string {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return 'Agora';
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

/** Número de dias desde `iso`. Se contarFds=false, pula sáb/dom. */
export function slaDias(iso: string | null | undefined, contarFds = true): number {
  if (!iso) return 0;
  const start = new Date(iso);
  const end = new Date();
  if (contarFds) {
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }
  let days = 0;
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  while (cur < endDay) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) days++;
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

/** Estilo do badge baseado nos dias: ≤3d verde · 4-6d amarelo · ≥7d vermelho */
export function slaTagStyle(dias: number): SlaStyle {
  if (dias >= 7) return { backgroundColor: '#FEE2E2', color: '#B91C1C' };
  if (dias >= 4) return { backgroundColor: '#FEF9C3', color: '#A16207' };
  return { backgroundColor: '#DCFCE7', color: '#15803D' };
}

/** Convenência: retorna label + style a partir de um timestamp ISO. */
export function slaBadge(
  iso: string | null | undefined,
  contarFds = true,
): { label: string; style: SlaStyle } {
  const label = slaLabel(iso);
  const dias = slaDias(iso, contarFds);
  const style = slaTagStyle(dias);
  return { label, style };
}
