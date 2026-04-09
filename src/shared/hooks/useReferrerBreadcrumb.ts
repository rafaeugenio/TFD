'use client';

import { useSearchParams } from 'next/navigation';

/**
 * Maps route slugs to labels + hrefs for breadcrumb referrer tracking.
 * When navigating to a detail page (e.g. /solicitacoes/[id]?from=regulacao),
 * this hook reads the `from` param and returns the correct parent breadcrumb.
 */
const ROUTE_MAP: Record<string, { label: string; href: string }> = {
  dashboard: { label: 'Painel', href: '/dashboard' },
  solicitacoes: { label: 'Solicitações', href: '/solicitacoes' },
  'diagnostico-clinico': { label: 'Diagnóstico Clínico', href: '/diagnostico-clinico' },
  'parecer-medico': { label: 'Parecer Médico', href: '/parecer-medico' },
  'laudo-medico': { label: 'Laudo Médico', href: '/laudo-medico' },
  regulacao: { label: 'Regulação', href: '/regulacao' },
  'atendimento-destino': { label: 'Agendamentos', href: '/atendimento-destino' },
  viagens: { label: 'Viagens', href: '/viagens' },
  'ajuda-custo': { label: 'Ajuda de Custo', href: '/ajuda-custo' },
  permanencia: { label: 'Permanência', href: '/permanencia' },
  'alta-encerramento': { label: 'Alta / Encerramento', href: '/alta-encerramento' },
  pacientes: { label: 'Pacientes', href: '/pacientes' },
  medicos: { label: 'Médicos', href: '/medicos' },
  'unidades-saude': { label: 'Unidades de Saúde', href: '/unidades-saude' },
  'regionais-saude': { label: 'Regionais', href: '/regionais-saude' },
  relatorios: { label: 'Relatórios', href: '/relatorios' },
  'recibo-pagamento': { label: 'Recibo de Pagamento', href: '/recibo-pagamento' },
  'consulta-documentos': { label: 'Consulta de Documentos', href: '/consulta-documentos' },
};

/**
 * Returns the parent breadcrumb based on the `from` search param.
 * Falls back to the provided default if no `from` or unknown route.
 */
export function useReferrerBreadcrumb(defaultParent: { label: string; href: string }) {
  const searchParams = useSearchParams();
  const from = searchParams.get('from');

  if (from && ROUTE_MAP[from]) {
    return ROUTE_MAP[from];
  }
  return defaultParent;
}

/**
 * Helper to build a link href with the `from` param appended.
 * Usage: refLink('/solicitacoes/abc-123', 'regulacao') → '/solicitacoes/abc-123?from=regulacao'
 */
export function refLink(href: string, from: string): string {
  return `${href}?from=${encodeURIComponent(from)}`;
}
