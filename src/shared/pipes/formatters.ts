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

/* ============================================================
   Input masks — format as the user types
   ============================================================ */

/**
 * Masks a CPF input value as "000.000.000-00".
 * Strips non-digits and formats progressively.
 */
export function maskCPF(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/**
 * Masks a CNPJ input value as "00.000.000/0000-00".
 */
export function maskCNPJ(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 14);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length <= 12) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/**
 * Masks a phone input as "(00) 00000-0000" (celular) or "(00) 0000-0000" (fixo).
 */
export function maskPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length > 0 ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/**
 * Masks a CNS input as "000 0000 0000 0000".
 */
export function maskCNS(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 15);
  if (d.length <= 3) return d;
  if (d.length <= 7) return `${d.slice(0, 3)} ${d.slice(3)}`;
  if (d.length <= 11) return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7, 11)} ${d.slice(11)}`;
}

/**
 * Masks a currency input as "R$ 1.234,56".
 * Accepts digits and comma; formats as BRL.
 */
export function maskCurrency(value: string): string {
  // Strip everything except digits
  const d = value.replace(/\D/g, '');
  if (d === '' || d === '0') return '';
  // Convert to number with 2 decimal places
  const num = parseInt(d, 10) / 100;
  return num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Parses a masked BRL currency string back to a number.
 * "R$ 1.234,56" → 1234.56
 */
export function parseCurrency(masked: string): number {
  const cleaned = masked.replace(/[^\d,]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

/**
 * Masks a CEP input as "00000-000".
 */
export function maskCEP(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
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
