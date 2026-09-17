'use client';

import { useMemo, useState } from 'react';
import {
  Check, ChevronDown, ChevronUp, X, Plus, Search, Info, ArrowUp, ArrowDown, CalendarRange, Columns3, Filter, Pencil,
} from 'lucide-react';
import { ASSUNTOS, ASSUNTOS_ORDEM, assuntoPorId, camposDoAssunto, filtrosDoAssunto } from '../assuntos';
import type { BaseRelatorios } from '../dataset';
import { configInicial, opcoesDoFiltro } from '../motor';
import { ATALHOS_PERIODO, FORMAS_PERIODO, MESES, dataBR, quadrimestreDoMes, resolverPeriodo } from '../periodo';
import type { Campo, ConfigRelatorio, FiltroAplicado, PeriodoTipo } from '../tipos';
import { descreverFiltro } from '../descricao';
import type { ResultadoRelatorio } from '../motor';

const COR = {
  ink: '#0F172A',
  texto: '#334155',
  apoio: '#475569',
  borda: '#E2E8F0',
  azul: '#146BFA',
  azulSuave: '#EFF6FF',
};

interface Props {
  config: ConfigRelatorio;
  onChange: (c: ConfigRelatorio) => void;
  base: BaseRelatorios;
  resultado: ResultadoRelatorio;
}

/**
 * Painel de configuração. Quatro blocos sempre editáveis, sem wizard: o
 * usuário pode trocar o período ou um filtro a qualquer momento sem refazer
 * o relatório, e o resultado ao lado responde na hora.
 */
export default function PainelConfig({ config, onChange, base, resultado }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <SecaoAssunto config={config} onChange={onChange} />
      <SecaoPeriodo config={config} onChange={onChange} />
      <SecaoInformacoes config={config} onChange={onChange} />
      <SecaoFiltros config={config} onChange={onChange} base={base} resultado={resultado} />
    </div>
  );
}

/* ── Estrutura visual comum ──────────────────────────────────────────────── */

function Bloco({
  numero, titulo, ajuda, icone, children, acao,
}: {
  numero: number; titulo: string; ajuda: string; icone: React.ReactNode; children: React.ReactNode; acao?: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={`bloco-${numero}`}
      style={{ background: 'white', border: `1px solid ${COR.borda}`, borderRadius: 12, padding: 20 }}
    >
      <div className="flex items-start gap-3 mb-4">
        <span
          aria-hidden
          className="inline-flex items-center justify-center shrink-0"
          style={{ width: 30, height: 30, borderRadius: 999, background: COR.azulSuave, color: COR.azul, fontWeight: 700, fontSize: 14 }}
        >
          {numero}
        </span>
        <div className="flex-1 min-w-0">
          <h2 id={`bloco-${numero}`} className="flex items-center gap-2" style={{ fontSize: 17, fontWeight: 700, color: COR.ink, margin: 0 }}>
            <span style={{ color: COR.apoio }}>{icone}</span>
            {titulo}
          </h2>
          <p style={{ fontSize: 14, color: COR.apoio, marginTop: 4, lineHeight: 1.45 }}>{ajuda}</p>
        </div>
        {acao}
      </div>
      {children}
    </section>
  );
}

function Opcao({
  ativo, onClick, titulo, descricao, icone, role = 'radio',
}: {
  ativo: boolean; onClick: () => void; titulo: string; descricao?: string; icone?: React.ReactNode; role?: 'radio' | 'checkbox';
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={ativo}
      onClick={onClick}
      className="w-full text-left flex items-start gap-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        minHeight: 48,
        padding: '10px 14px',
        borderRadius: 10,
        border: `${ativo ? 2 : 1}px solid ${ativo ? COR.azul : COR.borda}`,
        background: ativo ? COR.azulSuave : 'white',
        margin: ativo ? 0 : 1,
        outlineColor: COR.azul,
      }}
    >
      <span
        aria-hidden
        className="inline-flex items-center justify-center shrink-0 mt-0.5"
        style={{
          width: 20, height: 20, borderRadius: role === 'radio' ? 999 : 5,
          border: `2px solid ${ativo ? COR.azul : '#94A3B8'}`, background: ativo ? COR.azul : 'white', color: 'white',
        }}
      >
        {ativo && <Check size={13} strokeWidth={3} />}
      </span>
      {icone && <span className="shrink-0 mt-0.5" style={{ color: ativo ? COR.azul : COR.apoio }}>{icone}</span>}
      <span className="flex-1 min-w-0">
        <span className="block" style={{ fontSize: 15, fontWeight: 600, color: COR.ink }}>{titulo}</span>
        {descricao && <span className="block" style={{ fontSize: 13.5, color: COR.apoio, marginTop: 2, lineHeight: 1.4 }}>{descricao}</span>}
      </span>
    </button>
  );
}

const selectStyle: React.CSSProperties = {
  minHeight: 44, padding: '0 12px', border: `1px solid ${COR.borda}`, borderRadius: 8,
  background: 'white', fontSize: 15, color: COR.ink, width: '100%',
};

/* ── 1. Assunto ──────────────────────────────────────────────────────────── */

function SecaoAssunto({ config, onChange }: Pick<Props, 'config' | 'onChange'>) {
  const [trocando, setTrocando] = useState(false);
  const atual = assuntoPorId(config.assunto);
  const Icone = atual.icone;

  return (
    <Bloco
      numero={1}
      titulo="O que você quer analisar?"
      ajuda="O assunto define o que cada linha da tabela representa."
      icone={<Info size={16} />}
    >
      {!trocando ? (
        <div>
          <div className="flex items-start gap-3" style={{ padding: 14, borderRadius: 10, background: COR.azulSuave, border: `1px solid #BFDBFE` }}>
            <Icone size={22} style={{ color: COR.azul, flexShrink: 0, marginTop: 2 }} />
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: 16, fontWeight: 700, color: COR.ink }}>{atual.label}</p>
              <p style={{ fontSize: 14, color: COR.texto, marginTop: 4, lineHeight: 1.45 }}>
                <strong>Cada linha da tabela é</strong> {atual.cadaLinha}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="tfd-btn tfd-btn-ghost mt-3"
            style={{ minHeight: 44, fontSize: 14.5 }}
            onClick={() => setTrocando(true)}
          >
            <Pencil size={15} /> Trocar assunto
          </button>
        </div>
      ) : (
        <div role="radiogroup" aria-label="Assunto do relatório" className="flex flex-col gap-2">
          {ASSUNTOS_ORDEM.map((id) => {
            const a = ASSUNTOS.find((x) => x.id === id)!;
            const I = a.icone;
            return (
              <Opcao
                key={a.id}
                ativo={a.id === config.assunto}
                onClick={() => {
                  if (a.id !== config.assunto) {
                    const nova = configInicial(a.id);
                    onChange({ ...nova, periodo: config.periodo });
                  }
                  setTrocando(false);
                }}
                titulo={a.label}
                descricao={a.pergunta}
                icone={<I size={18} />}
              />
            );
          })}
          <p style={{ fontSize: 13.5, color: COR.apoio, marginTop: 4 }}>
            Ao trocar de assunto, as informações e os filtros voltam ao padrão do novo assunto. O período é mantido.
          </p>
          <button type="button" className="tfd-btn tfd-btn-ghost" style={{ minHeight: 44 }} onClick={() => setTrocando(false)}>
            Manter {atual.label}
          </button>
        </div>
      )}
    </Bloco>
  );
}

/* ── 2. Período ──────────────────────────────────────────────────────────── */

function SecaoPeriodo({ config, onChange }: Pick<Props, 'config' | 'onChange'>) {
  const a = assuntoPorId(config.assunto);
  const p = config.periodo;
  const resolvido = resolverPeriodo(p);
  const hoje = new Date();
  const anos = [hoje.getFullYear() - 2, hoje.getFullYear() - 1, hoje.getFullYear()];
  const ehAtalho = ATALHOS_PERIODO.some((x) => x.tipo === p.tipo);

  const setPeriodo = (tipo: PeriodoTipo) => {
    const mesAtual = hoje.getMonth() + 1;
    onChange({
      ...config,
      periodo: {
        tipo,
        ano: p.ano ?? hoje.getFullYear(),
        mes: p.mes ?? mesAtual,
        quadrimestre: p.quadrimestre ?? quadrimestreDoMes(mesAtual),
        inicio: tipo === 'personalizado' ? p.inicio ?? resolvido.inicio : p.inicio,
        fim: tipo === 'personalizado' ? p.fim ?? resolvido.fim : p.fim,
      },
    });
  };
  const setCampo = (patch: Partial<typeof p>) => onChange({ ...config, periodo: { ...p, ...patch } });

  return (
    <Bloco
      numero={2}
      titulo="Qual período?"
      ajuda="Escolha um atalho ou defina o período. Logo abaixo, diga qual data deve ser usada."
      icone={<CalendarRange size={16} />}
    >
      <p style={{ fontSize: 13, fontWeight: 700, color: COR.apoio, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
        Atalhos
      </p>
      <div className="flex flex-wrap gap-2 mb-4">
        {ATALHOS_PERIODO.map((x) => {
          const ativo = p.tipo === x.tipo;
          return (
            <button
              key={x.tipo}
              type="button"
              aria-pressed={ativo}
              onClick={() => setPeriodo(x.tipo)}
              style={{
                minHeight: 44, padding: '0 16px', borderRadius: 999, fontSize: 15, fontWeight: 600,
                border: `${ativo ? 2 : 1}px solid ${ativo ? COR.azul : COR.borda}`,
                background: ativo ? COR.azulSuave : 'white', color: ativo ? '#1D4ED8' : COR.ink,
              }}
            >
              {x.label}
            </button>
          );
        })}
      </div>

      <label htmlFor="forma-periodo" style={{ fontSize: 13, fontWeight: 700, color: COR.apoio, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        Ou escolha
      </label>
      <select
        id="forma-periodo"
        value={ehAtalho ? '' : p.tipo}
        onChange={(e) => e.target.value && setPeriodo(e.target.value as PeriodoTipo)}
        style={{ ...selectStyle, marginTop: 8 }}
      >
        <option value="">Selecione...</option>
        {FORMAS_PERIODO.map((f) => <option key={f.tipo} value={f.tipo}>{f.label}</option>)}
      </select>

      {p.tipo === 'mes' && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <select aria-label="Mês" value={p.mes} onChange={(e) => setCampo({ mes: Number(e.target.value) })} style={selectStyle}>
            {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select aria-label="Ano" value={p.ano} onChange={(e) => setCampo({ ano: Number(e.target.value) })} style={selectStyle}>
            {anos.map((ano) => <option key={ano} value={ano}>{ano}</option>)}
          </select>
        </div>
      )}
      {p.tipo === 'quadrimestre' && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <select aria-label="Quadrimestre" value={p.quadrimestre} onChange={(e) => setCampo({ quadrimestre: Number(e.target.value) as 1 | 2 | 3 })} style={selectStyle}>
            <option value={1}>1º (jan a abr)</option>
            <option value={2}>2º (mai a ago)</option>
            <option value={3}>3º (set a dez)</option>
          </select>
          <select aria-label="Ano" value={p.ano} onChange={(e) => setCampo({ ano: Number(e.target.value) })} style={selectStyle}>
            {anos.map((ano) => <option key={ano} value={ano}>{ano}</option>)}
          </select>
        </div>
      )}
      {p.tipo === 'ano' && (
        <select aria-label="Ano" value={p.ano} onChange={(e) => setCampo({ ano: Number(e.target.value) })} style={{ ...selectStyle, marginTop: 8 }}>
          {anos.map((ano) => <option key={ano} value={ano}>{ano}</option>)}
        </select>
      )}
      {p.tipo === 'personalizado' && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <label style={{ fontSize: 13.5, color: COR.apoio }}>
            De
            <input type="date" value={p.inicio ?? resolvido.inicio} onChange={(e) => setCampo({ inicio: e.target.value })} style={{ ...selectStyle, marginTop: 4 }} />
          </label>
          <label style={{ fontSize: 13.5, color: COR.apoio }}>
            Até
            <input type="date" value={p.fim ?? resolvido.fim} onChange={(e) => setCampo({ fim: e.target.value })} style={{ ...selectStyle, marginTop: 4 }} />
          </label>
        </div>
      )}

      <p className="mt-3" style={{ fontSize: 14.5, color: COR.ink, background: '#F8FAFC', border: `1px solid ${COR.borda}`, borderRadius: 8, padding: '10px 12px' }}>
        <strong>{resolvido.rotulo}</strong>
        <span style={{ color: COR.apoio }}> · de {dataBR(resolvido.inicio)} a {dataBR(resolvido.fim)}</span>
      </p>

      <div className="mt-5">
        <p style={{ fontSize: 15, fontWeight: 700, color: COR.ink }}>Filtrar o período usando:</p>
        <p style={{ fontSize: 13.5, color: COR.apoio, marginTop: 2, marginBottom: 10 }}>
          Cada data dá um resultado diferente. Escolha a que responde à sua pergunta.
        </p>
        {a.id === 'financeiro' ? (
          <div className="flex items-start gap-2" style={{ fontSize: 14, color: COR.texto, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 12px' }}>
            <Info size={16} style={{ color: '#B45309', flexShrink: 0, marginTop: 2 }} />
            <span>{a.datas[0].ajuda}</span>
          </div>
        ) : (
          <div role="radiogroup" aria-label="Data usada no período" className="flex flex-col gap-2">
            {a.datas.map((d) => (
              <Opcao
                key={d.id}
                ativo={config.referenciaData === d.id}
                onClick={() => onChange({ ...config, referenciaData: d.id })}
                titulo={d.label}
                descricao={d.ajuda}
              />
            ))}
          </div>
        )}
        {a.id === 'financeiro' && (
          <label className="block mt-4" style={{ fontSize: 14.5, fontWeight: 600, color: COR.ink }}>
            Meta anual de procedimentos SIGTAP
            <span className="block" style={{ fontSize: 13.5, fontWeight: 400, color: COR.apoio, marginTop: 2 }}>
              Valor informado por você. O realizado é calculado pelo sistema.
            </span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={config.metaAnualSigtap ?? ''}
              onChange={(e) => onChange({ ...config, metaAnualSigtap: e.target.value ? Number(e.target.value) : undefined })}
              style={{ ...selectStyle, marginTop: 6 }}
            />
          </label>
        )}
      </div>
    </Bloco>
  );
}

/* ── 3. Informações (colunas) e organização ──────────────────────────────── */

function SecaoInformacoes({ config, onChange }: Pick<Props, 'config' | 'onChange'>) {
  const a = assuntoPorId(config.assunto);
  const todos = camposDoAssunto(a);
  const [escolhendo, setEscolhendo] = useState(false);
  const [busca, setBusca] = useState('');
  const [abertos, setAbertos] = useState<string[]>([a.grupos[0]?.id ?? '']);

  const selecionados = config.colunas.map((id) => todos.find((c) => c.id === id)).filter(Boolean) as Campo[];
  const agrupaveis = todos.filter((c) => c.agrupavel);

  const alternar = (id: string) => {
    const tem = config.colunas.includes(id);
    onChange({ ...config, colunas: tem ? config.colunas.filter((x) => x !== id) : [...config.colunas, id] });
  };
  const mover = (i: number, delta: number) => {
    const lista = [...config.colunas];
    const j = i + delta;
    if (j < 0 || j >= lista.length) return;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    onChange({ ...config, colunas: lista });
  };

  const termo = busca.trim().toLowerCase();

  return (
    <Bloco
      numero={3}
      titulo="Quais informações aparecem na tabela?"
      ajuda="Cada informação escolhida vira uma coluna. Isso muda o que você vê, não quais registros entram."
      icone={<Columns3 size={16} />}
    >
      <>
          {selecionados.length === 0 ? (
            <p style={{ fontSize: 14.5, color: '#B45309', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 12px' }}>
              Nenhuma informação escolhida. Adicione pelo menos uma para ver a tabela.
            </p>
          ) : (
            <ol className="flex flex-col gap-1.5" aria-label="Colunas da tabela, na ordem">
              {selecionados.map((c, i) => (
                <li key={c.id} className="flex items-center gap-2" style={{ border: `1px solid ${COR.borda}`, borderRadius: 8, padding: '6px 6px 6px 12px', background: 'white' }}>
                  <span style={{ fontSize: 13, color: '#94A3B8', width: 18 }}>{i + 1}.</span>
                  <span className="flex-1 min-w-0" style={{ fontSize: 14.5, color: COR.ink }}>{c.label}</span>
                  <IconeBotao label={`Mover ${c.label} para cima`} onClick={() => mover(i, -1)} disabled={i === 0}><ArrowUp size={16} /></IconeBotao>
                  <IconeBotao label={`Mover ${c.label} para baixo`} onClick={() => mover(i, 1)} disabled={i === selecionados.length - 1}><ArrowDown size={16} /></IconeBotao>
                  <IconeBotao label={`Remover ${c.label}`} onClick={() => alternar(c.id)} perigo><X size={16} /></IconeBotao>
                </li>
              ))}
            </ol>
          )}

          <button
            type="button"
            className="tfd-btn tfd-btn-secondary mt-3 w-full justify-center"
            style={{ minHeight: 46, fontSize: 15 }}
            aria-expanded={escolhendo}
            onClick={() => setEscolhendo((v) => !v)}
          >
            {escolhendo ? <><ChevronUp size={16} /> Fechar lista de informações</> : <><Plus size={16} /> Adicionar ou remover informações</>}
          </button>

          {escolhendo && (
            <div className="mt-3" style={{ border: `1px solid ${COR.borda}`, borderRadius: 10, padding: 12, background: '#F8FAFC' }}>
              <label className="flex items-center gap-2" style={{ ...selectStyle, background: 'white' }}>
                <Search size={16} style={{ color: '#94A3B8' }} />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Procurar informação (ex.: destino, valor)"
                  className="flex-1 bg-transparent outline-none"
                  style={{ fontSize: 15 }}
                  aria-label="Procurar informação"
                />
              </label>
              <div className="flex flex-col gap-2 mt-3">
                {a.grupos.map((g) => {
                  const campos = g.campos.filter((c) => !termo || c.label.toLowerCase().includes(termo));
                  if (campos.length === 0) return null;
                  const aberto = Boolean(termo) || abertos.includes(g.id);
                  const qtd = g.campos.filter((c) => config.colunas.includes(c.id)).length;
                  return (
                    <div key={g.id} style={{ background: 'white', border: `1px solid ${COR.borda}`, borderRadius: 8 }}>
                      <button
                        type="button"
                        aria-expanded={aberto}
                        onClick={() => setAbertos((l) => (l.includes(g.id) ? l.filter((x) => x !== g.id) : [...l, g.id]))}
                        className="w-full flex items-center gap-2 text-left"
                        style={{ minHeight: 48, padding: '0 12px' }}
                      >
                        <span className="flex-1" style={{ fontSize: 15, fontWeight: 700, color: COR.ink }}>{g.label}</span>
                        {qtd > 0 && (
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1D4ED8', background: COR.azulSuave, borderRadius: 999, padding: '2px 8px' }}>
                            {qtd} escolhida{qtd > 1 ? 's' : ''}
                          </span>
                        )}
                        {aberto ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                      {aberto && (
                        <div className="flex flex-col gap-1.5" style={{ padding: '0 10px 10px' }}>
                          {g.ajuda && <p style={{ fontSize: 13, color: COR.apoio, padding: '0 4px 4px' }}>{g.ajuda}</p>}
                          {campos.map((c) => (
                            <Opcao
                              key={c.id}
                              role="checkbox"
                              ativo={config.colunas.includes(c.id)}
                              onClick={() => alternar(c.id)}
                              titulo={c.label}
                              descricao={c.ajuda}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {a.id !== 'financeiro' && (
            <div className="mt-5">
              <p style={{ fontSize: 15, fontWeight: 700, color: COR.ink }}>Como mostrar o resultado?</p>
              <div role="radiogroup" aria-label="Organização do resultado" className="flex flex-col gap-2 mt-2">
                <Opcao
                  ativo={!config.agruparPor}
                  onClick={() => onChange({ ...config, agruparPor: '' })}
                  titulo="Lista completa"
                  descricao="Uma linha para cada registro."
                />
                <Opcao
                  ativo={Boolean(config.agruparPor)}
                  onClick={() => onChange({ ...config, agruparPor: config.agruparPor || agrupaveis[0]?.id || '' })}
                  titulo="Resumo com totais"
                  descricao="Soma os registros por uma informação, por exemplo por regional ou por mês."
                />
              </div>
              {config.agruparPor && (
                <label className="block mt-2" style={{ fontSize: 14, color: COR.apoio }}>
                  Somar por
                  <select value={config.agruparPor} onChange={(e) => onChange({ ...config, agruparPor: e.target.value })} style={{ ...selectStyle, marginTop: 4 }}>
                    {agrupaveis.map((c) => <option key={c.id} value={c.id}>{c.tipo === 'data' ? `${c.label} (por mês)` : c.label}</option>)}
                  </select>
                </label>
              )}
            </div>
          )}
      </>
    </Bloco>
  );
}

function IconeBotao({
  children, label, onClick, disabled, perigo,
}: { children: React.ReactNode; label: string; onClick: () => void; disabled?: boolean; perigo?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center shrink-0"
      style={{
        width: 40, height: 40, borderRadius: 8, border: 'none',
        background: 'transparent', color: disabled ? '#CBD5E1' : perigo ? '#B91C1C' : COR.apoio,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}

/* ── 4. Filtros ──────────────────────────────────────────────────────────── */

function SecaoFiltros({ config, onChange, base, resultado }: Props) {
  const a = assuntoPorId(config.assunto);
  const disponiveis = filtrosDoAssunto(a);
  const [editando, setEditando] = useState<string | null>(null);
  const [escolhendo, setEscolhendo] = useState(false);

  const aplicados = config.filtros.filter((f) => f.valores.some((v) => v !== ''));
  const setFiltro = (f: FiltroAplicado) => {
    const outros = config.filtros.filter((x) => x.campoId !== f.campoId);
    onChange({ ...config, filtros: f.valores.some((v) => v !== '') ? [...outros, f] : outros });
  };
  const remover = (campoId: string) => onChange({ ...config, filtros: config.filtros.filter((x) => x.campoId !== campoId) });

  const naoUsados = disponiveis.filter((c) => !aplicados.some((f) => f.campoId === c.id));

  return (
    <Bloco
      numero={4}
      titulo="Quer limitar os resultados?"
      ajuda="Filtros escolhem quais registros entram no relatório. Exemplo: só passagens aéreas, ou só uma regional."
      icone={<Filter size={16} />}
    >
      {aplicados.length === 0 && !editando && (
        <p style={{ fontSize: 14.5, color: COR.apoio, background: '#F8FAFC', border: `1px dashed #CBD5E1`, borderRadius: 8, padding: '12px' }}>
          Nenhum filtro. Todos os registros do período entram no relatório.
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {aplicados.map((f) => (
          <li key={f.campoId} style={{ border: `1px solid #BFDBFE`, background: COR.azulSuave, borderRadius: 10, padding: '10px 8px 10px 12px' }}>
            {editando === f.campoId ? (
              <EditorFiltro
                campo={disponiveis.find((c) => c.id === f.campoId)!}
                inicial={f}
                opcoes={opcoesDoFiltro(base, config, f.campoId)}
                onAplicar={(novo) => { setFiltro(novo); setEditando(null); }}
                onCancelar={() => setEditando(null)}
              />
            ) : (
              <div className="flex items-center gap-2">
                <span className="flex-1 min-w-0" style={{ fontSize: 14.5, color: COR.ink }}>{descreverFiltro(resultado, f)}</span>
                <IconeBotao label="Alterar filtro" onClick={() => setEditando(f.campoId)}><Pencil size={16} /></IconeBotao>
                <IconeBotao label="Remover filtro" onClick={() => remover(f.campoId)} perigo><X size={16} /></IconeBotao>
              </div>
            )}
          </li>
        ))}
      </ul>

      {editando && !aplicados.some((f) => f.campoId === editando) && (
        <div className="mt-2" style={{ border: `1px solid #BFDBFE`, background: COR.azulSuave, borderRadius: 10, padding: 12 }}>
          <EditorFiltro
            campo={disponiveis.find((c) => c.id === editando)!}
            inicial={{ campoId: editando, valores: [] }}
            opcoes={opcoesDoFiltro(base, config, editando)}
            onAplicar={(novo) => { setFiltro(novo); setEditando(null); }}
            onCancelar={() => setEditando(null)}
          />
        </div>
      )}

      {!editando && (
        <>
          <button
            type="button"
            className="tfd-btn tfd-btn-secondary mt-3 w-full justify-center"
            style={{ minHeight: 46, fontSize: 15 }}
            aria-expanded={escolhendo}
            onClick={() => setEscolhendo((v) => !v)}
            disabled={naoUsados.length === 0}
          >
            {escolhendo ? <><ChevronUp size={16} /> Fechar</> : <><Plus size={16} /> Adicionar filtro</>}
          </button>
          {escolhendo && (
            <div className="mt-2 flex flex-col gap-1.5" style={{ border: `1px solid ${COR.borda}`, borderRadius: 10, padding: 10, background: '#F8FAFC' }}>
              <p style={{ fontSize: 13.5, color: COR.apoio, padding: '0 4px 4px' }}>
                Só aparecem filtros que fazem sentido para {a.label.toLowerCase()}.
              </p>
              {naoUsados.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { setEditando(c.id); setEscolhendo(false); }}
                  className="w-full text-left"
                  style={{ minHeight: 46, padding: '8px 12px', borderRadius: 8, border: `1px solid ${COR.borda}`, background: 'white' }}
                >
                  <span className="block" style={{ fontSize: 15, fontWeight: 600, color: COR.ink }}>{c.label}</span>
                  {c.ajuda && <span className="block" style={{ fontSize: 13, color: COR.apoio }}>{c.ajuda}</span>}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </Bloco>
  );
}

function EditorFiltro({
  campo, inicial, opcoes, onAplicar, onCancelar,
}: {
  campo: Campo; inicial: FiltroAplicado; opcoes: Array<{ valor: string; quantidade: number }>; onAplicar: (f: FiltroAplicado) => void; onCancelar: () => void;
}) {
  const [valores, setValores] = useState<string[]>(inicial.valores);
  const [busca, setBusca] = useState('');
  const visiveis = useMemo(
    () => opcoes.filter((o) => !busca.trim() || o.valor.toLowerCase().includes(busca.trim().toLowerCase())),
    [opcoes, busca],
  );

  return (
    <div>
      <p style={{ fontSize: 15, fontWeight: 700, color: COR.ink, marginBottom: 8 }}>{campo.label}</p>

      {campo.tipo === 'categoria' && (
        <>
          {opcoes.length > 8 && (
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Procurar opção"
              aria-label={`Procurar opção de ${campo.label}`}
              style={{ ...selectStyle, marginBottom: 8 }}
            />
          )}
          <div className="flex flex-col gap-1.5" style={{ maxHeight: 280, overflowY: 'auto' }}>
            {visiveis.map((o) => (
              <Opcao
                key={o.valor}
                role="checkbox"
                ativo={valores.includes(o.valor)}
                onClick={() => setValores((v) => (v.includes(o.valor) ? v.filter((x) => x !== o.valor) : [...v, o.valor]))}
                titulo={o.valor}
                descricao={`${o.quantidade.toLocaleString('pt-BR')} ${o.quantidade === 1 ? 'registro' : 'registros'} no período`}
              />
            ))}
            {/* Valores já marcados que deixaram de existir com o período atual continuam desmarcáveis. */}
            {valores.filter((v) => !opcoes.some((o) => o.valor === v)).map((v) => (
              <Opcao key={v} role="checkbox" ativo onClick={() => setValores((l) => l.filter((x) => x !== v))} titulo={v} descricao="Nenhum registro no período atual" />
            ))}
            {visiveis.length === 0 && (
              <p style={{ fontSize: 14, color: COR.apoio }}>
                {busca.trim() ? 'Nenhuma opção encontrada com esse texto.' : 'Nenhuma opção tem registros neste período com os outros filtros aplicados.'}
              </p>
            )}
          </div>
          <p style={{ fontSize: 13, color: COR.apoio, marginTop: 6 }}>Marque uma ou mais opções. Entram os registros que tiverem qualquer uma delas. Só aparecem opções que existem no período e com os outros filtros.</p>
        </>
      )}

      {campo.tipo === 'texto' && (
        <label style={{ fontSize: 14, color: COR.apoio }}>
          Contém o texto
          <input
            value={valores[0] ?? ''}
            onChange={(e) => setValores([e.target.value])}
            placeholder="Digite parte do nome"
            style={{ ...selectStyle, marginTop: 4 }}
          />
        </label>
      )}

      {(campo.tipo === 'numero' || campo.tipo === 'moeda') && (
        <div className="grid grid-cols-2 gap-2">
          <label style={{ fontSize: 14, color: COR.apoio }}>
            A partir de
            <input type="number" inputMode="decimal" value={valores[0] ?? ''} onChange={(e) => setValores([e.target.value, valores[1] ?? ''])} style={{ ...selectStyle, marginTop: 4 }} />
          </label>
          <label style={{ fontSize: 14, color: COR.apoio }}>
            Até
            <input type="number" inputMode="decimal" value={valores[1] ?? ''} onChange={(e) => setValores([valores[0] ?? '', e.target.value])} style={{ ...selectStyle, marginTop: 4 }} />
          </label>
        </div>
      )}

      <div className="flex gap-2 mt-3">
        <button type="button" className="tfd-btn tfd-btn-primary flex-1 justify-center" style={{ minHeight: 44, fontSize: 15 }} onClick={() => onAplicar({ campoId: campo.id, valores })}>
          Aplicar filtro
        </button>
        <button type="button" className="tfd-btn tfd-btn-ghost" style={{ minHeight: 44, fontSize: 15 }} onClick={onCancelar}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
