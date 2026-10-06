'use client';

/* -------------------------------------------------------------------------- */
/*  Peças da barra de consulta: período, filtros em um passo e etiquetas.     */
/*  Aqui só entra o que responde "quais registros eu quero ver agora?".       */
/*  Colunas, agrupamento e data de contagem ficam no painel Personalizar.     */
/* -------------------------------------------------------------------------- */

import { useMemo, useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { filtrosDoAssunto } from '../assuntos';
import type { BaseRelatorios } from '../dataset';
import { opcoesDoFiltro } from '../motor';
import { ATALHOS_PERIODO, FORMAS_PERIODO, MESES, dataBR, quadrimestreDoMes, resolverPeriodo } from '../periodo';
import { assuntoPorId } from '../assuntos';
import type { Campo, ConfigRelatorio, FiltroAplicado, PeriodoTipo } from '../tipos';
import { C, Pilula, campoStyle, rotuloCampo } from './estilo';

/* ── Período ─────────────────────────────────────────────────────────────── */

export function EditorPeriodo({ config, onChange }: { config: ConfigRelatorio; onChange: (c: ConfigRelatorio) => void }) {
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

  return (
    <div>
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
    </div>
  );
}

/* ── Filtros em um passo ─────────────────────────────────────────────────── */

/** Escolher o campo abre o editor de valores na hora, e cada escolha já
 *  aplica o filtro. Sem botão "Aplicar". */
export function EditorFiltros({ config, onChange, base, campoInicial = '' }: { config: ConfigRelatorio; onChange: (c: ConfigRelatorio) => void; base: BaseRelatorios; campoInicial?: string }) {
  const a = assuntoPorId(config.assunto);
  const disponiveis = filtrosDoAssunto(a).filter((c) => c.id !== 'origemDado');
  const [campoId, setCampoId] = useState(campoInicial);
  const campo = disponiveis.find((c) => c.id === campoId);

  const aplicar = (f: FiltroAplicado) => {
    const outros = config.filtros.filter((x) => x.campoId !== f.campoId);
    onChange({ ...config, filtros: f.valores.some((v) => v !== '') ? [...outros, f] : outros });
  };

  return (
    <div>
      <label className="block">
        <span style={rotuloCampo}>Filtrar por</span>
        <select value={campoId} onChange={(e) => setCampoId(e.target.value)} style={{ ...campoStyle, maxWidth: 480 }}>
          <option value="">Escolha uma informação...</option>
          {disponiveis.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </label>
      {campo && (
        <EditorValores
          key={campo.id}
          campo={campo}
          atual={config.filtros.find((f) => f.campoId === campo.id)?.valores ?? []}
          opcoes={opcoesDoFiltro(base, config, campo.id)}
          onChange={(valores) => aplicar({ campoId: campo.id, valores })}
        />
      )}
    </div>
  );
}

function EditorValores({
  campo, atual, opcoes, onChange,
}: { campo: Campo; atual: string[]; opcoes: Array<{ valor: string; quantidade: number }>; onChange: (v: string[]) => void }) {
  const [busca, setBusca] = useState('');
  const visiveis = useMemo(
    () => opcoes.filter((o) => !busca.trim() || o.valor.toLowerCase().includes(busca.trim().toLowerCase())),
    [opcoes, busca],
  );
  // Opções já escolhidas que sumiram do período continuam visíveis para poderem ser desmarcadas.
  const extras = atual.filter((v) => !opcoes.some((o) => o.valor === v));

  return (
    <div className="mt-3" style={{ border: `1px solid ${C.borda}`, borderRadius: 'var(--tfd-radius-lg)', padding: 14, background: C.fundo }}>
      {campo.tipo === 'categoria' && (
        <>
          {opcoes.length > 10 && (
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Procurar" aria-label={`Procurar em ${campo.label}`} style={{ ...campoStyle, marginBottom: 10 }} />
          )}
          <div className="flex flex-wrap gap-2" style={{ maxHeight: 240, overflowY: 'auto' }}>
            {extras.map((v) => (
              <Pilula key={v} ativo onClick={() => onChange(atual.filter((x) => x !== v))}>{v} <span style={{ color: C.apoio, fontWeight: 400 }}>0</span></Pilula>
            ))}
            {visiveis.map((o) => (
              <Pilula key={o.valor} ativo={atual.includes(o.valor)} onClick={() => onChange(atual.includes(o.valor) ? atual.filter((x) => x !== o.valor) : [...atual, o.valor])}>
                {o.valor} <span style={{ color: C.apoio, fontWeight: 400 }}>{o.quantidade}</span>
              </Pilula>
            ))}
            {visiveis.length === 0 && extras.length === 0 && <p style={{ fontSize: 13.5, color: C.apoio }}>Nenhuma opção no período.</p>}
          </div>
        </>
      )}
      {campo.tipo === 'texto' && (
        <input value={atual[0] ?? ''} onChange={(e) => onChange([e.target.value])} placeholder="Contém o texto" aria-label={campo.label} style={campoStyle} />
      )}
      {(campo.tipo === 'numero' || campo.tipo === 'moeda') && (
        <div className="grid grid-cols-2 gap-2">
          <input type="number" inputMode="decimal" placeholder="De" aria-label="Valor mínimo" value={atual[0] ?? ''} onChange={(e) => onChange([e.target.value, atual[1] ?? ''])} style={campoStyle} />
          <input type="number" inputMode="decimal" placeholder="Até" aria-label="Valor máximo" value={atual[1] ?? ''} onChange={(e) => onChange([atual[0] ?? '', e.target.value])} style={campoStyle} />
        </div>
      )}
    </div>
  );
}

/* ── Peças da barra ──────────────────────────────────────────────────────── */

export function CampoBarra({ rotulo, icone, children, className, estilo }: { rotulo: string; icone?: React.ReactNode; children: React.ReactNode; className?: string; estilo?: React.CSSProperties }) {
  return (
    <div className={className} style={estilo}>
      <span style={rotuloCampo}>{icone}{rotulo}</span>
      {children}
    </div>
  );
}

export function Etiqueta({ texto, alerta, onRemover, onAbrir }: { texto: string; alerta?: boolean; onRemover: () => void; onAbrir?: () => void }) {
  return (
    <span
      className="inline-flex items-center"
      style={{
        background: alerta ? 'var(--tfd-warning-bg)' : C.azulSuave, borderRadius: 'var(--tfd-radius-md)', fontSize: 13,
        color: alerta ? 'var(--tfd-status-warning-strong)' : C.azulTexto,
      }}
    >
      {onAbrir ? (
        <button type="button" onClick={onAbrir} className="focus-visible:outline focus-visible:outline-2" style={{ padding: '4px 2px 4px 10px', outlineColor: C.azul }}>{texto}</button>
      ) : (
        <span style={{ padding: '4px 2px 4px 10px' }}>{texto}</span>
      )}
      <button type="button" aria-label={`Remover ${texto}`} onClick={onRemover} className="inline-flex items-center justify-center focus-visible:outline focus-visible:outline-2" style={{ width: 30, height: 30, outlineColor: C.azul }}>
        <X size={14} />
      </button>
    </span>
  );
}

/** Aparência de p-select: abre o painel inline abaixo da barra. */
export function BotaoBarra({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick} aria-expanded={ativo}
      className="inline-flex items-center justify-between gap-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
      style={{
        height: 36, minWidth: 160, padding: '0 10px', borderRadius: 'var(--tfd-radius-md)', fontSize: 14, fontWeight: 400, outlineColor: C.azul,
        border: `1px solid ${ativo ? C.azul : C.campo}`, background: 'white', color: C.ink,
      }}
    >
      {children}
      <ChevronDown size={16} style={{ color: C.apoio, transform: ativo ? 'rotate(180deg)' : undefined }} />
    </button>
  );
}
