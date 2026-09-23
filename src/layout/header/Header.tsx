'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import { Menu, Bell, Search, ChevronDown, User, LogOut } from 'lucide-react';
import { useCurrentUser } from '@/shared/hooks/useCurrentUser';


/* ── Title map ───────────────────────────────────── */

const titles: Record<string, string> = {
  '/dashboard': 'Painel',
  '/solicitacoes': 'Solicitações',
  '/diagnostico-clinico': 'Diagnóstico Clínico',
  '/parecer-medico': 'Parecer Médico',
  '/regulacao': 'Regulação',
  '/viagens': 'Viagens',
  '/ajuda-custo': 'Ajuda de Custo',
  '/permanencia': 'Permanência',
  '/relatorios': 'Relatórios',
  '/financeiro': 'Financeiro',
  '/configuracoes': 'Configurações',
  '/atendimento-destino': 'Agendamentos',
  '/alta-encerramento': 'Altas',
};

function getTitle(p: string) {
  return titles[p] ?? titles['/' + p.split('/').filter(Boolean)[0]] ?? 'TFD';
}

/* ── Props ───────────────────────────────────────── */

interface HeaderProps {
  onMenuToggle: () => void;
  sidebarCollapsed: boolean;
  sidebarWidth: number | string;
}

/* ── Component ───────────────────────────────────── */

export default function Header({
  onMenuToggle,
  sidebarWidth,
}: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const title = getTitle(pathname);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const count = 3;
  const { user } = useCurrentUser();

  const displayName = user?.nome ?? 'Usuário';
  const displayInitials = user?.iniciais ?? 'U';
  const displayPerfil = user?.perfil?.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c: string) => c.toUpperCase()) ?? '';

  function handleLogout() {
    router.push('/login');
  }

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <header
      className="fixed top-0 right-0 z-30 flex items-center justify-between px-5 sm:px-8"
      style={{
        height: 'var(--tfd-header-h)',
        background: 'var(--tfd-surface-header)',
        borderBottom: '1px solid var(--tfd-200)',
        left: sidebarWidth,
        transition: 'left 250ms var(--tfd-ease)',
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          className="flex items-center justify-center p-2 text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors duration-150"
          aria-label="Menu"
        >
          <Menu size={18} />
        </button>

        <h1 className="text-[15px] font-semibold text-[#0F172A]" style={{ letterSpacing: '-0.02em' }}>
          {title}
        </h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">
        {/* Search */}
        <button
          type="button"
          className="flex items-center justify-center p-2 text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors duration-150"
          aria-label="Buscar"
        >
          <Search size={17} />
        </button>

        {/* Bell */}
        <button
          type="button"
          className="relative flex items-center justify-center p-2 text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors duration-150"
          aria-label={`Notificações (${count})`}
        >
          <Bell size={17} />
          {count > 0 && (
            <span className="absolute top-1.5 right-1.5 flex items-center justify-center text-[8px] font-bold text-white bg-[#EF4444] min-w-[14px] h-[14px] px-[3px] rounded-full border-[1.5px] border-white">
              {count}
            </span>
          )}
        </button>

        {/* Divider */}
        <div className="hidden sm:block w-px h-5 bg-[#E2E8F0] mx-2" />

        {/* User */}
        <div ref={ref} className="relative">
          <button
            type="button"
            onClick={() => setOpen((p) => !p)}
            className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-[#F1F5F9] rounded-lg transition-colors duration-150"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#2563EB] text-white text-[11px] font-semibold shrink-0">
              {displayInitials}
            </div>
            <div className="hidden sm:flex flex-col items-start">
              <span className="text-[12px] font-medium text-[#0F172A] leading-tight">{displayName}</span>
              <span className="text-[10px] text-[#94A3B8] leading-tight">{displayPerfil}</span>
            </div>
            <ChevronDown
              size={13}
              className={clsx(
                'hidden sm:block text-[#94A3B8] transition-transform duration-150',
                open && 'rotate-180',
              )}
            />
          </button>

          {/* Dropdown */}
          {open && (
            <div
              className="absolute right-0 mt-1.5 w-52 overflow-hidden bg-white rounded-xl shadow-lg border border-[#F1F5F9] z-50"
              style={{ animation: 'tfd-scale-in 150ms var(--tfd-ease) both' }}
            >
              <div className="px-4 py-3 border-b border-[#F1F5F9]">
                <p className="text-[13px] font-semibold text-[#0F172A]">{displayName}</p>
                <p className="text-[11px] text-[#94A3B8] mt-0.5">{displayPerfil}</p>
              </div>
              <div className="py-1">
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] text-[#475569] hover:bg-[#F8FAFC] transition-colors duration-150"
                  onClick={() => setOpen(false)}
                >
                  <User size={14} className="text-[#94A3B8]" />
                  Meu Perfil
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-[13px] text-[#EF4444] hover:bg-[#FEF2F2] transition-colors duration-150"
                  onClick={handleLogout}
                >
                  <LogOut size={14} />
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
