'use client';

import { useState } from 'react';
import { FileSignature, Loader2 } from 'lucide-react';
import { buscarPorSolicitacao, criarDespacho } from '@/services/despachos-financeiros.service';
import { useToast } from '@/shared/components/toast/Toast';

interface Props {
  solicitacaoId: string;
  numeroSEI?: string | null;
  disabled?: boolean;
}

/**
 * Abre o despacho financeiro da solicitação em nova aba.
 * Se ainda não houver despacho, cria um vazio (apenas com FK e SEI se houver).
 */
export default function GerarDespachoButton({ solicitacaoId, numeroSEI, disabled }: Props) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function abrir() {
    setLoading(true);
    try {
      // Já existe um despacho pra essa solicitação?
      const { data: existente } = await buscarPorSolicitacao(solicitacaoId);
      let despachoId: string | undefined =
        (existente?.id as string | undefined) ?? undefined;

      if (!despachoId) {
        const { data: criado, error } = await criarDespacho({
          solicitacao_id: solicitacaoId,
          numero_sei: numeroSEI || null,
        });
        if (error || !criado) {
          toast.error('Erro ao gerar despacho', error?.message ?? 'Tente novamente.');
          return;
        }
        despachoId = (criado as { id: string }).id;
      }

      window.open(`/despacho/${despachoId}`, '_blank');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={abrir}
      disabled={disabled || loading}
      className="tfd-btn tfd-btn-secondary tfd-btn--sm"
      title="Gerar / abrir despacho financeiro para anexar ao SEI"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <FileSignature size={14} />}
      Despacho financeiro
    </button>
  );
}
