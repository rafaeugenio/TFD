'use client';

import { HeartHandshake, AlertTriangle } from 'lucide-react';
import { useFlagServicoSocial } from '../_state/servicoSocialStore';
import { ETAPA_IMPACTADA_LABEL } from '@/core/mocks/servico-social-seed';

/**
 * Flag "Serviço Social: demanda aberta" para a listagem de solicitações.
 * Aparece enquanto houver ao menos uma demanda Pendente ou Em atendimento e
 * some quando não houver nenhuma aberta; o histórico continua consultável na
 * aba Serviço Social do detalhe. Quando a demanda sinalizou etapas
 * potencialmente impactadas, elas entram no título. É alerta visual apenas:
 * nenhuma etapa do fluxo é bloqueada.
 *
 * `compacto` mostra só o ícone, para caber dentro de uma célula de tabela.
 */
export default function ServicoSocialBadge({
  solicitacaoId,
  compacto = false,
}: {
  solicitacaoId: string;
  compacto?: boolean;
}) {
  const { aberta, etapas } = useFlagServicoSocial(solicitacaoId);
  if (!aberta) return null;

  const titulo =
    etapas.length > 0
      ? `Serviço Social: demanda aberta. Etapas sinalizadas: ${etapas
          .map((e) => ETAPA_IMPACTADA_LABEL[e])
          .join(', ')}. Alerta apenas, nada foi bloqueado.`
      : 'Serviço Social: demanda aberta. Alerta apenas, nada foi bloqueado.';

  return (
    <span
      title={titulo}
      className="inline-flex items-center gap-1 shrink-0"
      style={{
        background: '#FFF7ED',
        border: '1px solid #FDBA74',
        borderRadius: 999,
        color: '#9A3412',
        fontSize: 11,
        fontWeight: 500,
        padding: compacto ? '1px 5px' : '1px 7px',
        lineHeight: 1.5,
      }}
    >
      <HeartHandshake size={11} strokeWidth={2.2} aria-hidden />
      {!compacto && <span>Serviço Social</span>}
      {etapas.length > 0 && (
        <span className="inline-flex items-center gap-0.5" style={{ color: '#B45309' }}>
          <AlertTriangle size={10} aria-hidden />
          {etapas.length}
        </span>
      )}
      {compacto && <span className="sr-only">Serviço Social: demanda aberta</span>}
    </span>
  );
}
