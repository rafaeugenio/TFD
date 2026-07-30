'use client';

import { STATUS_LABEL, type StatusGlobalV2 } from '@/core/mocks/fluxo-v2-v3-seed';
import StatusDot, { type StatusDotTone } from './StatusDot';

const TONE: Record<StatusGlobalV2, StatusDotTone> = {
  em_dados_basicos:  'neutral',
  em_regulacao:      'info',
  em_passagens:      'warning',
  em_ajuda_custo:    'warning',
  em_acompanhamento: 'info',
  em_aprovacao:      'muted',
  em_encerramento:   'success',
};

export default function StatusV2Badge({ status }: { status: StatusGlobalV2 }) {
  return <StatusDot tone={TONE[status]}>{STATUS_LABEL[status]}</StatusDot>;
}
