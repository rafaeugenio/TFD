'use client';

import { AlertCircle } from 'lucide-react';
import HoverTooltip from './HoverTooltip';
import { useDemandasAbertasDaSolicitacao } from '../_state/servicoSocialStore';
import { SETOR_ORIGEM_LABEL } from '@/core/mocks/servico-social-seed';

function dataBR(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('pt-BR');
}

/**
 * Alerta discreto de demanda social pendente, exibido ao lado do número da
 * solicitação em todas as filas. Fica visível para qualquer setor enquanto
 * houver demanda em aberto, inclusive depois de a solicitação ser tramitada:
 * quem receber a solicitação no setor seguinte já vê que existe um ponto
 * aguardando análise do Serviço Social. Some sozinho quando a última demanda
 * aberta é concluída ou cancelada.
 *
 * É sinalização, não trava: o fluxo segue normalmente.
 */
export default function ServicoSocialAlerta({ solicitacaoId }: { solicitacaoId: string }) {
  const abertas = useDemandasAbertasDaSolicitacao(solicitacaoId);
  if (abertas.length === 0) return null;

  const conteudo = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontWeight: 600, color: '#FDBA74' }}>
        {abertas.length === 1
          ? 'Demanda do Serviço Social em aberto'
          : `${abertas.length} demandas do Serviço Social em aberto`}
      </span>
      {abertas.slice(0, 3).map((d) => (
        <span key={d.id} style={{ color: '#E2E8F0', lineHeight: 1.45 }}>
          <span style={{ color: '#94A3B8' }}>
            {dataBR(d.dataEncaminhamento)} · {SETOR_ORIGEM_LABEL[d.setorOrigem]}
            {d.profissionalResponsavel ? ` · ${d.profissionalResponsavel}` : ' · não assumida'}
          </span>
          <br />
          {d.motivo.length > 130 ? `${d.motivo.slice(0, 130)}...` : d.motivo}
        </span>
      ))}
      {abertas.length > 3 && (
        <span style={{ color: '#94A3B8' }}>e mais {abertas.length - 3}.</span>
      )}
      <span style={{ color: '#94A3B8', borderTop: '1px solid #334155', paddingTop: 6 }}>
        A solicitação segue o fluxo normalmente. O aviso some quando a análise
        social for concluída.
      </span>
    </div>
  );

  return (
    <HoverTooltip content={conteudo} maxWidth={340}>
      <span
        className="inline-flex items-center shrink-0"
        style={{ color: '#D97706', cursor: 'help' }}
        aria-label="Demanda do Serviço Social em aberto"
        role="img"
      >
        <AlertCircle size={13} strokeWidth={2.4} />
      </span>
    </HoverTooltip>
  );
}
