'use client';

import { useEffect, useMemo, useState } from 'react';
import EventoLinhaTempo from './EventoLinhaTempo';
import { derivarEventos } from '../_utils/derivarLinhaDoTempo';
import type { SolicitacaoMock } from '@/core/mocks/fluxo-v2-v3-seed';
import { carregarAutoresDaSolicitacao, type AutorResolver } from '@/services/logs.service';

export default function LinhaDoTempoTab({ s }: { s: SolicitacaoMock }) {
  // Resolver de autores derivados de `log_auditoria`. Enquanto carrega,
  // a timeline já renderiza com os fallbacks (parecer.medico, etc.).
  const [resolverAutor, setResolverAutor] = useState<AutorResolver | null>(null);

  useEffect(() => {
    let cancelado = false;
    carregarAutoresDaSolicitacao(s.id).then((resolver) => {
      if (!cancelado) setResolverAutor(() => resolver);
    });
    return () => {
      cancelado = true;
    };
  }, [s.id]);

  const eventos = useMemo(
    () => derivarEventos(s, resolverAutor ?? undefined),
    [s, resolverAutor],
  );

  if (eventos.length === 0) {
    return (
      <div
        className="text-center py-16"
        style={{
          background: 'white',
          border: '1px dashed var(--tfd-surface-border)',
          borderRadius: 'var(--tfd-radius-lg)',
        }}
      >
        <p className="text-[13px]" style={{ color: '#6B7280' }}>
          Sem eventos registrados ainda.
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col"
      style={{
        background: 'white',
        border: '1px solid var(--tfd-surface-border)',
        borderRadius: 'var(--tfd-radius-lg)',
      }}
    >
      {/* Cabeçalho da timeline */}
      <div
        className="flex items-baseline justify-between gap-3 px-5 py-4"
        style={{ borderBottom: '1px solid var(--tfd-surface-border)' }}
      >
        <div>
          <h2 className="text-[15px] font-semibold" style={{ color: '#1A1D2B' }}>
            Linha do tempo
          </h2>
          <p className="text-[12px] mt-0.5" style={{ color: '#6B7280' }}>
            do mais antigo ao mais recente
          </p>
        </div>
        <span
          className="text-[12px] font-medium"
          style={{ color: '#94A3B8' }}
        >
          {eventos.length} {eventos.length === 1 ? 'evento' : 'eventos'}
        </span>
      </div>

      <div className="px-5 py-5">
        <ol className="flex flex-col gap-3">
          {eventos.map((e, i) => (
            <EventoLinhaTempo
              key={e.id}
              tipo={e.tipo}
              data={e.data}
              titulo={e.titulo}
              descricao={e.descricao}
              autor={e.autor}
              observacao={e.observacao}
              badge={e.badge}
              destaque={i === 0}
              ultimo={i === 0}
            />
          ))}
        </ol>
      </div>

      <style jsx global>{`
        @keyframes tfd-pulse {
          0%,   100% { transform: scale(1);    opacity: 1;   }
          50%        { transform: scale(1.08); opacity: 0.92; }
        }
      `}</style>
    </div>
  );
}
