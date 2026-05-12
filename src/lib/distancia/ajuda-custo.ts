import { listarSigtap } from '@/services/sigtap.service';

export type ModalTransporte = 'aereo' | 'terrestre' | 'fluvial';
export type DistanciaUnidade = 'km' | 'milhas' | 'milhas_nauticas';

/** Cada modal usa sua própria unidade. Divisor = quantos da unidade equivalem
 *  a 1 procedimento SIGTAP de deslocamento/ajuda de custo. */
const DIVISOR_POR_MODAL: Record<ModalTransporte, { divisor: number; unidade: DistanciaUnidade }> = {
  aereo: { divisor: 200, unidade: 'milhas' },
  terrestre: { divisor: 50, unidade: 'km' },
  fluvial: { divisor: 27, unidade: 'milhas_nauticas' },
};

export function unidadeDoModal(modal: ModalTransporte): DistanciaUnidade {
  return DIVISOR_POR_MODAL[modal].unidade;
}

/** Quantidade de procedimentos SIGTAP para uma distância e modal. */
export function quantidadeProcedimentos(distancia: number, modal: ModalTransporte): number {
  if (!distancia || distancia <= 0) return 0;
  return Math.ceil(distancia / DIVISOR_POR_MODAL[modal].divisor);
}

export interface AjudaCustoCalculada {
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  /** Código SIGTAP usado no cálculo (referência). */
  codigoSigtap?: string;
}

/** Busca o valor unitário SIGTAP para um beneficiário + modal e calcula o
 *  valor total da ajuda de custo. Retorna null se não houver procedimento
 *  cadastrado para a combinação. */
export async function calcularAjudaCusto(
  distancia: number,
  modal: ModalTransporte,
  beneficiario: 'paciente' | 'acompanhante',
): Promise<AjudaCustoCalculada | null> {
  const quantidade = quantidadeProcedimentos(distancia, modal);
  if (quantidade === 0) return null;

  const { data, error } = await listarSigtap({ tipo: 'ajuda_custo', subtipo: modal, beneficiario });
  if (error || !data || data.length === 0) return null;

  const procedimento = data[0] as { valor_unitario: number; codigo: string };
  const valorUnitario = Number(procedimento.valor_unitario) || 0;
  return {
    quantidade,
    valorUnitario,
    valorTotal: quantidade * valorUnitario,
    codigoSigtap: procedimento.codigo,
  };
}
