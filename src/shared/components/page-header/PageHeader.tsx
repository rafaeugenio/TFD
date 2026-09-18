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
  'unidades-saude': 'Unidades de Saúde',
  'regionais-saude': 'Regionais',
  relatorios: 'Relatórios',
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
    <div className="mb-6 tfd-reveal">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-3">
        <ol className="flex flex-wrap items-center gap-1 text-[13px]">
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
            <span className="font-semibold" style={{ color: 'var(--tfd-blue-500)', fontSize: '12.25px' }}>{title}</span>
          </li>
        </ol>
      </nav>

      {/* Title + actions */}
      {/* Mesma escala do sistema em dev: título 24,5px slate-700, subtítulo 14px slate-400. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-[24.5px] font-bold" style={{ color: 'var(--tfd-text-primary)', letterSpacing: '-0.01em', lineHeight: 1.25 }}>
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-[14px]" style={{ color: 'var(--tfd-400)' }}>{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
