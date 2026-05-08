/* -------------------------------------------------------------------------- */
/*  Validade do laudo médico                                                  */
/*                                                                            */
/*  Regra: laudo é válido por 1 ano. A partir disso derivamos um indicador    */
/*  visual: "Vencido", "Vence em N dias" ou "OK" — usado em listas e detalhe. */
/* -------------------------------------------------------------------------- */

export type LaudoStatus = 'sem_laudo' | 'vencido' | 'vencendo' | 'ok';

export interface ValidadeLaudo {
  status: LaudoStatus;
  /** Dias até o vencimento (negativo se já vencido). null se sem laudo. */
  diasRestantes: number | null;
  /** Texto curto p/ badge ("Sem laudo", "Vencido há 12 dias", "Vence em 30 dias"...) */
  label: string;
  /** Data de vencimento ISO (yyyy-mm-dd) — null se sem laudo. */
  vencimento: string | null;
}

const MS_DIA = 1000 * 60 * 60 * 24;

export function validadeLaudo(dataLaudo?: string): ValidadeLaudo {
  if (!dataLaudo) {
    return { status: 'sem_laudo', diasRestantes: null, label: 'Sem laudo', vencimento: null };
  }

  const emissao = new Date(dataLaudo);
  if (isNaN(emissao.getTime())) {
    return { status: 'sem_laudo', diasRestantes: null, label: 'Sem laudo', vencimento: null };
  }

  const venc = new Date(emissao);
  venc.setFullYear(venc.getFullYear() + 1);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const vencZero = new Date(venc);
  vencZero.setHours(0, 0, 0, 0);

  const diff = Math.round((vencZero.getTime() - hoje.getTime()) / MS_DIA);
  const vencISO = venc.toISOString().slice(0, 10);

  if (diff < 0) {
    const dias = Math.abs(diff);
    return {
      status: 'vencido',
      diasRestantes: diff,
      label: `Vencido há ${dias} ${dias === 1 ? 'dia' : 'dias'}`,
      vencimento: vencISO,
    };
  }
  if (diff <= 90) {
    return {
      status: 'vencendo',
      diasRestantes: diff,
      label: diff === 0 ? 'Vence hoje' : `Vence em ${diff} ${diff === 1 ? 'dia' : 'dias'}`,
      vencimento: vencISO,
    };
  }
  return {
    status: 'ok',
    diasRestantes: diff,
    label: new Date(dataLaudo).toLocaleDateString('pt-BR'),
    vencimento: vencISO,
  };
}
