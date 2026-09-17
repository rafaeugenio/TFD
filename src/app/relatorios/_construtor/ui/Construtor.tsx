'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Save, SlidersHorizontal, FileSpreadsheet, FileText, Table2, Check } from 'lucide-react';
import Drawer from '@/shared/components/drawer/Drawer';
import { useToast } from '@/shared/components/toast/Toast';
import PainelConfig from './PainelConfig';
import Resultado from './Resultado';
import { executarRelatorio } from '../motor';
import type { BaseRelatorios } from '../dataset';
import { descreverRelatorio } from '../descricao';
import { exportarCSV, exportarPDF, exportarXLSX } from '../exportar';
import { salvarRelatorio } from '../salvos';
import type { ConfigRelatorio } from '../tipos';

const COR = { ink: '#0F172A', texto: '#334155', apoio: '#475569', borda: '#E2E8F0', azul: '#146BFA', azulSuave: '#EFF6FF' };

interface Props {
  configInicial: ConfigRelatorio;
  titulo: string;
  origem: string;
  salvoId?: string;
  base: BaseRelatorios;
  carregando: boolean;
}

export default function Construtor({ configInicial, titulo, origem, salvoId: salvoInicial, base, carregando }: Props) {
  const toast = useToast();
  const [config, setConfig] = useState<ConfigRelatorio>(configInicial);
  const [nome, setNome] = useState(titulo);
  const [salvoId, setSalvoId] = useState(salvoInicial);
  const [painelAberto, setPainelAberto] = useState(false);
  const [salvarAberto, setSalvarAberto] = useState(false);
  const [exportarAberto, setExportarAberto] = useState(false);
  const [exportando, setExportando] = useState<string | null>(null);

  const resultado = useMemo(() => executarRelatorio(config, base), [config, base]);
  const resumo = useMemo(() => descreverRelatorio(config, resultado), [config, resultado]);
  const resumoTela = useMemo(() => descreverRelatorio(config, resultado, true), [config, resultado]);

  async function exportar(formato: 'xlsx' | 'csv' | 'pdf') {
    const desc = { titulo: nome, linhasResumo: resumo };
    setExportando(formato);
    try {
      if (formato === 'csv') exportarCSV(resultado, desc);
      if (formato === 'xlsx') await exportarXLSX(resultado, desc);
      if (formato === 'pdf') await exportarPDF(resultado, desc);
      toast.success('Arquivo gerado', 'O download começou com os mesmos filtros e colunas da tela.');
      setExportarAberto(false);
    } catch (e) {
      toast.error('Não foi possível gerar o arquivo', String(e));
    } finally {
      setExportando(null);
    }
  }

  const semDados = resultado.linhas.length === 0 || resultado.colunas.length === 0;

  return (
    <div className="pb-10">
      <Link href="/relatorios" className="inline-flex items-center gap-1.5 mb-3" style={{ fontSize: 15, color: COR.apoio, minHeight: 44 }}>
        <ArrowLeft size={16} /> Voltar para Relatórios
      </Link>

      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p style={{ fontSize: 13.5, fontWeight: 700, color: COR.azul, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{origem}</p>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: COR.ink, letterSpacing: '-0.01em', marginTop: 2 }}>{nome}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Wrapper: a classe tfd-btn define display e venceria o xl:hidden no próprio botão. */}
          <span className="xl:hidden">
            <button type="button" className="tfd-btn tfd-btn-secondary" style={{ minHeight: 46, fontSize: 15 }} onClick={() => setPainelAberto(true)}>
              <SlidersHorizontal size={17} /> Ajustar relatório
            </button>
          </span>
          <button type="button" className="tfd-btn tfd-btn-secondary" style={{ minHeight: 46, fontSize: 15 }} onClick={() => setSalvarAberto(true)}>
            <Save size={17} /> {salvoId ? 'Salvar alterações' : 'Salvar relatório'}
          </button>
          <button type="button" className="tfd-btn tfd-btn-primary" style={{ minHeight: 46, fontSize: 15 }} onClick={() => setExportarAberto(true)} disabled={semDados}>
            <Download size={17} /> Exportar
          </button>
        </div>
      </div>

      {/* Resumo sempre visível */}
      <section
        aria-label="Resumo do que está sendo analisado"
        className="mb-5"
        style={{ background: 'white', border: `1px solid ${COR.borda}`, borderLeft: `4px solid ${COR.azul}`, borderRadius: 12, padding: '14px 18px' }}
      >
        <p style={{ fontSize: 14, fontWeight: 700, color: COR.ink, marginBottom: 8 }}>O que este relatório mostra</p>
        <dl className="grid gap-x-6 gap-y-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {resumoTela.map((r) => (
            <div key={r.rotulo} className="min-w-0">
              <dt style={{ fontSize: 12.5, fontWeight: 700, color: COR.apoio, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{r.rotulo}</dt>
              <dd style={{ fontSize: 14.5, color: COR.ink, marginTop: 1, lineHeight: 1.4 }}>{r.valor}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)] items-start">
        <aside className="hidden xl:block" style={{ position: 'sticky', top: 16, maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', paddingRight: 4 }}>
          <PainelConfig config={config} onChange={setConfig} base={base} resultado={resultado} />
        </aside>
        <Resultado resultado={resultado} config={config} onChange={setConfig} totalDemonstracao={base.totalDemonstracao} carregando={carregando} />
      </div>

      {/* Painel em gaveta: tablet e celular */}
      <Drawer
        open={painelAberto}
        onClose={() => setPainelAberto(false)}
        title="Ajustar relatório"
        subtitle="As mudanças aparecem no resultado assim que você fecha."
        width="min(520px, 100vw)"
        footer={
          <button type="button" className="tfd-btn tfd-btn-primary w-full justify-center" style={{ minHeight: 48, fontSize: 16 }} onClick={() => setPainelAberto(false)}>
            Ver resultado ({resultado.totalRegistros.toLocaleString('pt-BR')})
          </button>
        }
      >
        <PainelConfig config={config} onChange={setConfig} base={base} resultado={resultado} />
      </Drawer>

      {/* Salvar */}
      <Drawer
        open={salvarAberto}
        onClose={() => setSalvarAberto(false)}
        title={salvoId ? 'Salvar alterações' : 'Salvar relatório'}
        subtitle="Salvamos a configuração, não os números. Ao abrir de novo, é só trocar o período."
        width="min(480px, 100vw)"
        footer={
          <div className="flex flex-col gap-2 w-full">
            {salvoId && (
              <button
                type="button"
                className="tfd-btn tfd-btn-primary w-full justify-center"
                style={{ minHeight: 48, fontSize: 16 }}
                disabled={!nome.trim()}
                onClick={() => {
                  salvarRelatorio(nome, config, salvoId);
                  toast.success('Relatório atualizado', nome);
                  setSalvarAberto(false);
                }}
              >
                <Check size={17} /> Atualizar “{nome}”
              </button>
            )}
            <button
              type="button"
              className={`tfd-btn ${salvoId ? 'tfd-btn-secondary' : 'tfd-btn-primary'} w-full justify-center`}
              style={{ minHeight: 48, fontSize: 16 }}
              disabled={!nome.trim()}
              onClick={() => {
                const novo = salvarRelatorio(nome, config);
                setSalvoId(novo.id);
                toast.success('Relatório salvo', 'Ele aparece em "Meus relatórios salvos".');
                setSalvarAberto(false);
              }}
            >
              <Save size={17} /> {salvoId ? 'Salvar como um novo relatório' : 'Salvar'}
            </button>
          </div>
        }
      >
        <label className="block" style={{ fontSize: 15, fontWeight: 700, color: COR.ink }}>
          Nome do relatório
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Faturamento mensal de passagens"
            style={{ display: 'block', width: '100%', minHeight: 48, marginTop: 6, padding: '0 12px', border: `1px solid ${COR.borda}`, borderRadius: 8, fontSize: 16, fontWeight: 400 }}
          />
        </label>
        <p style={{ fontSize: 14.5, color: COR.texto, marginTop: 16, fontWeight: 600 }}>O que fica salvo</p>
        <ul className="mt-2 flex flex-col gap-1.5" style={{ fontSize: 14.5, color: COR.texto }}>
          {resumo.map((r) => (
            <li key={r.rotulo}><strong>{r.rotulo}:</strong> {r.valor}</li>
          ))}
        </ul>
        <p style={{ fontSize: 13.5, color: COR.apoio, marginTop: 14 }}>
          No protótipo, o relatório fica salvo neste navegador.
        </p>
      </Drawer>

      {/* Exportar */}
      <Drawer
        open={exportarAberto}
        onClose={() => setExportarAberto(false)}
        title="Exportar relatório"
        subtitle={`O arquivo terá os ${resultado.linhas.length.toLocaleString('pt-BR')} ${resultado.agrupado ? 'grupos' : 'registros'} com o período, filtros e colunas da tela.`}
        width="min(480px, 100vw)"
      >
        <div className="flex flex-col gap-3">
          {[
            { id: 'xlsx' as const, titulo: 'Planilha do Excel (.xlsx)', desc: 'Para continuar trabalhando os números. Valores saem como números, prontos para somar.', icone: <FileSpreadsheet size={22} /> },
            { id: 'csv' as const, titulo: 'Arquivo CSV (.csv)', desc: 'Formato simples, abre no Excel e em outros sistemas.', icone: <Table2 size={22} /> },
            { id: 'pdf' as const, titulo: 'Documento PDF (.pdf)', desc: 'Para ler, imprimir ou compartilhar. Traz o resumo do que foi analisado no topo.', icone: <FileText size={22} /> },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => exportar(f.id)}
              disabled={exportando !== null}
              className="w-full text-left flex items-start gap-3"
              style={{ minHeight: 72, padding: 16, borderRadius: 12, border: `1px solid ${COR.borda}`, background: 'white' }}
            >
              <span style={{ color: COR.azul, marginTop: 2 }}>{f.icone}</span>
              <span className="flex-1">
                <span className="block" style={{ fontSize: 16, fontWeight: 700, color: COR.ink }}>
                  {exportando === f.id ? 'Gerando arquivo...' : f.titulo}
                </span>
                <span className="block" style={{ fontSize: 14, color: COR.apoio, marginTop: 2 }}>{f.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </Drawer>
    </div>
  );
}
