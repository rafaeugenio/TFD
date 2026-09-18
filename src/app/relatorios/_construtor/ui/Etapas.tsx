'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, Plus, X } from 'lucide-react';
import { ASSUNTOS, ASSUNTOS_ORDEM, assuntoPorId, camposDoAssunto, filtrosDoAssunto } from '../assuntos';
import type { BaseRelatorios } from '../dataset';
import { configInicial, opcoesDoFiltro, ordenarSecoes, type ResultadoRelatorio } from '../motor';
import { ATALHOS_PERIODO, FORMAS_PERIODO, MESES, dataBR, quadrimestreDoMes, resolverPeriodo } from '../periodo';
import { descreverFiltro } from '../descricao';
import type { AssuntoId, Campo, ConfigRelatorio, FiltroAplicado, GrupoCampos, PeriodoTipo } from '../tipos';

export const C = {
  ink: '#0F172A',
  texto: '#334155',
  apoio: '#64748B',
  borda: '#E2E8F0',
  azul: '#146BFA',
  azulTexto: '#1D4ED8',
  azulSuave: '#EFF6FF',
  azulBorda: '#BFDBFE',
  fundo: '#F8FAFC',
};

interface EtapaProps {
  config: ConfigRelatorio;
  onChange: (c: ConfigRelatorio) => void;
}

/* ── Primitivos ──────────────────────────────────────────────────────────── */

export function Titulo({ children, apoio }: { children: React.ReactNode; apoio?: string }) {
  return (
    <div className="mb-4">
      <h2 style={{ fontSize: 17, fontWeight: 700, color: C.ink }}>{children}</h2>
      {apoio && <p style={{ fontSize: 13.5, color: C.apoio, marginTop: 2 }}>{apoio}</p>}
    </div>
  );
}

/** Pílula selecionável. Mesmo componente para período, colunas e opções. */
export function Pilula({
  ativo, onClick, children, role = 'checkbox', title,
}: { ativo: boolean; onClick: () => void; children: React.ReactNode; role?: 'checkbox' | 'radio'; title?: string }) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={ativo}
      onClick={onClick}
      title={title}
      className="inline-flex items-center gap-1.5 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{
        minHeight: 40, padding: '0 14px', borderRadius: 999, fontSize: 14, fontWeight: 500,
        border: `1px solid ${ativo ? C.azul : C.borda}`,
        background: ativo ? C.azulSuave : 'white', color: ativo ? C.azulTexto : C.texto,
        outlineColor: C.azul,
      }}
    >
      {ativo && <Check size={14} strokeWidth={2.5} />}
      {children}
    </button>
  );
}

const campoStyle: React.CSSProperties = {
  minHeight: 40, padding: '0 12px', border: `1px solid ${C.borda}`, borderRadius: 8,
  background: 'white', fontSize: 14, color: C.ink, width: '100%',
};

const rotuloStyle: React.CSSProperties = { fontSize: 13, fontWeight: 600, color: C.texto, marginBottom: 8 };

/* ── Assunto ─────────────────────────────────────────────────────────────── */

/** Vários assuntos por relatório. Cada assunto marcado vira uma tabela
 *  própria; o período escolhido depois vale para todos. */
export function EtapaAssunto({ secoes, onChange }: { secoes: ConfigRelatorio[]; onChange: (s: ConfigRelatorio[]) => void }) {
  const marcados = secoes.map((s) => s.assunto);
  const periodo = secoes[0]?.periodo;
  const alternar = (id: AssuntoId) => {
    if (marcados.includes(id)) {
      if (marcados.length > 1) onChange(secoes.filter((s) => s.assunto !== id));
      return;
    }
    onChange(ordenarSecoes([...secoes, { ...configInicial(id), periodo: periodo ?? configInicial(id).periodo }], ASSUNTOS_ORDEM));
  };
  const todos = marcados.length === ASSUNTOS_ORDEM.length;

  return (
    <div>
      <Titulo apoio="Marque um ou mais. Cada assunto vira uma tabela própria no relatório.">O que você quer analisar?</Titulo>
      <div role="group" aria-label="Assuntos" className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
        {ASSUNTOS_ORDEM.map((id) => {
          const a = ASSUNTOS.find((x) => x.id === id)!;
          const Icone = a.icone;
          const ativo = marcados.includes(a.id);
          const unico = ativo && marcados.length === 1;
          return (
            <button
              key={a.id}
              type="button"
              role="checkbox"
              aria-checked={ativo}
              title={unico ? 'O relatório precisa de pelo menos um assunto' : a.pergunta}
              onClick={() => alternar(a.id)}
              className="flex items-center gap-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              style={{
                minHeight: 48, padding: '0 12px', borderRadius: 10,
                border: `1px solid ${ativo ? C.azul : C.borda}`,
                background: ativo ? C.azulSuave : 'white', outlineColor: C.azul,
              }}
            >
              <Icone size={18} style={{ color: ativo ? C.azul : C.apoio, flexShrink: 0 }} />
              <span className="flex-1" style={{ fontSize: 14, fontWeight: 600, color: ativo ? C.azulTexto : C.ink }}>{a.label}</span>
              {ativo && <Check size={15} strokeWidth={2.5} style={{ color: C.azul, flexShrink: 0 }} />}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => onChange(todos ? secoes.slice(0, 1) : ordenarSecoes(
          ASSUNTOS_ORDEM.map((id) => secoes.find((s) => s.assunto === id) ?? { ...configInicial(id), periodo: periodo ?? configInicial(id).periodo }),
          ASSUNTOS_ORDEM,
        ))}
        className="mt-2"
        style={{ minHeight: 40, fontSize: 14, fontWeight: 600, color: C.azulTexto }}
      >
        {todos ? 'Deixar só o primeiro' : 'Marcar todos'}
      </button>

      <ul className="mt-3 flex flex-col gap-1" style={{ fontSize: 14, color: C.texto }}>
        {secoes.map((s) => {
          const a = assuntoPorId(s.assunto);
          return (
            <li key={s.assunto}>
              {secoes.length > 1 ? <>Em <strong>{a.label}</strong>, cada linha será {a.cadaLinha}</> : <>Cada linha será <strong>{a.cadaLinha}</strong></>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ── Período ─────────────────────────────────────────────────────────────── */

export function EtapaPeriodo({ config, onChange, semTitulo }: EtapaProps & { semTitulo?: boolean }) {
  const a = assuntoPorId(config.assunto);
  const p = config.periodo;
  const resolvido = resolverPeriodo(p);
  const hoje = new Date();
  const anos = [hoje.getFullYear() - 2, hoje.getFullYear() - 1, hoje.getFullYear()];
  const ehAtalho = ATALHOS_PERIODO.some((x) => x.tipo === p.tipo);

  const setTipo = (tipo: PeriodoTipo) => {
    const mesAtual = hoje.getMonth() + 1;
    onChange({
      ...config,
      periodo: {
        tipo,
        ano: p.ano ?? hoje.getFullYear(),
        mes: p.mes ?? mesAtual,
        quadrimestre: p.quadrimestre ?? quadrimestreDoMes(mesAtual),
        inicio: p.inicio ?? resolvido.inicio,
        fim: p.fim ?? resolvido.fim,
      },
    });
  };
  const set = (patch: Partial<typeof p>) => onChange({ ...config, periodo: { ...p, ...patch } });
  const refAtual = a.datas.find((d) => d.id === config.referenciaData) ?? a.datas[0];

  return (
    <div>
      {!semTitulo && <Titulo apoio="Vale para todos os assuntos do relatório.">Qual período?</Titulo>}

      <div role="radiogroup" aria-label="Atalhos de período" className="flex flex-wrap gap-2">
        {ATALHOS_PERIODO.map((x) => (
          <Pilula key={x.tipo} role="radio" ativo={p.tipo === x.tipo} onClick={() => setTipo(x.tipo)}>{x.label}</Pilula>
        ))}
        <Pilula role="radio" ativo={!ehAtalho} onClick={() => !ehAtalho || setTipo('mes')}>Outro período</Pilula>
      </div>

      {!ehAtalho && (
        <div className="grid gap-2 mt-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
          <select aria-label="Tipo de período" value={p.tipo} onChange={(e) => setTipo(e.target.value as PeriodoTipo)} style={campoStyle}>
            {FORMAS_PERIODO.map((f) => <option key={f.tipo} value={f.tipo}>{f.label}</option>)}
          </select>
          {p.tipo === 'mes' && (
            <select aria-label="Mês" value={p.mes} onChange={(e) => set({ mes: Number(e.target.value) })} style={campoStyle}>
              {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          )}
          {p.tipo === 'quadrimestre' && (
            <select aria-label="Quadrimestre" value={p.quadrimestre} onChange={(e) => set({ quadrimestre: Number(e.target.value) as 1 | 2 | 3 })} style={campoStyle}>
              <option value={1}>1º quadrimestre</option>
              <option value={2}>2º quadrimestre</option>
              <option value={3}>3º quadrimestre</option>
            </select>
          )}
          {(p.tipo === 'mes' || p.tipo === 'quadrimestre' || p.tipo === 'ano') && (
            <select aria-label="Ano" value={p.ano} onChange={(e) => set({ ano: Number(e.target.value) })} style={campoStyle}>
              {anos.map((ano) => <option key={ano} value={ano}>{ano}</option>)}
            </select>
          )}
          {p.tipo === 'personalizado' && (
            <>
              <input aria-label="Data inicial" type="date" value={p.inicio ?? resolvido.inicio} onChange={(e) => set({ inicio: e.target.value })} style={campoStyle} />
              <input aria-label="Data final" type="date" value={p.fim ?? resolvido.fim} onChange={(e) => set({ fim: e.target.value })} style={campoStyle} />
            </>
          )}
        </div>
      )}

      <p className="mt-3" style={{ fontSize: 13.5, color: C.apoio }}>
        {dataBR(resolvido.inicio)} a {dataBR(resolvido.fim)}
      </p>

      <div className="mt-6">
        <p style={rotuloStyle}>Contar pela data de</p>
        {a.id === 'financeiro' ? (
          <p style={{ fontSize: 14, color: C.texto }}>Cada indicador usa a data escrita no próprio nome.</p>
        ) : (
          <>
            <div role="radiogroup" aria-label="Data usada no período" className="flex flex-wrap gap-2">
              {a.datas.map((d) => (
                <Pilula key={d.id} role="radio" ativo={refAtual.id === d.id} onClick={() => onChange({ ...config, referenciaData: d.id })} title={d.ajuda}>
                  {d.label}
                </Pilula>
              ))}
            </div>
            <p className="mt-2" style={{ fontSize: 13.5, color: C.apoio }}>{refAtual.ajuda}</p>
          </>
        )}
      </div>

      {a.id === 'financeiro' && (
        <label className="block mt-6" style={rotuloStyle}>
          Meta anual de procedimentos SIGTAP (informada)
          <input
            type="number" min={0} inputMode="numeric"
            value={config.metaAnualSigtap ?? ''}
            onChange={(e) => onChange({ ...config, metaAnualSigtap: e.target.value ? Number(e.target.value) : undefined })}
            style={{ ...campoStyle, marginTop: 8, maxWidth: 220, fontWeight: 400 }}
          />
        </label>
      )}
    </div>
  );
}

/* ── Colunas ─────────────────────────────────────────────────────────────── */

export function EtapaColunas({ config, onChange }: EtapaProps) {
  const a = assuntoPorId(config.assunto);
  const todos = camposDoAssunto(a);
  const agrupaveis = todos.filter((c) => c.agrupavel);
  const escolhidas = config.colunas.map((id) => todos.find((c) => c.id === id)).filter(Boolean) as Campo[];

  // Grupos do próprio assunto ficam à vista; os relacionados (paciente,
  // solicitação, unidades) ficam recolhidos até alguém precisar deles.
  const TRANSVERSAIS = ['paciente', 'solicitacao', 'unidades'];
  const principais = a.grupos.filter((g) => !TRANSVERSAIS.includes(g.id) && g.id !== 'prototipo');
  const extras = a.grupos.filter((g) => TRANSVERSAIS.includes(g.id));
  const [maisAberto, setMaisAberto] = useState(
    () => principais.length === 0 || extras.some((g) => g.campos.some((c) => config.colunas.includes(c.id))),
  );

  const alternar = (id: string) =>
    onChange({ ...config, colunas: config.colunas.includes(id) ? config.colunas.filter((x) => x !== id) : [...config.colunas, id] });
  const mover = (i: number, d: number) => {
    const l = [...config.colunas];
    const j = i + d;
    if (j < 0 || j >= l.length) return;
    [l[i], l[j]] = [l[j], l[i]];
    onChange({ ...config, colunas: l });
  };

  return (
    <div>
      <Titulo apoio="Toque para incluir ou tirar da tabela.">Quais colunas?</Titulo>

      <div className="flex flex-col gap-4">
        {principais.map((g) => <GrupoPilulas key={g.id} grupo={g} colunas={config.colunas} alternar={alternar} />)}
      </div>

      {extras.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            aria-expanded={maisAberto}
            onClick={() => setMaisAberto((v) => !v)}
            className="inline-flex items-center gap-1.5"
            style={{ minHeight: 40, fontSize: 14, fontWeight: 600, color: C.azulTexto }}
          >
            <ChevronDown size={16} style={{ transform: maisAberto ? 'rotate(180deg)' : undefined }} />
            {maisAberto ? 'Menos colunas' : `Mais colunas: ${extras.map((g) => g.label.toLowerCase()).join(', ')}`}
          </button>
          {maisAberto && (
            <div className="flex flex-col gap-4 mt-3">
              {extras.map((g) => <GrupoPilulas key={g.id} grupo={g} colunas={config.colunas} alternar={alternar} />)}
            </div>
          )}
        </div>
      )}

      {escolhidas.length > 1 && (
        <div className="mt-6">
          <p style={rotuloStyle}>Ordem na tabela</p>
          <ol className="flex flex-wrap gap-1.5">
            {escolhidas.map((campo, i) => (
              <li key={campo.id} className="inline-flex items-center" style={{ border: `1px solid ${C.borda}`, borderRadius: 8, background: C.fundo, fontSize: 13.5, color: C.texto }}>
                <BotaoIcone rotulo={`Mover ${campo.label} para a esquerda`} onClick={() => mover(i, -1)} desativado={i === 0}><ArrowLeft size={14} /></BotaoIcone>
                <span style={{ padding: '0 2px' }}>{campo.label}</span>
                <BotaoIcone rotulo={`Mover ${campo.label} para a direita`} onClick={() => mover(i, 1)} desativado={i === escolhidas.length - 1}><ArrowRight size={14} /></BotaoIcone>
              </li>
            ))}
          </ol>
        </div>
      )}

      {a.id !== 'financeiro' && (
        <div className="mt-6">
          <p style={rotuloStyle}>Mostrar</p>
          <div role="radiogroup" aria-label="Como mostrar" className="flex flex-wrap items-center gap-2">
            <Pilula role="radio" ativo={!config.agruparPor} onClick={() => onChange({ ...config, agruparPor: '' })}>Um registro por linha</Pilula>
            <Pilula role="radio" ativo={Boolean(config.agruparPor)} onClick={() => onChange({ ...config, agruparPor: config.agruparPor || agrupaveis[0]?.id || '' })}>Totais agrupados</Pilula>
            {config.agruparPor && (
              <select aria-label="Agrupar por" value={config.agruparPor} onChange={(e) => onChange({ ...config, agruparPor: e.target.value })} style={{ ...campoStyle, width: 'auto', minWidth: 200 }}>
                {agrupaveis.map((c) => <option key={c.id} value={c.id}>por {c.tipo === 'data' ? `${c.label.toLowerCase()} (mês)` : c.label.toLowerCase()}</option>)}
              </select>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function GrupoPilulas({ grupo, colunas, alternar }: { grupo: GrupoCampos; colunas: string[]; alternar: (id: string) => void }) {
  return (
    <div>
      <p style={rotuloStyle}>{grupo.label}</p>
      <div className="flex flex-wrap gap-2">
        {grupo.campos.map((campo) => (
          <Pilula key={campo.id} ativo={colunas.includes(campo.id)} onClick={() => alternar(campo.id)} title={campo.ajuda}>
            {campo.label}
          </Pilula>
        ))}
      </div>
    </div>
  );
}

function BotaoIcone({ children, rotulo, onClick, desativado }: { children: React.ReactNode; rotulo: string; onClick: () => void; desativado?: boolean }) {
  return (
    <button
      type="button" aria-label={rotulo} title={rotulo} onClick={onClick} disabled={desativado}
      className="inline-flex items-center justify-center"
      style={{ width: 32, height: 34, color: desativado ? '#CBD5E1' : C.apoio, cursor: desativado ? 'default' : 'pointer' }}
    >
      {children}
    </button>
  );
}

/* ── Filtros ─────────────────────────────────────────────────────────────── */

export function EtapaFiltros({ config, onChange, base, resultado, semTitulo }: EtapaProps & { base: BaseRelatorios; resultado: ResultadoRelatorio; semTitulo?: boolean }) {
  const a = assuntoPorId(config.assunto);
  const disponiveis = filtrosDoAssunto(a).filter((c) => c.id !== 'origemDado');
  const aplicados = config.filtros.filter((f) => f.valores.some((v) => v !== ''));
  const [campoId, setCampoId] = useState<string>('');

  const salvar = (f: FiltroAplicado) => {
    const outros = config.filtros.filter((x) => x.campoId !== f.campoId);
    onChange({ ...config, filtros: f.valores.some((v) => v !== '') ? [...outros, f] : outros });
  };
  const campo = disponiveis.find((c) => c.id === campoId);

  return (
    <div>
      {!semTitulo && <Titulo apoio="Opcional. Deixa só os registros que interessam.">Quer filtrar?</Titulo>}

      {aplicados.length > 0 && (
        <ul className="flex flex-wrap gap-2 mb-4" aria-label="Filtros aplicados">
          {aplicados.map((f) => (
            <li key={f.campoId} className="inline-flex items-center" style={{ border: `1px solid ${C.azulBorda}`, background: C.azulSuave, borderRadius: 999, fontSize: 14, color: C.azulTexto }}>
              <button type="button" onClick={() => setCampoId(f.campoId)} style={{ padding: '8px 4px 8px 14px' }}>{descreverFiltro(resultado, f)}</button>
              <button
                type="button" aria-label="Remover filtro" title="Remover filtro"
                onClick={() => { salvar({ campoId: f.campoId, valores: [] }); if (campoId === f.campoId) setCampoId(''); }}
                className="inline-flex items-center justify-center" style={{ width: 36, height: 36 }}
              >
                <X size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <label className="block" style={rotuloStyle}>
        {aplicados.length ? 'Adicionar ou alterar filtro' : 'Filtrar por'}
        <select value={campoId} onChange={(e) => setCampoId(e.target.value)} style={{ ...campoStyle, marginTop: 8, fontWeight: 400 }}>
          <option value="">Escolha uma informação...</option>
          {disponiveis.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </label>

      {campo && (
        <EditorFiltro
          key={campo.id}
          campo={campo}
          inicial={config.filtros.find((f) => f.campoId === campo.id) ?? { campoId: campo.id, valores: [] }}
          opcoes={opcoesDoFiltro(base, config, campo.id)}
          onAplicar={(f) => { salvar(f); setCampoId(''); }}
        />
      )}
    </div>
  );
}

function EditorFiltro({
  campo, inicial, opcoes, onAplicar,
}: {
  campo: Campo; inicial: FiltroAplicado; opcoes: Array<{ valor: string; quantidade: number }>; onAplicar: (f: FiltroAplicado) => void;
}) {
  const [valores, setValores] = useState<string[]>(inicial.valores);
  const [busca, setBusca] = useState('');
  const visiveis = useMemo(
    () => opcoes.filter((o) => !busca.trim() || o.valor.toLowerCase().includes(busca.trim().toLowerCase())),
    [opcoes, busca],
  );

  return (
    <div className="mt-3" style={{ border: `1px solid ${C.borda}`, borderRadius: 10, padding: 14, background: C.fundo }}>
      {campo.tipo === 'categoria' && (
        <>
          {opcoes.length > 10 && (
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Procurar" aria-label={`Procurar ${campo.label}`} style={{ ...campoStyle, marginBottom: 10 }} />
          )}
          <div className="flex flex-wrap gap-2" style={{ maxHeight: 240, overflowY: 'auto' }}>
            {visiveis.map((o) => (
              <Pilula key={o.valor} ativo={valores.includes(o.valor)} onClick={() => setValores((v) => (v.includes(o.valor) ? v.filter((x) => x !== o.valor) : [...v, o.valor]))}>
                {o.valor} <span style={{ color: C.apoio, fontWeight: 400 }}>{o.quantidade}</span>
              </Pilula>
            ))}
            {visiveis.length === 0 && <p style={{ fontSize: 13.5, color: C.apoio }}>Nenhuma opção no período.</p>}
          </div>
        </>
      )}
      {campo.tipo === 'texto' && (
        <input value={valores[0] ?? ''} onChange={(e) => setValores([e.target.value])} placeholder="Contém o texto" aria-label={campo.label} style={campoStyle} />
      )}
      {(campo.tipo === 'numero' || campo.tipo === 'moeda') && (
        <div className="grid grid-cols-2 gap-2">
          <input type="number" inputMode="decimal" placeholder="De" aria-label="Valor mínimo" value={valores[0] ?? ''} onChange={(e) => setValores([e.target.value, valores[1] ?? ''])} style={campoStyle} />
          <input type="number" inputMode="decimal" placeholder="Até" aria-label="Valor máximo" value={valores[1] ?? ''} onChange={(e) => setValores([valores[0] ?? '', e.target.value])} style={campoStyle} />
        </div>
      )}
      <button type="button" className="tfd-btn tfd-btn-primary mt-3" style={{ minHeight: 40 }} onClick={() => onAplicar({ campoId: campo.id, valores })}>
        <Plus size={15} /> Aplicar filtro
      </button>
    </div>
  );
}
