import { redirect } from 'next/navigation';

/**
 * PBI 13237 (reescrita) — a fila única de Financeiro foi dividida em duas
 * telas próprias: Passagens e Ajuda de Custo, cada uma com KPIs e filtros
 * do seu setor. Esta rota permanece apenas como redirecionamento para não
 * quebrar links antigos (ex.: card do Dashboard).
 */
export default function FinanceiroRedirectPage() {
  redirect('/fluxo-v2/passagens');
}
