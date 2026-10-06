'use client';

import { useState } from 'react';
import Pagination from '@/shared/components/pagination/Pagination';

export interface Coluna<T> {
  key: string;
  header: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: string;
  render: (linha: T, indice: number) => React.ReactNode;
}

interface Props<T> {
  colunas: Coluna<T>[];
  linhas: T[];
  chave: (l: T) => string;
  vazio: React.ReactNode;
  /** Seleção em lote (tela de inclusão). */
  selecionadas?: Set<string>;
  onSelecionar?: (chaves: string[], marcar: boolean) => void;
  rotuloSelecao?: string;
  destaque?: (l: T) => React.CSSProperties | undefined;
  rodape?: React.ReactNode;
  porPaginaInicial?: number;
  /** Nome dos registros no plural, na paginação. */
  rotuloRegistros?: string;
}

const th: React.CSSProperties = {
  padding: '0 12px', height: 44, fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
  color: 'var(--tfd-text-muted)', background: 'var(--tfd-50)', borderBottom: '1px solid var(--tfd-surface-border)', whiteSpace: 'nowrap',
};

/** Tabela no padrão das listagens do sistema: cabeçalho em caixa alta,
 *  células de 13px, seleção opcional e a paginação padrão do sistema. */
export default function Tabela<T>({ colunas, linhas, chave, vazio, selecionadas, onSelecionar, rotuloSelecao = 'Selecionar', destaque, rodape, porPaginaInicial = 10, rotuloRegistros = 'linhas' }: Props<T>) {
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(porPaginaInicial);
  const [ultimo, setUltimo] = useState(linhas);
  if (ultimo !== linhas) {
    setUltimo(linhas);
    setPagina(1);
  }
  const visiveis = linhas.slice((pagina - 1) * porPagina, pagina * porPagina);
  const comSelecao = !!selecionadas && !!onSelecionar;
  const todasMarcadas = comSelecao && linhas.length > 0 && linhas.every((l) => selecionadas!.has(chave(l)));
  const algumaMarcada = comSelecao && linhas.some((l) => selecionadas!.has(chave(l)));

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
          <thead>
            <tr>
              {comSelecao && (
                <th style={{ ...th, width: 44, textAlign: 'center' }}>
                  <input
                    type="checkbox" aria-label="Selecionar todas as linhas filtradas"
                    checked={todasMarcadas}
                    ref={(el) => { if (el) el.indeterminate = algumaMarcada && !todasMarcadas; }}
                    onChange={() => onSelecionar!(linhas.map(chave), !todasMarcadas)}
                  />
                </th>
              )}
              {colunas.map((c) => <th key={c.key} style={{ ...th, textAlign: c.align ?? 'left', width: c.width }}>{c.header}</th>)}
            </tr>
          </thead>
          <tbody>
            {visiveis.length === 0 && (
              <tr><td colSpan={colunas.length + (comSelecao ? 1 : 0)} className="text-center" style={{ padding: '44px 16px', fontSize: 14, color: 'var(--tfd-text-muted)' }}>{vazio}</td></tr>
            )}
            {visiveis.map((l, i) => {
              const k = chave(l);
              const marcada = comSelecao && selecionadas!.has(k);
              return (
                <tr key={k} className="hover:bg-[var(--tfd-surface-hover)]" style={{ background: marcada ? 'var(--tfd-blue-50)' : undefined, ...destaque?.(l) }}>
                  {comSelecao && (
                    <td style={{ padding: '12px', textAlign: 'center', borderBottom: '1px solid var(--tfd-100)', verticalAlign: 'top' }}>
                      <input type="checkbox" aria-label={rotuloSelecao} checked={marcada} onChange={() => onSelecionar!([k], !marcada)} />
                    </td>
                  )}
                  {colunas.map((c) => (
                    <td key={c.key} style={{ padding: '12px', fontSize: 13, color: 'var(--tfd-text-primary)', borderBottom: '1px solid var(--tfd-100)', textAlign: c.align ?? 'left', verticalAlign: 'top' }}>
                      {c.render(l, (pagina - 1) * porPagina + i)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
          {rodape && linhas.length > 0 && <tfoot>{rodape}</tfoot>}
        </table>
      </div>
      <Pagination
        total={linhas.length}
        page={pagina}
        pageSize={porPagina}
        onPageChange={setPagina}
        onPageSizeChange={setPorPagina}
        pageSizeOptions={[10, 25, 50, 100]}
        recordLabel={rotuloRegistros}
      />
    </div>
  );
}
