'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, Download, FileSpreadsheet, FileText, Table2 } from 'lucide-react';
import { useToast } from '@/shared/components/toast/Toast';
import { assuntoPorId } from '../assuntos';
import { exportarCSV, exportarPDF, exportarXLSX, LIMITE_COLUNAS_PDF, secoesLargasParaPdf, type SecaoExportada } from '../exportar';
import type { AssuntoId } from '../tipos';
import { C } from './Etapas';

/* ── Abas por assunto ────────────────────────────────────────────────────── */

/**
 * Troca o assunto em foco quando o relatório tem mais de um. Mostra a
 * quantidade de cada um ao lado do nome, para a pessoa saber o tamanho de
 * cada tabela sem precisar abrir. Some quando há um assunto só.
 */
export function AbasAssunto({
  assuntos, ativa, onChange, contagens,
}: { assuntos: AssuntoId[]; ativa: AssuntoId; onChange: (id: AssuntoId) => void; contagens?: Partial<Record<AssuntoId, number>> }) {
  if (assuntos.length < 2) return null;
  return (
    <div role="tablist" aria-label="Assuntos do relatório" className="flex gap-1 overflow-x-auto" style={{ borderBottom: `1px solid ${C.borda}` }}>
      {assuntos.map((id) => {
        const a = assuntoPorId(id);
        const Icone = a.icone;
        const atual = id === ativa;
        const qtd = contagens?.[id];
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={atual}
            onClick={() => onChange(id)}
            className="inline-flex items-center gap-2 shrink-0 hover:bg-[#F5F9FF] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2"
            style={{
              minHeight: 44, padding: '0 14px', fontSize: 14, fontWeight: atual ? 600 : 500,
              color: atual ? C.azulTexto : C.texto, outlineColor: C.azul,
              boxShadow: atual ? `inset 0 -2px 0 ${C.azul}` : undefined,
            }}
          >
            <Icone size={16} style={{ color: atual ? C.azul : C.apoio }} />
            {a.label}
            {qtd !== undefined && (
              <span style={{ fontSize: 12.5, fontWeight: 600, color: atual ? C.azulTexto : C.apoio, background: atual ? C.azulSuave : C.fundo, borderRadius: 999, padding: '1px 8px', fontVariantNumeric: 'tabular-nums' }}>
                {qtd.toLocaleString('pt-BR')}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── Aviso de PDF largo ──────────────────────────────────────────────────── */

export function AvisoPdf({ secoes }: { secoes: SecaoExportada[] }) {
  const largas = secoesLargasParaPdf(secoes.map((s) => s.res));
  if (largas.length === 0) return null;
  const onde = secoes.length > 1 ? ` (${largas.map((r) => r.assunto.label).join(', ')})` : '';
  return (
    <p className="flex gap-2" role="note" style={{ fontSize: 13, lineHeight: 1.45, color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '8px 10px' }}>
      <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} />
      <span>
        Tabela com mais de {LIMITE_COLUNAS_PDF} colunas{onde}: no PDF ela pode sair cortada ou apertada na folha.
        Recomendamos até {LIMITE_COLUNAS_PDF} colunas, ou o Excel. O PDF continua disponível.
      </span>
    </p>
  );
}

/* ── Exportação ──────────────────────────────────────────────────────────── */

export type Formato = 'xlsx' | 'pdf' | 'csv';

export const FORMATOS: { id: Formato; rotulo: string; apoio: string; icone: React.ReactNode }[] = [
  { id: 'xlsx', rotulo: 'Excel', apoio: 'para continuar trabalhando', icone: <FileSpreadsheet size={18} /> },
  { id: 'pdf', rotulo: 'PDF', apoio: 'para ler ou imprimir', icone: <FileText size={18} /> },
  { id: 'csv', rotulo: 'CSV', apoio: 'para outros sistemas', icone: <Table2 size={18} /> },
];

/** Gera o arquivo com o mesmo recorte da tela. O aviso de colunas demais no
 *  PDF aparece antes (na tela) e de novo ao gerar, sem impedir. */
export function useExportar(titulo: string, secoes: SecaoExportada[]) {
  const toast = useToast();
  const [exportando, setExportando] = useState<Formato | null>(null);

  async function exportar(formato: Formato) {
    setExportando(formato);
    try {
      if (formato === 'csv') exportarCSV(titulo, secoes);
      if (formato === 'xlsx') await exportarXLSX(titulo, secoes);
      if (formato === 'pdf') await exportarPDF(titulo, secoes);
      if (formato === 'pdf' && secoesLargasParaPdf(secoes.map((s) => s.res)).length) {
        toast.warning('PDF gerado com tabela larga', `Com mais de ${LIMITE_COLUNAS_PDF} colunas a leitura pode ficar ruim. Confira o arquivo.`);
      } else {
        toast.success('Arquivo gerado', 'Com o mesmo recorte da tela.');
      }
    } catch (e) {
      toast.error('Não foi possível gerar o arquivo', String(e));
    } finally {
      setExportando(null);
    }
  }

  const vazio = secoes.every((s) => s.res.linhas.length === 0 || s.res.colunas.length === 0);
  return { exportar, exportando, vazio };
}

/** Botão "Exportar" com menu dos três formatos. Usado no cabeçalho do detalhe. */
export function MenuExportar({ titulo, secoes }: { titulo: string; secoes: SecaoExportada[] }) {
  const { exportar, exportando, vazio } = useExportar(titulo, secoes);
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc); };
  }, [aberto]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button" className="tfd-btn tfd-btn-primary" style={{ minHeight: 40 }}
        aria-haspopup="menu" aria-expanded={aberto} disabled={vazio || exportando !== null}
        onClick={() => setAberto((v) => !v)}
      >
        <Download size={16} /> {exportando ? 'Gerando...' : 'Exportar'} <ChevronDown size={15} />
      </button>
      {aberto && (
        <div
          role="menu"
          className="absolute right-0 z-30 flex flex-col gap-1"
          style={{ top: 'calc(100% + 6px)', width: 'min(340px, calc(100vw - 32px))', padding: 8, background: 'white', border: `1px solid ${C.borda}`, borderRadius: 10, boxShadow: '0 8px 24px rgba(15, 23, 42, 0.12)' }}
        >
          {secoes.length > 1 && (
            <p style={{ fontSize: 12.5, color: C.apoio, padding: '4px 8px 6px' }}>
              Os {secoes.length} assuntos vão no mesmo arquivo, cada um na sua aba ou seção.
            </p>
          )}
          {FORMATOS.map((f) => (
            <button
              key={f.id} type="button" role="menuitem"
              onClick={() => { setAberto(false); exportar(f.id); }}
              className="flex items-center gap-3 text-left hover:bg-[#F5F9FF]"
              style={{ minHeight: 44, padding: '0 10px', borderRadius: 8 }}
            >
              <span style={{ color: C.azul }}>{f.icone}</span>
              <span style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{f.rotulo}</span>
              <span style={{ fontSize: 13, color: C.apoio }}>{f.apoio}</span>
            </button>
          ))}
          <div style={{ padding: '4px 2px 0' }}><AvisoPdf secoes={secoes} /></div>
        </div>
      )}
    </div>
  );
}
