'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
}

/* ── Route → label map for auto breadcrumbs ── */

const routeLabels: Record<string, string> = {
  dashboard: 'Painel',
  pacientes: 'Pacientes',
  medicos: 'Médicos',
  solicitacoes: 'Solicitações',
  'termo-compromisso': 'Termo de Compromisso',
  'diagnostico-clinico': 'Diagnóstico Clínico',
  'parecer-medico': 'Parecer Médico',
  'laudo-medico': 'Laudo Médico',
  regulacao: 'Regulação',
  'atendimento-destino': 'Agendamentos',
  viagens: 'Viagens',
  'ajuda-custo': 'Ajuda de Custo',
  permanencia: 'Permanência',
  'alta-encerramento': 'Alta / Encerramento',
  'unidades-saude': 'Unidades de Saúde',
  'regionais-saude': 'Regionais',
  'recibo-pagamento': 'Recibo de Pagamento',
  'consulta-documentos': 'Consulta de Documentos',
  relatorios: 'Relatórios',
  'relatorio-atendimento': 'Relatório de Atendimento',
  sistema: 'Sistema',
  configuracoes: 'Configurações',
  papeis: 'Permissões',
  usuarios: 'Usuários',
  logs: 'Logs',
  'meu-perfil': 'Meu Perfil',
};

function buildAutoBreadcrumbs(pathname: string): Breadcrumb[] {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length <= 1) return [];

  const crumbs: Breadcrumb[] = [];
  let path = '';

  for (let i = 0; i < segments.length - 1; i++) {
    path += '/' + segments[i];
    const label = routeLabels[segments[i]];
    if (label) {
      crumbs.push({ label, href: path });
    }
  }

  return crumbs;
}

export default function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  actions,
}: PageHeaderProps) {
  const pathname = usePathname();
  const crumbs = breadcrumbs && breadcrumbs.length > 0
    ? breadcrumbs
    : buildAutoBreadcrumbs(pathname);

  return (
    <div className="mb-8 tfd-reveal">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-3">
        <ol className="flex items-center gap-1 text-[13px]">
          <li className="flex items-center gap-1">
            <Link
              href="/dashboard"
              className="transition-colors duration-150"
              style={{ color: '#9CA3AF' }}
              onMouseEnter={(e) => { e.currentTarget.style.color = '#6B7280'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = '#9CA3AF'; }}
            >
              <Home size={14} />
            </Link>
          </li>
          {crumbs.map((crumb, i) => (
            <li key={i} className="flex items-center gap-1">
              <ChevronRight size={13} style={{ color: '#C4CAD4' }} aria-hidden />
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="transition-colors duration-150"
                  style={{ color: '#9CA3AF' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#6B7280'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#9CA3AF'; }}
                >
                  {crumb.label}
                </Link>
              ) : (
                <span style={{ color: '#9CA3AF' }}>{crumb.label}</span>
              )}
            </li>
          ))}
          <li className="flex items-center gap-1">
            <ChevronRight size={13} style={{ color: '#C4CAD4' }} aria-hidden />
            <span className="font-medium" style={{ color: '#1A1D2B' }}>{title}</span>
          </li>
        </ol>
      </nav>

      {/* Title + actions */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: '#1A1D2B', letterSpacing: '-0.02em' }}>
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-[13px]" style={{ color: '#9CA3AF' }}>{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
