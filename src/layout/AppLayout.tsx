'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/layout/sidebar/Sidebar';
import Header from '@/layout/header/Header';

/* -------------------------------------------------- */
/*  Breakpoints (matches Tailwind defaults)            */
/* -------------------------------------------------- */

const BP_MD = 768;   // md  -- tablet
const BP_XL = 1280;  // xl  -- desktop

/* -------------------------------------------------- */
/*  Types                                              */
/* -------------------------------------------------- */

interface AppLayoutProps {
  children: React.ReactNode;
}

/* -------------------------------------------------- */
/*  Component                                          */
/* -------------------------------------------------- */

export default function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  /* ---- Respond to viewport changes ---- */
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

  /* ---- Toggle handlers ---- */
  const handleMenuToggle = useCallback(() => {
    if (isMobile) {
      setMobileOpen((prev) => !prev);
    } else {
      setCollapsed((prev) => !prev);
    }
  }, [isMobile]);

  const handleMobileClose = useCallback(() => {
    setMobileOpen(false);
  }, []);

  /* ---- Compute sidebar width for content offset ---- */
  const sidebarWidth = isMobile
    ? 0
    : collapsed
      ? 'var(--tfd-sidebar-width-collapsed)'
      : 'var(--tfd-sidebar-width-expanded)';

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--tfd-surface-ground)' }}
    >
      {/* Sidebar */}
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((prev) => !prev)}
        mobileOpen={mobileOpen}
        onMobileClose={handleMobileClose}
      />

      {/* Main area */}
      <div
        style={{
          marginLeft: sidebarWidth,
          transition: `margin-left var(--tfd-transition-duration) var(--tfd-transition-timing)`,
        }}
      >
        {/* Header */}
        <Header
          onMenuToggle={handleMenuToggle}
          sidebarCollapsed={collapsed || isMobile}
          sidebarWidth={sidebarWidth}
        />

        {/* Content */}
        <main
          style={{
            padding: `calc(var(--tfd-header-height) + var(--tfd-content-padding)) var(--tfd-content-padding) var(--tfd-content-padding)`,
            minHeight: '100vh',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
