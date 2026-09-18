'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, ChevronDown, Pencil, RotateCcw, Save, Search, SlidersHorizontal, X } from 'lucide-react';
import { useToast } from '@/shared/components/toast/Toast';
import { EtapaFiltros, EtapaPeriodo, C } from './Etapas';
import Previa from './Previa';
import { AbasAssunto, MenuExportar } from './comum';
import { assuntoPorId, camposDoAssunto } from '../assuntos';
import type { BaseRelatorios } from '../dataset';
import { descreverFiltro, descreverRelatorio } from '../descricao';
import { executarRelatorio } from '../motor';
import { dataBR, nomePeriodo } from '../periodo';
import { salvarRelatorio } from '../salvos';
import type { AssuntoId, ConfigRelatorio, RelatorioSalvo } from '../tipos';

type Painel = 'periodo' | 'filtros' | null;

const campoStyle: React.CSSProperties = {
  minHeight: 40, padding: '0 12px', border: `1px solid ${C.borda}`, borderRadius: 8, background: 'white', fontSize: 14, color: C.ink,
};

/**
 * Consulta de um relatório salvo. Diferente do cadastro: aqui a pessoa lê os
 * dados. Tudo o que muda a leitura fica numa barra só (período, busca,
 * filtros e forma de mostrar), sempre com o efeito visível na contagem, nos
 * totais e na tabela. Ajustes feitos aqui valem só para esta consulta até a
 * pessoa escolher salvar; a tela avisa quando a visão difere do salvo.
 */
export default function Detalhe({ relatorio, base, carregando }: { relatorio: RelatorioSalvo; base: BaseRelatorios; carregando: boolean }) {
  const toast = useToast();
  const [secoes, setSecoes] = useState<ConfigRelatorio[]>(relatorio.secoes);
  const [ativaEscolhida, setAtiva] = useState<AssuntoId>(relatorio.secoes[0].assunto);
  const [busca, setBusca] = useState('');
  const [painel, setPainel] = useState<Painel>(null);

  const ativa = secoes.some((s) => s.assunto === ativaEscolhida) ? ativaEscolhida : secoes[0].assunto;
  const config = secoes.find((s) => s.assunto === ativa)!;
  const resultados = useMemo(() => secoes.map((s) => executarRelatorio(s, base, busca)), [secoes, base, busca]);
  const resultado = resultados[secoes.indexOf(config)];
  const assunto = assuntoPorId(config.assunto);

  const setConfig = (c: ConfigRelatorio) =>
    setSecoes((atuais) => atuais.map((s) => (s.assunto === c.assunto ? c : { ...s, periodo: c.periodo })));

  const alterado = JSON.stringify(secoes) !== JSON.stringify(relatorio.secoes);
  const filtrosAtivos = config.filtros.filter((f) => f.valores.some((v) => v !== ''));
  const agrupaveis = camposDoAssunto(assunto).filter((c) => c.agrupavel);
  const campoGrupo = assunto.id !== 'financeiro' ? agrupaveis.find((c) => c.id === config.agruparPor) : undefined;
  const exportaveis = secoes.map((s, i) => ({ res: resultados[i], resumo: descreverRelatorio(s, resultados[i], false, busca) }));
  const alternarPainel = (p: Painel) => setPainel((atual) => (atual === p ? null : p));

  return (
    <div className="pb-10">
      <Link href="/relatorios" className="inline-flex items-center gap-1.5" style={{ fontSize: 14, color: C.apoio, minHeight: 40 }}>
        <ArrowLeft size={15} /> Relatórios
      </Link>

      {/* Cabeçalho */}
      <header className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.ink, lineHeight: 1.25 }}>{relatorio.nome}</h1>
          <p style={{ fontSize: 13.5, color: C.apoio, marginTop: 4 }}>
            {secoes.map((s) => assuntoPorId(s.assunto).label).join(' · ')} · atualizado em {new Date(relatorio.atualizadoEm).toLocaleDateString('pt-BR')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/relatorios?editar=${relatorio.id}`} className="tfd-btn tfd-btn-secondary" style={{ minHeight: 40 }}>
            <Pencil size={15} /> Editar
          </Link>
          <MenuExportar titulo={relatorio.nome} secoes={exportaveis} />
        </div>
      </header>

      {/* Ajustes não salvos */}
      {alterado && (
        <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3" style={{ padding: '8px 12px', background: C.azulSuave, border: `1px solid ${C.azulBorda}`, borderRadius: 10, fontSize: 14, color: C.azulTexto }}>
          <span className="flex-1 min-w-[220px]">Você está vendo um ajuste desta consulta. O relatório salvo continua como estava.</span>
          <button type="button" className="tfd-btn tfd-btn-ghost tfd-btn--sm" style={{ minHeight: 36 }} onClick={() => setSecoes(relatorio.secoes)}>
            <RotateCcw size={14} /> Voltar ao salvo
          </button>
          <button
            type="button" className="tfd-btn tfd-btn-secondary tfd-btn--sm" style={{ minHeight: 36 }}
            onClick={() => { salvarRelatorio(relatorio.nome, secoes, relatorio.id); toast.success('Ajustes salvos no relatório', relatorio.nome); }}
          >
            <Save size={14} /> Salvar no relatório
          </button>
        </div>
      )}

      <div className="mb-3 empty:hidden">
        <AbasAssunto
          assuntos={secoes.map((s) => s.assunto)}
          ativa={ativa}
          onChange={(id) => { setAtiva(id); if (painel === 'filtros') setPainel(null); }}
          contagens={Object.fromEntries(resultados.map((r) => [r.assunto.id, r.totalRegistros]))}
        />
      </div>

      {/* Barra de ajustes da leitura */}
      <section aria-label="Ajustar a consulta" className="mb-4" style={{ background: 'white', border: `1px solid ${C.borda}`, borderRadius: 12 }}>
        <div className="flex flex-wrap items-center gap-2" style={{ padding: 12 }}>
          <BotaoBarra ativo={painel === 'periodo'} onClick={() => alternarPainel('periodo')} icone={<CalendarDays size={16} />}>
            {nomePeriodo(config.periodo)}
          </BotaoBarra>

          <label className="relative w-full order-first sm:order-none sm:w-auto sm:flex-1" style={{ minWidth: 200, maxWidth: 420 }}>
            <span className="sr-only">Buscar no relatório</span>
            <Search size={16} className="absolute" style={{ left: 12, top: 12, color: C.apoio }} />
            <input
              type="search" value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar nas colunas da tabela"
              style={{ ...campoStyle, width: '100%', padding: '0 12px 0 36px' }}
            />
          </label>

          <BotaoBarra ativo={painel === 'filtros'} onClick={() => alternarPainel('filtros')} icone={<SlidersHorizontal size={16} />}>
            Filtros
            {filtrosAtivos.length > 0 && (
              <span style={{ fontSize: 12, fontWeight: 700, color: 'white', background: C.azul, borderRadius: 999, minWidth: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px' }}>
                {filtrosAtivos.length}
              </span>
            )}
          </BotaoBarra>

          {assunto.id !== 'financeiro' && (
            <label className="flex items-center gap-2 w-full sm:w-auto" style={{ fontSize: 14, color: C.texto }}>
              <span className="whitespace-nowrap">Mostrar</span>
              <select
                aria-label="Como mostrar a tabela"
                value={config.agruparPor}
                onChange={(e) => setConfig({ ...config, agruparPor: e.target.value })}
                className="flex-1 min-w-0"
                style={{ ...campoStyle, maxWidth: 320 }}
              >
                <option value="">Um registro por linha</option>
                {agrupaveis.map((c) => <option key={c.id} value={c.id}>Totais por {c.tipo === 'data' ? `${c.label.toLowerCase()} (mês)` : c.label.toLowerCase()}</option>)}
              </select>
            </label>
          )}
        </div>

        {painel && (
          <div style={{ padding: '16px 16px 18px', borderTop: `1px solid ${C.borda}`, background: C.fundo, borderRadius: '0 0 12px 12px' }}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <p style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>
                {painel === 'periodo' ? 'Período e data usada na contagem' : `Filtros de ${assunto.label.toLowerCase()}`}
                {painel === 'periodo' && secoes.length > 1 && (
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 400, color: C.apoio }}>O período vale para todos os assuntos. A data de contagem é de {assunto.label.toLowerCase()}.</span>
                )}
              </p>
              <button type="button" aria-label="Fechar" onClick={() => setPainel(null)} className="inline-flex items-center justify-center shrink-0" style={{ width: 36, height: 36, color: C.apoio }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ maxWidth: 760 }}>
              {painel === 'periodo' && <EtapaPeriodo semTitulo config={config} onChange={setConfig} />}
              {painel === 'filtros' && <EtapaFiltros key={config.assunto} semTitulo config={config} onChange={setConfig} base={base} resultado={resultado} />}
            </div>
          </div>
        )}

        {/* O que os números significam, em uma linha. Filtros ativos removíveis. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2" style={{ padding: '10px 14px', borderTop: `1px solid ${C.borda}`, fontSize: 13.5, color: C.texto }}>
          <span>
            {campoGrupo ? `Cada linha é um total por ${campoGrupo.label.toLowerCase()}.` : `Cada linha é ${assunto.cadaLinha}`}
            {' '}De {dataBR(resultado.periodo.inicio)} a {dataBR(resultado.periodo.fim)}
            {assunto.id !== 'financeiro' && <>, data considerada: <strong style={{ fontWeight: 600 }}>{resultado.referencia.label.toLowerCase()}</strong></>}.
          </span>
          {painel !== 'filtros' && filtrosAtivos.map((f) => (
            <span key={f.campoId} className="inline-flex items-center" style={{ border: `1px solid ${C.azulBorda}`, background: C.azulSuave, borderRadius: 999, color: C.azulTexto }}>
              <span style={{ padding: '4px 2px 4px 12px' }}>{descreverFiltro(resultado, f)}</span>
              <button
                type="button" aria-label={`Remover filtro ${descreverFiltro(resultado, f)}`}
                onClick={() => setConfig({ ...config, filtros: config.filtros.filter((x) => x.campoId !== f.campoId) })}
                className="inline-flex items-center justify-center" style={{ width: 32, height: 32 }}
              >
                <X size={14} />
              </button>
            </span>
          ))}
          {busca.trim() && (
            <span className="inline-flex items-center" style={{ border: `1px solid ${C.borda}`, background: 'white', borderRadius: 999 }}>
              <span style={{ padding: '4px 2px 4px 12px' }}>Com &quot;{busca.trim()}&quot;</span>
              <button type="button" aria-label="Limpar busca" onClick={() => setBusca('')} className="inline-flex items-center justify-center" style={{ width: 32, height: 32 }}>
                <X size={14} />
              </button>
            </span>
          )}
        </div>
      </section>

      <Previa key={config.assunto} rotulo={secoes.length > 1 ? assunto.label : 'Resultado'} resultado={resultado} config={config} onChange={setConfig} carregando={carregando} />
    </div>
  );
}

function BotaoBarra({ ativo, onClick, icone, children }: { ativo: boolean; onClick: () => void; icone: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick} aria-expanded={ativo}
      className="inline-flex items-center gap-2 hover:bg-[#F5F9FF] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        minHeight: 40, padding: '0 12px', borderRadius: 8, fontSize: 14, fontWeight: 500, outlineColor: C.azul,
        border: `1px solid ${ativo ? C.azul : C.borda}`, background: ativo ? C.azulSuave : 'white', color: ativo ? C.azulTexto : C.ink,
      }}
    >
      <span style={{ color: ativo ? C.azul : C.apoio, display: 'inline-flex' }}>{icone}</span>
      {children}
      <ChevronDown size={15} style={{ color: C.apoio, transform: ativo ? 'rotate(180deg)' : undefined }} />
    </button>
  );
}
