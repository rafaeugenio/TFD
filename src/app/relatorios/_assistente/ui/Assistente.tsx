'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle, ArrowUp, CalendarRange, Database, HelpCircle, Info, Loader2, MessageSquarePlus, ShieldAlert,
  Sparkles, Settings2, SearchX,
} from 'lucide-react';
import PageHeader from '@/shared/components/page-header/PageHeader';
import { C, rotuloCampo } from '../../_construtor/ui/estilo';
import { cartao } from '../../_construtor/ui/Previa';
import { LIMITE_PERGUNTA, SUGESTOES_INICIAIS, type RespostaAssistente } from '../contrato';
import AbasRelatorios from './AbasRelatorios';

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

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const QTD = (v: number) => v.toLocaleString('pt-BR');
const dataBR = (s: string) => s.split('-').reverse().join('/');
const horaBR = (iso?: string) => (iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '');

async function perguntar(pergunta: string): Promise<RespostaAssistente> {
  try {
    const r = await fetch('/api/relatorios/assistente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pergunta }),
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
    setMensagens((m) => [...m, { id, pergunta: limpa }]);
    setTexto('');
    setEnviando(true);
    const resposta = await perguntar(limpa);
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
        title="Relatórios"
        subtitle="Pergunte em linguagem natural e receba totais calculados direto da base do TFD."
        breadcrumbs={[{ label: 'Gestão' }]}
        actions={
          !vazio ? (
            <button type="button" className="tfd-btn tfd-btn-secondary" onClick={novaConversa} disabled={enviando}>
              <MessageSquarePlus size={16} /> Nova conversa
            </button>
          ) : undefined
        }
      />
      <AbasRelatorios ativa="assistente" />

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
                  Faça uma pergunta sobre gastos e quantidades do TFD. Os números vêm da base do sistema e são calculados no servidor; a IA só entende a pergunta. Respondo apenas totais e contagens, nunca dados de pessoas.
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
  const fmt = res.unidade === 'BRL' ? BRL : QTD;
  const grupos = r.grupos;
  const maxGrupo = grupos ? Math.max(...grupos.itens.map((i) => i.valor), 0) : 0;

  return (
    <section className="self-start w-full" style={{ ...cartao, padding: 20 }} aria-label="Resposta do assistente">
      {r.perguntaInterpretada && (
        <p style={{ ...rotuloCampo, marginBottom: 4 }}><Sparkles size={12} /> Entendi: {r.perguntaInterpretada}</p>
      )}
      <p style={{ fontSize: 13, color: C.texto }}>{res.rotulo}</p>
      <p style={{ fontSize: 32, fontWeight: 700, color: C.ink, fontFamily: 'var(--tfd-mono)', lineHeight: 1.15, marginTop: 2 }}>{fmt(res.valor)}</p>
      {r.resumo && <p style={{ fontSize: 14, color: C.texto, marginTop: 8, lineHeight: 1.5 }}>{r.resumo}</p>}

      <Contexto r={r} />

      {res.composicao && res.composicao.length > 1 && grupos?.titulo !== 'Categoria de custo' && (
        <dl className="grid gap-x-6 gap-y-1 mt-4" style={{ gridTemplateColumns: 'minmax(0,1fr) auto', fontSize: 13 }}>
          {res.composicao.map((c) => (
            <div key={c.rotulo} className="contents">
              <dt style={{ color: C.texto }}>{c.rotulo}{c.quantidade !== undefined && <span style={{ color: C.apoio }}> · {QTD(c.quantidade)}</span>}</dt>
              <dd style={{ color: C.ink, fontWeight: 600, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{BRL(c.valor)}</dd>
            </div>
          ))}
        </dl>
      )}

      {grupos && grupos.itens.length > 1 && (
        <div className="mt-5 overflow-x-auto">
          <p style={rotuloCampo} aria-hidden>Por {grupos.titulo.toLowerCase()}</p>
          <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 13 }}>
            <caption className="sr-only">Resultado por {grupos.titulo.toLowerCase()}</caption>
            <thead>
              <tr style={{ borderBottom: `1px solid ${C.borda}` }}>
                <th scope="col" className="text-left" style={{ padding: '6px 8px 6px 0', color: C.apoio, fontWeight: 600 }}>{grupos.titulo}</th>
                <th scope="col" className="text-right" style={{ padding: '6px 8px', color: C.apoio, fontWeight: 600 }}>{res.unidade === 'BRL' ? 'Valor' : 'Quantidade'}</th>
                <th scope="col" className="w-[38%]"><span className="sr-only">Proporção</span></th>
              </tr>
            </thead>
            <tbody>
              {grupos.itens.map((g) => (
                <tr key={g.rotulo} style={{ borderBottom: `1px solid var(--tfd-100)` }}>
                  <th scope="row" className="text-left" style={{ padding: '8px 8px 8px 0', color: C.ink, fontWeight: 500 }}>
                    {g.rotulo}
                    {res.unidade === 'BRL' && g.quantidade !== undefined && <span style={{ color: C.apoio, fontWeight: 400 }}> · {QTD(g.quantidade)}</span>}
                  </th>
                  <td className="text-right whitespace-nowrap" style={{ padding: '8px', color: C.ink, fontVariantNumeric: 'tabular-nums' }}>{fmt(g.valor)}</td>
                  <td style={{ padding: '8px 0' }} aria-hidden>
                    <div style={{ height: 8, borderRadius: 4, background: 'var(--tfd-100)' }}>
                      <div style={{ height: 8, borderRadius: 4, background: C.azul, width: `${maxGrupo > 0 ? Math.max(2, (g.valor / maxGrupo) * 100) : 0}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {grupos.omitidos > 0 && <p style={{ fontSize: 12, color: C.apoio, marginTop: 6 }}>Mais {grupos.omitidos} {grupos.omitidos === 1 ? 'item' : 'itens'} com valores menores não aparecem aqui.</p>}
        </div>
      )}

      {r.avisos && r.avisos.length > 0 && (
        <ul className="mt-4 flex flex-col gap-1.5" style={{ fontSize: 13, color: 'var(--tfd-status-warning-strong, #9A3412)', background: 'var(--tfd-warning-bg, #FFF7ED)', border: '1px solid var(--tfd-status-warning-border, #FED7AA)', borderRadius: 'var(--tfd-radius-md)', padding: '8px 12px' }}>
          {r.avisos.map((a) => <li key={a} className="flex gap-2"><AlertTriangle size={14} className="shrink-0 mt-0.5" />{a}</li>)}
        </ul>
      )}

      {r.premissa && (
        <details className="mt-4" style={{ fontSize: 13, color: C.texto }}>
          <summary className="cursor-pointer inline-flex items-center gap-1.5" style={{ color: C.azulTexto, fontWeight: 600 }}>
            <Info size={14} /> Como esse número foi calculado
          </summary>
          <p style={{ marginTop: 6, lineHeight: 1.5 }}>{r.premissa}</p>
        </details>
      )}

      <Rodape r={r} />
    </section>
  );
}

function Contexto({ r }: { r: RespostaAssistente }) {
  if (!r.periodo && !r.filtros?.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 mt-4" style={{ fontSize: 13 }}>
      {r.periodo && (
        <span className="inline-flex flex-wrap items-center gap-x-1.5" style={{ padding: '4px 10px', borderRadius: 'var(--tfd-radius-md)', background: 'var(--tfd-50)', border: `1px solid ${C.borda}`, color: C.texto }}>
          <CalendarRange size={13} style={{ color: C.apoio }} />
          <span>{r.periodo.descricao}: {dataBR(r.periodo.inicio)} a {dataBR(r.periodo.fim)}</span>
          <span style={{ color: C.apoio }}>· por {r.periodo.campoData}</span>
        </span>
      )}
      {r.filtros?.map((f) => (
        <span key={f.rotulo} style={{ padding: '4px 10px', borderRadius: 'var(--tfd-radius-md)', background: C.azulSuave, border: `1px solid ${C.azulBorda}`, color: C.azulTexto }}>
          {f.rotulo}: {f.valor}
        </span>
      ))}
    </div>
  );
}

function Rodape({ r }: { r: RespostaAssistente }) {
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-4 pt-3" style={{ borderTop: `1px solid ${C.borda}`, fontSize: 12, color: C.apoio }}>
      <span className="inline-flex items-center gap-1"><Database size={12} /> Fonte: {r.fonte}</span>
      {r.geradoEm && <span>Gerado em {horaBR(r.geradoEm)}</span>}
      {typeof r.confianca === 'number' && <span>Confiança da interpretação: {Math.round(r.confianca * 100)}%</span>}
    </p>
  );
}
