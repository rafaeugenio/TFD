'use client';

/* -------------------------------------------------------------------------- */
/*  Painel "Personalizar": como a tabela é montada. Assuntos, forma de mostrar */
/*  (agrupamento), colunas e a ordem delas. Colunas e agrupamento só mudam    */
/*  aqui; a barra de consulta cuida de período, busca e filtros.              */
/* -------------------------------------------------------------------------- */

import { useId, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, ChevronDown } from 'lucide-react';
import { ASSUNTOS_ORDEM, assuntoPorId, camposDoAssunto } from '../assuntos';
import type { Pendencia } from '../validacao';
import type { Campo, ConfigRelatorio, GrupoCampos } from '../tipos';
import { alternarAssunto } from './JanelaAssunto';
import { C, Pilula, campoStyle, rotuloCampo } from './estilo';

interface Props {
  secoes: ConfigRelatorio[];
  config: ConfigRelatorio | undefined;
  pendencias: Pendencia[];
  onSecoes: (s: ConfigRelatorio[]) => void;
  onConfig: (c: ConfigRelatorio) => void;
  onRemoverPendencias: (p: Pendencia[]) => void;
}

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function Painel({ secoes, config, pendencias, onSecoes, onConfig, onRemoverPendencias }: Props) {
  return (
    <div className="flex flex-col gap-6">
      {pendencias.length > 0 && <Pendencias pendencias={pendencias} onRemover={onRemoverPendencias} />}
      <Assuntos secoes={secoes} onChange={onSecoes} />
      {config && <PorAssunto key={config.assunto} config={config} onChange={onConfig} pendencias={pendencias.filter((p) => p.assunto === config.assunto)} />}
    </div>
  );
}

function Bloco({ titulo, apoio, children }: { titulo: string; apoio?: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: C.ink }}>{titulo}</h3>
      {apoio && <p style={{ fontSize: 13, color: C.apoio, marginTop: 2 }}>{apoio}</p>}
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

/* ── Campos que não existem mais ─────────────────────────────────────────── */

function Pendencias({ pendencias, onRemover }: { pendencias: Pendencia[]; onRemover: (p: Pendencia[]) => void }) {
  return (
    <section
      role="alert"
      style={{ padding: '10px 12px', background: 'var(--tfd-warning-bg)', border: '1px solid var(--tfd-status-warning-border)', borderRadius: 'var(--tfd-radius-md)', fontSize: 13, color: 'var(--tfd-status-warning-strong)' }}
    >
      <p className="flex gap-2" style={{ fontWeight: 600 }}>
        <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 2 }} /> Campos que não existem mais
      </p>
      <ul className="mt-2 flex flex-col gap-1.5">
        {pendencias.map((p) => (
          <li key={`${p.assunto}:${p.tipo}:${p.id}`} className="flex items-center justify-between gap-2">
            <span>{p.descricao}</span>
            <button type="button" className="tfd-btn tfd-btn-ghost tfd-btn--sm" onClick={() => onRemover([p])}>Remover</button>
          </li>
        ))}
      </ul>
      {pendencias.length > 1 && (
        <button type="button" className="tfd-btn tfd-btn-secondary tfd-btn--sm mt-2" onClick={() => onRemover(pendencias)}>Remover todos</button>
      )}
    </section>
  );
}

/* ── Assuntos ────────────────────────────────────────────────────────────── */

function Assuntos({ secoes, onChange }: { secoes: ConfigRelatorio[]; onChange: (s: ConfigRelatorio[]) => void }) {
  const marcados = secoes.map((s) => s.assunto);
  return (
    <Bloco titulo="Assuntos" apoio="Cada assunto é uma tabela própria, sem juntar linhas de assuntos diferentes.">
      <ul className="flex flex-col">
        {ASSUNTOS_ORDEM.map((id) => {
          const a = assuntoPorId(id);
          const ativo = marcados.includes(id);
          const unico = ativo && marcados.length === 1;
          return (
            <li key={id}>
              <label className="flex items-center gap-2.5 cursor-pointer" style={{ minHeight: 36, fontSize: 14, color: C.ink, opacity: unico ? 0.7 : 1 }} title={unico ? 'O relatório precisa de pelo menos um assunto' : a.pergunta}>
                <input
                  type="checkbox" checked={ativo} disabled={unico}
                  onChange={() => onChange(alternarAssunto(secoes, id))}
                  style={{ width: 16, height: 16, accentColor: 'var(--tfd-blue-500)' }}
                />
                {a.label}
              </label>
            </li>
          );
        })}
      </ul>
    </Bloco>
  );
}

/* ── Opções do assunto em foco ───────────────────────────────────────────── */

function PorAssunto({ config, onChange, pendencias }: { config: ConfigRelatorio; onChange: (c: ConfigRelatorio) => void; pendencias: Pendencia[] }) {
  const a = assuntoPorId(config.assunto);
  const todos = camposDoAssunto(a);
  const agrupaveis = todos.filter((c) => c.agrupavel);
  const escolhidas = config.colunas.map((id) => todos.find((c) => c.id === id)).filter(Boolean) as Campo[];
  const refAtual = a.datas.find((d) => d.id === config.referenciaData) ?? a.datas[0];

  return (
    <>
      <div style={{ borderTop: `1px solid ${C.borda}` }} />
      <p style={{ fontSize: 13, color: C.apoio }}>Ajustes de <strong style={{ color: C.ink }}>{a.label}</strong></p>

      {a.id !== 'financeiro' && (
        <Bloco titulo="Como mostrar">
          <select
            aria-label="Agrupar por"
            value={agrupaveis.some((c) => c.id === config.agruparPor) ? config.agruparPor : ''}
            onChange={(e) => onChange({ ...config, agruparPor: e.target.value })}
            style={campoStyle}
          >
            <option value="">Um registro por linha</option>
            {agrupaveis.map((c) => <option key={c.id} value={c.id}>Totais por {c.tipo === 'data' ? `${c.label.toLowerCase()} (mês)` : c.label.toLowerCase()}</option>)}
          </select>
        </Bloco>
      )}

      <Colunas config={config} onChange={onChange} pendencias={pendencias} />

      {escolhidas.length > 1 && <Ordem escolhidas={escolhidas} config={config} onChange={onChange} />}

      <Bloco titulo="Contar pela data de">
        {a.id === 'financeiro' ? (
          <>
            <p style={{ fontSize: 13.5, color: C.texto }}>Cada indicador usa a data escrita no próprio nome.</p>
            <label className="block mt-3">
              <span style={rotuloCampo}>Meta anual de procedimentos SIGTAP (informada)</span>
              <input
                type="number" min={0} inputMode="numeric"
                value={config.metaAnualSigtap ?? ''}
                onChange={(e) => onChange({ ...config, metaAnualSigtap: e.target.value ? Number(e.target.value) : undefined })}
                style={{ ...campoStyle, maxWidth: 220 }}
              />
            </label>
          </>
        ) : (
          <>
            <div role="radiogroup" aria-label="Data usada no período" className="flex flex-wrap gap-2">
              {a.datas.map((d) => (
                <Pilula key={d.id} role="radio" ativo={refAtual.id === d.id} onClick={() => onChange({ ...config, referenciaData: d.id })} title={d.ajuda}>{d.label}</Pilula>
              ))}
            </div>
            <p className="mt-2" style={{ fontSize: 13.5, color: C.apoio }}>{refAtual.ajuda}</p>
          </>
        )}
      </Bloco>
    </>
  );
}

/* ── Colunas ─────────────────────────────────────────────────────────────── */

function Colunas({ config, onChange, pendencias }: { config: ConfigRelatorio; onChange: (c: ConfigRelatorio) => void; pendencias: Pendencia[] }) {
  const a = assuntoPorId(config.assunto);
  const [busca, setBusca] = useState('');
  const buscaId = useId();
  const TRANSVERSAIS = ['paciente', 'solicitacao', 'unidades'];
  const principais = a.grupos.filter((g) => !TRANSVERSAIS.includes(g.id) && g.id !== 'prototipo');
  const extras = a.grupos.filter((g) => TRANSVERSAIS.includes(g.id));
  const [maisAberto, setMaisAberto] = useState(
    () => principais.length === 0 || extras.some((g) => g.campos.some((c) => config.colunas.includes(c.id))),
  );
  const termo = normalizar(busca.trim());
  const filtrar = (g: GrupoCampos): GrupoCampos => ({ ...g, campos: termo ? g.campos.filter((c) => normalizar(c.label).includes(termo)) : g.campos });
  const alternar = (id: string) =>
    onChange({ ...config, colunas: config.colunas.includes(id) ? config.colunas.filter((x) => x !== id) : [...config.colunas, id] });
  const invalidas = pendencias.filter((p) => p.tipo === 'coluna');
  const validas = config.colunas.filter((id) => !invalidas.some((p) => p.id === id)).length;

  // Com busca, todos os grupos entram, inclusive os recolhidos.
  const visiveis = (termo ? [...principais, ...extras] : principais).map(filtrar).filter((g) => g.campos.length > 0);
  const extrasVisiveis = termo ? [] : extras.map(filtrar);

  return (
    <Bloco titulo={`Colunas (${validas})`}>
      <label htmlFor={buscaId} className="sr-only">Buscar coluna</label>
      <input id={buscaId} type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar coluna..." style={campoStyle} />

      <div className="flex flex-col gap-4 mt-3">
        {visiveis.map((g) => <GrupoColunas key={g.id} grupo={g} colunas={config.colunas} alternar={alternar} />)}
        {termo && visiveis.length === 0 && <p style={{ fontSize: 13.5, color: C.apoio }}>Nenhuma coluna com &quot;{busca.trim()}&quot;.</p>}
      </div>

      {extrasVisiveis.length > 0 && (
        <div className="mt-3">
          <button
            type="button" aria-expanded={maisAberto} onClick={() => setMaisAberto((v) => !v)}
            className="inline-flex items-center gap-1.5 focus-visible:outline focus-visible:outline-2"
            style={{ minHeight: 36, fontSize: 14, fontWeight: 600, color: C.azul, outlineColor: C.azul }}
          >
            <ChevronDown size={16} style={{ transform: maisAberto ? 'rotate(180deg)' : undefined }} />
            {maisAberto ? 'Menos colunas' : `Mais colunas: ${extras.map((g) => g.label.toLowerCase()).join(', ')}`}
          </button>
          {maisAberto && (
            <div className="flex flex-col gap-4 mt-2">
              {extrasVisiveis.map((g) => <GrupoColunas key={g.id} grupo={g} colunas={config.colunas} alternar={alternar} />)}
            </div>
          )}
        </div>
      )}
    </Bloco>
  );
}

function GrupoColunas({ grupo, colunas, alternar }: { grupo: GrupoCampos; colunas: string[]; alternar: (id: string) => void }) {
  return (
    <fieldset>
      <legend style={rotuloCampo}>{grupo.label}</legend>
      <ul className="flex flex-col">
        {grupo.campos.map((campo) => (
          <li key={campo.id}>
            <label className="flex items-center gap-2.5 cursor-pointer" style={{ minHeight: 34, fontSize: 14, color: C.ink }} title={campo.ajuda}>
              <input
                type="checkbox" checked={colunas.includes(campo.id)} onChange={() => alternar(campo.id)}
                style={{ width: 16, height: 16, accentColor: 'var(--tfd-blue-500)', flexShrink: 0 }}
              />
              {campo.label}
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

/* ── Ordem das colunas: botões subir e descer (alternativa ao arrastar) ──── */

function Ordem({ escolhidas, config, onChange }: { escolhidas: Campo[]; config: ConfigRelatorio; onChange: (c: ConfigRelatorio) => void }) {
  const mover = (campo: Campo, d: number) => {
    const l = [...config.colunas];
    const i = l.indexOf(campo.id);
    const j = i + d;
    if (i < 0 || j < 0 || j >= l.length) return;
    [l[i], l[j]] = [l[j], l[i]];
    onChange({ ...config, colunas: l });
  };
  return (
    <Bloco titulo="Ordem das colunas" apoio="Da esquerda para a direita na tabela.">
      <ol className="flex flex-col gap-1">
        {escolhidas.map((campo, i) => (
          <li key={campo.id} className="flex items-center justify-between gap-2" style={{ border: `1px solid ${C.borda}`, borderRadius: 'var(--tfd-radius-md)', background: C.fundo, fontSize: 13, color: C.texto, paddingLeft: 10 }}>
            <span className="truncate">{i + 1}. {campo.label}</span>
            <span className="inline-flex shrink-0">
              <BotaoOrdem rotulo={`Mover ${campo.label} para cima`} desativado={i === 0} onClick={() => mover(campo, -1)}><ArrowUp size={14} /></BotaoOrdem>
              <BotaoOrdem rotulo={`Mover ${campo.label} para baixo`} desativado={i === escolhidas.length - 1} onClick={() => mover(campo, 1)}><ArrowDown size={14} /></BotaoOrdem>
            </span>
          </li>
        ))}
      </ol>
    </Bloco>
  );
}

function BotaoOrdem({ children, rotulo, onClick, desativado }: { children: React.ReactNode; rotulo: string; onClick: () => void; desativado?: boolean }) {
  return (
    <button
      type="button" aria-label={rotulo} title={rotulo} onClick={onClick} disabled={desativado}
      className="inline-flex items-center justify-center focus-visible:outline focus-visible:outline-2 enabled:hover:bg-[var(--tfd-100)]"
      style={{ width: 34, height: 34, color: desativado ? 'var(--tfd-300)' : C.apoio, cursor: desativado ? 'default' : 'pointer', outlineColor: C.azul }}
    >
      {children}
    </button>
  );
}
