'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquarePlus, Send, MessagesSquare } from 'lucide-react';
import { useFluxoV2State } from '../_state/FluxoV2Provider';
import { fmtDataHora, tempoRelativo } from '../_utils/derivarLinhaDoTempo';
import StatusDot, { type StatusDotTone } from './StatusDot';
import type { ObservacaoChat, SolicitacaoMock } from '@/core/mocks/fluxo-v2-v3-seed';

/* Tom semântico do perfil — usado SÓ no ponto pequeno do badge.
 * Avatares são sempre cinza neutros. */
const PERFIL_TONE: Record<string, StatusDotTone> = {
  'Coordenação Estadual': 'info',
  'Regulação':            'info',
  'Financeiro':           'warning',
  'Médico':               'success',
};

const toneDoPerfil = (perfil: string): StatusDotTone =>
  PERFIL_TONE[perfil] ?? 'neutral';

const iniciais = (nome: string) =>
  nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

/* ------------------------------------------------------------------ */
/*  Componente                                                         */
/* ------------------------------------------------------------------ */

export default function ObservacoesTab({ s }: { s: SolicitacaoMock }) {
  const { addObservacao } = useFluxoV2State();
  const [texto, setTexto] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const observacoes = useMemo(
    () =>
      [...(s.observacoes ?? [])].sort(
        (a, b) => new Date(a.data).getTime() - new Date(b.data).getTime(),
      ),
    [s.observacoes],
  );

  // Rola pra última mensagem ao adicionar / abrir
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [observacoes.length]);

  const enviar = () => {
    const limpo = texto.trim();
    if (!limpo) return;
    addObservacao(s.id, limpo);
    setTexto('');
  };

  return (
    <div
      className="flex flex-col"
      style={{
        background: 'white',
        border: '1px solid var(--tfd-surface-border)',
        borderRadius: 'var(--tfd-radius-lg)',
        minHeight: 540,
      }}
    >
      {/* Cabeçalho */}
      <div
        className="flex items-baseline justify-between gap-3 px-5 py-4"
        style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}
      >
        <div>
          <h2 className="text-[15px] font-semibold" style={{ color: '#1A1D2B' }}>
            Observações
          </h2>
          <p className="text-[12px] mt-0.5" style={{ color: '#6B7280' }}>
            Registre conversas paralelas, alinhamentos e decisões fora do sistema.
          </p>
        </div>
        <span
          className="text-[12px] font-medium"
          style={{ color: '#94A3B8' }}
        >
          {observacoes.length} {observacoes.length === 1 ? 'registro' : 'registros'}
        </span>
      </div>

      {/* Lista (chat) */}
      <div
        ref={listRef}
        className="flex-1 px-5 py-5 overflow-y-auto"
        style={{
          background: 'linear-gradient(180deg, #FBFCFE 0%, white 60%)',
          maxHeight: 540,
        }}
      >
        {observacoes.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="flex flex-col gap-4">
            {observacoes.map((o) => (
              <Mensagem key={o.id} o={o} />
            ))}
          </ul>
        )}
      </div>

      {/* Composer */}
      <div
        className="px-5 py-4"
        style={{
          borderTop: '1px solid var(--tfd-surface-border)',
          background: 'white',
          borderBottomLeftRadius: 'var(--tfd-radius-lg)',
          borderBottomRightRadius: 'var(--tfd-radius-lg)',
        }}
      >
        <div
          className="flex items-end gap-2 px-3 py-2"
          style={{
            background: '#F8FAFC',
            border: '1px solid var(--tfd-surface-border)',
            borderRadius: 12,
          }}
        >
          <MessageSquarePlus
            size={16}
            style={{ color: '#94A3B8', marginBottom: 8, flexShrink: 0 }}
          />
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                enviar();
              }
            }}
            placeholder="Registre conversas paralelas, decisões em chamada, alinhamentos por WhatsApp ou email…"
            rows={3}
            className="flex-1 resize-none bg-transparent outline-none text-[13px] leading-relaxed"
            style={{
              color: '#1A1D2B',
              maxHeight: 160,
              minHeight: 56,
              padding: '4px 0',
            }}
          />
          <button
            type="button"
            onClick={enviar}
            disabled={!texto.trim()}
            className="tfd-btn tfd-btn-primary shrink-0"
            style={{
              opacity: texto.trim() ? 1 : 0.45,
              pointerEvents: texto.trim() ? 'auto' : 'none',
            }}
          >
            <Send size={13} />
            Registrar
          </button>
        </div>
        <p className="text-[11px] mt-2 px-1" style={{ color: '#94A3B8' }}>
          Dica: <kbd style={kbdStyle}>Ctrl</kbd> + <kbd style={kbdStyle}>Enter</kbd> também envia.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Subcomponentes                                                     */
/* ------------------------------------------------------------------ */

function Mensagem({ o }: { o: ObservacaoChat }) {
  return (
    <li className="flex items-start gap-3">
      {/* Avatar — neutro, só inicial em fundo cinza */}
      <div
        className="shrink-0 inline-flex items-center justify-center text-[13px] font-semibold"
        style={{
          width: 36,
          height: 36,
          borderRadius: 999,
          background: '#F1F5F9',
          color: '#475569',
          border: '1px solid #E2E8F0',
          letterSpacing: '0.02em',
        }}
      >
        {iniciais(o.autor)}
      </div>

      {/* Bolha */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <span className="text-[14px] font-semibold" style={{ color: '#1E293B' }}>
            {o.autor}
          </span>
          <StatusDot tone={toneDoPerfil(o.perfilAutor)}>{o.perfilAutor}</StatusDot>
          <span className="font-mono text-[12px]" style={{ color: '#94A3B8' }}>
            {fmtDataHora(o.data)}
          </span>
          <span style={{ color: '#E2E8F0' }}>·</span>
          <span className="text-[12px]" style={{ color: '#94A3B8' }}>{tempoRelativo(o.data)}</span>
        </div>
        <div
          style={{
            background: 'white',
            border: '1px solid #E2E8F0',
            borderRadius: 10,
            padding: '12px 16px',
            color: '#334155',
            fontSize: 14,
            lineHeight: 1.55,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            boxShadow: '0 1px 0 rgba(15,23,42,0.02)',
          }}
        >
          {o.texto}
        </div>
      </div>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16">
      <div
        className="inline-flex items-center justify-center mb-3"
        style={{
          width: 56,
          height: 56,
          borderRadius: 999,
          background: '#EBF0FF',
          color: 'var(--tfd-blue)',
        }}
      >
        <MessagesSquare size={26} strokeWidth={1.6} />
      </div>
      <p className="text-[14px] font-semibold mb-1" style={{ color: '#1A1D2B' }}>
        Nenhuma observação registrada ainda
      </p>
      <p className="text-[12.5px] max-w-[380px]" style={{ color: '#6B7280' }}>
        Use este espaço para deixar contexto que não cabe no fluxo formal — uma ligação com a família, um WhatsApp do paciente, uma decisão de bastidor.
      </p>
    </div>
  );
}

const kbdStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
  fontSize: 10,
  background: '#F1F5F9',
  border: '1px solid var(--tfd-surface-border)',
  borderRadius: 4,
  padding: '1px 5px',
  color: '#475569',
};
