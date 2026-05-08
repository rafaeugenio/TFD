/* -------------------------------------------------------------------------- */
/*  Templates de parecer médico — Fluxo v2                                    */
/*  Mock-only. Inseríveis no drawer/bloco de parecer. O médico pode editar.   */
/*                                                                            */
/*  T2.AH — Categoria 'exigencia' removida. Restaram apenas os 2 templates    */
/*  fundamentais: Deferido e Indeferido.                                      */
/* -------------------------------------------------------------------------- */

import type { DecisaoParecer } from '@/core/mocks/fluxo-v2-v3-seed';

export interface TemplateParecer {
  id: string;
  titulo: string;
  texto: string;
  categoria: DecisaoParecer;
}

export const templatesParecer: TemplateParecer[] = [
  {
    id: 'tpl-def-1',
    titulo: 'Deferido — TFD necessário',
    categoria: 'deferido',
    texto:
      'Defiro o presente pedido de Tratamento Fora de Domicílio. O paciente apresenta condição clínica que exige assistência especializada não disponível na rede local. Todos os documentos foram analisados e estão em conformidade.',
  },
  {
    id: 'tpl-ind-1',
    titulo: 'Indeferido — sem indicação clínica',
    categoria: 'indeferido',
    texto:
      'Indefiro o presente pedido de Tratamento Fora de Domicílio. A condição clínica apresentada não justifica encaminhamento extra-domiciliar, podendo ser conduzida na rede local de saúde.',
  },
];
