/**
 * Calcula idade em anos completos a partir da data de nascimento.
 * Aceita string ISO (YYYY-MM-DD ou completa) ou objeto Date.
 * Retorna 0 quando a data é inválida ou no futuro.
 */
export function calcularIdade(dataNascimento: string | Date | null | undefined): number {
  if (!dataNascimento) return 0;

  const nasc =
    typeof dataNascimento === 'string'
      ? new Date(dataNascimento.includes('T') ? dataNascimento : `${dataNascimento}T00:00:00`)
      : dataNascimento;

  if (isNaN(nasc.getTime())) return 0;

  const hoje = new Date();
  if (nasc > hoje) return 0;

  let idade = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
  return Math.max(0, idade);
}
