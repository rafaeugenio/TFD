'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { DIVERGENCIAS } from '../dataset';
import { fmtMoeda, fmtNumero, formatarValor, type ResultadoRelatorio } from '../motor';
import type { Campo, ConfigRelatorio, Linha } from '../tipos';
import { C } from './Etapas';

const POR_PAGINA = 20;

interface Props {
  resultado: ResultadoRelatorio;
  config: ConfigRelatorio;
  onChange: (c: ConfigRelatorio) => void;
  carregando: boolean;
}

/**
 * Prévia ao vivo. Mostra só a contagem, até quatro totais do assunto e a
 * tabela. Tabela com a primeira coluna fixa no tablet e desktop; cartões no
 * celular.
 */
export default function Previa({ resultado, config, onChange, carregando }: Props) {
  const [pagina, setPagina] = useState(1);
  useEffect(() => setPagina(1), [config]);

  const { colunas, linhas, assunto, agrupado, totalRegistros } = resultado;
  const paginas = Math.max(1, Math.ceil(linhas.length / POR_PAGINA));
  const visiveis = linhas.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const totais = resultado.totais.filter((t) => t.id !== 'registros').slice(0, 4);
  const [singular, plural] = assunto.contagem ?? ['registro', 'registros'];

  const ordenar = (campo: Campo) => {
    if (agrupado) return;
    const atual = config.ordenarPor;
    onChange({ ...config, ordenarPor: { campoId: campo.id, direcao: atual?.campoId === campo.id && atual.direcao === 'asc' ? 'desc' : 'asc' } });
  };

  return (
    <section aria-label="Prévia do relatório" style={{ background: 'white', border: `1px solid ${C.borda}`, borderRadius: 12, overflow: 'hidden' }}>
      <header className="flex flex-wrap items-end gap-x-8 gap-y-3" style={{ padding: '16px 20px', borderBottom: `1px solid ${C.borda}` }}>
        <div>
          <p style={{ fontSize: 12.5, fontWeight: 600, color: C.apoio }}>Prévia</p>
          {carregando ? (
            <Skeleton className="h-7 w-40 mt-1" />
          ) : (
            <p aria-live="polite" style={{ fontSize: 22, fontWeight: 700, color: C.ink, lineHeight: 1.2 }}>
              {totalRegistros.toLocaleString('pt-BR')} <span style={{ fontSize: 15, fontWeight: 500, color: C.texto }}>{(totalRegistros === 1 ? singular : plural).replace(/ encontrados?/, '')}</span>
            </p>
          )}
        </div>
        {!carregando && totais.map((t) => (
          <div key={t.id} title={t.ajuda}>
            <p style={{ fontSize: 12.5, fontWeight: 600, color: C.apoio }}>{t.label}</p>
            <p style={{ fontSize: 16, fontWeight: 600, color: C.ink, fontVariantNumeric: 'tabular-nums' }}>
              {t.formato === 'moeda' ? fmtMoeda(t.valor) : fmtNumero(t.valor)}
            </p>
          </div>
        ))}
        {assunto.aviso && (
          <span className="ml-auto inline-flex items-center gap-1" title={assunto.aviso} style={{ fontSize: 12.5, color: C.apoio, cursor: 'help' }}>
            <Info size={14} /> Regra de contagem
          </span>
        )}
      </header>

      {carregando ? (
        <div className="flex flex-col gap-2" style={{ padding: 20 }}>
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
        </div>
      ) : colunas.length === 0 ? (
        <Vazio texto="Escolha pelo menos uma coluna." />
      ) : linhas.length === 0 ? (
        <Vazio texto="Nada encontrado. Tente outro período ou tire um filtro." />
      ) : (
        <>
          <div className="hidden sm:block overflow-x-auto" style={{ maxHeight: '62vh' }} tabIndex={0} aria-label="Tabela do relatório">
            <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 14 }}>
              <thead>
                <tr>
                  {colunas.map((c, i) => {
                    const numerica = c.tipo === 'moeda' || c.tipo === 'numero';
                    const ordenada = config.ordenarPor?.campoId === c.id;
                    return (
                      <th
                        key={c.id}
                        scope="col"
                        aria-sort={ordenada ? (config.ordenarPor!.direcao === 'asc' ? 'ascending' : 'descending') : 'none'}
                        style={{
                          position: 'sticky', top: 0, left: i === 0 ? 0 : undefined, zIndex: i === 0 ? 3 : 2,
                          background: C.fundo, borderBottom: `1px solid ${C.borda}`, padding: 0,
                          textAlign: numerica ? 'right' : 'left', whiteSpace: 'nowrap',
                        }}
                      >
                        <button
                          type="button" onClick={() => ordenar(c)} disabled={agrupado} title={c.ajuda}
                          className="inline-flex items-center gap-1 w-full"
                          style={{ justifyContent: numerica ? 'flex-end' : 'flex-start', minHeight: 40, padding: '0 14px', fontSize: 13, fontWeight: 600, color: C.texto, cursor: agrupado ? 'default' : 'pointer' }}
                        >
                          {c.label}
                          {ordenada && (config.ordenarPor!.direcao === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />)}
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {visiveis.map((l, li) => (
                  <tr key={String(l.id ?? li)} className="hover:bg-[#F5F9FF]">
                    {colunas.map((c, i) => <Celula key={c.id} campo={c} linha={l} primeira={i === 0} />)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="sm:hidden">
            {visiveis.map((l, li) => <Cartao key={String(l.id ?? li)} linha={l} colunas={colunas} />)}
          </ul>

          <footer className="flex items-center justify-between gap-3" style={{ padding: '10px 16px', borderTop: `1px solid ${C.borda}`, fontSize: 13.5, color: C.apoio }}>
            <span>{((pagina - 1) * POR_PAGINA + 1).toLocaleString('pt-BR')} a {Math.min(pagina * POR_PAGINA, linhas.length).toLocaleString('pt-BR')} de {linhas.length.toLocaleString('pt-BR')}</span>
            <span className="flex items-center gap-1">
              <button type="button" className="tfd-btn tfd-btn-ghost" style={{ minHeight: 36 }} disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>Anterior</button>
              <button type="button" className="tfd-btn tfd-btn-ghost" style={{ minHeight: 36 }} disabled={pagina >= paginas} onClick={() => setPagina(pagina + 1)}>Próxima</button>
            </span>
          </footer>
        </>
      )}

      <details style={{ borderTop: `1px solid ${C.borda}`, fontSize: 12.5, color: C.apoio }}>
        <summary className="cursor-pointer" style={{ padding: '10px 16px' }}>Sobre os dados deste protótipo</summary>
        <ul style={{ padding: '0 16px 14px 32px', listStyle: 'disc', lineHeight: 1.5 }}>
          <li>Os números somam dados de teste do sistema com solicitações de demonstração.</li>
          {DIVERGENCIAS.map((d) => <li key={d}>{d}</li>)}
        </ul>
      </details>
    </section>
  );
}

function Celula({ campo, linha, primeira }: { campo: Campo; linha: Linha; primeira: boolean }) {
  const numerica = campo.tipo === 'moeda' || campo.tipo === 'numero';
  const texto = formatarValor(campo, linha[campo.id]);
  return (
    <td
      title={texto}
      style={{
        position: primeira ? 'sticky' : undefined, left: primeira ? 0 : undefined, zIndex: primeira ? 1 : undefined,
        background: primeira ? 'white' : undefined, borderBottom: '1px solid #F1F5F9', padding: '10px 14px',
        textAlign: numerica ? 'right' : 'left', whiteSpace: 'nowrap', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis',
        color: texto ? (campo.tipo === 'moeda' && Number(linha[campo.id]) < 0 ? '#B91C1C' : C.ink) : '#94A3B8',
        fontWeight: primeira ? 600 : 400, fontVariantNumeric: numerica ? 'tabular-nums' : undefined,
      }}
    >
      {texto || '·'}
    </td>
  );
}

function Cartao({ linha, colunas }: { linha: Linha; colunas: Campo[] }) {
  const [aberto, setAberto] = useState(false);
  const [titulo, ...resto] = colunas;
  const mostrar = aberto ? resto : resto.slice(0, 3);
  return (
    <li style={{ padding: '14px 16px', borderBottom: `1px solid ${C.borda}` }}>
      <p style={{ fontSize: 15, fontWeight: 600, color: C.ink }}>{formatarValor(titulo, linha[titulo.id]) || '·'}</p>
      <dl className="mt-1.5 flex flex-col gap-1">
        {mostrar.map((c) => (
          <div key={c.id} className="flex justify-between gap-3" style={{ fontSize: 14 }}>
            <dt style={{ color: C.apoio }}>{c.label}</dt>
            <dd style={{ color: C.ink, textAlign: 'right' }}>{formatarValor(c, linha[c.id]) || '·'}</dd>
          </div>
        ))}
      </dl>
      {resto.length > 3 && (
        <button type="button" onClick={() => setAberto((v) => !v)} className="inline-flex items-center gap-1 mt-1" style={{ minHeight: 36, fontSize: 13.5, color: C.azulTexto }}>
          {aberto ? 'Menos' : `Mais ${resto.length - 3}`} <ChevronDown size={14} style={{ transform: aberto ? 'rotate(180deg)' : undefined }} />
        </button>
      )}
    </li>
  );
}

function Vazio({ texto }: { texto: string }) {
  return <p className="text-center" style={{ padding: '48px 20px', fontSize: 14.5, color: C.apoio }}>{texto}</p>;
}
