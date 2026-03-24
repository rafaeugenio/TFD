/* ============================================================
   TFD — Utility formatters (pt-BR locale)
   ============================================================ */

/**
 * Formats a raw CPF string as "000.000.000-00".
 * Non-digit characters are stripped before formatting.
 */
export function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '').padStart(11, '0').slice(0, 11);
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

/**
 * Formats a raw CNS (Cartao Nacional de Saude) string as "000 0000 0000 0000".
 * Non-digit characters are stripped before formatting.
 */
export function formatCNS(cns: string): string {
  const digits = cns.replace(/\D/g, '').padStart(15, '0').slice(0, 15);
  return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7, 11)} ${digits.slice(11)}`;
}

/**
 * Formats a number as BRL currency: "R$ 1.234,56".
 */
export function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Formats an ISO date string as "dd/MM/yyyy" (pt-BR).
 * Example: "2026-03-20" → "20/03/2026"
 */
export function formatDate(date: string): string {
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  });
}

/**
 * Formats an ISO date string as "dd/MM/yyyy HH:mm" (pt-BR).
 * Example: "2026-03-20T14:30:00" → "20/03/2026 14:30"
 */
export function formatDateTime(date: string): string {
  const d = new Date(date);
  const datePart = d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  });
  const timePart = d.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Sao_Paulo',
  });
  return `${datePart} ${timePart}`;
}
