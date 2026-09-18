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
    <div role="tablist" aria-label="Assuntos do relatório" className="flex gap-2 overflow-x-auto" style={{ borderBottom: `1px solid ${C.borda}` }}>
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
            className="inline-flex items-center gap-2 shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2"
            style={{
              padding: '1.1rem 1.1rem 1.25rem', fontSize: 14, fontWeight: 700,
              color: atual ? C.azul : C.texto, outlineColor: C.azul,
              borderBottom: `2px solid ${atual ? C.azul : 'transparent'}`, marginBottom: -1,
            }}
          >
            <Icone size={16} style={{ color: atual ? C.azul : C.apoio }} />
            {a.label}
            {qtd !== undefined && (
              <span className={atual ? 'tfd-badge tfd-badge--primary' : 'tfd-badge'} style={atual ? undefined : { background: 'var(--tfd-100)', color: 'var(--tfd-600)' }}>
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
    <p className="flex gap-2" role="note" style={{ fontSize: 13, lineHeight: 1.45, color: '#9A3412', background: 'var(--tfd-status-warning-bg, #FFF7ED)', border: '1px solid #FED7AA', borderRadius: 'var(--tfd-radius-md)', padding: '8px 10px' }}>
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
        type="button" className="tfd-btn tfd-btn-primary"
        aria-haspopup="menu" aria-expanded={aberto} disabled={vazio || exportando !== null}
        onClick={() => setAberto((v) => !v)}
      >
        <Download size={16} /> {exportando ? 'Gerando...' : 'Exportar'} <ChevronDown size={15} />
      </button>
      {aberto && (
        <div
          role="menu"
          className="absolute right-0 z-30 flex flex-col gap-1"
          style={{ top: 'calc(100% + 6px)', width: 'min(340px, calc(100vw - 32px))', padding: 6, background: 'white', border: `1px solid ${C.borda}`, borderRadius: 'var(--tfd-radius-md)', boxShadow: 'var(--tfd-shadow-md)' }}
        >
          {secoes.length > 1 && (
            <p style={{ fontSize: 12.5, color: C.claro, padding: '4px 8px 6px' }}>
              Os {secoes.length} assuntos vão no mesmo arquivo, cada um na sua aba ou seção.
            </p>
          )}
          {FORMATOS.map((f) => (
            <button
              key={f.id} type="button" role="menuitem"
              onClick={() => { setAberto(false); exportar(f.id); }}
              className="flex items-center gap-3 text-left hover:bg-[var(--tfd-surface-hover)]"
              style={{ minHeight: 40, padding: '0 10px', borderRadius: 'var(--tfd-radius-sm)' }}
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
