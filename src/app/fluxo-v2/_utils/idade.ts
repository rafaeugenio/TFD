/**
 * Calcula a idade em anos a partir de uma data ISO de nascimento.
 * Retorna 0 se a data for inválida ou estiver no futuro.
 */
export function idadeAnos(dataNascimento?: string): number {
  if (!dataNascimento) return 0;
  const nasc = new Date(dataNascimento);
  if (Number.isNaN(nasc.getTime())) return 0;
  const hoje = new Date();
  let anos = hoje.getFullYear() - nasc.getFullYear();
  const m = hoje.getMonth() - nasc.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) anos--;
  return Math.max(0, anos);
}
