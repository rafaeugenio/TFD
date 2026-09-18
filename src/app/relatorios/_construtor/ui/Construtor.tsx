'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Check, FileSpreadsheet, FileText, Save, Table2 } from 'lucide-react';
import { useToast } from '@/shared/components/toast/Toast';
import { EtapaAssunto, EtapaColunas, EtapaFiltros, EtapaPeriodo, Titulo, C } from './Etapas';
import Previa from './Previa';
import { executarRelatorio } from '../motor';
import type { BaseRelatorios } from '../dataset';
import { assuntoPorId } from '../assuntos';
import { descreverFiltro, descreverRelatorio } from '../descricao';
import { exportarCSV, exportarPDF, exportarXLSX } from '../exportar';
import { salvarRelatorio } from '../salvos';
import type { ConfigRelatorio } from '../tipos';

type EtapaId = 'assunto' | 'periodo' | 'colunas' | 'filtros' | 'concluir';

const ETAPAS: { id: EtapaId; label: string }[] = [
  { id: 'assunto', label: 'Assunto' },
  { id: 'periodo', label: 'Período' },
  { id: 'colunas', label: 'Colunas' },
  { id: 'filtros', label: 'Filtros' },
  { id: 'concluir', label: 'Salvar e exportar' },
];

interface Props {
  configInicial: ConfigRelatorio;
  titulo: string;
  origem: string;
  salvoId?: string;
  base: BaseRelatorios;
  carregando: boolean;
  /** Modelos e salvos já têm assunto: abrem direto no período. */
  etapaInicial?: EtapaId;
}

/**
 * Construtor em etapas. Uma decisão por vez à esquerda, prévia da tabela
 * sempre visível à direita (abaixo, no tablet e celular). As etapas podem ser
 * revisitadas a qualquer momento pelo indicador de progresso, sem perder o
 * que já foi escolhido.
 */
export default function Construtor({ configInicial, titulo, origem, salvoId: salvoInicial, base, carregando, etapaInicial = 'assunto' }: Props) {
  const toast = useToast();
  const [config, setConfig] = useState<ConfigRelatorio>(configInicial);
  const [etapa, setEtapa] = useState<EtapaId>(etapaInicial);
  const [nome, setNome] = useState(titulo);
  const [salvoId, setSalvoId] = useState(salvoInicial);
  const [exportando, setExportando] = useState<string | null>(null);

  const resultado = useMemo(() => executarRelatorio(config, base), [config, base]);
  const indice = ETAPAS.findIndex((e) => e.id === etapa);

  /** Valor escolhido em cada etapa, mostrado embaixo do nome no indicador. */
  const resumoEtapa: Record<EtapaId, string> = {
    assunto: assuntoPorId(config.assunto).label,
    periodo: resultado.periodo.rotulo.replace(/ \(.*\)$/, ''),
    colunas: `${config.colunas.length} ${config.colunas.length === 1 ? 'coluna' : 'colunas'}`,
    filtros: config.filtros.length ? config.filtros.map((f) => descreverFiltro(resultado, f)).filter(Boolean).join(', ') : 'Nenhum',
    concluir: salvoId ? 'Salvo' : '',
  };

  async function exportar(formato: 'xlsx' | 'csv' | 'pdf') {
    setExportando(formato);
    try {
      const desc = { titulo: nome, linhasResumo: descreverRelatorio(config, resultado) };
      if (formato === 'csv') exportarCSV(resultado, desc);
      if (formato === 'xlsx') await exportarXLSX(resultado, desc);
      if (formato === 'pdf') await exportarPDF(resultado, desc);
      toast.success('Arquivo gerado', 'Com o mesmo recorte da prévia.');
    } catch (e) {
      toast.error('Não foi possível gerar o arquivo', String(e));
    } finally {
      setExportando(null);
    }
  }

  const semDados = resultado.linhas.length === 0 || resultado.colunas.length === 0;

  return (
    <div className="pb-10">
      <Link href="/relatorios" className="inline-flex items-center gap-1.5" style={{ fontSize: 14, color: C.apoio, minHeight: 40 }}>
        <ArrowLeft size={15} /> Relatórios
      </Link>
      <div className="flex flex-wrap items-baseline gap-x-3 mb-5">
        <h1 style={{ fontSize: 22, fontWeight: 700, color: C.ink }}>{nome}</h1>
        <span style={{ fontSize: 13, color: C.apoio }}>{origem}</span>
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

      <div className="grid gap-5 xl:grid-cols-[minmax(360px,440px)_minmax(0,1fr)] items-start">
        {/* Etapa atual */}
        <section style={{ background: 'white', border: `1px solid ${C.borda}`, borderRadius: 12 }}>
          <div style={{ padding: 20 }}>
            {etapa === 'assunto' && <EtapaAssunto config={config} onChange={setConfig} />}
            {etapa === 'periodo' && <EtapaPeriodo config={config} onChange={setConfig} />}
            {etapa === 'colunas' && <EtapaColunas config={config} onChange={setConfig} />}
            {etapa === 'filtros' && <EtapaFiltros config={config} onChange={setConfig} base={base} resultado={resultado} />}
            {etapa === 'concluir' && (
              <div>
                <Titulo>Salvar e exportar</Titulo>
                <label className="block" style={{ fontSize: 13, fontWeight: 600, color: C.texto }}>
                  Nome do relatório
                  <input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    style={{ display: 'block', width: '100%', minHeight: 40, marginTop: 8, padding: '0 12px', border: `1px solid ${C.borda}`, borderRadius: 8, fontSize: 14, fontWeight: 400 }}
                  />
                </label>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    type="button" className="tfd-btn tfd-btn-secondary" style={{ minHeight: 40 }} disabled={!nome.trim()}
                    onClick={() => {
                      const s = salvarRelatorio(nome, config, salvoId);
                      setSalvoId(s.id);
                      toast.success(salvoId ? 'Relatório atualizado' : 'Relatório salvo', 'Fica em Meus relatórios.');
                    }}
                  >
                    <Save size={15} /> {salvoId ? 'Salvar alterações' : 'Salvar'}
                  </button>
                  {salvoId && (
                    <button
                      type="button" className="tfd-btn tfd-btn-ghost" style={{ minHeight: 40 }}
                      onClick={() => { const s = salvarRelatorio(`${nome} (cópia)`, config); setSalvoId(s.id); setNome(s.nome); toast.success('Cópia salva', s.nome); }}
                    >
                      Salvar como novo
                    </button>
                  )}
                </div>

                <p className="mt-6" style={{ fontSize: 13, fontWeight: 600, color: C.texto, marginBottom: 8 }}>Exportar</p>
                <div className="flex flex-col gap-2">
                  {[
                    { id: 'xlsx' as const, rotulo: 'Excel', apoio: 'para continuar trabalhando', icone: <FileSpreadsheet size={18} /> },
                    { id: 'pdf' as const, rotulo: 'PDF', apoio: 'para ler ou imprimir', icone: <FileText size={18} /> },
                    { id: 'csv' as const, rotulo: 'CSV', apoio: 'para outros sistemas', icone: <Table2 size={18} /> },
                  ].map((f) => (
                    <button
                      key={f.id} type="button" onClick={() => exportar(f.id)} disabled={semDados || exportando !== null}
                      className="flex items-center gap-3 text-left hover:bg-[#F5F9FF]"
                      style={{ minHeight: 48, padding: '0 14px', border: `1px solid ${C.borda}`, borderRadius: 10, opacity: semDados ? 0.5 : 1 }}
                    >
                      <span style={{ color: C.azul }}>{f.icone}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{exportando === f.id ? 'Gerando...' : f.rotulo}</span>
                      <span style={{ fontSize: 13, color: C.apoio }}>{f.apoio}</span>
                    </button>
                  ))}
                </div>
                {semDados && <p className="mt-2" style={{ fontSize: 13, color: C.apoio }}>A prévia está vazia. Ajuste as etapas anteriores para exportar.</p>}
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
