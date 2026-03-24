'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import {
  LayoutDashboard,
  FileText,
  ClipboardCheck,
  MapPin,
  Plane,
  Wallet,
  CalendarClock,
  LogOut,
  BarChart3,
  Settings,
  Shield,
  Users,
  ScrollText,
  X,
  type LucideIcon,
} from 'lucide-react';

/* -------------------------------------------------- */
/*  Navigation config                                  */
/* -------------------------------------------------- */

interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  badge?: number;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    items: [
      { icon: LayoutDashboard, label: 'Painel', href: '/dashboard' },
      { icon: FileText, label: 'Solicita\u00e7\u00f5es', href: '/solicitacoes', badge: 12 },
      { icon: ClipboardCheck, label: 'Regula\u00e7\u00e3o', href: '/regulacao', badge: 5 },
      { icon: MapPin, label: 'Agendamentos', href: '/atendimento-destino' },
      { icon: Plane, label: 'Viagens', href: '/viagens' },
      { icon: Wallet, label: 'Ajuda de Custo', href: '/ajuda-custo' },
      { icon: CalendarClock, label: 'Perman\u00eancia', href: '/permanencia' },
      { icon: LogOut, label: 'Altas', href: '/alta-encerramento' },
      { icon: BarChart3, label: 'Relat\u00f3rios', href: '/relatorios' },
    ],
  },
  {
    title: 'SISTEMA',
    items: [
      { icon: Settings, label: 'Configura\u00e7\u00f5es', href: '/sistema/configuracoes' },
      { icon: Shield, label: 'Permiss\u00f5es', href: '/sistema/papeis' },
      { icon: Users, label: 'Usu\u00e1rios', href: '/sistema/usuarios' },
      { icon: ScrollText, label: 'Logs', href: '/sistema/logs' },
    ],
  },
];

/* -------------------------------------------------- */
/*  Types                                              */
/* -------------------------------------------------- */

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  /* ---- Sidebar inner content ---- */
  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo area */}
      <div
        className={clsx(
          'flex items-center gap-3 border-b border-white/10 px-4',
          collapsed ? 'justify-center py-4' : 'py-5',
        )}
      >
        {/* Icon mark */}
        <div
          className="flex items-center justify-center shrink-0"
          style={{
            width: 36,
            height: 36,
            background: 'var(--tfd-primary-500)',
            borderRadius: 'var(--tfd-radius-md)',
          }}
        >
          <span className="text-white font-bold text-sm leading-none">TFD</span>
        </div>

        {!collapsed && (
          <div className="flex flex-col overflow-hidden">
            <span className="text-white font-semibold text-sm leading-tight truncate">
              SES-MA
            </span>
            <span
              className="text-xs leading-tight truncate"
              style={{ color: 'var(--tfd-text-muted)' }}
            >
              Tratamento Fora do Domic\u00edlio
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navSections.map((section, sIdx) => (
          <div key={sIdx} className={sIdx > 0 ? 'mt-4 pt-4 border-t border-white/10' : ''}>
            {section.title && !collapsed && (
              <p className="px-3 mb-2 text-[10px] font-bold tracking-widest uppercase" style={{ color: 'var(--tfd-text-muted)' }}>
                {section.title}
              </p>
            )}
            {section.title && collapsed && (
              <hr className="mx-3 mb-2 border-white/10" />
            )}
            <ul className="flex flex-col gap-1">
          {section.items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onMobileClose}
                  title={collapsed ? item.label : undefined}
                  className={clsx(
                    'group relative flex items-center gap-3 px-3 py-2.5 text-sm font-medium',
                    collapsed && 'justify-center',
                    !active && 'hover:bg-white/5',
                  )}
                  style={{
                    color: active
                      ? 'var(--tfd-text-on-primary)'
                      : 'var(--tfd-text-on-dark)',
                    backgroundColor: active ? 'rgba(59,130,246,0.15)' : undefined,
                    borderRadius: 'var(--tfd-radius-md)',
                    transition: `color var(--tfd-transition-duration) var(--tfd-transition-timing),
                                 background-color var(--tfd-transition-duration) var(--tfd-transition-timing)`,
                  }}
                >
                  {/* Active indicator */}
                  {active && (
                    <span
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r"
                      style={{
                        height: 20,
                        backgroundColor: 'var(--tfd-primary-500)',
                      }}
                    />
                  )}

                  <Icon className="shrink-0" size={20} />

                  {!collapsed && (
                    <>
                      <span className="truncate">{item.label}</span>

                      {item.badge != null && (
                        <span
                          className="ml-auto flex items-center justify-center text-xs font-semibold text-white"
                          style={{
                            minWidth: 22,
                            height: 20,
                            padding: '0 6px',
                            borderRadius: 9999,
                            backgroundColor: 'var(--tfd-primary-500)',
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}

                  {/* Tooltip for collapsed state */}
                  {collapsed && (
                    <span
                      className="pointer-events-none absolute left-full ml-2 whitespace-nowrap px-2 py-1 text-xs font-medium text-white opacity-0 group-hover:opacity-100"
                      style={{
                        backgroundColor: 'var(--tfd-surface-sidebar)',
                        boxShadow: 'var(--tfd-shadow-overlay)',
                        borderRadius: 'var(--tfd-radius-md)',
                        transition: `opacity var(--tfd-transition-duration) var(--tfd-transition-timing)`,
                        zIndex: 60,
                      }}
                    >
                      {item.label}
                      {item.badge != null && (
                        <span
                          className="ml-1.5 inline-flex items-center justify-center text-[10px] font-semibold text-white"
                          style={{
                            minWidth: 18,
                            height: 16,
                            padding: '0 4px',
                            borderRadius: 9999,
                            backgroundColor: 'var(--tfd-primary-500)',
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
          </div>
        ))}
      </nav>

      {/* Version info */}
      <div
        className={clsx(
          'border-t border-white/10 px-4 py-3 text-xs',
          collapsed && 'text-center',
        )}
        style={{ color: 'var(--tfd-text-muted)' }}
      >
        {collapsed ? 'v1' : 'v1.0.0'}
      </div>
    </div>
  );

  return (
    <>
      {/* ===== Desktop / Tablet sidebar ===== */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden md:flex flex-col"
        style={{
          width: collapsed
            ? 'var(--tfd-sidebar-width-collapsed)'
            : 'var(--tfd-sidebar-width-expanded)',
          backgroundColor: 'var(--tfd-surface-sidebar)',
          transition: `width var(--tfd-transition-duration) var(--tfd-transition-timing)`,
        }}
      >
        {sidebarContent}
      </aside>

      {/* ===== Mobile overlay ===== */}
      {/* Backdrop */}
      <div
        className={clsx(
          'fixed inset-0 z-50 bg-black/50 md:hidden',
          mobileOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none',
        )}
        style={{
          transition: `opacity var(--tfd-transition-duration) var(--tfd-transition-timing)`,
        }}
        onClick={onMobileClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex flex-col md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{
          width: 'var(--tfd-sidebar-width-expanded)',
          backgroundColor: 'var(--tfd-surface-sidebar)',
          transition: `transform var(--tfd-transition-duration) var(--tfd-transition-timing)`,
        }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onMobileClose}
          className="absolute top-3 right-3 flex items-center justify-center p-1.5 text-white/60 hover:text-white hover:bg-white/10"
          style={{
            borderRadius: 'var(--tfd-radius-md)',
            transition: `color var(--tfd-transition-duration) var(--tfd-transition-timing),
                         background-color var(--tfd-transition-duration) var(--tfd-transition-timing)`,
          }}
          aria-label="Fechar menu"
        >
          <X size={20} />
        </button>

        {sidebarContent}
      </aside>
    </>
  );
}
