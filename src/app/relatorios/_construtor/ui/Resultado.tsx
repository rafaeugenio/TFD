'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Info, SearchX, FlaskConical } from 'lucide-react';
import { DIVERGENCIAS } from '../dataset';
import { fmtMoeda, fmtNumero, formatarValor, type ResultadoRelatorio } from '../motor';
import type { Campo, ConfigRelatorio, Linha } from '../tipos';

const COR = { ink: '#0F172A', texto: '#334155', apoio: '#475569', borda: '#E2E8F0', azul: '#146BFA', azulSuave: '#EFF6FF' };
const POR_PAGINA = [25, 50, 100];

interface Props {
  resultado: ResultadoRelatorio;
  config: ConfigRelatorio;
  onChange: (c: ConfigRelatorio) => void;
  totalDemonstracao: number;
  carregando: boolean;
}

/**
 * Resultado ao vivo. Totais dependem do assunto (nada de indicador só para
 * preencher espaço). Desktop e tablet: tabela com a primeira coluna fixa e
 * rolagem horizontal controlada. Celular: cada registro vira um cartão.
 */
export default function Resultado({ resultado, config, onChange, totalDemonstracao, carregando }: Props) {
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(25);
  const [verDados, setVerDados] = useState(false);

  useEffect(() => setPagina(1), [resultado.linhas.length, config]);

  const { colunas, linhas, assunto, agrupado, totalRegistros } = resultado;
  const paginas = Math.max(1, Math.ceil(linhas.length / porPagina));
  const visiveis = linhas.slice((pagina - 1) * porPagina, pagina * porPagina);

  const ordenar = (campo: Campo) => {
    if (agrupado) return;
    const atual = config.ordenarPor;
    const direcao = atual?.campoId === campo.id && atual.direcao === 'asc' ? 'desc' : 'asc';
    onChange({ ...config, ordenarPor: { campoId: campo.id, direcao } });
  };

  return (
    <div className="flex flex-col gap-4 min-w-0">
      {/* Contagem principal */}
      <div style={{ background: 'white', border: `1px solid ${COR.borda}`, borderRadius: 12, padding: 20 }}>
        <p aria-live="polite" style={{ fontSize: 26, fontWeight: 700, color: COR.ink, letterSpacing: '-0.01em' }}>
          {carregando ? 'Carregando dados...' : `${totalRegistros.toLocaleString('pt-BR')} ${totalRegistros === 1 ? (assunto.contagem?.[0] ?? 'registro encontrado') : (assunto.contagem?.[1] ?? 'registros encontrados')}`}
        </p>
        <p style={{ fontSize: 14.5, color: COR.apoio, marginTop: 4 }}>
          Cada linha é {assunto.cadaLinha}
          {agrupado && ` Os registros estão somados em ${linhas.length} ${linhas.length === 1 ? 'grupo' : 'grupos'}.`}
        </p>

        {resultado.totais.length > 0 && (
          <dl className="grid gap-3 mt-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
            {resultado.totais.map((t) => (
              <div key={t.id} style={{ background: '#F8FAFC', border: `1px solid ${COR.borda}`, borderRadius: 10, padding: '12px 14px' }} title={t.ajuda}>
                <dt style={{ fontSize: 13.5, color: COR.apoio, fontWeight: 600 }}>{t.label}</dt>
                <dd style={{ fontSize: 21, fontWeight: 700, color: COR.ink, marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                  {t.formato === 'moeda' ? fmtMoeda(t.valor) : fmtNumero(t.valor)}
                </dd>
                <dd style={{ fontSize: 12.5, color: '#64748B', marginTop: 2, lineHeight: 1.35 }}>{t.ajuda}</dd>
              </div>
            ))}
          </dl>
        )}

        {assunto.aviso && (
          <p className="flex items-start gap-2 mt-4" style={{ fontSize: 14, color: '#1E3A8A', background: COR.azulSuave, border: '1px solid #BFDBFE', borderRadius: 8, padding: '10px 12px' }}>
            <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>{assunto.aviso}</span>
          </p>
        )}
      </div>

      {/* Tabela / cartões */}
      <div style={{ background: 'white', border: `1px solid ${COR.borda}`, borderRadius: 12, overflow: 'hidden' }}>
        {colunas.length === 0 ? (
          <Vazio titulo="Escolha pelo menos uma informação" texto="No bloco 3, adicione as informações que devem aparecer como colunas da tabela." />
        ) : linhas.length === 0 && !carregando ? (
          <Vazio
            titulo="Nenhum registro encontrado"
            texto="Nada corresponde a esse período, data de referência e filtros. Tente um período maior, outra data de referência ou remova um filtro."
            acoes={
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                <button type="button" className="tfd-btn tfd-btn-secondary" style={{ minHeight: 44, fontSize: 15 }} onClick={() => onChange({ ...config, periodo: { tipo: 'este_ano' } })}>
                  Ver o ano inteiro
                </button>
                {config.filtros.length > 0 && (
                  <button type="button" className="tfd-btn tfd-btn-ghost" style={{ minHeight: 44, fontSize: 15 }} onClick={() => onChange({ ...config, filtros: [] })}>
                    Remover todos os filtros
                  </button>
                )}
              </div>
            }
          />
        ) : (
          <>
            {/* Tabela: tablet e desktop */}
            <div className="hidden sm:block overflow-x-auto" style={{ maxHeight: '70vh' }} tabIndex={0} aria-label="Tabela do relatório. Role para os lados para ver todas as colunas.">
              <table className="w-full" style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 14.5 }}>
                <thead>
                  <tr>
                    {colunas.map((c, i) => {
                      const ordenada = config.ordenarPor?.campoId === c.id;
                      const numerica = c.tipo === 'moeda' || c.tipo === 'numero';
                      return (
                        <th
                          key={c.id}
                          scope="col"
                          aria-sort={ordenada ? (config.ordenarPor!.direcao === 'asc' ? 'ascending' : 'descending') : 'none'}
                          title={c.ajuda}
                          style={{
                            position: 'sticky', top: 0, left: i === 0 ? 0 : undefined, zIndex: i === 0 ? 3 : 2,
                            background: '#F1F5F9', borderBottom: `1px solid ${COR.borda}`,
                            borderRight: i === 0 ? `1px solid ${COR.borda}` : undefined,
                            textAlign: numerica ? 'right' : 'left', padding: 0, whiteSpace: 'nowrap',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => ordenar(c)}
                            disabled={agrupado}
                            className="inline-flex items-center gap-1.5 w-full"
                            style={{
                              justifyContent: numerica ? 'flex-end' : 'flex-start', minHeight: 48, padding: '0 14px',
                              fontSize: 13.5, fontWeight: 700, color: COR.texto, cursor: agrupado ? 'default' : 'pointer',
                            }}
                          >
                            {c.label}
                            {ordenada && (config.ordenarPor!.direcao === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />)}
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((l, li) => (
                    <tr key={String(l.id ?? li)} style={{ background: li % 2 ? '#FBFCFE' : 'white' }}>
                      {colunas.map((c, i) => (
                        <Celula key={c.id} campo={c} linha={l} primeira={i === 0} fundo={li % 2 ? '#FBFCFE' : 'white'} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Cartões: celular */}
            <ul className="sm:hidden flex flex-col">
              {visiveis.map((l, li) => <Cartao key={String(l.id ?? li)} linha={l} colunas={colunas} />)}
            </ul>

            <Paginacao
              pagina={pagina}
              paginas={paginas}
              total={linhas.length}
              porPagina={porPagina}
              onPagina={setPagina}
              onPorPagina={(n) => { setPorPagina(n); setPagina(1); }}
              rotulo={agrupado ? 'grupos' : assunto.id === 'financeiro' ? 'meses' : assunto.id === 'pacientes' ? 'pacientes' : 'registros'}
            />
          </>
        )}
      </div>

      {/* Transparência sobre os dados do protótipo */}
      <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12 }}>
        <button
          type="button"
          aria-expanded={verDados}
          onClick={() => setVerDados((v) => !v)}
          className="w-full flex items-center gap-2 text-left"
          style={{ minHeight: 52, padding: '0 16px', fontSize: 14.5, color: '#78350F' }}
        >
          <FlaskConical size={17} style={{ flexShrink: 0 }} />
          <span className="flex-1">
            <strong>Protótipo:</strong> os números combinam dados de teste do sistema com {totalDemonstracao} solicitações de demonstração.
          </span>
          {verDados ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {verDados && (
          <ul className="flex flex-col gap-2" style={{ padding: '0 16px 16px 44px', fontSize: 13.5, color: '#78350F', listStyle: 'disc' }}>
            {DIVERGENCIAS.map((d) => <li key={d}>{d}</li>)}
          </ul>
        )}
      </div>
    </div>
  );
}

function Celula({ campo, linha, primeira, fundo }: { campo: Campo; linha: Linha; primeira: boolean; fundo: string }) {
  const numerica = campo.tipo === 'moeda' || campo.tipo === 'numero';
  const texto = formatarValor(campo, linha[campo.id]);
  const negativo = campo.tipo === 'moeda' && Number(linha[campo.id]) < 0;
  return (
    <td
      style={{
        position: primeira ? 'sticky' : undefined, left: primeira ? 0 : undefined, zIndex: primeira ? 1 : undefined,
        background: fundo, borderBottom: `1px solid #EEF2F6`, borderRight: primeira ? `1px solid ${COR.borda}` : undefined,
        padding: '12px 14px', textAlign: numerica ? 'right' : 'left', color: texto ? (negativo ? '#B91C1C' : COR.ink) : '#94A3B8',
        fontWeight: primeira ? 600 : 400, whiteSpace: 'nowrap', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis',
        fontVariantNumeric: numerica ? 'tabular-nums' : undefined,
      }}
      title={texto}
    >
      {texto || 'Não informado'}
    </td>
  );
}

function Cartao({ linha, colunas }: { linha: Linha; colunas: Campo[] }) {
  const [aberto, setAberto] = useState(false);
  const [titulo, ...resto] = colunas;
  const visiveis = aberto ? resto : resto.slice(0, 3);
  return (
    <li style={{ borderBottom: `1px solid ${COR.borda}`, padding: 16 }}>
      <p style={{ fontSize: 16, fontWeight: 700, color: COR.ink }}>{formatarValor(titulo, linha[titulo.id]) || 'Não informado'}</p>
      <dl className="mt-2 flex flex-col gap-1.5">
        {visiveis.map((c) => (
          <div key={c.id} className="flex justify-between gap-3" style={{ fontSize: 14.5 }}>
            <dt style={{ color: COR.apoio }}>{c.label}</dt>
            <dd style={{ color: COR.ink, fontWeight: 600, textAlign: 'right' }}>{formatarValor(c, linha[c.id]) || 'Não informado'}</dd>
          </div>
        ))}
      </dl>
      {resto.length > 3 && (
        <button type="button" onClick={() => setAberto((v) => !v)} className="mt-2 inline-flex items-center gap-1" style={{ minHeight: 44, fontSize: 14.5, fontWeight: 600, color: '#1D4ED8' }}>
          {aberto ? <>Mostrar menos <ChevronUp size={16} /></> : <>Ver todas as {resto.length + 1} informações <ChevronDown size={16} /></>}
        </button>
      )}
    </li>
  );
}

function Paginacao({
  pagina, paginas, total, porPagina, onPagina, onPorPagina, rotulo,
}: {
  pagina: number; paginas: number; total: number; porPagina: number;
  onPagina: (p: number) => void; onPorPagina: (n: number) => void; rotulo: string;
}) {
  const inicio = total === 0 ? 0 : (pagina - 1) * porPagina + 1;
  const fim = Math.min(total, pagina * porPagina);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3" style={{ padding: '12px 16px', borderTop: `1px solid ${COR.borda}`, background: '#F8FAFC' }}>
      <p style={{ fontSize: 14.5, color: COR.texto }}>
        Mostrando <strong>{inicio} a {fim}</strong> de <strong>{total.toLocaleString('pt-BR')}</strong> {rotulo}
      </p>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2" style={{ fontSize: 14, color: COR.apoio }}>
          Por página
          <select value={porPagina} onChange={(e) => onPorPagina(Number(e.target.value))} style={{ minHeight: 44, padding: '0 8px', border: `1px solid ${COR.borda}`, borderRadius: 8, background: 'white', fontSize: 15 }}>
            {POR_PAGINA.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <button type="button" className="tfd-btn tfd-btn-ghost" style={{ minHeight: 44, fontSize: 15 }} disabled={pagina <= 1} onClick={() => onPagina(pagina - 1)}>Anterior</button>
        <span style={{ fontSize: 14.5, color: COR.texto }}>{pagina} de {paginas}</span>
        <button type="button" className="tfd-btn tfd-btn-ghost" style={{ minHeight: 44, fontSize: 15 }} disabled={pagina >= paginas} onClick={() => onPagina(pagina + 1)}>Próxima</button>
      </div>
    </div>
  );
}

function Vazio({ titulo, texto, acoes }: { titulo: string; texto: string; acoes?: React.ReactNode }) {
  return (
    <div className="text-center" style={{ padding: '48px 24px' }}>
      <SearchX size={32} style={{ color: '#94A3B8', margin: '0 auto' }} />
      <p style={{ fontSize: 18, fontWeight: 700, color: COR.ink, marginTop: 12 }}>{titulo}</p>
      <p style={{ fontSize: 15, color: COR.apoio, marginTop: 6, maxWidth: 480, marginInline: 'auto', lineHeight: 1.5 }}>{texto}</p>
      {acoes}
    </div>
  );
}
