'use client';

import { HeartHandshake } from 'lucide-react';
import { useFlagServicoSocial } from '../_state/servicoSocialStore';

/**
 * Flag "Serviço Social: demanda aberta" para a listagem de solicitações.
 * Aparece enquanto houver ao menos uma demanda Pendente ou Em atendimento e
 * some quando não houver nenhuma aberta; o histórico continua consultável na
 * aba Serviço Social do detalhe. É alerta visual apenas: o fluxo da
 * solicitação não é bloqueado em nenhum momento.
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
  const { aberta } = useFlagServicoSocial(solicitacaoId);
  if (!aberta) return null;

  const titulo = 'Serviço Social: demanda aberta. Alerta apenas, o fluxo não é bloqueado.';

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
      {compacto && <span className="sr-only">Serviço Social: demanda aberta</span>}
    </span>
  );
}
