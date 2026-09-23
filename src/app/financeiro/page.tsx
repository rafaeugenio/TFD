'use client';

import { Suspense, useSyncExternalStore } from 'react';
import { useSearchParams } from 'next/navigation';
import Lista from './_competencias/ui/Lista';
import Competencia from './_competencias/ui/Competencia';
import { useCompetencias } from './_competencias/store';

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
  if (id && montado) return <Competencia key={id} id={id} />;
  return <Lista competencias={competencias} carregando={!montado} />;
}
