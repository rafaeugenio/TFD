'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Hash, Info } from 'lucide-react';
import Pagination from '@/shared/components/pagination/Pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { DIVERGENCIAS } from '../dataset';
import { fmtMoeda, fmtNumero, formatarValor, type ResultadoRelatorio } from '../motor';
import type { Campo, ConfigRelatorio, Linha } from '../tipos';
import { C } from './estilo';

const TAMANHOS = [20, 50, 100, 200];

interface Props {
  resultado: ResultadoRelatorio;
  config: ConfigRelatorio;
  onChange: (c: ConfigRelatorio) => void;
  carregando: boolean;
  /** Título da seção da tabela. */
  rotulo?: string;
}

export const cartao: React.CSSProperties = {
  background: 'white', border: `1px solid ${C.borda}`, borderRadius: 'var(--tfd-radius-lg)', boxShadow: C.sombra,
};

/**
 * Resultado no padrão visual do relatório de Gestão do sistema: faixa de
 * indicadores (rótulo em caixa alta, número em fonte mono) e seção de linhas
 * com contagem, tabela com cabeçalho em caixa alta e paginação do sistema.
 * No celular a tabela vira cartões.
 */
export default function Previa({ resultado, config, onChange, carregando, rotulo = 'Linhas do relatório' }: Props) {
  // Qualquer mudança no resultado (período, filtro, busca) volta à página 1.
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(50);
  const [ultimo, setUltimo] = useState(resultado);
  if (ultimo !== resultado) {
    setUltimo(resultado);
    setPagina(1);
  }

  const { colunas, linhas, assunto, agrupado, totalRegistros } = resultado;
  const visiveis = useMemo(() => linhas.slice((pagina - 1) * porPagina, pagina * porPagina), [linhas, pagina, porPagina]);
  const totais = resultado.totais.filter((t) => t.id !== 'registros').slice(0, 4);
  const plural = (assunto.contagem?.[1] ?? 'registros').replace(/ encontrados?/, '');

  const ordenar = (campo: Campo) => {
    if (agrupado) return;
    const atual = config.ordenarPor;
    onChange({ ...config, ordenarPor: { campoId: campo.id, direcao: atual?.campoId === campo.id && atual.direcao === 'asc' ? 'desc' : 'asc' } });
  };

  return (
    <div className="@container flex flex-col gap-5 min-w-0">
      {/* Indicadores: divisores pelo gap de 1px sobre o fundo da borda. Em linha
          só quando o painel tem largura para isso (prévia estreita, celular). */}
      <section
        aria-label={`Totais de ${assunto.label}`}
        className="grid grid-cols-2 @3xl:flex gap-px overflow-hidden"
        style={{ ...cartao, background: C.borda }}
      >
        <Indicador rotulo={`Total de ${plural}`} icone={<Hash size={12} />} valor={carregando ? null : totalRegistros.toLocaleString('pt-BR')} />
        {totais.map((t) => (
          <Indicador key={t.id} rotulo={t.label} ajuda={t.ajuda} valor={carregando ? null : t.formato === 'moeda' ? fmtMoeda(t.valor) : fmtNumero(t.valor)} />
        ))}
      </section>

      {/* Linhas */}
      <section aria-label={`${rotulo}: ${assunto.label}`} className="overflow-hidden" style={cartao}>
        <header className="flex flex-wrap items-center gap-x-2.5 gap-y-1" style={{ padding: '1.1rem 1.25rem 0.85rem' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, color: C.ink, margin: 0 }}>{rotulo}</h3>
          {!carregando && <span className="tfd-badge tfd-badge--primary" aria-live="polite">{linhas.length.toLocaleString('pt-BR')}</span>}
          <span style={{ fontSize: 13, color: C.claro }}>
            {agrupado ? `Uma linha por grupo, somando ${totalRegistros.toLocaleString('pt-BR')} ${plural}` : `Cada linha é ${assunto.cadaLinha.split('.')[0]}`}
          </span>
          {assunto.aviso && (
            <span className="ml-auto inline-flex items-center gap-1" title={assunto.aviso} style={{ fontSize: 13, color: C.apoio, cursor: 'help' }}>
              <Info size={14} /> Regra de contagem
            </span>
          )}
        </header>

        {carregando ? (
          <div className="flex flex-col gap-2" style={{ padding: '0 1.25rem 1.25rem' }}>
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : colunas.length === 0 ? (
          <Vazio texto="Escolha pelo menos uma coluna." />
        ) : linhas.length === 0 ? (
          <Vazio texto="Nada encontrado. Tente outro período ou tire um filtro." />
        ) : (
          <>
            <div className="hidden sm:block overflow-x-auto" style={{ maxHeight: '64vh' }} tabIndex={0} aria-label="Tabela do relatório">
              <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
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
                            background: C.fundo, borderTop: `1px solid ${C.borda}`, borderBottom: `1px solid ${C.borda}`, padding: 0,
                            textAlign: numerica ? 'right' : 'left', whiteSpace: 'nowrap',
                          }}
                        >
                          <button
                            type="button" onClick={() => ordenar(c)} disabled={agrupado} title={c.ajuda}
                            className="inline-flex items-center gap-1 w-full"
                            style={{
                              justifyContent: numerica ? 'flex-end' : 'flex-start', minHeight: 44, padding: '0 13px',
                              fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: C.apoio,
                              cursor: agrupado ? 'default' : 'pointer',
                            }}
                          >
                            {c.label}
                            {ordenada && (config.ordenarPor!.direcao === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((l, li) => (
                    <tr key={String(l.id ?? li)} className="group hover:bg-[var(--tfd-surface-hover)]">
                      {colunas.map((c, i) => <Celula key={c.id} campo={c} linha={l} primeira={i === 0} />)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="sm:hidden" style={{ borderTop: `1px solid ${C.borda}` }}>
              {visiveis.map((l, li) => <Cartao key={String(l.id ?? li)} linha={l} colunas={colunas} />)}
            </ul>

            <Pagination total={linhas.length} page={pagina} pageSize={porPagina} onPageChange={setPagina} onPageSizeChange={setPorPagina} pageSizeOptions={TAMANHOS} recordLabel="linhas" />
          </>
        )}

        <details style={{ borderTop: `1px solid ${C.borda}`, fontSize: 12.5, color: C.apoio }}>
          <summary className="cursor-pointer" style={{ padding: '10px 1.25rem' }}>Sobre os dados deste protótipo</summary>
          <ul style={{ padding: '0 1.25rem 14px 2.25rem', listStyle: 'disc', lineHeight: 1.5 }}>
            <li>Os números somam dados de teste do sistema com solicitações de demonstração.</li>
            {DIVERGENCIAS.map((d) => <li key={d}>{d}</li>)}
          </ul>
        </details>
      </section>
    </div>
  );
}

/** Célula da faixa de indicadores, igual ao `mgmt-kpi` do sistema. */
function Indicador({ rotulo, valor, ajuda, icone }: { rotulo: string; valor: string | null; ajuda?: string; icone?: React.ReactNode }) {
  return (
    <div title={ajuda} className="flex-1 min-w-0 flex flex-col gap-[0.45rem] odd:last:col-span-2" style={{ padding: '1.1rem 1.25rem', background: 'white' }}>
      <span className="inline-flex items-center gap-[0.35rem]" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.apoio, lineHeight: 1.2 }}>
        {icone && <span style={{ color: C.claro, display: 'inline-flex' }}>{icone}</span>}
        {rotulo}
      </span>
      {valor === null ? (
        <Skeleton className="h-7 w-24" />
      ) : (
        <span className="text-[1.15rem] @md:text-[1.4rem] @3xl:text-[1.625rem] truncate" style={{ fontFamily: 'var(--tfd-mono)', fontWeight: 700, lineHeight: 1.1, color: C.ink, letterSpacing: '-0.01em' }}>
          {valor}
        </span>
      )}
    </div>
  );
}

function Celula({ campo, linha, primeira }: { campo: Campo; linha: Linha; primeira: boolean }) {
  const numerica = campo.tipo === 'moeda' || campo.tipo === 'numero';
  const texto = formatarValor(campo, linha[campo.id]);
  // Número da solicitação em fonte mono, como na listagem de Solicitações.
  const numeroSolicitacao = campo.id === 'numero';
  return (
    <td
      title={texto}
      className={primeira ? 'bg-white group-hover:bg-[var(--tfd-surface-hover)]' : undefined}
      style={{
        position: primeira ? 'sticky' : undefined, left: primeira ? 0 : undefined, zIndex: primeira ? 1 : undefined,
        borderBottom: '1px solid var(--tfd-100)', padding: '12.6px 13px', fontSize: 13,
        textAlign: numerica ? 'right' : 'left', whiteSpace: 'nowrap', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis',
        color: texto ? (campo.tipo === 'moeda' && Number(linha[campo.id]) < 0 ? 'var(--tfd-danger)' : numeroSolicitacao ? C.apoio : C.ink) : C.claro,
        fontWeight: primeira ? 500 : 400,
        fontFamily: numeroSolicitacao ? 'var(--tfd-mono)' : undefined,
        fontVariantNumeric: numerica ? 'tabular-nums' : undefined,
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
      <p style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{formatarValor(titulo, linha[titulo.id]) || '·'}</p>
      <dl className="mt-1.5 flex flex-col gap-1">
        {mostrar.map((c) => (
          <div key={c.id} className="flex justify-between gap-3" style={{ fontSize: 13 }}>
            <dt style={{ color: C.apoio }}>{c.label}</dt>
            <dd style={{ color: C.ink, textAlign: 'right' }}>{formatarValor(c, linha[c.id]) || '·'}</dd>
          </div>
        ))}
      </dl>
      {resto.length > 3 && (
        <button type="button" onClick={() => setAberto((v) => !v)} className="inline-flex items-center gap-1 mt-1" style={{ minHeight: 36, fontSize: 13, color: C.azul }}>
          {aberto ? 'Menos' : `Mais ${resto.length - 3}`} <ChevronDown size={14} style={{ transform: aberto ? 'rotate(180deg)' : undefined }} />
        </button>
      )}
    </li>
  );
}

function Vazio({ texto }: { texto: string }) {
  return <p className="text-center" style={{ padding: '48px 20px', fontSize: 14, color: C.apoio, borderTop: `1px solid ${C.borda}` }}>{texto}</p>;
}
