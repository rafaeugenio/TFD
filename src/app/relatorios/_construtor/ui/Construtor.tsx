'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Save } from 'lucide-react';
import { useToast } from '@/shared/components/toast/Toast';
import { EtapaAssunto, EtapaColunas, EtapaFiltros, EtapaPeriodo, Titulo, C } from './Etapas';
import Previa from './Previa';
import { AbasAssunto, AvisoPdf, FORMATOS, useExportar } from './comum';
import { executarRelatorio } from '../motor';
import type { BaseRelatorios } from '../dataset';
import { assuntoPorId } from '../assuntos';
import { descreverFiltro, descreverRelatorio } from '../descricao';
import { salvarRelatorio } from '../salvos';
import type { AssuntoId, ConfigRelatorio } from '../tipos';

type EtapaId = 'assunto' | 'periodo' | 'colunas' | 'filtros' | 'concluir';

const ETAPAS: { id: EtapaId; label: string }[] = [
  { id: 'assunto', label: 'Assunto' },
  { id: 'periodo', label: 'Período' },
  { id: 'colunas', label: 'Colunas' },
  { id: 'filtros', label: 'Filtros' },
  { id: 'concluir', label: 'Salvar' },
];

interface Props {
  secoesIniciais: ConfigRelatorio[];
  titulo: string;
  /** Relatório em edição. Sem ele, é um relatório novo. */
  salvoId?: string;
  base: BaseRelatorios;
  carregando: boolean;
}

/**
 * Cadastro e edição do relatório, em etapas. Uma decisão por vez à esquerda,
 * prévia da tabela sempre visível à direita (abaixo, no tablet e celular).
 * Com mais de um assunto, as abas acima trocam o assunto que está sendo
 * ajustado e mostrado na prévia. As etapas podem ser revisitadas a qualquer
 * momento pelo indicador de progresso, sem perder o que já foi escolhido.
 */
export default function Construtor({ secoesIniciais, titulo, salvoId, base, carregando }: Props) {
  const toast = useToast();
  const router = useRouter();
  const [secoes, setSecoes] = useState<ConfigRelatorio[]>(secoesIniciais);
  const [ativaEscolhida, setAtiva] = useState<AssuntoId>(secoesIniciais[0].assunto);
  const [etapa, setEtapa] = useState<EtapaId>('assunto');
  const [nome, setNome] = useState(titulo);

  const ativa = secoes.some((s) => s.assunto === ativaEscolhida) ? ativaEscolhida : secoes[0].assunto;
  const config = secoes.find((s) => s.assunto === ativa)!;
  const resultados = useMemo(() => secoes.map((s) => executarRelatorio(s, base)), [secoes, base]);
  const resultado = resultados[secoes.indexOf(config)];
  const indice = ETAPAS.findIndex((e) => e.id === etapa);

  /** Ajuste na seção em foco. O período é comum: muda em todas. */
  const setConfig = (c: ConfigRelatorio) =>
    setSecoes((atuais) => atuais.map((s) => (s.assunto === c.assunto ? c : { ...s, periodo: c.periodo })));

  const qtdFiltros = secoes.reduce((acc, s) => acc + s.filtros.filter((f) => f.valores.some((v) => v !== '')).length, 0);
  const qtdColunas = secoes.reduce((acc, s) => acc + s.colunas.length, 0);

  /** Valor escolhido em cada etapa, mostrado embaixo do nome no indicador. */
  const resumoEtapa: Record<EtapaId, string> = {
    assunto: secoes.map((s) => assuntoPorId(s.assunto).label).join(', '),
    periodo: resultado.periodo.rotulo.replace(/ \(.*\)$/, ''),
    colunas: `${qtdColunas} ${qtdColunas === 1 ? 'coluna' : 'colunas'}`,
    filtros: secoes.length === 1
      ? (config.filtros.map((f) => descreverFiltro(resultado, f)).filter(Boolean).join(', ') || 'Nenhum')
      : qtdFiltros ? `${qtdFiltros} ${qtdFiltros === 1 ? 'filtro' : 'filtros'}` : 'Nenhum',
    concluir: salvoId ? 'Editando' : '',
  };

  const exportaveis = secoes.map((s, i) => ({ res: resultados[i], resumo: descreverRelatorio(s, resultados[i]) }));
  const { exportar, exportando, vazio } = useExportar(nome, exportaveis);

  function salvar(comoNovo = false) {
    const s = salvarRelatorio(comoNovo ? `${nome.trim()} (cópia)` : nome, secoes, comoNovo ? undefined : salvoId);
    toast.success(salvoId && !comoNovo ? 'Alterações salvas' : 'Relatório salvo', s.nome);
    router.push(`/relatorios?salvo=${s.id}`);
  }

  return (
    <div className="pb-10">
      <Link href={salvoId ? `/relatorios?salvo=${salvoId}` : '/relatorios'} className="inline-flex items-center gap-1.5" style={{ fontSize: 14, color: C.apoio, minHeight: 40 }}>
        <ArrowLeft size={15} /> {salvoId ? 'Voltar ao relatório sem salvar' : 'Relatórios'}
      </Link>
      <div className="flex flex-wrap items-baseline gap-x-3 mb-5">
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.ink }}>{nome || 'Novo relatório'}</h1>
        <span style={{ fontSize: 13, color: C.apoio }}>{salvoId ? 'Editando relatório salvo' : 'Novo relatório'}</span>
      </div>

      {/* Indicador de progresso: desktop */}
      <nav aria-label="Etapas do relatório" className="hidden md:block mb-5">
        <ol className="grid" style={{ gridTemplateColumns: `repeat(${ETAPAS.length}, minmax(0, 1fr))`, gap: 8 }}>
          {ETAPAS.map((e, i) => {
            const atual = e.id === etapa;
            const feita = i < indice;
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => setEtapa(e.id)}
                  aria-current={atual ? 'step' : undefined}
                  className="w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                  style={{ padding: '10px 0 0', borderTop: `3px solid ${atual || feita ? C.azul : C.borda}`, outlineColor: C.azul }}
                >
                  <span className="flex items-center gap-1.5" style={{ fontSize: 14, fontWeight: 600, color: atual ? C.azulTexto : feita ? C.ink : C.apoio }}>
                    {feita && <Check size={14} strokeWidth={2.5} style={{ color: C.azul }} />}
                    {e.label}
                  </span>
                  <span className="block truncate" style={{ fontSize: 13, color: C.apoio, marginTop: 2 }}>{resumoEtapa[e.id] || ' '}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Indicador de progresso: celular */}
      <div className="md:hidden mb-4">
        <p style={{ fontSize: 13.5, color: C.apoio }}>
          {indice + 1} de {ETAPAS.length} · <strong style={{ color: C.ink }}>{ETAPAS[indice].label}</strong>
        </p>
        <div style={{ height: 4, background: C.borda, borderRadius: 4, marginTop: 6 }}>
          <div style={{ height: 4, width: `${((indice + 1) / ETAPAS.length) * 100}%`, background: C.azul, borderRadius: 4 }} />
        </div>
      </div>

      <div className="mb-4 empty:hidden">
        <AbasAssunto
          assuntos={secoes.map((s) => s.assunto)}
          ativa={ativa}
          onChange={setAtiva}
          contagens={Object.fromEntries(resultados.map((r) => [r.assunto.id, r.totalRegistros]))}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(360px,440px)_minmax(0,1fr)] items-start">
        {/* Etapa atual */}
        <section style={{ background: 'white', border: `1px solid ${C.borda}`, borderRadius: 12 }}>
          <div style={{ padding: 20 }}>
            {etapa === 'assunto' && <EtapaAssunto secoes={secoes} onChange={setSecoes} />}
            {etapa === 'periodo' && <EtapaPeriodo config={config} onChange={setConfig} />}
            {etapa === 'colunas' && <EtapaColunas key={config.assunto} config={config} onChange={setConfig} />}
            {etapa === 'filtros' && <EtapaFiltros key={config.assunto} config={config} onChange={setConfig} base={base} resultado={resultado} />}
            {etapa === 'concluir' && (
              <div>
                <Titulo apoio="Depois de salvo, ele fica na lista de Relatórios para abrir, filtrar e exportar quando quiser.">Salvar relatório</Titulo>
                <label className="block" style={{ fontSize: 13, fontWeight: 600, color: C.texto }}>
                  Nome do relatório
                  <input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex.: Passagens e ajudas do quadrimestre"
                    style={{ display: 'block', width: '100%', minHeight: 40, marginTop: 8, padding: '0 12px', border: `1px solid ${C.borda}`, borderRadius: 8, fontSize: 14, fontWeight: 400 }}
                  />
                </label>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button type="button" className="tfd-btn tfd-btn-primary" style={{ minHeight: 40 }} disabled={!nome.trim()} onClick={() => salvar()}>
                    <Save size={15} /> {salvoId ? 'Salvar alterações' : 'Salvar relatório'}
                  </button>
                  {salvoId && (
                    <button type="button" className="tfd-btn tfd-btn-ghost" style={{ minHeight: 40 }} disabled={!nome.trim()} onClick={() => salvar(true)}>
                      Salvar como novo
                    </button>
                  )}
                </div>

                <p className="mt-6" style={{ fontSize: 13, fontWeight: 600, color: C.texto, marginBottom: 8 }}>
                  Ou exporte agora{secoes.length > 1 ? `, com os ${secoes.length} assuntos no mesmo arquivo` : ''}
                </p>
                <div className="flex flex-col gap-2">
                  {FORMATOS.map((f) => (
                    <button
                      key={f.id} type="button" onClick={() => exportar(f.id)} disabled={vazio || exportando !== null}
                      className="flex items-center gap-3 text-left hover:bg-[#F5F9FF]"
                      style={{ minHeight: 48, padding: '0 14px', border: `1px solid ${C.borda}`, borderRadius: 10, opacity: vazio ? 0.5 : 1 }}
                    >
                      <span style={{ color: C.azul }}>{f.icone}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{exportando === f.id ? 'Gerando...' : f.rotulo}</span>
                      <span style={{ fontSize: 13, color: C.apoio }}>{f.apoio}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-2"><AvisoPdf secoes={exportaveis} /></div>
                {vazio && <p className="mt-2" style={{ fontSize: 13, color: C.apoio }}>A prévia está vazia. Ajuste as etapas anteriores para exportar.</p>}
              </div>
            )}
          </div>

          <footer className="flex items-center justify-between" style={{ padding: '12px 20px', borderTop: `1px solid ${C.borda}` }}>
            <button
              type="button" className="tfd-btn tfd-btn-ghost" style={{ minHeight: 40, visibility: indice === 0 ? 'hidden' : 'visible' }}
              onClick={() => setEtapa(ETAPAS[indice - 1].id)}
            >
              Voltar
            </button>
            {indice < ETAPAS.length - 1 && (
              <button type="button" className="tfd-btn tfd-btn-primary" style={{ minHeight: 40 }} onClick={() => setEtapa(ETAPAS[indice + 1].id)}>
                Continuar
              </button>
            )}
          </footer>
        </section>

        <Previa resultado={resultado} config={config} onChange={setConfig} carregando={carregando} />
      </div>
    </div>
  );
}
