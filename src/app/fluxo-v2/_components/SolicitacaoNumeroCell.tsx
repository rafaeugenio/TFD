'use client';

import type { SolicitacaoMock } from '@/core/mocks/fluxo-v2-v3-seed';
import HoverTooltip, { TooltipKV } from './HoverTooltip';
import { ExternalLink } from 'lucide-react';

const TIPO_LABEL: Record<string, string> = {
  normal: 'TFD completo',
  ajuda_custo: 'Apenas ajuda de custo',
};

function fmtDataBR(iso?: string) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('pt-BR');
  } catch {
    return iso;
  }
}

interface Props {
  s: SolicitacaoMock;
  /** Conteúdo opcional renderizado ao lado do número (ex.: badges de destaque). */
  trailing?: React.ReactNode;
  /** Tamanho da fonte. Default 13. */
  size?: number;
}

/**
 * Célula reutilizável do número da solicitação:
 * - Hover mostra resumo (tipo, modalidade, data criação, status atual).
 * - Click no número abre o SEI em nova aba quando `seiUrl` existir.
 * - Sem `seiUrl`, exibe sem affordance de link.
 */
export default function SolicitacaoNumeroCell({ s, trailing, size = 13 }: Props) {
  const tipoLabel = s.tipoSolicitacao ? TIPO_LABEL[s.tipoSolicitacao] ?? s.tipoSolicitacao : 'TFD completo';
  const hasSei = Boolean(s.seiUrl);

  const tooltipContent = (
    <TooltipKV
      rows={[
        { k: 'Número', v: s.numero, mono: true },
        ...(s.numeroSEI ? [{ k: 'SEI', v: s.numeroSEI, mono: true }] : []),
        { k: 'Tipo', v: tipoLabel },
        { k: 'Status', v: s.status },
        { k: 'Criada em', v: fmtDataBR(s.dataCriacao) },
        ...(s.dataLaudo ? [{ k: 'Laudo', v: fmtDataBR(s.dataLaudo) }] : []),
        {
          k: 'SEI',
          v: hasSei ? 'Clique no número para abrir' : 'Sem link cadastrado',
        },
      ]}
    />
  );

  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      <HoverTooltip content={tooltipContent} maxWidth={300}>
        {hasSei ? (
          <a
            href={s.seiUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 transition-colors hover:underline"
            style={{
              color: '#146BFA',
              fontFamily: 'var(--tfd-font-mono, ui-monospace, monospace)',
              fontSize: size,
              textUnderlineOffset: 3,
            }}
          >
            {s.numero}
            <ExternalLink size={11} style={{ opacity: 0.6 }} />
          </a>
        ) : (
          <span
            style={{
              color: '#1A1D2B',
              fontFamily: 'var(--tfd-font-mono, ui-monospace, monospace)',
              fontSize: size,
            }}
          >
            {s.numero}
          </span>
        )}
      </HoverTooltip>
      {trailing}
    </span>
  );
}
