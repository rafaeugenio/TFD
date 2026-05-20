'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import clsx from 'clsx';
import { resolverOrigem } from '@/shared/utils/solicitacaoOrigem';
import {
  LayoutDashboard,
  FileText,
  MapPin,
  Wallet,
  LogOut,
  BarChart3,
  Settings,
  Shield,
  Contact,
  X,
  Stethoscope,
  ChevronsLeft,
  ChevronsRight,
  Building2,
  type LucideIcon,
} from 'lucide-react';
import { usePermissions } from '@/shared/auth/PermissionsProvider';



/* ── Nav config ──────────────────────────────────── */

interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  /** ID em telas_sistema. Item só aparece se user tem `<tela>.visualizar`. */
  tela?: string;
  badge?: number;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    items: [
      { icon: LayoutDashboard, label: 'Painel', href: '/dashboard', tela: 'painel' },
    ],
  },
  {
    title: 'FLUXO DO PROCESSO',
    items: [
      { icon: FileText,     label: 'Solicitações', href: '/fluxo-v2/solicitacoes', tela: 'solicitacoes' },
      { icon: Stethoscope,  label: 'Regulação',    href: '/fluxo-v2/regulacao',    tela: 'regulacao' },
      { icon: Wallet,         label: 'Financeiro',     href: '/fluxo-v2/financeiro',     tela: 'financeiro' },
    ],
  },
  {
    title: 'CADASTROS',
    items: [
      { icon: Contact,   label: 'Pacientes',          href: '/pacientes',        tela: 'pacientes' },
      { icon: Building2, label: 'Unidades de Saúde', href: '/unidades-saude',   tela: 'unidades_saude' },
      { icon: MapPin,    label: 'Regionais',         href: '/regionais-saude', tela: 'regionais_saude' },
    ],
  },
  {
    title: 'GESTÃO',
    items: [
      { icon: BarChart3,  label: 'Relatórios',     href: '/relatorios',              tela: 'relatorios' },
      { icon: Settings,   label: 'Configurações',  href: '/sistema/configuracoes',   tela: 'sys_configuracoes' },
      { icon: Shield,     label: 'Administrativo', href: '/sistema/administrativo',  tela: 'sys_usuarios' },
    ],
  },
];

/* ── Props ───────────────────────────────────────── */

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

/* ── Component ───────────────────────────────────── */

export default function Sidebar({
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can, isLoading, user, isAdmin } = usePermissions();

  const userIniciais = (() => {
    if (!user?.nome_completo) return '?';
    const parts = user.nome_completo.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase() || '?';
  })();
  const userPerfil = isAdmin ? 'Administrador master' : (user?.perfil ?? '—');

  // Quando o usuário entra no detalhe de uma solicitação a partir de outra
  // tela (ex.: Financeiro → /fluxo-v2/solicitacoes/abc?from=financeiro),
  // mantém o item de origem ativo no menu lateral em vez de Solicitações.
  const fromParam = searchParams.get('from');
  const origem = resolverOrigem(fromParam);
  const isDetalheSolicitacao = pathname.startsWith('/fluxo-v2/solicitacoes/');
  const pathEfetivo =
    isDetalheSolicitacao && origem ? origem.href : pathname;

  const isActive = (href: string) =>
    pathEfetivo === href || pathEfetivo.startsWith(href + '/');

  // Filtra cada seção pelos itens que o usuário pode acessar.
  // Enquanto carrega, esconde tudo (evita pisca-pisca de itens que somem).
  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (isLoading) return false;
        if (!item.tela) return true;
        return can(`${item.tela}.visualizar`);
      }),
    }))
    .filter((section) => section.items.length > 0);

  const content = (
    <div className="flex flex-col h-full select-none">
      {/* ── Logo ────────────────────────────────── */}
      <div
        className={clsx(
          'flex items-center shrink-0',
          collapsed ? 'justify-center px-3' : 'justify-start px-4',
        )}
        style={{ height: 'var(--tfd-header-h)' }}
      >
        {collapsed ? (
          <span
            className="flex items-center justify-center shrink-0 text-white font-bold text-[11px] tracking-[0.08em] uppercase"
            style={{
              width: 36,
              height: 36,
              background: 'var(--tfd-blue)',
              borderRadius: 'var(--tfd-radius-md)',
            }}
            aria-label="SES Maranhão — TFD"
          >
            SES
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/brand/ses-ma-horizontal.png"
            alt="Governo do Maranhão — Secretaria de Estado da Saúde"
            style={{ height: 40, width: 'auto', objectFit: 'contain', maxWidth: '100%' }}
          />
        )}
      </div>

      {/* ── Nav ─────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto pt-4 pb-2 px-3">
        {visibleSections.map((section, si) => (
          <div key={si} className={si > 0 ? 'mt-6' : ''}>
            {section.title && !collapsed && (
              <p className="px-3 mb-2 text-[10px] font-semibold tracking-[0.12em] uppercase" style={{ color: '#9CA3AF' }}>
                {section.title}
              </p>
            )}
            {section.title && collapsed && (
              <div className="mx-3 mb-3" style={{ borderTop: '1px solid #E8ECF4' }} />
            )}

            <ul className="flex flex-col gap-px">
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
                        'group relative flex items-center gap-3 py-[9px] text-[13px] font-medium transition-all duration-150',
                        collapsed ? 'justify-center px-0' : 'px-3',
                      )}
                      style={{
                        color: active ? '#4361EE' : '#6B7280',
                        background: active ? '#EBF0FF' : undefined,
                        borderRadius: 'var(--tfd-radius-md)',
                      }}
                      onMouseEnter={(e) => {
                        if (!active) {
                          e.currentTarget.style.background = '#F5F7FA';
                          e.currentTarget.style.color = '#1A1D2B';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          e.currentTarget.style.background = '';
                          e.currentTarget.style.color = '#6B7280';
                        }
                      }}
                    >
                      {active && (
                        <span
                          className="absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] rounded-r-full"
                          style={{ height: 18, background: '#4361EE' }}
                        />
                      )}

                      <Icon
                        size={18}
                        strokeWidth={active ? 2 : 1.5}
                        className="shrink-0"
                        style={{ color: active ? '#4361EE' : undefined }}
                      />

                      {!collapsed && (
                        <>
                          <span className="truncate">{item.label}</span>

                          {item.badge != null && (
                            <span
                              className="ml-auto flex items-center justify-center text-[10px] font-bold min-w-[18px] h-[17px] px-[5px] rounded-full"
                              style={{
                                background: active ? '#4361EE' : '#EBF0FF',
                                color: active ? 'white' : '#4361EE',
                              }}
                            >
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}

                      {collapsed && (
                        <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap px-2.5 py-1.5 text-[11px] font-medium text-white bg-[#1A1D2B] rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-[60]">
                          {item.label}
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

      {/* ── Collapse toggle (desktop only) ────── */}
      <div className="hidden md:flex items-center justify-center px-3 py-2">
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center justify-center p-2 rounded-md transition-colors duration-150"
          style={{ color: '#9CA3AF' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#F5F7FA'; e.currentTarget.style.color = '#6B7280'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = '#9CA3AF'; }}
          aria-label={collapsed ? 'Expandir' : 'Recolher'}
        >
          {collapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
        </button>
      </div>

      {/* ── Logout + User profile ─────────────────────── */}
      <div style={{ borderTop: '1px solid #E8ECF4' }}>
        {/* Logout button */}
        <button
          type="button"
          className={clsx(
            'w-full flex items-center gap-2.5 transition-colors duration-150',
            collapsed ? 'justify-center px-2 py-2.5' : 'px-4 py-2.5',
          )}
          style={{ color: '#EF4444' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#FEF2F2'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
          onClick={() => { onMobileClose(); router.push('/login'); }}
        >
          <LogOut size={15} />
          {!collapsed && <span className="text-[12px] font-medium">Sair do sistema</span>}
        </button>

        {/* User profile — links to /meu-perfil */}
        <Link
          href="/meu-perfil"
          className={clsx(
            'w-full flex items-center gap-3 transition-colors duration-150 no-underline',
            collapsed ? 'justify-center px-2 py-3' : 'px-4 py-3',
          )}
          style={{ textDecoration: 'none', color: 'inherit', borderTop: '1px solid #E8ECF4' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#F5F7FA'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = ''; }}
          onClick={onMobileClose}
        >
          <div
            className="flex items-center justify-center shrink-0 text-white text-[11px] font-semibold rounded-full"
            style={{
              width: 32,
              height: 32,
              background: '#4361EE',
              border: '2px solid white',
              boxShadow: '0 0 0 1px #E8ECF4',
            }}
            title={user?.nome_completo ?? ''}
          >
            {userIniciais}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[12px] font-semibold truncate" style={{ color: '#1A1D2B' }}>
                {user?.nome_completo ?? '—'}
              </p>
              <p className="text-[10px] truncate" style={{ color: '#9CA3AF' }}>
                {userPerfil}
              </p>
            </div>
          )}
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden md:flex flex-col"
        style={{
          width: collapsed ? 'var(--tfd-sidebar-w-sm)' : 'var(--tfd-sidebar-w)',
          background: 'var(--tfd-surface-sidebar)',
          borderRight: '1px solid #E8ECF4',
          transition: 'width 250ms var(--tfd-ease)',
        }}
      >
        {content}
      </aside>

      {/* Mobile backdrop */}
      <div
        className={clsx(
          'fixed inset-0 z-50 md:hidden transition-opacity duration-200',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        style={{ background: 'rgba(26, 29, 43, 0.2)', backdropFilter: 'blur(4px)' }}
        onClick={onMobileClose}
        aria-hidden="true"
      />

      {/* Mobile drawer */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex flex-col md:hidden transition-transform duration-250',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        style={{
          width: 'var(--tfd-sidebar-w)',
          background: 'var(--tfd-surface-sidebar)',
          borderRight: '1px solid #E8ECF4',
          transitionTimingFunction: 'var(--tfd-ease)',
        }}
      >
        <button
          type="button"
          onClick={onMobileClose}
          className="absolute top-4 right-3 p-1.5 rounded-md transition-colors duration-150"
          style={{ color: '#9CA3AF' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#F5F7FA'; e.currentTarget.style.color = '#6B7280'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = ''; e.currentTarget.style.color = '#9CA3AF'; }}
          aria-label="Fechar"
        >
          <X size={16} />
        </button>
        {content}
      </aside>
    </>
  );
}
