'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/layout/sidebar/Sidebar';
import { Menu } from 'lucide-react';
import { usePermissions } from '@/shared/auth/PermissionsProvider';
import { telaForPathname } from '@/shared/auth/routeMap';
import { DetailPageSkeleton } from '@/shared/components/skeleton';

const BP_MD = 768;
const BP_XL = 1280;

const AUTH_ROUTES = ['/login', '/recuperar-senha', '/redefinir-senha', '/primeiro-acesso', '/consulta'];
const STANDALONE_ROUTES = ['/design-system', '/fluxo-v2/parecer-print'];

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { can, isLoading: permsLoading, user } = usePermissions();
  const isAuthPage = AUTH_ROUTES.some((r) => pathname.startsWith(r));
  const isStandalonePage = STANDALONE_ROUTES.some((r) => pathname.startsWith(r));

  // Gate centralizado de rota: se a página atual mapeia para uma tela do
  // RBAC e o usuário não tem `<tela>.visualizar`, redireciona pro dashboard.
  // Páginas públicas (login etc), standalone e /meu-perfil ficam fora.
  const requiredTela = telaForPathname(pathname);
  const isMeuPerfil = pathname.startsWith('/meu-perfil');
  const needsGate = !isAuthPage && !isStandalonePage && !isMeuPerfil && requiredTela !== null;
  const gateAllowed = needsGate
    ? !permsLoading && user !== null && can(`${requiredTela}.visualizar`)
    : true;

  useEffect(() => {
    if (!needsGate) return;
    if (permsLoading) return;
    if (!user) return; // middleware já redireciona
    if (!gateAllowed && pathname !== '/dashboard') {
      router.replace('/dashboard');
    }
  }, [needsGate, permsLoading, user, gateAllowed, pathname, router]);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const handleResize = useCallback(() => {
    const w = window.innerWidth;
    if (w < BP_MD) {
      setIsMobile(true);
      setCollapsed(false);
      setMobileOpen(false);
    } else if (w < BP_XL) {
      setIsMobile(false);
      setCollapsed(true);
      setMobileOpen(false);
    } else {
      setIsMobile(false);
      setCollapsed(false);
      setMobileOpen(false);
    }
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  const sidebarWidth = isMobile
    ? 0
    : collapsed
      ? 'var(--tfd-sidebar-w-sm)'
      : 'var(--tfd-sidebar-w)';

  // Auth pages render without sidebar/header
  if (isAuthPage) return <>{children}</>;

  // Standalone pages (design system, etc.) render without sidebar
  if (isStandalonePage) {
    return (
      <div className="min-h-screen" style={{ background: 'var(--tfd-surface-ground)' }}>
        <main className="px-5 sm:px-8 py-8" style={{ minHeight: '100vh' }}>
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--tfd-surface-ground)' }}>
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((p) => !p)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      <div
        style={{
          marginLeft: sidebarWidth,
          transition: 'margin-left 250ms var(--tfd-ease)',
        }}
      >
        {/* Mobile menu button — only visible when sidebar is hidden */}
        {isMobile && (
          <div className="sticky top-0 z-30 flex items-center px-5 py-3 md:hidden"
            style={{ background: 'var(--tfd-surface-ground)' }}
          >
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="flex items-center justify-center p-2 rounded-lg transition-colors duration-150"
              style={{ color: '#9CA3AF' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#E8ECF4'; e.currentTarget.style.color = '#1A1D2B'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = '#9CA3AF'; }}
              aria-label="Abrir menu"
            >
              <Menu size={20} />
            </button>
          </div>
        )}

        <main
          className="px-5 pb-8 sm:px-8"
          style={{
            paddingTop: isMobile ? '0.5rem' : '2rem',
            minHeight: '100vh',
          }}
        >
          {needsGate && (permsLoading || !gateAllowed)
            ? <DetailPageSkeleton tabs={0} withKpis={false} />
            : children}
        </main>
      </div>
    </div>
  );
}
