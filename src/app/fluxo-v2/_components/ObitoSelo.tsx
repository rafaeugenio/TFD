'use client';

import { Cross } from 'lucide-react';
import HoverTooltip from './HoverTooltip';
import { useObitoDe } from '../_state/obitoStore';

/** AAAA-MM-DD para dd/mm/aaaa sem passar por Date (evita deslocar o dia pelo fuso). */
export function dataObitoBR(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split('-');
  return a && m && d ? `${d}/${m}/${a}` : iso;
}

/**
 * Selo discreto de óbito sinalizado, exibido ao lado do número da solicitação
 * em todas as filas e no cabeçalho do detalhe. Segue o padrão do alerta do
 * Serviço Social: ícone pequeno com a data na dica. A solicitação continua no
 * fluxo normalmente.
 */
export default function ObitoSelo({ solicitacaoId, size = 13 }: { solicitacaoId: string; size?: number }) {
  const obito = useObitoDe(solicitacaoId);
  if (!obito) return null;

  const data = dataObitoBR(obito.dataFalecimento);
  const conteudo = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontWeight: 600, color: '#E2E8F0' }}>Óbito em {data}</span>
      {obito.observacao && (
        <span style={{ color: '#CBD5E1', lineHeight: 1.45 }}>
          {obito.observacao.length > 160 ? `${obito.observacao.slice(0, 160)}...` : obito.observacao}
        </span>
      )}
      <span style={{ color: '#94A3B8', borderTop: '1px solid #334155', paddingTop: 6 }}>
        Sinalizado por {obito.registradoPor}. A solicitação segue o fluxo normalmente.
      </span>
    </div>
  );

  return (
    <HoverTooltip content={conteudo} maxWidth={300}>
      <span
        className="inline-flex items-center shrink-0"
        style={{ color: '#334155', cursor: 'help' }}
        aria-label={`Óbito em ${data}`}
        role="img"
      >
        <Cross size={size} strokeWidth={2.2} />
      </span>
    </HoverTooltip>
  );
}
