'use client';

import { Suspense, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { BarChart3, Receipt, Wallet } from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import RelatorioFinanceiro from './_RelatorioFinanceiro';
import RelatorioFaturamento from './_RelatorioFaturamento';
import RecibosAjudaCusto from './_RecibosAjudaCusto';

type TabKey = 'financeiro' | 'faturamento' | 'recibos';

const TABS: { key: TabKey; label: string; icon: React.ReactNode; desc: string }[] = [
  {
    key: 'financeiro',
    label: 'Financeiro',
    icon: <BarChart3 size={15} />,
    desc: 'Acompanhamento quadrimestral consolidado',
  },
  {
    key: 'faturamento',
    label: 'Faturamento',
    icon: <Receipt size={15} />,
    desc: 'Relatório mensal de passagens',
  },
  {
    key: 'recibos',
    label: 'Ajuda de Custo',
    icon: <Wallet size={15} />,
    desc: 'Recibos individuais por beneficiário',
  },
];

const DEFAULT_TAB: TabKey = 'financeiro';

export default function RelatoriosPage() {
  return (
    <Suspense fallback={null}>
      <RelatoriosInner />
    </Suspense>
  );
}

function RelatoriosInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('aba');
  const initial: TabKey = (TABS.some((t) => t.key === tabParam) ? tabParam : DEFAULT_TAB) as TabKey;
  const [activeTab, setActiveTab] = useState<TabKey>(initial);

  const setTab = (next: TabKey) => {
    setActiveTab(next);
    const params = new URLSearchParams(searchParams.toString());
    if (next === DEFAULT_TAB) params.delete('aba');
    else params.set('aba', next);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const active = TABS.find((t) => t.key === activeTab) ?? TABS[0];

  return (
    <>
      <PageHeader title="Relatórios" subtitle={active.desc} />

      {/* Tabs — mesmo padrão visual usado nas demais áreas */}
      <div
        className="flex items-stretch gap-1 mb-6 no-print"
        style={{ borderBottom: '1px solid #E2E8F0' }}
      >
        {TABS.map((t) => {
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className="relative px-4 py-3 text-[13.5px] font-medium inline-flex items-center gap-2 transition-colors"
              style={{
                color: isActive ? 'var(--tfd-primary-500)' : '#64748B',
                background: 'transparent',
              }}
            >
              <span style={{ color: isActive ? 'var(--tfd-primary-500)' : '#94A3B8' }}>{t.icon}</span>
              {t.label}
              {isActive && (
                <span
                  className="absolute left-2 right-2 -bottom-px h-[2px]"
                  style={{ background: 'var(--tfd-primary-500)' }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="animate-fade-in">
        {activeTab === 'financeiro' && <RelatorioFinanceiro />}
        {activeTab === 'faturamento' && <RelatorioFaturamento />}
        {activeTab === 'recibos' && <RecibosAjudaCusto />}
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(2px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 180ms ease-out; }
      `}</style>
    </>
  );
}
