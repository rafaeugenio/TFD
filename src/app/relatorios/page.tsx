'use client';

import { Suspense, useMemo, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FluxoV2Provider, useFluxoV2State } from '@/app/fluxo-v2/_state/FluxoV2Provider';
import { Skeleton } from '@/components/ui/skeleton';
import Landing from './_construtor/ui/Landing';
import Construtor from './_construtor/ui/Construtor';
import Detalhe from './_construtor/ui/Detalhe';
import { montarBase } from './_construtor/dataset';
import { configInicial } from './_construtor/motor';
import { useRelatoriosSalvos } from './_construtor/salvos';

/**
 * Relatórios: construtor de relatórios personalizáveis.
 * - sem parâmetro: lista dos relatórios criados pelo usuário;
 * - `?novo=1`: cadastro em etapas de um relatório novo;
 * - `?salvo=<id>`: consulta do relatório salvo (filtrar, pesquisar, exportar);
 * - `?editar=<id>`: cadastro em etapas com o relatório salvo preenchido.
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
  const { solicitacoes, isLoading } = useFluxoV2State();
  // Lido pelo hook (e não direto do localStorage) para o servidor e o
  // navegador renderizarem a mesma coisa na primeira pintura. Até montar no
  // navegador a lista ainda está vazia, então nada decide antes disso.
  const salvos = useRelatoriosSalvos();
  const montado = useSyncExternalStore(semAssinatura, () => true, () => false);
  const base = useMemo(() => montarBase(solicitacoes), [solicitacoes]);

  const salvoId = params.get('salvo');
  const editarId = params.get('editar');
  const novo = params.get('novo');

  if (novo) {
    return <Construtor key="novo" secoesIniciais={[configInicial('passagens')]} titulo="" base={base} carregando={isLoading} />;
  }

  if (!montado) return <CarregandoTela />;

  const id = salvoId ?? editarId;
  if (id) {
    const salvo = salvos.find((x) => x.id === id);
    if (!salvo) return <NaoEncontrado />;
    return editarId ? (
      <Construtor key={`e:${salvo.id}`} secoesIniciais={salvo.secoes} titulo={salvo.nome} salvoId={salvo.id} base={base} carregando={isLoading} />
    ) : (
      <Detalhe key={`d:${salvo.id}`} relatorio={salvo} base={base} carregando={isLoading} />
    );
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
