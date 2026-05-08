'use client';

import { validadeLaudo } from '../../_utils/laudo';
import StatusDot from '../StatusDot';

interface Props {
  dataLaudo?: string;
  /** Quando "compact", remove a data emissão e mostra só o estado (uso em tabelas estreitas). */
  variant?: 'default' | 'compact';
}

/**
 * Estado do laudo (1 ano após a emissão). Visual neutro, com ponto colorido pequeno:
 *  - Sem laudo  → ponto cinza
 *  - Vencido    → ponto vermelho
 *  - Vencendo (≤ 90 dias) → ponto amber
 *  - OK         → ponto verde sutil + texto em hierarquia
 */
export default function LaudoValidadeBadge({ dataLaudo, variant = 'default' }: Props) {
  const v = validadeLaudo(dataLaudo);

  if (v.status === 'sem_laudo') {
    return <StatusDot tone="muted">Sem laudo</StatusDot>;
  }
  if (v.status === 'vencido') {
    return <StatusDot tone="danger">{v.label}</StatusDot>;
  }
  if (v.status === 'vencendo') {
    return <StatusDot tone="warning">{v.label}</StatusDot>;
  }

  // OK
  if (variant === 'compact') {
    return <StatusDot tone="success">{v.label}</StatusDot>;
  }
  return (
    <span className="inline-flex flex-col leading-tight gap-0.5">
      <StatusDot tone="success">{v.label}</StatusDot>
      <span style={{ color: '#94A3B8', fontSize: 11, paddingLeft: 12 }}>
        Válido até {new Date(v.vencimento!).toLocaleDateString('pt-BR')}
      </span>
    </span>
  );
}
