'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users, Shield, ScrollText } from 'lucide-react';
import PageHeader from '@/shared/components/page-header/PageHeader';
import { UsuariosPanel } from '../usuarios/page';
import { PapeisPanel } from '../papeis/page';
import { LogsPanel } from '../logs/page';

type TabKey = 'usuarios' | 'permissoes' | 'logs';

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: 'usuarios',   label: 'Usuários',   icon: <Users size={16} /> },
  { key: 'permissoes', label: 'Permissões', icon: <Shield size={16} /> },
  { key: 'logs',       label: 'Logs',       icon: <ScrollText size={16} /> },
];

const DEFAULT_TAB: TabKey = 'usuarios';

export default function AdministrativoPage() {
  return (
    <Suspense fallback={null}>
      <AdministrativoInner />
    </Suspense>
  );
}

function AdministrativoInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initial: TabKey =
    tabParam && TABS.some((t) => t.key === tabParam) ? (tabParam as TabKey) : DEFAULT_TAB;

  const [activeTab, setActiveTab] = useState<TabKey>(initial);

  const handleTabChange = (key: TabKey) => {
    setActiveTab(key);
    const params = new URLSearchParams(searchParams.toString());
    if (key === DEFAULT_TAB) params.delete('tab');
    else params.set('tab', key);
    const qs = params.toString();
    router.replace(qs ? `/sistema/administrativo?${qs}` : '/sistema/administrativo', { scroll: false });
  };

  return (
    <>
      <PageHeader
        title="Administrativo"
        subtitle="Gerencie usuários, permissões e auditoria do sistema"
      />

      {/* Tab Navigation — mesmo estilo de /sistema/configuracoes */}
      <div
        className="flex items-center gap-1 mb-6 pb-3 overflow-x-auto"
        style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap relative"
              style={{
                color: isActive ? 'var(--tfd-primary-600)' : 'var(--tfd-text-secondary)',
                transition: 'color 0.2s ease-in-out',
              }}
            >
              {tab.icon}
              {tab.label}
              {isActive && (
                <span
                  className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full"
                  style={{ backgroundColor: 'var(--tfd-primary-500)', bottom: '-13px' }}
                />
              )}
            </button>
          );
        })}
      </div>

      {activeTab === 'usuarios'   && <UsuariosPanel showHeader={false} />}
      {activeTab === 'permissoes' && <PapeisPanel showHeader={false} />}
      {activeTab === 'logs'       && <LogsPanel showHeader={false} />}
    </>
  );
}
