'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from './PermissionsProvider';
import { DetailPageSkeleton } from '@/shared/components/skeleton';

/**
 * Bloqueia o conteúdo da página até que se confirme que o usuário tem
 * permissão de visualizar a tela informada. Se não tiver, redireciona
 * para /dashboard.
 *
 * Uso (envolvendo a página inteira):
 *   <PageGate tela="solicitacoes">
 *     <SolicitacoesListPage />
 *   </PageGate>
 *
 * Ou indireto, com hook (em páginas grandes onde wrapper polui):
 *   const ok = usePageGate('solicitacoes');
 *   if (!ok) return null;
 */
export function PageGate({
  tela,
  children,
}: {
  tela: string;
  children: React.ReactNode;
}) {
  const ok = usePageGate(tela);
  if (ok === 'loading') return <DetailPageSkeleton tabs={0} withKpis={false} />;
  if (!ok) return null;
  return <>{children}</>;
}

export function usePageGate(tela: string): boolean | 'loading' {
  const router = useRouter();
  const { isLoading, can } = usePermissions();

  const allowed = !isLoading && can(`${tela}.visualizar`);

  useEffect(() => {
    if (isLoading) return;
    if (!allowed) {
      router.replace('/dashboard');
    }
  }, [isLoading, allowed, router]);

  if (isLoading) return 'loading';
  return allowed;
}
