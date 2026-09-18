'use client';

import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { FluxoV2Provider, useFluxoV2State } from '@/app/fluxo-v2/_state/FluxoV2Provider';
import Landing from './_construtor/ui/Landing';
import Construtor from './_construtor/ui/Construtor';
import { montarBase } from './_construtor/dataset';
import { MODELOS } from './_construtor/modelos';
import { configInicial } from './_construtor/motor';
import { ASSUNTOS } from './_construtor/assuntos';
import { useRelatoriosSalvos } from './_construtor/salvos';
import type { AssuntoId } from './_construtor/tipos';

/**
 * Relatórios: construtor de relatórios personalizáveis.
 * - sem parâmetro: entrada com perguntas prontas, salvos e "do zero";
 * - `?modelo=<id>`: abre um modelo pronto já configurado;
 * - `?salvo=<id>`: reabre um relatório salvo;
 * - `?novo=<assunto>`: começa do zero com o assunto escolhido.
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
  // navegador renderizarem a mesma coisa na primeira pintura.
  const salvos = useRelatoriosSalvos();
  const base = useMemo(() => montarBase(solicitacoes), [solicitacoes]);

  const modeloId = params.get('modelo');
  const salvoId = params.get('salvo');
  const novo = params.get('novo') as AssuntoId | null;

  const abertura = useMemo(() => {
    if (modeloId) {
      const m = MODELOS.find((x) => x.id === modeloId);
      if (m) return { chave: `m:${m.id}`, config: m.config, titulo: m.nome, origem: 'Modelo pronto', salvoId: undefined, etapa: 'periodo' as const };
    }
    if (salvoId) {
      const s = salvos.find((x) => x.id === salvoId);
      if (s) return { chave: `s:${s.id}`, config: s.config, titulo: s.nome, origem: 'Relatório salvo', salvoId: s.id, etapa: 'periodo' as const };
    }
    if (novo) {
      // `?novo=1` começa na escolha do assunto; `?novo=<assunto>` já vem escolhido.
      const id = ASSUNTOS.some((a) => a.id === novo) ? novo : 'passagens';
      return { chave: `n:${novo}`, config: configInicial(id), titulo: 'Novo relatório', origem: 'Personalizado', salvoId: undefined, etapa: 'assunto' as const };
    }
    return null;
  }, [modeloId, salvoId, novo, salvos]);

  if (!abertura) return <Landing />;

  return (
    <Construtor
      key={abertura.chave}
      configInicial={abertura.config}
      titulo={abertura.titulo}
      origem={abertura.origem}
      salvoId={abertura.salvoId}
      etapaInicial={abertura.etapa}
      base={base}
      carregando={isLoading}
    />
  );
}
