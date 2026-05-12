'use client';

import type { ReactNode } from 'react';
import { usePermissions } from './PermissionsProvider';

/**
 * Gate inline de permissão.
 *
 * Modo 1 — checagem única (mais comum):
 *   <Can action="solicitacoes.criar">{children}</Can>
 *
 * Modo 2 — qualquer uma das ações (OR):
 *   <Can anyOf={['solicitacoes.editar_dados_basicos','solicitacoes.editar_diagnostico']}>...</Can>
 *
 * Modo 3 — todas as ações (AND):
 *   <Can allOf={['regulacao.parecer_adicionar','regulacao.carimbo_rpb']}>...</Can>
 *
 * Use `fallback` para mostrar algo no lugar (ex: tooltip "sem permissão") em
 * vez de simplesmente não renderizar.
 */
interface CanProps {
  action?: string;
  anyOf?: string[];
  allOf?: string[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function Can({ action, anyOf, allOf, fallback = null, children }: CanProps) {
  const { can } = usePermissions();

  let allowed = false;
  if (action) allowed = can(action);
  else if (anyOf && anyOf.length > 0) allowed = anyOf.some(can);
  else if (allOf && allOf.length > 0) allowed = allOf.every(can);
  else allowed = true; // sem regra → renderiza

  return <>{allowed ? children : fallback}</>;
}
