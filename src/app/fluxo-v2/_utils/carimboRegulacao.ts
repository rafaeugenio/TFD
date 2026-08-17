/**
 * Rótulos visuais do carimbo de regulação — extraído de `RegulacaoTab.tsx`
 * para ser reaproveitado também no cabeçalho do detalhe da solicitação.
 */
import type { CarimboRegulacao } from '@/core/mocks/fluxo-v2-v3-seed';

export const CARIMBO_REGULACAO_VISUAL: Record<CarimboRegulacao, { label: string; sublabel: string }> = {
  APROVADO_DIRETO: { label: 'Aprovado direto',                       sublabel: 'Encaminhamento padrão, sem exceção.' },
  CNRAC:           { label: 'CNRAC — Central Nacional de Regulação', sublabel: 'Alta complexidade fora do estado.' },
  CET:             { label: 'CET — Central Estadual de Tratamento',  sublabel: 'Busca de vaga via central estadual.' },
  SAAS:            { label: 'SAAS',                                  sublabel: 'Encaminhamento via SAAS — caso de exceção.' },
  AGENDAMENTO:     { label: 'Agendamento manual',                    sublabel: 'Regulação agenda manualmente via tentativas até obter resposta.' },
};
