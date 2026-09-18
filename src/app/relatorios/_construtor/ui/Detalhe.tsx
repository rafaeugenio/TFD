'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, ChevronDown, Eye, Pencil, RotateCcw, Save, Search, SlidersHorizontal, X } from 'lucide-react';
import PageHeader from '@/shared/components/page-header/PageHeader';
import { useToast } from '@/shared/components/toast/Toast';
import { EtapaFiltros, EtapaPeriodo, C, rotuloCampo } from './Etapas';
import Previa, { cartao } from './Previa';
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
  height: 36, padding: '0 10px', border: `1px solid ${C.campo}`, borderRadius: 'var(--tfd-radius-md)', background: 'white', fontSize: 14, color: C.ink,
};

/**
 * Consulta de um relatório salvo. Diferente do cadastro: aqui a pessoa lê os
 * dados. Segue o layout do relatório de Gestão do sistema: cabeçalho com
 * breadcrumb, abas, cartão de filtros com rótulos em caixa alta, faixa de
 * indicadores e seção de linhas. Ajustes feitos aqui valem só para esta
 * consulta até a pessoa escolher salvar; a tela avisa quando a visão difere
 * do salvo.
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
      <PageHeader
        title={relatorio.nome}
        subtitle={`${secoes.map((s) => assuntoPorId(s.assunto).label).join(' · ')} · atualizado em ${new Date(relatorio.atualizadoEm).toLocaleDateString('pt-BR')}`}
        breadcrumbs={[{ label: 'Gestão' }, { label: 'Relatórios', href: '/relatorios' }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/relatorios?editar=${relatorio.id}`} className="tfd-btn tfd-btn-secondary">
              <Pencil size={15} /> Editar
            </Link>
            <MenuExportar titulo={relatorio.nome} secoes={exportaveis} />
          </div>
        }
      />

      <div className="mb-5 empty:hidden">
        <AbasAssunto
          assuntos={secoes.map((s) => s.assunto)}
          ativa={ativa}
          onChange={(id) => { setAtiva(id); if (painel === 'filtros') setPainel(null); }}
          contagens={Object.fromEntries(resultados.map((r) => [r.assunto.id, r.totalRegistros]))}
        />
      </div>

      {/* Ajustes não salvos */}
      {alterado && (
        <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-5" style={{ padding: '8px 12px 8px 14px', background: C.azulSuave, border: `1px solid ${C.azulBorda}`, borderRadius: 'var(--tfd-radius-md)', fontSize: 14, color: C.azulTexto }}>
          <Eye size={16} style={{ flexShrink: 0 }} />
          <span className="flex-1 min-w-[220px]">Você está vendo um ajuste desta consulta. O relatório salvo continua como estava.</span>
          <button type="button" className="tfd-btn tfd-btn-ghost tfd-btn--sm" onClick={() => setSecoes(relatorio.secoes)}>
            <RotateCcw size={14} /> Voltar ao salvo
          </button>
          <button
            type="button" className="tfd-btn tfd-btn-primary tfd-btn--sm"
            onClick={() => { salvarRelatorio(relatorio.nome, secoes, relatorio.id); toast.success('Ajustes salvos no relatório', relatorio.nome); }}
          >
            <Save size={14} /> Salvar no relatório
          </button>
        </div>
      )}

      {/* Filtros, no formato do cartão de filtros dos relatórios do sistema */}
      <section aria-label="Ajustar a consulta" className="mb-5" style={cartao}>
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3" style={{ padding: '0.875rem 1.25rem' }}>
          <Campo rotulo="Período" icone={<CalendarDays size={12} />}>
            <BotaoBarra ativo={painel === 'periodo'} onClick={() => alternarPainel('periodo')}>{nomePeriodo(config.periodo)}</BotaoBarra>
          </Campo>

          <Campo rotulo="Buscar" icone={<Search size={12} />} className="w-full order-first sm:order-none sm:w-auto sm:flex-1" estilo={{ minWidth: 220, maxWidth: 420 }}>
            <span className="relative block">
              <Search size={16} className="absolute" style={{ left: 11, top: 10, color: C.claro }} />
              <input
                type="search" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar nas colunas da tabela"
                placeholder="Buscar nas colunas da tabela..."
                style={{ ...campoStyle, width: '100%', padding: '0 10px 0 35px' }}
              />
            </span>
          </Campo>

          <Campo rotulo="Filtros" icone={<SlidersHorizontal size={12} />}>
            <BotaoBarra ativo={painel === 'filtros'} onClick={() => alternarPainel('filtros')}>
              {filtrosAtivos.length ? `${filtrosAtivos.length} ${filtrosAtivos.length === 1 ? 'aplicado' : 'aplicados'}` : 'Nenhum'}
            </BotaoBarra>
          </Campo>

          {assunto.id !== 'financeiro' && (
            <Campo rotulo="Mostrar" className="w-full sm:w-auto">
              <select
                aria-label="Como mostrar a tabela"
                value={config.agruparPor}
                onChange={(e) => setConfig({ ...config, agruparPor: e.target.value })}
                className="w-full"
                style={{ ...campoStyle, minWidth: 220, maxWidth: 320 }}
              >
                <option value="">Um registro por linha</option>
                {agrupaveis.map((c) => <option key={c.id} value={c.id}>Totais por {c.tipo === 'data' ? `${c.label.toLowerCase()} (mês)` : c.label.toLowerCase()}</option>)}
              </select>
            </Campo>
          )}

          {(filtrosAtivos.length > 0 || busca.trim()) && (
            <button
              type="button" className="tfd-btn tfd-btn-ghost sm:ml-auto"
              onClick={() => { setBusca(''); setConfig({ ...config, filtros: [] }); }}
            >
              <X size={15} /> Limpar
            </button>
          )}
        </div>

        {painel && (
          <div style={{ padding: '1rem 1.25rem 1.1rem', borderTop: `1px dashed ${C.borda}` }}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <p style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>
                {painel === 'periodo' ? 'Período e data usada na contagem' : `Filtros de ${assunto.label.toLowerCase()}`}
                {painel === 'periodo' && secoes.length > 1 && (
                  <span style={{ display: 'block', fontSize: 13, fontWeight: 400, color: C.claro }}>O período vale para todos os assuntos. A data de contagem é de {assunto.label.toLowerCase()}.</span>
                )}
              </p>
              <button type="button" aria-label="Fechar" onClick={() => setPainel(null)} className="tfd-btn tfd-btn-ghost tfd-btn--icon-only shrink-0">
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
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2" style={{ padding: '10px 1.25rem', borderTop: `1px dashed ${C.borda}`, fontSize: 13, color: C.apoio }}>
          <span>
            {campoGrupo ? `Cada linha é um total por ${campoGrupo.label.toLowerCase()}.` : `Cada linha é ${assunto.cadaLinha}`}
            {' '}De {dataBR(resultado.periodo.inicio)} a {dataBR(resultado.periodo.fim)}
            {assunto.id !== 'financeiro' && <>, data considerada: <strong style={{ fontWeight: 600, color: C.texto }}>{resultado.referencia.label.toLowerCase()}</strong></>}.
          </span>
          {painel !== 'filtros' && filtrosAtivos.map((f) => (
            <Etiqueta key={f.campoId} texto={descreverFiltro(resultado, f)} onRemover={() => setConfig({ ...config, filtros: config.filtros.filter((x) => x.campoId !== f.campoId) })} />
          ))}
          {busca.trim() && <Etiqueta texto={`Com "${busca.trim()}"`} onRemover={() => setBusca('')} />}
        </div>
      </section>

      <Previa key={config.assunto} rotulo={secoes.length > 1 ? `Linhas de ${assunto.label.toLowerCase()}` : 'Linhas do relatório'} resultado={resultado} config={config} onChange={setConfig} carregando={carregando} />
    </div>
  );
}

function Campo({ rotulo, icone, children, className, estilo }: { rotulo: string; icone?: React.ReactNode; children: React.ReactNode; className?: string; estilo?: React.CSSProperties }) {
  return (
    <div className={className} style={estilo}>
      <span style={rotuloCampo}>{icone}{rotulo}</span>
      {children}
    </div>
  );
}

function Etiqueta({ texto, onRemover }: { texto: string; onRemover: () => void }) {
  return (
    <span className="inline-flex items-center" style={{ background: C.azulSuave, borderRadius: 'var(--tfd-radius-md)', color: C.azulTexto, fontSize: 13 }}>
      <span style={{ padding: '4px 2px 4px 10px' }}>{texto}</span>
      <button type="button" aria-label={`Remover ${texto}`} onClick={onRemover} className="inline-flex items-center justify-center" style={{ width: 30, height: 30 }}>
        <X size={14} />
      </button>
    </span>
  );
}

/** Aparência de p-select: abre o painel inline abaixo da barra. */
function BotaoBarra({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick} aria-expanded={ativo}
      className="inline-flex items-center justify-between gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
      style={{
        height: 36, minWidth: 160, padding: '0 10px', borderRadius: 'var(--tfd-radius-md)', fontSize: 14, fontWeight: 400, outlineColor: C.azul,
        border: `1px solid ${ativo ? C.azul : C.campo}`, background: 'white', color: C.ink,
      }}
    >
      {children}
      <ChevronDown size={16} style={{ color: C.apoio, transform: ativo ? 'rotate(180deg)' : undefined }} />
    </button>
  );
}
