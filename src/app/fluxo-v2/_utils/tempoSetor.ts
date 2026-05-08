/* -------------------------------------------------------------------------- */
/*  Tempo no setor                                                            */
/*                                                                            */
/*  Calcula quantos dias se passaram desde uma data ISO até hoje. Usado nas   */
/*  listas pra indicar há quanto tempo a solicitação está parada num setor.   */
/* -------------------------------------------------------------------------- */

const MS_DIA = 1000 * 60 * 60 * 24;

export function tempoNoSetor(dataInicio: string, ate: Date = new Date()): number {
  const d = new Date(dataInicio);
  if (isNaN(d.getTime())) return 0;
  const diff = ate.getTime() - d.getTime();
  return Math.max(0, Math.floor(diff / MS_DIA));
}
