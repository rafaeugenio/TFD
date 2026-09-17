'use client';

import { Suspense, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, BarChart3, Receipt, ClipboardList, FileSpreadsheet, Stamp } from 'lucide-react';

import PageHeader from '@/shared/components/page-header/PageHeader';
import RelatorioFinanceiro from './_RelatorioFinanceiro';
import RelatorioFaturamento from './_RelatorioFaturamento';
import RelatorioRPB from './_RelatorioRPB';
import RelatorioGestao from './_RelatorioGestao';
import RelatorioRegulacao from './_RelatorioRegulacao';

type TabKey = 'financeiro' | 'faturamento' | 'rpb' | 'gestao' | 'regulacao';

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
    key: 'rpb',
    label: 'BPA',
    icon: <ClipboardList size={15} />,
    desc: 'Dados para lançamento no BPA',
  },
  {
    key: 'gestao',
    label: 'Gestão',
    icon: <FileSpreadsheet size={15} />,
    desc: 'Visão consolidada por paciente — paciente, diagnóstico, origem do laudo, destino e parecer',
  },
  {
    key: 'regulacao',
    label: 'Regulação',
    icon: <Stamp size={15} />,
    desc: 'Agendamentos por tipo de carimbo da Regulação, por data de agendamento',
  },
];

const DEFAULT_TAB: TabKey = 'financeiro';

/**
 * Relatórios fixos anteriores ao construtor de relatórios. Continuam
 * disponíveis enquanto os modelos do construtor são validados com os setores.
 */
export default function RelatoriosAnterioresPage() {
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
      <Link href="/relatorios" className="inline-flex items-center gap-1.5 text-[13px] mb-3 no-print" style={{ color: '#64748B' }}>
        <ArrowLeft size={14} /> Voltar para o construtor de relatórios
      </Link>
      <PageHeader title="Relatórios anteriores" subtitle={active.desc} />

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
        {activeTab === 'rpb' && <RelatorioRPB />}
        {activeTab === 'gestao' && <RelatorioGestao />}
        {activeTab === 'regulacao' && <RelatorioRegulacao />}
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
