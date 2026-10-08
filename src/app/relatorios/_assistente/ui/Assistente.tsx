'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowUp, HelpCircle, Info, Loader2, MessageSquarePlus, ShieldAlert,
  Sparkles, Settings2, SearchX,
} from 'lucide-react';
import PageHeader from '@/shared/components/page-header/PageHeader';
import { ColunasChart, DonutChart, SEQUENCIA_CORES, TendenciaChart, TopBarChart } from '@/shared/components/charts/Graficos';
import { BarChart3, BarChartHorizontal, LineChart as LineChartIcon, PieChart as PieIcon } from 'lucide-react';
import { C, rotuloCampo } from '../../_construtor/ui/estilo';
import { cartao } from '../../_construtor/ui/Previa';
import { LIMITE_PERGUNTA, SUGESTOES_INICIAIS, type RespostaAssistente, type TipoGrafico } from '../contrato';

/**
 * Assistente de Relatórios: conversa em que o usuário pergunta em linguagem
 * natural e recebe totais agregados calculados no servidor. A conversa fica
 * só na memória da tela (nada é salvo), e cada resposta mostra o período,
 * os filtros, a regra de cálculo, a fonte e o horário.
 */

interface Mensagem {
  id: number;
  pergunta: string;
  resposta?: RespostaAssistente;
}

/** Reconhece pedidos de troca de gráfico ("mostra em pizza", "em barras", "gráfico de linha"). */
function comandoDeGrafico(texto: string): TipoGrafico | null {
  const t = texto.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (t.length > 60) return null;
  const pedeGrafico = /grafico|mostr|exib|ver |veja|coloc|faz|quero|em (pizza|rosca|barra|coluna|linha)|^(pizza|rosca|barras?|colunas?|linha)/.test(t);
  if (!pedeGrafico) return null;
  if (/pizza|rosca|donut|torta/.test(t)) return 'pizza';
  if (/coluna/.test(t)) return 'colunas';
  if (/barra/.test(t)) return 'barras';
  if (/linha|evolucao|tendencia/.test(t)) return 'linha';
  return null;
}

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const QTD = (v: number) => v.toLocaleString('pt-BR');
const DIAS = (v: number) => `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${v === 1 ? 'dia' : 'dias'}`;
const dataBR = (s: string) => s.split('-').reverse().join('/');
const horaBR = (iso?: string) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '');

async function perguntar(pergunta: string, historico: { pergunta: string; interpretacao?: string }[]): Promise<RespostaAssistente> {
  try {
    const r = await fetch('/api/relatorios/assistente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pergunta, historico }),
    });
    // Sem sessão o middleware redireciona para o login e volta HTML.
    if (!(r.headers.get('content-type') ?? '').includes('application/json')) {
      return { status: 'erro', mensagem: 'Sua sessão expirou. Entre de novo no sistema.' };
    }
    return (await r.json()) as RespostaAssistente;
  } catch {
    return { status: 'erro', mensagem: 'Sem conexão com o servidor. Confira a internet e tente de novo.' };
  }
}

export default function Assistente() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const proximoId = useRef(1);
  const fimRef = useRef<HTMLDivElement>(null);
  const campoRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [mensagens]);

  const enviar = async (pergunta: string) => {
    const limpa = pergunta.trim();
    if (!limpa || enviando) return;
    const id = proximoId.current++;

    // "mostra em pizza", "em barras"...: redesenha a última resposta, sem chamar o servidor.
    const tipo = comandoDeGrafico(limpa);
    const ultima = [...mensagens].reverse().find((m) => m.resposta?.status === 'ok' && (m.resposta.grupos?.itens.length ?? 0) > 1);
    if (tipo && ultima?.resposta) {
      setMensagens((m) => [...m, { id, pergunta: limpa, resposta: { ...ultima.resposta!, graficoPreferido: tipo } }]);
      setTexto('');
      return;
    }

    // Contexto para perguntas de continuação ("e no mês passado?"): só as últimas perguntas e como foram entendidas.
    const historico = mensagens.filter((m) => m.resposta && m.resposta.status !== 'bloqueado').slice(-3)
      .map((m) => ({ pergunta: m.pergunta, interpretacao: m.resposta?.perguntaInterpretada }));
    setMensagens((m) => [...m, { id, pergunta: limpa }]);
    setTexto('');
    setEnviando(true);
    const resposta = await perguntar(limpa, historico);
    setMensagens((m) => m.map((x) => (x.id === id ? { ...x, resposta } : x)));
    setEnviando(false);
    campoRef.current?.focus();
  };

  const novaConversa = () => {
    setMensagens([]);
    setTexto('');
    campoRef.current?.focus();
  };

  const vazio = mensagens.length === 0;

  return (
    <div className="pb-8">
      <PageHeader
        title="IA"
        subtitle="Pergunte em linguagem natural e receba totais calculados direto da base do TFD."
        breadcrumbs={[]}
        actions={
          !vazio ? (
            <button type="button" className="tfd-btn tfd-btn-secondary" onClick={novaConversa} disabled={enviando}>
              <MessageSquarePlus size={16} /> Nova conversa
            </button>
          ) : undefined
        }
      />

      <div className="mx-auto flex flex-col gap-4" style={{ maxWidth: 880 }}>
        {vazio && (
          <section aria-labelledby="assistente-titulo" style={{ ...cartao, padding: 24, background: C.azulSuave, borderColor: C.azulBorda }}>
            <div className="flex items-start gap-3">
              <span className="inline-flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: '50%', background: 'white', color: C.azul }}>
                <Sparkles size={20} />
              </span>
              <div>
                <h2 id="assistente-titulo" style={{ fontSize: 17, fontWeight: 700, color: C.ink }}>Assistente de Relatórios</h2>
                <p style={{ fontSize: 14, color: C.texto, marginTop: 4, maxWidth: 640 }}>
                  Pergunte sobre gastos, solicitações, setores, pareceres, agendamentos e pacientes do TFD. O Gemini entende a pergunta, o JEV escolhe a consulta certa e os números saem da base do sistema, calculados no servidor. Respondo só totais, contagens e médias, nunca dados de pessoas. Dá para continuar a conversa, por exemplo: &quot;e no mês passado?&quot;.
                </p>
              </div>
            </div>
            <p style={{ ...rotuloCampo, marginTop: 18 }}>Experimente perguntar</p>
            <div className="flex flex-wrap gap-2">
              {SUGESTOES_INICIAIS.map((s) => (
                <button key={s} type="button" className="tfd-btn tfd-btn-secondary" style={{ background: 'white', fontWeight: 500, height: 'auto', minHeight: 36, padding: '6px 12px', textAlign: 'left' }} onClick={() => enviar(s)}>
                  {s}
                </button>
              ))}
            </div>
          </section>
        )}

        <div role="log" aria-live="polite" aria-label="Conversa com o assistente" className="flex flex-col gap-4">
          {mensagens.map((m) => (
            <div key={m.id} className="flex flex-col gap-3">
              <div className="self-end" style={{ maxWidth: '80%', background: C.azul, color: 'white', borderRadius: '14px 14px 4px 14px', padding: '10px 14px', fontSize: 14, lineHeight: 1.45 }}>
                <span className="sr-only">Você perguntou: </span>
                {m.pergunta}
              </div>
              {m.resposta ? <CartaoResposta r={m.resposta} onSugestao={enviar} /> : <Carregando />}
            </div>
          ))}
          <div ref={fimRef} />
        </div>

        <form
          className="sticky bottom-0 pt-2"
          style={{ background: 'linear-gradient(to bottom, transparent, var(--tfd-surface-ground, #F8FAFC) 30%)' }}
          onSubmit={(e) => { e.preventDefault(); void enviar(texto); }}
        >
          <div style={{ ...cartao, padding: 10 }} className="flex items-end gap-2 focus-within:outline focus-within:outline-2" >
            <label htmlFor="assistente-pergunta" className="sr-only">Pergunta para o Assistente de Relatórios</label>
            <textarea
              id="assistente-pergunta"
              ref={campoRef}
              value={texto}
              onChange={(e) => setTexto(e.target.value.slice(0, LIMITE_PERGUNTA))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  void enviar(texto);
                }
              }}
              rows={1}
              placeholder="Ex.: Quanto foi gasto em passagens nos últimos 3 meses?"
              aria-describedby="assistente-dica"
              className="flex-1 resize-none bg-transparent outline-none"
              style={{ fontSize: 15, color: C.ink, padding: '8px 6px', maxHeight: 160, minHeight: 40, fieldSizing: 'content' } as React.CSSProperties}
            />
            <button type="submit" className="tfd-btn tfd-btn-primary" disabled={!texto.trim() || enviando}>
              {enviando ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={16} />} Analisar
            </button>
          </div>
          <p id="assistente-dica" className="flex justify-between gap-3" style={{ fontSize: 12, color: C.apoio, marginTop: 6, padding: '0 4px' }}>
            <span>Enter envia, Shift + Enter quebra a linha. Não escreva CPF, CNS, dados bancários ou diagnósticos.</span>
            <span aria-hidden>{texto.length}/{LIMITE_PERGUNTA}</span>
          </p>
        </form>
      </div>
    </div>
  );
}

function Carregando() {
  return (
    <div className="self-start flex items-center gap-2" style={{ ...cartao, padding: '12px 16px', fontSize: 14, color: C.texto }} role="status">
      <Loader2 size={16} className="animate-spin" style={{ color: C.azul }} />
      Analisando a pergunta e consultando a base...
    </div>
  );
}

const AVISOS: Record<string, { icone: typeof Info; titulo: string; cor: string; fundo: string }> = {
  esclarecimento: { icone: HelpCircle, titulo: 'Preciso de um detalhe', cor: 'var(--tfd-blue-700)', fundo: 'var(--tfd-blue-50)' },
  nao_suportado: { icone: Info, titulo: 'Pergunta ainda não suportada', cor: 'var(--tfd-text-secondary)', fundo: 'var(--tfd-50)' },
  bloqueado: { icone: ShieldAlert, titulo: 'Pergunta não permitida', cor: 'var(--tfd-status-warning-strong, #9A3412)', fundo: 'var(--tfd-warning-bg, #FFF7ED)' },
  sem_resultado: { icone: SearchX, titulo: 'Nenhum registro encontrado', cor: 'var(--tfd-text-secondary)', fundo: 'var(--tfd-50)' },
  configuracao: { icone: Settings2, titulo: 'Assistente não configurado', cor: 'var(--tfd-status-warning-strong, #9A3412)', fundo: 'var(--tfd-warning-bg, #FFF7ED)' },
  erro: { icone: AlertTriangle, titulo: 'Não foi possível responder', cor: 'var(--tfd-danger-text, #B91C1C)', fundo: 'var(--tfd-danger-bg, #FEF2F2)' },
};

function CartaoResposta({ r, onSugestao }: { r: RespostaAssistente; onSugestao: (s: string) => void }) {
  if (r.status !== 'ok') {
    const a = AVISOS[r.status] ?? AVISOS.erro;
    const Icone = a.icone;
    return (
      <section className="self-start w-full" style={{ ...cartao, padding: 16 }} aria-label={a.titulo}>
        <div className="flex items-start gap-3">
          <span className="inline-flex items-center justify-center shrink-0" style={{ width: 32, height: 32, borderRadius: '50%', background: a.fundo, color: a.cor }}>
            <Icone size={16} />
          </span>
          <div className="min-w-0">
            <h3 style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>{a.titulo}</h3>
            {r.mensagem && <p style={{ fontSize: 14, color: C.texto, marginTop: 2 }}>{r.mensagem}</p>}
            {r.status === 'sem_resultado' && <Contexto r={r} />}
            {r.status === 'configuracao' && (
              <p style={{ fontSize: 13, color: C.apoio, marginTop: 6 }}>Quem administra o sistema precisa cadastrar as chaves do JEV e do Gemini nas variáveis de ambiente do servidor e reiniciar a aplicação.</p>
            )}
          </div>
        </div>
        {r.sugestoes && r.sugestoes.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {r.sugestoes.map((s) => (
              <button key={s} type="button" className="tfd-btn tfd-btn-secondary" style={{ fontWeight: 500, height: 'auto', minHeight: 32, padding: '4px 10px', fontSize: 13, textAlign: 'left' }} onClick={() => onSugestao(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
      </section>
    );
  }

  const res = r.resultado!;
  const fmt = res.unidade === 'BRL' ? BRL : res.unidade === 'dias' ? DIAS : QTD;
  const grupos = r.grupos && r.grupos.itens.length > 1 ? r.grupos : undefined;

  return (
    <section className="self-start w-full" style={{ ...cartao, padding: 20 }} aria-label="Resposta do assistente">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1" style={{ fontSize: 13, color: C.texto }}>
        <span>{res.rotulo}</span>
        {r.periodo && <span style={{ color: C.apoio }}>· {r.periodo.descricao}</span>}
        {r.filtros?.map((f) => (
          <span key={f.rotulo} style={{ padding: '1px 8px', borderRadius: 999, background: C.azulSuave, color: C.azulTexto, fontSize: 12 }}>{f.valor}</span>
        ))}
      </p>
      <p className="flex flex-wrap items-baseline gap-x-2" style={{ marginTop: 2 }}>
        <span style={{ fontSize: 30, fontWeight: 700, color: C.ink, fontFamily: 'var(--tfd-mono)', lineHeight: 1.15 }}>{fmt(res.valor)}</span>
        {res.legenda && <span style={{ fontSize: 13, color: C.apoio }}>{res.legenda}</span>}
      </p>
      {r.resumo && <p style={{ fontSize: 14, color: C.texto, marginTop: 8, lineHeight: 1.5 }}>{r.resumo}</p>}

      {grupos && <GraficoGrupos grupos={grupos} fmt={fmt} total={res.valor} unidade={res.unidade} inicial={r.graficoPreferido ?? 'auto'} />}

      {r.sugestoesGrafico && r.sugestoesGrafico.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <span style={{ fontSize: 12, color: C.apoio }}>{grupos ? 'Ver também em gráfico:' : 'Quer ver em gráfico?'}</span>
          {r.sugestoesGrafico.map((sg) => (
            <button key={sg.rotulo} type="button" className="tfd-btn tfd-btn-secondary inline-flex items-center gap-1.5" style={{ fontWeight: 500, height: 30, padding: '0 10px', fontSize: 13 }} onClick={() => onSugestao(sg.pergunta)}>
              <BarChart3 size={13} /> {sg.rotulo}
            </button>
          ))}
        </div>
      )}

      <details className="mt-4" style={{ fontSize: 13, color: C.texto }}>
        <summary className="cursor-pointer inline-flex items-center gap-1.5" style={{ color: C.azulTexto, fontWeight: 600 }}>
          <Info size={14} /> Como cheguei nesse número
        </summary>
        <dl className="mt-2 flex flex-col gap-2" style={{ lineHeight: 1.5 }}>
          {r.perguntaInterpretada && <Item rotulo="Entendi">{r.perguntaInterpretada}</Item>}
          {r.periodo && <Item rotulo="Período">{dataBR(r.periodo.inicio)} a {dataBR(r.periodo.fim)}, pela {r.periodo.campoData}</Item>}
          {res.composicao && res.composicao.length > 1 && (
            <Item rotulo="Composição">{res.composicao.map((c) => `${c.rotulo}: ${BRL(c.valor)}`).join('; ')}</Item>
          )}
          {r.premissa && <Item rotulo="Regra">{r.premissa}</Item>}
          {r.avisos?.map((a) => <Item key={a} rotulo="Atenção">{a}</Item>)}
          {r.etapas && r.etapas.length > 0 && <Item rotulo="Etapas">{r.etapas.map((e) => `${e.rotulo}: ${e.valor}`).join(' → ')}</Item>}
          <Item rotulo="Fonte">
            {r.fonte}{r.geradoEm && `, ${horaBR(r.geradoEm)}`}{typeof r.confianca === 'number' && `, confiança ${Math.round(r.confianca * 100)}%`}
          </Item>
        </dl>
      </details>
    </section>
  );
}

function Item({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="inline" style={{ color: C.ink, fontWeight: 600 }}>{rotulo}: </dt>
      <dd className="inline">{children}</dd>
    </div>
  );
}

/**
 * Escolhe o template de gráfico do Painel conforme os dados:
 * o usuário pode trocar o tipo; no automático, meses viram colunas (até 6) ou linha, até 5 partes de um total viram pizza,
 * rankings maiores (ou médias) viram barras horizontais.
 */
const TIPOS_GRAFICO: { tipo: TipoGrafico; rotulo: string; icone: typeof Info }[] = [
  { tipo: 'auto', rotulo: 'Automático', icone: Sparkles },
  { tipo: 'pizza', rotulo: 'Pizza', icone: PieIcon },
  { tipo: 'barras', rotulo: 'Barras', icone: BarChartHorizontal },
  { tipo: 'colunas', rotulo: 'Colunas', icone: BarChart3 },
  { tipo: 'linha', rotulo: 'Linha', icone: LineChartIcon },
];

function GraficoGrupos({
  grupos, fmt, total, unidade, inicial,
}: { grupos: NonNullable<RespostaAssistente['grupos']>; fmt: (v: number) => string; total: number; unidade: string; inicial: TipoGrafico }) {
  const [tipo, setTipo] = useState<TipoGrafico>(inicial);
  const dados = grupos.itens.map((g) => ({ name: g.rotulo, value: g.valor }));
  const porMes = grupos.titulo === 'Mês';
  // Automático: meses em colunas (ou linha se longo), até 5 partes em pizza, o resto em barras.
  const auto: TipoGrafico = porMes ? (dados.length <= 6 ? 'colunas' : 'linha') : unidade !== 'dias' && dados.length <= 5 ? 'pizza' : 'barras';
  const efetivo = tipo === 'auto' ? auto : tipo;
  const partes = efetivo === 'pizza';
  // Pizza com muitas fatias repete cores e fica ilegível: 5 maiores + "Outros".
  const dadosPizza = partes && dados.length > 6
    ? [...dados.slice(0, 5), { name: 'Outros', value: Math.round((unidade === 'dias' ? dados.slice(5).reduce((t, d) => t + d.value, 0) : total - dados.slice(0, 5).reduce((t, d) => t + d.value, 0)) * 100) / 100 }]
    : dados;
  const largura = Math.min(200, Math.max(110, Math.max(...dados.map((d) => d.name.length)) * 7.5 + 16));

  return (
    <figure className="mt-4" aria-label={`Gráfico por ${grupos.titulo.toLowerCase()}`}>
      <div role="group" aria-label="Tipo de gráfico" className="inline-flex flex-wrap gap-1 mb-2 p-0.5" style={{ background: 'var(--tfd-50)', border: `1px solid ${C.borda}`, borderRadius: 'var(--tfd-radius-md)' }}>
        {TIPOS_GRAFICO.map((t) => {
          const Icone = t.icone;
          const ativo = tipo === t.tipo;
          return (
            <button
              key={t.tipo} type="button" aria-pressed={ativo} onClick={() => setTipo(t.tipo)}
              className="inline-flex items-center gap-1 focus-visible:outline focus-visible:outline-2"
              style={{ height: 28, padding: '0 9px', fontSize: 12, fontWeight: 600, borderRadius: 6, outlineColor: C.azul, color: ativo ? C.azulTexto : C.texto, background: ativo ? 'white' : 'transparent', boxShadow: ativo ? C.sombra : undefined }}
            >
              <Icone size={13} /> {t.rotulo}
            </button>
          );
        })}
      </div>
      {efetivo === 'colunas' ? (
        <ColunasChart data={dados} nome={grupos.titulo} formatar={fmt} />
      ) : efetivo === 'linha' ? (
        <TendenciaChart data={dados} nome={grupos.titulo} formatar={fmt} id={`ia-${dados.length}-${Math.round(total)}`} />
      ) : partes ? (
        <div className="grid items-center gap-2 sm:grid-cols-[200px_1fr]">
          <DonutChart data={dadosPizza} formatar={fmt} altura={180} />
          <ul className="flex flex-col gap-1.5" style={{ fontSize: 13 }}>
            {dadosPizza.map((d, i) => (
              <li key={d.name} className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 min-w-0" style={{ color: C.texto }}>
                  <span className="shrink-0 rounded-full" style={{ width: 8, height: 8, background: SEQUENCIA_CORES[i % SEQUENCIA_CORES.length] }} />
                  <span className="truncate">{d.name}</span>
                </span>
                <span className="whitespace-nowrap" style={{ color: C.ink, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(d.value)} <span style={{ color: C.apoio, fontWeight: 400 }}>{total > 0 ? `${Math.round((d.value / total) * 100)}%` : ''}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <TopBarChart data={dados} width={largura} formatar={fmt} altura={Math.min(380, dados.length * 30 + 24)} />
      )}
      {grupos.omitidos > 0 && !(partes && dados.length > 6) && (
        <figcaption style={{ fontSize: 12, color: C.apoio, marginTop: 4 }}>
          Mais {grupos.omitidos} {grupos.omitidos === 1 ? 'item menor' : 'itens menores'} fora do gráfico.
        </figcaption>
      )}
    </figure>
  );
}

function Contexto({ r }: { r: RespostaAssistente }) {
  if (!r.periodo) return null;
  return <p style={{ fontSize: 13, color: C.apoio, marginTop: 6 }}>{r.periodo.descricao}: {dataBR(r.periodo.inicio)} a {dataBR(r.periodo.fim)}</p>;
}
