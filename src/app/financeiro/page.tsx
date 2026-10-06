'use client';

import { Suspense, useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';
import Lista from './_competencias/ui/Lista';
import Competencia from './_competencias/ui/Competencia';
import { useCompetencias } from './_competencias/store';
import { usePermissions } from '@/shared/auth/PermissionsProvider';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Financeiro: competências mensais de Faturamento e BPA (saíram de Relatórios).
 * - sem parâmetro: lista de competências e abertura de uma nova;
 * - `?c=<id>`: a competência, com as abas Faturamento e BPA.
 */
export default function FinanceiroPage() {
  return (
    <Suspense fallback={null}>
      <FinanceiroApp />
    </Suspense>
  );
}

const semAssinatura = () => () => {};

function FinanceiroApp() {
  const id = useSearchParams().get('c');
  const competencias = useCompetencias();
  // Competências ficam no navegador: até montar, a lista ainda está vazia.
  const montado = useSyncExternalStore(semAssinatura, () => true, () => false);
  const { can, isLoading } = usePermissions();
  if (isLoading) return <div className="flex flex-col gap-3 pt-2" aria-busy="true"><Skeleton className="h-8 w-64" /><Skeleton className="h-72 w-full" /></div>;
  if (!can('tela.financeiro.visualizar')) {
    return (
      <div className="text-center" style={{ padding: '64px 16px' }}>
        <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--tfd-text-primary)' }}>Sem acesso ao Financeiro</p>
        <p style={{ fontSize: 14, color: 'var(--tfd-text-muted)', marginTop: 4 }}>Peça a quem administra o sistema a permissão de acesso ao Financeiro.</p>
      </div>
    );
  }
  if (id && montado) return <Competencia key={id} id={id} />;
  return <Lista competencias={competencias} carregando={!montado} />;
}
