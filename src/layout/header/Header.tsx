'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { Menu, Bell, ChevronDown, User, LogOut } from 'lucide-react';

/* -------------------------------------------------- */
/*  Page title mapping                                 */
/* -------------------------------------------------- */

const pageTitleMap: Record<string, string> = {
  '/dashboard': 'Painel',
  '/solicitacoes': 'Solicita\u00e7\u00f5es',
  '/regulacao': 'Regula\u00e7\u00e3o',
  '/viagens': 'Viagens',
  '/ajuda-custo': 'Ajuda de Custo',
  '/permanencia': 'Perman\u00eancia',
  '/relatorios': 'Relat\u00f3rios',
  '/configuracoes': 'Configura\u00e7\u00f5es',
};

function getPageTitle(pathname: string): string {
  if (pageTitleMap[pathname]) return pageTitleMap[pathname];

  const segment = '/' + pathname.split('/').filter(Boolean)[0];
  return pageTitleMap[segment] ?? 'TFD';
}

/* -------------------------------------------------- */
/*  Types                                              */
/* -------------------------------------------------- */

interface HeaderProps {
  onMenuToggle: () => void;
  sidebarCollapsed: boolean;
  sidebarWidth: number | string;
}

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function Header({
  onMenuToggle,
  sidebarCollapsed,
  sidebarWidth,
}: HeaderProps) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const notificationCount = 3;

  /* Close dropdown on outside click */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header
      className="fixed top-0 right-0 z-30 flex items-center justify-between px-4 sm:px-6"
      style={{
        height: 'var(--tfd-header-height)',
        backgroundColor: 'var(--tfd-surface-header)',
        borderBottom: '1px solid var(--tfd-surface-border)',
        boxShadow: 'var(--tfd-shadow-sm)',
        left: sidebarWidth,
        transition: `left var(--tfd-transition-duration) var(--tfd-transition-timing)`,
      }}
    >
      {/* ---- Left side ---- */}
      <div className="flex items-center gap-3">
        {/* Hamburger */}
        <button
          type="button"
          onClick={onMenuToggle}
          className="flex items-center justify-center p-2 hover:bg-slate-100"
          style={{
            borderRadius: 'var(--tfd-radius-md)',
            transition: `background-color var(--tfd-transition-duration) var(--tfd-transition-timing)`,
            color: 'var(--tfd-text-secondary)',
          }}
          aria-label="Alternar menu lateral"
        >
          <Menu size={20} />
        </button>

        {/* Page title */}
        <h1
          className="text-lg font-semibold leading-tight"
          style={{ color: 'var(--tfd-text-primary)' }}
        >
          {pageTitle}
        </h1>
      </div>

      {/* ---- Right side ---- */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <button
          type="button"
          className="relative flex items-center justify-center p-2 hover:bg-slate-100"
          style={{
            borderRadius: 'var(--tfd-radius-md)',
            transition: `background-color var(--tfd-transition-duration) var(--tfd-transition-timing)`,
            color: 'var(--tfd-text-secondary)',
          }}
          aria-label={`Notifica\u00e7\u00f5es (${notificationCount})`}
        >
          <Bell size={20} />
          {notificationCount > 0 && (
            <span
              className="absolute flex items-center justify-center text-[10px] font-bold text-white"
              style={{
                top: 4,
                right: 4,
                minWidth: 16,
                height: 16,
                padding: '0 4px',
                borderRadius: 9999,
                backgroundColor: 'var(--tfd-status-danger)',
              }}
            >
              {notificationCount}
            </span>
          )}
        </button>

        {/* User menu */}
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100"
            style={{
              borderRadius: 'var(--tfd-radius-md)',
              transition: `background-color var(--tfd-transition-duration) var(--tfd-transition-timing)`,
            }}
          >
            {/* Avatar */}
            <div
              className="flex items-center justify-center rounded-full shrink-0 text-sm font-semibold text-white"
              style={{
                width: 32,
                height: 32,
                backgroundColor: 'var(--tfd-primary-500)',
              }}
            >
              MS
            </div>

            {/* Name (hidden on small screens) */}
            <span
              className="hidden sm:block text-sm font-medium truncate max-w-[120px]"
              style={{ color: 'var(--tfd-text-primary)' }}
            >
              Maria Silva
            </span>

            <ChevronDown
              size={16}
              className={clsx(
                'hidden sm:block shrink-0',
                userMenuOpen && 'rotate-180',
              )}
              style={{
                color: 'var(--tfd-text-muted)',
                transition: `transform var(--tfd-transition-duration) var(--tfd-transition-timing)`,
              }}
            />
          </button>

          {/* Dropdown */}
          {userMenuOpen && (
            <div
              className="absolute right-0 mt-1 w-56 overflow-hidden"
              style={{
                top: '100%',
                backgroundColor: 'var(--tfd-surface-card)',
                borderRadius: 'var(--tfd-radius-xl)',
                border: '1px solid var(--tfd-surface-border)',
                boxShadow: 'var(--tfd-shadow-overlay)',
                zIndex: 50,
              }}
            >
              {/* User info */}
              <div
                className="px-4 py-3"
                style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}
              >
                <p
                  className="text-sm font-semibold truncate"
                  style={{ color: 'var(--tfd-text-primary)' }}
                >
                  Maria Silva
                </p>
                <p
                  className="text-xs truncate mt-0.5"
                  style={{ color: 'var(--tfd-text-secondary)' }}
                >
                  Coordena\u00e7\u00e3o Estadual
                </p>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-sm"
                  style={{
                    color: 'var(--tfd-text-primary)',
                    transition: `background-color var(--tfd-transition-duration) var(--tfd-transition-timing)`,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      'var(--tfd-surface-hover)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = 'transparent')
                  }
                  onClick={() => setUserMenuOpen(false)}
                >
                  <User size={16} style={{ color: 'var(--tfd-text-secondary)' }} />
                  Meu Perfil
                </button>

                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-4 py-2 text-sm"
                  style={{
                    color: 'var(--tfd-status-danger)',
                    transition: `background-color var(--tfd-transition-duration) var(--tfd-transition-timing)`,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      'var(--tfd-status-danger-bg)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.backgroundColor = 'transparent')
                  }
                  onClick={() => setUserMenuOpen(false)}
                >
                  <LogOut size={16} />
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
