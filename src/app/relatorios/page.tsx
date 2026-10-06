'use client';

import { Suspense, useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { usePermissions } from '@/shared/auth/PermissionsProvider';
import { FluxoV2Provider, useFluxoV2State } from '@/app/fluxo-v2/_state/FluxoV2Provider';
import { Skeleton } from '@/components/ui/skeleton';
import Landing from './_construtor/ui/Landing';
import Detalhe from './_construtor/ui/Detalhe';
import { montarBase } from './_construtor/dataset';
import { secoesNovoRelatorio } from './_construtor/motor';
import { doUsuario, useRelatoriosSalvos } from './_construtor/salvos';
import type { ConfigRelatorio } from './_construtor/tipos';

/**
 * Relatórios: construtor de relatórios personalizáveis, em tela única.
 * - sem parâmetro: lista dos relatórios criados pelo usuário;
 * - `?novo=1`: abre direto a tela do relatório com todos os assuntos marcados
 *   e o painel Personalizar aberto; o usuário desmarca o que não precisa, e
 *   ao salvar vira `?salvo=<id>`;
 * - `?salvo=<id>`: a mesma tela com o relatório salvo (consultar, ajustar,
 *   personalizar, exportar); `&personalizar=1` abre o painel Personalizar;
 * - `?editar=<id>`: atalho antigo, equivale a `?salvo=<id>&personalizar=1`.
 * Os relatórios fixos antigos continuam em /relatorios/anteriores.
 */
export default function RelatoriosPage() {
  return (
    <Suspense fallback={null}>
      <FluxoV2Provider>
        <RelatoriosApp />
      </FluxoV2Provider>
    </Suspense>
  );
}

function RelatoriosApp() {
  const params = useSearchParams();
  const { user, isLoading: carregandoUsuario } = usePermissions();
  const { solicitacoes, isLoading } = useFluxoV2State();
  // Lido pelo hook (e não direto do localStorage) para o servidor e o
  // navegador renderizarem a mesma coisa na primeira pintura. Até montar no
  // navegador a lista ainda está vazia, então nada decide antes disso.
  const todos = useRelatoriosSalvos();
  const montado = useSyncExternalStore(semAssinatura, () => true, () => false);
  const base = useMemo(() => montarBase(solicitacoes), [solicitacoes]);
  // Cada pessoa vê os seus. Os salvos antes desta regra (sem dono) continuam visíveis.
  const salvos = useMemo(() => doUsuario(todos, user?.id), [todos, user?.id]);
  const [rascunho] = useState<ConfigRelatorio[]>(secoesNovoRelatorio);

  const salvoId = params.get('salvo');
  const editarId = params.get('editar');
  const novo = params.get('novo');

  if (novo) {
    return <Detalhe key="novo" secoesIniciais={rascunho} base={base} carregando={isLoading} abrirPersonalizar />;
  }

  if (!montado || (carregandoUsuario && (salvoId || editarId))) return <CarregandoTela />;

  const id = salvoId ?? editarId;
  if (id) {
    const salvo = salvos.find((x) => x.id === id);
    if (!salvo) return <NaoEncontrado />;
    return <Detalhe key={`d:${salvo.id}`} relatorio={salvo} base={base} carregando={isLoading} abrirPersonalizar={Boolean(editarId) || params.get('personalizar') === '1'} />;
  }

  return <Landing salvos={salvos} carregando={false} />;
}

const semAssinatura = () => () => {};

function CarregandoTela() {
  return (
    <div className="flex flex-col gap-3 pt-2" aria-busy="true">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

function NaoEncontrado() {
  return (
    <div className="text-center" style={{ padding: '64px 16px' }}>
      <p style={{ fontSize: 16, fontWeight: 600, color: '#0F172A' }}>Relatório não encontrado</p>
      <p style={{ fontSize: 14, color: '#64748B', marginTop: 4 }}>Ele pode ter sido excluído, ou foi salvo em outro navegador.</p>
      <Link href="/relatorios" className="tfd-btn tfd-btn-primary mt-5" style={{ minHeight: 40, display: 'inline-flex' }}>Ver meus relatórios</Link>
    </div>
  );
}
